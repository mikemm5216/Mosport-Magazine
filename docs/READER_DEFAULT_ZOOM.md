# Reader default zoom — Fit Page vs a readable default

Independent review, point 3. **Fit Width is now the default** after Founder delegated the P1 continuation to ChatGPT. Fit Page remains one click away.

## Measured (Chromium, real renders)

| Viewport | Fit Page | Lead-card body copy at Fit | At 100% |
|---|---|---|---|
| 1440×900 | 64% | ≈ 9 px effective | 14 px |
| 1280×800 | 55% | ≈ 8 px effective | 14 px |

Fit Page shows the whole spread, but body copy at about 9 px is below a comfortable
reading size. Side-by-side evidence:
- `docs/reports/2026-10-28-b-p1/evidence-v2/read-1440-fit-vs-100.jpg`
- `docs/reports/2026-10-28-b-p1/evidence-v2/read-1280-fit-vs-100.jpg`
- the lead-copy crops: `read-1440-fit-lead-copy.jpg` and `read-1440-100-lead-copy.jpg`

## Decision and implementation

- Default to **Fit Width**: the largest zoom that fits the spread's width, capped at 100%.
  At 1440 this is 100%; at 1280 it is about 91%. The reader scrolls down the spread.
- Keep **Fit Page** as a one-click button to see the whole magazine.
- No layout change is involved. It means adding one reader mode and changing which mode
  is the default.

## Acceptance after implementation

The toolbar now includes both **Fit Width** and **Fit Page**. A fresh desktop reading session defaults to `?zoom=width` behavior (unless an explicit URL zoom or saved in-session preference overrides it). Width fit caps at 100%, preserves the entire spread's width and allows vertical reading. Existing `?zoom=fit` and manual 50–200% modes remain compatible; `W` selects Fit Width, `F` selects Fit Page. `tests/e2e/zoom-suite.js` covers these behaviors. Current-HEAD browser verification was subsequently completed: 321/321 existing browser checks passed at native-art integration, with rendered screenshots in docs/reports/2026-10-28-native-v2/. Final Founder visual approval remains separate.
