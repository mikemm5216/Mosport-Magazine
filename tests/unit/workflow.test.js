'use strict';
/* B-P3-01 workflow: transitions, idempotency, revision conflicts, receipts, persistence. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { C, clone } = require('./helpers.js');
const { createWorkflow } = require('../../site/internal/js/workflow.js');
const PC = require('../../site/internal/js/policy-cases.js');

function clock(start = '2026-10-31T12:00:00Z') { let t = Date.parse(start); return () => new Date(t += 60000).toISOString(); }
function setup() {
  const wf = createWorkflow({ clock: clock() });
  PC.SOURCES.forEach((s) => assert.ok(wf.addSource(clone(s)).ok));
  assert.ok(wf.putGames(clone(PC.GAMES)).ok);
  let n = 0;
  wf.cmd = () => 'c-' + (++n);
  return wf;
}
const draft = (wf, key, extra = {}) => wf.createDraft({ commandId: wf.cmd(), item: Object.assign(clone(PC.CASES[key].item), extra), authorId: 'writer:demo' });
const qa = (wf, id, rev, att = PC.PASS_ALL) => wf.runQA({ commandId: wf.cmd(), itemId: id, revision: rev, attestations: att });

test('only the DEMO environment exists: a PRODUCTION workflow cannot be created', () => {
  assert.throws(() => createWorkflow({ environment: 'PRODUCTION' }), /Only the DEMO environment/);
});

test('M-01 path: DRAFT → IN_QA → APPROVED (AUTO receipt) → PUBLISHED (PUBLISH receipt)', () => {
  const wf = setup();
  assert.equal(draft(wf, 'M-01').state, 'DRAFT');
  const q = qa(wf, 'CASE-M01', 1);
  assert.equal(q.state, 'APPROVED');
  assert.equal(q.route.route, 'AUTO');
  const p = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 });
  assert.equal(p.state, 'PUBLISHED');
  const r = p.receipt;
  assert.equal(r.action, 'PUBLISH');
  assert.equal(r.approvalMode, 'AUTO');
  assert.deepEqual(r.qa, { fact: 'PASS', language: 'PASS', rights: 'PASS', policy: 'PASS' });
  assert.deepEqual(r.sourceRefs, ['S-OFF-FINAL']);
  assert.equal(r.demo, true);
  assert.equal(r.receiptHash, C.publicationHash(r));
  assert.deepEqual(C.validateRecord('publication', r), []);
  assert.deepEqual(wf.status('CASE-M01').history.map((h) => h.to), ['IN_QA', 'APPROVED', 'PUBLISHED']);
});

test('a missing attestation leaves QA NOT_RUN; an attested PASS cannot override a machine FAIL', () => {
  const wf = setup();
  draft(wf, 'M-01');
  const q = qa(wf, 'CASE-M01', 1, { fact: PC.PASS_ALL.fact, language: PC.PASS_ALL.language, rights: PC.PASS_ALL.rights });
  assert.equal(q.qa.policy, 'NOT_RUN');
  assert.equal(q.state, 'IN_QA');
  assert.equal(wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 }).code, 'PUBLISH_BLOCKED');
  draft(wf, 'M-07');
  const r = qa(wf, 'CASE-M07', 1);
  assert.equal(r.qa.rights, 'FAIL', 'all attested PASS, machine rights check still FAIL');
  assert.equal(r.state, 'HELD_FOR_EVIDENCE');
});

test('illegal transitions are refused and leave no trace in the log', () => {
  const wf = setup();
  draft(wf, 'M-01');
  const before = wf.toJSON().events.length;
  assert.equal(wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 }).code, 'PUBLISH_BLOCKED');
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1, approverId: 'editor:demo' }).code, 'ILLEGAL_TRANSITION');
  assert.equal(wf.requestCorrection({ commandId: wf.cmd(), itemId: 'CASE-M01', reason: 'x' }).code, 'ILLEGAL_TRANSITION');
  assert.equal(wf.withdraw({ commandId: wf.cmd(), itemId: 'CASE-M01', reason: 'x' }).code, 'ILLEGAL_TRANSITION');
  assert.equal(wf.toJSON().events.length, before);
  assert.equal(wf.status('CASE-M01').publishState, 'DRAFT');
});

test('the same command twice is applied once; reusing its id for something else is refused', () => {
  const wf = setup();
  draft(wf, 'M-01');
  qa(wf, 'CASE-M01', 1);
  const cmd = { commandId: 'publish-once', itemId: 'CASE-M01', revision: 1 };
  const a = wf.publish(cmd);
  const n = wf.toJSON().events.length;
  const b = wf.publish(clone(cmd));
  assert.equal(b.idempotent, true);
  assert.equal(b.receipt.id, a.receipt.id);
  assert.equal(wf.toJSON().events.length, n, 'nothing appended');
  assert.equal(wf.publications('CASE-M01').length, 1);
  assert.equal(wf.withdraw({ commandId: 'publish-once', itemId: 'CASE-M01', reason: 'x' }).code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(wf.publish({ commandId: 'publish-once', itemId: 'CASE-M01', revision: 2 }).code, 'IDEMPOTENCY_CONFLICT');
});

test('a stale editor (old revision) gets REVISION_CONFLICT on revise, QA, approve and publish', () => {
  const wf = setup();
  draft(wf, 'M-03');
  const v2 = clone(PC.CASES['M-03'].item); v2.en.summary = 'Updated: official report confirms six weeks.';
  assert.equal(wf.revise({ commandId: wf.cmd(), item: v2, expectedRevision: 1, authorId: 'writer:demo' }).revision, 2);
  const v2b = clone(v2); v2b.en.summary = 'A parallel edit made from revision 1.';
  assert.equal(wf.revise({ commandId: wf.cmd(), item: v2b, expectedRevision: 1, authorId: 'writer:other' }).code, 'REVISION_CONFLICT');
  assert.equal(qa(wf, 'CASE-M03', 1).code, 'REVISION_CONFLICT');
  qa(wf, 'CASE-M03', 2);
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1, approverId: 'editor:demo' }).code, 'REVISION_CONFLICT');
  assert.equal(wf.revise({ commandId: wf.cmd(), item: v2, expectedRevision: 2, authorId: 'writer:demo' }).code, 'NO_CHANGE');
});

test('editing after approval: the old approval does not approve the new revision', () => {
  const wf = setup();
  draft(wf, 'M-03');
  qa(wf, 'CASE-M03', 1);
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1, approverId: 'editor:demo' }).state, 'APPROVED');
  const v2 = clone(PC.CASES['M-03'].item); v2.zh.headline = '主力控衛傷停八週';
  wf.revise({ commandId: wf.cmd(), item: v2, expectedRevision: 1, authorId: 'writer:demo' });
  assert.equal(wf.status('CASE-M03').publishState, 'DRAFT');
  const p = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 2 });
  assert.equal(p.code, 'PUBLISH_BLOCKED');
  assert.ok(p.blockers.includes('NO_APPROVAL_RECEIPT'));
  qa(wf, 'CASE-M03', 2);
  assert.equal(wf.status('CASE-M03').publishState, 'AWAITING_HUMAN_APPROVAL', 'needs a fresh human decision');
});

test('nobody approves their own revision; approval needs a named approver', () => {
  const wf = setup();
  draft(wf, 'M-05');
  qa(wf, 'CASE-M05', 1);
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M05', revision: 1, approverId: 'writer:demo' }).code, 'SELF_APPROVAL');
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M05', revision: 1, approverId: '  ' }).code, 'MISSING_FIELD');
  const ok = wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M05', revision: 1, approverId: 'editor:demo' });
  assert.equal(ok.state, 'APPROVED');
  const ap = wf.store.approval(ok.approvalReceiptRef);
  assert.equal(ap.mode, 'HUMAN');
  assert.equal(ap.demo, true, 'a DEMO approval: the public pipeline refuses it in production');
});

test('reject records a REJECTED receipt and the item cannot be published', () => {
  const wf = setup();
  draft(wf, 'M-02');
  qa(wf, 'CASE-M02', 1);
  const r = wf.reject({ commandId: wf.cmd(), itemId: 'CASE-M02', revision: 1, approverId: 'editor:demo', note: 'not newsworthy' });
  assert.equal(r.state, 'REJECTED');
  assert.equal(wf.store.approval(r.approvalReceiptRef).decision, 'REJECTED');
  assert.equal(wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M02', revision: 1 }).code, 'PUBLISH_BLOCKED');
});

test('correction: PUBLISHED → CORRECTION_PENDING → new revision → CORRECT receipt chained to PUBLISH', () => {
  const wf = setup();
  draft(wf, 'M-06');
  qa(wf, 'CASE-M06', 1);
  const p1 = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M06', revision: 1 }).receipt;
  assert.equal(wf.requestCorrection({ commandId: wf.cmd(), itemId: 'CASE-M06', by: 'editor:demo', reason: 'date was wrong' }).state, 'CORRECTION_PENDING');
  const v2 = clone(PC.CASES['M-06'].item); v2.en.summary = 'Correction: an official notice moves the game to Monday.'; v2.zh.summary = '更正：官方公告比賽改至週一。';
  wf.revise({ commandId: wf.cmd(), item: v2, expectedRevision: 1, authorId: 'writer:demo' });
  assert.equal(wf.store.item('CASE-M06').correctionOfRevision, 1);
  qa(wf, 'CASE-M06', 2);
  const p2 = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M06', revision: 2 }).receipt;
  assert.equal(p2.action, 'CORRECT');
  assert.equal(p2.previousReceiptId, p1.id);
  assert.equal(p2.previousReceiptHash, p1.receiptHash);
  assert.equal(wf.store.itemHistory('CASE-M06')[0].en.summary, 'An official notice moves the game.', 'original revision kept');
  assert.equal(wf.publications('CASE-M06').length, 2);
});

test('withdraw: WITHDRAW receipt chained, state final, nothing republishes it', () => {
  const wf = setup();
  draft(wf, 'M-01'); qa(wf, 'CASE-M01', 1);
  const p1 = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 }).receipt;
  assert.equal(wf.withdraw({ commandId: wf.cmd(), itemId: 'CASE-M01', reason: '' }).code, 'MISSING_FIELD');
  const w = wf.withdraw({ commandId: wf.cmd(), itemId: 'CASE-M01', by: 'editor:demo', reason: 'source error' });
  assert.equal(w.receipt.action, 'WITHDRAW');
  assert.equal(w.receipt.previousReceiptId, p1.id);
  assert.equal(w.receipt.itemRevision, 1);
  assert.equal(wf.status('CASE-M01').publishState, 'WITHDRAWN');
  assert.equal(wf.withdraw({ commandId: wf.cmd(), itemId: 'CASE-M01', reason: 'again' }).code, 'ILLEGAL_TRANSITION');
  const v2 = clone(PC.CASES['M-01'].item); v2.en.summary = 'x';
  assert.equal(wf.revise({ commandId: wf.cmd(), item: v2, expectedRevision: 1, authorId: 'writer:demo' }).code, 'ILLEGAL_TRANSITION');
});

test('an invalidated source pulls published items and holds items on their way to publication', () => {
  const wf = setup();
  draft(wf, 'M-06'); qa(wf, 'CASE-M06', 1);
  wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M06', revision: 1 });
  draft(wf, 'M-01', { id: 'CASE-M06-SIBLING', sourceRefs: ['S-OFF-RETRACT'] });
  qa(wf, 'CASE-M06-SIBLING', 1);
  assert.equal(wf.status('CASE-M06-SIBLING').publishState, 'APPROVED');
  const r = wf.recordSourceEvent({ commandId: wf.cmd(), event: { schema: C.SCHEMAS.sourceEvent, id: 'SEV-1', sourceId: 'S-OFF-RETRACT', state: 'RETRACTED', at: '2026-10-31T13:00:00Z', note: 'DEMO: notice withdrawn', demo: true } });
  assert.deepEqual(r.affected.map((a) => a.itemId + '→' + a.to).sort(), ['CASE-M06-SIBLING→HELD_FOR_EVIDENCE', 'CASE-M06→CORRECTION_PENDING']);
  assert.ok(wf.publishBlockers('CASE-M06-SIBLING').length);
  assert.equal(wf.publications('CASE-M06').length, 1, 'the earlier PUBLISH receipt stays');
});

test('an unavailable source flags published items and holds unpublished ones', () => {
  const wf = setup();
  draft(wf, 'M-01'); qa(wf, 'CASE-M01', 1);
  wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 });
  const r = wf.recordSourceEvent({ commandId: wf.cmd(), event: { schema: C.SCHEMAS.sourceEvent, id: 'SEV-2', sourceId: 'S-OFF-FINAL', state: 'UNAVAILABLE', at: '2026-10-31T14:00:00Z', note: null, demo: true } });
  assert.deepEqual(r.affected, [{ itemId: 'CASE-M01', flag: 'SOURCE_UNAVAILABLE' }]);
  assert.equal(wf.status('CASE-M01').publishState, 'PUBLISHED');
  assert.equal(wf.flags().length, 1);
});

test('save → reload: the same state, approvals, receipts and command memory; replayed commands stay idempotent', () => {
  const wf = setup();
  draft(wf, 'M-01'); qa(wf, 'CASE-M01', 1);
  wf.publish({ commandId: 'pub-1', itemId: 'CASE-M01', revision: 1 });
  draft(wf, 'M-05'); qa(wf, 'CASE-M05', 1);
  const json = JSON.parse(JSON.stringify(wf.toJSON()));
  const back = createWorkflow.fromJSON(json, { clock: clock('2026-11-01T00:00:00Z') });
  for (const id of ['CASE-M01', 'CASE-M05']) assert.deepEqual(back.status(id), wf.status(id));
  assert.deepEqual(back.publications(), wf.publications());
  assert.equal(back.publish({ commandId: 'pub-1', itemId: 'CASE-M01', revision: 1 }).idempotent, true);
  assert.equal(back.approve({ commandId: 'x-1', itemId: 'CASE-M05', revision: 1, approverId: 'writer:demo' }).code, 'SELF_APPROVAL', 'authorship survives reload');
  const tampered = clone(json);
  tampered.events.find((e) => e.type === 'WF_PUBLICATION').data.receipt.approvalMode = 'HUMAN';
  assert.throws(() => createWorkflow.fromJSON(tampered), /integrity/);
});

test('a receipt whose own hash is wrong, or that breaks the chain, is refused even if appended directly', () => {
  const wf = setup();
  draft(wf, 'M-01'); qa(wf, 'CASE-M01', 1);
  const p = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 }).receipt;
  const forged = clone(p); forged.id = 'PUB-FORGED'; forged.action = 'CORRECT'; forged.previousReceiptId = p.id; forged.previousReceiptHash = p.receiptHash; forged.reason = 'x';
  assert.equal(wf.store.append('WF_PUBLICATION', { receipt: forged }).code, 'INVALID_RECORD', 'hash no longer matches');
  forged.receiptHash = C.publicationHash(forged);
  assert.equal(wf.store.append('WF_PUBLICATION', { receipt: forged }).code, 'ILLEGAL_TRANSITION', 'not APPROVED');
  const unchained = clone(p); unchained.id = 'PUB-X'; unchained.previousReceiptId = null; unchained.previousReceiptHash = null; unchained.receiptHash = C.publicationHash(unchained);
  assert.equal(wf.store.append('WF_PUBLICATION', { receipt: unchained }).code, 'CHAIN_BROKEN');
});

test('a failing step inside a command rolls the whole command back', () => {
  const wf = setup();
  draft(wf, 'M-01');
  const n = wf.toJSON().events.length;
  const bad = clone(PC.CASES['M-01'].item); bad.sourceRefs = ['S-NOT-THERE']; bad.en.summary = 'changed';
  assert.equal(wf.revise({ commandId: wf.cmd(), item: bad, expectedRevision: 1, authorId: 'w' }).code, 'DANGLING_REF');
  assert.equal(wf.toJSON().events.length, n);
  assert.equal(wf.status('CASE-M01').revision, 1);
});

test('local file persistence: atomic save, reload replays, history cannot be rewritten through save', () => {
  const os = require('node:os');
  const fs = require('node:fs');
  const path = require('node:path');
  const F = require('../../scripts/lib/event-log-file.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosport-wf-'));
  const file = path.join(dir, 'log.json');
  const wf = setup();
  draft(wf, 'M-01'); qa(wf, 'CASE-M01', 1);
  F.save(file, wf);
  wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 });
  F.save(file, wf);
  const back = F.load(file, { clock: clock('2026-11-02T00:00:00Z') });
  assert.equal(back.status('CASE-M01').publishState, 'PUBLISHED');
  /* A different history (another workflow) cannot overwrite the saved one. */
  const other = setup();
  draft(other, 'M-05');
  assert.throws(() => F.save(file, other), /APPEND_ONLY_VIOLATION/);
  assert.equal(F.load(file).status('CASE-M01').publishState, 'PUBLISHED');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('defence in depth: even if an item reaches AWAITING without passing QA, a human cannot approve it', () => {
  const wf = setup();
  draft(wf, 'M-03');
  qa(wf, 'CASE-M03', 1, { fact: PC.PASS_ALL.fact }); // three checks NOT_RUN → stays IN_QA
  assert.equal(wf.status('CASE-M03').publishState, 'IN_QA');
  /* Simulate a faulty or forged path straight to AWAITING. */
  assert.ok(wf.store.append('WF_STATUS', { itemId: 'CASE-M03', from: 'IN_QA', to: 'AWAITING_HUMAN_APPROVAL', reason: 'forged', commandId: 'forged-1' }).ok);
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1, approverId: 'editor:demo' }).code, 'QA_NOT_PASSED');
  assert.equal(wf.store.append('WF_STATUS', { itemId: 'CASE-M03', from: 'AWAITING_HUMAN_APPROVAL', to: 'PUBLISHED', reason: 'forged', commandId: 'forged-2' }).code, 'ILLEGAL_TRANSITION', 'PUBLISHED only through a receipt');
});

test('publication boundary re-checks sources at publish time, after approval', () => {
  const wf = setup();
  draft(wf, 'M-01'); qa(wf, 'CASE-M01', 1);
  assert.equal(wf.status('CASE-M01').publishState, 'APPROVED');
  /* A RESTORED event changes nothing; a DISPUTED one between approval and publish blocks it. */
  wf.store.append('SOURCE_EVENT', { schema: C.SCHEMAS.sourceEvent, id: 'SEV-direct', sourceId: 'S-OFF-FINAL', state: 'DISPUTED', at: '2026-10-31T13:00:00Z', note: null, demo: true });
  const p = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 });
  assert.equal(p.code, 'PUBLISH_BLOCKED');
  assert.ok(p.blockers.some((b) => /FACT_RECHECK/.test(b)));
});

test('Codex #9: self-approval cannot be bypassed with spacing or case', () => {
  const wf = setup();
  wf.createDraft({ commandId: wf.cmd(), item: clone(PC.CASES['M-05'].item), authorId: '  writer:demo ' });
  qa(wf, 'CASE-M05', 1);
  for (const who of [' writer:demo ', 'WRITER:DEMO', 'writer:demo\t']) {
    assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M05', revision: 1, approverId: who }).code, 'SELF_APPROVAL', JSON.stringify(who));
  }
  assert.equal(wf.status('CASE-M05').authors[1], 'writer:demo', 'stored trimmed');
});

test('Codex #9: an UNAVAILABLE source blocks QA, AUTO approval and publication for new revisions too', () => {
  const wf = setup();
  draft(wf, 'M-01'); qa(wf, 'CASE-M01', 1);
  wf.recordSourceEvent({ commandId: wf.cmd(), event: { schema: C.SCHEMAS.sourceEvent, id: 'SEV-U', sourceId: 'S-OFF-FINAL', state: 'UNAVAILABLE', at: '2026-10-31T13:00:00Z', note: null, demo: true } });
  assert.equal(wf.status('CASE-M01').publishState, 'HELD_FOR_EVIDENCE');
  const v2 = clone(PC.CASES['M-01'].item); v2.en.summary = 'Edited to try again.';
  wf.revise({ commandId: wf.cmd(), item: v2, expectedRevision: 1, authorId: 'writer:demo' });
  const q = qa(wf, 'CASE-M01', 2);
  assert.equal(q.qa.fact, 'FAIL');
  assert.ok(q.reasons.fact.includes('SOURCE_UNAVAILABLE:S-OFF-FINAL'));
  assert.equal(q.state, 'HELD_FOR_EVIDENCE');
  /* A brand-new item on the same source is held as well; RESTORED lifts it. */
  draft(wf, 'M-01', { id: 'CASE-M01-NEW' });
  assert.equal(qa(wf, 'CASE-M01-NEW', 1).state, 'HELD_FOR_EVIDENCE');
  wf.recordSourceEvent({ commandId: wf.cmd(), event: { schema: C.SCHEMAS.sourceEvent, id: 'SEV-R', sourceId: 'S-OFF-FINAL', state: 'RESTORED', at: '2026-10-31T14:00:00Z', note: null, demo: true } });
  const v3 = clone(PC.CASES['M-01'].item); v3.id = 'CASE-M01-NEW'; v3.en.summary = 'After the source is back.';
  wf.revise({ commandId: wf.cmd(), item: v3, expectedRevision: 1, authorId: 'writer:demo' });
  assert.equal(qa(wf, 'CASE-M01-NEW', 2).state, 'APPROVED');
});
