# Coach Challenge: private durable ledger, partial implementation

Work package: COACH-ARENA-01, bounded prerequisite to Founder Q19 in NBA PR #72.
Depends on Magazine main e4874cba and trusted server adapters not implemented here.
Blocks: authenticated Arena integration; does not block the World/NBA queue.
betaGate: no promotion. Draft, no merge or deployment authority.

## Actual capability

`internal/coach/challenge-store.js` runs in Node 22.12+ with SQLite, outside the
public static site. `ChallengeStore.submit(authContext, command)` durably records
a participant's original HOME/AWAY stance, or another participant's opposing
challenge to that exact original stance. Records are private and NOT_SETTLED.
This is Coach user input, never a World probability, engine verdict or ordinary
poll. No legacy Terminal code or seeded picks were copied.

The original stance locks immediately upon acceptance, before a trusted cutoff.
The cutoff must be strictly before tipoff. This intentionally conservative slice
has no edit/draft mechanism. `BEGIN IMMEDIATE`, request IDs, unique participant
constraints and SQL triggers preserve an append-only record. Separate connections
share the same SQLite file; this is not a distributed cloud authority.

Required server-owned adapters:

- `authenticate(authContext)` returns exactly `{subject, active: true}` from a
  real authenticated session. Never use a request body's claimed subject. No
  identity provider is installed here and test subjects are synthetic.
- `resolveGame(gameId)` returns exactly `{gameId, homeId, awayId, tipoffAt,
  cutoffAt, revision, state: 'SCHEDULED'}` from a trusted qualified source.
  Revision is a 64-character lowercase SHA-256; time is canonical UTC with
  milliseconds. Game IDs use `espn:<digits>`. This is an adapter boundary, not
  evidence that any live source or rights were verified. The first accepted game
  version is pinned; subsequent changes block new records rather than silently
  shifting cutoffs or replacing team identities. Cancelled/completed games block
  new submissions. Reschedule/cancellation reconciliation remains unimplemented.
- `clock()` defaults to server UTC. Production must not accept client/replay time.
  The database rejects clock rollback relative to authenticated attempts, including rejected post-cutoff attempts. This
  detects observed backwards movement, not an inaccurate or compromised clock.

Command keys are exactly `requestId`, `gameId`, `kind`, `selection`, `targetId`.
`kind` is STANCE (null target) or CHALLENGE (original stance record ID). Selections
are HOME or AWAY; no betting lines, prices or probability. One original stance
per participant/game and one challenge per participant/target are allowed.
Self-challenge, agreeing selection and challenge-of-challenge are refused. A participant cannot take conflicting sides for the same game across original stances and challenges.
Idempotent retries return the existing immutable receipt, including after cutoff;
they do not accept a new submission or change its recorded time. A request ID
cannot be reused by another actor or for different content. Credentials are never
persisted. Responses contain a content digest and the target's digest; hashes
are integrity references, not signatures, authentication or tamper-proof storage.

## Private readout (M4, NBA #178)

`readout(authContext, challengeId)` is a read-only private settlement of one locked
pair: the CHALLENGE record named by `challengeId` and the original STANCE it
targets. It writes nothing; stored records keep `result: 'NOT_SETTLED'`, and the
readout is recomputed on each call from the immutable tickets plus A's result.

Two further optional server-owned adapters, both required for any settlement:

- `resolveOfficialResult(gameId)` returns MOSPORT-A's
  `mosport-a/coach-official-result@1` with exactly `schema, status, nbaGameId,
  gameId, homeId, awayId, tipoffAt, gameRevision, homeScore, awayScore, winner,
  revision, receiptSha256, producedAt` (A's `nba:official-result --coach-pin`
  output, NBA #178). B never computes or adjusts a result.
- `resolveResultPin(gameId)` returns B's independently held 64-hex original
  `receiptSha256` for that game. Result and pin come from B's own trusted
  provider, never from a request body.

`SETTLED` requires all of: an authenticated `{subject, active: true}` who is one
of the two participants; both tickets present with recomputed digests matching
the stored ones; the challenge's `targetDigest` equal to the stance digest,
different actors and opposite HOME/AWAY selections; both tickets carrying the
pinned `coach_games` body; stance before challenge and both before `cutoffAt`,
itself before tipoff; result `status: 'VERIFIED'`, `receiptSha256` equal to the
pin; result `gameId`, `homeId`, `awayId`, `tipoffAt` and `gameRevision` equal to
the locked game; non-negative integer scores, no tie, `winner` consistent with
scores, positive `revision`, `producedAt` after tipoff and a 10-digit
`nbaGameId`. The readout returns digests, scores, winner, result revision and
receipt hash, plus the viewer's role, selection and WON/LOST. It carries no
participant subject.

Anything else returns exactly `{schema: 'mosport-coach/challenge-readout@1',
status: 'UNAVAILABLE', reason}` with one of IDENTITY_UNAVAILABLE (also used for
a non-participant, so as not to reveal the pair), TICKET_UNAVAILABLE,
TICKET_DIGEST_MISMATCH, TARGET_MISMATCH, GAME_MISMATCH, DEADLINE_VIOLATION,
RESULT_UNAVAILABLE, RESULT_PIN_MISMATCH, RESULT_GAME_MISMATCH or
RESULT_INVALID. Adapter exceptions fail closed to UNAVAILABLE. The reason is
for the private operator; a reader UI shows only that it is unavailable.

The pair is settled only when the trusted pregame resolver pinned the same
snapshot revision and team codes that A's result names. A ticket bound to any
other revision, or a game with no real locked tickets, stays unavailable. No
research prediction, finished game or invented participant can become a ticket,
because `submit` still refuses anything at or after the cutoff.

## Explicit incomplete work

No real user authentication, public API/UI, consent/share route, creator imports,
rankings, persisted settlement records, B-side result/pin provider wiring, cancellation policy, moderation,
user data retention/deletion policy, backup/restore, distributed fencing, or
production security review. Do not load this module into the public site or
accept requests before those integrations and Founder approvals. Runtime owners
must restrict database file access; SQL triggers do not protect against a database
administrator or a process that can replace the file. Auth adapter failure or
unknown identity must fail closed. User identifiers are private, not public names.

No real-person challenge or real-game acceptance is claimed. Current tests use
synthetic identities and game metadata with real SQLite persistence. They verify
implementation behavior, not completion of Founder Q19.

## Verification

`node --test tests/unit/coach-challenge.test.js` exercises persistence across two
connections, exact cutoff, immutable records, replay conflicts, unauthorized
identity, self/same-side challenges, changed game revision, invalid source and
clock rollback. Node runtimes without `node:sqlite` skip this internal test suite;
such a skipped result is not acceptance. Node 22.12+ is required for this module.

Run full `npm test` for repository checks. Browser runtime/visual status must be
reported separately; this patch adds no DOM, image, CSS or public route.
