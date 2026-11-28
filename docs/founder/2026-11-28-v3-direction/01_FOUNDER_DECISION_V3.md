# MOSPORT-B Founder Decision — Reader v3 direction, 2026-11-28

**Status words** follow `../2026-10-28-spec-lock/01_FOUNDER_DECISION_LOCK.md`:
`LOCKED` = the Founder decided or approved it; `PROPOSED` = a design proposal
that needs a decision. V3-04 and V3-05 were first delegated to the assistant
and then approved by the Founder; V3-09 was released by the Founder (§B).

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
| V3-04 | LOCKED (delegated, then approved by the Founder 2026-11-28) | **A factual scores layer is allowed on Today, separate from editorial slots.** Today may show a league score rail and an all-games board (status, line score, team record) for every game of the day. These are facts from MOSPORT-A's schedule/result package, not editorial picks or predictions. Editorial slots (cover lines, lead story, analysis, review) keep every eligibility rule of `02` §3.1 items 1–4, 6 and 7. | Amends `02` §3.1 item 5 and B-08 only for this data layer. Schedule remains the full list. |
| V3-05 | LOCKED (delegated, then approved by the Founder 2026-11-28) | **No per-player box-score lines.** Match Detail and Today use team-level facts only: line score, team shooting splits, rebounds, assists, steals, blocks, turnovers, points off turnovers, paint and fast-break points, largest lead. No individual PTS / REB / AST / PRA. | Reaffirms `02` §4.3 and C.8. |
| V3-06 | LOCKED | **No public win-probability number for now.** Today and Match Detail show reads (Verdict / Because / But / Watch) and, when qualified, centre-neutral advantage bars; no percentage is shown until the Founder lifts this. | Defers B-09 / `02` §4.1's single qualified main number. |
| V3-07 | LOCKED (slot) / PROPOSED (content) | **Community is wanted.** Today has a "Coaches" section for role-B MOSPORT persona columns and Coach Arena. Until real content exists the section renders nothing in production; in prototypes it is labelled DEMO. No invented picks, records, comment counts or votes. | Builds on ROADMAP §2 role B (Beta-1) and Coach Arena (B #17). Does not move either into Beta-0. |
| V3-08 | LOCKED (shell) / PROPOSED (baseball labels) | **One shell for NBA and baseball.** The sport switch carries NBA, MLB and CPBL. Baseball shows an honest state (for example "off-season" or "coming soon"); it must not imply that baseball predictions are published. | Extends C.7 (single App Shell). |
| V3-09 | LOCKED (Founder release 2026-11-28; see §B) | **Team logos released by the Founder.** The Founder approved using the NBA team marks (path 2 of `docs/LOGO_PROVENANCE_AUDIT.md`, a Founder decision). The record in §B states what was and was not specified. Wiring the files into `site/data/asset-registry.json` is a separate implementation task; until it lands, `<mo-team-logo>` keeps the tricode fallback, and the reference images here still show tricode placeholders. | Follows B-04 and the audit. This is a Founder business decision, not a licence from the NBA or its teams. |

## B. V3-09 Founder logo record (2026-11-28)

| Field | Record |
|---|---|
| Decision | The Founder released NBA team-logo use for MOSPORT-B on 2026-11-28 (Asia/Taipei), in conversation with Claude Code: 「直接標註三條我都放行」, covering this item. |
| Usage basis | Founder decision. The Founder did **not** name a specific legal basis (licence, written permission or nominative use); none is claimed here. The Founder carries this decision. |
| File source | `mikemm5216/Mosport-Terminal` @ `ae608b2`, `frontend/public/logos/nba/*.png` (31 files, 500×500 RGBA; `was.png` and `wsh.png` are the same team). Where the repo-root copy `public/logos/nba/` differs (`gsw`, `nyk`, `sas`), the `frontend/` edition is the one released. The files' original source is still unrecorded, as the audit found. |
| Scope | Not specified by the Founder. Until the Founder widens it, this record covers the MOSPORT web reader only (`<mo-team-logo>` slots); social exports, print and paid surfaces need a separate Founder confirmation. Logos stay separate elements, never baked into artwork (B-04). |
| Review | No date set. Revisit on any rights complaint, a change of surface, or when a licence becomes available. |

Implementation (separate task, with its own EIC and Capacity ALLOW): add a
version under `teamLogos.entries.<TRICODE>` in `site/data/asset-registry.json`
with the file, sha256, a `rights.status` that the production render policy
accepts for a Founder decision, and a reference to this record; then
`npm run registry:build`.

## C. What this does not do

- It does not change Beta-0 scope, gates, World authority, human approval of
  Public Postgame Review, DEMO labelling or the no-fabrication rule.
- It does not authorise implementation, a new data source, deployment or spend.
  Each implementation task still needs its EIC and a Capacity ALLOW under
  Issue #170, and data for V3-04/V3-05 must come from MOSPORT-A's package, not
  from scraping (`docs/sources/FREE_SOURCE_INVENTORY.md`).
