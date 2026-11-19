# MOSPORT-B — Agent Guide

MOSPORT-B is the **MOSPORT sports magazine**: the reader-facing frontend and the
media/editorial workflow. It is a separate product line from MOSPORT-A
(`mikemm5216/Mosport-NBA`, World Engine). Read this file before changing anything.

## Non-negotiable rules

1. **NBA outputs are read-only.** World Engine is the sole official game-judgment
   authority. This repo never computes, adjusts, back-fills or rewrites a win
   probability, a pick or a locked version. Beta-0 may render a qualified real
   snapshot or explicit missing without a World probability. Later research
   personas use versioned deterministic NBA research outputs, separately labelled
   from official World; they need not agree with or be adopted by World first.
   → `docs/adr/ADR-B002-RENDER-ONLY-ELIGIBLE-CONTENT.md`
2. **No fabrication.** No invented news, no placeholder headline to fill a slot,
   no `0`/average/demo value presented as real. Missing stays missing; an empty
   slot is removed from the DOM.
3. **Human approval cannot be bypassed.** Items carrying `MAJOR_NEWS`,
   `UNVERIFIED_RUMOR`, `SENSITIVE_NEWS`, `EXCLUSIVE_CLAIM`, a `BREAKING_NEWS` or
   `MOSPORT_EXCLUSIVE` label, and every Public Postgame Review need a human
   approval record before they can render. (Founder lock M-02, C-4.)
4. **DEMO is always labelled.** Fixture content carries `mode: 'DEMO'` and the UI
   shows a DEMO mark. Production mode refuses to render a DEMO fixture.
5. **No athlete likeness.** No player photos, portraits, silhouettes or
   recognisable star imitations. Team logos only through `<mo-team-logo>` with a
   provenance record; production shows only rights-cleared files.
6. **No unapproved paid services.** New metered API, MCP, search, CI or deployment
   commitments require an explicit Founder L2 decision; a task ALLOW is not a
   budget or deployment authorisation.
7. **MOSPORT-A is not edited from here.** Contract questions for A go to an
   issue, not into A's repo.
8. **No self-approval or blanket automatic merge.** Follow the impact-based delegation
   below. A green test, a Markdown extension or Capacity ALLOW does not grant
   merge authority. Apply the current scope-specific Founder authorisation.

## Current launch scope — Founder decision, 2026-11-19

- **Beta-0:** target 2–3 weeks from 2026-11-19 (2026-12-03–2026-12-10,
  Asia/Taipei); a target window, not an enabled schedule or guaranteed duration.
  Deliver real schedule or honest missing, at least one genuinely future game's
  persistent pregame snapshot using a few existing features, Magazine rendering
  of that snapshot or explicit missing, and an official postgame result joined
  by the same game ID. Missing in the UI cannot replace the underlying real
  snapshot and official-result evidence. World probability is optional.
- **Beta-1:** only after Beta-0 has run with real data and is live, add
  INITIAL/T−15 FINAL, more features and product role B. Double-lock delivery is
  a Beta-1 requirement, not a Beta-0 prerequisite.
- Magazine keeps two product roles: A generates articles; B presents feature
  validation as MOSPORT-owned media/creator predictions. These names do not mean
  repository A/B. Role A may independently use already-qualified sources but a
  full article workflow is not a new Beta-0 requirement. Role B starts in Beta-1.
- Before Beta-0 launch, Research may only repair existing work that directly
  unblocks Launch. Do not add feature calculators or model experiments. Keep
  the 203-feature inventory without parallel expansion. Launch and Research are
  work tracks, not new departments.
- Within the existing MEDIA responsibility, Magazine is the product owner for
  articles, reader flow and acceptance. It need not wait for the complete World
  product; shared APIs and numerical outputs remain NBA-owned. The same Beta-0
  and capacity limits apply. Preserve World player value → Magazine/Fantasy;
  Fantasy is not a Beta-0 or Beta-1 prerequisite.

## Existing Implementation Check — mandatory for every Launch PR

Complete this check before implementation and include it in the PR using
`.github/pull_request_template.md`:

1. **searched:** concrete paths, existing PRs, inspected HEAD/ref and commands.
   If a ref is unavailable, state what was inspected and the limitation; do not
   claim a fresh remote inspection that did not occur.
2. **found:** existing implementation, tests, contracts, documented decisions,
   relevant overlap and the actual gap.
3. **reuse / why not reused:** identify what is extended or repaired and explain
   every non-reused item. If all applicable work is reused, state explicitly
   that there are no non-reused items. `N/A` or generic boilerplate is not a check.

Missing, vague or incomplete EIC means the PR is not qualified for ready/merge.
Extend existing work; do not start a duplicate calculator, registry, data path,
queue or workflow because its earlier work lives in another PR.

## Capacity / Control and Boundary / Anti-Duplication

**Capacity / Control** is a narrow read-only pre-dispatch guard with start veto.
Before a new task is dispatched, check its EIC, estimated consumption and cap,
quota status, and conflict with Launch priority. No ALLOW means no code writing.
Unknown observations stay UNKNOWN; do not claim enough quota without evidence.
If capacity is insufficient or a limit is reached, stop, save progress and do not
retry into the limit. Use simple existing task records, not a new dashboard or
queue. This guard does not write product code or replace product/architecture
decisions; an ALLOW authorises only its recorded task envelope.

**Boundary / Anti-Duplication** is a narrow role inside QA. It checks EIC before
a PR is opened and finds duplicate implementations during review. It can block
ready/merge, but does not write product code, change architecture or set dispatch
priority. An author cannot review or approve their own implementation.

## Founder review levels

| Level | Actual impact | Required handling |
|---|---|---|
| L0 | Documentation, tests or explicit repairs within already-authorised scope | A designated independent agent/reviewer may handle and merge within an explicit delegation after required checks and Boundary clearance; Founder spot-checks |
| L1 | Contracts, calculators or display logic | Founder receives the summary and key diff for the decision; independent review remains required |
| L2 | Architecture, Gates, public release, paid commitments or permission policy | Founder personally decides; independent review remains required |

Classify by the highest actual impact. Policy written in `.md` is not L0 merely
because it is documentation. The concrete Beta-0 and governance direction in
this round was authorised by the Founder in the conversation; do not ask for the
same decision again. Record that authority and the actual independent review;
perform only the operations explicitly authorised for that scope. The latest
Founder instruction authorises merging PR #20 and NBA PR #73 after review and
required checks; it does not authorise public deployment, spend or new runtime.

## Required task preamble and current policy

Every new task or dispatch description must begin with this exact sentence:

> 本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

Link [Issue #170 Current execution policy](https://github.com/mikemm5216/Mosport-NBA/issues/170#current-execution-policy) and record the policy
read time / updated_at, the task's highest actual-impact level, permitted scope
and named implementer / independent reviewer. Include the Capacity ALLOW receipt
before implementation. If the current policy or receipt is unavailable, record
the missing check and hold coding. Use `.github/pull_request_template.md` for the
copyable Capacity Check and Boundary Check.

The Founder explicitly authorised merging NBA PR #73 and Magazine PR #20 after
independent review and required checks on 2026-11-19. This supersedes the earlier
document-only round's no-merge scope for those two PRs; it does not authorise
runtime expansion, public deployment or spend. **Do not implement Dispatcher
automatic interception in this round.** Use task / PR discipline.

## Named Level 0 execution and review procedure

Use the existing implementation / QA / integration responsibilities; these are
per-task assignments, not new departments or persistent workers.

- **Implementer:** the ChatGPT / Codex implementation agent assigned to the task.
  Record its actual session / agent ID and permitted files before work.
- **Independent reviewer:** a separately invoked `boundary_review` QA agent,
  distinct from the implementer. It reviews the exact HEAD, EIC, duplication,
  actual impact level and necessary verification, then records PASS / BLOCK.
  If unavailable or technically unable to review, hold the change for another
  explicitly named independent QA reviewer; do not send every L0 to Founder.
- **Merge executor:** the active ChatGPT root / integration agent. For an already
  authorised L0, it may merge only after the independent PASS, Capacity record,
  required checks and absence of unresolved blockers, using the reviewed HEAD
  as the merge lease. It may execute a merge of its own authored change only
  on another reviewer's PASS; it cannot issue its own independent approval.
- **Founder:** spot-checks L0. Contract / calculator / display changes remain L1;
  architecture / Gate / public release / spend / authority changes remain L2.
  A task title or Markdown extension cannot downgrade the actual impact.

Every task records actual implementer, reviewer and merge executor identities;
an unfilled role is not evidence that an agent is running. Use the same PR for
receipts. An independent agent review is not a GitHub APPROVED review unless an
actual separate GitHub reviewer submitted it. Existing platform protections
remain in force.

## Source of truth

- Founder decisions: `docs/founder/2026-10-28-spec-lock/` (verbatim, hashed).
- Visual master: `docs/founder/2026-10-28-spec-lock/VISUAL_REFERENCE_CURRENT.png`.
  Where the image conflicts with a written LOCKED rule (e.g. the image shows a
  `60%` interval and a three-layer block), the written rule wins and the
  deviation is recorded in `docs/VISUAL_MAPPING_P1.md`.
- Plan: `docs/ROADMAP.md`.
- Latest 2026-11-19 Beta-0/Beta-1, capacity and delegation decisions are recorded
  in the plan and `docs/reports/2026-11-19-LAUNCH-FIRST-PLAN-VS-ACTUAL.md`.
  Historical Founder snapshots remain unchanged; use later explicit decisions
  for the sequencing they supersede.

## Layout

```
site/                 static site (no build step); open site/index.html
  css/                tokens, components, page styles
  data/               asset-registry.json (source of truth for all imagery) + generated .js copy
  js/assets/          registry resolver (unit-tested) and loader (local or remote registry)
  js/contracts/       B-owned contracts: validators, canonical JSON, SHA-256 (docs/contracts/)
  js/data/            one data path for every page: providers → pipeline → public model
  js/editorial/       eligibility gate (pure functions, unit-tested)
  js/fixtures/        DEMO issue and DEMO risk-case issues (contract-shaped)
  internal/           editor-side code: store, workflow, risk routing, DEMO editor (internal/editor.html);
                      never loaded by the public reader
  js/                 components (logo/cover slots), i18n, page renderers
  assets/             fonts (OFL), brand mark, art/ (placeholder vectors), teams/ (preserved originals + normalized derivatives)
tests/unit/           node --test
tests/e2e/            Playwright browser checks + screenshots
docs/                 founder specs, ADRs, roadmap, reports
```

## Imagery

Every image is a slot in `site/data/asset-registry.json` (see `docs/ASSET_SLOTS.md`).
Never put an image path in HTML, CSS or a component; never bake text, logos or
people into artwork. After editing the registry run `npm run registry:build`.

## Commands

```
npm test            # unit + e2e
npm run test:unit
npm run test:e2e    # writes screenshots to artifacts/
```

For runtime or UI changes, run the relevant required checks within the approved
capacity envelope; `npm test` covers the existing full suite. When the UI changes,
inspect new screenshots against the visual master. Compilation is not visual
acceptance. For a specifically authorised documentation/governance-only task,
check the changed text, links, fences, scope and EIC; record why runtime/browser
tests were not rerun and do not claim runtime validation. Stop on a quota limit
instead of repeatedly retrying checks.

Team-logo delivery standard: 80×80 transparent canvas, proportionally contained
and centred in 72×72, preserving original sources and hashes. See ASSET_SLOTS.md
and scripts/normalize-team-logos.py. Never copy arbitrary native dimensions into
the active image registry as if they were a consistent delivery size.

Sport naming: use soccer / SOCCER for association-football UI, identifiers, files
and registry groups. Keep NFL separate. Do not introduce the ambiguous football
key for soccer. League coverage must use explicit provider membership snapshots,
not guessed league membership from asset folders.
