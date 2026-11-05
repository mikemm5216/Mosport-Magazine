/* Internal-only reader for NBA #76. No network, issuance or probability mapping. */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('./contracts.js') : root.MOSPORT_CONTRACTS;
  var W = node ? require('./world-a1.js') : root.MOSPORT_WORLD_A1;
  var F = node ? require('./pregame-facts.js') : root.MOSPORT_PREGAME_FACTS;
  var L = node ? require('./official-leaders.js') : root.MOSPORT_OFFICIAL_LEADERS;
  var SCHEMA = 'mosport-a/locked-world-inspection@1';
  // Order is part of A's lock digest, unlike the canonical outer digest.
  var LOCK_KEYS = ['schema','gameId','stage','lockAt','recordedAt','timing','scheduledTipoffAt','scheduleFingerprint','snapshotCapturedAt','snapshotFingerprint','initialFingerprint','probability','eligibility'];
  function exact(v, keys) { return v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).sort().join('|') === keys.slice().sort().join('|'); }
  function hash(v) { return typeof v === 'string' && /^[a-f0-9]{64}$/.test(v); }
  function instant(v) { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)) return NaN; var n = Date.parse(v); return Number.isFinite(n) && new Date(n).toISOString() === v ? n : NaN; }
  function fail(code) { return {status:'REFUSED',code:code}; }
  function validate(raw) {
    if (!exact(raw,['schema','lock','worldPackage','eligibility','fingerprint']) || raw.schema !== SCHEMA || raw.eligibility !== 'INTERNAL_UNQUALIFIED' || !hash(raw.fingerprint)) return fail('LOCKED_SCHEMA_REFUSED');
    var k = raw.lock;
    if (!exact(k,LOCK_KEYS.concat('fingerprint')) || k.schema !== 'nba-pregame-lock@1' || typeof k.gameId !== 'string' || !k.gameId.length || !['INITIAL','FINAL'].includes(k.stage) || !['ON_TIME','LATE_RECORDED'].includes(k.timing) || k.probability !== null || k.eligibility !== 'INTERNAL_UNQUALIFIED' || ![k.fingerprint,k.scheduleFingerprint,k.snapshotFingerprint].every(hash) || (k.initialFingerprint !== null && !hash(k.initialFingerprint))) return fail('LOCK_SCHEMA_REFUSED');
    var body = {}; LOCK_KEYS.forEach(function (key) { body[key]=k[key]; });
    if (C.sha256(JSON.stringify(body)) !== k.fingerprint) return fail('LOCK_FINGERPRINT_MISMATCH');
    var lock=instant(k.lockAt), recorded=instant(k.recordedAt), tip=instant(k.scheduledTipoffAt), captured=instant(k.snapshotCapturedAt);
    if (![lock,recorded,tip,captured].every(Number.isFinite) || captured >= lock || recorded < lock || recorded >= tip || k.timing !== (recorded === lock ? 'ON_TIME' : 'LATE_RECORDED') || (k.stage === 'INITIAL' && (k.initialFingerprint !== null || recorded !== lock || lock >= tip-900000)) || (k.stage === 'FINAL' && (k.initialFingerprint === null || lock !== tip-900000))) return fail('LOCK_CHRONOLOGY_REFUSED');
    var v=W.validate(raw.worldPackage); if (!v.ok) return fail('WORLD_'+v.code);
    var p=raw.worldPackage;
    if (C.sha256(C.canonical({schema:raw.schema,lock:k,worldPackage:p,eligibility:raw.eligibility})) !== raw.fingerprint) return fail('INSPECTION_FINGERPRINT_MISMATCH');
    if (p.game.espnGameId !== k.gameId || p.lockAt !== k.lockAt || p.game.tipoffAt !== k.scheduledTipoffAt || !p.evidence.snapshot || p.evidence.snapshot.sha256 !== k.snapshotFingerprint || p.evidence.snapshot.capturedAt !== k.snapshotCapturedAt) return fail('LOCK_WORLD_BINDING_MISMATCH');
    if (instant(p.asOf) < recorded) return fail('LOCK_NOT_RECORDED_AT_EXPORT');
    if (p.qualification.schedule !== 'OBSERVED_PROVISIONAL' || instant(p.evidence.receipt.observedAt) >= captured) return fail('LOCK_PRELOCK_EVIDENCE_REQUIRED');
    return {status:'OK'};
  }
  // Pins must come from a separately trusted manifest, never derived from raw.
  function inspect(raw, expected, now, optional) {
    try {
      var v=validate(raw); if (v.status !== 'OK') return v;
      if (!exact(expected,['gameId','stage','lockFingerprint','inspectionFingerprint']) || typeof expected.gameId !== 'string' || !['INITIAL','FINAL'].includes(expected.stage) || !hash(expected.lockFingerprint) || !hash(expected.inspectionFingerprint) || expected.gameId !== raw.lock.gameId || expected.stage !== raw.lock.stage || expected.lockFingerprint !== raw.lock.fingerprint || expected.inspectionFingerprint !== raw.fingerprint) return fail('UNEXPECTED_LOCKED_WORLD_VERSION');
      var view=W.internalView(raw.worldPackage,now); if (view.status !== 'OK') return fail(view.code);
      var out={status:'OK',eligibility:'INTERNAL_UNQUALIFIED',publiclyEligible:false,stage:raw.lock.stage,timing:raw.lock.timing,lockFingerprint:raw.lock.fingerprint,inspectionFingerprint:raw.fingerprint,world:view};
      if (optional && Object.prototype.hasOwnProperty.call(optional,'facts')) out.facts=F.inspect(optional.facts,raw.worldPackage,now);
      if (optional && Object.prototype.hasOwnProperty.call(optional,'leaders')) out.leaders=L.inspect(optional.leaders,raw.worldPackage,now);
      return out;
    } catch (_error) { return fail('LOCKED_INSPECTION_REFUSED'); }
  }
  var api={SCHEMA:SCHEMA,validate:validate,inspect:inspect};
  if (node) module.exports=api; else root.MOSPORT_LOCKED_WORLD=api;
})(typeof window !== 'undefined' ? window : globalThis);
