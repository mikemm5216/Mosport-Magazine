'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../../scripts/trend-radar.js');

const asOf = '2026-11-25T14:00:00Z';
function cand(over = {}) {
  return { id: 'c', eventKey: 'e', title: 't', nextEventAt: null, audience: 'core', engagement: null,
    evidence: { officialSourcePresent: true, primaryFetched: false, keyFactsTotal: 2, keyFactsVerified: 2, conflictsNoted: 0 },
    content: { rightsSafeVisual: true, uniqueAngle: true, landingRelevant: false, sensitive: false },
    sources: [{ url: 'https://a/1', publisher: 'A', tier: 'official', claimType: 'fact', publishedAt: '2026-11-25T08:00:00Z' },
      { url: 'https://b/1', publisher: 'B', tier: 'major', claimType: 'fact', publishedAt: '2026-11-25T09:00:00Z' }], ...over };
}

test('engagement is UNAVAILABLE without a measured baseline, and its weight is redistributed, never estimated', () => {
  for (const engagement of [null, { metric: 'views', windowHours: 24, value: 1e8 },
    { metric: 'views', windowHours: 24, value: 1e8, baseline: 5e7 }]) {
    const s = R.rank([cand({ engagement })], asOf).ranked[0];
    assert.equal(s.parts.engagement.status, 'UNAVAILABLE');
    assert.equal(s.parts.engagement.score, null);
    assert.ok(!('engagement' in s.effectiveWeights));
    assert.equal(Object.values(s.effectiveWeights).reduce((a, b) => a + b, 0).toFixed(2), '1.00');
  }
  const m = R.rank([cand({ engagement: { metric: 'views', windowHours: 24, value: 300, baseline: 100, baselineSource: 'measured 7d median' } })], asOf).ranked[0];
  assert.equal(m.parts.engagement.status, 'MEASURED');
  assert.equal(m.parts.engagement.score, 100);
});

test('date-only timestamps are read conservatively and unknown timestamps cannot raise freshness', () => {
  const dateOnly = cand({ sources: [{ url: 'u', publisher: 'A', tier: 'official', claimType: 'fact', publishedAt: '2026-11-24' }] });
  assert.equal(R.rank([dateOnly], asOf).ranked[0].parts.freshness.ageHours, 38);
  const unknown = cand({ sources: [{ url: 'u', publisher: 'A', tier: 'official', claimType: 'fact', publishedAt: null }] });
  assert.equal(R.rank([unknown], asOf).ranked[0].parts.freshness.score, 0);
  const upcoming = cand({ sources: unknown.sources, nextEventAt: '2026-11-26T03:00:00Z' });
  assert.equal(R.rank([upcoming], asOf).ranked[0].parts.freshness.score, 85);
  assert.throws(() => R.rank([cand({ sources: [{ url: 'u', publisher: 'A', tier: 'major', claimType: 'fact', publishedAt: 'Nov 24' }] })], asOf), /BAD_TIMESTAMP/);
});

test('only distinct fact-reporting publishers corroborate; reactions and speculation do not', () => {
  const c = cand({ sources: [
    { url: '1', publisher: 'A', tier: 'official', claimType: 'fact', publishedAt: null },
    { url: '2', publisher: 'A', tier: 'official', claimType: 'fact', publishedAt: null },
    { url: '3', publisher: 'B', tier: 'major', claimType: 'reaction', publishedAt: null },
    { url: '4', publisher: 'C', tier: 'major', claimType: 'speculation', publishedAt: null }] });
  assert.equal(R.rank([c], asOf).ranked[0].parts.corroboration.score, 40);
});

test('events with the same key are clustered once and sources are deduplicated by URL', () => {
  const r = R.rank([cand({ id: 'x' }), cand({ id: 'y', sources: [{ url: 'https://a/1', publisher: 'A', tier: 'official', claimType: 'fact', publishedAt: null },
    { url: 'https://c/1', publisher: 'C', tier: 'secondary', claimType: 'fact', publishedAt: null }] })], asOf);
  assert.equal(r.ranked.length, 1);
  assert.deepEqual(r.ranked[0].mergedIds, ['x', 'y']);
  assert.deepEqual(r.ranked[0].parts.corroboration.publishers.secondary, ['C']);
});

test('the evidence gate blocks STRONG even with a high total; only top 3 STRONG reach the AI stage', () => {
  const weak = cand({ id: 'weak', eventKey: 'w', evidence: { officialSourcePresent: false, primaryFetched: false, keyFactsTotal: 2, keyFactsVerified: 2, conflictsNoted: 1 } });
  const s = R.rank([weak], asOf).ranked[0];
  assert.ok(s.total >= R.THRESHOLDS.risingTotal);
  assert.ok(s.parts.evidence.score < R.THRESHOLDS.strongEvidence);
  assert.notEqual(s.tier, 'STRONG');
  const many = ['a', 'b', 'c', 'd'].map(id => cand({ id, eventKey: id }));
  const r = R.rank(many, asOf);
  assert.deepEqual(r.aiCandidates, ['a', 'b', 'c']);
  const stale = cand({ id: 'old', eventKey: 'old', audience: 'outside', sources: [{ url: 'o', publisher: 'O', tier: 'secondary', claimType: 'fact', publishedAt: '2026-10-01' }] });
  assert.deepEqual(R.rank([stale], asOf).recordOnly, ['old']);
});

test('the committed 2026-11-25 radar report is exactly reproducible from its input', () => {
  const dir = path.join(__dirname, '../../docs/social/2026-11-25');
  for (const [inp, out] of [['trend-radar-input.json', 'trend-radar-report.json'], ['trend-radar-input.run1.json', 'trend-radar-report.run1.json']]) {
    const input = JSON.parse(fs.readFileSync(path.join(dir, inp), 'utf8'));
    assert.deepEqual(R.rank(input.candidates, input.asOf), JSON.parse(fs.readFileSync(path.join(dir, out), 'utf8')), out);
  }
});
