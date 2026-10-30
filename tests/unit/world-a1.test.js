'use strict';
/* B-P2-01a: read-only consumer of MOSPORT-A world-analysis-package@1, checked against
   A's authentic CLE at ATL sample and A's synthetic example (byte-exact copies). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const W = require('../../site/js/contracts/world-a1.js');
const { C, clone } = require('./helpers.js');

const DIR = path.join(__dirname, '../fixtures/a-world');
const PROV = JSON.parse(fs.readFileSync(path.join(DIR, 'PROVENANCE.json'), 'utf8'));
const load = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const REAL = load('real-401909893-20261029.json');
const SYN = load('synthetic-package.a.json');

/* Re-sign after an edit, so a test reaches the rule it targets instead of the digest check. */
function resign(p) { p.fingerprint = W.fingerprintOf(p); p.revision = 'sha256:' + p.fingerprint; return p; }
const code = (p) => W.validate(p).code;
const iso = (ms) => new Date(ms).toISOString();
const at = (s) => Date.parse(s);

test('fixtures are the exact bytes A published (provenance hashes)', () => {
  for (const f of PROV.files) {
    const bytes = fs.readFileSync(path.join(DIR, f.path));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), f.sha256, f.path);
  }
  assert.equal(PROV.files.find((f) => f.path.startsWith('real-')).authentic, true);
  assert.equal(PROV.files.find((f) => f.path.startsWith('synthetic')).authentic, false);
});

test('authentic CLE at ATL package validates and B recomputes the same fingerprint as A', () => {
  const v = W.validate(clone(REAL));
  assert.equal(v.ok, true, JSON.stringify(v));
  assert.equal(W.fingerprintOf(REAL), '5aa4f3ef1295c0cc90cece9686b656272e0790aa8b3b13cc45ca30460b05c25e');
  assert.equal(REAL.revision, 'sha256:' + REAL.fingerprint);
  assert.equal(REAL.game.canonicalId, 'espn:401909893');
  assert.equal(REAL.game.away.displayCode, 'CLE');
  assert.equal(REAL.game.home.displayCode, 'ATL');
});

test("A's synthetic example passes the same B checks (cross-implementation conformance)", () => {
  assert.equal(W.validate(clone(SYN)).ok, true);
});

test('read state is evaluated per read: ACTIVE until validUntil, then STALE; never before asOf', () => {
  assert.deepEqual(W.readState(REAL, REAL.asOf), { ok: true, state: 'ACTIVE' });
  assert.deepEqual(W.readState(REAL, iso(at(REAL.validUntil) - 1)), { ok: true, state: 'ACTIVE' });
  assert.deepEqual(W.readState(REAL, REAL.validUntil), { ok: true, state: 'STALE' });
  assert.deepEqual(W.readState(REAL, '2026-10-30T02:48:00Z'), { ok: true, state: 'STALE' });
  assert.equal(W.readState(REAL, iso(at(REAL.asOf) - 1)).code, 'PACKAGE_FROM_FUTURE');
  assert.equal(W.readState(REAL, 'yesterday').code, 'NO_CLOCK');
});

test('public reader gets nothing from a v1 package, fresh or stale, with typed blockers', () => {
  for (const now of [REAL.asOf, '2026-10-30T02:48:00Z']) {
    const pub = W.publicProjection(clone(REAL), now);
    assert.equal(pub.game, null);
    for (const b of ['WORLD_NOT_ISSUED', 'WORLD_INTERNAL', 'SCHEDULE_NOT_PUBLIC_ELIGIBLE', 'RIGHTS_UNVERIFIED']) assert.ok(pub.blockers.includes(b), b);
  }
  assert.ok(!W.publicProjection(REAL, REAL.asOf).blockers.includes('READ_STALE'));
  assert.ok(W.publicProjection(REAL, '2026-10-30T02:48:00Z').blockers.includes('READ_STALE'));
  const bad = clone(REAL); bad.game.tipoffAt = '2026-10-30T01:00:00.000Z';
  assert.deepEqual(W.publicProjection(bad, REAL.asOf), { game: null, blockers: ['PACKAGE_REFUSED:PACKAGE_FINGERPRINT_MISMATCH'] });
});

test('internal view keeps typed missing reasons and carries no number, interval or verdict', () => {
  const v = W.internalView(clone(REAL), '2026-10-30T02:48:00Z');
  assert.equal(v.status, 'OK');
  assert.equal(v.readState, 'STALE');
  assert.equal(v.world.state, 'NOT_ISSUED');
  assert.equal(v.world.missingReason, 'FEATURE_PIPELINE_NOT_CONNECTED');
  assert.deepEqual(v.world.engine, { status: 'BLOCKED_MISSING', reason: 'SOURCE_NOT_PUBLISHED' });
  assert.deepEqual(v.game.nbaGameId, { status: 'BLOCKED_MISSING', reason: 'IDENTITY_UNRESOLVED' });
  assert.deepEqual(v.follow.score, { status: 'BLOCKED_MISSING', reason: 'POSTGAME_ONLY' });
  assert.equal(v.evidence.snapshot.sha256, REAL.evidence.snapshot.sha256);
  assert.equal(v.evidence.receiptSha256, '7472b9ed579506ed4826dc746505e1da4f0e94bde05101b514f6c3c1f95e4add');
  assert.equal(v.publicRenderable, false);
  assert.deepEqual(v.consumerLimits, W.CONSUMER_LIMITS);
  const json = JSON.stringify(v);
  for (const leak of ['homeWinProbability', 'interval60', 'verdict', 'percent']) assert.ok(!json.includes(leak), leak);
  assert.equal(W.internalView(REAL, iso(at(REAL.asOf) - 1)).status, 'REFUSED');
});

test('a fabricated judgment is refused even when re-signed with a matching fingerprint', () => {
  const cases = [
    ['homeWinProbability', 0.61], ['homeWinProbability', 0], ['interval60', [0.5, 0.7]], ['verdict', 'ATL'],
    ['state', 'ISSUED'], ['distributionEligibility', 'PUBLIC'], ['publiclyEligible', true],
    ['missingReason', null]
  ];
  for (const [k, val] of cases) {
    const p = clone(REAL); p.world[k] = val; resign(p);
    assert.equal(code(p), 'WRONG_VALUE', k);
  }
  const rights = resign(Object.assign(clone(REAL), { qualification: Object.assign(clone(REAL.qualification), { rights: 'VERIFIED' }) }));
  assert.equal(code(rights), 'WRONG_VALUE');
  const pub = clone(REAL); pub.qualification.schedulePublicEligible = true; resign(pub);
  assert.equal(code(pub), 'WRONG_VALUE');
  const score = clone(REAL); score.follow.score = { status: 'OBSERVED', value: '110-104', reason: null }; resign(score);
  assert.equal(code(score), 'WRONG_VALUE');
});

test('an edit without re-signing fails the fingerprint; schema, owner and producer are exact', () => {
  const p = clone(REAL); p.game.home.displayCode = 'BOS';
  assert.equal(code(p), 'PACKAGE_FINGERPRINT_MISMATCH');
  const r = clone(REAL); r.revision = 'sha256:' + '0'.repeat(64);
  assert.equal(code(r), 'PACKAGE_FINGERPRINT_MISMATCH');
  assert.equal(code(Object.assign(clone(REAL), { schema: 'mosport-a/world-analysis-package@2' })), 'SCHEMA_UNSUPPORTED');
  assert.equal(code(resign(Object.assign(clone(REAL), { owner: 'MOSPORT-B' }))), 'WRONG_VALUE');
  assert.equal(code(resign(Object.assign(clone(REAL), { producerVersion: 'world-package/1.0.1' }))), 'WRONG_VALUE');
  assert.equal(code(null), 'NOT_OBJECT');
  assert.equal(code([]), 'NOT_OBJECT');
});

test('unknown and missing fields are refused at every level', () => {
  const top = resign(Object.assign(clone(REAL), { note: 'x' }));
  assert.deepEqual([W.validate(top).code, W.validate(top).path], ['UNKNOWN_FIELD', 'package.note']);
  const nested = clone(REAL); nested.world.percent = 61; resign(nested);
  assert.deepEqual([W.validate(nested).code, W.validate(nested).path], ['UNKNOWN_FIELD', 'package.world.percent']);
  const gone = clone(REAL); delete gone.evidence.snapshotMissingReason; resign(gone);
  assert.equal(code(gone), 'MISSING_FIELD');
});

test('wire instants must be canonical UTC with milliseconds and a real calendar date', () => {
  for (const bad of ['2026-10-30T00:00:00Z', '2026-10-30T08:00:00.000+08:00', '2026-02-30T00:00:00.000Z', '2026-10-30T24:00:00.000Z']) {
    const p = clone(REAL); p.game.tipoffAt = bad; resign(p);
    assert.equal(code(p), 'NON_CANONICAL_INSTANT', bad);
  }
});

test('chronology, identity, provenance and venue date are cross-checked', () => {
  const late = clone(REAL); late.lockAt = REAL.game.tipoffAt; resign(late);
  assert.equal(code(late), 'INVALID_PACKAGE_CHRONOLOGY');
  const obs = clone(REAL); obs.evidence.observation.observedAt = REAL.lockAt; resign(obs);
  assert.equal(code(obs), 'OBSERVATION_RECEIPT_MISMATCH');
  const ref = clone(REAL); ref.evidence.receipt.requestedDate = '20261030'; resign(ref);
  assert.equal(code(ref), 'INVALID_PROVIDER_PROVENANCE');
  const same = clone(REAL); same.game.away = clone(REAL.game.home); resign(same);
  assert.equal(code(same), 'IDENTITY_UNRESOLVED');
  const id = clone(REAL); id.packageId = 'mosport-a:espn:401909894'; resign(id);
  assert.equal(code(id), 'GAME_ID_MISMATCH');
  const day = clone(REAL); day.game.venue.localDate = '2026-10-30'; resign(day);
  assert.equal(code(day), 'INVALID_VENUE_TIMEZONE');
  const zone = clone(REAL); zone.game.venue.timeZone = 'Mars/Olympus'; resign(zone);
  assert.equal(code(zone), 'INVALID_VENUE_TIMEZONE');
  const fresh = clone(REAL); fresh.validUntil = REAL.game.tipoffAt; resign(fresh);
  assert.equal(code(fresh), 'INVALID_VALID_UNTIL');
  const snap = clone(REAL); snap.evidence.snapshot.capturedAt = REAL.evidence.receipt.observedAt; resign(snap);
  assert.equal(code(snap), 'INVALID_SNAPSHOT_CHRONOLOGY');
});

test('each chronology, identity, lifecycle and qualification clause is enforced on its own', () => {
  const edit = (f) => { const p = clone(REAL); f(p); return code(resign(p)); };
  /* lock after as-of, tipoff still later */
  assert.equal(edit((p) => { p.lockAt = '2026-10-29T08:47:38.090Z'; p.evidence.snapshot.capturedAt = '2026-10-29T08:47:38.085Z'; }), 'INVALID_PACKAGE_CHRONOLOGY');
  /* receipt observed after as-of, everything else consistent */
  assert.equal(edit((p) => { p.asOf = '2026-10-29T08:47:37.900Z'; p.lockAt = '2026-10-29T08:47:37.850Z'; p.evidence.snapshot.capturedAt = '2026-10-29T08:47:37.820Z'; p.evidence.receipt.observedAt = p.evidence.observation.observedAt = p.lifecycle.receipt.observedAt = '2026-10-29T08:47:37.950Z'; p.validUntil = '2026-10-29T09:02:37.950Z'; }), 'INVALID_PACKAGE_CHRONOLOGY');
  /* tipoff before lock, as-of after both */
  assert.equal(edit((p) => { p.game.tipoffAt = '2026-10-29T08:47:38.000Z'; p.game.venue.localDate = '2026-10-29'; p.validUntil = p.game.tipoffAt; }), 'INVALID_PACKAGE_CHRONOLOGY');
  assert.equal(edit((p) => { p.game.away.espnTeamId = p.game.home.espnTeamId; }), 'IDENTITY_UNRESOLVED');
  assert.equal(edit((p) => { p.game.canonicalId = 'espn:1'; p.packageId = 'mosport-a:espn:1'; }), 'GAME_ID_MISMATCH');
  assert.equal(edit((p) => { p.lifecycle.receipt.observedAt = '2026-10-29T08:47:38.090Z'; }), 'INVALID_LIFECYCLE_PROVENANCE');
  assert.equal(edit((p) => { p.lifecycle.receipt.sourceRef = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261030'; }), 'INVALID_LIFECYCLE_PROVENANCE');
  assert.equal(edit((p) => { p.lifecycle.state = 'SUPERSEDED'; p.lifecycle.supersededByReceipt = p.evidence.receipt.sha256; }), 'INVALID_SUPERSESSION');
  assert.equal(edit((p) => { p.evidence.snapshot.capturedAt = '2026-10-29T08:47:38.082Z'; }), 'INVALID_SNAPSHOT_CHRONOLOGY');
  assert.equal(edit((p) => { p.qualification.reason = 'POSTGAME_ONLY'; }), 'PRELOCK_EVIDENCE_REQUIRED');
  assert.equal(edit((p) => { p.qualification.schedule = 'BLOCKED_MISSING'; }), 'MISSING_REASON_REQUIRED');
  assert.equal(edit((p) => { p.qualification.schedule = 'BLOCKED_MISSING'; p.qualification.reason = 'TIMESTAMP_UNVERIFIED'; }), undefined);
  /* validUntil uses the tipoff arm when tipoff is within 15 minutes of the receipt */
  const near = clone(REAL); near.game.tipoffAt = '2026-10-29T08:50:00.000Z'; near.validUntil = near.game.tipoffAt; resign(near);
  assert.equal(W.validate(near).ok, true);
  near.validUntil = '2026-10-29T09:02:37.799Z'; resign(near);
  assert.equal(code(near), 'INVALID_VALID_UNTIL');
  /* a non-plain object is not a package */
  assert.equal(code(Object.assign(Object.create({ x: 1 }), clone(REAL))), 'NOT_OBJECT');
});

test('a missing snapshot needs its typed reason; a reason without a missing snapshot is refused', () => {
  const ok = clone(REAL); ok.evidence.snapshot = null; ok.evidence.snapshotMissingReason = 'SOURCE_NOT_PUBLISHED'; resign(ok);
  assert.equal(W.validate(ok).ok, true);
  assert.equal(W.internalView(ok, REAL.asOf).evidence.snapshot, null);
  const silent = clone(REAL); silent.evidence.snapshot = null; resign(silent);
  assert.equal(code(silent), 'SNAPSHOT_MISSING_REASON_REQUIRED');
  const both = clone(REAL); both.evidence.snapshotMissingReason = 'SOURCE_NOT_PUBLISHED'; resign(both);
  assert.equal(code(both), 'SNAPSHOT_MISSING_REASON_REQUIRED');
});

/* A later decisive response, recorded by A in the lifecycle receipt. */
function stopped(state) {
  const p = clone(REAL);
  p.lifecycle.state = state;
  p.lifecycle.receipt = { sourceRef: REAL.evidence.receipt.sourceRef, observedAt: REAL.asOf, sha256: 'a'.repeat(64) };
  p.lifecycle.supersededByReceipt = state === 'SUPERSEDED' ? 'a'.repeat(64) : null;
  return resign(p);
}

test('withdrawal and supersession stop the read and take precedence over freshness', () => {
  for (const s of ['WITHDRAWN', 'SUPERSEDED']) {
    const p = stopped(s);
    assert.equal(W.validate(p).ok, true, s);
    assert.deepEqual(W.readState(p, p.asOf), { ok: true, state: s });
    assert.deepEqual(W.readState(p, '2026-10-30T02:48:00Z'), { ok: true, state: s });
    assert.ok(W.publicProjection(p, p.asOf).blockers.includes('READ_' + s));
  }
  const unrecorded = clone(REAL); unrecorded.lifecycle.receipt.sha256 = 'a'.repeat(64); resign(unrecorded);
  assert.equal(code(unrecorded), 'UNRECORDED_SUPERSESSION');
  const noPointer = stopped('SUPERSEDED'); noPointer.lifecycle.supersededByReceipt = null; resign(noPointer);
  assert.equal(code(noPointer), 'INVALID_SUPERSESSION');
  const wrongPointer = stopped('SUPERSEDED'); wrongPointer.lifecycle.supersededByReceipt = 'b'.repeat(64); resign(wrongPointer);
  assert.equal(code(wrongPointer), 'INVALID_SUPERSESSION');
  const pointerOnWithdrawn = stopped('WITHDRAWN'); pointerOnWithdrawn.lifecycle.supersededByReceipt = 'a'.repeat(64); resign(pointerOnWithdrawn);
  assert.equal(code(pointerOnWithdrawn), 'INVALID_SUPERSESSION');
  const backdated = stopped('WITHDRAWN'); backdated.lifecycle.receipt.observedAt = '2026-10-29T08:47:37.000Z'; resign(backdated);
  assert.equal(code(backdated), 'INVALID_LIFECYCLE_PROVENANCE');
});

test('select needs the complete revision set and never falls back past a bad revision', () => {
  const later = stopped('WITHDRAWN'); later.asOf = '2026-10-29T08:50:00.000Z'; resign(later);
  const now = '2026-10-29T08:55:00Z';
  assert.equal(W.select([clone(REAL)], now).pkg.fingerprint, REAL.fingerprint);
  assert.equal(W.select([later, clone(REAL)], now).pkg.fingerprint, later.fingerprint);
  assert.equal(W.select([clone(REAL), later], '2026-10-29T08:48:00Z').code, 'PACKAGE_FROM_FUTURE');
  assert.equal(W.select([clone(REAL), clone(SYN)], '2027-12-01T00:00:00Z').code, 'MIXED_GAME_REVISIONS');
  const twin = stopped('WITHDRAWN');
  assert.equal(W.select([clone(REAL), twin], now).code, 'CONFLICTING_PACKAGE_REVISIONS');
  const broken = clone(later); broken.world.homeWinProbability = 0.6;
  assert.equal(W.select([clone(REAL), broken], now).code, 'WRONG_VALUE');
  const unsigned = clone(later); unsigned.game.tipoffAt = '2026-10-30T00:30:00.000Z';
  assert.equal(W.select([clone(REAL), unsigned], now).code, 'PACKAGE_FINGERPRINT_MISMATCH');
  assert.equal(W.select([], now).code, 'NO_PACKAGE_REVISION');
  assert.equal(W.select([clone(REAL)], 'soon').code, 'NO_CLOCK');
});

test('B still cannot build a LIVE magazine issue from an A package (worldSource unchanged)', () => {
  assert.deepEqual(C.ENUM.worldSource, ['PROTOTYPE_FIXTURE']);
});
