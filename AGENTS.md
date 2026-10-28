# MOSPORT-B — Agent Guide

MOSPORT-B is the **MOSPORT sports magazine**: the reader-facing frontend and the
media/editorial workflow. It is a separate product line from MOSPORT-A
(`mikemm5216/Mosport-NBA`, World Engine). Read this file before changing anything.

## Non-negotiable rules

1. **World is read-only.** World Engine is the only source of game judgments.
   This repo never computes, adjusts, back-fills or rewrites a win probability,
   a verdict or a locked version. It renders a World package or hides the number.
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
6. **No paid services.** No paid API, MCP, news search, CI or deployment.
7. **MOSPORT-A is not edited from here.** Contract questions for A go to an
   issue, not into A's repo.
8. **No auto-merge** without an explicit Founder merge authorisation for this repo.

## Source of truth

- Founder decisions: `docs/founder/2026-10-28-spec-lock/` (verbatim, hashed).
- Visual master: `docs/founder/2026-10-28-spec-lock/VISUAL_REFERENCE_CURRENT.png`.
  Where the image conflicts with a written LOCKED rule (e.g. the image shows a
  `60%` interval and a three-layer block), the written rule wins and the
  deviation is recorded in `docs/VISUAL_MAPPING_P1.md`.
- Plan: `docs/ROADMAP.md`.

## Layout

```
site/                 static site (no build step); open site/index.html
  css/                tokens, components, page styles
  data/               asset-registry.json (source of truth for all imagery) + generated .js copy
  js/assets/          registry resolver (unit-tested) and loader (local or remote registry)
  js/editorial/       eligibility gate (pure functions, unit-tested)
  js/fixtures/        DEMO and empty issue fixtures
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

Before saying a change is done: run `npm test`, look at the screenshots, and
compare them with the visual master. Compilation is not visual acceptance.

Team-logo delivery standard: 80×80 transparent canvas, proportionally contained
and centred in 72×72, preserving original sources and hashes. See ASSET_SLOTS.md
and scripts/normalize-team-logos.py. Never copy arbitrary native dimensions into
the active image registry as if they were a consistent delivery size.
