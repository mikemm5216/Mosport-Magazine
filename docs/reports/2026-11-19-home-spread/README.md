# Magazine entrance spread — implemented, visual acceptance BLOCKED

本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

Policy: https://github.com/mikemm5216/Mosport-NBA/issues/170#current-execution-policy

- Policy read: 2026-11-19T09:23:21Z; updated_at: 2026-11-19T07:32:46Z.
- Highest impact: **Level 1 — homepage display logic**.
- Founder authority: current conversation requests a desktop cover-left/TODAY-right entrance and mobile cover-first flow, using the existing visual master and saved schedule/fixtures. No merge or public deployment authority for PR #21.
- Base PR #21 head: `7cee0ed57b97ca6f9fb20def53de22c680095c0e`.
- Product implementer: `/root/home_spread21`; integration/evidence: `/root`; independent reviewer: `/root/boundary_spread21`; Capacity: `/root/capacity_spread21`.

## Known remaining source regression

**`npm run evidence` remains BLOCKED by a source-level regression.** Independent review found that `tests/e2e/evidence.js` still opens bare `file://` homepage URLs (lines 61–72 and 81), then requires `.lead-foot` and `.lead-why` (lines 83–86). With the new default saved-schedule selector, that file-protocol provider cannot fetch the schedule (`FETCH_UNAVAILABLE`); the missing homepage has no lead. Even if Chromium were restored, this evidence command would time out. This is a specific uncorrected legacy fixture assumption, separate from the environment restriction and WeasyPrint distortion. It is inferred from the inspected caller/provider source, not a browser run. Its unchanged base blob is `5f3d3b28af2d0d2ebd53b6bf3878c6dfd1aed0f0`. The exhausted correction cap prevents fixing it in this round. A later bounded correction should make this DEMO evidence input explicit without changing the real default or public release behavior.

## Outcome and open acceptance

The existing home renderer now retains the magazine shell for saved schedule, missing, stale and failed-source states. The unselected homepage uses the saved `0022600051` schedule; explicit schedule/issue/fixture selectors remain explicit. Schedule and Match are secondary links that preserve selection. No extra calculator, public release gate, article flow or World computation was added.

**Visual acceptance is not complete.** The four source-bound static images below are diagnostic evidence, not accepted browser screenshots. WeasyPrint still collapses the TODAY lead card into a narrow strip in the saved-schedule cases. This establishes a failure of the substitute rendering evidence; it does not prove that a browser has the same layout defect. Do not approve the homepage layout based on these images or on text extraction alone.

The existing browser environment was previously blocked before page load (Chromium singleton socket EPERM); the cloud-browser local-preview denial prohibited workarounds. This task did not relaunch, bypass that restriction, use another browser surface, install a browser, or claim browser E2E PASS. A missing real snapshot is **not** the visual-review blocker.

## Existing Implementation Check

1. **Searched:** current PR #21 head and full tree; main ref; `AGENTS.md`; `docs/founder/2026-10-28-spec-lock/VISUAL_REFERENCE_CURRENT.png`; `docs/VISUAL_MAPPING_P1.md`; `site/js/pages/home.js`; `site/css/home.css`; `site/js/reader.js`; `site/js/app.js`; provider/pipeline/contracts; saved schedule and fixture tests; registry/component slots; legacy E2E URLs. Used `rg`, targeted reads and task-baseline byte/hash comparisons. Twelve key local source blobs matched the inspected remote PR head before editing. The local git root is a materialized snapshot; remote commit ancestry must be preserved through the exact inspected PR head.
2. **Found:** the existing cover + TODAY reader, spine and mobile cover already implement the intended visual structure. The early `R.status !== 'OK'` return replaced that structure with a generic state page. Existing `pregameRecord`, `sourceNote`, team/art registry components and the saved schedule supply the needed content. Older browser suites implicitly used the bare homepage as DEMO.
3. **Reuse / why not reused:** repair the existing home/app/CSS/i18n path, extract the existing lead-art fragment for both qualified and saved-schedule cards, and move the existing VM render helper to the shared test helper. Preserve providers, pipeline, contracts, reader, registry, Schedule and Match. Make legacy DEMO tests explicit and add default-schedule HTTP checks in the existing suite. The static evidence adapter invokes original component methods and documents its limits; it is test-only, not a new product renderer or source provider. No applicable product implementation was replaced with a second path. The public snapshot release adapter remains closed; an isolated candidate cannot be reused as public qualification.

## Capacity Check

- EIC completed: **Y**, sections above and current PR baseline.
- Quota/token/money remaining: **UNKNOWN**; no assertion of sufficient account quota.
- Launch conflict: **N**, exact Founder-authorized Beta-0 entrance/display repair.
- Pre-code decision: **ALLOW**. Root cap 48 groups; author 28; QA shared 14 (Capacity 1 + Boundary 13), total 90. GitHub calls 40; Library calls 6; new external game-source reads 0. Root stops exploration at 36 and reserves 12 for review/save/commit/readback. Core images 4, maximum 6.
- Permitted scope: homepage display, relevant test maintenance, bounded source-linked evidence/docs, same draft PR. Stop on scope expansion, insufficient capacity, protected access denial, or cap.
- Correction cap: **2 evidence-supported rounds, now 2/2 used**. Round 1 fixed new test false positives (SVG `10.5` mistaken for a probability and duplicate language-button text). Round 2 fixed legacy E2E fixture assumptions, optional real-team VM loading and the static renderer's source ratio/font/unit/grid handling. No product gate was changed.
- **DENY at closure:** Capacity explicitly rejected a proposed third test-only renderer correction. Even though the tool-group budget had room, the correction-round cap was exhausted and the guard had no authority to waive it. Stop further code/renderer changes and rerenders; only save/review/commit/readback allowed. At denial: root 22/48, author 15/28, Boundary 6/13, Capacity 1; total 44/90; GitHub 3/40, Library 0/6. No additional tool group was used for the denial. Final integration usage is recorded in the PR receipt. Older task consumption/overrun records remain unchanged.

## Verification

- `npm run test:unit`: **167/167 PASS, zero failures/skips**, before the optional real-team evidence helper addition. Raw output: [unit-test.log](unit-test.log).
- After `opts.realTeams` was added (default behavior unchanged), `node --test tests/unit/home-spread.test.js tests/unit/schedule-context.test.js`: **22/22 PASS**. A saved 0051 render produced the existing Chinese team names. Boundary independently ran the same targeted suites: **22/22 PASS**.
- Syntax checks passed for updated E2E JavaScript; `git diff --check` passed. These are not browser acceptance.
- The existing HTTP E2E suite now contains no-selector saved-schedule homepage, desktop/mobile geometry, missing/source/secondary navigation, TODAY anchor and failed-source-shell checks. The updated `run.js`/module acceptance inputs are explicitly DEMO. The separate `npm run evidence` command was missed and retains the concrete regression documented above. **These browser changes were not executed in this environment.**
- Four static output files were produced; expected PDF text found in 4/4. **That is only text extraction, not a visual PASS.**
- Public snapshot qualification stays `BLOCKED_MISSING`; no real capture, official result join or release is asserted by this task.

## Visual evidence and deviations

Master: [VISUAL_REFERENCE_CURRENT.png](../../founder/2026-10-28-spec-lock/VISUAL_REFERENCE_CURRENT.png).

| File | Input | Width | Interpretation |
| --- | --- | ---: | --- |
| [home-saved-desktop.png](static/home-saved-desktop.png) | saved 0022600051; prototype | 1600 | Existing placeholder artwork allowed for preview; lead layout distorted in substitute renderer |
| [home-saved-mobile.png](static/home-saved-mobile.png) | saved 0022600051; prototype | 390 | Cover precedes TODAY; lead layout distorted in substitute renderer |
| [home-production-desktop.png](static/home-production-desktop.png) | saved 0022600051; production | 1600 | Existing rights filtering and background fallback; lead layout distorted |
| [home-load-failed-mobile.png](static/home-load-failed-mobile.png) | isolated failed load; production | 390 | Magazine structure and explicit failure/missing; no fabricated game |

Inputs use the saved schedule through original selection/pipeline/page rendering in the shared Node VM harness, with original team names and original registry/component methods serialized into light DOM. This does not execute browser custom-element upgrade/lifecycle, native layout, events, image-error behavior, scroll, zoom or responsive reflow. Saved evidence clock: `2026-11-19T08:10:00Z` (Taipei 16:10). The page's date/time comes from the saved source, not an invented issue date.

WeasyPrint 65.1 uses only local original assets/CSS. Width media branches, viewport/container units, simple numeric CSS functions, inset shorthand and source-derived desktop track placement are translated explicitly. Native reader width is frozen to 1360 without browser zoom. Unsupported clipped gradient text is rendered in the source first orange color; shadows and some decorations are unsupported. Full translation logs, source SHA-256/Git blob hashes and warnings are preserved in [html-evidence.json](static/html-evidence.json), [static-visual-evidence.json](static/static-visual-evidence.json) and [renderer-warnings.txt](static/renderer-warnings.txt). The source head is deliberately null: the worktree is bound by file hashes against the known base, not falsely labelled as already committed.

The reference's unqualified probability interval, three-layer block, sample headlines and issue metadata are not copied into the real schedule entrance. No snapshot is represented by zero, average or DEMO probability. Prototype artwork is visibly labelled as placeholder preview evidence; production keeps the existing asset-rights fallback.

## Boundary / merge state

Independent review is required on [review-manifest.json](review-manifest.json) and the final remote blob set; the final receipt is in PR #21. A limited code/duplication PASS, if issued, must not be presented as visual acceptance or a GitHub APPROVED review. **Overall ready/visual state remains BLOCK, including the uncorrected `npm run evidence` regression. PR stays Draft. No merge, deploy, snapshot capture or new spending.**

To close the remaining visual acceptance, a separately authorized bounded follow-up must either produce valid browser evidence in a permitted environment or fix and honestly validate the substitute-rendering method. Do not silently reset the exhausted correction cap.
