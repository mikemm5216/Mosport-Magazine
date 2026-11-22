/*
 * B-P2-01a internal inspector for a MOSPORT-A world-analysis-package@1 file.
 * Renders MOSPORT_WORLD_A1.internalView only (textContent, never innerHTML).
 * The read clock defaults to now; ?now=<ISO> pins it for review and tests.
 */
(function () {
  'use strict';
  var W = window.MOSPORT_WORLD_A1;
  var out = document.getElementById('ap-out');
  var nowIn = document.getElementById('ap-now');
  var q = new URLSearchParams(location.search);
  var pinnedClock = !!q.get('now');
  nowIn.value = q.get('now') || new Date().toISOString();
  var clockMode = document.getElementById('ap-clock-mode');
  function showClockMode() { clockMode.textContent = pinnedClock ? '歷史時間回放 · Replay clock (not live)' : '即時讀取 · Live clock'; }
  showClockMode();
  var current = null;
  var currentFacts = null;
  var F = window.MOSPORT_PREGAME_FACTS;

  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function reason(m) { return m.status + ' · ' + m.reason; }
  function rows(dl, pairs) {
    pairs.forEach(function (p) { dl.appendChild(el('dt', p[0])); var d = el('dd', p[1]); d.dataset.key = p[2] || ''; dl.appendChild(d); });
  }

  function render() {
    out.textContent = '';
    if (!current) { out.appendChild(el('p', '尚未載入 · No package loaded')); return; }
    if (current.parseError) { out.appendChild(el('p', 'REFUSED · NOT_JSON', 'ed-flash is-bad')); out.dataset.status = 'REFUSED'; return; }
    var v = W.internalView(current.json, nowIn.value);
    out.dataset.status = v.status;
    if (v.status !== 'OK') {
      var bad = el('p', 'REFUSED · ' + v.code + (v.path ? ' @ ' + v.path : ''), 'ed-flash is-bad');
      bad.id = 'ap-refused';
      out.appendChild(bad);
      return;
    }
    out.dataset.readState = v.readState;
    var h = el('h2', v.game.away.displayCode + ' @ ' + v.game.home.displayCode + ' · ' + v.game.canonicalId);
    out.appendChild(h);
    var dl = el('dl', null, 'ap-dl');
    rows(dl, [
      ['讀取狀態 · Read state', v.readState, 'readState'],
      ['World', v.world.state + ' · ' + v.world.missingReason, 'world'],
      ['發布 · Distribution', v.world.distributionEligibility + ' · rights ' + v.qualification.rights, 'distribution'],
      ['公開頁 · Public reader', v.publicRenderable ? 'RENDERABLE' : 'NOT RENDERED · ' + v.publicBlockers.join(', '), 'public'],
      ['Engine', reason(v.world.engine), 'engine'],
      ['Why', reason(v.world.why), 'why'],
      ['開賽 · Tipoff (UTC)', v.game.tipoffAt, 'tipoff'],
      ['場館 · Venue', v.game.venue.venueId + ' · ' + v.game.venue.timeZone + ' · ' + v.game.venue.localDate, 'venue'],
      ['NBA game id', reason(v.game.nbaGameId), 'nbaGameId'],
      ['賽程資格 · Schedule', v.qualification.schedule + (v.qualification.reason ? ' · ' + v.qualification.reason : ''), 'schedule'],
      ['來源 · Source receipt', v.evidence.sourceClass + ' · ' + v.evidence.receiptObservedAt + ' · ' + v.evidence.receiptSha256, 'receipt'],
      ['賽前快照 · Snapshot', v.evidence.snapshot ? v.evidence.snapshot.capturedAt + ' · ' + v.evidence.snapshot.sha256 : 'BLOCKED_MISSING · ' + v.evidence.snapshotMissingReason, 'snapshot'],
      ['截止 · Lock / as of / valid until', v.lockAt + ' / ' + v.asOf + ' / ' + v.validUntil, 'times'],
      ['生命週期 · Lifecycle', v.lifecycle.state + ' · ' + v.lifecycle.receiptObservedAt + ' · ' + v.lifecycle.receiptSha256, 'lifecycle'],
      ['賽後 · Follow', 'status ' + reason(v.follow.status) + ' / score ' + reason(v.follow.score) + ' / settlement ' + reason(v.follow.settlement), 'follow'],
      ['Revision', v.revision, 'revision'],
      ['B 無法驗證 · Not verified by B', v.consumerLimits.join(', '), 'limits']
    ]);
    out.appendChild(dl);
    if (currentFacts) {
      var facts = currentFacts.parseError ? { ok: false, reason: 'NOT_JSON' } : F.inspect(currentFacts.json, current.json, nowIn.value);
      if (!facts.ok) { out.appendChild(el('p', '賽前事實不可顯示 · ' + facts.reason, 'ed-flash is-bad')); return; }
      out.appendChild(el('h3', '賽前來源事實 · INTERNAL / ESPN'));
      var table = el('dl', null, 'ap-dl');
      [['home', '主隊'], ['away', '客隊']].forEach(function (entry) {
        var side = facts.sides[entry[0]], values = side.statistics;
        function display(value) { return value.status === 'OBSERVED' ? value.displayValue : '未提供'; }
        rows(table, [[entry[1] + ' ' + side.team.displayCode, '戰績 ' + display(side.overallRecord) + ' · 場均得分 ' + display(values.avgPoints) + ' · 場均籃板 ' + display(values.avgRebounds) + ' · 場均助攻 ' + display(values.avgAssists) + ' · 投籃% ' + display(values.fieldGoalPct) + ' · 三分% ' + display(values.threePointPct)]]);
      });
      out.appendChild(table);
      out.appendChild(el('p', '來源事實僅供內部檢視；權利未確認，未產生 World 預測。'));
    }
  }

  document.getElementById('ap-facts').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    f.text().then(function (t) { try { currentFacts = { json: JSON.parse(t) }; } catch (err) { currentFacts = { parseError: true }; } render(); });
  });
  document.getElementById('ap-file').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    f.text().then(function (t) {
      try { current = { json: JSON.parse(t) }; } catch (err) { current = { parseError: true }; }
      render();
    });
  });
  function pinEditedClock() { pinnedClock = true; showClockMode(); render(); }
  nowIn.addEventListener('input', pinEditedClock);
  nowIn.addEventListener('change', pinEditedClock);
  setInterval(function () { if (!pinnedClock) { nowIn.value = new Date().toISOString(); render(); } }, 1000);
})();
