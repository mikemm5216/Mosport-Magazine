# Soccer naming and league coverage correction

Founder instruction: use soccer to avoid NFL ambiguity, and expand beyond the
legacy English-league asset folder. Active UI label and i18n key are Soccer /
soccer. Registry group is soccer; team ids are SOCCER:ESPN:<provider-id>; source
and normalized paths use soccer-verified and normalized/soccer. The former
active verified-image and normalized-image paths are removed. Historical source
reports and immutable Founder documents preserve their original wording only.

## League snapshots

| Provider directory | League | Team count |
|---|---|---:|
| eng.1 | Premier League | 20 |
| esp.1 | LaLiga | 20 |
| ita.1 | Serie A | 20 |
| ger.1 | Bundesliga | 18 |
| fra.1 | Ligue 1 | 18 |
| por.1 | Primeira Liga | 18 |
| ned.1 | Eredivisie | 18 |

Top five: 96 clubs. Seven directories: 132 unique clubs. Five older clubs are
retained in an explicitly labelled historical group, giving 137 soccer assets.
Observed 2026-10-28. Source URLs, provider team ids, names, logo URLs and membership
lists are recorded in docs/assets/soccer-team-identities.json and the separate
multi-sport registry. These are provider-directory snapshots, not an assertion
about UEFA qualification or every world competition.

All 137 use 80×80 transparent delivery images with centred proportional 72×72
content. The catalogue league selector shows each league separately and the
historical extras separately. No club is added or duplicated based on an acronym.
The combined catalogue now has 235 team marks + 271 flags = 506 decoded images.

Checks cover source and output hashes, unique identities, exact per-league
counts, all native/rendered 80px canvases, no overflow/undefined text, selector
counts, flag search, and the English Soccer button without the old UI term.
Snapshots in this folder show all seven filtered collections. Local runs only;
no hosted CI, paid API, deployment, game-feed enablement or PR merge.

Source URL pattern (exact URLs are recorded per league):
https://site.api.espn.com/apis/site/v2/sports/soccer/<league>/teams?limit=1000

Original third-party logo rights remain UNVERIFIED. The main magazine remains
NBA-active with other sports Coming Soon; this work expands the reusable assets.

Validation: assets/source checks PASS; unit 35/35; existing magazine browser
321/321; native-art/logo 18/18; expanded catalogue 50/50. Active UI/code/data
were scanned to confirm the old sport name is absent. All runs are local.
