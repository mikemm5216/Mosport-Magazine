'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { C, clone, loadFixtures, renderPage } = require('./helpers.js');
const PL = require('../../site/js/data/pipeline.js');
const schedule = require('../../site/data/schedules/0022600051.json');
// Synthetic 0999 fixture is never bundled into the public provider.
const candidate = require('../fixtures/context-snapshot-v2.json');
const now = '2026-11-19T08:10:00Z';
const scheduleNow = new Date(Date.parse(schedule.editorial.observedAt) + 60000).toISOString();
const run = (raw, clock = raw === candidate ? now : scheduleNow) => PL.run(clone(raw), { mode: 'production', now: clock });
const provider = (raw) => {
  const window = { MOSPORT_CONTRACTS: C };
  const context = { window, URLSearchParams, location: { protocol: 'https:' }, fetch: async () => ({ ok: true, json: async () => clone(raw) }) };
  vm.runInNewContext(fs.readFileSync('site/js/data/providers.js', 'utf8'), context);
  return window.MOSPORT_PROVIDERS;
};

test('data available: sourced 0051 schedule is visible without a fabricated World issue', () => {
  assert.deepEqual(C.validateSchedule(schedule, { now: scheduleNow }), []);
  const m = run(schedule).model;
  assert.equal(m.status, 'SCHEDULE_ONLY');
  assert.equal(m.demo, false);
  assert.deepEqual(m.schedule.map(g => [g.gameId, g.away, g.home, g.tipoff, g.status]), [['0022600051', 'SAC', 'LAL', '2026-11-21T03:00:00Z', 'SCHEDULED']]);
  assert.deepEqual(m.schedule[0].source, { publisher: 'NBA', url: schedule.source.originalUrl, observedAt: schedule.source.observedAt });
  assert.equal(schedule.source.contentFingerprint, C.sha256(C.canonical({ game: schedule.game, originalUrl: schedule.source.originalUrl, observedAt: schedule.source.observedAt })));
});

test('explicit missing: no qualified snapshot means no context, World, fake score or probability', () => {
  const m = run(schedule).model, g = m.schedule[0];
  assert.equal(g.pregameSnapshot, null);
  assert.equal(g.hasRead, false);
  assert.equal(g.world, undefined);
  assert.equal(g.score, null);
  assert.deepEqual([m.cover, m.games, m.stories, m.lead], [[], [], [], null]);
  // Inspect forbidden fields/labels, not decimal substrings in ISO timestamps.
  assert.ok(!/homeWinProbability|percent|HOME_COURT|snapshotId|INTERNAL|DEMO/.test(JSON.stringify(m)));
});

test('valid candidate is not a public release: production still explicitly missing', () => {
  assert.deepEqual(C.validateContextSnapshot(candidate.contextSnapshot, candidate.game, now), []);
  const r = run(candidate);
  assert.equal(r.model.status, 'SCHEDULE_ONLY');
  assert.equal(r.model.schedule[0].pregameSnapshot, null);
  assert.equal(r.model.schedule[0].hasRead, false);
  assert.deepEqual(r.diagnostics.excluded.map(e => e.reason), ['PUBLIC_QUALIFICATION_UNAVAILABLE']);
  assert.ok(!JSON.stringify(r.model).includes(candidate.contextSnapshot.snapshotId));
});

test('isolated template projection contract supports HOME and NEUTRAL; not public pipeline acceptance', () => {
  for (const value of ['HOME', 'NEUTRAL']) {
    const c = clone(candidate.contextSnapshot); c.homeCourt.evidence.value = value;
    assert.deepEqual(C.validateContextSnapshot(c, candidate.game, now), []);
    const view = PL.contextSnapshotView(c);
    assert.equal(view.homeCourt, value);
    assert.equal(view.formulaVersion, 1);
    assert.equal(view.snapshotVersion, 2);
    assert.equal(view.capturedAt, c.capturedAt);
    assert.equal(view.source.observedAt, c.homeCourt.observedAt);
    assert.ok(!/probability|evidence|sourceClass|sourceFingerprint/.test(JSON.stringify(view)));
  }
});

test('wrong game/version/time, internal World, DEMO and a public boolean cannot expose context', () => {
  const cases = [
    c => { c.nbaGameId = '0022600001'; },
    c => { c.snapshotVersion = 3; }, c => { c.homeCourt.formulaVersion = 2; },
    c => { c.capturedAt = c.homeCourt.observedAt; },
    c => { c.capturedAt = candidate.game.tipoff; },
    c => { c.scheduledStartAt = '2026-11-21T04:00:00Z'; },
    c => { c.capturedAt = '2026-11-19T09:00:00Z'; },
    c => { c.source.demo = true; }, c => { c.source.originalUrl = 'javascript:alert(1)'; },
    c => { c.homeCourt.evidence.status = 'EXPLICIT_PROXY'; },
    c => { c.homeCourt.sourceClass = 'ESPN_PROVISIONAL'; },
    c => { c.public = true; },
    c => { c.world = { distributionEligibility: 'PUBLIC', homeWinProbability: 0.61 }; }
  ];
  for (const change of cases) {
    const raw = clone(candidate); change(raw.contextSnapshot);
    assert.ok(C.validateContextSnapshot(raw.contextSnapshot, raw.game, now).length);
    const r = run(raw, now);
    assert.equal(r.model.schedule[0].pregameSnapshot, null);
    assert.equal(r.model.schedule[0].hasRead, false);
    assert.ok(!JSON.stringify(r.model).includes('0.61'));
  }
});

test('missing/untrusted schedule source or mismatched ID rejects data; stale remains labelled history', () => {
  for (const change of [r => { delete r.source; }, r => { r.source.originalUrl = 'https://www.nba.com.evil.example/game/sac-vs-lal-0022600051'; }, r => { r.game.gameId = '0022600000'; }, r => { r.source.observedAt = '2027-01-01T00:00:00Z'; }, r => { r.world = { homeWinProbability: 0.5 }; }, r => { r.source.verificationState = 'RETRACTED'; }, r => { r.game.status = 'FINAL'; }]) {
    const raw = clone(schedule); change(raw);
    assert.equal(run(raw).model.status, 'INVALID');
    assert.equal(run(raw).model.schedule.length, 0);
  }
  const stale = run(candidate, candidate.validUntil).model;
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.reason, 'SCHEDULE_EXPIRED');
  assert.equal(stale.schedule[0].pregameSnapshot, null);
  assert.equal(stale.schedule[0].hasRead, false);
});

test('same-origin schedule provider rejects traversal, ambiguous selection and wrong loaded ID', async () => {
  const p = provider(schedule);
  for (const query of ['?schedule=../../evil', '?schedule=0022600051&fixture=demo', '?schedule=0022600051&issue=demo', '?schedule=0022600051&schedule=0022600052']) assert.ok(p.select(query, { mode: 'production' }).error);
  const sel = p.select('?schedule=0022600051', { mode: 'production' });
  assert.equal(sel.url, 'data/schedules/0022600051.json');
  const good = await new Promise(resolve => p.load(sel, resolve));
  assert.equal(good.game.gameId, '0022600051');
  const wrong = await new Promise(resolve => provider(candidate).load(sel, resolve));
  assert.equal(wrong.__loadError, 'SCHEDULE_ID_MISMATCH');
});

test('legacy DEMO and raw World v1 are not promoted by the new schedule input', () => {
  assert.equal(run(loadFixtures().demo).model.status, 'REFUSED');
  const raw = clone(schedule); raw.schema = 'world-analysis-package@1';
  assert.equal(run(raw).model.status, 'INVALID');
  const bool = clone(schedule); bool.public = true;
  assert.equal(run(bool).model.status, 'INVALID');
});


test('existing Schedule/Match templates display actual fields, exact missing and retained schedule navigation', () => {
  for (const page of ['schedule', 'match']) {
    const html = renderPage(schedule, page, '?schedule=0022600051&game=0022600051&mode=production&lang=zh', null, { now: scheduleNow });
    assert.ok(/SAC.*?@.*?LAL/.test(html));
    for (const value of ['0022600051', '11:00', '11/21', '賽程資訊', schedule.source.observedAt, '這場的賽前判讀還沒出來。']) assert.ok(html.includes(value), page + ': missing ' + value);
    assert.ok(html.includes('href="https://www.nba.com/game/sac-vs-lal-0022600051"'));
    assert.ok(html.includes('schedule=0022600051'));
    assert.ok(!/DEMO|homeWinProbability|HOME_COURT@|61%|0\.5|World · Coach Read/.test(html.replace(/<[^>]*>/g, '')));
  }
});

test('isolated renderer contracts display HOME/NEUTRAL with saved/source times; never production release proof', () => {
  for (const value of ['HOME', 'NEUTRAL']) {
    const snap = clone(candidate.contextSnapshot); snap.homeCourt.evidence.value = value;
    const projection = PL.contextSnapshotView(snap);
    for (const page of ['schedule', 'match']) {
      const html = renderPage(candidate, page, '?schedule=0022600999&game=0022600999&mode=production&lang=zh', projection);
      for (const expected of [value, 'HOME_COURT@1', '08:05:00Z', '08:00:00Z', snap.snapshotId, '0022600999']) assert.ok(html.includes(expected), page + ': missing ' + expected);
      assert.ok(!/這場的賽前判讀還沒出來。|0\.5|61%/.test(html.replace(/<[^>]*>/g, '')));
    }
  }
});

test('templates escape projected source labels and snapshot IDs; missing and unknown IDs do not fall back', () => {
  const projection = PL.contextSnapshotView(candidate.contextSnapshot);
  projection.source.publisher = '<img src=x onerror=evil>';
  projection.snapshotId = '<script>evil</script>';
  const html = renderPage(candidate, 'match', '?game=0022600999', projection);
  assert.ok(html.includes('&lt;img src=x onerror=evil&gt;') && html.includes('&lt;script&gt;evil&lt;/script&gt;'));
  assert.ok(!html.includes('<script>evil') && !html.includes('<img src=x'));
  const unknown = renderPage(schedule, 'match', '?game=9999999999', null, { now: scheduleNow });
  assert.ok(unknown.includes('找不到這場比賽') && !unknown.includes('m-hero'));
  // Advance the read clock; never corrupt the source/editorial chronology to create a stale state.
  const stale = clone(schedule);
  for (const page of ['schedule', 'match']) {
    const output = renderPage(stale, page, undefined, null, { now: stale.validUntil });
    assert.ok(output.includes('先前的賽程') && output.includes('這場的賽前判讀還沒出來。'));
  }
});

test('factual rematch passes source/identity checks and remains separate from any World read', () => {
  const later = scheduleNow;
  assert.deepEqual(C.validateSchedule(schedule, { now: later }), []);
  const model = run(schedule, later).model;
  const game = model.schedule[0];
  assert.equal(model.status, 'SCHEDULE_ONLY');
  assert.equal(game.editorial.kind, 'CUP_REMATCH');
  assert.equal(game.editorial.previous.awayPoints - game.editorial.previous.homePoints, 13);
  assert.equal(game.editorial.sources.previousUrl, 'https://www.nba.com/game/lal-vs-sac-0022600185');
  assert.equal(game.hasRead, false);
  assert.equal(game.world, undefined);
  assert.equal(game.pregameSnapshot, null);
  const early = run(schedule, schedule.source.observedAt).model.schedule[0];
  assert.equal(early.editorial, null);
  const stale = run(schedule, schedule.validUntil).model.schedule[0];
  assert.equal(stale.editorial, null);
});

test('wrong prior game, altered result, future source, and unknown editorial fields are rejected', () => {
  const later = scheduleNow;
  for (const change of [
    r => { r.editorial.nbaGameId = '0022609999'; },
    r => { r.editorial.previous.awayPoints = 90; },
    r => { r.editorial.previous.home = 'NYK'; },
    r => { r.editorial.previous.gameId = r.game.gameId; },
    r => { r.editorial.sources.matchupUrl = 'https://nba.com.evil.test/game/sac-vs-lal-0022600051'; },
    r => { r.editorial.sources.previousUrl = 'https://www.nba.com/game/lal-vs-sac-9999999999'; },
    r => { r.editorial.observedAt = r.validUntil; },
    r => { r.editorial.previous.unknown = 'inject'; },
    r => { r.editorial.previous.awayPoints = 118; },
    r => { r.editorial.factsFingerprint = '0'.repeat(64); }
  ]) {
    const x = clone(schedule); change(x);
    assert.equal(run(x, later).model.status, 'INVALID');
    assert.equal(run(x, later).model.schedule.length, 0);
  }
});
