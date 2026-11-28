'use strict';
/* B-P2-01b official result projections (mosport-b/game-result@1). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { C, clone, renderPage } = require('./helpers.js');
const PL = require('../../site/js/data/pipeline.js');
const PINS = require('../../site/js/data/result-pins.js');
const real = require('../../site/data/schedules/0022600051.json');
const synthetic = require('../fixtures/context-snapshot-v2.json');

const now = '2026-11-21T06:00:00Z';
const result = {
  schema: 'mosport-b/game-result@1', nbaGameId: '0022600999', espnGameId: '401999999',
  away: 'SAC', home: 'LAL', awayScore: 101, homeScore: 112, status: 'FINAL',
  officialUrl: 'https://www.nba.com/game/sac-vs-lal-0022600999',
  confirmations: { nba: { observedAt: '2026-11-21T05:40:00Z' }, espn: { observedAt: '2026-11-21T05:41:00Z' } },
  receiptRef: 'TEST-ISOLATED-0999'
};
const pinFor = (r) => ({ [r.nbaGameId]: { digest: C.sha256(C.canonical(r)), receiptRef: r.receiptRef } });
const pins = pinFor(result);
const run = (schedule, opts) => PL.run(clone(schedule), Object.assign({ mode: 'production', now }, opts));
const METHOD = /核對|雜湊|收據|釘選|驗證|receipt|sha|hash|pin|verified|ESPN|snapshot/i;

const REAL = require('../../site/data/results/0022600051.json');
test('production ships exactly the four pinned public result projections', () => {
  const ids = ['0022600051', '0022600064', '0022600068', '0022600071'];
  const dir = path.join(__dirname, '../../site/data/results');
  assert.deepEqual(Object.keys(PINS), ids);
  assert.ok(Object.isFrozen(PINS));
  assert.deepEqual(fs.readdirSync(dir).sort(), ids.map(id => id + '.json'));
  for (const id of ids) {
    const projection = JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8'));
    assert.ok(Object.isFrozen(PINS[id]));
    assert.equal(projection.nbaGameId, id);
    assert.equal(projection.receiptRef, 'NBA-' + id + '-R1');
    assert.deepEqual(Object.keys(projection).sort(), ['away', 'awayScore', 'confirmations', 'espnGameId', 'home', 'homeScore', 'nbaGameId', 'officialUrl', 'receiptRef', 'schema', 'status']);
    assert.deepEqual(PINS[id], pinFor(projection)[id]);
  }
  assert.equal(C.sha256(C.canonical(REAL)), '370e676a592aa02547f5d7fd80e80d0f4156db9c02e5fb127f1160c8bfee864d');
});

test('real 0022600051 result: exact time boundary, FINAL after, #26 view before', () => {
  const edge = Date.parse(REAL.confirmations.espn.observedAt);
  const before = run(real, { now: new Date(edge - 1).toISOString(), result: REAL, pins: PINS });
  assert.equal(before.model.reason, 'PAST_TIPOFF');
  assert.equal(before.model.schedule[0].status, 'SCHEDULED');
  assert.deepEqual(before.diagnostics.excluded.filter(e => e.slot === 'result').map(e => e.reason), ['RESULT_CHRONOLOGY']);
  const at = run(real, { now: REAL.confirmations.espn.observedAt, result: REAL, pins: PINS });
  assert.equal(at.model.reason, 'FINAL');
  assert.deepEqual(at.model.schedule[0].score, { away: 104, home: 106 });
  assert.equal(at.model.schedule[0].editorial, null);
  assert.deepEqual(at.model.stories, []);
  assert.deepEqual(C.validateGameResult(REAL, real, PINS['0022600051'], REAL.confirmations.espn.observedAt), []);
});

test('real 0022600051 result reaches Home/Schedule/Match in zh/en as result and official link only', () => {
  const at = '2026-11-21T06:00:00Z';
  for (const [lang, line] of [['zh', '終場 湖人 106：104 國王'], ['en', 'Final: Lakers 106–104 Kings']]) {
    for (const page of ['home', 'schedule', 'match']) {
      const html = renderPage(real, page, '?schedule=0022600051&game=0022600051&mode=production&lang=' + lang, null, { now: at, result: REAL, realTeams: true });
      assert.ok(html.includes(line), page + '/' + lang);
      assert.ok(html.includes('href="https://www.nba.com/game/sac-vs-lal-0022600051"'), page + '/' + lang + ': link');
      assert.ok(!/已過原定開賽時間|Past the scheduled tip-off|先前的賽程|13 分之差|NBA-0022600051-R1|370e676a/.test(html), page + '/' + lang + ': nothing else');
      const notice = (html.match(/<p class="[^"]*result-note[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
      assert.ok(notice && !METHOD.test(notice.replace(/<[^>]*>/g, ' ')), page + '/' + lang + ': no method words');
    }
  }
});

test('real 0022600051 result is ignored when unpinned, altered or used for another game', () => {
  const at = '2026-11-21T06:00:00Z';
  const baseline = run(real, { now: at }).model;
  for (const [label, r, p, code] of [
    ['unpinned', REAL, {}, 'RESULT_UNPINNED'],
    ['altered score', Object.assign(clone(REAL), { homeScore: 107 }), PINS, 'RESULT_PIN_MISMATCH'],
    ['altered receipt', Object.assign(clone(REAL), { receiptRef: 'NBA-0022600051-R2' }), PINS, 'RESULT_PIN_MISMATCH']
  ]) {
    const out = run(real, { now: at, result: r, pins: p });
    assert.deepEqual(out.model, baseline, label);
    assert.deepEqual(out.diagnostics.excluded.filter(e => e.slot === 'result').map(e => e.reason), [code], label);
  }
  const other = run(synthetic, { result: REAL, pins: { '0022600999': PINS['0022600051'] } });
  assert.deepEqual(other.model, run(synthetic, {}).model, 'wrong game');
  assert.equal(other.diagnostics.excluded.filter(e => e.slot === 'result')[0].reason, 'RESULT_GAME_MISMATCH');
});

test('a pinned, verified projection turns the same game into FINAL with the official score', () => {
  const r = run(synthetic, { result, pins });
  const g = r.model.schedule[0];
  assert.equal(r.model.status, 'SCHEDULE_ONLY');
  assert.equal(r.model.reason, 'FINAL');
  assert.equal(g.status, 'FINAL');
  assert.deepEqual(g.score, { away: 101, home: 112 });
  assert.equal(g.pastTipoff, false);
  assert.equal(g.editorial, null);
  assert.deepEqual(r.diagnostics.excluded.filter(e => e.slot === 'result'), []);
});

test('reader pages show only the result and the official link (zh/en, Home/Schedule/Match)', () => {
  for (const [lang, line] of [['zh', '終場 湖人 112：101 國王'], ['en', 'Final: Lakers 112–101 Kings']]) {
    for (const page of ['home', 'schedule', 'match']) {
      const html = renderPage(synthetic, page, '?schedule=0022600999&game=0022600999&mode=production&lang=' + lang, null, { now, result, pins, realTeams: true });
      const text = html.replace(/<[^>]*>/g, ' ');
      assert.ok(html.includes(line), page + '/' + lang + ': ' + line);
      assert.ok(html.includes('href="https://www.nba.com/game/sac-vs-lal-0022600999"'), page + '/' + lang + ': link');
      assert.ok(!/已過原定開賽時間|Past the scheduled tip-off|先前的賽程|earlier schedule|state-stale/.test(html), page + '/' + lang + ': no stale or tipoff state');
      const notice = (html.match(/<p class="[^"]*result-note[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
      assert.ok(notice && !METHOD.test(notice.replace(/<[^>]*>/g, ' ')), page + '/' + lang + ': result line carries no method words');
      assert.ok(!text.includes('TEST-ISOLATED-0999'), page + '/' + lang + ': receipt reference is not shown');
    }
  }
});

test('any untrusted or inconsistent projection falls back to exactly the no-result view', () => {
  const baseline = run(synthetic, {}).model;
  const cases = [
    ['absent', null, pins, 'RESULT_ABSENT'],
    ['not an object', 'FINAL 112-101', pins, 'RESULT_ABSENT'],
    ['wrong game', Object.assign(clone(result), { nbaGameId: '0022600051', officialUrl: 'https://www.nba.com/game/sac-vs-lal-0022600051' }), pins, 'RESULT_GAME_MISMATCH'],
    ['wrong ESPN game', Object.assign(clone(result), { espnGameId: '401909999' }), null, 'RESULT_GAME_MISMATCH'],
    ['swapped teams', Object.assign(clone(result), { away: 'LAL', home: 'SAC' }), pins, 'RESULT_GAME_MISMATCH'],
    ['wrong official URL', Object.assign(clone(result), { officialUrl: 'https://www.nba.com.evil.example/game/sac-vs-lal-0022600999' }), pins, 'RESULT_SOURCE_MISMATCH'],
    ['observed before tipoff', (() => { const r = clone(result); r.confirmations.nba.observedAt = '2026-11-21T02:59:59Z'; return r; })(), null, 'RESULT_CHRONOLOGY'],
    ['observed in the future', (() => { const r = clone(result); r.confirmations.espn.observedAt = '2026-11-21T06:00:01Z'; return r; })(), null, 'RESULT_CHRONOLOGY'],
    ['one source only', (() => { const r = clone(result); delete r.confirmations.espn; return r; })(), null, 'MISSING_FIELD'],
    ['tied final', Object.assign(clone(result), { awayScore: 112 }), null, 'RESULT_SCORE_INVALID'],
    ['unpinned', result, {}, 'RESULT_UNPINNED'],
    ['tampered after pinning', Object.assign(clone(result), { homeScore: 113 }), pins, 'RESULT_PIN_MISMATCH'],
    ['pin for another receipt', result, { '0022600999': { digest: pins['0022600999'].digest, receiptRef: 'OTHER' } }, 'RESULT_PIN_MISMATCH'],
    ['self-declared hash', Object.assign(clone(result), { sha256: 'a'.repeat(64) }), null, 'UNKNOWN_FIELD'],
    ['self-declared eligibility', Object.assign(clone(result), { public: true }), null, 'UNKNOWN_FIELD']
  ];
  for (const [label, r, p, code] of cases) {
    // When the case gives no pin, pin the altered payload itself: the check must still reject it.
    const usePins = p === null ? (typeof r === 'object' && r ? pinFor(r) : {}) : p;
    const out = run(synthetic, { result: r, pins: usePins });
    assert.deepEqual(out.model, baseline, label + ': model unchanged');
    if (r === null) continue;
    const reasons = out.diagnostics.excluded.filter(e => e.slot === 'result').map(e => e.reason);
    assert.deepEqual(reasons, [code], label);
  }
});

test('a forged projection for the real game is ignored and keeps the #26 view', () => {
  // A projection that does not match the pinned digest is ignored; nothing else claims this game is FINAL.
  const unpinned = Object.assign(clone(result), { nbaGameId: '0022600051', officialUrl: 'https://www.nba.com/game/sac-vs-lal-0022600051' });
  const at = '2026-11-21T03:05:00Z';
  const m = run(real, { now: at, result: unpinned, pins: PINS }).model;
  assert.equal(m.reason, 'PAST_TIPOFF');
  assert.equal(m.schedule[0].status, 'SCHEDULED');
  assert.equal(m.schedule[0].score, null);
  const html = renderPage(real, 'match', '?schedule=0022600051&game=0022600051&mode=production&lang=zh', null, { now: at, result: unpinned });
  assert.ok(html.includes('已過原定開賽時間（台北 11:00）。') && !html.includes('終場'));
});
