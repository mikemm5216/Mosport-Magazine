'use strict';
/* B-P2-03: load → validate → resolve → eligibility → public model, on every risky DEMO issue. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFixtures, clone } = require('./helpers.js');
const PL = require('../../site/js/data/pipeline.js');

const F = loadFixtures();
const NOW = F.DEMO_NOW;
const run = (name, mode = 'prototype', now = NOW) => PL.run(clone(F[name]), { mode, now });
const ids = (list) => list.map((i) => i.id);
const rendered = (m) => [...m.cover, ...m.stories, ...(m.lead ? [m.lead.item] : [])].map((i) => i.id);

test('DEMO issue: the Editor plan renders in order; rumour and ineligible games stay off; schedule keeps all six', () => {
  const { model: m } = run('demo');
  assert.equal(m.status, 'OK');
  assert.equal(m.demo, true);
  assert.deepEqual(ids(m.cover), ['ED-NEWS-0007', 'ED-FEAT-0003']);
  assert.equal(m.lead.item.id, 'ED-LEAD-0041');
  assert.equal(m.lead.percent, 61);
  assert.deepEqual(m.games.map((g) => g.gameId), ['DEMO-0042', 'DEMO-0043', 'DEMO-0044']);
  assert.deepEqual(ids(m.stories), ['ED-REV-0040', 'ED-STRK-0011']);
  assert.equal(m.schedule.length, 6);
  assert.ok(!rendered(m).includes('ED-RUM-0002'));
});

test('the public model carries no exclusion reasons, approver ids, sources, triggers or raw probabilities', () => {
  for (const name of ['demo', 'bypass', 'xss', 'retracted', 'stale']) {
    const json = JSON.stringify(run(name).model);
    for (const leak of ['approverId', 'editor:demo', 'sourceRefs', 'riskTriggers', 'homeWinProbability', 'excluded', 'reason":"HUMAN', 'verifiedFacts', 'contentHash', 'demo.invalid', 'distributionEligibility']) {
      assert.ok(!json.includes(leak), `${name}: model leaks ${leak}`);
    }
  }
});

test('an INTERNAL read never reaches the public model, not even on the schedule', () => {
  const { model: m } = run('demo');
  const g = m.schedule.find((x) => x.gameId === 'DEMO-0046');
  assert.equal(g.hasRead, false);
  assert.equal(g.world, undefined);
  assert.equal(g.noReadReason, 'NOT_PUBLIC');
  assert.ok(!JSON.stringify(m).includes('0.55') && !JSON.stringify(m).includes('aa31f002'));
});

test('World values pass through unchanged; the source issue is not mutated', () => {
  const raw = clone(F.demo);
  const before = JSON.stringify(raw);
  const { model: m } = PL.run(raw, { mode: 'prototype', now: NOW });
  assert.equal(JSON.stringify(raw), before);
  for (const g of m.schedule.filter((x) => x.hasRead)) {
    const src = F.demo.games.find((x) => x.gameId === g.gameId).world;
    assert.equal(g.world.percent, Math.round(src.homeWinProbability * 100));
    assert.equal(JSON.stringify(g.world.verdict), JSON.stringify(src.verdict));
    assert.equal(g.world.version, src.version);
  }
});

test('empty issue (U-01): nothing on the magazine, every game still on the schedule, no number anywhere', () => {
  const { model: m } = run('empty');
  assert.equal(m.status, 'OK');
  assert.deepEqual([m.cover.length, m.games.length, m.stories.length, m.lead], [0, 0, 0, null]);
  assert.equal(m.schedule.length, 6);
  assert.ok(m.schedule.every((g) => !g.hasRead && g.world === undefined));
});

test('bypass issues: no unapproved, mis-approved or borrowed approval reaches any slot', () => {
  for (const name of ['bypass', 'bypass2']) {
    const { model: m, diagnostics: d } = run(name);
    assert.equal(m.status, 'OK');
    for (const id of rendered(m)) assert.ok(!id.startsWith('BYP-'), `${name}: ${id} rendered`);
    assert.equal(m.cover.length, 0, `${name}: cover`);
    const why = {};
    /* A contract problem is the root cause; the gate's MISSING is its consequence. */
    d.problems.forEach((p) => { why[p.id] = why[p.id] || p.code; });
    d.excluded.forEach((x) => { why[x.id] = why[x.id] || x.reason; });
    if (name === 'bypass') {
      assert.equal(why['BYP-MAJOR-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
      assert.equal(why['BYP-EXCL-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
      assert.equal(why['BYP-BREAKING-LABEL-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
      assert.equal(why['BYP-SENSITIVE-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
      assert.equal(why['BYP-REVIEW-AUTO'], 'HUMAN_APPROVAL_REQUIRED');
      assert.equal(why['BYP-NO-SOURCE'], 'NO_SOURCE');
      assert.equal(why['BYP-EXPIRED'], 'EXPIRED');
      assert.equal(why['BYP-NO-RECEIPT'], 'DANGLING_REF');
      assert.equal(why['BYP-REJECTED'], 'APPROVAL_REJECTED');
    } else {
      assert.equal(why['BYP-BORROWED'], 'APPROVAL_MISMATCH');
      assert.equal(why['BYP-EMBEDDED'], 'UNKNOWN_FIELD');
      /* Future-dated approval and publication: blocked before the reader's now
         (the approval-time rule itself is covered in eligibility.test.js). */
      assert.equal(why['BYP-FUTURE-HUMAN'], 'NOT_YET_PUBLISHED');
    }
  }
});

test('unsupported schema and duplicate ids refuse the whole issue (no partial render, no last-one-wins)', () => {
  for (const [name, code] of [['invalid', 'SCHEMA_UNSUPPORTED'], ['dupid', 'DUPLICATE_ID'], ['live', 'PROTOTYPE_WORLD_IN_LIVE']]) {
    const { model: m } = run(name);
    assert.equal(m.status, 'INVALID', name);
    assert.equal(m.reason, code, name);
    assert.deepEqual([m.cover.length, m.schedule.length, m.lead], [0, 0, null], name);
  }
});

test('malformed times exclude only the records that carry them; the bad game is counted, not shown', () => {
  const { model: m } = run('badtime');
  assert.equal(m.status, 'OK');
  assert.ok(!ids(m.cover).includes('ED-NEWS-0007'));
  assert.ok(!ids(m.stories).includes('ED-STRK-0011'));
  assert.equal(m.invalidGames, 1);
  assert.equal(m.schedule.length, 5);
  assert.ok(!m.schedule.some((g) => g.gameId === 'DEMO-0042'));
});

test('an expired issue shows no read anywhere; the schedule keeps its games', () => {
  const { model: m } = run('stale');
  assert.equal(m.status, 'STALE');
  assert.deepEqual([m.cover.length, m.games.length, m.stories.length, m.lead], [0, 0, 0, null]);
  assert.equal(m.schedule.length, 6);
  assert.ok(m.schedule.every((g) => !g.hasRead && g.noReadReason === 'STALE'));
});

test('content changed after approval loses its approval; a retracted source pulls its story', () => {
  assert.ok(!ids(run('staleapproval').model.cover).includes('ED-NEWS-0007'));
  assert.ok(!ids(run('retracted').model.cover).includes('ED-NEWS-0007'));
  assert.ok(ids(run('retracted').model.cover).includes('ED-FEAT-0003'), 'other stories unaffected');
});

test('items in slots that do not fit their type are dropped; the renderer does not move them elsewhere', () => {
  const { model: m } = run('slotmismatch');
  assert.deepEqual([m.cover.length, m.stories.length, m.lead], [0, 0, null]);
});

test('production mode refuses DEMO; a load failure is a state, not content', () => {
  assert.equal(run('demo', 'production').model.status, 'REFUSED');
  const lf = run('loadfail').model;
  assert.equal(lf.status, 'LOAD_FAILED');
  assert.deepEqual([lf.cover.length, lf.schedule.length], [0, 0]);
  assert.equal(PL.run(null, { now: NOW }).model.status, 'LOAD_FAILED');
});

test('a missing or malformed clock is refused rather than assumed', () => {
  assert.equal(run('demo', 'prototype', null).model.status, 'INVALID');
  assert.equal(run('demo', 'prototype', '2026-11-01').model.reason, 'NO_CLOCK');
});

test('xss issue: unsafe records are rejected; surviving markup is carried as plain data for escaping', () => {
  const { model: m, diagnostics: d } = run('xss');
  assert.ok(d.problems.some((p) => p.id === 'src:mosport-original-demo' && p.code === 'UNSAFE_URL'));
  assert.ok(d.problems.some((p) => p.id === 'ED-STRK-0011' && p.code === 'BAD_ENUM'));
  assert.ok(!ids(m.cover).includes('ED-FEAT-0003'), 'story backed by the javascript: source is out');
  assert.ok(m.cover[0].zh.headline.includes('<script>'), 'kept verbatim; the page must escape it');
});
