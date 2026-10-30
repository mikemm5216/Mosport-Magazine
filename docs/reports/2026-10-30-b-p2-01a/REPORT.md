# B-P2-01a — A world-analysis-package@1 consumed on one real game (PARTIAL)

As of 2026-10-30 (Asia/Taipei). Base: B `main` `4e3139b`. A source: Mosport-NBA `main` `4e56f0d`.

## Plan versus actual

| Plan | Actual | Status |
|---|---|---|
| Re-audit A for a game-level package | A #55 merged `mosport-a/world-analysis-package@1` with an authentic CLE at ATL sample | Done (read-only) |
| B read-only consumer | `site/js/contracts/world-a1.js`: strict shape, fingerprint, chronology, read state, revision select, public projection | Done, in Draft PR |
| One real game A → B | `espn:401909893` validates; B fingerprint equals A's; STALE today; public door closed with typed blockers | Done for the contract and internal display |
| Public rendering | Not possible with v1 (NOT_ISSUED, INTERNAL, rights UNVERIFIED, schedule not public) | BLOCKED on A (B-P2-01b) |

## Verification

- `node --test tests/unit/world-a1.test.js`: 15 tests, includes fabricated-judgment refusal after
  re-signing, withdrawal/supersession precedence, revision-set refusal, provenance hashes.
- `node tests/e2e/a-package.js`: 39 browser checks (desktop and 390 px; ACTIVE and STALE clocks;
  no %, no probability-like number; tampered file refused; no public page loads the adapter).
- Full `npm test` results are recorded on the PR.

## Screenshots

- `a-package-active-1440.png`: read at 2026-10-29T08:50Z (inside the 15-minute freshness bound).
- `a-package-stale-1440.png`, `a-package-stale-390.png`: read at 2026-10-30T02:48Z.

## Not claimed

No public forecast, no win probability, no LIVE issue, no release, no live feed, no automatic
dispatch acceptance. Issuer authenticity and A registry digests are not verifiable by B.
