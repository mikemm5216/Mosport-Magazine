# MOSPORT-B contracts v1 (B-P2-02)

Machine-checked in `site/js/contracts/contracts.js`. These are B-owned records. They follow
the Founder spec-lock fields and meanings (`03_MEDIA_EDITORIAL_HANDOFF.md` §3–§5,
`02_UI_PRODUCT_HANDOFF.md`). They do **not** define or stand in for a MOSPORT-A
World Analysis Package (see `docs/P2_CONTRACT_COMPATIBILITY.md`).

## General rules

- Every record carries `schema` with an exact version. A different version is rejected, not
  interpreted (`SCHEMA_UNSUPPORTED`).
- Unknown fields are rejected (`UNKNOWN_FIELD`). In particular, an item cannot carry its own
  `approval` object. Approval comes only from an approval receipt that matches the item.
- Instants are full ISO-8601 with an explicit zone (`2026-11-01T00:00:00Z`, `+08:00`). Date-only
  values, local times, impossible dates (`02-30`, `24:00`) and other formats are `BAD_TIME`. A
  missing required time is `MISSING_FIELD` or `MISSING_TIME`.
- Ids match `^[A-Za-z0-9][A-Za-z0-9._:@-]{0,79}$`; team codes match `^[A-Z]{2,4}$`. Both are
  safe inside HTML attributes, and the renderers escape them as well.
- URLs are absolute `http(s)` only. `javascript:`, `data:`, protocol-relative, embedded
  credentials, quotes and whitespace are `UNSAFE_URL`.
- Hashes are SHA-256 over canonical JSON (keys sorted). They are integrity checks. They do not
  prove who wrote a record.

## Records

| Contract | Schema | Purpose |
|---|---|---|
| EditorialItem | `mosport-b/editorial-item@1` | One revision of a story, review, streak or game analysis |
| SourceReceipt | `mosport-b/source-receipt@1` | One captured source, immutable once recorded |
| SourceEvent | `mosport-b/source-event@1` | A later state of a source (retracted, disputed…). Never edits the receipt |
| ApprovalReceipt | `mosport-b/approval-receipt@1` | AUTO or HUMAN decision bound to item id + revision + content hash |
| EditorLayoutPlan | `mosport-b/layout-plan@1` | The Editor's placement of items and games in one issue |
| MagazineIssue | `mosport-b/magazine-issue@1` | What the public reader loads: one issue and everything it references |
| PublicationReceipt | `mosport-b/publication-receipt@1` | PUBLISH / CORRECT / WITHDRAW record with a correction chain (P3 workflow) |
| Prototype game | `mosport-b/prototype-game@0` | **B fixture view** of a game and its read. Not an A contract |

### EditorialItem

Locked fields keep their meanings: `type`, `editorialLabel`, `riskTriggers`, `publishState`,
`homeEligible`, `sourceRefs`, `verifiedFacts`, `publishedAt`, `validUntil`,
`approvalReceiptRef`, `worldAnalysisRef`, and the `zh` / `en` copy.

Fields added in this contract:

| Field | Why |
|---|---|
| `revision` (int ≥ 1) | Corrections keep history. An approval binds to one revision |
| `correctionOfRevision` | Says which published revision this corrects |
| `linkedGameIds`, `linkedTeams`, `teams` | Explicit subjects for cards and logos, so nothing is inferred from copy |
| `demo` | Every fixture record says it is DEMO. A LIVE issue rejects demo records |

Rules:
- A PUBLISHED item needs `publishedAt`.
- `validUntil`, when present, is after `publishedAt`.
- A GAME_ANALYSIS needs `worldAnalysisRef`, and no other type may carry one.
- A REVIEW needs two teams.
- The content hash covers id, type, label, triggers, homeEligible, sources, facts, validUntil,
  links, copy and demo. It excludes workflow status, so publishing does not change it but any
  edit does.

### SourceReceipt and SourceEvent

Fields follow spec 03 §3: `originalUrl`, `publisher`, `authorOrAccount`, `publishedAt`,
`observedAt`, `rightsStatus`, `accessMethod`, `contentFingerprint`, `quotedSpan`, `language`.

Additions:
- `kind`: OFFICIAL_FACT, REPORT, RUMOR, OPINION, SOCIAL_REACTION, WORLD_PACKAGE or
  MOSPORT_ORIGINAL. Only WORLD_PACKAGE and MOSPORT_ORIGINAL may omit a URL.
- `verificationState`: the state at capture.
- `dedupeClusterId`: links copies of one original report, so they do not count as independent
  evidence (spec 03 §3).

Later changes are SourceEvents with state CONFIRMED, DISPUTED, CONTRADICTED, RETRACTED, FALSE,
UNAVAILABLE or RESTORED, applied in time order.
- DISPUTED, CONTRADICTED, RETRACTED and FALSE invalidate every item built on that source.
- RESTORED clears the invalidation.
- A source with `rightsStatus: BLOCKED` cannot back a renderable item.

### ApprovalReceipt

Fields: `itemId`, `itemRevision`, `contentHash`, `mode` (AUTO|HUMAN), `decision`
(APPROVED|REJECTED), `policyVersion`, `approverId`, `decidedAt`, `qa` (fact, language, rights
and policy, each PASS|FAIL|NOT_RUN), `demo`.

- HUMAN needs `approverId`; AUTO may not name one.
- An AUTO approval with any QA result other than PASS does not count.
- If the content hash no longer matches the item, the approval is stale.
- In production mode a `demo: true` approval does not count.
- An item published before its approval was decided is rejected.

### EditorLayoutPlan

Fields: `issueId`, `revision`, `decidedBy`, `decidedAt`, `cover` (≤ 3), `lead`, `games` (≤ 12),
`stories` (≤ 6), and optional `overrides` (`slot`, `ref`, `reason`, `by`, `at`).

- An override records why the Editor changed something (spec 03 §6). It cannot override the
  fact, rights or human gates.
- Slot types:
  - cover: NEWS or FEATURE with a label;
  - lead: GAME_ANALYSIS;
  - stories: REVIEW, STREAK, FEATURE or NEWS.
- One item cannot occupy two slots.
- The renderer keeps the Editor's order and never back-fills a dropped slot.

### MagazineIssue

Fields: `issueId`, `mode` (DEMO|LIVE), `worldSource`, `generatedAt`, `validUntil`, the issue
masthead data, and the collections `games`, `items`, `sources`, `sourceEvents`, `approvals`,
`layout` and `publications`.

The whole issue is refused for any of these:
- a duplicate id in any collection (no "last one wins");
- an unsupported schema;
- `validUntil` not after `generatedAt`;
- a LIVE issue with `worldSource: PROTOTYPE_FIXTURE`;
- a DEMO issue in production mode.

`worldSource` currently allows only `PROTOTYPE_FIXTURE`. So a LIVE issue cannot be built until a
real A adapter exists.

### PublicationReceipt

Fields: `action`, `itemId`, `itemRevision`, `contentHash`, `policyVersion`, `qa`,
`approvalMode`, `approvalReceiptRef`, `approverId`, `sourceRefs`, `sourceFingerprints`,
`publicPath`, `recordedAt`, `previousReceiptId`, `previousReceiptHash`, `reason`, `commandId`,
`demo`, `receiptHash`.

- CORRECT and WITHDRAW must chain to a previous receipt and give a reason.
- `receiptHash` covers every other field, including the previous receipt's hash.
- Written by the P3 workflow (`site/internal/js/workflow.js`).

### Prototype game (`mosport-b/prototype-game@0`)

The game data B's fixtures use: `gameId`, `away`, `home`, `status`, `tipoff`, `venueTz`,
`score`, and `world` (`state`, `distributionEligibility`, `version`, `snapshotId`,
`homeWinProbability`, `interval60`, `verdict`, `why`, `missingReason`).

This is the shape B's renderer expects. **MOSPORT-A has not agreed to it.**
- A NOT_ISSUED read carries no probability and no verdict.
- A probability lies within [0, 1].
- The two teams are different.

## Where each rule is enforced

| Stage | File | Tests |
|---|---|---|
| Record and issue validation | `site/js/contracts/contracts.js` | `tests/unit/contracts.test.js` |
| Content store (revisions, references, layout, replay) | `site/internal/js/store.js` | `tests/unit/store.test.js` |
| Reference resolution and public model | `site/js/data/pipeline.js` | `tests/unit/pipeline.test.js`, `tests/e2e/data-suite.js` |
| Render gate | `site/js/editorial/eligibility.js` | `tests/unit/eligibility.test.js` |
