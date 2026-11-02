/* Internal-only bridge for source facts from NBA #69. Fingerprints detect edits;
   they do not authenticate issuers, verify source bytes or grant rights. */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('./contracts.js') : root.MOSPORT_CONTRACTS;
  var W = node ? require('./world-a1.js') : root.MOSPORT_WORLD_A1;
  var metrics = ['avgPoints', 'avgRebounds', 'avgAssists', 'fieldGoalPct', 'threePointPct'];
  function plain(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function exact(o, keys) { return plain(o) && Object.keys(o).sort().join('|') === keys.slice().sort().join('|'); }
  function same(a, b) { return C.canonical(a) === C.canonical(b); }
  function fact(v, record, pct) {
    if (!plain(v)) return false;
    if (v.status === 'MISSING') return exact(v, ['status', 'reason']) && v.reason === 'ABSENT_OR_AMBIGUOUS';
    if (!exact(v, ['status', 'displayValue']) || v.status !== 'OBSERVED' || typeof v.displayValue !== 'string') return false;
    if (record) return /^\d{1,3}-\d{1,3}$/.test(v.displayValue);
    return /^\d{1,4}(?:\.\d{1,3})?$/.test(v.displayValue) && (!pct || Number(v.displayValue) <= 100);
  }
  function side(v, identity) {
    return exact(v, ['team', 'overallRecord', 'statistics']) && same(v.team, identity) && fact(v.overallRecord, true, false) &&
      exact(v.statistics, metrics) && metrics.every(function (m) { return fact(v.statistics[m], false, m === 'fieldGoalPct' || m === 'threePointPct'); });
  }
  function inspect(f, world, now) {
    try {
      var valid = W.validate(world); if (!valid.ok) return { ok: false, reason: 'WORLD_REFUSED' };
      var state = W.readState(world, now); if (!state.ok) return { ok: false, reason: state.code };
      if (state.state !== 'ACTIVE') return { ok: false, reason: 'READ_' + state.state };
      var keys = ['schema', 'distribution', 'rights', 'worldState', 'worldRevision', 'asOf', 'lockAt', 'validUntil', 'lifecycle', 'game', 'source', 'sides', 'fingerprint'];
      if (!exact(f, keys) || f.schema !== 'mosport/internal-pregame-facts@1' || f.distribution !== 'INTERNAL_UNQUALIFIED' || f.rights !== 'UNVERIFIED' || f.worldState !== 'NOT_ISSUED') return { ok: false, reason: 'FACT_SCHEMA_REFUSED' };
      var body = {}; Object.keys(f).forEach(function (k) { if (k !== 'fingerprint') body[k] = f[k]; });
      if (typeof f.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(f.fingerprint) || C.sha256(C.canonical(body)) !== f.fingerprint) return { ok: false, reason: 'FACT_FINGERPRINT_MISMATCH' };
      if (f.worldRevision !== world.revision || f.asOf !== world.asOf || f.lockAt !== world.lockAt || f.validUntil !== world.validUntil || f.lifecycle !== world.lifecycle.state || !same(f.game, world.game) || !same(f.source, world.evidence.receipt)) return { ok: false, reason: 'FACT_WORLD_BINDING_MISMATCH' };
      if (!exact(f.sides, ['home', 'away']) || !side(f.sides.home, world.game.home) || !side(f.sides.away, world.game.away)) return { ok: false, reason: 'FACT_VALUE_REFUSED' };
      return { ok: true, sides: f.sides, fingerprint: f.fingerprint };
    } catch (_error) { return { ok: false, reason: 'FACT_REFUSED' }; }
  }
  var api = { inspect: inspect };
  if (node) module.exports = api; else root.MOSPORT_PREGAME_FACTS = api;
})(typeof window !== 'undefined' ? window : globalThis);
