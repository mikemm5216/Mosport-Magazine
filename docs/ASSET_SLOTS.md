# MOSPORT Asset Slots — for designers, ChatGPT and future asset agents

All imagery goes through the **Asset Registry**: `site/data/asset-registry.json`.
Components ask for a slot id; the registry decides which file (version) may show,
with which crop, or that the slot shows its fallback. Layout, type, copy, logos and
buttons never depend on an image, so adding, replacing or removing art never
changes the page structure. This is tested: the browser suite renders every page with
and without art and requires identical geometry.

## What is never inside an image

Always HTML/CSS/components, never part of an artwork file:
MOSPORT · More than sport · Be Your Own Coach · NBA GAME DAY (issue topic) ·
BREAKING NEWS / MOSPORT EXCLUSIVE / STREAK WATCH labels · headlines · team names,
tricodes and logos · win percentage · TODAY content · buttons · navigation ·
dates and issue numbers.
The registry enforces this: an art version with `containsText`, `containsLogo` or
`containsPerson` set to `true` fails validation and never renders.

## Art slots

| Slot id | Where it shows | Deliver (px) | Shown at (CSS px) | Crop | Formats, max size | Fallback when no art |
|---|---|---|---|---|---|---|
| `cover-desktop-art` | Home ≥1024: left page of the open spread, under masthead, topic, teasers, cover lines | **1260 × 2440** | ≈ 629 × 1213 at 100% reader zoom (scales with the spread) | `cover`, focal 62% / 40% | WebP, PNG or SVG; ≤ 550 KB | Navy radial gradient |
| `cover-mobile-art` | Home <1024: full first-screen cover | **1170 × 2532** | 390 × 620–880 | `cover`, focal 70% / 34% | WebP, PNG or SVG; ≤ 450 KB | Navy radial gradient |
| `today-feature-art` | TODAY lead-game card, panel behind the two team logos | **1600 × 800** | ≈ 470 × 250 desktop; ≈ 362 × 180 mobile | `cover`, focal 50% / 70% | WebP, PNG or SVG; ≤ 250 KB | Dusk purple gradient |
| `match-hero-art` | Match Detail hero band (teams, title, badges on top) | **2560 × 720** | ≈ 1144 × 300 desktop; ≈ 358 × 360 mobile | `cover`, focal 50% / 60%; 58% navy overlay | WebP, PNG or SVG; ≤ 350 KB | Dusk purple gradient |
| `editorial-card-art` | Dark editorial cards (STREAK WATCH, features), decorative | **1200 × 800** | ≈ 320 × 270 desktop | `cover`, focal 80% / 50% | WebP, PNG or SVG; ≤ 200 KB | Navy linear gradient (current look) |

Safe zones, given as fractions of the image, are in each slot's `safeZones` in the registry.
For example, the desktop cover keeps the top 25% dark and low in detail for the
masthead, keeps the left 60% low in contrast for the topic and teasers, and puts the
subject (ball, hoop, light) at the upper right.

Allowed content: ball, hoop, net, court, arena lights, abstract crowd texture,
geometry and brush strokes. **Not allowed:** players, people, faces, silhouettes,
imitations of recognisable stars, team logos and text.

## Logo slots

| Slot | Deliver | Fit | Fallback |
|---|---|---|---|
| `brand-mark` (MOSPORT monogram) | 512 × 512 SVG or PNG | `contain` | Letter "M" in a rounded box |
| `teamLogos.entries.<TRICODE>` | 512 × 512 transparent SVG, PNG or WebP, file `assets/teams/nba/<code>.png` | `contain`, never cropped | Tricode on the team colour |

Team-logo entries are empty until rights-cleared files exist (issue #5).

## Files ChatGPT can generate and drop in later

| File to produce | Slot |
|---|---|
| `site/assets/art/cover-desktop-art.v1.webp` | `cover-desktop-art` |
| `site/assets/art/cover-mobile-art.v1.webp` | `cover-mobile-art` |
| `site/assets/art/today-feature-art.v1.webp` | `today-feature-art` |
| `site/assets/art/match-hero-art.v1.webp` | `match-hero-art` |
| `site/assets/art/editorial-card-art.v1.webp` (optional) | `editorial-card-art` |
| optional `*.v1.dark.webp` | same slot, used in dark mode (`darkFile`) |

Current state: each slot's active version is a `PLACEHOLDER` development vector, which production never shows. The ChatGPT art is registered as `chatgpt-art-v1` with status `CANDIDATE`. Preview it with `?art=candidate`. To approve, set the slot's `activeVersion` to `chatgpt-art-v1`, change its `status` to `ACTIVE`, fill in `approvedBy`/`approvedAt`, then run `npm run registry:build`.

## How to add or replace art (person, agent or CMS)

1. Put the file in `site/assets/art/`.
2. In `site/data/asset-registry.json`, append a version to the slot:

```json
{
  "id": "v1",
  "status": "ACTIVE",
  "file": "assets/art/cover-desktop-art.v1.webp",
  "darkFile": null,
  "format": "webp",
  "width": 1260,
  "height": 2440,
  "sha256": "<sha256 of the file>",
  "crops": { "desktop": { "focal": { "x": 0.62, "y": 0.4 } } },
  "content": { "kinds": ["equipment", "arena", "lights"], "containsText": false, "containsLogo": false, "containsPerson": false },
  "rights": { "status": "OWNED", "licence": "…", "owner": "MOSPORT", "source": "…", "generator": "ChatGPT image", "generatorPrompt": "…", "attribution": null },
  "provenance": { "addedBy": "…", "addedAt": "2026-…", "approvedBy": null, "approvedAt": null }
}
```

3. Set the slot's `activeVersion` to `"v1"`. Older versions stay in the list, so rolling back means changing `activeVersion` back.
4. Run `npm run registry:build`. This validates the registry, checks that every file exists and matches its `sha256`, and regenerates `site/data/asset-registry.js`, the copy used when the site is opened from disk.
5. Run `npm test`.

## Rules the resolver applies

`site/js/assets/registry.js`, unit-tested.

| Mode | Renders statuses | Renders rights | Never renders |
|---|---|---|---|
| prototype | `ACTIVE`, `PLACEHOLDER` | `OWNED`, `LICENSED`, `EMBED_PERMITTED`, `UNVERIFIED` | `BLOCKED`, `athlete` kind, art containing a person, logo or text, formats not allowed for the slot |
| production | `ACTIVE` | `OWNED`, `LICENSED`, `EMBED_PERMITTED` | the same as prototype, plus `PLACEHOLDER` and `UNVERIFIED` |

Fallback happens per slot and is reported on the element as `data-state` and `data-reason`.
`?slots=1` shows these on the page.

## Moving to a CMS or asset service

- The registry is plain JSON (schema: `docs/assets/asset-registry.schema.json`), with `schemaVersion`, `registryVersion`, `updatedAt` and `updatedBy`.
- When the site is served over http(s), the loader (`site/js/assets/loader.js`) fetches `MOSPORT_CONFIG.assetRegistryUrl`, or `data/asset-registry.json` if that is not set.
  - It switches to that registry only if the registry validates and its `registryVersion` differs from the local copy.
  - An invalid remote registry is ignored, and the page keeps the bundled one. Both cases are covered by the browser suite.
- Nothing in HTML, CSS or the components names a file, so a CMS changes art by publishing a new registry document.
