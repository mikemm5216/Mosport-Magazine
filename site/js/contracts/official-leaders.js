/* Internal-only official leader observations. Hashes are integrity checks, not signatures. */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('./contracts.js') : root.MOSPORT_CONTRACTS;
  var W = node ? require('./world-a1.js') : root.MOSPORT_WORLD_A1;
  function plain(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function exact(o, keys) { return plain(o) && Object.keys(o).sort().join('|') === keys.slice().sort().join('|'); }
  function same(a, b) { return C.canonical(a) === C.canonical(b); }
  function metric(v) {
    if (!plain(v)) return false;
    if (v.status === 'MISSING') return exact(v, ['status', 'reason']) && v.reason === 'ABSENT_OR_INVALID';
    return exact(v, ['status', 'displayValue']) && v.status === 'OBSERVED' && typeof v.displayValue === 'string' && /^\d{1,3}(?:\.\d{1,3})?$/.test(v.displayValue);
  }
  function leader(v) {
    if (!plain(v)) return false;
    if (v.status === 'MISSING') return exact(v, ['status', 'reason']) && v.reason === 'LEADER_UNAVAILABLE';
    return exact(v, ['status','nbaPersonId','name','points','rebounds','assists','identityMapping']) && v.status === 'OBSERVED' && typeof v.nbaPersonId === 'string' && /^\d+$/.test(v.nbaPersonId) && typeof v.name === 'string' && v.name.length > 0 && v.name.length <= 120 && v.identityMapping === 'NBA_ID_ONLY_UNMAPPED' && metric(v.points) && metric(v.rebounds) && metric(v.assists);
  }
  function inspect(f, world, now) {
    try {
      if (!W.validate(world).ok) return {ok:false,reason:'WORLD_REFUSED'};
      var state = W.readState(world, now); if (!state.ok) return {ok:false,reason:state.code};
      if (state.state !== 'ACTIVE') return {ok:false,reason:'READ_' + state.state};
      var keys=['schema','distribution','rights','worldState','worldRevision','lockAt','asOf','validUntil','game','nbaGameId','source','home','away','fingerprint'];
      if (!exact(f,keys) || f.schema !== 'mosport/internal-official-leaders@1' || f.distribution !== 'INTERNAL_UNQUALIFIED' || f.rights !== 'UNVERIFIED' || f.worldState !== 'NOT_ISSUED') return {ok:false,reason:'LEADER_SCHEMA_REFUSED'};
      var body={};Object.keys(f).forEach(function(k){if(k!=='fingerprint')body[k]=f[k];});
      if (typeof f.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(f.fingerprint) || C.sha256(C.canonical(body)) !== f.fingerprint) return {ok:false,reason:'LEADER_FINGERPRINT_MISMATCH'};
      if (f.worldRevision !== world.revision || f.asOf !== world.asOf || f.lockAt !== world.lockAt || f.validUntil !== world.validUntil || !same(f.game, world.game)) return {ok:false,reason:'LEADER_WORLD_BINDING_MISMATCH'};
      if (typeof f.nbaGameId !== 'string' || !/^00[245]\d{7}$/.test(f.nbaGameId) || !exact(f.source,['sourceRef','observedAt','sha256']) || typeof f.source.sourceRef !== 'string' || typeof f.source.observedAt !== 'string' || typeof f.source.sha256 !== 'string' || !/^https:\/\/www\.nba\.com\/games\?date=\d{4}-\d{2}-\d{2}$/.test(f.source.sourceRef) || !/^[a-f0-9]{64}$/.test(f.source.sha256)) return {ok:false,reason:'LEADER_SOURCE_REFUSED'};
      var observed=C.parseInstant(f.source.observedAt), lock=C.parseInstant(f.lockAt);
      if (!Number.isFinite(observed) || !Number.isFinite(lock) || observed >= lock || new Date(observed).toISOString() !== f.source.observedAt) return {ok:false,reason:'LEADER_CHRONOLOGY_REFUSED'};
      if (!leader(f.home) || !leader(f.away) || (f.home.status === 'OBSERVED' && f.away.status === 'OBSERVED' && f.home.nbaPersonId === f.away.nbaPersonId)) return {ok:false,reason:'LEADER_VALUE_REFUSED'};
      return {ok:true,home:f.home,away:f.away,source:f.source,nbaGameId:f.nbaGameId};
    } catch (_error) { return {ok:false,reason:'LEADER_REFUSED'}; }
  }
  var api={inspect:inspect};if(node)module.exports=api;else root.MOSPORT_OFFICIAL_LEADERS=api;
})(typeof window !== 'undefined' ? window : globalThis);
