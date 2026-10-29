'use strict';
/* B-P3-03 parser (synthetic fixture) and B-P3-04 Evidence Candidate draft. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { C } = require('./helpers.js');
const IR = require('../../site/internal/js/sources/injury-report.js');
const EV = require('../../site/internal/js/evidence.js');
const R = require('../../site/internal/js/risk.js');

const TEXT = fs.readFileSync(path.join(__dirname, '../fixtures/sources/injury-report.synthetic.txt'), 'utf8');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/js/teams.nba.js'), 'utf8'), ctx);
const team = IR.teamResolver(ctx.window.MOSPORT_TEAMS.list);
const parse = (t) => IR.parse(t, team);
const codes = (r) => r.errors.map((e) => e.code);
const URL = 'https://ak-static.cms.nba.com/referee/injury/Injury-Report_2026-10-31_05_30PM.pdf';

test('the fixture is synthetic and says so (no league content is stored)', () => {
  assert.match(TEXT.split('\n')[0], /SYNTHETIC TEST FIXTURE: fictional players/);
  assert.ok(!/\b(Tatum|James|Curry|Embiid)\b/.test(TEXT));
});

test('clean report: title time → UTC (DST-aware), carried-forward date/game/team, wrapped reasons, NOT YET SUBMITTED', () => {
  const r = parse(TEXT);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.report.publishedAt, '2026-10-31T21:30:00Z');
  assert.equal(r.rows.length, 6);
  assert.deepEqual(r.rows.map((x) => x.team), ['BOS', 'BOS', 'NYK', 'GSW', 'PHI', 'TOR']);
  assert.equal(r.rows[1].reason, 'Injury/Illness - Right Knee; Soreness');
  assert.deepEqual(r.notSubmitted.map((x) => x.team), ['LAL']);
  assert.ok(r.rows.every((x) => x.game.tipoffUTC === null && x.game.tipoffMissingReason === 'AM_PM_NOT_STATED'), 'no tip-off guessed from "07:30 (ET)"');
});

test('Eastern time conversion follows the runtime tz data, and a non-existent local time is refused', () => {
  assert.equal(IR.etToUtc(2026, 11, 1, 17, 30), '2026-11-01T22:30:00Z', 'after DST ends: EST');
  assert.equal(IR.etToUtc(2026, 10, 31, 17, 30), '2026-10-31T21:30:00Z', 'EDT');
  assert.equal(IR.etToUtc(2026, 3, 8, 2, 30), null, 'spring-forward gap');
  const r = parse(TEXT.replace('10/31/26 05:30 PM', '03/08/26 02:30 AM'));
  assert.deepEqual(codes(r), ['BAD_REPORT_TIME']);
});

test('failure cases are typed errors; nothing is filled in', () => {
  const cases = [
    ['', 'EMPTY_INPUT'],
    [TEXT.replace(/Injury Report:[^\n]*/, 'Some other document'), 'NO_REPORT_TITLE'],
    [TEXT.replace(/Game Date[^\n]*\n/, ''), 'NO_HEADER_BEFORE_ROW'],
    [TEXT.replace('Questionable', 'Sidelined   '), 'UNKNOWN_STATUS'],
    [TEXT.replace('10/31/2026', '02/30/2026'), 'BAD_GAME_DATE'],
    [TEXT.replace('BOS@NYK', 'BOS vs NY'), 'BAD_MATCHUP'],
    [TEXT.replace('Boston Celtics  ', 'Gotham Knights  '), 'UNKNOWN_TEAM'],
    [TEXT.replace('New York Knicks', 'Miami Heat     '), 'TEAM_NOT_IN_MATCHUP'],
    [TEXT.replace('07:30 (ET)', '7.30 pm   '), 'BAD_GAME_TIME'],
    [TEXT.replace(/Rest\n/, '\n'), 'MISSING_REASON']
  ];
  for (const [t, code] of cases) {
    const r = parse(t);
    assert.equal(r.ok, false, code);
    assert.ok(codes(r).includes(code), `${code}: got ${codes(r).join(',')}`);
  }
});

test('a report source receipt: official fact, integrity fingerprint, rights UNVERIFIED (free to read ≠ free to reuse)', () => {
  const r = parse(TEXT);
  const s = EV.reportSourceReceipt({ sourceId: 'SRC-IR-1', url: URL, text: TEXT, publishedAt: r.report.publishedAt, observedAt: '2026-10-31T21:40:00Z', demo: true });
  assert.deepEqual(C.validateRecord('source', s), []);
  assert.equal(s.rightsStatus, 'UNVERIFIED');
  assert.equal(s.quotedSpan, null, 'the report text is not stored');
  /* A story built only on it cannot pass rights QA. */
  const item = { id: 'X', type: 'NEWS', sourceRefs: ['SRC-IR-1'], zh: { headline: '傷病更新' }, en: { headline: 'Injury update' } };
  assert.ok(R.rightsChecks(item, { sources: { 'SRC-IR-1': s } }).reasons.includes('RIGHTS_UNVERIFIED:SRC-IR-1'));
});

test('Evidence Candidates: one per status, typed missing identities, no scoring field, never sent to A', () => {
  const r = parse(TEXT);
  const out = EV.fromInjuryReport(r, { sourceId: 'SRC-IR-1', observedAt: '2026-10-31T21:40:00Z', demo: true });
  assert.equal(out.ok, true);
  assert.equal(out.candidates.length, 6);
  for (const c of out.candidates) {
    assert.deepEqual(EV.validate(c), []);
    assert.equal(c.scoringAuthority, 'NONE');
    assert.equal(c.sentToA, false);
    assert.ok(!('weight' in c) && !('score' in c) && !('probability' in c));
    assert.equal(c.subjects[1].id, null);
    assert.equal(c.subjects[1].missingReason, 'PLAYER_ID_NOT_RESOLVED');
    assert.equal(c.sourcePublishedAt, '2026-10-31T21:30:00Z');
    assert.equal(c.availableAt, '2026-10-31T21:40:00Z');
  }
});

test('Evidence chronology: observed before publication is refused; availableAt never precedes publication', () => {
  const r = parse(TEXT);
  assert.equal(EV.fromInjuryReport(r, { sourceId: 'S', observedAt: '2026-10-31T21:00:00Z' }).refused, 'OBSERVED_BEFORE_PUBLISHED');
  const c = EV.fromInjuryReport(r, { sourceId: 'S', observedAt: '2026-10-31T21:40:00Z' }).candidates[0];
  assert.ok(EV.validate({ ...c, availableAt: '2026-10-31T21:00:00Z', firstObservedAt: '2026-10-31T21:00:00Z' }).includes('AVAILABLE_BEFORE_PUBLISHED'));
  assert.ok(EV.validate({ ...c, weight: 0.3 }).some((p) => p.startsWith('UNKNOWN_FIELD')));
  assert.ok(EV.validate({ ...c, scoringAuthority: 'FEATURE' }).includes('SCORING_AUTHORITY_NOT_NONE'));
  assert.ok(EV.validate({ ...c, sentToA: true }).includes('SENT_TO_A_NOT_FALSE'));
});

test('a later report: unchanged statuses are counted once; a change supersedes and keeps the earlier candidate', () => {
  const r1 = parse(TEXT);
  const first = EV.fromInjuryReport(r1, { sourceId: 'S1', observedAt: '2026-10-31T21:40:00Z' }).candidates;
  const later = TEXT.replace('10/31/26 05:30 PM', '10/31/26 06:30 PM').replace('Questionable', 'Out         ');
  const r2 = parse(later);
  assert.equal(r2.ok, true, JSON.stringify(r2.errors));
  const second = EV.fromInjuryReport(r2, { sourceId: 'S2', observedAt: '2026-10-31T22:35:00Z', previous: first });
  assert.equal(second.unchanged, 5);
  assert.equal(second.candidates.length, 1);
  const changed = second.candidates[0];
  assert.equal(changed.assertion.value, 'Out');
  assert.equal(changed.supersedes, first.find((c) => c.subjects[1].printedName === 'Sample, Bravo').id);
});

test('a parse with any error imports nothing; a retracted source yields retraction candidates', () => {
  const bad = parse(TEXT.replace('Questionable', 'Sidelined   '));
  const out = EV.fromInjuryReport(bad, { sourceId: 'S', observedAt: '2026-10-31T21:40:00Z' });
  assert.deepEqual([out.ok, out.refused, out.candidates.length], [false, 'PARSE_NOT_CLEAN', 0]);
  const cands = EV.fromInjuryReport(parse(TEXT), { sourceId: 'S1', observedAt: '2026-10-31T21:40:00Z' }).candidates;
  const ret = EV.retractionsFor(cands, 'S1', '2026-11-01T01:00:00Z');
  assert.equal(ret.length, 6);
  assert.ok(ret.every((x) => x.verificationState === 'RETRACTED' && x.retractionOf && EV.validate(x).length === 0));
});

test('candidate validator returns typed problems for malformed subjects and nested records', () => {
  const c = EV.fromInjuryReport(parse(TEXT), { sourceId: 'S', observedAt: '2026-10-31T21:40:00Z' }).candidates[0];
  for (const subject of [null, undefined, [], 'TEAM', 7, false]) {
    assert.deepEqual(EV.validate({ ...c, subjects: [subject] }), ['WRONG_TYPE:subjects:0']);
  }
  assert.deepEqual(EV.validate([]), ['WRONG_TYPE']);
  assert.ok(EV.validate({ ...c, assertion: null }).includes('WRONG_TYPE:assertion'));
  assert.ok(EV.validate({ ...c, provenance: null }).includes('WRONG_TYPE:provenance'));
});

test('older reports cannot supersede newer evidence, even when observed later; refusal is atomic', () => {
  const newer = EV.fromInjuryReport(parse(TEXT.replace('05:30 PM', '06:30 PM')), {
    sourceId: 'S2', observedAt: '2026-10-31T22:40:00Z'
  }).candidates;
  const before = JSON.stringify(newer);
  for (const text of [TEXT, TEXT.replace('Questionable', 'Out         ')]) {
    // The first row has no history and would be imported before the stale second row.
    const r = EV.fromInjuryReport(parse(text), {
      sourceId: 'OLD', observedAt: '2026-10-31T22:45:00Z', previous: [newer[1]]
    });
    assert.deepEqual([r.ok, r.refused, r.candidates, r.unchanged], [false, 'STALE_REPORT', [], 0]);
  }
  assert.equal(JSON.stringify(newer), before, 'history is never mutated');
});

test('history order does not choose the predecessor; same-time conflicts and observation rollback are refused', () => {
  const first = EV.fromInjuryReport(parse(TEXT), { sourceId: 'S1', observedAt: '2026-10-31T21:40:00Z' }).candidates;
  const laterText = TEXT.replace('05:30 PM', '06:30 PM').replace('Questionable', 'Out         ');
  const second = EV.fromInjuryReport(parse(laterText), {
    sourceId: 'S2', observedAt: '2026-10-31T22:40:00Z', previous: first
  }).candidates;
  const thirdText = TEXT.replace('05:30 PM', '07:30 PM').replace('Questionable', 'Probable    ');
  for (const history of [[...second, ...first], [...first, ...second]]) {
    const third = EV.fromInjuryReport(parse(thirdText), {
      sourceId: 'S3', observedAt: '2026-10-31T23:40:00Z', previous: history
    });
    assert.equal(third.ok, true);
    assert.equal(third.candidates[0].supersedes, second[0].id);
  }
  const replay = EV.fromInjuryReport(parse(TEXT), { sourceId: 'S1', observedAt: '2026-10-31T21:40:00Z', previous: first });
  assert.deepEqual([replay.ok, replay.candidates.length, replay.unchanged], [true, 0, 6]);
  const conflict = EV.fromInjuryReport(parse(TEXT.replace('Questionable', 'Out         ')), {
    sourceId: 'S1', observedAt: '2026-10-31T21:45:00Z', previous: first
  });
  assert.equal(conflict.refused, 'CONFLICTING_REPORT_TIME');
  const lateObservation = first.map(c => ({ ...c, availableAt: '2026-11-01T01:00:00Z' }));
  assert.equal(EV.fromInjuryReport(parse(laterText), {
    sourceId: 'S2', observedAt: '2026-10-31T22:40:00Z', previous: lateObservation
  }).refused, 'OBSERVATION_BEFORE_PREVIOUS');
});

test('malformed history is refused without throwing or partially importing', () => {
  for (const previous of [[null], [7], {}]) {
    const r = EV.fromInjuryReport(parse(TEXT), { sourceId: 'S', observedAt: '2026-10-31T21:40:00Z', previous });
    assert.deepEqual([r.ok, r.refused, r.candidates], [false, 'INVALID_PREVIOUS', []]);
  }
});
