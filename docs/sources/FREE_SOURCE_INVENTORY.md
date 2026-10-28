# B-P3-03 — Free official sources for the NBA MVP (inventory, 2026-10-29)

Checked 2026-10-29 (Asia/Taipei). These are public pages read once each, at low volume, read-only.
Nothing is scheduled, nothing is published, and no paid API is used. "Free to read" is **not**
"free to reuse": every source below stays `rightsStatus: UNVERIFIED` for publication until a
licence or a Founder or legal decision says otherwise. The rights QA in `risk.js` fails any story
built on an UNVERIFIED source.

## Terms that govern NBA-operated sites

[NBA.com Terms of Use](https://www.nba.com/terms) (footer: "LAST UPDATED: July 13, 2026"), read
2026-10-29:
- Downloading is allowed "only for your personal, noncommercial use".
- "No Basketball Content from the Services may be reproduced, republished, uploaded, posted,
  modified, reused … without the written permission of the Operator".
- Users may not "… link to, or use any materials of the Services for public or commercial
  purposes".
- Section 9 says NBA Statistics "may not be used in connection with any fantasy game or other
  commercial product or service", nor in a regularly updated statistics database, without consent.

The official injury report page also carries a copyright notice: NBA.com content may not be
duplicated, redistributed or manipulated in any form.

**Consequence for B:** a published MOSPORT story may state facts in its own words. Whether it may
cite, link or rely on these pages commercially is a legal question this inventory does not settle.
Until it is settled, these sources are research and verification inputs, recorded with receipts,
and are not a publishing basis.

## Sources

| Source | URL | Fields available | Checked | Limits | Rights evidence | Citation form | State in B |
|---|---|---|---|---|---|---|---|
| NBA official injury report | [official.nba.com injury report page](https://official.nba.com/nba-injury-report-2021-22-season/); PDFs at `https://ak-static.cms.nba.com/referee/injury/Injury-Report_YYYY-MM-DD_HH_MMAM.pdf` | Report stamp (ET); game date; game time "HH:MM (ET)" with **no AM/PM**; matchup `AWY@HOM`; team; player name as printed; status (Out, Doubtful, Questionable, Probable, Available, team-level NOT YET SUBMITTED); reason | Page fetched 2026-10-29: 2026-27 reports listed every 15 minutes. One 2024 PDF read for layout only. The 2026-10-28 11:15 AM PDF returned a client error from this environment | PDF, so a text layer is needed. Team reporting deadlines per the page: 5 p.m. local the day before; 1 p.m. on the second night of a back-to-back; a game-day window. Player ids are not printed. Tip-off cannot be derived (no AM/PM) | NBA Terms above; page copyright notice | "NBA official injury report, {stamp} ET" + link (pending legal check) | **Offline parser implemented** (`site/internal/js/sources/injury-report.js`) and tested on a synthetic fixture. No live fetching |
| NBA.com schedule / scoreboard JSON | `https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json`, `…/liveData/scoreboard/todaysScoreboard_00.json` | Unknown from here | 2026-10-29: client error. MOSPORT-A's audit also records "The NBA CDN endpoint returned access denied" (`Mosport-NBA docs/operations/NBA-OFFICIAL-BOX-ADAPTER.md:138` @ `8b83093`) | Not reachable from this environment | NBA Terms (statistics clause) | — | Not used. MOSPORT-A owns schedule and result truth (ADR-007); B should take games from A's package, not scrape them |
| NBA Communications | [pr.nba.com](https://pr.nba.com/) | Press release title, date, body (trades, discipline, awards, schedule announcements) | Found by search 2026-10-29; no parser | HTML, no feed confirmed. A release can be a MAJOR_NEWS trigger | NBA Terms | Release title + date + link; summary in MOSPORT's own words | Candidate for B-P3 next step (manual source receipts) |
| Team official news pages | Team sites on NBA.com | Team announcements, injury updates | Not checked individually | 30 sites; formats vary | NBA Terms | As above | Not started |
| NBA official YouTube channel | YouTube | Video title, publish time, link | Not checked | Embedding is governed by YouTube's terms and the uploader's embed setting; no download or re-upload | Not verified here | Title + time + link or official embed | Not started |
| ESPN endpoints | `site.api.espn.com` (unofficial) | Scores, schedules | Used by MOSPORT-A as a **provisional** source (ADR-007), not official | Undocumented and unofficial | Not verified here | — | Not used by B |
| Social platforms (X, Threads, Facebook) | — | Public posts as observed | No free API is assumed (Founder M-05) | Manual observation only; kind RUMOR or SOCIAL_REACTION; views and mentions are `null + reason` unless lawfully measured | Platform terms not verified | Account + time + link | Policy cases only (M-02) |

## What was **not** done

- No live connector, schedule or crawler. No full-text storage of league content: the parser
  fixture is synthetic, with fictional players.
- No bypass of logins, paywalls or access controls. The CDN endpoints that refused access were left
  alone.
- No source is marked "connected": the parser works on a text file a person provides.

## Next steps (need decisions)

1. Legal or Founder decision on citing and linking NBA-operated pages in a commercial magazine
   (the Terms' "link to … for public or commercial purposes" clause).
2. If allowed: a manual-capture flow in the internal editor (paste report text → parse → source
   receipt + Evidence Candidates), still without scheduling.
3. A text-layer extractor: `pdftotext` is a local tool, not a service, so no paid dependency.
