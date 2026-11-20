# Real default matchup — editorial facts for NBA Cup SAC @ LAL

Status: **unmerged Draft PR #21; scoped operator checks only, no independent review**.

## Change / editorial decision
The production/default entry `0022600051` no longer places generic “賽前看點” above a missing message when official factual context exists. It now features “13 分差距能追回嗎？國王盃賽再戰湖人” and a bilingual matchup lede based on a November 4 Lakers 116 – Kings 103 result and the November 20 NBA Cup West Group C rematch. Neither constitutes a World prediction. The original no-snapshot / no-probability state remains visible.

## Official source provenance (checked Nov 19, 2026)
- NBA scheduled matchup: https://www.nba.com/game/sac-vs-lal-0022600051 (SAC away / LAL home; Nov 20 10:00 PM ET; NBA Cup West Group C; last matchup lists Lakers 116 – Kings 103 on Nov 4)
- Official prior final: https://www.nba.com/game/lal-vs-sac-0022600185 (LAL 116 – SAC 103; Nov 4, 2026)
- Sacramento club NBA Cup group schedule: https://www.nba.com/kings/news/kings-announce-2026-27-regular-season-schedule
- Editorial observation timestamp stored in JSON: `2026-11-19T10:42:38Z`; it is **later** than the saved schedule observation `2026-11-19T07:58:50Z`.
- `editorial.factsFingerprint` is a SHA-256 **integrity hash of the saved editorial fields**, not a digest of the NBA web page and not proof of authenticity. Independent editorial/source QA remains necessary.

## Existing Implementation Check (EIC)
Searched: `site/js/data/providers.js` (saved schedule provider), `site/js/contracts/contracts.js` (strict schedule validation), `site/js/data/pipeline.js` (single public model), `site/js/pages/home.js` (default savedGame rendering), `site/js/i18n.js`, `site/css/home.css`, `tests/unit/schedule-context.test.js`, `tests/unit/home-spread.test.js`. Found no existing sourced per-game editorial facts in this schedule payload. Reused all those existing paths; no new provider, editor registry, World gate, scoring model, or deployment.

## Boundary / behavior
- Optional `editorial` entry in the **existing** `mosport-b/schedule-entry@1` schema: strictly shaped `CUP_REMATCH`, game IDs/teams/score/date/observedAt/official NBA URLs, integrity hash.
- Contract rejects mismatched subject, prior teams, winner, unsafe/mismatched source URLs, unknown fields, or editorial timeline past `validUntil`; if absent, old schedule fallback remains.
- Public pipeline projects the factual angle only after its own observation time and before saved schedule expiry. Stale/no-source/wrong-game do not expose the editorial title.
- Home cover and TODAY hero use localized templates with verified numeric facts; prior-game official link is visible. Existing snapshot and World public eligibility controls stay unchanged; NBA Cup facts are **not** injected into a World model.

## Verification/limits
- Pre-commit: all six changed JavaScript/test files passed V8 syntax compilation; isolated actual `validateSchedule` / `pipeline.run` / `home.render` checks established bilingual real-title rendering, 103–116 lede, separate missing state, no World, stale/future suppression, invalid-source rejection and official source link.
- New targeted unit tests added to existing suites; **full Node suite (170 prior tests plus added) not executed in this environment**, and no browser visual/E2E acceptance was available.
- No external publishing, live refresh, real pregame snapshot, PR merge, independent Capacity agent, or independent Boundary review. This work stays Draft pending those checks.
