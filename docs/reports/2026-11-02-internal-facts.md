# Internal pregame facts inspector — 2026-11-02

Status: OPEN. This adds a bounded internal-only display to the existing World
package inspector. It depends on the candidate source-fact contract in
Mosport-NBA PR #69 and does not enable public rendering or predict a winner.

The second file must match the already validated World revision, source receipt,
team identities, lock and freshness. Its fingerprint detects modifications, not
source authenticity or rights. Unknown fields, invalid numbers and mismatches
are refused. An expired, withdrawn or superseded World read hides facts. The
normal clock refreshes once a second; a deliberately selected historical clock
is explicitly marked replay. The existing limitation remains: no live revocation
transport, so the inspector cannot detect a remote withdrawal not yet supplied.

Cloud verification: 25 targeted Node tests cover the bridge, internal render,
expiry, injection refusal, preserving clock edits and existing World consumer. An actual OKC at CLE
source record produced by NBA PR #69 was accepted by the bridge while active.
No real source payload is included in this PR. Browser visual/e2e checks and
independent exact-HEAD review remain required; public output is unchanged.
