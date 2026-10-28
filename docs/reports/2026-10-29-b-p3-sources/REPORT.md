# B-P3-03 / B-P3-04 plan vs actual — 2026-10-29

As of 2026-10-29 Asia/Taipei. Day **OPEN**. Branch `feat/b-p3-sources`, stacked on B-P3 (#9).

| WP | Planned | Actual | Evidence |
|---|---|---|---|
| B-P3-03 | Inventory a few official free sources | **DONE**: 7 sources with URL, fields, check date, limits, rights evidence, citation form and state | `docs/sources/FREE_SOURCE_INVENTORY.md` |
| B-P3-03 | One source adapter: local parser + failure cases | **PARTIAL**: NBA official injury report text-layer parser, tested on a **synthetic** fixture (fictional players, layout only). No live fetch or connector. The live PDF and CDN endpoints returned client errors from this environment | `site/internal/js/sources/injury-report.js`, `tests/fixtures/sources/injury-report.synthetic.txt`, `tests/unit/sources.test.js` |
| B-P3-04 | Evidence Candidate draft | **PARTIAL**: draft contract, validator and builder (dedupe, supersede, retraction, chronology, typed missing ids, no scoring field). A's acceptance format is unconfirmed; nothing is sent to A | `site/internal/js/evidence.js`, `docs/contracts/EVIDENCE_CANDIDATE_DRAFT.md` |

## Findings that change scope

- **Terms.** NBA.com Terms (updated 2026-07-13) bar reproduction and public or commercial use of
  materials without written permission, including "link to … for public or commercial purposes". Every
  NBA-operated source therefore stays `rightsStatus: UNVERIFIED`. Rights QA blocks stories built on
  them until a legal or Founder decision.
- **No AM/PM.** The injury report prints game times without AM/PM. The parser does not derive a UTC
  tip-off (`TIPOFF_AM_PM_NOT_STATED`); tip-off must come from a schedule source, ideally A's package.
- **No player ids.** The report prints names only. Candidates keep `printedName` with
  `PLAYER_ID_NOT_RESOLVED` instead of guessing an id.

## Tests

- `npm run test:unit`: **123 pass**. New: `sources.test.js` (9). It covers:
  - DST-correct report time;
  - carried-forward rows and wrapped reasons;
  - NOT YET SUBMITTED;
  - ten typed failure cases;
  - rights UNVERIFIED blocking rights QA;
  - candidate validation;
  - chronology refusal;
  - counted-once and superseding;
  - all-or-nothing import;
  - retractions.
- `npm run test:e2e`: **477/477** + 18 + 50, unchanged by this PR.

## Blocked / next

- Commercial citation or linking basis for NBA-operated pages: legal or Founder.
- Evidence acceptance format, subject ids and `availableAt` semantics: MOSPORT-A
  (questions in the draft doc).
- If both clear: a manual capture flow in the internal editor. Still no scheduling.
