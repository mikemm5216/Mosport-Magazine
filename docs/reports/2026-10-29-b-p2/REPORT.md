# B-P2 plan vs actual — 2026-10-29

As of 2026-10-29 01:30 Asia/Taipei. Day **OPEN**. Base: `main` @ `b97144a` (PR #6 merge).

| WP | Planned | Actual | Evidence |
|---|---|---|---|
| Baseline | Sync to main, run checks | DONE: `main` contains `b97144a`; baseline `npm test` passed (35 unit, 321 + 18 + 50 browser) before any change | local run 2026-10-29 00:58 |
| B-P2-01 | Re-audit A World contract | **BLOCKED**: A `main` `8b83093` has no game-level package, producer, sample or release rules | `docs/P2_CONTRACT_COMPATIBILITY.md` (field table + 9 questions for A) |
| B-P2-02 | B-owned contracts + store | DONE | `site/js/contracts/contracts.js`, `site/internal/js/store.js`, `docs/contracts/B_CONTRACTS_V1.md` |
| B-P2-03 | One data path for all pages | DONE (prototype adapter only) | `site/js/data/pipeline.js`, `providers.js`; all four pages render from the public model |
| Gate review | Find and fix gaps in the existing gate | DONE: four real gaps fixed with regressions | see below |
| Codex P2 (PR #6) | Zoom lost when toggling theme/language | DONE | `syncUrl` reads the current URL; e2e regression |

## Gate gaps found and fixed

| Gap in `eligibility.js` at `b97144a` | Effect | Fix | Test |
|---|---|---|---|
| `validUntil` compared with `Date.parse`; a malformed value gives NaN, and NaN ≤ now is false | An item with `validUntil: "2026-11-31T25:00"` never expired | Strict ISO parse; malformed → `BAD_TIME` | `eligibility.test.js` |
| No clock → expiry skipped | Expiring items always passed without `now` | `NO_CLOCK` blocks | `eligibility.test.js` |
| Duplicate item/game ids: last one won | A second record with an approved item's id could replace it | Issue refused (`DUPLICATE_ID`) | unit + e2e `dupid` |
| Approval embedded in the item, trusted as-is; time not checked | Any record could claim `{mode:'HUMAN', approverId}`; future-dated approvals passed | Approval built only from a matching receipt (id + revision + content hash); embedded approval = unknown field; approval time must parse and not be after now | `contracts.test.js`, `pipeline.test.js`, e2e `bypass2` |

Also fixed:
- **Match detail fell back to the lead game for an unknown `?game=`.** It now shows a not-found
  state.
- **A non-public read's internal reason code was shown on Match.** It is now public wording.
- **Approver ids were shown on Review.** They are now removed; the page shows human approval, the
  date and the receipt reference.

## Tests (this branch)

- `npm run registry:check`: OK.
- `npm run test:unit`: **81 pass**, 0 fail. New suites:
  - `contracts.test.js` (20)
  - `store.test.js` (9)
  - `pipeline.test.js` (14)
  - `eligibility.test.js` regressions
- `npm run test:e2e`: **459/459** + 18 native-v2 + 50 sport-asset. The new `data-suite.js` has
  138 checks:
  - bad-data states on 4 pages × 2 widths;
  - stale and expired issues;
  - malformed times;
  - unapproved, stale, retracted and mis-slotted items absent from the DOM;
  - internal read absent from the DOM;
  - unknown game;
  - script injection on 4 pages × 2 widths;
  - long titles at 1440, 1280, 390 and 360 in zh and en;
  - production refusal and no internal code on the public pages;
  - `?issue=` confinement;
  - zoom/URL regression;
  - DEMO marks.
- **Mutation check.** The test suite was run against two deliberately broken versions:
  - reverting `syncUrl` to the startup query fails the two zoom/URL checks;
  - removing `esc()` from cover headlines fails four XSS checks.

  Both catch the fault, so these checks are not vacuous.

Reproduce: `npm install && npm run setup:browsers && npm test`.

## Screenshots (this folder)

| File | What it shows |
|---|---|
| `home-1440-zh-light.jpg`, `home-390-zh-light.jpg` | Unchanged magazine: same as P1, now rendered through the pipeline |
| `data-invalid-1440.jpg` | Unsupported schema: message, navigation, nothing invented |
| `data-loadfail-390.jpg` | Load failure on mobile: shared top bar shown (the cover bar is not drawn) |
| `data-stale-schedule-1440.jpg` | Expired issue: all six games, no read links |
| `data-xss-1440.jpg` | Markup in content rendered as literal text |
| `data-longtitle-1440.jpg`, `data-longtitle-390.jpg` | Long headlines hold the layout |

Visual comparison: the default home is pixel-for-pixel the P1 layout; no visual change was intended
in this PR.

## Not done / next

- B-P2-01: needs A's SNAP-01, ENGINE-04, SERVE-01/02 and REL-00, and answers to the questions in
  the compatibility doc.
- Real publication, identity and deployment: not in scope; production refuses DEMO.
- Next: B-P3 workflow and receipts on top of the store (separate PR).
