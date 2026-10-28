/*
 * B-P3-01 — Editorial workflow on top of the content store (internal).
 *
 * States (engineering version of spec 03 §5; details PROPOSED in ADR-B003):
 *
 *   DRAFT ──runQA──▶ IN_QA ─┬─ fact/rights FAIL ─▶ HELD_FOR_EVIDENCE
 *                            ├─ language/policy FAIL ─▶ DRAFT
 *                            ├─ route BLOCK ─▶ HELD_FOR_EVIDENCE
 *                            ├─ route HUMAN ─▶ AWAITING_HUMAN_APPROVAL ─┬ approve ▶ APPROVED
 *                            │                                           ├ reject  ▶ REJECTED
 *                            │                                           └ hold    ▶ HELD_FOR_EVIDENCE
 *                            └─ route AUTO (all QA PASS) ─▶ APPROVED (AUTO receipt)
 *   APPROVED ──publish──▶ PUBLISHED (PUBLISH or CORRECT receipt)
 *   PUBLISHED ──requestCorrection / invalidated source──▶ CORRECTION_PENDING
 *   CORRECTION_PENDING ──revise──▶ DRAFT … ──publish──▶ PUBLISHED (CORRECT receipt)
 *   PUBLISHED | CORRECTION_PENDING | DRAFT-after-publication ──withdraw──▶ WITHDRAWN (WITHDRAW receipt)
 *
 * Every command carries a commandId. Repeating it with the same payload returns the
 * first result and appends nothing; a different payload under the same id is refused.
 * Commands that change content name the revision they expect (REVISION_CONFLICT otherwise).
 * A command lands whole or not at all (store.transaction).
 *
 * Environment: only DEMO exists in this round. Every approval and receipt is marked
 * demo, and the pipeline refuses demo approvals in production. There is no login or
 * role system; an approverId is a recorded claim, not a verified identity.
 */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('../../js/contracts/contracts.js') : root.MOSPORT_CONTRACTS;
  var R = node ? require('./risk.js') : root.MOSPORT_RISK;
  var S = node ? require('./store.js') : root.MOSPORT_STORE;

  var QA = C.QA_KEYS;
  var TRANSITIONS = {
    DRAFT: ['IN_QA', 'DRAFT', 'HELD_FOR_EVIDENCE'],
    IN_QA: ['IN_QA', 'DRAFT', 'HELD_FOR_EVIDENCE', 'AWAITING_HUMAN_APPROVAL', 'APPROVED'],
    HELD_FOR_EVIDENCE: ['DRAFT'],
    AWAITING_HUMAN_APPROVAL: ['APPROVED', 'REJECTED', 'HELD_FOR_EVIDENCE', 'DRAFT'],
    APPROVED: ['PUBLISHED', 'DRAFT', 'HELD_FOR_EVIDENCE'],
    REJECTED: ['DRAFT'],
    PUBLISHED: ['CORRECTION_PENDING', 'WITHDRAWN'],
    CORRECTION_PENDING: ['DRAFT', 'WITHDRAWN'],
    WITHDRAWN: []
  };

  /* One normal form for recorded identities, so " Writer:Demo " and "writer:demo" are the same person. */
  function normId(x) { return typeof x === 'string' ? x.trim() : ''; }
  function sameId(a, b) { return normId(a).toLowerCase() === normId(b).toLowerCase() && normId(a) !== ''; }
  function fail(code, detail, extra) { var r = { ok: false, code: code, detail: detail || '' }; for (var k in extra) r[k] = extra[k]; return r; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

  function extend(store) {
    var ext = function () { var st = store.state(); st.ext.wf = st.ext.wf || { qa: {}, risk: {}, commands: {}, publications: [], flags: [] }; return st.ext.wf; };

    store.defineEvent('WF_STATUS', {
      check: function (st, d) {
        var s = st.status[d.itemId];
        if (!s) return fail('DANGLING_REF', 'item ' + d.itemId);
        if (s.publishState !== d.from) return fail('STATE_CONFLICT', 'item is ' + s.publishState + ', not ' + d.from);
        if ((TRANSITIONS[d.from] || []).indexOf(d.to) === -1) return fail('ILLEGAL_TRANSITION', d.from + ' → ' + d.to);
        if (d.to === 'PUBLISHED' || d.to === 'WITHDRAWN') return fail('ILLEGAL_TRANSITION', d.to + ' only through a publication receipt');
        if (!d.reason) return fail('MISSING_FIELD', 'reason');
        return null;
      },
      apply: function (st, d, ev) {
        var s = st.status[d.itemId];
        s.history.push({ from: d.from, to: d.to, at: ev.at, reason: d.reason, by: d.by || null, commandId: d.commandId, revision: s.revision });
        s.publishState = d.to;
      }
    });

    store.defineEvent('WF_QA', {
      check: function (st, d) {
        var s = st.status[d.itemId];
        if (!s || s.revision !== d.revision) return fail('REVISION_CONFLICT', 'QA must be for the current revision');
        if (QA.some(function (k) { return C.ENUM.qa.indexOf(d.qa[k]) === -1; })) return fail('BAD_ENUM', 'qa');
        return null;
      },
      apply: function (st, d, ev) { var w = st.ext.wf = st.ext.wf || { qa: {}, risk: {}, commands: {}, publications: [], flags: [] }; (w.qa[d.itemId] = w.qa[d.itemId] || []).push(Object.assign({ at: ev.at }, clone(d))); }
    });

    store.defineEvent('WF_RISK', {
      check: function (st, d) { return ['AUTO', 'HUMAN', 'BLOCK'].indexOf(d.route) === -1 ? fail('BAD_ENUM', 'route') : null; },
      apply: function (st, d, ev) { var w = st.ext.wf = st.ext.wf || { qa: {}, risk: {}, commands: {}, publications: [], flags: [] }; (w.risk[d.itemId] = w.risk[d.itemId] || []).push(Object.assign({ at: ev.at }, clone(d))); }
    });

    store.defineEvent('WF_FLAG', {
      check: function (st, d) { return st.status[d.itemId] ? null : fail('DANGLING_REF', d.itemId); },
      apply: function (st, d, ev) { var w = st.ext.wf = st.ext.wf || { qa: {}, risk: {}, commands: {}, publications: [], flags: [] }; w.flags.push(Object.assign({ at: ev.at }, clone(d))); }
    });

    store.defineEvent('WF_PUBLICATION', {
      check: function (st, d) {
        var rec = d.receipt;
        var p = C.validateRecord('publication', rec);
        if (p.length) return fail('INVALID_RECORD', p.map(function (x) { return x.code + ' ' + x.path; }).join('; '));
        var w = st.ext.wf || { publications: [] };
        if (w.publications.some(function (x) { return x.id === rec.id; })) return fail('DUPLICATE_ID', rec.id);
        var mine = w.publications.filter(function (x) { return x.itemId === rec.itemId; });
        var last = mine[mine.length - 1] || null;
        if ((last ? last.id : null) !== rec.previousReceiptId || (last ? last.receiptHash : null) !== rec.previousReceiptHash) return fail('CHAIN_BROKEN', 'receipt must chain to the last one for this item');
        var s = st.status[rec.itemId];
        if (!s) return fail('DANGLING_REF', rec.itemId);
        var from = { PUBLISH: ['APPROVED'], CORRECT: ['APPROVED'], WITHDRAW: ['PUBLISHED', 'CORRECTION_PENDING', 'DRAFT', 'IN_QA', 'HELD_FOR_EVIDENCE', 'AWAITING_HUMAN_APPROVAL', 'APPROVED', 'REJECTED'] }[rec.action];
        if (from.indexOf(s.publishState) === -1) return fail('ILLEGAL_TRANSITION', s.publishState + ' → ' + rec.action);
        if (rec.action === 'PUBLISH' && last) return fail('ILLEGAL_TRANSITION', 'already published once: use CORRECT');
        if (rec.action !== 'PUBLISH' && !last) return fail('ILLEGAL_TRANSITION', rec.action + ' needs an earlier publication');
        return null;
      },
      apply: function (st, d) {
        var rec = d.receipt;
        var w = st.ext.wf = st.ext.wf || { qa: {}, risk: {}, commands: {}, publications: [], flags: [] };
        w.publications.push(clone(rec));
        var s = st.status[rec.itemId];
        s.history.push({ from: s.publishState, to: rec.action === 'WITHDRAW' ? 'WITHDRAWN' : 'PUBLISHED', at: rec.recordedAt, reason: rec.reason || rec.action, by: rec.approverId, commandId: rec.commandId, revision: rec.itemRevision });
        if (rec.action === 'WITHDRAW') { s.publishState = 'WITHDRAWN'; s.publishedRevision = null; s.publishedAt = null; s.approvalReceiptRef = null; }
        else { s.publishState = 'PUBLISHED'; s.publishedRevision = rec.itemRevision; s.publishedAt = rec.recordedAt; s.approvalReceiptRef = rec.approvalReceiptRef; }
        s.lastPublishedRevision = rec.action === 'WITHDRAW' ? s.lastPublishedRevision : rec.itemRevision;
      }
    });

    store.defineEvent('WF_COMMAND', {
      check: function (st, d) { var w = st.ext.wf || { commands: {} }; return w.commands[d.commandId] ? fail('DUPLICATE_ID', 'command ' + d.commandId) : null; },
      apply: function (st, d) { var w = st.ext.wf = st.ext.wf || { qa: {}, risk: {}, commands: {}, publications: [], flags: [] }; w.commands[d.commandId] = clone(d); }
    });

    /* ---------------- helpers ---------------- */

    var cfg = { policyVersion: R.POLICY_VERSION, demo: true, publicBase: 'demo/items/' };

    function ctxFor(item) {
      var st = store.state();
      var sources = {};
      Object.keys(st.sources).forEach(function (k) { sources[k] = st.sources[k]; });
      var states = {};
      Object.keys(sources).forEach(function (k) { states[k] = store.sourceState(k); });
      var game = item.worldAnalysisRef ? st.games.filter(function (g) { return g.gameId === item.worldAnalysisRef; })[0] || null : null;
      return { sources: sources, sourceStates: states, game: game };
    }
    function lastOf(list) { return list && list.length ? list[list.length - 1] : null; }
    function qaFor(id, rev) { var l = (ext().qa[id] || []).filter(function (q) { return q.revision === rev; }); return lastOf(l); }
    function riskFor(id, rev) { var l = (ext().risk[id] || []).filter(function (q) { return q.revision === rev; }); return lastOf(l); }
    function pubs(id) { return ext().publications.filter(function (p) { return p.itemId === id; }); }
    function status(id) { return store.status(id); }

    function status_(id, from, to, reason, commandId, by) {
      if (from === to) return { ok: true };
      return store.append('WF_STATUS', { itemId: id, from: from, to: to, reason: reason, commandId: commandId, by: by || null });
    }

    /* Idempotent command wrapper. */
    function command(name, payload, fn) {
      if (!payload || typeof payload.commandId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,79}$/.test(payload.commandId)) return fail('MISSING_FIELD', 'commandId');
      var hash = C.sha256(C.canonical({ name: name, payload: payload }));
      var prior = ext().commands[payload.commandId];
      if (prior) {
        if (prior.payloadHash !== hash) return fail('IDEMPOTENCY_CONFLICT', 'commandId ' + payload.commandId + ' was used for a different command');
        return Object.assign({ idempotent: true }, clone(prior.result));
      }
      return store.transaction(function () {
        var r = fn();
        if (!r.ok) return r;
        var c = store.append('WF_COMMAND', { commandId: payload.commandId, name: name, payloadHash: hash, result: r });
        return c.ok ? r : c;
      });
    }

    function sameItemContent(id, item) {
      var cur = store.item(id);
      return cur && C.contentHash(cur) === C.contentHash(item);
    }

    /* ---------------- commands ---------------- */

    /** New item, revision 1, DRAFT. cmd: { commandId, item, authorId } */
    function createDraft(cmd) {
      return command('createDraft', cmd, function () {
        if (!normId(cmd.authorId)) return fail('MISSING_FIELD', 'authorId');
        if (store.status(cmd.item && cmd.item.id)) return fail('DUPLICATE_ID', 'item ' + cmd.item.id);
        var it = clone(cmd.item); it.revision = 1; it.publishState = 'DRAFT'; it.publishedAt = null; it.approvalReceiptRef = null;
        var r = store.saveItem(it, { expectedRevision: 0, authorId: normId(cmd.authorId) });
        if (!r.ok) return r;
        return { ok: true, itemId: it.id, revision: 1, state: 'DRAFT' };
      });
    }

    /** New revision of an existing item. cmd: { commandId, item, expectedRevision, authorId } */
    function revise(cmd) {
      return command('revise', cmd, function () {
        var s = status(cmd.item && cmd.item.id);
        if (!s) return fail('DANGLING_REF', 'item');
        if (!normId(cmd.authorId)) return fail('MISSING_FIELD', 'authorId');
        if (cmd.expectedRevision !== s.revision) return fail('REVISION_CONFLICT', 'expected ' + cmd.expectedRevision + ', item is at ' + s.revision);
        if (s.publishState === 'PUBLISHED') return fail('ILLEGAL_TRANSITION', 'a published item is changed through requestCorrection first');
        if (s.publishState === 'WITHDRAWN') return fail('ILLEGAL_TRANSITION', 'withdrawn');
        if (sameItemContent(cmd.item.id, Object.assign({}, cmd.item))) return fail('NO_CHANGE', 'content is identical to the current revision');
        var it = clone(cmd.item); it.revision = s.revision + 1; it.publishState = 'DRAFT'; it.publishedAt = null; it.approvalReceiptRef = null;
        if (s.lastPublishedRevision && it.correctionOfRevision == null) it.correctionOfRevision = s.lastPublishedRevision;
        var r = store.saveItem(it, { expectedRevision: s.revision, authorId: normId(cmd.authorId) });
        if (!r.ok) return r;
        var t = status_(it.id, s.publishState, 'DRAFT', 'NEW_REVISION', cmd.commandId, cmd.authorId);
        if (!t.ok) return t;
        return { ok: true, itemId: it.id, revision: it.revision, state: 'DRAFT' };
      });
    }

    /**
     * Run QA for the current revision.
     * cmd: { commandId, itemId, revision, attestations: { fact|language|rights|policy: { result: 'PASS'|'FAIL', by } } }
     * Each check is machine checks AND an attestation. A machine FAIL cannot be
     * overridden; a missing attestation is NOT_RUN.
     */
    function runQA(cmd) {
      return command('runQA', cmd, function () {
        var s = status(cmd.itemId);
        if (!s) return fail('DANGLING_REF', 'item');
        if (cmd.revision !== s.revision) return fail('REVISION_CONFLICT', 'item is at ' + s.revision);
        if (['DRAFT', 'IN_QA'].indexOf(s.publishState) === -1) return fail('ILLEGAL_TRANSITION', 'QA runs on a draft, not ' + s.publishState);
        var item = store.item(cmd.itemId);
        var a = R.assess(item, ctxFor(item));
        var att = cmd.attestations || {};
        var qa = {}, reasons = {}, by = {};
        QA.forEach(function (k) {
          var m = a.machine[k];
          var t = att[k];
          by[k] = t && t.by ? String(t.by) : null;
          reasons[k] = m.reasons.slice();
          if (!m.ok) qa[k] = 'FAIL';
          else if (!t || !t.by) { qa[k] = 'NOT_RUN'; reasons[k].push('NO_ATTESTATION'); }
          else qa[k] = t.result === 'PASS' ? 'PASS' : 'FAIL';
          if (t && t.result === 'FAIL') reasons[k].push('ATTESTED_FAIL');
        });
        var r1 = status_(cmd.itemId, s.publishState, 'IN_QA', 'QA_STARTED', cmd.commandId);
        if (!r1.ok) return r1;
        var r2 = store.append('WF_QA', { itemId: cmd.itemId, revision: s.revision, qa: qa, reasons: reasons, by: by, policyVersion: cfg.policyVersion, commandId: cmd.commandId });
        if (!r2.ok) return r2;
        var next, reason, approvalRef = null, routed = null;
        if (qa.fact === 'FAIL' || qa.rights === 'FAIL') { next = 'HELD_FOR_EVIDENCE'; reason = 'QA_FAIL_' + (qa.fact === 'FAIL' ? 'FACT' : 'RIGHTS'); }
        else if (qa.language === 'FAIL' || qa.policy === 'FAIL') { next = 'DRAFT'; reason = 'QA_FAIL_' + (qa.language === 'FAIL' ? 'LANGUAGE' : 'POLICY'); }
        else if (QA.some(function (k) { return qa[k] !== 'PASS'; })) { next = 'IN_QA'; reason = 'QA_INCOMPLETE'; }
        else {
          routed = a.route;
          var r3 = store.append('WF_RISK', { itemId: cmd.itemId, revision: s.revision, route: routed.route, triggers: routed.triggers, reasons: routed.reasons, commandId: cmd.commandId });
          if (!r3.ok) return r3;
          if (routed.route === 'BLOCK') { next = 'HELD_FOR_EVIDENCE'; reason = 'ROUTE_BLOCK'; }
          else if (routed.route === 'HUMAN') { next = 'AWAITING_HUMAN_APPROVAL'; reason = 'ROUTE_HUMAN'; }
          else {
            approvalRef = 'APR-' + cmd.itemId + '-r' + s.revision + '-auto';
            var ap = store.addApproval({
              schema: C.SCHEMAS.approval, id: approvalRef, itemId: cmd.itemId, itemRevision: s.revision, contentHash: C.contentHash(item),
              mode: 'AUTO', decision: 'APPROVED', policyVersion: cfg.policyVersion, approverId: null, decidedAt: store.now(), qa: qa, note: 'ROUTE_AUTO', demo: cfg.demo
            });
            if (!ap.ok) return ap;
            next = 'APPROVED'; reason = 'ROUTE_AUTO';
          }
        }
        var r4 = status_(cmd.itemId, 'IN_QA', next, reason, cmd.commandId);
        if (!r4.ok) return r4;
        return { ok: true, itemId: cmd.itemId, revision: s.revision, qa: qa, reasons: reasons, route: routed, state: next, approvalReceiptRef: approvalRef };
      });
    }

    /** cmd: { commandId, itemId, revision, approverId, note } — HUMAN approval (DEMO). */
    function approve(cmd) { return decide(cmd, 'APPROVED'); }
    /** cmd: { commandId, itemId, revision, approverId, note } */
    function reject(cmd) { return decide(cmd, 'REJECTED'); }

    function decide(cmd, decision) {
      return command(decision === 'APPROVED' ? 'approve' : 'reject', cmd, function () {
        var s = status(cmd.itemId);
        if (!s) return fail('DANGLING_REF', 'item');
        if (cmd.revision !== s.revision) return fail('REVISION_CONFLICT', 'decision is for revision ' + cmd.revision + ', item is at ' + s.revision);
        if (s.publishState !== 'AWAITING_HUMAN_APPROVAL') return fail('ILLEGAL_TRANSITION', 'nothing awaiting a human (' + s.publishState + ')');
        if (!(typeof cmd.approverId === 'string' && cmd.approverId.trim())) return fail('MISSING_FIELD', 'approverId');
        if (s.authors && sameId(s.authors[s.revision], cmd.approverId)) return fail('SELF_APPROVAL', 'the author of a revision cannot approve it');
        var q = qaFor(cmd.itemId, s.revision);
        /* A person cannot approve past a failed check: wrong facts, fake exclusives and
           bad rights stay blocked whatever the decision says (Founder instruction §2.4). */
        if (decision === 'APPROVED' && (!q || QA.some(function (k) { return q.qa[k] !== 'PASS'; }))) return fail('QA_NOT_PASSED', 'approval needs all four QA checks PASS for this revision');
        var rk = riskFor(cmd.itemId, s.revision);
        if (decision === 'APPROVED' && (!rk || rk.route === 'BLOCK')) return fail('ROUTE_BLOCKED', 'risk route does not allow approval');
        var item = store.item(cmd.itemId);
        var id = 'APR-' + cmd.itemId + '-r' + s.revision + '-' + decision.toLowerCase();
        var ap = store.addApproval({
          schema: C.SCHEMAS.approval, id: id, itemId: cmd.itemId, itemRevision: s.revision, contentHash: C.contentHash(item),
          mode: 'HUMAN', decision: decision, policyVersion: cfg.policyVersion, approverId: cmd.approverId.trim(), decidedAt: store.now(),
          qa: q ? q.qa : { fact: 'NOT_RUN', language: 'NOT_RUN', rights: 'NOT_RUN', policy: 'NOT_RUN' }, note: cmd.note || null, demo: cfg.demo
        });
        if (!ap.ok) return ap;
        var t = status_(cmd.itemId, 'AWAITING_HUMAN_APPROVAL', decision, 'HUMAN_' + decision, cmd.commandId, cmd.approverId);
        if (!t.ok) return t;
        return { ok: true, itemId: cmd.itemId, revision: s.revision, state: decision, approvalReceiptRef: id };
      });
    }

    /** cmd: { commandId, itemId, revision, by, reason } — send back for evidence. */
    function hold(cmd) {
      return command('hold', cmd, function () {
        var s = status(cmd.itemId);
        if (!s) return fail('DANGLING_REF', 'item');
        if (cmd.revision !== s.revision) return fail('REVISION_CONFLICT', '');
        if (!cmd.reason) return fail('MISSING_FIELD', 'reason');
        var t = status_(cmd.itemId, s.publishState, 'HELD_FOR_EVIDENCE', 'HOLD: ' + cmd.reason, cmd.commandId, cmd.by);
        return t.ok ? { ok: true, itemId: cmd.itemId, state: 'HELD_FOR_EVIDENCE' } : t;
      });
    }

    /**
     * The publication boundary. Returns the reasons an item cannot be published now
     * (empty list = may publish). Used by publish() and shown in the editor.
     */
    function publishBlockers(itemId) {
      var s = status(itemId);
      if (!s) return ['ITEM_MISSING'];
      var out = [];
      if (s.publishState !== 'APPROVED') out.push('NOT_APPROVED (' + s.publishState + ')');
      var item = store.item(itemId);
      var q = qaFor(itemId, s.revision);
      if (!q || QA.some(function (k) { return q.qa[k] !== 'PASS'; })) out.push('QA_NOT_PASSED');
      if (q && q.policyVersion !== cfg.policyVersion) out.push('POLICY_VERSION_CHANGED');
      var aps = Object.keys(store.state().approvals).map(function (k) { return store.state().approvals[k]; })
        .filter(function (a) { return a.itemId === itemId && a.itemRevision === s.revision; });
      var ap = lastOf(aps);
      if (!ap) out.push('NO_APPROVAL_RECEIPT');
      else {
        if (ap.decision !== 'APPROVED') out.push('APPROVAL_NOT_APPROVED');
        if (ap.contentHash !== C.contentHash(item)) out.push('APPROVAL_STALE');
        if (ap.policyVersion !== cfg.policyVersion) out.push('POLICY_VERSION_CHANGED');
        var rk = riskFor(itemId, s.revision);
        if (!rk) out.push('NOT_ROUTED');
        else if (rk.route === 'HUMAN' && ap.mode !== 'HUMAN') out.push('HUMAN_APPROVAL_REQUIRED');
        else if (rk.route === 'BLOCK') out.push('ROUTE_BLOCKED');
      }
      /* Re-check facts and rights now: a source may have changed since QA. */
      var a = R.assess(item, ctxFor(item));
      if (!a.machine.fact.ok) out.push('FACT_RECHECK: ' + a.machine.fact.reasons.join(','));
      if (!a.machine.rights.ok) out.push('RIGHTS_RECHECK: ' + a.machine.rights.reasons.join(','));
      if (a.route.route === 'BLOCK') out.push('ROUTE_RECHECK_BLOCK');
      if (a.route.route === 'HUMAN' && ap && ap.mode !== 'HUMAN') out.push('ROUTE_RECHECK_HUMAN');
      return out;
    }

    function receipt(action, itemId, rev, extra) {
      var item = store.item(itemId, rev);
      var prev = lastOf(pubs(itemId));
      var q = qaFor(itemId, rev);
      var srcIds = item.sourceRefs.slice();
      var rec = {
        schema: C.SCHEMAS.publication, id: 'PUB-' + itemId + '-' + (pubs(itemId).length + 1), action: action,
        itemId: itemId, itemRevision: rev, contentHash: C.contentHash(item), policyVersion: cfg.policyVersion,
        qa: q ? q.qa : { fact: 'NOT_RUN', language: 'NOT_RUN', rights: 'NOT_RUN', policy: 'NOT_RUN' },
        approvalMode: extra.approval ? extra.approval.mode : null,
        approvalReceiptRef: extra.approval ? extra.approval.id : null,
        approverId: extra.approval ? extra.approval.approverId : (extra.by || null),
        sourceRefs: srcIds, sourceFingerprints: srcIds.map(function (id) { return store.state().sources[id].contentFingerprint; }),
        publicPath: action === 'WITHDRAW' ? null : cfg.publicBase + itemId.toLowerCase().replace(/[^a-z0-9._-]/g, '-'),
        recordedAt: store.now(), previousReceiptId: prev ? prev.id : null, previousReceiptHash: prev ? prev.receiptHash : null,
        reason: extra.reason || null, commandId: extra.commandId, demo: cfg.demo
      };
      rec.receiptHash = C.publicationHash(rec);
      return rec;
    }

    /** cmd: { commandId, itemId, revision } */
    function publish(cmd) {
      return command('publish', cmd, function () {
        var s = status(cmd.itemId);
        if (!s) return fail('DANGLING_REF', 'item');
        if (cmd.revision !== s.revision) return fail('REVISION_CONFLICT', 'item is at ' + s.revision);
        var blockers = publishBlockers(cmd.itemId);
        if (blockers.length) return fail('PUBLISH_BLOCKED', blockers.join('; '), { blockers: blockers });
        var aps = Object.keys(store.state().approvals).map(function (k) { return store.state().approvals[k]; }).filter(function (a) { return a.itemId === cmd.itemId && a.itemRevision === s.revision; });
        var ap = lastOf(aps);
        var action = pubs(cmd.itemId).length ? 'CORRECT' : 'PUBLISH';
        var rec = receipt(action, cmd.itemId, s.revision, { approval: ap, commandId: cmd.commandId, reason: action === 'CORRECT' ? (cmd.reason || 'CORRECTION_OF_REVISION_' + store.item(cmd.itemId).correctionOfRevision) : null });
        var r = store.append('WF_PUBLICATION', { receipt: rec });
        if (!r.ok) return r;
        return { ok: true, itemId: cmd.itemId, revision: s.revision, state: 'PUBLISHED', receipt: rec };
      });
    }

    /** cmd: { commandId, itemId, by, reason } — take a published item down for correction. */
    function requestCorrection(cmd) {
      return command('requestCorrection', cmd, function () {
        var s = status(cmd.itemId);
        if (!s) return fail('DANGLING_REF', 'item');
        if (!cmd.reason) return fail('MISSING_FIELD', 'reason');
        if (s.publishState !== 'PUBLISHED') return fail('ILLEGAL_TRANSITION', 'only a published item can need correction');
        var t = status_(cmd.itemId, 'PUBLISHED', 'CORRECTION_PENDING', 'CORRECTION: ' + cmd.reason, cmd.commandId, cmd.by);
        return t.ok ? { ok: true, itemId: cmd.itemId, state: 'CORRECTION_PENDING' } : t;
      });
    }

    /** cmd: { commandId, itemId, by, reason } */
    function withdraw(cmd) {
      return command('withdraw', cmd, function () {
        var s = status(cmd.itemId);
        if (!s) return fail('DANGLING_REF', 'item');
        if (!cmd.reason) return fail('MISSING_FIELD', 'reason');
        if (!pubs(cmd.itemId).length) return fail('ILLEGAL_TRANSITION', 'never published: reject or leave as draft instead');
        if (s.publishState === 'WITHDRAWN') return fail('ILLEGAL_TRANSITION', 'already withdrawn');
        var rev = s.publishedRevision || s.lastPublishedRevision;
        var rec = receipt('WITHDRAW', cmd.itemId, rev, { by: cmd.by || null, reason: cmd.reason, commandId: cmd.commandId });
        var r = store.append('WF_PUBLICATION', { receipt: rec });
        if (!r.ok) return r;
        return { ok: true, itemId: cmd.itemId, state: 'WITHDRAWN', receipt: rec };
      });
    }

    /**
     * A source changed state. Invalidating states pull published items into
     * CORRECTION_PENDING (so the reader stops showing them) and hold items on their
     * way to publication. UNAVAILABLE holds unpublished items and flags published ones.
     * cmd: { commandId, event: SourceEvent }
     */
    function recordSourceEvent(cmd) {
      return command('recordSourceEvent', cmd, function () {
        var r = store.recordSourceEvent(cmd.event);
        if (!r.ok) return r;
        var st = store.state();
        var hit = Object.keys(st.items).filter(function (id) { return store.item(id).sourceRefs.indexOf(cmd.event.sourceId) !== -1; });
        var invalid = C.INVALIDATING.indexOf(cmd.event.state) !== -1;
        var moved = [];
        for (var i = 0; i < hit.length; i++) {
          var id = hit[i], s = status(id), to = null;
          if (invalid && s.publishState === 'PUBLISHED') to = 'CORRECTION_PENDING';
          else if ((invalid || cmd.event.state === 'UNAVAILABLE') && ['IN_QA', 'AWAITING_HUMAN_APPROVAL', 'APPROVED', 'DRAFT'].indexOf(s.publishState) !== -1) to = 'HELD_FOR_EVIDENCE';
          if (to) {
            var t = status_(id, s.publishState, to, 'SOURCE_' + cmd.event.state + ':' + cmd.event.sourceId, cmd.commandId, 'system');
            if (!t.ok) return t;
            moved.push({ itemId: id, to: to });
          } else if (cmd.event.state === 'UNAVAILABLE' && s.publishState === 'PUBLISHED') {
            var f = store.append('WF_FLAG', { itemId: id, flag: 'SOURCE_UNAVAILABLE', sourceId: cmd.event.sourceId, commandId: cmd.commandId });
            if (!f.ok) return f;
            moved.push({ itemId: id, flag: 'SOURCE_UNAVAILABLE' });
          }
        }
        return { ok: true, sourceId: cmd.event.sourceId, state: cmd.event.state, affected: moved };
      });
    }

    var wf = {
      store: store, config: cfg,
      createDraft: createDraft, revise: revise, runQA: runQA, approve: approve, reject: reject, hold: hold,
      publish: publish, requestCorrection: requestCorrection, withdraw: withdraw, recordSourceEvent: recordSourceEvent,
      addSource: function (rec) { return store.addSource(rec); },
      putGames: function (g) { return store.putGames(g); },
      saveLayout: function (p, o) { return store.saveLayout(p, o); },
      publishBlockers: publishBlockers,
      status: status,
      qa: function (id) { return clone(ext().qa[id] || []); },
      risk: function (id) { return clone(ext().risk[id] || []); },
      publications: function (id) { return clone(id ? pubs(id) : ext().publications); },
      flags: function () { return clone(ext().flags); },
      assess: function (id, rev) { var it = store.item(id, rev); return it ? R.assess(it, ctxFor(it)) : null; },
      items: function () { return Object.keys(store.state().items); },
      buildIssue: function (meta) { return store.buildIssue(meta); },
      toJSON: function () { return store.toJSON(); }
    };
    return wf;
  }

  /** opts: { clock, environment } — only 'DEMO' is available in this round. */
  function createWorkflow(opts) {
    opts = opts || {};
    if ((opts.environment || 'DEMO') !== 'DEMO') throw new Error('Only the DEMO environment exists: there is no identity system or server-side release authority yet (ADR-B003).');
    return extend(S.createStore({ clock: opts.clock }));
  }
  createWorkflow.fromJSON = function (json, opts) {
    opts = opts || {};
    if ((opts.environment || 'DEMO') !== 'DEMO') throw new Error('Only the DEMO environment exists.');
    return S.createStore.fromJSON(json, { clock: opts.clock, extend: extend });
  };

  var api = { createWorkflow: createWorkflow, TRANSITIONS: TRANSITIONS };
  if (node) module.exports = api;
  else root.MOSPORT_WORKFLOW = api;
})(typeof window !== 'undefined' ? window : globalThis);
