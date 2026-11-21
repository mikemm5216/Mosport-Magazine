/*
 * B-side trust root for official results (mosport-b/game-result@1).
 *
 * A result projection is shown only when its canonical SHA-256, computed by B,
 * equals the digest pinned here for the same NBA game id, with the same A receipt
 * reference. A pin is added only by a reviewed PR from an A-verified receipt
 * (NBA #174: OFFICIAL_FINAL_VERIFIED + SCORE_MATCH). A payload's own hash or
 * eligibility claim is never trusted.
 *
 *   'NBA_GAME_ID': { digest: '<sha256 of canonical projection>', receiptRef: '<A receipt id>' }
 */
(function (root) {
  'use strict';
  var pins = Object.freeze({
    /* NBA #171 / #174: A receipt revision 1 (mosport-a/nba-official-result@1, NBA main 1c8bf31),
       NBA OFFICIAL_FINAL_VERIFIED + ESPN SCORE_MATCH. Digest independently recomputed (#171 7058351609;
       Magazine #19 7058353321). */
    '0022600051': Object.freeze({ digest: '370e676a592aa02547f5d7fd80e80d0f4156db9c02e5fb127f1160c8bfee864d', receiptRef: 'NBA-0022600051-R1' })
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = pins;
  else root.MOSPORT_RESULT_PINS = pins;
})(typeof window !== 'undefined' ? window : globalThis);
