# B-line product and tool reference candidates — 2026-10-29

Status: REFERENCE CANDIDATES / NOT ADOPTED. Founder requested a written record
for later adjustment. No dependency, source, visual master, architecture,
publication policy, or runtime changes follow from this record.

## Architecture and product boundary

Preserve the Founder's named architecture: **資料 → 因果鏈 → PMV/TMV →
生理/心理 → World Engine**. This is a conceptual record, not a change to
A's actual governed engine edges, scoring owners, or execution order.
World Engine in A remains the only game-judgment authority; B renders eligible
A outputs read-only and does not calculate, adjust, or invent predictions.

The product goal is a real-game prediction whenever the A evidence and an
appropriate validated prediction route support one. Missing individual
features should motivate an A-owned fallback evaluation rather than B
inventing a value. If A cannot produce an eligible judgment, B must preserve
the existing honest unavailable state. No release/rights rules are changed.

The existing visual master and Founder decisions remain authoritative. B is a
static HTML/CSS/JavaScript site with no build step; candidate tools must be
assessed against that architecture rather than forcing a framework migration.

## Prioritised candidates

| Priority | Candidate | Specific B use to investigate | Limitations |
|---|---|---|---|
| 1 | [Baseline — NBA Game and Data Analysis](https://capafy.ai/agent/baseline-nba-game-and-data-analysis/1427730497) | Study matchup explanation, predictions, model version, data cutoff, personnel and uncertainty presentation for the existing Schedule → Match → Today journey. | Functional and information-design reference; the page describes a model, but B must not adopt its calculations or coefficients. Existing Founder visual master prevails. No source-code or data reuse is implied. |
| 1 | Existing [Mosport-Magazine](https://github.com/mikemm5216/Mosport-Magazine) design, contracts and editorial path | Extend existing magazine design and read-only World adapter to render the same actual game across pages. | Existing main is a DEMO; A package availability and production/rights eligibility must be checked at integration time. PR #10's free-source inventory and offline injury parser are partial, not a live service. |
| 2 | [Data4Basket game view](https://app.data4basket.com/stats/gameview?openGuide=gameView) | Examine team comparisons, player role cards, game flow and shot charts for legible match and postgame analysis. | UX research only; do not copy assets/content or imply all underlying fields are already available. |
| 2 | [PBP Stats](https://www.pbpstats.com/) | Study lineup comparisons and playing-time views for future keyboard-coach discussion and analysis. | UX research only; source access, data and rights require separate evaluation. |
| 2 | [Chart.js](https://github.com/chartjs/Chart.js) | Evaluate team form, player trends and comparison charts on the existing vanilla-JS site. | MIT code license. Assess bundle size, accessibility, mobile layout and offline/no-build compatibility before adopting. |
| 3 | [D3](https://github.com/d3/d3) | Investigate custom matchup, causal or event-chain visualisations where ordinary charts are inadequate. | ISC code license. More custom work; avoid premature dependency or reimplementing A logic in B. |
| Later | [Remotion](https://github.com/remotion-dev/remotion) | Research automated visual assets and short-form video from an eligible, traceable editorial package. | Separate media-tool candidate, not a requirement to migrate the static website to React. Check actual license and commercial eligibility at adoption time, along with compute cost. |
| Later | Podcast voice candidates | Compare Chinese/English voice quality, rights, local-vs-cloud execution and real cost for roughly one daily episode. | No provider selected or zero-cost claim. Audio may only narrate eligible World outputs and approved editorial facts; preserve source/version references. |

## Concrete implementation path

1. Re-audit the current A package and B adapter contract; use one real game for
   the same-game Schedule → Match → Today flow, with freshness and withdrawal
   handling. Do not mistake synthetic DEMO content for real integration.
2. Map Baseline's useful information hierarchy to the existing visual master,
   including clear source, cutoff, uncertainty and unavailable-field labels.
3. When the necessary fields exist, evaluate Chart.js with a small responsive
   comparison, then test accessibility and existing browser acceptance. Review
   Data4Basket and PBP Stats for presentation ideas only.
4. Once eligible editorial content exists, evaluate one traceable daily podcast
   and image/short workflow; measure actual recurring model, voice, hosting and
   production cost before selecting tools.

## Reference use record for future changes

Each candidate-backed task must link a source and version or checked date,
identify the target B feature and A contract fields, document rights and the
type of reuse, state what was actually tested, and link the resulting issue or
PR. A reference listing does not grant source rights, change public eligibility,
approve an API/dependency, or change the architecture. No new paid service,
scheduled job, deployment, or data source is enabled by this file.

Cross-lane companion: `Mosport-NBA/docs/operations/REFERENCE-CANDIDATES-2026-10-29.md`.
Existing relevant records: `docs/ROADMAP.md`,
`docs/P2_CONTRACT_COMPATIBILITY.md`, and
`docs/sources/FREE_SOURCE_INVENTORY.md`; recheck status before execution.

## Founder clarification under discussion — Media, Coach and ordering

On 2026-10-29 the Founder proposed the conceptual flow:
**Media Engine + crawler → data → causality → PMV/TMV → Physio/Psycho →
World Engine → Coach Engine → Media Engine.** The two Media positions represent
upstream evidence collection/processing and downstream production/distribution,
not a second World decision. Source-backed media items are candidates only;
A must accept evidence under its own identity, rights, chronology and feature
contracts. B's evidence-candidate@0 is research-only and is not sent to A.
Coach explains or supports participation using the locked World output; it must
not change that output. Media cannot create or revise a World judgment.

**Architecture discrepancy to resolve:** current A
`src/domain/features/contract.ts` declares PHYSIO→PMV, PSYCHO→PMV,
PHYSIO→TMV, PSYCHO→TMV, PMV→TMV and TMV→WORLD. The proposed conceptual order
places PMV/TMV before Physio/Psycho. It must not be represented as the current
implemented execution graph. Determine whether the Founder intends literal
computational dependencies or a high-level functional view, and reconcile the
contracts before any engine rewiring. This note does not implement or approve
a graph change.

