# Internal evidence-bound media drafts

This is an offline draft compiler, not a publishing system or finished media.
It produces an article draft, alternating-speaker podcast script, and text-card
image-short storyboard from one explicitly pinned NBA locked World package.
There is no audio/video/image generation service, athlete likeness, media asset,
network request or public route. World remains the sole judgment source.
World v1 has no issued prediction, so drafts state that absence; they never fill
win probability, verdict, advantage, causal explanation or recommendation.

Dependency: Magazine #16 at 9890f8aa9c89c2da060fc49eb23611aa9c4cb99b
and its #14/#15/NBA #76 dependencies. Coach #17 is independent and unchanged.
The existing `locked-world` consumer validates exact game/stage/lock/artifact
pins and embedded World v1. Optional #14 facts must match the same revision.
Only OBSERVED metrics become statements; missing metrics are omitted, never
rendered as zero or estimates. Each factual statement names provenance keys;
all three formats retain their own draft/DEMO and rights notice, including a
spoken opening disclosure in the podcast script. Each references these same
statements rather than independent
editorial claims. Schedule wording explicitly says provisional.

## Commands

```
node scripts/build-media-drafts.js --inspection /approved/inspection.json --pins /trusted/pins.json --mode INTERNAL_INPUT
```

Optional `--facts` supplies the separately bound facts file. `--mode DEMO` is
required for synthetic tests and outputs conspicuous DEMO/合成測試草稿 labels.
INTERNAL_INPUT is a caller declaration, not source authentication. All outputs
retain NOT_INDEPENDENTLY_AUTHENTICATED, rights UNVERIFIED, DRAFT, approval null,
QA NOT_RUN and publiclyEligible false. Internal labelling does not confer source
rights or authorize real product intake. No real-game evidence is supplied here.

Default clock is current UTC. Explicit `--now` is labelled EXPLICIT_REPLAY;
replaying a synthetic or historical fixture is not a timely production run.
The underlying receipt TTL remains unchanged, so FINAL may already be stale.
Stale, withdrawn, superseded, tampered or mismatched artifacts refuse the whole
draft without a fallback. Optional invalid facts also refuse the whole draft.

`build(inspection,pins,{createdAt,mode},now,facts?)` creates deterministic drafts.
`read(bundle,inspection,pins,now,facts?)` revalidates source lifecycle/pins and
reconstructs the exact template. Edited wording, approvals, labels, rights or
provenance cannot pass merely by recomputing a hash. Source expiry invalidates
re-export. There is no transport for unseen remote withdrawals; every read is
only as current as the separately supplied trusted artifact and manifest.

## Editorial boundary

The existing editorial workflow/store is DEMO-only and has no real publication
authority. This compiler does not insert records into it, create approvals,
produce publication receipts, change eligibility rules, or mark QA complete.
A future reviewed adapter can take human-edited drafts through the established
source, risk, QA and approval workflow once its real authorization and source
rights requirements are met. This file format is intentionally not an
`editorial-item@1` or a public issue. Do not bypass existing human review rules.

No UI changes; browser visual acceptance is not claimed. Tests exercise
synthetic draft generation, shared provenance, missing values, tampering,
expiry/withdrawal/supersession, exact pins and the read-only file CLI.
