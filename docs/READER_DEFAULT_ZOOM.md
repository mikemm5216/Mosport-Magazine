# Reader default zoom — Fit Page vs a readable default

Independent review, point 3. **No default has been changed.** This note gives the
evidence and a recommendation for the Founder.

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

## Recommendation (for the Founder; not implemented)

- Open at **Fit Width**: the largest zoom that fits the spread's width, capped at 100%.
  At 1440 this is 100%; at 1280 it is about 91%. The reader scrolls down the spread.
- Keep **Fit Page** as a one-click button to see the whole magazine.
- No layout change is involved. It means adding one reader mode and changing which mode
  is the default.
