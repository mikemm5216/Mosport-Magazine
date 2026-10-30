# B-P2-01 — MOSPORT-A World contract: v1 consumed internally (PARTIAL)

Re-audited 2026-10-30 (Asia/Taipei). Read-only towards MOSPORT-A; nothing in A was changed.

**Result:** A now publishes a game-level package, `mosport-a/world-analysis-package@1`
(A PR #55, `main` at `4e56f0dc9aa180364b61d2062784e4e16ef6ea85`). B has a read-only consumer for
it and an internal inspector. v1 deliberately cannot carry a judgment: `world.state` is only
`NOT_ISSUED`, every number is `null`, distribution is `INTERNAL`, rights are `UNVERIFIED` and the
schedule is not publicly eligible. So **nothing from A reaches the public reader**, and that is the
correct display state, not a gap B should fill.

## What B checks (`site/js/contracts/world-a1.js`)

- Strict wire shape mirrored from A's schema: unknown fields and versions fail at every level.
- Canonical UTC instants with milliseconds and real calendar dates.
- Fingerprint (SHA-256 of canonical JSON without `fingerprint` and `revision`) and revision.
  B's recomputation matches A's for the authentic sample.
- Chronology (receipt ≤ lock < tipoff, lock ≤ as-of), game id, ESPN provenance URL, venue
  local date in the venue zone, `validUntil = min(tipoff, receipt + 15 min)`, snapshot chronology
  and its typed missing reason, lifecycle and supersession rules.
- `readState(pkg, now)` on every read: ACTIVE until `validUntil`, then STALE; WITHDRAWN and
  SUPERSEDED win over expiry; a package from the future is refused.
- `select(revisions, now)`: the complete A revision set for one game; mixed, future, conflicting
  or invalid revisions refuse the set with no fallback.
- `publicProjection` is the only door to the public reader and is always closed for v1, with typed
  blockers (`WORLD_NOT_ISSUED`, `WORLD_INTERNAL`, `SCHEDULE_NOT_PUBLIC_ELIGIBLE`,
  `RIGHTS_UNVERIFIED`, and `READ_STALE` / `READ_WITHDRAWN` / `READ_SUPERSEDED`).

What B **cannot** verify and does not claim (`CONSUMER_LIMITS`): who issued the file, A's
franchise/venue registry digests (A replay is required), the source bytes, and live withdrawal
(A has no revocation transport; a saved file cannot announce a later withdrawal).

## One real game: CLE at ATL, `espn:401909893`

| Item | State |
|---|---|
| Fixture | Byte-exact copy of A `docs/contracts/samples/real-401909893-20261029.json`, SHA-256 `7c3d76ac…6eea` (`tests/fixtures/a-world/PROVENANCE.json`) |
| Validation | PASS; B fingerprint `5aa4f3ef…c25e` equals A's |
| Pre-lock evidence | ESPN scoreboard receipt observed 2026-10-29T08:47:37.799Z, snapshot captured at the lock 08:47:38.081Z, tipoff 2026-10-30T00:00:00Z |
| World | NOT_ISSUED · FEATURE_PIPELINE_NOT_CONNECTED; engine and why BLOCKED_MISSING · SOURCE_NOT_PUBLISHED |
| Read state | ACTIVE from as-of until 09:02:37.799Z on 2026-10-29, STALE afterwards (STALE today) |
| Public reader | Not rendered; the game does not appear on Today, Schedule or Match |
| Internal inspector | `site/internal/a-package.html` shows the typed state above, no %, interval or verdict |
| Follow (status, score, settlement) | BLOCKED_MISSING; A does not place a final score into a pregame package |

## Field mapping

| B prototype field | A v1 field | B behaviour |
|---|---|---|
| `gameId` | `game.canonicalId` (`espn:<id>`); `espnGameId` kept | Internal only. `nbaGameId` is BLOCKED_MISSING · IDENTITY_UNRESOLVED |
| `away`, `home` | `franchiseId` for joins, `displayCode` for display | ESPN display codes are not promised to be NBA tricodes |
| `tipoff`, `venueTz` | `game.tipoffAt`, `game.venue.timeZone`, `localDate` | Checked against each other |
| `world.state` | `NOT_ISSUED` only | Passed through |
| `world.distributionEligibility` | `INTERNAL` only | Public door closed |
| `world.version` | none in v1 | Not guessed |
| `world.snapshotId` | `evidence.snapshot` SHA + `capturedAt` (or typed missing) | Shown internally; it is not a full World lock |
| `world.homeWinProbability`, `interval60`, `verdict`, `why` | null / typed missing | No field exists in the internal view |
| `status`, `score` | `follow.*` typed missing | Not shown |

## Still blocked, and on whom

- **Public rendering (B-P2-01b):** A ENGINE-04 (real World judgment), SERVE-01/02, REL-00 release
  qualification, rights, and a delivery transport with revocation. B's `worldSource` stays
  `PROTOTYPE_FIXTURE`, so a LIVE issue still cannot be built.
- **States B expects but v1 does not have:** INITIAL / FINAL_CONFIRMED / FINAL_UPDATED.
- Questions 1, 2, 3 (partly), 7 and 9 below are answered by A's contract doc
  (`docs/contracts/WORLD-ANALYSIS-PACKAGE-V1.md` in Mosport-NBA). Questions 4, 5, 6 and 8 stay open.

## History: 2026-10-29 re-audit (BLOCKED, superseded by the section above)

Re-audited 2026-10-29 (Asia/Taipei). Read-only. Nothing in MOSPORT-A was changed.

**Result:** MOSPORT-A has no game-level World Analysis Package yet. There is no schema, no
producer, no sample and no release rules for B to map against. A real A integration is
**BLOCKED**. B keeps its prototype adapter and labels it as such everywhere.

### What was inspected

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

### Direct evidence

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

### Field-by-field status of what B renders

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

### What B does meanwhile

- `worldSource` in every MagazineIssue is `PROTOTYPE_FIXTURE`, the only allowed value. A LIVE issue
  carrying it is refused (`PROTOTYPE_WORLD_IN_LIVE`). So nothing built on prototype data can pass as
  live.
- `site/js/data/providers.js` has no A provider. There is no guessed endpoint.
- The gate and the renderer only remove or pass through World values; they never compute one.

### Questions for MOSPORT-A

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

### Status

- B-P2-01 **BLOCKED** on A (SNAP-01, ENGINE-04, SERVE-01/02, REL-00).
- Issue #3 stays open.
- B-P2-02 and B-P2-03 proceed against B-owned contracts and a prototype adapter only.
