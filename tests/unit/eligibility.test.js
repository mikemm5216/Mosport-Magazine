'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const E = require('../../site/js/editorial/eligibility.js');

function loadFixtures() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of ['issue.demo.js', 'issue.variants.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/js/fixtures', f), 'utf8'), ctx);
  }
  return ctx.window.MOSPORT_FIXTURES;
}
const F = loadFixtures();
const NOW = '2026-11-01T00:00:00Z';
const base = {
  id: 'X', type: 'NEWS', publishState: 'PUBLISHED', homeEligible: true, approvalReceiptRef: 'R',
  sourceRefs: ['s'], verifiedFacts: ['f'], approval: { mode: 'AUTO', policyVersion: 'p' }
};

test('ordinary low-risk item with receipt and sources passes on AUTO', () => {
  assert.equal(E.itemBlockReason(base, NOW), null);
});

for (const trig of E.HUMAN_TRIGGERS) {
  test(`${trig} cannot render on AUTO approval`, () => {
    assert.equal(E.itemBlockReason({ ...base, riskTriggers: [trig] }, NOW), 'HUMAN_APPROVAL_REQUIRED');
  });
  test(`${trig} renders only with a complete human approval`, () => {
    const partial = { ...base, riskTriggers: [trig], approval: { mode: 'HUMAN' } };
    assert.equal(E.itemBlockReason(partial, NOW), 'HUMAN_APPROVAL_REQUIRED');
    const full = { ...base, riskTriggers: [trig], approval: { mode: 'HUMAN', approverId: 'ed', approvedAt: NOW } };
    assert.equal(E.itemBlockReason(full, NOW), null);
  });
}

test('BREAKING_NEWS and MOSPORT_EXCLUSIVE labels always need a human', () => {
  for (const label of E.HUMAN_LABELS) {
    assert.equal(E.itemBlockReason({ ...base, editorialLabel: label }, NOW), 'HUMAN_APPROVAL_REQUIRED');
  }
});

test('Public Review always needs a human (Founder C-4)', () => {
  assert.equal(E.itemBlockReason({ ...base, type: 'REVIEW' }, NOW), 'HUMAN_APPROVAL_REQUIRED');
});

test('unpublished, ineligible, unsourced, unreceipted, unverified and expired items are blocked', () => {
  assert.equal(E.itemBlockReason({ ...base, publishState: 'AWAITING_HUMAN_APPROVAL' }, NOW), 'NOT_PUBLISHED');
  assert.equal(E.itemBlockReason({ ...base, homeEligible: false }, NOW), 'NOT_HOME_ELIGIBLE');
  assert.equal(E.itemBlockReason({ ...base, sourceRefs: [] }, NOW), 'NO_SOURCE');
  assert.equal(E.itemBlockReason({ ...base, approvalReceiptRef: null }, NOW), 'NO_RECEIPT');
  assert.equal(E.itemBlockReason({ ...base, verifiedFacts: [] }, NOW), 'NO_VERIFIED_FACTS');
  assert.equal(E.itemBlockReason({ ...base, validUntil: '2026-10-31T00:00:00Z' }, NOW), 'EXPIRED');
});

test('worldPercent passes the World value through, or returns null', () => {
  const w = { state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'FINAL_CONFIRMED', homeWinProbability: 0.61 };
  assert.equal(E.worldPercent(w), 61);
  assert.equal(E.worldPercent({ ...w, distributionEligibility: 'INTERNAL' }), null);
  assert.equal(E.worldPercent({ ...w, state: 'NOT_ISSUED' }), null);
  assert.equal(E.worldPercent({ ...w, version: 'DRAFT' }), null);
  assert.equal(E.worldPercent({ ...w, homeWinProbability: null }), null);
  assert.equal(E.worldPercent({ ...w, homeWinProbability: 1.4 }), null);
  assert.equal(E.worldPercent(undefined), null);
});

test('DEMO issue resolves: approved items render, rumour and ineligible games do not', () => {
  const r = E.resolveIssue(F.demo, { mode: 'prototype', now: NOW });
  assert.equal(r.refused, null);
  assert.equal(r.demo, true);
  assert.deepEqual(r.cover.map((i) => i.id), ['ED-NEWS-0007', 'ED-FEAT-0003']);
  assert.ok(r.excluded.some((x) => x.id === 'ED-RUM-0002' && x.reason === 'NOT_PUBLISHED'));
  assert.equal(r.lead.percent, 61);
  assert.deepEqual(r.games.map((g) => g.gameId), ['DEMO-0042', 'DEMO-0043', 'DEMO-0044']);
  assert.ok(r.excluded.some((x) => x.id === 'DEMO-0045'), 'postponed game without a read stays off');
  assert.ok(r.excluded.some((x) => x.id === 'DEMO-0046'), 'internal-only read stays off');
  assert.deepEqual(r.stories.map((i) => i.id), ['ED-REV-0040', 'ED-STRK-0011']);
  assert.equal(r.schedule.length, 6, 'Schedule keeps every game');
});

test('DEMO fixture is refused in production mode', () => {
  const r = E.resolveIssue(F.demo, { mode: 'production', now: NOW });
  assert.equal(r.refused, 'DEMO_IN_PRODUCTION');
  assert.equal(r.lead, null);
  assert.equal(r.cover.length, 0);
});

test('empty issue: no cover labels, no lead, no games, no stories; schedule intact (U-01)', () => {
  const r = E.resolveIssue(F.empty, { mode: 'prototype', now: NOW });
  assert.equal(r.cover.length, 0);
  assert.equal(r.lead, null);
  assert.equal(r.games.length, 0);
  assert.equal(r.stories.length, 0);
  assert.equal(r.schedule.length, 6);
});

test('bypass issue: no unapproved high-risk item reaches any slot', () => {
  const r = E.resolveIssue(F.bypass, { mode: 'prototype', now: NOW });
  const rendered = [...r.cover, ...r.stories, ...(r.lead ? [r.lead.item] : [])].map((i) => i.id);
  for (const id of rendered) assert.ok(!id.startsWith('BYP-'), `${id} must not render`);
  assert.equal(r.lead, null);
  const reasons = Object.fromEntries(r.excluded.map((x) => [x.id, x.reason]));
  assert.equal(reasons['BYP-MAJOR-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(reasons['BYP-EXCL-NOAPPROVER'], 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(reasons['BYP-SENSITIVE-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(reasons['BYP-RUMOR-PUB'], 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(reasons['BYP-REVIEW-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(reasons['BYP-NO-SOURCE'], 'NO_SOURCE');
  assert.equal(reasons['BYP-EXPIRED'], 'EXPIRED');
});

test('the gate does not mutate World values', () => {
  const before = JSON.stringify(F.demo.games);
  E.resolveIssue(F.demo, { mode: 'prototype', now: NOW });
  assert.equal(JSON.stringify(F.demo.games), before);
});
