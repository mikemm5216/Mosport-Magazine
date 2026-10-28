# B-P2-01 — MOSPORT-A World contract re-audit: BLOCKED

Re-audited 2026-10-29 (Asia/Taipei). Read-only. Nothing in MOSPORT-A was changed.

**Result:** MOSPORT-A has no game-level World Analysis Package yet. There is no schema, no
producer, no sample and no release rules for B to map against. A real A integration is
**BLOCKED**. B keeps its prototype adapter and labels it as such everywhere.

## What was inspected

MOSPORT-A `mikemm5216/Mosport-NBA`:
- `main` at `8b83093bb03fc9d661c4be9e88ddfbf731dcda0c` (committed 2026-10-28 13:53 +08:00).
  This is the same commit as the first audit; `main` has not moved since.
- Open PRs #43, #44, #45 and #47. Their diffs against `main` add no World, snapshot, serving,
  package or distribution file.

Searches over the full `main` tree (192 files):

| Looked for | Where | Found |
|---|---|---|
| File paths matching world / snapshot / package / serve / distribut / publish / pregame / release / export / lock | `git ls-tree -r origin/main` | Only `src/domain/identity/teamAtLock.ts`, `docs/adr/ADR-004-PREGAME-CHRONOLOGY.md`, `docs/operations/PREGAME-SCHEDULE-FEATURES.md` and their tests. None defines a game package |
| WinProbability, distributionEligibility, AnalysisPackage, World Analysis, homeWin, verdict, FINAL_CONFIRMED, ISSUED | `git grep` over `docs`, `src`, `registry` | Planning text only (`docs/operations/ROADMAP-PR-PLAN.md`, `registry/capabilities.json`). No type, no producer |
| Snapshot / lock types | `src/` | `src/domain/engine/readContract.ts` (feature-read contract), `src/domain/evidence/*` (Evidence, chronology), `src/domain/identity/teamAtLock.ts` (team membership at lock) |

## Direct evidence

1. `src/domain/engine/readContract.ts` defines `nba-feature-read-contract.v1`. That is a
   **feature-read** contract: how one declared feature may be read. Every read is CONTRACT_ONLY
   and its engine read site NOT_IMPLEMENTED. It is not a game package and must not be relabelled
   as one.
2. `registry/capabilities.json` and `docs/operations/ROADMAP-PR-PLAN.md` list the work that would
   produce a game package, all PLANNED:
   - SNAP-01: immutable analysis snapshot and prediction lock. Its acceptance says "尚無引擎則
     verdict typed blocked、probability null".
   - ENGINE-04: World consumes TMV and persists a real analysis result.
   - SERVE-01: read-only persisted-snapshot view.
   - SERVE-02: Coach Read from persisted World analysis.
3. `docs/operations/PRODUCTION-LAUNCH-PLAN.md` lists REL-00 (the first release contract: audience,
   data eligibility, freshness) as PLANNED.
4. `docs/operations/PREGAME-SCHEDULE-FEATURES.md:22`: "The overall analysis remains
   `BLOCKED_MISSING` and probability remains null".
5. A's lock and chronology rule (ADR-004): a pregame input for game G needs
   `availableAt < lockAt(G)`. Evidence status is OBSERVED, PRIOR_DERIVED, EXPLICIT_PROXY or
   BLOCKED_MISSING (`src/domain/evidence/evidenceStatus.ts`). These will constrain the package but
   do not define it.

## Field-by-field status of what B renders

| B prototype field (`mosport-b/prototype-game@0`) | A source today | Status |
|---|---|---|
| `gameId` | A has ESPN/NBA game ids in intake (`src/pipeline/*`), not a published game identity contract | NO CONTRACT |
| `away`, `home` (tricodes) | Franchise registry (`src/domain/identity/franchiseRegistry.ts`); no export to B | NO CONTRACT |
| `tipoff`, `venueTz` | Venue registry and timing (`src/domain/identity/venueRegistry.ts`, `src/domain/pipeline/timing.ts`); internal | NO CONTRACT |
| `status`, `score` | Scoreboard and official box intake; internal | NO CONTRACT |
| `world.state` (ISSUED / NOT_ISSUED) | — | NOT DEFINED IN A |
| `world.distributionEligibility` (PUBLIC / INTERNAL) | — | NOT DEFINED IN A |
| `world.version` (INITIAL / FINAL_CONFIRMED / FINAL_UPDATED) | — | NOT DEFINED IN A |
| `world.snapshotId` | SNAP-01 (planned) | PLANNED |
| `world.homeWinProbability` | ENGINE-04 (planned); A currently keeps it null | PLANNED |
| `world.interval60` | — | NOT DEFINED IN A |
| `world.verdict`, `world.why` | SERVE-02 Coach Read (planned) | PLANNED |
| `world.missingReason` | A has typed MissingEvidenceReason for features, not for a game read | PARTIAL / NO CONTRACT |

So no mapping can be written yet. Every left-hand field is a **B expectation**, not an A promise.

## What B does meanwhile

- `worldSource` in every MagazineIssue is `PROTOTYPE_FIXTURE`, the only allowed value. A LIVE issue
  carrying it is refused (`PROTOTYPE_WORLD_IN_LIVE`). So nothing built on prototype data can pass as
  live.
- `site/js/data/providers.js` has no A provider. There is no guessed endpoint.
- The gate and the renderer only remove or pass through World values; they never compute one.

## Questions for MOSPORT-A

Proposed for an issue in Mosport-NBA (not filed from this repo):

1. **Package schema.** What is the versioned schema id for a game-level World Analysis Package, and
   where will its TypeScript type and JSON schema live?
2. **Identity.** Which game id is canonical for consumers (NBA game id, ESPN id, or an A id)? How
   are teams identified: tricode, franchise id, or both?
3. **Lock and version.** What states does a read pass through (for example first lock and final
   confirmation)? What are their names, and what are `lockAt` and the evidence cutoff for each?
   Can a FINAL be superseded, and how is that represented without mutating the original (ADR-007)?
4. **Eligibility.** Who decides that a read may be shown publicly, and with what field? Is that
   separate from internal read eligibility? What is the reason vocabulary when it is not public?
5. **Numbers.** Which numbers are published per game (home win probability, interval, score,
   margin)? What is each one's own qualification flag? Is a missing number `null` plus a typed
   reason?
6. **Narrative.** Will verdict and "why" text come from A (SERVE-02), with what languages, and with
   per-sentence evidence links?
7. **Provenance.** What provenance travels with a package: snapshot fingerprint, model version,
   feature-vector fingerprint, source families? Is there a release receipt?
8. **Delivery.** Is it a file, an API or a database view? What freshness and availability can B
   expect, and how should B detect a stale or withdrawn package?
9. **Sample.** Can A publish one authentic eligible sample, or a redacted one per its data policy,
   for B to build the adapter and contract tests against?

## Status

- B-P2-01 **BLOCKED** on A (SNAP-01, ENGINE-04, SERVE-01/02, REL-00).
- Issue #3 stays open.
- B-P2-02 and B-P2-03 proceed against B-owned contracts and a prototype adapter only.
