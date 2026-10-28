'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../site/js/editorial/eligibility.js');

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

/* A resolved issue in the gate's input shape (approvals already attached from receipts). */
const auto = { mode: 'AUTO', policyVersion: 'p' };
const human = { mode: 'HUMAN', approverId: 'ed', approvedAt: '2026-10-31T20:00:00Z' };
const world = { state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'FINAL_CONFIRMED', homeWinProbability: 0.61, verdict: { zh: 'z', en: 'e' } };
function issue() {
  return {
    mode: 'DEMO',
    games: [
      { gameId: 'G1', status: 'SCHEDULED', world },
      { gameId: 'G2', status: 'POSTPONED', world: { state: 'NOT_ISSUED' } },
      { gameId: 'G3', status: 'SCHEDULED', world: { ...world, distributionEligibility: 'INTERNAL' } }
    ],
    items: [
      { ...base, id: 'LEAD', type: 'GAME_ANALYSIS', worldAnalysisRef: 'G1', approval: auto },
      { ...base, id: 'NEWS', editorialLabel: 'BREAKING_NEWS', riskTriggers: ['MAJOR_NEWS'], approval: human },
      { ...base, id: 'RUM', editorialLabel: 'BREAKING_NEWS', riskTriggers: ['UNVERIFIED_RUMOR'], publishState: 'AWAITING_HUMAN_APPROVAL', approval: null },
      { ...base, id: 'REV', type: 'REVIEW', approval: human }
    ],
    layout: { cover: ['NEWS', 'RUM'], lead: 'LEAD', games: ['G1', 'G2', 'G3'], stories: ['REV'] }
  };
}

test('resolveIssue: approved items render, the rumour and ineligible games do not, schedule keeps all', () => {
  const r = E.resolveIssue(issue(), { mode: 'prototype', now: NOW });
  assert.equal(r.refused, null);
  assert.deepEqual(r.cover.map((i) => i.id), ['NEWS']);
  assert.ok(r.excluded.some((x) => x.id === 'RUM' && x.reason === 'NOT_PUBLISHED'));
  assert.equal(r.lead.percent, 61);
  assert.deepEqual(r.games.map((g) => g.gameId), ['G1']);
  assert.ok(r.excluded.some((x) => x.id === 'G2'));
  assert.ok(r.excluded.some((x) => x.id === 'G3'), 'internal-only read stays off');
  assert.deepEqual(r.stories.map((i) => i.id), ['REV']);
  assert.equal(r.schedule.length, 3);
});

test('DEMO issue is refused in production mode', () => {
  const r = E.resolveIssue(issue(), { mode: 'production', now: NOW });
  assert.equal(r.refused, 'DEMO_IN_PRODUCTION');
  assert.equal(r.lead, null);
  assert.equal(r.cover.length, 0);
});

test('the gate does not mutate World values', () => {
  const i = issue();
  const before = JSON.stringify(i.games);
  E.resolveIssue(i, { mode: 'prototype', now: NOW });
  assert.equal(JSON.stringify(i.games), before);
});

/* ---------- regressions found in the B-P2 gate review ---------- */

test('duplicate item or game ids refuse the issue instead of letting the last one win', () => {
  const i = issue();
  i.items.push({ ...base, id: 'NEWS', editorialLabel: 'BREAKING_NEWS', riskTriggers: [], approval: auto });
  assert.equal(E.resolveIssue(i, { mode: 'prototype', now: NOW }).refused, 'DUPLICATE_ID');
  const j = issue();
  j.games.push({ ...j.games[0] });
  assert.equal(E.resolveIssue(j, { mode: 'prototype', now: NOW }).refused, 'DUPLICATE_ID');
});

test('a malformed or impossible validUntil never passes (it used to: NaN compared false)', () => {
  for (const bad of ['2026-11-31T25:00:00Z', 'tomorrow', '2026-11-02', '']) {
    assert.equal(E.itemBlockReason({ ...base, validUntil: bad }, NOW), 'BAD_TIME', bad);
  }
});

test('an expiry without a clock is not assumed valid', () => {
  assert.equal(E.itemBlockReason({ ...base, validUntil: '2026-11-02T00:00:00Z' }, null), 'NO_CLOCK');
  assert.equal(E.itemBlockReason({ ...base, validUntil: '2026-11-02T00:00:00Z' }, 'not-a-time'), 'NO_CLOCK');
});

test('a malformed publishedAt or a future publication does not render', () => {
  assert.equal(E.itemBlockReason({ ...base, publishedAt: '31/10/2026' }, NOW), 'BAD_TIME');
  assert.equal(E.itemBlockReason({ ...base, publishedAt: '2026-11-02T00:00:00Z' }, NOW), 'NOT_YET_PUBLISHED');
});

test('a human approval needs a real approver and a valid time not after now', () => {
  const it = { ...base, riskTriggers: ['MAJOR_NEWS'] };
  assert.equal(E.itemBlockReason({ ...it, approval: { ...human, approverId: '   ' } }, NOW), 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(E.itemBlockReason({ ...it, approval: { ...human, approvedAt: 'yesterday' } }, NOW), 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(E.itemBlockReason({ ...it, approval: { ...human, approvedAt: '2026-11-03T00:00:00Z' } }, NOW), 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(E.itemBlockReason({ ...it, approval: human }, NOW), null);
});
