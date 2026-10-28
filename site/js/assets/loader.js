/*
 * Loads the Asset Registry and the runtime config.
 *
 * Order: (1) the local copy bundled as data/asset-registry.js (works from disk);
 * (2) when served over http(s), a newer registry from
 *     MOSPORT_CONFIG.assetRegistryUrl (a CMS / agent endpoint) or
 *     data/asset-registry.json, if it validates and its registryVersion differs.
 * A remote registry that fails validation is ignored; the page keeps the local one.
 *
 * Test hooks (prototype only; each only removes or breaks assets, never adds):
 *   ?mode=production  stricter render policy
 *   ?art=fallback     every art slot shows its fallback (layout-parity check)
 *   ?logoFail=1       brand mark and two team logos point at missing files
 */
(function () {
  var q = location.search;
  var cfg = window.MOSPORT_CONFIG = window.MOSPORT_CONFIG || { mode: 'prototype', assetRegistryUrl: null };
  if (/[?&]mode=production\b/.test(q)) cfg.mode = 'production';
  cfg.forceArtFallback = /[?&]art=fallback\b/.test(q);
  /* ?art=candidate: Founder preview of CANDIDATE art (prototype only; production ignores it). */
  cfg.previewCandidates = /[?&]art=candidate\b/.test(q);
  /* ?art=candidate:<versionId> previews one named candidate, e.g. candidate:claude-crop-v1 */
  var pv = q.match(/[?&]art=candidate(?::|%3A)([\w.-]+)/i);
  cfg.previewVersion = pv ? pv[1] : null;

  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var reg = clone(window.MOSPORT_ASSET_REGISTRY || { schemaVersion: 1, slots: {}, logos: {}, teamLogos: {}, renderPolicy: { prototype: { allowRights: [], allowStatus: [] }, production: { allowRights: [], allowStatus: [] } } });

  if (/[?&]logoFail=1\b/.test(q)) {
    var broken = function (file) {
      return { id: 'test-missing', status: 'ACTIVE', file: file, format: 'png', width: 512, height: 512, sha256: '0'.repeat(64),
        content: { kinds: ['team-logo'], containsText: true, containsLogo: true, containsPerson: false },
        rights: { status: 'OWNED' }, provenance: {}, crops: {} };
    };
    reg.teamLogos.entries = reg.teamLogos.entries || {};
    ['GSW', 'LAL'].forEach(function (c) { reg.teamLogos.entries[c] = { activeVersion: 'test-missing', versions: [broken('assets/teams/nba/__missing__.png')] }; });
    reg.logos['brand-mark'].versions[0].file = 'assets/brand/__missing__.svg';
  }

  window.MOSPORT_REG = reg;

  /* Optional newer registry from a server or CMS. */
  if (/^https?:$/.test(location.protocol)) {
    var url = cfg.assetRegistryUrl || 'data/asset-registry.json';
    fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (remote) {
      if (!remote || remote.registryVersion === reg.registryVersion) return;
      var errs = window.MOSPORT_REGISTRY.validate(remote);
      if (errs.length) { console.warn('[MOSPORT] remote asset registry ignored:', errs.slice(0, 3)); return; }
      window.MOSPORT_REG = remote;
      if (window.MOSPORT_REFRESH_SLOTS) window.MOSPORT_REFRESH_SLOTS();
    }).catch(function () { /* offline: keep the local registry */ });
  }
})();
