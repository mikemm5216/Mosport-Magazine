# MOSPORT-B Roadmap

As of 2026-10-28 (Asia/Taipei). Status: P0 in PR #1; P1 in PR (stacked on #1); P2 and P3 not started. Issues: #2 (P1), #3 (P2), #4 (P3), #5 (logo files).
Order follows the Founder engineering instruction of 2026-10-28: P0 → P1 → P2 → P3.
P3 must not block the P1 frontend MVP.

| WP | Title | Depends on | Status |
|---|---|---|---|
| **B-P0-01** | Repo, agent guide, Founder spec lock (docs-only PR) | — | In PR |
| **B-P0-02** | Roadmap, issues, acceptance criteria | B-P0-01 | In PR |
| **B-P1-01** | Magazine design system: tokens, self-hosted fonts, light/dark, zh/en | B-P0-01 | In PR |
| **B-P1-02** | Image slots: BrandLogo, TeamLogo (fallback), CoverArtwork, original cover art | B-P1-01 | In PR |
| **B-P1-03** | Eligibility gate for the render path (unit-tested) | B-P0-01 | In PR |
| **B-P1-04** | Home: desktop spread (cover + Today) and mobile cover → Today | B-P1-01..03 | In PR |
| **B-P1-05** | Schedule, Review, Match Detail, Almanac entry (labelled "coming later") | B-P1-04 | In PR |
| **B-P1-06** | Browser acceptance: 1440/1280/390/360, zh/en, light/dark, empty issue, logo failover; screenshots vs visual master | B-P1-04, B-P1-05 | In PR |
| **B-P1-07** | Magazine Reader Zoom: Fit / − / + / 100%, 50–200%, keyboard, mobile pinch-zoom (Founder addendum #2) | B-P1-04 | In PR, awaiting Founder review |
| **B-P1-08** | Asset-ready: Asset Registry (JSON, versions, rights, RWD crops, fallbacks, remote-loadable); five art slots; ChatGPT art registered as CANDIDATE | B-P1-02 | In PR, awaiting Founder visual sign-off |
| B-P2-01 | World read-only contract (ingest an A `World Analysis Package`; no recompute) | B-P1-03; A contract review | Not started |
| B-P2-02 | Editorial item store + Editor layout plan contract | B-P1-03 | Not started |
| B-P2-03 | Replace DEMO fixtures with a contract-shaped adapter (still no live data) | B-P2-01, B-P2-02 | Not started |
| B-P3-01 | Editorial workflow state machine + publication receipts + correction/withdraw | B-P2-02 | Not started |
| B-P3-02 | Risk routing (AUTO vs AWAITING_HUMAN_APPROVAL) with fixtures M-01..M-07 | B-P3-01 | Not started |
| B-P3-03 | Free-source review and provider adapters (no paid API) | B-P3-01 | Not started |
| B-P3-04 | Media → World Evidence Candidate contract (research lane, read-only to A) | B-P3-01; A review | Not started |

## Acceptance (from spec 02 §7, 04 §2)

| ID | Check | Where verified |
|---|---|---|
| U-01 | No news / no eligible World read → no Breaking/Exclusive/probability placeholders; Schedule still lists all games | e2e `empty issue` |
| U-04 | Eligible World read → home shows only the main % (no interval); detail on Match Detail | e2e `one number` |
| U-05 | Logo/wordmark failure → readable fallback, page intact | e2e `logo failover` |
| U-06 | EN / 繁中 / Dark / Mobile → brand fixed, language consistent, no overflow | e2e matrix |
| U-07 | No player imagery | e2e image allow-list + asset provenance |
| Gate | Unapproved major/rumour/sensitive/exclusive never render | unit + e2e `bypass fixture` |
| Visual | Browser screenshots compared with `VISUAL_REFERENCE_CURRENT.png` | `docs/reports/` |

## Open items needing the Founder (not blocking P1)

- Licensed team-logo files (the slots work; production shows abbreviations until then).
- Quantitative thresholds for "major news", approver roles and SLA (spec 01 §E).
- Deployment target (none is enabled).
