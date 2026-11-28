# Reader v3 layout spec (Today and Match Detail)

Companion to `01_FOUNDER_DECISION_V3.md`. Reference images:
`VISUAL_REFERENCE_V3_HOME.png` (Today, 1440 px) and
`VISUAL_REFERENCE_V3_MATCH.png` (Match Detail, final state, 1440 px). Design
tokens are the existing `site/css/tokens.css` (paper, navy, blue, orange, red,
yellow) and the self-hosted Anton / Barlow Condensed / Inter fonts.

Every section below follows the existing rules: no slot is filled with invented
content, an empty slot is removed from the DOM, and DEMO content is labelled.

## 1. Shell (all pages)

| Part | Content | Rules |
|---|---|---|
| Top bar | MOSPORT mark and wordmark; Today, Schedule, Standings, Review, Coach Arena; sport switch NBA / MLB / CPBL; 繁中 / EN; light / dark | No zoom controls (V3-01). Standings and Coach Arena appear only when their page exists. Baseball shows an honest state (V3-08). |
| Score rail | One chip per game of the day: status (LIVE + period and clock, Final, scheduled time), both teams with logo slot, score | Facts from MOSPORT-A only (V3-04). Scrolls sideways inside its own box; the page never scrolls sideways. |
| Footer | Data source and capture time | Always shows where the numbers came from. |

## 2. Today

| Section | Content | When it renders |
|---|---|---|
| Cover band | Issue line (topic, date, Taipei), `MOSPORT` masthead, `MORE THAN SPORT`, `BE YOUR OWN COACH`; up to three cover lines (label + headline + one-line deck); lead game card (logos, score or tip-off, line score, one action) | Masthead and slogans always. Cover lines only from eligible editorial items (STREAK WATCH, postgame, live, Breaking / Exclusive only when they qualify). Lead card follows the Editor's layout plan. |
| TODAY board | All games of the day as cards: status, venue / broadcaster, both teams (logo slot, name, record), line score by period, total; filter chips All / Live / Final | Always when the day has games (V3-04). A read appears on a card only when a qualified locked read exists; otherwise the card has no read block (no "no read" placeholder). |
| Coaches | Persona columns (role B) and Coach Arena entry | Only with real content (V3-07); prototypes label it DEMO. |
| Side rail | Team numbers of the day (team-level only), STREAK WATCH, standings top 6 per conference | Each block only when its data is present; streaks derive from official results with evidence. |

## 3. Match Detail

| Section | Content | Rules |
|---|---|---|
| Hero | Back link to Schedule (Schedule is the active tab), venue, broadcaster, tip-off; both teams with large logo slots, record, conference rank, home/away; score and state; line score | One state label only (Scheduled / Live / Final / Postponed / Cancelled). Score order is always away – home, the winner emphasised. |
| Tabs | Overview, Team stats, Pregame read × receipt, Discussion | A tab without content is hidden. |
| How it went | Two or three factual beats derived from line score and team stats | Role A content: facts only, sourced, no player stat lines (V3-05). |
| Team stats | Mirrored bars per stat, both teams | Team-level only (V3-05). |
| Pregame read × receipt | Verdict / Because / But / Watch, each with its postgame outcome | Only for games with a qualified locked read; never rewritten after lock; Public Review content still needs human approval. |
| Discussion | Coach Arena thread for the game | Only when the community feature is live; no seeded comments. |
| Side rail | Other games that day; standings impact | Facts from MOSPORT-A. |

## 4. Data the frontend needs from MOSPORT-A

Per game: id, league, tip-off, status, period and clock when live, score, line
score by period, venue, broadcaster, both teams' records. Per team per game:
FG, 3PT, FT made-attempted, rebounds, assists, steals, blocks, total turnovers,
points off turnovers, points in the paint, fast-break points, largest lead.
Per conference: seed, W-L, games back, streak. Each with source and capture
time. Fields that are missing stay missing and their element is not rendered.

## 5. Acceptance (for the implementation tasks, not this document)

1. No zoom toolbar at any width; 1440, 1280 and 390 px render without
   horizontal page scroll and without scaling the page.
2. Body copy stays at least 14 px at every width.
3. Every number on screen traces to MOSPORT-A data with source and time; no
   DEMO content in production mode.
4. No per-player stat line, no win percentage (V3-05, V3-06).
5. Logos through `<mo-team-logo>` once the V3-09 registry entries land; tricode fallback for any team without one.
6. Real browser screenshots at 1440, 1280 and 390 px, light and dark, are
   attached to the PR.
