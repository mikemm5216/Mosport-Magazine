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
| `teamLogos.entries.<TRICODE>` | 80 × 80 transparent PNG; preserved original plus `assets/teams/normalized/nba/<code>.png` | `contain`, never cropped | Tricode on the team colour |

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

Current state: each slot's active version is a `PLACEHOLDER` development vector, which production never shows. The ChatGPT art is registered as `chatgpt-art-v1` with status `CANDIDATE`. Preview it with `?art=candidate`. A named candidate can be previewed with `?art=candidate:<versionId>`, and `?zones=1` overlays the safe zones. To approve, set the slot's `activeVersion` to `chatgpt-art-v1`, change its `status` to `ACTIVE`, fill in `approvedBy`/`approvedAt`, then run `npm run registry:build`.

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

## Geometric native-size candidate v2

The five standalone WEBPs from the Mosport UI Drive package
`MOSPORT_B_Native_Illustration_Candidates_v2_20261028.zip` are registered as
`native-illustration-v2`, all CANDIDATE. Source:
https://drive.google.com/file/d/1ZpyBWjmQTlLXKB5gjzr-h5_cdV7L7am8/view

Open `site/index.html?art=candidate:native-illustration-v2` for the desktop/mobile
preview, or `site/match.html?game=DEMO-0041&art=candidate:native-illustration-v2`.
Use `&slots=1` to inspect resolution, version and state; `&zones=1` shows safe zones.
These are geometric procedural illustrations, not painterly final artwork. Native
dimensions and SHA-256 were verified against the source package. No active version
or approval record was changed. Production refuses the candidate. The unnamed
`?art=candidate` continues to preview the earlier `chatgpt-art-v1` for comparison.

Additional browser check: `node tests/e2e/native-candidate.js` (image loading,
desktop/mobile/match geometry parity, overflow, production refusal and screenshots).

## Repository team marks in the internal prototype

30 NBA PNGs are copied byte-for-byte from Mosport-Terminal at ae608b26a9efb115b13b080904d1d9fd8bd5ec57. Source blob hashes and paths: docs/assets/nba-import.json. Each registry entry records UNVERIFIED rights; internal prototype display is enabled under the Founder instruction to reuse existing logos, while production refuses them. This records technical integration, not third-party commercial permission.

Other existing sports files are indexed in docs/assets/multi-sport-logo-inventory.json. The inspected Terminal tree has MLB, EPL/UCL and NHL collections; only public/logos/cpbl/bro.png was found for CPBL; no NFL file was located in that tree. Do not claim complete NFL or CPBL coverage.

## CPBL marks and flags

The complete six-team CPBL set is in `site/assets/teams/cpbl/`, indexed by the
league's observed provider codes in `site/data/cpbl-team-registry.json`.
The existing `BRO`/`UNI`/etc. labels are local aliases, not claimed official codes.
Native small-mark sizes (80–100px) are recorded; files are not enlarged.

`site/assets/flags/` contains the MIT-licensed flag-icons 7.6.0 4:3 SVG collection:
249 ISO country/territory flags plus 22 supplementary symbols. Its independent
`site/data/flag-registry.json` prevents collisions with team tricodes. Country
flags and sports federation/IOC symbols must not be silently interchanged.

Open `site/asset-catalog.html` to inspect/search both collections. This adds an
asset collection; it does not enable CPBL games or national-team pages in the NBA
magazine. `npm run assets:check` and the browser asset suite verify the collection.

## Uniform team-logo standard (Founder correction)

All imported team marks use an **80×80 transparent canvas**. Trim transparent
source margins, scale proportionally into a 72×72 content box, and centre with at
least 4px padding. Never stretch a mark. The originals remain in their original
paths; active records point to normalized derivatives with their own dimensions
and hashes. `normalization` records source path, source dimensions, source hash
and alpha bounds. This standard applies to future league-logo imports too.

Rebuild NBA + CPBL derivatives: `python scripts/normalize-team-logos.py`, then
`npm run registry:build`. The catalogue uses exactly 80×80 CSS pixels for every
CPBL mark. The magazine retains its common per-role responsive sizes for team
logos; every member of a role uses the same box and object-fit: contain.

## MLB / soccer / NHL imports

`site/data/multi-sport-team-registry.json` (and disk-safe JS copy) contains MLB 30,
NHL 32 and 137 soccer clubs (132 across seven league snapshots + 5 historical extras). These identities are
namespaced and separate from NBA codes and flag codes. Originals are under
`assets/teams/sources/`; 80×80 derivatives under `assets/teams/normalized/`.
Soccer source folders do not assert current-season membership. The searchable
flag catalogue now also displays all 135 imported team marks in league sections.

## Soccer namespace and league completeness correction

Use `soccer` for association football in all current UI keys, registry groups,
asset paths and team ids (`SOCCER:ESPN:<id>`). NFL remains a separate namespace.
The immutable Founder-source snapshot and historical reports retain their
original wording; they do not override this later naming instruction.

Soccer now has seven separate provider-directory snapshots: Premier League 20,
LaLiga 20, Serie A 20, Bundesliga 18, Ligue 1 18, Primeira Liga 18, Eredivisie 18.
These cover 132 unique clubs, plus 5 retained historical clubs outside the seven
snapshots. The UI league selector uses the stored team-id membership lists, not
old EPL/UCL folder names. No UEFA participation is inferred from these lists.
