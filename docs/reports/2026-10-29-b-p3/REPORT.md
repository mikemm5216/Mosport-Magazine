# B-P3 plan vs actual — 2026-10-29

As of 2026-10-29 Asia/Taipei. Day **OPEN**. Branch `feat/b-p3-workflow`, stacked on B-P2 (PR #8).

| WP | Planned | Actual | Evidence |
|---|---|---|---|
| B-P3-01 | Workflow core, receipts, local persistence | DONE (DEMO environment only) | `site/internal/js/workflow.js`, `scripts/lib/event-log-file.js`, ADR-B003 |
| B-P3-02 | Risk routing, QA separation, M-01…M-07 | DONE | `site/internal/js/risk.js`, `site/internal/js/policy-cases.js`, `tests/unit/policy-cases.test.js` |
| Gate review | Re-check eligibility after P2 | DONE in P2 (four fixes). P3 adds defence-in-depth at approval and publication | `workflow.test.js` |
| B-P3-05 (task G) | Internal editor operations prototype | DONE (DEMO) | `site/internal/editor.html`, `tests/e2e/editor-suite.js` |

## How each Founder case behaves

| Case | Spec 04 expectation | Result | Test |
|---|---|---|---|
| M-01 | Confirmed, sourced, rights OK → QA all green → AUTO_APPROVED → PUBLISHED + receipt | Matches. The receipt carries QA, sources, fingerprints, policy version and hash | `policy-cases` M-01 |
| M-02 | Unverified rumour kept, waits for a human, never auto, never a confirmed fact | AWAITING_HUMAN_APPROVAL. Written as fact, it fails fact QA (UNVERIFIED_SOURCE_AS_FACT). Without an "unconfirmed" disclosure, it fails policy. Ten reposts count as one source | M-02 ×2 |
| M-03 | Confirmed major injury still needs a human | AWAITING; publication blocked until a named human (not the author) approves. In production a DEMO approval is refused | M-03 ×2 |
| M-04 | "MOSPORT EXCLUSIVE" repost: label fails, cannot claim exclusivity | Policy FAIL EXCLUSIVE_NOT_PROVEN, so the item never reaches a human; approval is impossible. Fixed copy proceeds to a human. A real MOSPORT original passes policy but still needs a human | M-04 |
| M-05 | Public Review still needs a human | Route HUMAN (PUBLIC_REVIEW) even with all QA PASS. Fails fact QA without an official final and a locked read | M-05 |
| M-06 | Retraction or contradiction blocks, corrects or withdraws; immutable trail | Published item moves to CORRECTION_PENDING and leaves the public issue at once; withdrawn or corrected through chained receipts; the original receipt is unchanged | M-06 ×2 |
| M-07 | Attention without reuse rights: keep the receipt, no full-text reproduction | Rights FAIL REPRODUCTION_NOT_PERMITTED, so the item is HELD and no approval is possible. A link-only rewrite passes rights (and goes to a human) | M-07 |

Unknown and conflicting evidence gets conservative reason codes:
- conflicting cluster → BLOCK;
- no source → BLOCK;
- opinion class → HUMAN;
- Breaking without a confirmed fact → policy FAIL;
- betting framing → policy FAIL;
- a number without an eligible World read, or a number different from it → fact FAIL.

## Tests (this branch)

- `npm run test:unit`: **112 pass**, 0 fail. New since P2:
  - `workflow.test.js` (19);
  - `policy-cases.test.js` (12).
- `npm run test:e2e`: **477/477** + 18 + 50. New: `editor-suite.js`, 18 checks covering:
  - human approval → publish → receipt;
  - fake exclusive with no approve button;
  - an edit after approval needs a new decision;
  - a source retraction pulls the item, then withdraw;
  - layout save and public preview;
  - lead slot type refusal;
  - receipts and log;
  - reload replay;
  - 390 px layout.
- **Mutation check.** Disabling the approval QA guard or the publish-time fact re-check makes the two
  defence-in-depth tests fail.

Reproduce: `npm install && npm run setup:browsers && npm test`.

## Screenshots (this folder)

`editor-1440-awaiting.jpg` (QA, route, blockers, sources), `editor-1440-published.jpg`,
`editor-1440-layout.jpg` (layout + public preview + internal exclusion reasons),
`editor-1440-log.jpg` (receipts, hash-linked events), `editor-390.jpg`.

## Limits stated plainly

- **Approver identity.** An approver id is a recorded label, not a verified identity. There is no
  login or role system, and only the DEMO environment exists.
- **Hashes.** They prove integrity, not identity.
- **Local file.** The append-only save is not tamper-proof or production storage.
- **QA heuristics.** Rumour disclosure, betting words and quote length are reviewable heuristics.
- **Thresholds.** No major-news threshold, approver roster or SLA was invented.

## Next

- B-P3-03 and B-P3-04 (sources and the Evidence Candidate) go in a separate PR.
- Production publishing needs:
  - identity;
  - server-side append-only storage;
  - a release authority;
  - Founder thresholds.
