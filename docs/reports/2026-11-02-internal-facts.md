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

Follow-up candidate: an optional NBA official leader file binds to the same
World revision and requires an official observation strictly before lock. It
shows the provider-designated players and displayed points/rebounds/assists,
without calling them starters or a complete roster. NBA person IDs remain
unmapped. Thirty focused Node tests cover both fact readers and the inspector;
full browser visual/e2e checks remain pending. No live revocation transport is
added. This depends on NBA PR #70 as well as #69 and Magazine PR #14.
