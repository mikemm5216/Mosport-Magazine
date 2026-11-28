# MOSPORT-B Founder Decision — Reader v3 direction, 2026-11-28

**Status words** follow `../2026-10-28-spec-lock/01_FOUNDER_DECISION_LOCK.md`:
`LOCKED` = the Founder decided it; `DELEGATED` = the Founder told the assistant to
decide, and the call below is that decision, open to Founder correction in review;
`PROPOSED` = a design proposal that needs a decision; `PENDING` = waiting on a
Founder record that does not exist yet.

**Source**: Founder conversation with Claude Code on 2026-11-28 (Asia/Taipei),
reviewing the live site `https://www.mosport.app/` at 1440×900, 1280×800 and
390 px. The Founder's verdict on the live site: team logos missing makes it
empty; a sports site should be full of information and ours is empty; the reader
zoom controls must not be shown to readers. The Founder then approved the v3
mock-ups (`VISUAL_REFERENCE_V3_HOME.png`, `VISUAL_REFERENCE_V3_MATCH.png`) and
asked for them to be taken into MOSPORT-B.

The 2026-10-28 spec lock is **not edited** (its files are checksummed). This
file records which of its rules the 2026-11-28 decisions supersede.

## A. Decisions

| ID | Status | Decision | Supersedes / relation |
|---|---|---|---|
| V3-01 | LOCKED | **No reader zoom toolbar.** `READER ZOOM`, `Fit width`, `Fit page`, `− / % / +`, `100%` and the `Keys` hint are removed from the reader. Layout adapts to the viewport by itself (fluid type and grid), never by scaling the whole page. | Supersedes `docs/READER_DEFAULT_ZOOM.md` (Fit Width default + Fit Page button). |
| V3-02 | LOCKED | **Drop the literal two-page spread.** The magazine identity is carried by the masthead, type, colour and a full-width **cover band** on Today, not by a left-cover / right-page book that has to be zoomed. Mobile follows the same order in one column. | Supersedes the layout half of B-03 and of `02_UI_PRODUCT_HANDOFF.md` §1 / §4.1 ("desktop left cover + right Today"). B-01, B-02, B-04, B-05, B-06, B-07 stay in force. |
| V3-03 | LOCKED | **v3 is the visual reference for layout.** `VISUAL_REFERENCE_V3_HOME.png` and `VISUAL_REFERENCE_V3_MATCH.png` in this folder replace `VISUAL_REFERENCE_CURRENT.png` as the layout reference. Like the earlier master, the images are reference only: every score, story and number in them is illustrative of the slot, not product data. | Supersedes `VISUAL_REFERENCE_CURRENT.png` as layout master. Brand rules unchanged. |
| V3-04 | DELEGATED | **A factual scores layer is allowed on Today, separate from editorial slots.** Today may show a league score rail and an all-games board (status, line score, team record) for every game of the day. These are facts from MOSPORT-A's schedule/result package, not editorial picks or predictions. Editorial slots (cover lines, lead story, analysis, review) keep every eligibility rule of `02` §3.1 items 1–4, 6 and 7. | Amends `02` §3.1 item 5 and B-08 only for this data layer. Schedule remains the full list. |
| V3-05 | DELEGATED | **No per-player box-score lines.** Match Detail and Today use team-level facts only: line score, team shooting splits, rebounds, assists, steals, blocks, turnovers, points off turnovers, paint and fast-break points, largest lead. No individual PTS / REB / AST / PRA. | Reaffirms `02` §4.3 and C.8. |
| V3-06 | LOCKED | **No public win-probability number for now.** Today and Match Detail show reads (Verdict / Because / But / Watch) and, when qualified, centre-neutral advantage bars; no percentage is shown until the Founder lifts this. | Defers B-09 / `02` §4.1's single qualified main number. |
| V3-07 | LOCKED (slot) / PROPOSED (content) | **Community is wanted.** Today has a "Coaches" section for role-B MOSPORT persona columns and Coach Arena. Until real content exists the section renders nothing in production; in prototypes it is labelled DEMO. No invented picks, records, comment counts or votes. | Builds on ROADMAP §2 role B (Beta-1) and Coach Arena (B #17). Does not move either into Beta-0. |
| V3-08 | LOCKED (shell) / PROPOSED (baseball labels) | **One shell for NBA and baseball.** The sport switch carries NBA, MLB and CPBL. Baseball shows an honest state (for example "off-season" or "coming soon"); it must not imply that baseball predictions are published. | Extends C.7 (single App Shell). |
| V3-09 | PENDING | **Team logos.** The Founder intends to record the usage basis for NBA team marks (path 2 of `docs/LOGO_PROVENANCE_AUDIT.md`). Until that record exists, `<mo-team-logo>` keeps the tricode fallback, no logo file is committed, and the reference images here show neutral tricode placeholders. | Follows B-04 and the audit; nothing here grants a licence. |

## B. V3-09 record the Founder still has to fill

To unblock logos, a dated Founder record (new file in `docs/founder/`) needs:

- usage basis and its limits (licence / written permission / Founder legal decision, e.g. nominative use);
- exact source of the files (which repository or distributor, which edition when two exist);
- scope: which surfaces (web, social exports, print), which sizes, any required notices;
- review date or condition for revisiting.

Then each team gets a `teamLogos.entries.<TRICODE>` version with `rights.status`
and the licence reference, and `npm run registry:build`, as the audit describes.

## C. What this does not do

- It does not change Beta-0 scope, gates, World authority, human approval of
  Public Postgame Review, DEMO labelling or the no-fabrication rule.
- It does not authorise implementation, a new data source, deployment or spend.
  Each implementation task still needs its EIC and a Capacity ALLOW under
  Issue #170, and data for V3-04/V3-05 must come from MOSPORT-A's package, not
  from scraping (`docs/sources/FREE_SOURCE_INVENTORY.md`).
