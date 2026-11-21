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

test('refreshed 0051 entry spans the previous expiry and withdraws the editorial at tipoff', () => {
  const receipt = require('../../docs/reports/2026-11-21-schedule-refresh/source-observations.json');
  const tipoff = Date.parse(schedule.game.tipoff);
  assert.ok(Date.parse(schedule.editorial.observedAt) < Date.parse(receipt.previousValidUntil));
  for (const clock of [receipt.previousValidUntil, new Date(tipoff - 1).toISOString()]) {
    const m = run(schedule, clock).model;
    assert.equal(m.status, 'SCHEDULE_ONLY');
    assert.equal(m.schedule[0].editorial.kind, 'CUP_REMATCH');
  }
  for (const clock of [schedule.game.tipoff, new Date(tipoff + 1).toISOString()]) {
    const m = run(schedule, clock).model;
    assert.equal(m.status, 'SCHEDULE_ONLY');
    assert.equal(m.reason, 'PAST_TIPOFF');
    assert.equal(m.schedule.length, 1);
    assert.equal(m.schedule[0].pastTipoff, true);
    assert.equal(m.schedule[0].status, 'SCHEDULED');
    assert.equal(m.schedule[0].score, null);
    assert.equal(m.schedule[0].editorial, null);
    assert.equal(m.schedule[0].pregameSnapshot, null);
  }
});

test('an observation that expired before tipoff stays expired across tipoff; one valid until tipoff turns PAST_TIPOFF', () => {
  const early = clone(schedule); early.validUntil = '2026-11-21T02:30:00Z';
  for (const clock of ['2026-11-21T02:59:59Z', schedule.game.tipoff, '2026-11-21T03:05:00Z']) {
    const m = run(early, clock).model;
    assert.equal(m.status, 'STALE', clock);
    assert.equal(m.reason, 'SCHEDULE_EXPIRED', clock);
    assert.equal(m.schedule[0].pastTipoff, false, clock);
    assert.equal(m.schedule[0].editorial, null, clock);
  }
  const html = renderPage(early, 'schedule', '?schedule=0022600051&mode=production&lang=zh', null, { now: '2026-11-21T03:05:00Z' });
  assert.ok(html.includes('先前的賽程') && !html.includes('已過原定開賽時間'));
  for (const clock of [schedule.game.tipoff, '2026-11-21T03:05:00Z']) {
    const m = run(schedule, clock).model;
    assert.equal(m.status, 'SCHEDULE_ONLY', clock);
    assert.equal(m.reason, 'PAST_TIPOFF', clock);
  }
});

test('a saved schedule is valid at the latest until the scheduled tipoff', () => {
  assert.equal(schedule.validUntil, schedule.game.tipoff);
  const late = clone(schedule); late.validUntil = '2026-11-21T04:00:00Z';
  assert.ok(C.validateSchedule(late, { now: scheduleNow }).some(p => p.code === 'BAD_TIME' && p.path === 'schedule.validUntil'));
  const m = run(late, '2026-11-21T03:30:00Z').model;
  assert.equal(m.status, 'INVALID');
  assert.equal(m.schedule.length, 0);
});

test('refreshing only the schedule receipt withdraws an unverified editorial and keeps the game', () => {
  const refreshed = clone(schedule);
  refreshed.source.observedAt = '2026-11-21T02:45:00.000Z';
  refreshed.source.contentFingerprint = C.sha256(C.canonical({ game: refreshed.game, originalUrl: refreshed.source.originalUrl, observedAt: refreshed.source.observedAt }));
  assert.deepEqual(C.validateSchedule(refreshed, { now: '2026-11-21T02:46:00Z' }), []);
  assert.ok(C.validateScheduleEditorial(refreshed).some(p => p.code === 'EDITORIAL_CHRONOLOGY'));
  const r = run(refreshed, '2026-11-21T02:46:00Z');
  assert.equal(r.model.status, 'SCHEDULE_ONLY');
  assert.equal(r.model.schedule.length, 1);
  assert.equal(r.model.schedule[0].editorial, null);
  assert.equal(r.model.schedule[0].source.observedAt, '2026-11-21T02:45:00.000Z');
  assert.deepEqual(r.diagnostics.excluded.filter(x => x.slot === 'editorial').map(x => x.reason), ['EDITORIAL_CHRONOLOGY']);
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
    for (const value of ['0022600051', '11:00', '11/21', '賽程資訊', schedule.source.observedAt]) assert.ok(html.includes(value), page + ': missing ' + value);
    assert.ok(!/賽前判讀還沒出來|not out yet/.test(html) && !html.includes('pregame-missing') && !html.includes('賽前看點'), page + ': empty read block');
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
  // An observation that expired before tipoff is stale history; only the read clock moves.
  const stale = clone(schedule); stale.validUntil = '2026-11-21T02:30:00Z';
  for (const page of ['schedule', 'match']) {
    const output = renderPage(stale, page, undefined, null, { now: stale.validUntil });
    assert.ok(output.includes('以下是先前的賽程，開賽時間可能有變動。') && !/賽前判讀還沒出來|已不適用/.test(output) && !output.includes('賽前看點'));
  }
});

const ZH_NOTICE = '已過原定開賽時間（台北 11:00）。';
const NARRATION = /未發布|曾發布|已在開賽前發布|不再更新|did not publish|was published|not updated after/;
test('after the scheduled tipoff Schedule and Match show the scheduled time and the official link only', () => {
  const tip = schedule.game.tipoff;
  for (const page of ['schedule', 'match']) {
    const zh = renderPage(schedule, page, '?schedule=0022600051&game=0022600051&mode=production&lang=zh', null, { now: tip });
    assert.ok(zh.includes('已過原定開賽時間（台北 11:00）。'), page);
    assert.ok(zh.includes('查看 NBA 官方賽況') && zh.includes('href="https://www.nba.com/game/sac-vs-lal-0022600051"'), page);
    assert.ok(!/先前的賽程|還沒出來|未開賽|進行中|終場|已不適用/.test(zh.replace(/<[^>]*>/g, '')), page);
    const en = renderPage(schedule, page, '?schedule=0022600051&game=0022600051&mode=production&lang=en', null, { now: tip });
    assert.ok(en.includes('Past the scheduled tip-off (11:00 Taipei).'), page);
    assert.ok(en.includes('See NBA.com for the game') && !/not out yet|earlier schedule|Live|Final/.test(en.replace(/<[^>]*>/g, '')), page);
    for (const html of [zh, en]) assert.ok(!NARRATION.test(html.replace(/<[^>]*>/g, '')), page);
  }
  const projection = PL.contextSnapshotView(candidate.contextSnapshot);
  // Qualified content shows itself with the same notice; no published/unpublished narration.
  const published = renderPage(schedule, 'match', '?schedule=0022600051&game=0022600051&mode=production&lang=zh', projection, { now: tip });
  assert.ok(published.includes(ZH_NOTICE) && published.includes(projection.snapshotId) && published.includes('HOME_COURT@1'));
  const publishedEn = renderPage(schedule, 'schedule', '?schedule=0022600051&mode=production&lang=en', projection, { now: tip });
  assert.ok(publishedEn.includes('Past the scheduled tip-off (11:00 Taipei).') && publishedEn.includes(projection.snapshotId));
  for (const html of [published, publishedEn]) assert.ok(!NARRATION.test(html.replace(/<[^>]*>/g, '')));
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
  const atTipoff = run(schedule, schedule.validUntil).model.schedule[0];
  assert.equal(atTipoff.editorial, null);
});

test('wrong prior game, altered result, future source, and unknown editorial fields withdraw only the editorial', () => {
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
    const r = run(x, later);
    assert.equal(r.model.status, 'SCHEDULE_ONLY');
    assert.equal(r.model.schedule.length, 1);
    assert.equal(r.model.schedule[0].editorial, null);
    assert.equal(r.diagnostics.excluded.filter(e => e.slot === 'editorial').length, 1);
  }
  const malformed = clone(schedule); malformed.editorial = 'not an object';
  assert.equal(run(malformed, later).model.status, 'INVALID');
});
