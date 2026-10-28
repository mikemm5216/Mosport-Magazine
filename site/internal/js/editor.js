/*
 * B-P3-05 — internal editor operations prototype (DEMO only).
 * Drives the real workflow (workflow.js) in the browser. Every simulated human action
 * is a DEMO record: approvals carry demo:true, the public pipeline refuses them in
 * production, and the approver is a selectable label, not a login.
 * State lives in this browser only (localStorage, best effort) and can be exported.
 */
(function () {
  'use strict';
  var C = window.MOSPORT_CONTRACTS, W = window.MOSPORT_WORKFLOW, PL = window.MOSPORT_PIPELINE, SEED = window.MOSPORT_DEMO_SEED;
  var KEY = 'mosport.internal.demo-editor-log.v1';
  var APPROVERS = ['editor:demo-01', 'editor:demo-02'];
  var STATE_ORDER = ['DRAFT', 'IN_QA', 'HELD_FOR_EVIDENCE', 'AWAITING_HUMAN_APPROVAL', 'APPROVED', 'PUBLISHED', 'CORRECTION_PENDING', 'REJECTED', 'WITHDRAWN'];
  var STATE_ZH = { DRAFT: '草稿／候選', IN_QA: 'QA 中', HELD_FOR_EVIDENCE: '暫停：待補證據', AWAITING_HUMAN_APPROVAL: '待人工審核', APPROVED: '已核准待發布', PUBLISHED: '已發布', CORRECTION_PENDING: '待更正', REJECTED: '已拒絕', WITHDRAWN: '已撤稿' };

  var last = Date.parse('2026-10-31T12:00:00Z');
  function clock() { last = Math.max(Date.now(), last + 1000); return new Date(last).toISOString(); }
  var ui = { selected: null, flash: null, approver: APPROVERS[0], tab: 'item', cmdN: 0 };
  var wf;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cmdId(name) { ui.cmdN++; return 'ed-' + name + '-' + Date.now().toString(36) + '-' + ui.cmdN; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(wf.toJSON())); } catch (e) { /* storage unavailable: session only */ } }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var j = JSON.parse(raw);
        var restored = W.createWorkflow.fromJSON(j, { clock: clock });
        var ev = j.events; if (ev.length) last = Math.max(last, Date.parse(ev[ev.length - 1].at));
        return restored;
      }
    } catch (e) { ui.flash = { ok: false, text: '本機紀錄無法重放，已改用新的 DEMO 種子資料：' + e.message }; }
    /* Seed events get pinned DEMO times; later actions use the browser clock. */
    var t = Date.parse('2026-10-31T12:00:00Z'), seeding = true;
    var w = SEED.seed(function () { if (seeding) { t += 60000; return new Date(t).toISOString(); } return clock(); });
    seeding = false;
    last = Math.max(last, t);
    return w;
  }
  wf = load();

  function did(r, okText) {
    ui.flash = r && r.ok ? { ok: true, text: okText + (r.idempotent ? '（重複指令，未重複套用）' : '') } : { ok: false, text: (r && r.code) + (r && r.detail ? '：' + r.detail : '') };
    if (r && r.ok) save();
    render();
  }

  /* ---------------- views ---------------- */

  function badge(state) { return '<span class="ed-state ed-' + esc(state.toLowerCase()) + '">' + esc(STATE_ZH[state] || state) + '</span>'; }
  function qaChip(v) { return '<span class="ed-qa ed-qa-' + esc(String(v).toLowerCase()) + '">' + esc(v) + '</span>'; }
  function short(h) { return h ? esc(h.slice(0, 10)) + '…' : '—'; }

  function queue() {
    var ids = wf.items();
    return STATE_ORDER.map(function (st) {
      var list = ids.filter(function (id) { return wf.status(id).publishState === st; });
      if (!list.length) return '';
      return '<section class="ed-group"><h3>' + badge(st) + ' <span class="pv">' + list.length + '</span></h3><ul>' + list.map(function (id) {
        var it = wf.store.item(id);
        return '<li><button type="button" class="ed-row' + (ui.selected === id ? ' is-on' : '') + '" data-act="select" data-id="' + esc(id) + '">' +
          '<b>' + esc(it.zh.headline) + '</b><span class="pv">' + esc(id) + ' · r' + it.revision + ' · ' + esc(it.type) + (it.editorialLabel ? ' · ' + esc(it.editorialLabel) : '') + '</span></button></li>';
      }).join('') + '</ul></section>';
    }).join('');
  }

  function sourceRow(s) {
    var st = wf.store.sourceState(s.id);
    var link = s.originalUrl && C.safeUrl(s.originalUrl) ? '<a href="' + esc(s.originalUrl) + '" target="_blank" rel="noopener noreferrer nofollow">原文</a>' : '<span class="pv">無外部連結</span>';
    return '<tr><td><b>' + esc(s.id) + '</b><br><span class="pv">' + esc(s.publisher) + '</span></td><td>' + esc(s.kind) + '</td><td>' + esc(s.rightsStatus) + '</td><td>' + esc(st) + '</td><td>' + link +
      '<br><span class="pv">指紋 ' + short(s.contentFingerprint) + ' · 觀測 ' + esc(s.observedAt) + (s.dedupeClusterId ? ' · 群組 ' + esc(s.dedupeClusterId) : '') + '</span></td></tr>';
  }

  function detail(id) {
    if (!id) return '<div class="card"><p class="muted">選一則項目，查看版本、來源、QA、審核與收據。</p></div>';
    var s = wf.status(id), it = wf.store.item(id), hist = wf.store.itemHistory(id);
    var qa = wf.qa(id).filter(function (q) { return q.revision === s.revision; }).pop();
    var risk = wf.risk(id).filter(function (q) { return q.revision === s.revision; }).pop();
    var blockers = wf.publishBlockers(id);
    var aps = Object.keys(wf.store.state().approvals).map(function (k) { return wf.store.state().approvals[k]; }).filter(function (a) { return a.itemId === id; });
    var pubs = wf.publications(id);
    var st = s.publishState;
    var act = function (name, label, cls) { return '<button type="button" class="ed-btn ' + (cls || '') + '" data-act="' + name + '" data-id="' + esc(id) + '">' + esc(label) + '</button>'; };

    var actions = [];
    if (st === 'DRAFT' || st === 'IN_QA') actions.push(act('qa', '執行 QA（DEMO 查核員）'));
    if (st === 'AWAITING_HUMAN_APPROVAL') actions.push(act('approve', 'DEMO 核准', 'ed-ok'), act('reject', 'DEMO 拒絕', 'ed-bad'), act('hold', '退回補證據'));
    if (st === 'APPROVED') actions.push(act('publish', '發布（DEMO）', 'ed-ok'));
    if (st === 'PUBLISHED') actions.push(act('correct', '提出更正'), act('withdraw', '撤稿', 'ed-bad'));
    if (st === 'CORRECTION_PENDING') actions.push(act('withdraw', '撤稿', 'ed-bad'));
    if (st !== 'PUBLISHED' && st !== 'WITHDRAWN') actions.push(act('revise', '存成新版本'));

    var qaForm = (st === 'DRAFT' || st === 'IN_QA') ? '<div class="ed-qaform"><p class="lbl">QA 查核結果（DEMO 查核員的聲明；機器檢查失敗時無法覆蓋）</p>' + C.QA_KEYS.map(function (k) {
      return '<label>' + esc(k) + ' <select data-qa="' + k + '"><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="">未執行</option></select></label>';
    }).join('') + '</div>' : '';

    var editForm = (st !== 'PUBLISHED' && st !== 'WITHDRAWN') ? '<details class="ed-edit"><summary>編輯內容（新版本，舊版保留）</summary>' +
      ['zh', 'en'].map(function (L) {
        return '<label>' + L + ' 標題<input data-edit="' + L + '.headline" value="' + esc(it[L].headline) + '"></label>' +
          '<label>' + L + ' 摘要<textarea rows="2" data-edit="' + L + '.summary">' + esc(it[L].summary || '') + '</textarea></label>';
      }).join('') + '</details>' : '';

    return '<div class="card ed-detail">' +
      '<div class="ed-head"><div><p class="pv">' + esc(id) + ' · ' + esc(it.type) + (it.editorialLabel ? ' · ' + esc(it.editorialLabel) : '') + ' · 第 ' + it.revision + ' 版</p><h2>' + esc(it.zh.headline) + '</h2><p class="muted">' + esc(it.en.headline) + '</p></div>' + badge(st) + '</div>' +
      (it.zh.summary ? '<p>' + esc(it.zh.summary) + '</p>' : '') +
      '<p class="pv">風險標記：' + (it.riskTriggers.length ? it.riskTriggers.map(esc).join('、') : '無') + ' · 內容雜湊 ' + short(C.contentHash(it)) + '</p>' +
      '<div class="ed-actions">' + actions.join('') + '</div>' + qaForm + editForm +
      '<h3 class="lbl">發布閘門</h3>' + (blockers.length ? '<ul class="ed-block">' + blockers.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '<p class="ed-pass">可以發布：核准、QA、來源與權利皆符合本版本。</p>') +
      '<h3 class="lbl">QA（第 ' + s.revision + ' 版）</h3>' + (qa ? '<table class="ed-tbl"><tr><th>檢查</th><th>結果</th><th>原因</th><th>查核</th></tr>' + C.QA_KEYS.map(function (k) {
        return '<tr><td>' + esc(k) + '</td><td>' + qaChip(qa.qa[k]) + '</td><td>' + (qa.reasons[k].length ? qa.reasons[k].map(esc).join('<br>') : '—') + '</td><td class="pv">' + esc(qa.by[k] || '—') + '</td></tr>';
      }).join('') + '</table>' : '<p class="muted">尚未執行。</p>') +
      '<h3 class="lbl">風險路由</h3>' + (risk ? '<p><b>' + esc(risk.route) + '</b> · ' + risk.reasons.map(esc).join('、') + (risk.triggers.length ? ' · 觸發：' + risk.triggers.map(esc).join('、') : '') + '</p>' : '<p class="muted">QA 全數通過後才會路由。</p>') +
      '<h3 class="lbl">來源收據</h3><div class="table-wrap"><table class="ed-tbl"><tr><th>來源</th><th>類型</th><th>權利</th><th>目前狀態</th><th>原文／指紋</th></tr>' + it.sourceRefs.map(function (r) { return sourceRow(wf.store.source(r)); }).join('') + '</table></div>' +
      '<h3 class="lbl">內容版本</h3><ol class="ed-revs">' + hist.map(function (h) {
        return '<li>第 ' + h.revision + ' 版 · ' + esc(h.zh.headline) + ' <span class="pv">雜湊 ' + short(C.contentHash(h)) + ' · 作者 ' + esc((s.authors || {})[h.revision] || '—') + (h.correctionOfRevision ? ' · 更正第 ' + h.correctionOfRevision + ' 版' : '') + '</span></li>';
      }).join('') + '</ol>' +
      '<h3 class="lbl">審核收據</h3>' + (aps.length ? '<table class="ed-tbl"><tr><th>收據</th><th>版本</th><th>方式</th><th>決定</th><th>核准人</th><th>時間</th></tr>' + aps.map(function (a) {
        return '<tr><td>' + esc(a.id) + (a.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</td><td>r' + a.itemRevision + '</td><td>' + esc(a.mode) + '</td><td>' + esc(a.decision) + '</td><td>' + esc(a.approverId || '—') + '</td><td class="pv">' + esc(a.decidedAt) + '</td></tr>';
      }).join('') + '</table>' : '<p class="muted">沒有。</p>') +
      '<h3 class="lbl">發布收據</h3>' + (pubs.length ? receiptsTable(pubs) : '<p class="muted">沒有。</p>') +
      '<h3 class="lbl">狀態紀錄</h3><ol class="ed-revs">' + s.history.map(function (h) { return '<li>' + esc(h.to) + ' <span class="pv">' + esc(h.at) + ' · ' + esc(h.reason) + (h.by ? ' · ' + esc(h.by) : '') + '</span></li>'; }).join('') + '</ol>' +
    '</div>';
  }

  function receiptsTable(list) {
    return '<div class="table-wrap"><table class="ed-tbl"><tr><th>收據</th><th>動作</th><th>項目</th><th>版本</th><th>核准</th><th>前一張</th><th>雜湊</th><th>時間</th></tr>' + list.map(function (p) {
      return '<tr><td>' + esc(p.id) + (p.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</td><td>' + esc(p.action) + '</td><td>' + esc(p.itemId) + '</td><td>r' + p.itemRevision + '</td><td>' + esc(p.approvalMode || '—') + '</td><td>' + esc(p.previousReceiptId || '—') + '</td><td class="pv">' + short(p.receiptHash) + '</td><td class="pv">' + esc(p.recordedAt) + '</td></tr>';
    }).join('') + '</table></div>';
  }

  function layoutPanel() {
    var L = wf.store.layout(SEED.ISSUE_ID);
    var items = wf.items();
    var list = function (slot, ids) {
      return '<div class="ed-slot"><p class="lbl">' + esc(slot) + '</p><ol>' + ids.map(function (id, i) {
        return '<li><span>' + esc(id) + '</span> <span class="pv">' + esc(wf.status(id) ? wf.status(id).publishState : '?') + '</span>' +
          '<button type="button" class="ed-mini" data-act="lay-up" data-slot="' + slot + '" data-i="' + i + '" aria-label="上移">↑</button>' +
          '<button type="button" class="ed-mini" data-act="lay-del" data-slot="' + slot + '" data-i="' + i + '" aria-label="移除">×</button></li>';
      }).join('') + '</ol><select data-lay-add="' + slot + '"><option value="">＋ 加入…</option>' + items.map(function (id) { return '<option value="' + esc(id) + '">' + esc(id) + '</option>'; }).join('') + '</select></div>';
    };
    var draftL = ui.layout || (L ? { cover: L.cover.slice(), lead: L.lead, stories: L.stories.slice() } : { cover: [], lead: null, stories: [] });
    ui.layout = draftL;
    /* DEMO time runs on the workflow's own monotonic clock (seed events are pinned to 2026-10-31). */
    var nowIso = new Date(Math.max(Date.now(), last)).toISOString();
    var meta = { issueId: SEED.ISSUE_ID, mode: 'DEMO', generatedAt: nowIso, validUntil: new Date(Date.parse(nowIso) + 86400000).toISOString(), issue: { volume: 1, number: 900, date: nowIso.slice(0, 10), page: 2, topic: { line1: 'NBA', line2: 'DEMO' }, edition: { zh: 'NBA 版', en: 'NBA EDITION' } } };
    var out = PL.run(wf.buildIssue(meta), { mode: 'prototype', now: nowIso });
    var m = out.model;
    var rendered = [].concat(m.cover, m.lead ? [m.lead.item] : [], m.stories);
    return '<div class="card"><h2>版面計畫</h2><p class="muted">順序由編輯決定；預覽只顯示通過發布資格的內容，不會自行補稿或改順位。</p>' +
      '<p class="pv">目前已存：' + (L ? '第 ' + L.revision + ' 版，' + esc(L.decidedBy) + '，' + esc(L.decidedAt) : '尚無') + '</p>' +
      '<div class="ed-slots">' + list('cover', draftL.cover) + list('stories', draftL.stories) +
      '<div class="ed-slot"><p class="lbl">lead</p><select data-lay-lead><option value="">（無）</option>' + items.map(function (id) { return '<option value="' + esc(id) + '"' + (draftL.lead === id ? ' selected' : '') + '>' + esc(id) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="ed-actions"><button type="button" class="ed-btn ed-ok" data-act="lay-save">儲存為新版面（' + esc(ui.approver) + '）</button><button type="button" class="ed-btn" data-act="lay-reset">放棄修改</button></div>' +
      '<h3 class="lbl">公開預覽（已存版面 → 公開資料管線）</h3>' +
      '<p>狀態 <b>' + esc(m.status) + '</b> · 會刊出 ' + rendered.length + ' 則</p><ol class="ed-revs">' + rendered.map(function (r) { return '<li>' + esc(r.id) + ' · ' + esc(r.zh.headline) + ' <span class="pv">' + esc(r.approvalMode) + '</span></li>'; }).join('') + '</ol>' +
      '<p class="lbl">未刊出（內部原因）</p><ul class="ed-block">' + out.diagnostics.excluded.map(function (x) {
        /* MISSING from the public issue means it is not published: say which state it is in. */
        var why = x.reason === 'MISSING' && wf.status(x.id) ? 'NOT_PUBLISHED（' + (STATE_ZH[wf.status(x.id).publishState] || wf.status(x.id).publishState) + '）' : x.reason;
        return '<li>' + esc(x.slot) + ' · ' + esc(x.id) + ' · ' + esc(why) + '</li>';
      }).join('') + '</ul></div>';
  }

  function sourcesPanel() {
    var st = wf.store.state();
    return '<div class="card"><h2>來源</h2><p class="muted">來源收據不可修改；之後的狀態以事件記錄。撤回或矛盾會讓已發布內容立即下架並待更正。</p><div class="table-wrap"><table class="ed-tbl"><tr><th>來源</th><th>類型</th><th>權利</th><th>目前狀態</th><th>原文／指紋</th><th>DEMO 事件</th></tr>' +
      Object.keys(st.sources).filter(function (k) { return !/^S-RUMOR-COPY-([2-9]|10)$/.test(k); }).map(function (k) {
        var row = sourceRow(st.sources[k]).replace(/<\/tr>$/, '');
        return row + '<td>' + ['RETRACTED', 'DISPUTED', 'UNAVAILABLE', 'RESTORED'].map(function (x) { return '<button type="button" class="ed-mini" data-act="src" data-src="' + esc(k) + '" data-state="' + x + '">' + x + '</button>'; }).join('') + '</td></tr>';
      }).join('') + '</table></div></div>';
  }

  function logPanel() {
    var ev = wf.toJSON().events.slice(-40).reverse();
    return '<div class="card"><h2>發布收據（全部）</h2>' + (wf.publications().length ? receiptsTable(wf.publications()) : '<p class="muted">沒有。</p>') +
      '<h2>操作紀錄</h2><p class="muted">最近 40 筆。每筆鏈接前一筆的雜湊；雜湊用於完整性核對，不是身分驗證，本機紀錄也不是正式防竄改儲存。</p><div class="table-wrap"><table class="ed-tbl"><tr><th>#</th><th>時間</th><th>事件</th><th>內容</th><th>雜湊</th></tr>' + ev.map(function (e) {
        var d = e.data || {};
        var what = d.itemId || (d.item && d.item.id) || d.id || d.sourceId || (d.receipt && d.receipt.id) || d.commandId || '';
        var extra = d.to ? d.from + '→' + d.to : d.name || d.state || (d.receipt && d.receipt.action) || '';
        return '<tr><td>' + e.seq + '</td><td class="pv">' + esc(e.at) + '</td><td>' + esc(e.type) + '</td><td>' + esc(what) + ' ' + esc(extra) + '</td><td class="pv">' + short(e.hash) + '</td></tr>';
      }).join('') + '</table></div></div>';
  }

  function render() {
    var tabs = [['item', '稿件與審核'], ['layout', '版面計畫'], ['sources', '來源'], ['log', '收據與紀錄']];
    var main = ui.tab === 'item' ? '<div class="ed-split"><aside class="ed-queue">' + queue() + '</aside><div>' + detail(ui.selected) + '</div></div>'
      : ui.tab === 'layout' ? layoutPanel() : ui.tab === 'sources' ? sourcesPanel() : logPanel();
    document.getElementById('app').innerHTML =
      '<header class="ed-top"><a class="ed-brand" href="../index.html">MOSPORT</a><span class="ed-title">內部編輯台</span><span class="demo-badge">DEMO</span>' +
        '<label class="ed-who">DEMO 身分（未驗證，非正式核准）<select data-act-who>' + APPROVERS.map(function (a) { return '<option' + (a === ui.approver ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></label>' +
        '<span class="ed-tools"><button type="button" class="ed-mini" data-act="export">匯出紀錄 JSON</button><button type="button" class="ed-mini" data-act="reset">重設 DEMO 資料</button></span></header>' +
      '<div class="ed-banner" role="note"><b>DEMO 演練：</b>這裡的核准、拒絕、更正與撤稿都只是本機 DEMO 紀錄，不會對外發布；正式環境的資料管線會拒絕 DEMO 核准。沒有登入或角色系統，身分只是標記。</div>' +
      (ui.flash ? '<div class="ed-flash ' + (ui.flash.ok ? 'is-ok' : 'is-bad') + '" role="status">' + esc(ui.flash.text) + '</div>' : '') +
      '<nav class="ed-tabs" aria-label="編輯台分頁">' + tabs.map(function (t) { return '<button type="button" data-act="tab" data-tab="' + t[0] + '" aria-pressed="' + (ui.tab === t[0]) + '"' + (ui.tab === t[0] ? ' class="is-on"' : '') + '>' + t[1] + '</button>'; }).join('') + '</nav>' +
      '<main class="ed-main">' + main + '</main>';
  }

  /* ---------------- actions ---------------- */

  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-act-who]')) { ui.approver = e.target.value; render(); }
    if (e.target.matches('[data-lay-add]')) { var v = e.target.value; if (v) { var sl = e.target.dataset.layAdd; if (ui.layout[sl].indexOf(v) === -1) ui.layout[sl].push(v); render(); } }
    if (e.target.matches('[data-lay-lead]')) { ui.layout.lead = e.target.value || null; }
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var a = b.dataset.act, id = b.dataset.id;
    var s = id ? wf.status(id) : null;
    if (a === 'select') {
      ui.selected = id; ui.flash = null; render();
      /* One column on narrow screens: bring the detail into view. */
      if (window.innerWidth < 1024) { var d = document.querySelector('.ed-detail'); if (d) d.scrollIntoView({ block: 'start' }); }
      return;
    }
    if (a === 'tab') { ui.tab = b.dataset.tab; ui.flash = null; render(); return; }
    if (a === 'qa') {
      var att = {};
      document.querySelectorAll('[data-qa]').forEach(function (sel) { if (sel.value) att[sel.dataset.qa] = { result: sel.value, by: 'qa:demo-' + sel.dataset.qa + '-checker' }; });
      did(wf.runQA({ commandId: cmdId('qa'), itemId: id, revision: s.revision, attestations: att }), 'QA 已記錄');
    }
    if (a === 'approve') did(wf.approve({ commandId: cmdId('approve'), itemId: id, revision: s.revision, approverId: ui.approver, note: 'DEMO' }), 'DEMO 核准已記錄');
    if (a === 'reject') did(wf.reject({ commandId: cmdId('reject'), itemId: id, revision: s.revision, approverId: ui.approver, note: 'DEMO' }), 'DEMO 拒絕已記錄');
    if (a === 'hold') did(wf.hold({ commandId: cmdId('hold'), itemId: id, revision: s.revision, by: ui.approver, reason: 'DEMO：需要更多證據' }), '已退回補證據');
    if (a === 'publish') did(wf.publish({ commandId: cmdId('publish'), itemId: id, revision: s.revision }), '已發布（DEMO），收據已產生');
    if (a === 'correct') did(wf.requestCorrection({ commandId: cmdId('correct'), itemId: id, by: ui.approver, reason: 'DEMO：需要更正' }), '已下架待更正');
    if (a === 'withdraw') did(wf.withdraw({ commandId: cmdId('withdraw'), itemId: id, by: ui.approver, reason: 'DEMO：撤稿' }), '已撤稿，收據已產生');
    if (a === 'revise') {
      var it = JSON.parse(JSON.stringify(wf.store.item(id)));
      document.querySelectorAll('[data-edit]').forEach(function (el) { var p = el.dataset.edit.split('.'); it[p[0]][p[1]] = el.value.trim() || (p[1] === 'summary' ? null : it[p[0]][p[1]]); });
      did(wf.revise({ commandId: cmdId('revise'), item: it, expectedRevision: s.revision, authorId: 'writer:demo' }), '新版本已建立，需重新 QA 與審核');
    }
    if (a === 'src') did(wf.recordSourceEvent({ commandId: cmdId('src'), event: { schema: C.SCHEMAS.sourceEvent, id: 'SEV-' + Date.now().toString(36) + '-' + (++ui.cmdN), sourceId: b.dataset.src, state: b.dataset.state, at: clock(), note: 'DEMO 演練', demo: true } }), '來源狀態已記錄');
    if (a === 'lay-up' || a === 'lay-del') {
      var arr = ui.layout[b.dataset.slot], i = +b.dataset.i;
      if (a === 'lay-del') arr.splice(i, 1); else if (i > 0) { var t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; }
      render();
    }
    if (a === 'lay-reset') { ui.layout = null; render(); }
    if (a === 'lay-save') {
      var cur = wf.store.layout(SEED.ISSUE_ID);
      var plan = { schema: C.SCHEMAS.layout, id: 'L-EDITOR-' + ((cur ? cur.revision : 0) + 1), issueId: SEED.ISSUE_ID, revision: (cur ? cur.revision : 0) + 1, decidedBy: ui.approver, decidedAt: clock(), cover: ui.layout.cover, lead: ui.layout.lead, games: [], stories: ui.layout.stories, demo: true };
      var r = wf.saveLayout(plan, { expectedRevision: cur ? cur.revision : 0 });
      if (!r.ok && r.problems) r.detail = r.problems.map(function (p) { return p.code + ' ' + (p.detail || p.path); }).join('；');
      if (r.ok) ui.layout = null;
      did(r, '版面已存為新版本');
    }
    if (a === 'export') {
      var blob = new Blob([JSON.stringify(wf.toJSON(), null, 1)], { type: 'application/json' });
      var link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'mosport-demo-editor-log.json'; link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }
    if (a === 'reset') { try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ } ui.selected = null; ui.layout = null; ui.flash = { ok: true, text: '已重設為 DEMO 種子資料' }; wf = load(); render(); }
  });

  render();
})();
