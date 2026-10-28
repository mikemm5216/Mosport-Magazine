# Geometric native-size art trial

Integrated five `native-illustration-v2` CANDIDATE WEBPs from the existing Drive
ZIP into the asset registry. Dimensions and SHA-256 match the supplied manifest.
No approval record or active version changed. Earlier artwork remains available.

Preview: `site/index.html?art=candidate:native-illustration-v2` and
`site/match.html?game=DEMO-0041&art=candidate:native-illustration-v2`.

Validation on this working tree, 2026-10-28:
- Registry: 5 slots, 20 versions; valid files and hashes.
- Node unit tests: 33/33 passed.
- Existing Playwright browser suite: 321/321 passed.
- Native-v2 browser checks: 15/15 passed (image decoding, overflow, geometry parity
  against fallback, and production refusal on desktop/mobile/match).
- Playwright 1.63.0; Chrome for Testing headless shell 153.0.8010.12.
  The default browser CDN installer returned unusable downloads; obtained the same
  build from Google's Chrome for Testing distribution. No paid CI or deployment.

Reviewed desktop.jpg, mobile.jpg and match.jpg against the visual master.
The navy/orange equipment art renders legibly behind the live type. The simpler
geometric style differs from the painterly reference and remains for Founder review.
Chinese system font installed locally for readable screenshots; not a site change.

Pending: Founder visual decision, detailed painterly assets if still required,
team-logo usage basis, PR #1 sequencing and merge authorisation. PR #6 stays Draft.
