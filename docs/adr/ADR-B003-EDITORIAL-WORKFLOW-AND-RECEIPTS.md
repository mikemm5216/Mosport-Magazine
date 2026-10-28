# ADR-B003 — Editorial workflow, risk routing and publication receipts (engineering version)

**Status:** Proposed engineering design, 2026-10-29. The Founder locks it implements are M-01, M-02,
M-04, C-4 and the spec 03 §4.2 human triggers. Everything else in this ADR is **PROPOSED**:
engineering choices that make the locks enforceable. None of it is a Founder decision.

## Context

Spec 03 §5 gives a PROPOSED state machine. It requires an immutable `publicationReceiptId` for
every Publish, Correct and Withdraw, and it requires that admission, checking, approval and
publication are recorded separately, so that no single generative model can wave a story through.
The B-P2 store already keeps immutable revisions, source receipts and approval receipts.

## Decision

### States

The spec's DISCOVERED → SOURCE_CAPTURED → EVENT_CLUSTERED stages happen before an item exists.
Here they correspond to source receipts in the store. The item states are:

| State | Meaning | Spec 03 §5 |
|---|---|---|
| DRAFT | Editable revision | EDITORIAL_DRAFT |
| IN_QA | QA recorded but incomplete (an attestation is missing) | FACT_QA … POLICY_QA |
| HELD_FOR_EVIDENCE | A fact or rights check failed, the route is BLOCK, a source went bad, or an editor put it on hold | HELD_FOR_EVIDENCE / HELD |
| AWAITING_HUMAN_APPROVAL | QA passed and the route is HUMAN | same |
| APPROVED | AUTO approval (all QA pass, AUTO route) or a HUMAN approval | AUTO_APPROVED / APPROVED |
| REJECTED | Human rejected this revision | REJECTED |
| PUBLISHED | Has a PUBLISH or CORRECT receipt | PUBLISHED / CORRECTED |
| CORRECTION_PENDING | Pulled from the reader pending a fix (requested, or its source was invalidated) | same |
| WITHDRAWN | Has a WITHDRAW receipt; final | WITHDRAWN |

Transitions are listed in `site/internal/js/workflow.js` (`TRANSITIONS`). PUBLISHED and WITHDRAWN
can only be reached through a publication receipt.

### Separate gates

1. **QA has four checks**: fact, language, rights and policy (`risk.js`).
   - Each check is the deterministic machine checks plus an attestation from a named checker.
   - A machine FAIL cannot be overridden by an attestation or by a human.
   - A missing attestation is NOT_RUN, which blocks the item.
2. **Risk route** (`risk.route`) is a separate function: AUTO, HUMAN or BLOCK, with reason codes.
   - It can add triggers to the ones the Editor declared, never remove them.
   - AUTO only for low-risk classes (NEWS, STREAK, GAME_ANALYSIS) built only on official or World
     sources, with no trigger, label or ambiguity.
   - Everything else is HUMAN.
   - Conflicting, invalidated or missing sources are BLOCK.
3. **Approval** is an ApprovalReceipt bound to item id, revision and content hash.
   - AUTO is issued by the workflow when gates 1 and 2 allow it.
   - HUMAN needs a named approver who is not the author of that revision. Ids are compared after
     trimming and ignoring case.
   - HUMAN approval is possible only after all four checks PASS and the route is not BLOCK. A human
     approval cannot make a wrong fact, a fake exclusive or unlicensed reuse acceptable.
4. **Publication boundary** (`publishBlockers`) re-checks at publish time:
   - the approval is for this revision and this content hash;
   - QA for this revision passed;
   - the policy version is unchanged;
   - the facts, rights and route still hold now (a source may have changed since QA).

### Receipts

PUBLISH, CORRECT and WITHDRAW each produce a PublicationReceipt. Each receipt carries:
- the content hash and policy version;
- the QA result;
- the approval mode and receipt;
- the approver;
- the sources and their fingerprints;
- the public path and time;
- the command id;
- the previous receipt's id and hash (the correction chain);
- its own `receiptHash`.

Receipts are append-only. A receipt with a wrong hash or a broken chain is refused, even when it is
appended directly to the store.

### Commands

- Every command has a `commandId`. Repeating it with the same payload returns the first result and
  appends nothing. Reusing the id for a different payload is `IDEMPOTENCY_CONFLICT`.
- Content-changing commands name the revision they expect; a stale one is `REVISION_CONFLICT`.
- A command runs in a store transaction, so it lands whole or not at all.

### Sources after publication

| Source state | Published item | Item on its way to publication |
|---|---|---|
| RETRACTED, DISPUTED, CONTRADICTED, FALSE | Moves to CORRECTION_PENDING. The reader stops showing it at once, because the public issue only exports PUBLISHED items | Moves to HELD_FOR_EVIDENCE |
| UNAVAILABLE | Flagged | Held. Fact QA also fails while the source is unavailable, so a new revision or a new item on that source cannot pass QA or publish until a RESTORED event |

After that, an editor corrects the item (new revision, then a CORRECT receipt) or withdraws it
(WITHDRAW receipt). Earlier receipts are never edited.

### Persistence

- The store's event log is hash-chained. Reloading replays it and re-validates every event.
- `scripts/lib/event-log-file.js` saves atomically and refuses a save whose events are not an
  extension of the file's.

## Explicit limits (not solved here)

- **Hashes.** SHA-256 hashes prove that content was not changed by accident or carelessly. They do
  not prove who made a record.
- **Local file.** The append-only check protects against rewriting through the API. Anyone with file
  access can still replace the file. This is not tamper-proof or production storage.
- **Approver identity.** An approver id is a recorded claim. There is no login, no role check and no
  signature. The workflow only runs in the DEMO environment: it marks every approval and receipt
  demo, and `createWorkflow({ environment: 'PRODUCTION' })` throws. The public pipeline refuses demo
  approvals in production mode.
- **No real publishing.** Nothing is published, posted or deployed anywhere.
- **Thresholds and staffing.** There are no quantitative "major news" thresholds, no approver roster
  and no SLA (spec 01 §E, still DEFERRED). The rules are conservative defaults with reason codes,
  and they are adjustable.
- **QA checks are heuristics.** The rumour disclosure test, betting words and the quote-reproduction
  length are plain, reviewable heuristics, not a model. They catch the acceptance cases. They do not
  replace an editor.

## Consequences

- M-01…M-07 are reproducible in `tests/unit/policy-cases.test.js`.
- The internal editor prototype (`site/internal/editor.html`) drives the same workflow in DEMO.
- Production needs, before any real release:
  - identity and roles for approvers;
  - server-side, append-only storage;
  - a release authority that issues the public issue;
  - Founder decisions on thresholds and SLA.
