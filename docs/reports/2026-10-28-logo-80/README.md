# Uniform 80×80 team marks

Founder correction: consistent delivery dimensions across all team logos.

36 derivatives (30 NBA + 6 CPBL) now use 80×80 RGBA PNG canvases. Source alpha
bounds are trimmed, artwork is scaled proportionally within 72×72, then centred
on the transparent canvas. No distortion. Both the source and derivative have
separate hashes and paths; original Terminal/CPBL files remain intact.

Active NBA versions point to normalized-80-v1; CPBL registry entries point to
normalized derivatives. All six CPBL catalogue labels and actual files are now
80×80, including TSG Hawks. Catalogue render boxes are also 80×80 CSS pixels.
The magazine's existing common per-role responsive display sizes are retained.
No rights metadata was upgraded and no original was overwritten.

Regenerate using python scripts/normalize-team-logos.py, then registry:build.
The written asset standard and AGENTS.md apply this rule to future league imports.

Verification: all 36 PNGs checked for 80×80 RGBA and alpha bounds within the
72×72 content box. Gallery browser suite checks both natural and rendered sizes
at desktop/mobile. Screenshots catalog-1440.jpg and catalog-390.jpg are reviewed.
