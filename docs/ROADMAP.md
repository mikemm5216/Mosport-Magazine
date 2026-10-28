# MOSPORT-B Roadmap

As of 2026-10-29 (Asia/Taipei). P0 and P1 are merged (PR #1, PR #6, merge commit `b97144a`).
P2 and P3 are in progress on separate PRs. Issues: #2 (P1), #3 (P2), #4 (P3), #5 (logo rights),
#7 (P1 art).
Order follows the Founder engineering instructions of 2026-10-28 and 2026-10-29: P0 → P1 → P2 → P3.

## Where things stand

| Area | State | Evidence |
|---|---|---|
| Merged frontend | Magazine spread and mobile cover; Today / Schedule / Review / Match; zh/en; light/dark; Reader Zoom (Fit Width default, Fit Page, 50–200%); asset registry with CANDIDATE art; NBA marks wired in the prototype | `main` @ `b97144a` |
| P2 this round | B-owned contracts, content store, one data path for every page, prototype adapter, World re-audit | PR "B-P2: contracts, store, unified data path" |
| P3 this round | Editorial workflow, receipts, risk routing, M-01…M-07, internal editor prototype | PR "B-P3" (stacked on P2) |
| A World contract | **BLOCKED**: A has no game-level package yet | `docs/P2_CONTRACT_COMPATIBILITY.md` |
| Real publishing | Not built: no identity system, no server-side release authority, no deployment | ADR-B002 scope limit; ADR-B003 |
| Asset commercial basis | Not established: team marks and art are prototype-only (UNVERIFIED rights); Founder visual sign-off pending | #5, #7, `docs/LOGO_PROVENANCE_AUDIT.md` |
| Other sports | Asset libraries only: no schedule, data or World support | `docs/FOUNDER_FOLLOWUP_20261028.md` |

## Work packages

| WP | Title | Depends on | Status |
|---|---|---|---|
| **B-P0-01** | Repo, agent guide, Founder spec lock | — | Merged (#1) |
| **B-P0-02** | Roadmap, issues, acceptance criteria | B-P0-01 | Merged (#1) |
| **B-P1-01** | Design system: tokens, self-hosted fonts, light/dark, zh/en | B-P0-01 | Merged (#6) |
| **B-P1-02** | Image slots: BrandLogo, TeamLogo (fallback), CoverArtwork | B-P1-01 | Merged (#6) |
| **B-P1-03** | Render-path eligibility gate | B-P0-01 | Merged (#6); hardened in B-P2 (dup ids, malformed times, future approvals) |
| **B-P1-04** | Home: desktop spread and mobile cover → Today | B-P1-01..03 | Merged (#6) |
| **B-P1-05** | Schedule, Review, Match Detail, Almanac entry | B-P1-04 | Merged (#6) |
| **B-P1-06** | Browser acceptance matrix and screenshots | B-P1-04, 05 | Merged (#6) |
| **B-P1-07** | Reader Zoom (Fit Width default, Fit Page, ±, 100%) | B-P1-04 | Merged (#6); Codex URL/zoom finding fixed in B-P2 |
| **B-P1-08** | Asset registry; CANDIDATE art; NBA marks in prototype | B-P1-02 | Merged (#6); final art (#7) and rights (#5) open |
| B-P2-01 | Read-only adapter for an A World Analysis Package | A: SNAP-01, ENGINE-04, SERVE-01/02, REL-00 | **BLOCKED**: re-audit and questions for A in `docs/P2_CONTRACT_COMPATIBILITY.md` |
| B-P2-02 | Editorial contracts and content store | B-P1-03 | In PR (P2) |
| B-P2-03 | One data path (provider → contracts → references → gate → public model) for every page; prototype adapter | B-P2-02 | In PR (P2); real World data waits on B-P2-01 |
| B-P3-01 | Workflow state machine, QA, publication receipts, correction/withdraw, local persistence | B-P2-02 | In PR (P3, stacked on #8); DEMO environment only, ADR-B003 |
| B-P3-02 | Risk routing and policy cases M-01…M-07 | B-P3-01 | In PR (P3) |
| B-P3-05 | Internal editor operations prototype (DEMO) | B-P3-01, 02 | In PR (P3) |
| B-P3-03 | Free official source inventory and one offline parser | B-P3-01 | In PR (P3 sources) |
| B-P3-04 | Media → World Evidence Candidate draft (research lane, not sent to A) | B-P3-01; A review | Draft contract only; A acceptance format unconfirmed |

## Acceptance (spec 02 §7, 04 §2)

| ID | Check | Where verified |
|---|---|---|
| U-01 | No news / no eligible World read → no Breaking/Exclusive/% placeholders; Schedule still lists all games | `tests/unit/pipeline.test.js`, e2e `empty issue` |
| U-04 | Eligible read → Today shows only the main %; detail on Match | e2e `one number` |
| U-05 | Logo/wordmark failure → readable fallback | e2e `logo failover` |
| U-06 | EN / 繁中 / Dark / Mobile → brand fixed, no overflow | e2e matrix |
| U-07 | No player imagery | e2e image allow-list |
| Gate | Unapproved major/rumour/sensitive/exclusive never render; stale approvals don't carry over | unit + e2e `bypass`, `staleapproval`, `data-suite` |
| M-01…M-07 | Media policy cases | `tests/unit/policy-cases.test.js`; editor flow `tests/e2e/editor-suite.js` |

## Open items needing the Founder

- Team-mark commercial basis (#5). Prototype use is recorded, rights stay UNVERIFIED.
- Final art and visual sign-off (#7).
- Quantitative thresholds for "major news", approver roles and SLA (spec 01 §E; still not decided;
  the workflow uses conservative escalation).
- Identity and authorisation for real human approval (not built; DEMO approvals are refused in
  production).
- Deployment target and real publication (none enabled).
