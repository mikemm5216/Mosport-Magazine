/*
 * B-side trust root for official results (mosport-b/game-result@1).
 *
 * A result projection is shown only when its canonical SHA-256, computed by B,
 * equals the digest pinned here for the same NBA game id, with the same A receipt
 * reference. A pin is added only by a reviewed PR from an A-verified receipt
 * (NBA #174: OFFICIAL_FINAL_VERIFIED + SCORE_MATCH). A payload's own hash or
 * eligibility claim is never trusted. Empty: no official result is shown yet.
 *
 *   'NBA_GAME_ID': { digest: '<sha256 of canonical projection>', receiptRef: '<A receipt id>' }
 */
(function (root) {
  'use strict';
  var pins = Object.freeze({});
  if (typeof module !== 'undefined' && module.exports) module.exports = pins;
  else root.MOSPORT_RESULT_PINS = pins;
})(typeof window !== 'undefined' ? window : globalThis);
