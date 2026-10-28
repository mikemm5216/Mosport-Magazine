# B-P3-04 — Media → World Evidence Candidate (DRAFT, research lane)

Schema id: `mosport-b/evidence-candidate@0`. The `@0` marks a draft. Implemented in
`site/internal/js/evidence.js`; tests in `tests/unit/sources.test.js`.

**Status:** B-side research output only. MOSPORT-A has **not** agreed to an acceptance format,
nothing is sent to A, and nothing here has scoring authority (spec 03 §7, Founder M-06, spec 04
A-01). Founder §C-5 still applies: the External Sources lane (odds and third-party views) does not
enter World. This is a separate candidate lane.

## Fields

Spec 03 §7 suggests a minimum set of fields. This draft keeps all of them and adds a few.

| Field | Meaning |
|---|---|
| `id` | Stable within B |
| `eventType` | INJURY_STATUS_REPORTED, GAME_RESULT_OFFICIAL, TRANSACTION_ANNOUNCED or RUMOR_OBSERVED |
| `subjects[]` | `{ kind: TEAM\|PLAYER\|GAME, id, … }`. When B cannot resolve a stable id, `id` is `null` **with** a `missingReason` (e.g. PLAYER_ID_NOT_RESOLVED). A name as printed is kept as `printedName`, never promoted to an id |
| `assertion` | What the source stated, e.g. `{ field: 'injuryStatus', value: 'Out', reason }` |
| `verificationState` | Same vocabulary as source receipts. A RUMOR_OBSERVED can never be CONFIRMED |
| `sourceRefs[]` | Source receipt ids |
| `sourcePublishedAt` | When the source says it published |
| `firstObservedAt` | When B first captured it |
| `availableAt` | When the evidence became available to B. Never before `sourcePublishedAt` or `firstObservedAt`. This is what A's chronology rule needs (ADR-004: `availableAt < lockAt`) |
| `rightsStatus` | Copied from the source; UNVERIFIED by default |
| `dedupeClusterId` | The same assertion about the same subject shares a cluster, so it is counted once |
| `supersedes` | A later report changed the assertion; the earlier candidate is kept |
| `retractionOf` | A retraction candidate pointing at the one it withdraws |
| `candidateFeatureFamily` | A research label only (e.g. AVAILABILITY_RESEARCH). Not a feature id and not a request to score |
| `missingReasons[]` | Everything B could not establish (e.g. TIPOFF_AM_PM_NOT_STATED) |
| `provenance` | Parser name and version, subject key, report stamp, line |
| `scoringAuthority` | Always `NONE` |
| `sentToA` | Always `false` |
| `demo` | Fixture marker |

There is no weight, score, probability, impact or sentiment field. A candidate carrying one is
rejected (`UNKNOWN_FIELD`).

## Rules the builder enforces

- **All or nothing.** A parse with any error imports nothing (`PARSE_NOT_CLEAN`).
- **Chronology.** Observing before publication is refused (`OBSERVED_BEFORE_PUBLISHED`).
- **Counted once.** A later report repeating an unchanged status emits nothing new, so ten
  re-postings are not ten pieces of evidence.
- **Changes are linked.** A changed status emits a new candidate with `supersedes` set; history is
  kept.
- **Retractions.** A retracted source yields RETRACTED candidates linked through `retractionOf`.

## Questions for MOSPORT-A (with the World package questions in `docs/P2_CONTRACT_COMPATIBILITY.md`)

1. Does A want candidates at all before a Feature Contract exists? If so, in what form: file drop,
   queue or issue?
2. Which subject ids must be resolved before A will look at a candidate: player id provider, game
   id?
3. Is `availableAt` as defined here (B's first observation, never before publication) the instant
   A's chronology guard expects?
4. Which `eventType` values map to A's existing families (e.g. injury and availability for FEAT-04)?
   A decides; B does not propose weights.
