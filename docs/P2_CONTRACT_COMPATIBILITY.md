# B-P2 initial compatibility audit — not a completed integration

2026-10-28; B-P2-01 / Issue #3. Read-only inspection of MOSPORT-A main
`8b83093bb03fc9d661c4be9e88ddfbf731dcda0c` (complete recursive tree).

## Direct evidence

- `src/domain/engine/readContract.ts`, blob
  `e9db54d9184429969f59ec5905509776d29666f0`, defines
  `nba-feature-read-contract.v1`, a **feature-read** contract, not a public
  game-level World Analysis Package. Its documented engine status is
  CONTRACT_ONLY and read sites NOT_IMPLEMENTED.
- That main tree has no path matching World/snapshot/serving/distribution/publish.
  This path inventory alone is not proof about differently named symbols. No
  public endpoint, sample response or release receipt has been verified here.
- B's `site/js/editorial/eligibility.js` consumes the prototype fields
  state, distributionEligibility, version, homeWinProbability and verdict.
  These are B fixture expectations, not an established A producer API.

Source: https://github.com/mikemm5216/Mosport-NBA/blob/8b83093bb03fc9d661c4be9e88ddfbf731dcda0c/src/domain/engine/readContract.ts

## Consequences

B-P2-01 is not complete. Do not relabel a feature contract as a game package,
wire synthetic values into production, call a guessed API, or claim A/B compatibility.
Need A's versioned game-package schema plus an authentic eligible sample and
release/lock/provenance semantics before a real A adapter can be finalised.

## Dependency-safe continuation

B-P2-02 can define the B-owned editorial item store and layout-plan boundary
against labelled test fixtures now: duplicate ids rejected, layout references
validated, correction/withdrawal history preserved, source/approval receipts
required by the existing render gate. It must not create or modify World values.
B-P2-03 remains prototype-only until A's producer contract is verified.

This audit starts P2 preparation; it does not close Issue #3 or declare live data
connected. Final P1 art selection remains a separate Founder decision.
