# ADR-B001 — Separate repo, static stack for P1

**Status:** Accepted (engineering decision under the 2026-10-28 Founder authorisation)

## Context

- MOSPORT-A (`Mosport-NBA`) owns World Engine and must not host B's UI.
- Repo inventory on 2026-10-28: `Mosport` (Feb 2026, backend only) and
  `Mosport-V10` (Mar 2026, legacy Python + Next.js monolith) are not B frontends.
  `Mosport-Baseball` and `Mosport-Terminal` are other product lines. No B repo
  existed, so a new private repo `Mosport-Magazine` is used.
- P1 needs a high-fidelity, testable site now; P2 will add real data contracts.
  No paid CI or hosting may be enabled.

## Decision

- P1 ships as a **static site** in `site/`: HTML, CSS and vanilla JS custom
  elements, no build step, opens from disk.
- Display fonts are self-hosted OFL files (Anton, Barlow Condensed, Inter);
  CJK uses the system Noto Sans TC / PingFang / JhengHei stack.
- Tests: `node --test` for the eligibility gate; Playwright (preinstalled locally,
  not a paid service) for browser checks and screenshots. No hosted CI.

## Consequences

- Moving to React/Next later is a P2 decision; the eligibility module and the
  slot components are framework-free and can be ported as-is.
- Nothing here deploys. A deployment target needs a separate Founder decision.
