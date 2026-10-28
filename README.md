# MOSPORT — More than sport

MOSPORT-B: the MOSPORT sports magazine (frontend) and, later, its editorial
workflow. World Engine judgments come from MOSPORT-A (`Mosport-NBA`) and are
rendered read-only.

- Agent rules: [`AGENTS.md`](AGENTS.md)
- Founder decisions and visual master: [`docs/founder/2026-10-28-spec-lock/`](docs/founder/2026-10-28-spec-lock/)
- Plan: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Image slots and how to replace art: [`docs/ASSET_SLOTS.md`](docs/ASSET_SLOTS.md)

## Run

Open `site/index.html` in a browser. No build step, no server required.

| URL parameter | Effect |
|---|---|
| `?lang=en` | English edition (brand strings stay English in both) |
| `?theme=dark` | Night mode (also remembered from the toggle) |
| `?fixture=empty` | An issue with no eligible content: slots disappear |
| `?fixture=bypass` | Unapproved high-risk items injected: they must not render |
| `?slots=1` | Outline image slots with id, state, version and reason |
| `?art=fallback` | Show every art slot's fallback (layout must not change) |
| `?art=candidate` | Preview CANDIDATE art awaiting Founder approval (prototype only) |
| `?zoom=fit` / `?zoom=120` | Reader zoom on the desktop spread (also kept across pages) |
| `?mode=production` | Production render policy (DEMO issues and placeholder art refused) |

Everything shown is **DEMO**: real team names, fictional reads and stories.

## Test

```
npm test
```

Needs Node 18+. First run:

```
npm install
npm run setup:browsers   # downloads Chromium for Playwright (free, local)
```

同日後續決議與覆核：[Founder follow-up](docs/FOUNDER_FOLLOWUP_20261028.md)。
