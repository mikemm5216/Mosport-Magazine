'use strict';
/* B-P2-01b official result projection (mosport-b/game-result@1).
   Positive cases use only the synthetic 0999 schedule fixture with a test pin.
   Nothing here claims a real FINAL for 0022600051. */
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
  schema: 'mosport-b/game-result@1', nbaGameId: '0022600999', espnGameId: '401909999',
  away: 'SAC', home: 'LAL', awayScore: 101, homeScore: 112, status: 'FINAL',
  officialUrl: 'https://www.nba.com/game/sac-vs-lal-0022600999',
  confirmations: { nba: { observedAt: '2026-11-21T05:40:00Z' }, espn: { observedAt: '2026-11-21T05:41:00Z' } },
  receiptRef: 'TEST-ISOLATED-0999'
};
const pinFor = (r) => ({ [r.nbaGameId]: { digest: C.sha256(C.canonical(r)), receiptRef: r.receiptRef } });
const pins = pinFor(result);
const run = (schedule, opts) => PL.run(clone(schedule), Object.assign({ mode: 'production', now }, opts));
const METHOD = /核對|雜湊|收據|釘選|驗證|receipt|sha|hash|pin|verified|ESPN|snapshot/i;

test('production ships no pinned result and no public result file', () => {
  assert.deepEqual(Object.keys(PINS), []);
  assert.ok(Object.isFrozen(PINS));
  assert.ok(!fs.existsSync(path.join(__dirname, '../../site/data/results')));
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

test('the real game keeps its #26 view while no pinned official result exists', () => {
  // An unpinned projection for 0022600051 is ignored; nothing claims this game is FINAL.
  const unpinned = Object.assign(clone(result), { nbaGameId: '0022600051', officialUrl: 'https://www.nba.com/game/sac-vs-lal-0022600051' });
  const at = '2026-11-21T03:05:00Z';
  const m = run(real, { now: at, result: unpinned, pins: PINS }).model;
  assert.equal(m.reason, 'PAST_TIPOFF');
  assert.equal(m.schedule[0].status, 'SCHEDULED');
  assert.equal(m.schedule[0].score, null);
  const html = renderPage(real, 'match', '?schedule=0022600051&game=0022600051&mode=production&lang=zh', null, { now: at, result: unpinned });
  assert.ok(html.includes('已過原定開賽時間（台北 11:00）。') && !html.includes('終場'));
});
