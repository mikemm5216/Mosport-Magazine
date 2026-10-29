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

## Founder architecture correction — 2026-10-29

Founder direction: Media/crawler → sourced data and causal ownership →
player physiology and observable psychological context contribute to PMV;
TMV independently represents team value, never a sum or derivative of PMV;
World incorporates environmental context and integrates the inputs once →
Coach interpretation → Media presentation. Upstream and downstream Media
are roles, not independent decision authorities. Do not assert an actual
psychological or medical state from an unsupported proxy. Preserve source,
availability, as-of and rights provenance. Account for common environmental
facts and interactions without scoring the same effect twice.

Current A contract still permits PMV→TMV and PHYSIO/PSYCHO→TMV; this is an
identified implementation discrepancy. This document records the Founder's
accepted direction; it does not claim contracts, feature owners, runtime,
validation, CI or public eligibility have already been changed. Implement and
review those changes through a separate scoped A work package. B remains a
read-only consumer of A's World judgment.

## Historical NBA topology evidence — checked 2026-10-29

The earlier Founder-recalled order has documentary support: Terminal
[PR #485](https://github.com/mikemm5216/Mosport-Terminal/pull/485), merged
2026-05-25, describes causality → TMV foundation → Physio/Psycho → World
simulation. Its preceding readiness probe describes PMV *contribution evidence*
and TMV *foundation* rather than established PMV/TMV scores:
[probe](https://github.com/mikemm5216/Mosport-Terminal/blob/ae608b26a9efb115b13b080904d1d9fd8bd5ec57/docs/engineering/nba-pmv-tmv-readiness-evidence-probe.md).

A different later rolling chain is evidenced by Terminal
[PR #506](https://github.com/mikemm5216/Mosport-Terminal/pull/506) and
[PR #507](https://github.com/mikemm5216/Mosport-Terminal/pull/507), merged
2026-05-27: causality → Physio/Psycho rerun → PMV/TMV foundation; #507 says it
consumes #506. These are distinct historical workflows, not proof that either
alone settled the Founder's final architecture.

Current A [ADR-005](https://github.com/mikemm5216/Mosport-NBA/blob/main/docs/adr/ADR-005-SINGLE-DECISION-AUTHORITY.md)
and [calculation audit](https://github.com/mikemm5216/Mosport-NBA/blob/main/docs/audit/reports/NBA-CIA-2026-10-001.md)
report value-level double-counting and that the cited rolling chain's PMV/TMV
and Physio/Psycho stages counted rows rather than propagating calculated values;
the audit also reports target-game box-score leakage in a separate V16-B path.
These are audit findings, not proof that all historical experiments are invalid.
Current A's allowed edges and proposed Founder product flow still disagree;
this documentation records the evidence without changing engine contracts,
selecting a topology, or claiming runtime, accuracy or production readiness.
