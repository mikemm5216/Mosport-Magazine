# NBA team-logo provenance audit — 2026-10-28

Issue #5. Question from the independent review: can the 30 NBA PNGs already in
`mikemm5216/Mosport-Terminal` be used by MOSPORT-B?

## What exists (read-only inspection, Mosport-Terminal @ `ae608b2`)

| Item | Finding |
|---|---|
| Files | `frontend/public/logos/nba/*.png`: 31 files (30 teams plus both `was.png` and `wsh.png`). The same images also appear flat as `frontend/public/logos/nba-*.png`; `nba/lal.png` and `nba-lal.png` are byte-identical. |
| Format | 500×500 RGBA PNG. Embedded XMP says the files were edited in Adobe Photoshop 25. |
| Content | Official NBA team marks (registered trademarks of the NBA and its teams). |
| Recorded source / licence | **None.** There is no README, manifest, licence file or source URL next to the files. `scripts/generate-placeholders.js` only creates 1×1 stand-ins for missing paths, and the `Audit_Report.md` mentions logo remediation only for EPL stubs. The clone is shallow (single commit), so the commit that added the files and its message were not inspected. |
| Identity mapping | `frontend/app/config/teamLogos.ts` maps teams to paths. MOSPORT-B already maps canonical tricodes and records `wsh` as an alias of `WAS` (`site/js/teams.nba.js`). |

## Conclusion

Having the files in a repository does not show permission to use them commercially.
These are third-party trademarks with no recorded source or licence, and Founder lock
B-04 requires a source/licence check before any logo is used. So **no file was copied**,
and the `<mo-team-logo>` slots keep the tricode fallback.

## What would unblock it

One of:
1. A licence or written permission from the NBA, or from an authorised distributor such
   as a league media kit with its terms, that covers MOSPORT's use.
2. A Founder legal decision recording the usage basis (for example nominative use) and
   its limits, plus where the files come from.

After that, integration needs no code change. For each team, add a version under
`teamLogos.entries.<TRICODE>` in `site/data/asset-registry.json` with the file,
sha256, `rights.status: "LICENSED"` and the licence reference, then run
`npm run registry:build`.
