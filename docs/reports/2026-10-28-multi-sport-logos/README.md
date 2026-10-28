# MLB, football and NHL logo import and identity audit

Delivered: MLB 30 teams, NHL 32 teams and 37 distinct football clubs. All display
as 80×80 transparent PNGs, proportionally centred within a 72×72 content box.
The existing normalizer regenerates every derivative; original sources remain.

## Source verification and corrections

- MLB: 30 verified repository originals from private Mosport-Terminal at
  ae608b26a9efb115b13b080904d1d9fd8bd5ec57. Each original's Git hash was recomputed.
  The duplicate files ATH/OAK and CHW/CWS are identical and not extra teams.
  Identities use MLB ids and current names from
  https://statsapi.mlb.com/api/v1/teams?sportId=1 . Bounded snapshot is at
  docs/assets/mlb-team-identities.json. Athletics is ATH, with OAK a legacy alias.
- Football: visual inspection caught mislabeled legacy repo files. Examples:
  Ajax showed Stuttgart; Benfica showed Fulham; Porto showed Everton; Ipswich
  showed Leeds; Leeds showed Blackburn; Napoli showed a Venezuela flag.
  Therefore **all 37 active football images were replaced** with explicitly
  matched ESPN public team metadata/logo URLs. Provider team id/name and exact
  logo URL are recorded in docs/assets/football-team-identities.json and each
  registry entry. The old repository images remain only as historical audit
  sources, never active. The set covers 23 clubs from the legacy EPL inventory
  and 14 from UCL; it is not an asserted current-season roster or worldwide set.
- NHL: all 32 active images now derive from official SVG assets. Team codes and asset families were observed in the
  official https://www.nhl.com/info/teams/ directory; corresponding light-background
  variants were fetched and verified for the white catalogue. Original vectors remain
  under sources/nhl-official; scripts/render-nhl-sources.js renders transparent
  512px intermediate sources, and the shared normalizer creates 80px delivery
  files. This avoids carrying older brand variants forward from the repo.
  Utah is Utah Mammoth and uses the official directory's Mammoth SVG.

Current source links, original Git hashes, replacement-source hashes and legacy
provenance are separate records. No filename alone is treated as identity proof.

## Catalogue and validation

site/asset-catalog.html displays NBA 30, CPBL 6, MLB 30, football 37 and NHL 32:
135 team marks, plus 271 flags/symbols. All 406 images decode at desktop/mobile.
Checks cover each league count, all native/rendered dimensions = 80×80, no
undefined labels, source/derivative hashes, vector hashes, provider identity
mapping, registry-copy parity, overflow and flag search. The individual league
screenshots are visually reviewed: mlb-80.jpg, football-80.jpg and nhl-80.jpg.

Sources: MLB identity endpoint above; ESPN country-league team directories
https://site.api.espn.com/apis/site/v2/sports/soccer/<league>/teams?limit=1000
(eng.1/eng.2/eng.3/ger.1/esp.1/ita.1/fra.1/por.1/ned.1), plus verified Leicester
team endpoint /eng.2/teams/375. NHL image URLs are per-entry observed URLs under
https://assets.nhle.com/logos/nhl/svg/ .

The magazine remains NBA-only; asset availability does not enable other games.
Logo rights remain UNVERIFIED, with no licence invented by copying. No A changes,
paid service, merge or deployment. PR #6 remains Draft.

Validation completed locally: asset/source checks PASS; unit 35/35; existing
magazine browser suite 321/321; native-art/logo checks 18/18; expanded catalogue
checks 32/32 (desktop/mobile, all 406 images, 135 uniform team marks). The final
light-background NHL derivatives were also rechecked and screenshots reviewed.
