# B-P1 plan vs actual — 2026-10-28

As of 2026-10-28 16:30 Asia/Taipei (zoom addendum, then the P1 correction: zoom kept across pages + Asset-ready registry). Day **OPEN**.

| WP | Planned | Actual | Evidence |
|---|---|---|---|
| B-P1-01 | Tokens, fonts, light/dark, zh/en | Done | `site/css/tokens.css`, `fonts.css` (Anton, Barlow Condensed, Inter, OFL, self-hosted) |
| B-P1-02 | BrandLogo, TeamLogo, artwork slots | Done (superseded by B-P1-08 registry) | `site/js/components.js` |
| B-P1-03 | Eligibility gate | Done | `site/js/editorial/eligibility.js`; 18 unit tests |
| B-P1-04 | Home spread + mobile cover | Done | screenshots below |
| B-P1-05 | Schedule, Review, Match Detail, Almanac entry | Done | Almanac is a labelled "coming later" button, not a page |
| B-P1-06 | Browser acceptance | Done | `npm run test:e2e`: 282/282 checks |
| B-P1-07 | Magazine Reader Zoom (Founder addendum, issue #2), kept across pages | Done, awaiting Founder review | `site/js/reader.js`; `tests/e2e/zoom-suite.js` |
| B-P1-08 | Asset-ready registry and slots | Done, awaiting Founder review | `site/data/asset-registry.json`, `site/js/assets/`, `docs/ASSET_SLOTS.md`; `tests/unit/registry.test.js`, `tests/e2e/asset-suite.js` |

## Test results (this commit)

- `npm run registry:check`: registry valid, every file present with matching sha256, generated copy in sync.
- `npm run test:unit`: **27 pass**, 0 fail (18 eligibility + 9 registry).
- `npm run test:e2e`: **282/282 pass** (172 base + 79 zoom addendum + 31 for zoom persistence, mobile pinch and asset slots). Coverage:
  - home at 1440/1280/390/360 × zh/en × light/dark: no overflow, no script errors, brand strings, exactly one %, spread vs cover-first, English edition has no Chinese text;
  - empty issue (U-01); bypass fixture (human gate) on home and review; DEMO refused in production mode;
  - logo and mark failover (U-05); image allow-list with no athlete kind (U-07);
  - language and theme kept across Schedule, Review, Today and Match links;
  - navigation (desktop and mobile tabs), theme toggle and persistence, language switch, Almanac and coming-soon notices, lead → Match Detail, internal-only read shows no number;
  - Match / Schedule / Review at 390 and 360 without overflow;
  - zoom kept Today → Schedule / Review / Match → Today, Fit kept, kept on reload; mobile 390/360 emulated pinch 2× with tabs still working;
  - art slots present per page; **layout identical with and without art** at 1440 (100%), 1024 (fit), 390, 360 in zh and en; production policy drops placeholder art; a newer remote registry over http is applied, an invalid one (person in art) is ignored.

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
| State | Kept across the site (URL `?zoom=` on every internal link + this tab's session), across language/theme re-render and reload; a manual zoom survives resize; Fit re-fits |
| Mobile < 1024 px | No toolbar, no transform; native cover → TODAY scroll; viewport meta allows pinch-zoom (tested with the browser's page scale at 2×; tabs still work) |
| Browser zoom 200% | At 1440×900 this is 720×450 CSS px: the page reflows to the mobile layout, no sideways overflow, navigation reachable |

Zoom checks: Fit/+/−/100%/bounds/resize/reachability/keyboard/accessible names/unscaled nav/links when zoomed/no errors at 1440×900, 1280×800, 1024×768; en+dark and zh+dark bar labels and theme re-render; mobile 390 and 360; browser-zoom 200%.

Screenshots: `zoom-mobile-390-pinch-2x.jpg`, `zoom-mobile-360-pinch-2x.jpg`, `zoom-mobile-390-tabs.jpg`, `zoom-1440-fit.jpg`, `zoom-1440-100.jpg`, `zoom-1440-200-bottom-right.jpg`, `zoom-1280-fit.jpg`, `zoom-1024-fit.jpg`, `zoom-1440-en-dark-toggled.jpg`.

## Asset-ready

See `docs/ASSET_SLOTS.md`. Five art slots (`cover-desktop-art`, `cover-mobile-art`, `today-feature-art`, `match-hero-art`, `editorial-card-art`) plus `brand-mark` and per-team logo entries, all in `site/data/asset-registry.json` with versions, sha256, rights, provenance, RWD crops (desktop/mobile focal points), safe zones and a themed fallback. Components only name slot ids. Current art versions are `PLACEHOLDER` vectors (not final; never shown in production). Evidence: `asset-1440-art.jpg` vs `asset-1440-fallback.jpg`, `asset-390-art.jpg` vs `asset-390-fallback.jpg`.

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
