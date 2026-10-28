# B-P1 visual mapping — visual master → live components

Visual master: `docs/founder/2026-10-28-spec-lock/VISUAL_REFERENCE_CURRENT.png`.
Side-by-side evidence: `docs/reports/2026-10-28-b-p1/compare-visual-master.jpg`.

## Element map

| Visual master | Implementation | Notes |
|---|---|---|
| Open spread on a desk, left cover / right inner page, spine | `.spread` grid (cover 46% / TODAY 54%), spine shading on both facing edges, stacked page edges | ≥ 1024 px |
| Cover meta: VOL / NO. / date, NBA EDITION | `.cv-meta` from `issue.volume/number/date/edition` | Localised (zh `第 305 期`) |
| MOSPORT masthead, MORE THAN SPORT | `.cv-name` (Anton, live text), `.cv-slogan` | Fixed brand strings (B-01) |
| THIS ISSUE / NBA / GAME DAY / tagline | `.cv-topic` from `issue.topic` | Topic is replaceable (B-02); tagline localised |
| BREAKING NEWS / MOSPORT EXCLUSIVE teasers | `.teaser` from Editor `layout.cover`, only if `resolveIssue` passes them | Both require human approval; absent → no DOM |
| `+` cover lines | `.cv-lines`, derived only from items that render | Never written by hand |
| Cover illustration (ball, hoop, arena, court) | `<mo-cover-artwork name="gameday">` → `assets/cover/cover-gameday.svg` (original vector) | Swappable through the manifest |
| Runhead, page number 02 | `.runhead`, `.pg-foot` | |
| TODAY + date + slate | `.today-mast`, `.today-date`; slate counts from the issue | |
| Lead card: arena panel, two logos, version chip, verdict, big %, time/why, CTA | `.lead`; arena = `<mo-cover-artwork name="arena">`; logos = `<mo-team-logo>`; % = `worldPercent()` | Only when the World package is ISSUED + PUBLIC + locked |
| 今日其他比賽 cards + 查看全部 + chevron | `.g-rail` of `.g-card`, `.g-next` scrolls the rail; 查看全部 → Schedule | Status chip from World version / LIVE |
| 昨日檢討 card | `.story-review` | Human-approved REVIEW only |
| DEMO footer | `.pg-foot` with DEMO badge | |
| Mobile: cover first screen, TODAY / SCHEDULE / REVIEW tabs, NBA / Baseball / Football tabs, date, lead card | `.pg-cover` (100svh), `.mnav`, `.pg-inner` | < 1024 px |

## Intentional deviations (written Founder rules override the image)

| In the image | In the build | Rule |
|---|---|---|
| `60% 區間 54–67%` next to `61%` on home | Removed from home; kept on Match Detail | B-09, U-04 |
| 三層內容分開看 (World / Evidence / External) block and WORLD/EVIDENCE/EXTERNAL cover stack | Removed. That slot holds a STREAK WATCH story; the cover corner holds **Be Your Own Coach** | B-08; B-02 |
| MIA @ MIL postponed card "本場暫無預測" | Not on the magazine (no World read); listed on Schedule | Spec 02 §3.1 #5–6 |
| `接近均勢，尼克 52%` (a second %) | Card shows the verdict text only | "首頁只有一個合格的主要勝率數字" |
| Real NBA team logos | `<mo-team-logo>` slots with tricode-on-team-colour fallback; manifest entries empty | B-04 (rights not verified). Issue #5 |
| Desktop image has no navigation | Slim top bar above the desk: Today / Schedule / Review, Almanac (coming later), Sport Switch, language, theme | C-7 navigation contract |
| Mobile search icon | Not built (no search feature exists); language and theme controls instead | No fake features |
| Photographic, painterly cover | Original vector illustration | No image generation used; the slot accepts a richer rights-cleared file later |

## Language

zh edition: interface in 繁中; brand strings, editorial labels (BREAKING NEWS, MOSPORT
EXCLUSIVE, STREAK WATCH) and the TODAY masthead stay Latin, as in the visual master.
en edition: all text English (checked by the e2e suite: no CJK text visible except the
`繁中` language button).
