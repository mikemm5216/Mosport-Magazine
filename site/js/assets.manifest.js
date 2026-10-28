/*
 * MOSPORT ASSET MANIFEST — the only place image paths live.
 * Layout files never reference an image directly; they use <mo-brand-logo>,
 * <mo-team-logo> and <mo-cover-artwork>, which resolve through this file.
 *
 * rightsStatus: OWNED | LICENSED | EMBED_PERMITTED | UNVERIFIED | BLOCKED
 *   BLOCKED     never rendered
 *   UNVERIFIED  rendered only when MOSPORT_CONFIG.mode === 'prototype'
 *   others      rendered in every mode
 * kind: every asset declares what it depicts. 'athlete' is not an allowed kind
 * (Founder lock B-04); the e2e suite fails if one appears.
 */
(function () {
  var slot = function (expectedPath, extra) {
    return Object.assign({
      src: null, srcDark: null, expectedPath: expectedPath, rightsStatus: 'UNVERIFIED', kind: null,
      provenance: { source: null, sourceUrl: null, licence: null, addedBy: null, addedAt: null }
    }, extra || {});
  };
  var original = function (src, kind, what) {
    return {
      src: src, rightsStatus: 'OWNED', kind: kind,
      provenance: { source: what, sourceUrl: null, licence: 'Original MOSPORT-B artwork', addedBy: 'MOSPORT-B', addedAt: '2026-10-28' }
    };
  };

  var brand = {
    /* Draft geometric monogram from the v0.3 handoff. Not a trademark clearance. */
    mark: slot('assets/brand/mosport-mark.svg', original('assets/brand/mosport-mark.svg', 'brand-mark', 'MOSPORT draft monogram (v0.3 handoff)')),
    /* No wordmark file yet: the masthead is live text (Anton), which is the intended design. */
    wordmark: slot('assets/brand/mosport-wordmark.svg', { kind: 'brand-wordmark' })
  };

  var cover = {
    /* Cover page artwork (desktop left page and mobile cover). Text-free vector. */
    gameday: slot('assets/cover/cover-gameday.svg', Object.assign(original('assets/cover/cover-gameday.svg', 'equipment-arena',
      'Original vector: ball, hoop, arena lights, crowd pattern, court. No athletes or logos.'), {
      width: 1000, height: 1300, focalDesktop: '62% 40%', focalMobile: '70% 34%'
    })),
    /* Lead-game panel and Match Detail hero background. */
    arena: slot('assets/cover/arena-dusk.svg', Object.assign(original('assets/cover/arena-dusk.svg', 'venue-generic',
      'Original vector: generic arena at dusk with palms. No real venue, no text.'), {
      width: 800, height: 400, focalDesktop: '50% 70%', focalMobile: '50% 70%'
    }))
  };

  /* Team logos: keyed by canonical code (js/teams.nba.js). Empty until licensed
   * files exist; the component shows the tricode badge meanwhile. Reference
   * source for the later asset task: Mosport-Terminal frontend/public/logos/nba-*.png
   * (rights unverified, nothing copied). */
  var teams = {};
  (window.MOSPORT_TEAMS ? window.MOSPORT_TEAMS.list : []).forEach(function (t) {
    teams[t.code] = slot('assets/teams/nba/' + t.code.toLowerCase() + '.png', { kind: 'team-logo' });
  });

  /* Test hook: ?logoFail=1 points two logos at missing files to prove the fallback. */
  if (/[?&]logoFail=1\b/.test(location.search)) {
    ['GSW', 'LAL'].forEach(function (c) { teams[c].src = 'assets/teams/nba/__missing__.png'; teams[c].rightsStatus = 'OWNED'; });
    brand.mark.src = 'assets/brand/__missing__.svg';
  }

  window.MOSPORT_ASSETS = { brand: brand, cover: cover, teams: teams };
  window.MOSPORT_CONFIG = window.MOSPORT_CONFIG || { mode: 'prototype' };
  /* ?mode=production only ever tightens the gate (used by tests to prove the DEMO fence). */
  if (/[?&]mode=production\b/.test(location.search)) window.MOSPORT_CONFIG.mode = 'production';
})();
