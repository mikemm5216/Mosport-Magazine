'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../site/js/contracts/contracts.js');
const F = require('../../site/js/contracts/pregame-facts.js');
const world = require('../fixtures/a-world/synthetic-package.a.json');
const clone = (x) => JSON.parse(JSON.stringify(x));
function make() {
  const missing = () => ({ status: 'MISSING', reason: 'ABSENT_OR_AMBIGUOUS' });
  const side = (team) => ({ team, overallRecord: { status: 'OBSERVED', displayValue: '4-2' }, statistics: { avgPoints: { status: 'OBSERVED', displayValue: '121.0' }, avgRebounds: missing(), avgAssists: missing(), fieldGoalPct: missing(), threePointPct: missing() } });
  const f = { schema: 'mosport/internal-pregame-facts@1', distribution: 'INTERNAL_UNQUALIFIED', rights: 'UNVERIFIED', worldState: 'NOT_ISSUED', worldRevision: world.revision, asOf: world.asOf, lockAt: world.lockAt, validUntil: world.validUntil, lifecycle: world.lifecycle.state, game: world.game, source: world.evidence.receipt, sides: { home: side(world.game.home), away: side(world.game.away) } };
  return sign(clone(f));
}
function sign(f) { const body = clone(f); delete body.fingerprint; f.fingerprint = C.sha256(C.canonical(body)); return f; }
test('accepts bound facts only for the matching active World package', () => { const f = make(); const v = F.inspect(f, world, world.asOf); assert.equal(v.ok, true); assert.equal(v.sides.home.statistics.avgPoints.displayValue, '121.0'); });
test('facts stop displaying at expiry or when the World package is withdrawn', () => { const f = make(); assert.equal(F.inspect(f, world, world.validUntil).reason, 'READ_STALE'); const w = clone(world); w.lifecycle.state = 'WITHDRAWN'; w.fingerprint = require('../../site/js/contracts/world-a1.js').fingerprintOf(w); w.revision = 'sha256:' + w.fingerprint; assert.equal(F.inspect(f, w, w.asOf).reason, 'READ_WITHDRAWN'); });
test('refuses an altered fingerprint and re-signed mismatched World revision or source', () => { let f = make(); f.sides.home.statistics.avgPoints.displayValue = '999'; assert.equal(F.inspect(f, world, world.asOf).reason, 'FACT_FINGERPRINT_MISMATCH'); f = make(); f.worldRevision = 'sha256:' + 'a'.repeat(64); assert.equal(F.inspect(sign(f), world, world.asOf).reason, 'FACT_WORLD_BINDING_MISMATCH'); f = make(); f.source.sha256 = 'b'.repeat(64); assert.equal(F.inspect(sign(f), world, world.asOf).reason, 'FACT_WORLD_BINDING_MISMATCH'); });
test('rejects invalid values, unknown fields and probability injection even if re-signed', () => { for (const mutate of [f => f.sides.home.statistics.fieldGoalPct = {status:'OBSERVED',displayValue:'101'}, f => f.sides.home.statistics.avgPoints = {status:'OBSERVED',displayValue:'<script>'}, f => f.probability = 0.75]) { const f = make(); mutate(f); assert.equal(F.inspect(sign(f), world, world.asOf).ok, false); } });
test('rejects the wrong team, world or timestamp and preserves missing as missing', () => { let f = make(); f.sides.away.team = f.sides.home.team; assert.equal(F.inspect(sign(f), world, world.asOf).reason, 'FACT_VALUE_REFUSED'); f = make(); const w = clone(world); w.game.espnGameId = '1'; assert.equal(F.inspect(f, w, world.asOf).reason, 'WORLD_REFUSED'); f = make(); assert.equal(F.inspect(f, world, 'yesterday').ok, false); });
