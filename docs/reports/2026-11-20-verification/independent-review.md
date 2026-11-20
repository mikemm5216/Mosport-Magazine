本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

# Independent Boundary / QA — 2026-11-20

Reviewer: `/root/boundary_continue`, distinct from implementer/integrator `/root` and NBA operator `/root/nba_capture_eic`.

Review time: `2026-11-20T02:54:52.160422+00:00`. Policy: [Issue #170 Current execution policy](https://github.com/mikemm5216/Mosport-NBA/issues/170#current-execution-policy), independently read `2026-11-20T02:41:16Z`, updated_at `2026-11-19T07:32:46Z`. Both repositories' applicable AGENTS were read. Highest Magazine impact **L1**.

## Decision

**PASS, scoped to the reviewed Magazine copy, source refresh, existing pipeline boundaries, unit behavior and static content readability. Overall ready/merge/browser acceptance remains BLOCK.** This is an independent agent review, not a GitHub APPROVED review or deployment authorization.

- Base remote HEAD: `544709c3a84c92208a13b4e0afa4ca395484eef4`.
- Exact reviewed code manifest SHA-256: `5103a52c985e6d8c986252a044c91436361fde0fb445deae2d537bfedc840f34`.
- All **13** manifest source files independently rehashed for bytes, SHA-256 and Git blob SHA. These include the new round's ten paths and the prior editorial commit's unchanged CSS/contracts/pipeline.
- The later commit must retain these exact source blobs. Integration must read the remote commit/tree back; any source difference invalidates this scoped receipt until reviewed.

## Independent checks

1. Reran the complete Node suite: **173/173 PASS**, 0 fail, 0 skip. [Independent output](independent-unit-tests.txt). The observed baseline failure was a test that corrupted source chronology to simulate expiry; advancing the read clock now tests STALE without weakening validation.
2. Inspected current key diff and the earlier `544709c` editorial addition. Existing provider, strict contract, public model and renderer are reused. No second calculator/provider/registry/workflow is introduced. Source hashes remain integrity checks rather than authenticity claims. No World probability or context release is fabricated.
3. Parsed both fresh official NBA response bodies. Their lengths/SHA-256 and every saved factual field match [source-observations.json](source-observations.json). The current matchup's `lastFiveMeetings.meetings[0]` identifies `0022600185` with recencyOrder 1, supporting the last-meeting language. Source times and editorial times are genuinely refreshed together. The new expiry is exactly 24 hours after observation, still **16 min 45.959 sec before tipoff**; another real observation remains necessary.
4. Rechecked **22** current static-source hashes, **10** HTML hashes and **10** PNG hashes against the evidence records. Viewed all **8** final after-images (real desktop/mobile, production, English, stale, load failure and labelled DEMO desktop/mobile). Main editorial copy is readable without clipped text. Stale suppresses the editorial angle and shows honest history/missing. DEMO stays labelled; production uses its existing imagery restrictions.
5. Reviewed the only change after the first code freeze: the existing static renderer now evaluates source-resolved pixel `clamp()` exactly and records the translation. Product CSS is unchanged. This removes a static-engine title-size error; it is not proof of browser CSS execution.
6. Read the browser log. Chromium exits at startup with `socket() EPERM` before any page runs. No browser interaction or E2E PASS is claimed, and no alternate-surface workaround was performed. Navigation/zoom proportions visible in static output remain outside this acceptance.

## Capacity receipts

Magazine ALLOW issued independently at `2026-11-20T02:41:16Z`: root70 + reviewer15 + helper15 tool groups, 55k tokens, 50 minutes, hard stop `03:31:16Z`, at most two necessary correction rounds. Quota/reset UNKNOWN; this finite approval is not a claim of sufficient quota. No merge/deploy/spend/new Gate or calculator authorized.

Separate NBA operation ALLOW at `2026-11-20T02:45:17Z`: helper15 + root5 + reviewer5 additional groups, 12k tokens, at most20 minutes and no later `03:25Z`, three exact HTTP requests, no retry, single-date intake with one target capture only. Source failures stop capture. This does not retroactively approve the earlier author-only `544709c` round.

## Separate NBA runtime result

**Capture BLOCK / not completed. Evidence-integrity and failure-containment checks PASS only.** Independently inspected the operation harness/reports and reopened the new SQLite read-only. Rehashed all **93** executed source entries and matched their Git hashes to the pinned PR #172 tree manifest (`10d7f45ab209af8c76dde466c3b4d324a2de8dcb`). The two successful HTTP bodies match their saved SHA-256 values.

The third exact ESPN intake URL timed out. Reports and database agree: **3 HTTP requests, 0 retries, 0 capture calls, 0 snapshots**. The single game-identity row binds NBA `0022600051` to ESPN `401909313`; its scope remains GAME_IDENTITY_ONLY and snapshotEligible false. ESPN intake receipts, observations, current/historical games, snapshots, official boxes, player boxes, rollovers and fetch marks are all zero. No identity receipt was promoted into a pregame snapshot.

SQLite SHA-256 before and after independent read-only inspection: `567e34ac87c96acef2b3edd9ce146924e7faf78910543d9006ca24d0539192cc`.

Remaining blockers: permitted real browser execution, a successful genuine pregame capture/readback, and later the same game's official FINAL evidence. No Beta-0 end-to-end completion, public release or merge clearance is issued here.
