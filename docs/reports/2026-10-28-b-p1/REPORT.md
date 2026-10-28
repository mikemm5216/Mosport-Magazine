# B-P1 plan vs actual — 2026-10-28

As of 2026-10-28 15:40 Asia/Taipei. Day **OPEN**.

| WP | Planned | Actual | Evidence |
|---|---|---|---|
| B-P1-01 | Tokens, fonts, light/dark, zh/en | Done | `site/css/tokens.css`, `fonts.css` (Anton, Barlow Condensed, Inter, OFL, self-hosted) |
| B-P1-02 | BrandLogo, TeamLogo, CoverArtwork + original art | Done | `site/js/components.js`, `assets.manifest.js`, `assets/cover/*.svg` |
| B-P1-03 | Eligibility gate | Done | `site/js/editorial/eligibility.js`; 18 unit tests |
| B-P1-04 | Home spread + mobile cover | Done | screenshots below |
| B-P1-05 | Schedule, Review, Match Detail, Almanac entry | Done | Almanac is a labelled "coming later" button, not a page |
| B-P1-06 | Browser acceptance | Done | `npm run test:e2e`: 172/172 checks |

## Test results (this commit)

- `npm run test:unit`: 18 pass, 0 fail.
- `npm run test:e2e`: 172/172 pass. Coverage:
  - home at 1440/1280/390/360 × zh/en × light/dark: no overflow, no script errors, brand strings, exactly one %, spread vs cover-first, English edition has no Chinese text;
  - empty issue (U-01); bypass fixture (human gate) on home and review; DEMO refused in production mode;
  - logo and mark failover (U-05); image allow-list with no athlete kind (U-07);
  - language and theme kept across Schedule, Review, Today and Match links;
  - navigation (desktop and mobile tabs), theme toggle and persistence, language switch, Almanac and coming-soon notices, lead → Match Detail, internal-only read shows no number;
  - Match / Schedule / Review at 390 and 360 without overflow.

Fonts: the test machine has no network; Latin display fonts are self-hosted, CJK uses the
system Noto Sans CJK TC, so these screenshots match what a reader sees.

## Visual comparison

`compare-visual-master.jpg`: visual master (left) next to the browser render at 1440 and
390. Layout, hierarchy and density follow the master; deviations are listed in
`docs/VISUAL_MAPPING_P1.md`. The two visible quality gaps are real team logos (pending
rights, issue #5) and the cover illustration (original vector instead of a painterly
image; the slot accepts a better rights-cleared file without layout changes).

## Not done / next

- B-P2-01 World read-only contract needs A-side review (issue #3).
- B-P3 editorial workflow (issue #4).
- Licensed logo files (issue #5, Founder).
