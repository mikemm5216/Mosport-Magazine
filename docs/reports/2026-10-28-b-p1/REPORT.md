# B-P1 plan vs actual — 2026-10-28

As of 2026-10-28 15:40 Asia/Taipei, updated 15:30 for the Founder Reader Zoom addendum. Day **OPEN**.

| WP | Planned | Actual | Evidence |
|---|---|---|---|
| B-P1-01 | Tokens, fonts, light/dark, zh/en | Done | `site/css/tokens.css`, `fonts.css` (Anton, Barlow Condensed, Inter, OFL, self-hosted) |
| B-P1-02 | BrandLogo, TeamLogo, CoverArtwork + original art | Done | `site/js/components.js`, `assets.manifest.js`, `assets/cover/*.svg` |
| B-P1-03 | Eligibility gate | Done | `site/js/editorial/eligibility.js`; 18 unit tests |
| B-P1-04 | Home spread + mobile cover | Done | screenshots below |
| B-P1-05 | Schedule, Review, Match Detail, Almanac entry | Done | Almanac is a labelled "coming later" button, not a page |
| B-P1-06 | Browser acceptance | Done | `npm run test:e2e`: 251/251 checks |
| B-P1-07 | Magazine Reader Zoom (Founder addendum, issue #2) | Done, awaiting Founder review | `site/js/reader.js`; zoom suite in `tests/e2e/zoom-suite.js` |

## Test results (this commit)

- `npm run test:unit`: 18 pass, 0 fail.
- `npm run test:e2e`: 251/251 pass (172 before the zoom addendum + 79 zoom checks). Coverage:
  - home at 1440/1280/390/360 × zh/en × light/dark: no overflow, no script errors, brand strings, exactly one %, spread vs cover-first, English edition has no Chinese text;
  - empty issue (U-01); bypass fixture (human gate) on home and review; DEMO refused in production mode;
  - logo and mark failover (U-05); image allow-list with no athlete kind (U-07);
  - language and theme kept across Schedule, Review, Today and Match links;
  - navigation (desktop and mobile tabs), theme toggle and persistence, language switch, Almanac and coming-soon notices, lead → Match Detail, internal-only read shows no number;
  - Match / Schedule / Review at 390 and 360 without overflow.

Fonts: the test machine has no network; Latin display fonts are self-hosted, CJK uses the
system Noto Sans CJK TC, so these screenshots match what a reader sees.

## Magazine Reader Zoom

| Behaviour | Implementation |
|---|---|
| Controls | Toolbar under the site navigation: Fit Page, −, current %, +, 100%. `role="toolbar"`, labelled buttons, `aria-pressed` on Fit/100%, live `<output>` for the % |
| What scales | The whole spread (cover + TODAY) as one unit, via `transform: scale()` on a fixed 1360 px natural spread inside a scroll viewport; a sizer element carries the scaled size so scrollbars are exact. The site navigation never scales |
| Fit Page | Default. Largest scale showing the whole spread in the reader's width **and** height (after the nav and toolbar); recomputed on window resize and font load |
| Steps and bounds | 10% grid, 50%–200%; − / + disabled at the limits |
| Reachability | Reader viewport scrolls in both axes; at 200% every edge and the page number can be scrolled into view |
| Keyboard | Focus in the reader: `+` `−` `0` (100%) `F` (fit). Buttons work with Tab + Enter/Space. Ctrl/Cmd ± are left to the browser |
| State | Zoom survives language/theme re-render; a manual zoom survives resize; Fit re-fits |
| Mobile < 1024 px | No toolbar, no transform; native cover → TODAY scroll; viewport meta allows pinch-zoom |
| Browser zoom 200% | At 1440×900 this is 720×450 CSS px: the page reflows to the mobile layout, no sideways overflow, navigation reachable |

Zoom checks: Fit/+/−/100%/bounds/resize/reachability/keyboard/accessible names/unscaled nav/links when zoomed/no errors at 1440×900, 1280×800, 1024×768; en+dark and zh+dark bar labels and theme re-render; mobile 390 and 360; browser-zoom 200%.

Screenshots: `zoom-1440-fit.jpg`, `zoom-1440-100.jpg`, `zoom-1440-200-bottom-right.jpg`, `zoom-1280-fit.jpg`, `zoom-1024-fit.jpg`, `zoom-1440-en-dark-toggled.jpg`.

## Visual comparison

`compare-visual-master.jpg`: visual master (left) next to the browser render at 1440×900
in Fit Page and at 100%, and at 390. Layout, hierarchy and density follow the master; deviations are listed in
`docs/VISUAL_MAPPING_P1.md`. The two visible quality gaps are real team logos (pending
rights, issue #5) and the cover illustration (original vector instead of a painterly
image; the slot accepts a better rights-cleared file without layout changes).

## Not done / next

- B-P2-01 World read-only contract needs A-side review (issue #3).
- B-P3 editorial workflow (issue #4).
- Licensed logo files (issue #5, Founder).
