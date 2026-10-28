# ADR-B002 — The magazine renders only eligible content; World is read-only

**Status:** Accepted. Implements Founder locks B-07, B-08, B-09, M-01, M-02, C-1, C-3, C-4.

## Decision

The renderer receives an issue (World packages + editorial items + an Editor
layout plan) and passes every slot through `site/js/editorial/eligibility.js`.
The UI never invents, ranks by popularity, or computes.

1. **Editorial item** renders only if `publishState = PUBLISHED`,
   `homeEligible = true`, it has `approvalReceiptRef`, at least one `sourceRef`,
   and it is inside `validUntil`.
2. **Human gate.** If the item has any of `MAJOR_NEWS`, `UNVERIFIED_RUMOR`,
   `SENSITIVE_NEWS`, `EXCLUSIVE_CLAIM`, carries the `BREAKING_NEWS` or
   `MOSPORT_EXCLUSIVE` label, or is a `REVIEW`, it needs
   `approval.mode = HUMAN` with an approver id and time. Otherwise it is dropped.
   Treating the Breaking label as human-required is a conservative default
   (spec 03 §4.2 "PROPOSED"), adjustable later by the Founder.
3. **World number.** The home page shows at most one number per game:
   `homeWinProbability`, only if the World package is `ISSUED`,
   `distributionEligibility = PUBLIC` and its version is locked
   (`INITIAL` or `FINAL_CONFIRMED`/`FINAL_UPDATED`). Otherwise the number is not
   rendered at all. Interval detail stays on Match Detail.
4. **Games on the magazine** need an eligible World read (or a LIVE game with a
   locked pregame read). Schedule-only and postponed games without a news story
   stay on Schedule.
5. **Empty means absent.** A slot with no eligible item produces no DOM node and
   no reserved height.
6. **DEMO fence.** A fixture with `mode: 'DEMO'` renders only when the site runs
   in prototype mode, and every page then shows a DEMO mark.

## Not decided here

Quantitative thresholds for "major", approver roles/SLA, source lists (spec 01 §E).

## Scope limit (added after independent review, 2026-10-28)

The gate above is a **client-side render gate for the prototype**. It is not a trusted
publishing authority. The `?mode=` switch is a test toggle, and `containsPerson` and
similar image flags are self-declared metadata, not image verification. Production
publishing must enforce authorised release decisions upstream (P2/P3) and deliver only
validated public data. The renderer then stays a second line of defence.
