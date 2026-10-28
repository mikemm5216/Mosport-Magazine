# CPBL six-team marks and flag asset acquisition

2026-10-28 (Asia/Taipei). Founder requested PR #1 merge, a complete CPBL
set, and flags; use existing GitHub assets first, then official/web sources.

## Completed acquisition

- CPBL: all six current teams, downloaded from the official league home-page
  team-navigation image links: ACN 中信兄弟, ADD 統一7-ELEVEn獅, AJL 樂天桃猿,
  AEO 富邦悍將, AAA 味全龍, AKP 台鋼雄鷹. Five are 80×80 PNG; AKP is 100×100.
  These are the official site's small cap/letter marks, not full-size heraldic
  crests or newly upscaled high-resolution files. Exact original bytes retained.
- Flags: flag-icons 7.6.0, 4:3 SVG, 249 ISO country/territory flags and 22
  supplementary symbols (including football home nations, organizations and an
  Unknown symbol). Do not describe all 271 as sovereign countries. MIT licence
  copied with the files. TW is included; no unreviewed IOC/TPE mapping is implied.
- All files have source URLs, byte size, SHA-256 and explicit identity records:
  site/data/cpbl-team-registry.json and site/data/flag-registry.json.
- site/asset-catalog.html works from disk and shows all 277 assets with name/code
  search. JSON registry copies are also bundled as JS for disk use.

## Private repository finding

GitHub connector access to private mikemm5216/Mosport-Terminal was confirmed
(repository metadata reports private=true and pull=true). Thus privacy alone
was not the cause of the earlier inventory gap. Direct shell Git authentication
is unavailable for some operations; the connected GitHub API was used instead.

Mosport-V10 master efb809a9740683b8d81e8e1b384f8ca36dd303bb contains 14
public/logos/flags/*.png entries, but every one is the empty-blob SHA
`e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`. Filenames are not working assets.
The new SVG collection replaces that missing-file situation in MOSPORT-B;
legacy repositories were not edited.

## Boundaries and validation

CPBL marks record official origin but UNVERIFIED commercial rights; no permission
is invented. Other sports remain Coming Soon. The magazine's World/read gate is
untouched. No provider-game API, paid service, hosted CI or deployment enabled.

Local checks: scripts/check-sport-assets.js validates all 277 hashes, byte sizes,
PNG dimensions, SVG safety, canonical code uniqueness, registry copy parity and
licence presence. tests/e2e/sport-assets.js decodes all 277 images at 1440/390,
checks overflow and name/code search, and writes screenshots. See committed
catalog-1440.jpg and catalog-390.jpg. Full npm test is required for this change.

PR #1 was merged as a8434062d3b2491f93fb9fe2171d380ad0bc2f6d; PR #6
retargeted to main and remains Draft. No PR #6 merge is included.

Sources:
- https://www.cpbl.com.tw/
- https://github.com/lipis/flag-icons/tree/v7.6.0
- https://www.npmjs.com/package/flag-icons/v/7.6.0

Final local validation on the delivered tree: asset checks PASS; unit 34/34;
existing browser 321/321; native-v2/logo browser 18/18; CPBL/flag gallery browser
18/18. Screenshots visually checked; CPBL marks match the six official image
links and flags render at both viewport widths. Runs are local, not hosted CI.
