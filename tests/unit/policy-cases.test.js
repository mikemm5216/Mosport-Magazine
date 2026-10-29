'use strict';
/*
 * Founder acceptance M-01…M-07 (spec 04 §2), end to end:
 * workflow → exported issue → public pipeline. Each case states what the spec expects.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { C, clone } = require('./helpers.js');
const { createWorkflow } = require('../../site/internal/js/workflow.js');
const R = require('../../site/internal/js/risk.js');
const PL = require('../../site/js/data/pipeline.js');
const PC = require('../../site/internal/js/policy-cases.js');

function clock() { let t = Date.parse('2026-10-31T12:00:00Z'); return () => new Date(t += 60000).toISOString(); }
function setup() {
  const wf = createWorkflow({ clock: clock() });
  PC.SOURCES.forEach((s) => wf.addSource(clone(s)));
  wf.putGames(clone(PC.GAMES));
  let n = 0; wf.cmd = () => 'c-' + (++n);
  return wf;
}
const draft = (wf, key, part = 'item') => wf.createDraft({ commandId: wf.cmd(), item: clone(PC.CASES[key][part]), authorId: 'writer:demo' });
const qa = (wf, id, rev = 1) => wf.runQA({ commandId: wf.cmd(), itemId: id, revision: rev, attestations: PC.PASS_ALL });
const ISSUE = { issueId: 'DEMO-CASES', mode: 'DEMO', validUntil: '2026-11-02T00:00:00Z', issue: { volume: 1, number: 1, date: '2026-11-01', page: 2, topic: { line1: 'NBA', line2: 'CASES' }, edition: { zh: 'NBA 版', en: 'NBA EDITION' } } };
function rendered(wf, stories, mode = 'prototype') {
  wf.saveLayout({ schema: C.SCHEMAS.layout, id: 'L-CASES-' + stories.join('-').length + '-' + Math.random().toString(36).slice(2, 6), issueId: 'DEMO-CASES', revision: (wf.store.layoutHistory('DEMO-CASES').length + 1), decidedBy: 'editor:demo', decidedAt: '2026-10-31T20:00:00Z', cover: [], lead: null, games: [], stories, demo: true });
  const iss = wf.buildIssue(ISSUE);
  const out = PL.run(iss, { mode, now: '2026-11-01T00:00:00Z' });
  return { ids: out.model.stories.map((s) => s.id), model: out.model, issue: iss, diag: out.diagnostics };
}

test('M-01 ordinary confirmed official news: all four QA PASS → AUTO_APPROVED → PUBLISHED, receipt has QA and sources, it renders', () => {
  const wf = setup();
  draft(wf, 'M-01');
  const q = qa(wf, 'CASE-M01');
  assert.deepEqual([q.route.route, q.state], ['AUTO', 'APPROVED']);
  const p = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M01', revision: 1 });
  assert.equal(p.receipt.approvalMode, 'AUTO');
  assert.deepEqual(Object.values(p.receipt.qa), ['PASS', 'PASS', 'PASS', 'PASS']);
  assert.deepEqual(p.receipt.sourceRefs, ['S-OFF-FINAL']);
  assert.deepEqual(rendered(wf, ['CASE-M01']).ids, ['CASE-M01']);
});

test('M-02 unverified rumour: kept as RUMOR, waits for a human, never AUTO, never a confirmed fact', () => {
  const wf = setup();
  draft(wf, 'M-02');
  const q = qa(wf, 'CASE-M02');
  assert.equal(q.state, 'AWAITING_HUMAN_APPROVAL');
  assert.ok(q.route.triggers.includes('UNVERIFIED_RUMOR'));
  assert.ok(wf.publishBlockers('CASE-M02').length > 0);
  assert.deepEqual(rendered(wf, ['CASE-M02']).ids, []);
  /* The same rumour written as fact fails fact QA: it cannot become CONFIRMED. */
  draft(wf, 'M-02', 'undeclared');
  const u = qa(wf, 'CASE-M02-UNDECLARED');
  assert.equal(u.qa.fact, 'FAIL');
  assert.ok(u.reasons.fact.includes('UNVERIFIED_SOURCE_AS_FACT'));
  assert.equal(u.state, 'HELD_FOR_EVIDENCE');
  /* A rumour without the "unconfirmed" disclosure fails policy. */
  const bare = clone(PC.CASES['M-02'].item); bare.zh.summary = '社群貼文稱教練將被解職。'; bare.en.summary = 'A social post claims the coach will be fired.'; bare.zh.headline = '教練去留傳聞'; bare.en.headline = 'Coach status rumour';
  const pol = R.policyChecks(bare, { sources: Object.fromEntries(PC.SOURCES.map((s) => [s.id, s])) });
  assert.ok(pol.reasons.includes('RUMOR_NOT_DISCLOSED_ZH') && pol.reasons.includes('RUMOR_NOT_DISCLOSED_EN'));
});

test('M-02 / media acceptance 4: ten copies of one post are one independent source', () => {
  const list = PC.SOURCES.filter((s) => /^S-RUMOR/.test(s.id));
  assert.equal(list.length, 11);
  assert.equal(R.independentSourceCount(list), 1);
});

test('M-03 confirmed major injury: still HUMAN_REQUIRED; no sign-off, no publication; after sign-off it renders with HUMAN approval', () => {
  const wf = setup();
  draft(wf, 'M-03');
  assert.equal(qa(wf, 'CASE-M03').state, 'AWAITING_HUMAN_APPROVAL');
  assert.equal(wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1 }).code, 'PUBLISH_BLOCKED');
  assert.deepEqual(rendered(wf, ['CASE-M03']).ids, []);
  wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1, approverId: 'editor:demo', note: 'checked the official report' });
  const p = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1 });
  assert.equal(p.receipt.approvalMode, 'HUMAN');
  const out = rendered(wf, ['CASE-M03']);
  assert.deepEqual(out.ids, ['CASE-M03']);
  assert.equal(out.model.stories[0].approvalMode, 'HUMAN');
});

test('M-03 in production: a DEMO human approval is not accepted by the public pipeline', () => {
  const wf = setup();
  draft(wf, 'M-03'); qa(wf, 'CASE-M03');
  wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1, approverId: 'editor:demo' });
  wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M03', revision: 1 });
  const iss = rendered(wf, ['CASE-M03']).issue;
  const live = { ...clone(iss), mode: 'LIVE' };
  assert.equal(PL.run(live, { mode: 'production', now: '2026-11-01T00:00:00Z' }).model.status, 'INVALID', 'LIVE on prototype data and demo records refused');
  const v = C.validateIssue({ ...clone(iss) }, { mode: 'production' });
  assert.ok(v.fatal.some((p) => p.code === 'DEMO_IN_PRODUCTION'));
});

test('M-04 "MOSPORT EXCLUSIVE" that is a repost: policy FAIL, cannot reach a human approval or publication; fixed copy without the claim proceeds', () => {
  const wf = setup();
  draft(wf, 'M-04');
  const q = qa(wf, 'CASE-M04');
  assert.equal(q.qa.policy, 'FAIL');
  assert.ok(q.reasons.policy.includes('EXCLUSIVE_NOT_PROVEN'));
  assert.equal(q.state, 'DRAFT');
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M04', revision: 1, approverId: 'editor:demo' }).code, 'ILLEGAL_TRANSITION', 'a human cannot approve past a failed check');
  const fixed = Object.assign(clone(PC.CASES['M-04'].item), clone(PC.CASES['M-04'].fixed));
  wf.revise({ commandId: wf.cmd(), item: fixed, expectedRevision: 1, authorId: 'writer:demo' });
  const q2 = qa(wf, 'CASE-M04', 2);
  assert.equal(q2.qa.policy, 'PASS');
  assert.equal(q2.state, 'AWAITING_HUMAN_APPROVAL', 'other-outlet report: not low risk, still a human');
  /* A real MOSPORT original can carry the label (it still needs a human). */
  const orig = Object.assign(clone(PC.CASES['M-04'].item), { id: 'CASE-M04-ORIG', sourceRefs: ['S-MOSPORT-ORIG'] });
  wf.createDraft({ commandId: wf.cmd(), item: orig, authorId: 'writer:demo' });
  const q3 = qa(wf, 'CASE-M04-ORIG');
  assert.equal(q3.qa.policy, 'PASS');
  assert.equal(q3.state, 'AWAITING_HUMAN_APPROVAL');
});

test('M-05 Public Review with complete data: still HUMAN; an AUTO path does not exist for it', () => {
  const wf = setup();
  draft(wf, 'M-05');
  const q = qa(wf, 'CASE-M05');
  assert.deepEqual(Object.values(q.qa), ['PASS', 'PASS', 'PASS', 'PASS']);
  assert.equal(q.state, 'AWAITING_HUMAN_APPROVAL');
  assert.ok(q.route.reasons.includes('PUBLIC_REVIEW'));
  /* Missing the official final or the locked read fails fact QA (spec 03 §4.3). */
  const noLock = Object.assign(clone(PC.CASES['M-05'].item), { sourceRefs: ['S-OFF-FINAL'] });
  assert.ok(R.factChecks(noLock, { sources: Object.fromEntries(PC.SOURCES.map((s) => [s.id, s])) }).reasons.includes('REVIEW_NEEDS_OFFICIAL_FINAL_AND_LOCKED_READ'));
});

test('M-06 source retracted after publication: pulled from the reader at once, then withdrawn; receipts immutable', () => {
  const wf = setup();
  draft(wf, 'M-06'); qa(wf, 'CASE-M06');
  const pub = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M06', revision: 1 }).receipt;
  assert.deepEqual(rendered(wf, ['CASE-M06']).ids, ['CASE-M06']);
  wf.recordSourceEvent({ commandId: wf.cmd(), event: { schema: C.SCHEMAS.sourceEvent, id: 'SEV-M06', sourceId: 'S-OFF-RETRACT', state: 'RETRACTED', at: '2026-10-31T15:00:00Z', note: 'DEMO: notice withdrawn by publisher', demo: true } });
  assert.equal(wf.status('CASE-M06').publishState, 'CORRECTION_PENDING');
  assert.deepEqual(rendered(wf, ['CASE-M06']).ids, [], 'not in the public issue any more');
  const w = wf.withdraw({ commandId: wf.cmd(), itemId: 'CASE-M06', by: 'editor:demo', reason: 'original notice retracted' });
  assert.equal(w.receipt.previousReceiptHash, pub.receiptHash);
  assert.deepEqual(wf.publications('CASE-M06')[0], pub, 'the PUBLISH receipt is unchanged');
});

test('M-06 contradicted source: corrected through a new revision and a CORRECT receipt', () => {
  const wf = setup();
  draft(wf, 'M-06', 'second'); qa(wf, 'CASE-M06B');
  wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M06B', revision: 1 });
  wf.recordSourceEvent({ commandId: wf.cmd(), event: { schema: C.SCHEMAS.sourceEvent, id: 'SEV-M06B', sourceId: 'S-OFF-CORRECT', state: 'CONTRADICTED', at: '2026-10-31T15:00:00Z', note: 'DEMO: league posted a different time', demo: true } });
  assert.equal(wf.status('CASE-M06B').publishState, 'CORRECTION_PENDING');
  const fixed = clone(PC.CASES['M-06'].second); fixed.sourceRefs = ['S-OFF-FINAL']; fixed.en.summary = 'Correction: the official schedule keeps the original tip-off.'; fixed.zh.summary = '更正：官方賽程維持原開賽時間。';
  wf.revise({ commandId: wf.cmd(), item: fixed, expectedRevision: 1, authorId: 'writer:demo' });
  qa(wf, 'CASE-M06B', 2);
  const c = wf.publish({ commandId: wf.cmd(), itemId: 'CASE-M06B', revision: 2 });
  assert.equal(c.receipt.action, 'CORRECT');
  assert.deepEqual(rendered(wf, ['CASE-M06B']).ids, ['CASE-M06B']);
  assert.equal(rendered(wf, ['CASE-M06B']).model.stories[0].en.summary, 'Correction: the official schedule keeps the original tip-off.');
});

test('M-07 attention without reuse rights: the receipt is kept, reproducing the text is blocked; a link-only rewrite proceeds', () => {
  const wf = setup();
  assert.ok(wf.store.source('S-HOT-LINKONLY'), 'source receipt stored');
  draft(wf, 'M-07');
  const q = qa(wf, 'CASE-M07');
  assert.equal(q.qa.rights, 'FAIL');
  assert.ok(q.reasons.rights.some((r) => r.startsWith('REPRODUCTION_NOT_PERMITTED')));
  assert.equal(q.state, 'HELD_FOR_EVIDENCE');
  assert.equal(wf.approve({ commandId: wf.cmd(), itemId: 'CASE-M07', revision: 1, approverId: 'editor:demo' }).code, 'ILLEGAL_TRANSITION');
  const re = Object.assign(clone(PC.CASES['M-07'].item), clone(PC.CASES['M-07'].rewritten));
  wf.revise({ commandId: wf.cmd(), item: re, expectedRevision: 1, authorId: 'writer:demo' });
  const q2 = qa(wf, 'CASE-M07', 2);
  assert.equal(q2.qa.rights, 'PASS');
  assert.equal(q2.state, 'AWAITING_HUMAN_APPROVAL', 'third-party report: a human decides');
  /* Unverified or blocked rights fail outright. */
  const ctx = (rights) => ({ sources: { X: { ...PC.SOURCES[0], id: 'X', rightsStatus: rights } } });
  assert.ok(R.rightsChecks({ ...re, sourceRefs: ['X'] }, ctx('UNVERIFIED')).reasons.includes('RIGHTS_UNVERIFIED:X'));
  assert.ok(R.rightsChecks({ ...re, sourceRefs: ['X'] }, ctx('BLOCKED')).reasons.includes('RIGHTS_BLOCKED:X'));
});

test('unknown or conflicting evidence is handled conservatively, with reason codes', () => {
  const src = Object.fromEntries(PC.SOURCES.map((s) => [s.id, s]));
  const base = clone(PC.CASES['M-01'].item);
  /* Sources in one cluster disagree (confirmed vs unverified): BLOCK. */
  const a = { ...PC.SOURCES[0], id: 'A', dedupeClusterId: 'K' };
  const b = { ...PC.SOURCES[0], id: 'B', dedupeClusterId: 'K', verificationState: 'UNVERIFIED' };
  assert.equal(R.route({ ...base, sourceRefs: ['A', 'B'] }, { sources: { A: a, B: b } }).route, 'BLOCK');
  /* No source: BLOCK. A feature (opinion class): HUMAN. Breaking without a confirmed fact: policy FAIL. */
  assert.equal(R.route({ ...base, sourceRefs: [] }, { sources: src }).route, 'BLOCK');
  assert.deepEqual(R.route({ ...base, type: 'FEATURE' }, { sources: src }).route, 'HUMAN');
  assert.ok(R.policyChecks({ ...base, editorialLabel: 'BREAKING_NEWS', sourceRefs: ['S-WORLD-LOCK'] }, { sources: src }).reasons.includes('BREAKING_WITHOUT_CONFIRMED_FACT'));
  /* Betting framing and numbers without an eligible World read. */
  assert.ok(R.policyChecks({ ...base, en: { headline: 'Lock of the day: Bulls', summary: null, meta: null } }, { sources: src }).reasons.includes('BETTING_FRAMING'));
  assert.ok(R.factChecks({ ...base, en: { headline: 'Bulls 70% to win', summary: null, meta: null } }, { sources: src }).reasons.includes('NUMBER_WITHOUT_WORLD'));
});

test('game analysis: copy may only restate the eligible World number, never another one (media acceptance 6)', () => {
  const src = Object.fromEntries(PC.SOURCES.map((s) => [s.id, s]));
  const g = clone(PC.GAMES[0]);
  const it = { ...clone(PC.CASES['M-01'].item), type: 'GAME_ANALYSIS', worldAnalysisRef: 'CASE-0001', sourceRefs: ['S-WORLD-LOCK'] };
  const ok = { ...it, zh: { headline: '湖人 61% 主場較有利', summary: null, meta: null } };
  assert.ok(R.factChecks(ok, { sources: src, game: g }).ok);
  const bad = { ...it, zh: { headline: '湖人 65% 主場較有利', summary: null, meta: null } };
  assert.ok(R.factChecks(bad, { sources: src, game: g }).reasons.includes('WORLD_NUMBER_MISMATCH'));
  const internal = clone(g); internal.world.distributionEligibility = 'INTERNAL';
  assert.ok(R.factChecks(ok, { sources: src, game: internal }).reasons.includes('WORLD_NOT_ELIGIBLE'));
  assert.equal(JSON.stringify(g), JSON.stringify(PC.GAMES[0]), 'World value untouched');
});
