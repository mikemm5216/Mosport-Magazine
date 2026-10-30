/*
 * B-P2-01a — read-only consumer of MOSPORT-A's game-level World Analysis Package v1
 * (`mosport-a/world-analysis-package@1`, owned by mikemm5216/Mosport-NBA,
 * docs/contracts/WORLD-ANALYSIS-PACKAGE-V1.md). Pure functions, no DOM, no network.
 * Works in the browser (window.MOSPORT_WORLD_A1) and in Node (module.exports).
 *
 * B re-checks what it can check on its own: the strict wire shape (unknown keys and
 * versions fail), canonical UTC instants, fingerprint and revision, chronology,
 * game id, provider provenance, venue local date, lifecycle and freshness rules.
 * B cannot check, and does not claim: who issued the file, A's franchise/venue
 * registry digests (A replay is required for that) or the source bytes themselves.
 *
 * v1 cannot carry an issued judgment: world.state is only NOT_ISSUED, every number
 * is null, distribution is INTERNAL and rights are UNVERIFIED. So nothing from a v1
 * package can reach the public reader. B never computes, fills or replaces a value.
 */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('./contracts.js') : root.MOSPORT_CONTRACTS;

  var SCHEMA = 'mosport-a/world-analysis-package@1';
  var PRODUCER = 'world-package/1.0.0';
  var FRESH_MS = 15 * 60 * 1000;
  var READ_STATES = ['ACTIVE', 'STALE', 'WITHDRAWN', 'SUPERSEDED'];
  /* What B cannot verify from the file alone. Shown with every internal view. */
  var CONSUMER_LIMITS = ['ISSUER_NOT_AUTHENTICATED', 'REGISTRY_DIGESTS_NOT_VERIFIED_BY_B', 'SOURCE_BYTES_NOT_AVAILABLE_TO_B', 'NO_LIVE_REVOCATION_TRANSPORT'];

  /* ---------------- wire shape (mirrors A's strict schema) ---------------- */

  function lit(v) { return { lit: v }; }
  function re(s) { return { re: new RegExp(s) }; }
  function oneOf(a) { return { oneOf: a }; }
  function obj(shape) { return { obj: shape }; }
  function nullable(d) { return { nullable: d }; }
  function missing(reason) { return obj({ status: lit('BLOCKED_MISSING'), value: lit(null), reason: lit(reason) }); }

  var HASH = re('^[0-9a-f]{64}$');
  var INSTANT = { instant: true };
  var ESPN_SCOREBOARD = re('^https://site\\.api\\.espn\\.com/apis/site/v2/sports/basketball/nba/scoreboard\\?dates=\\d{8}$');
  var TEAM = obj({ franchiseId: re('^MNBA-F\\d{2}$'), espnTeamId: re('^\\d+$'), displayCode: re('^[A-Z0-9]{2,4}$') });

  var SHAPE = obj({
    schema: lit(SCHEMA),
    owner: lit('MOSPORT-A'),
    producerVersion: lit(PRODUCER),
    packageId: re('^mosport-a:espn:[0-9]+$'),
    revision: re('^sha256:[0-9a-f]{64}$'),
    fingerprint: HASH,
    asOf: INSTANT,
    lockAt: INSTANT,
    validUntil: INSTANT,
    game: obj({
      canonicalId: re('^espn:[0-9]+$'),
      espnGameId: re('^[0-9]+$'),
      nbaGameId: missing('IDENTITY_UNRESOLVED'),
      competition: oneOf(['NBA_REGULAR_SEASON', 'NBA_PLAY_IN', 'NBA_POSTSEASON']),
      home: TEAM,
      away: TEAM,
      tipoffAt: INSTANT,
      venue: obj({
        venueId: re('^MNBA-V\\d{2}$'),
        timeZone: re('^[A-Za-z_]+/[A-Za-z_/-]+$'),
        localDate: re('^\\d{4}-\\d{2}-\\d{2}$'),
        role: oneOf(['HOME_DESIGNATED', 'NEUTRAL'])
      })
    }),
    evidence: obj({
      receipt: obj({
        provider: lit('ESPN_SCOREBOARD'),
        sourceClass: lit('ESPN_PROVISIONAL'),
        requestedDate: re('^\\d{8}$'),
        sourceRef: ESPN_SCOREBOARD,
        observedAt: INSTANT,
        sha256: HASH
      }),
      observation: obj({ observedAt: INSTANT, sha256: HASH }),
      snapshot: nullable(obj({ capturedAt: INSTANT, sha256: HASH })),
      snapshotMissingReason: nullable(lit('SOURCE_NOT_PUBLISHED')),
      franchiseRegistrySha256: HASH,
      venueRegistrySha256: HASH
    }),
    qualification: obj({
      schedule: oneOf(['OBSERVED_PROVISIONAL', 'BLOCKED_MISSING']),
      reason: nullable(oneOf(['TIMESTAMP_UNVERIFIED', 'POSTGAME_ONLY'])),
      rights: lit('UNVERIFIED'),
      schedulePublicEligible: lit(false)
    }),
    lifecycle: obj({
      state: oneOf(READ_STATES),
      supersededByReceipt: nullable(HASH),
      receipt: obj({ sourceRef: ESPN_SCOREBOARD, observedAt: INSTANT, sha256: HASH })
    }),
    world: obj({
      state: lit('NOT_ISSUED'),
      homeWinProbability: lit(null),
      interval60: lit(null),
      verdict: lit(null),
      why: missing('SOURCE_NOT_PUBLISHED'),
      missingReason: lit('FEATURE_PIPELINE_NOT_CONNECTED'),
      engine: missing('SOURCE_NOT_PUBLISHED'),
      distributionEligibility: lit('INTERNAL'),
      publiclyEligible: lit(false)
    }),
    follow: obj({
      status: missing('SOURCE_NOT_PUBLISHED'),
      score: missing('POSTGAME_ONLY'),
      settlement: missing('SOURCE_NOT_PUBLISHED')
    })
  });

  function isPlain(v) { return v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype; }

  /** A's wire instant: UTC, milliseconds, a real calendar date, and an exact round trip. */
  function epoch(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)) return NaN;
    var t = C.parseInstant(s);
    return !isNaN(t) && new Date(t).toISOString() === s ? t : NaN;
  }

  /* Returns the first problem { code, path } or null. */
  function check(d, v, path) {
    if (d.nullable) return v === null ? null : check(d.nullable, v, path);
    if ('lit' in d) return v === d.lit ? null : { code: 'WRONG_VALUE', path: path };
    if (d.re) return typeof v === 'string' && d.re.test(v) ? null : { code: 'BAD_FORMAT', path: path };
    if (d.oneOf) return d.oneOf.indexOf(v) !== -1 ? null : { code: 'WRONG_VALUE', path: path };
    if (d.instant) return isNaN(epoch(v)) ? { code: 'NON_CANONICAL_INSTANT', path: path } : null;
    if (!isPlain(v)) return { code: 'NOT_OBJECT', path: path };
    var keys = Object.keys(d.obj);
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k) && keys.indexOf(k) === -1) return { code: 'UNKNOWN_FIELD', path: path + '.' + k };
    for (var i = 0; i < keys.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(v, keys[i])) return { code: 'MISSING_FIELD', path: path + '.' + keys[i] };
      var p = check(d.obj[keys[i]], v[keys[i]], path + '.' + keys[i]);
      if (p) return p;
    }
    return null;
  }

  function isIanaZone(z) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: z }).format(0); return z.indexOf('/') !== -1 || z === 'UTC'; } catch (e) { return false; }
  }
  function localDate(zone, at) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(epoch(at)));
  }

  /** SHA-256 over canonical JSON of the package without fingerprint and revision. */
  function fingerprintOf(p) {
    var body = {};
    Object.keys(p).forEach(function (k) { if (k !== 'fingerprint' && k !== 'revision') body[k] = p[k]; });
    return C.sha256(C.canonical(body));
  }

  function fail(code, path) { return { ok: false, code: code, path: path || null }; }

  /**
   * validate(raw) → { ok: true, pkg } | { ok: false, code, path }.
   * Fail-closed: the first broken rule refuses the whole package.
   */
  function validate(raw) {
    if (!isPlain(raw)) return fail('NOT_OBJECT', 'package');
    if (raw.schema !== SCHEMA) return fail('SCHEMA_UNSUPPORTED', 'package.schema');
    var shape = check(SHAPE, raw, 'package');
    if (shape) return fail(shape.code, shape.path);
    var p = raw;
    if (fingerprintOf(p) !== p.fingerprint || p.revision !== 'sha256:' + p.fingerprint) return fail('PACKAGE_FINGERPRINT_MISMATCH', 'package.fingerprint');
    var at = epoch(p.asOf), lock = epoch(p.lockAt), tip = epoch(p.game.tipoffAt);
    var observed = epoch(p.evidence.receipt.observedAt);
    if (lock >= tip || observed > at || lock > at) return fail('INVALID_PACKAGE_CHRONOLOGY', 'package.lockAt');
    if (p.evidence.observation.observedAt !== p.evidence.receipt.observedAt) return fail('OBSERVATION_RECEIPT_MISMATCH', 'package.evidence.observation');
    if (p.evidence.receipt.sourceRef !== 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=' + p.evidence.receipt.requestedDate) return fail('INVALID_PROVIDER_PROVENANCE', 'package.evidence.receipt.sourceRef');
    if (p.game.home.franchiseId === p.game.away.franchiseId || p.game.home.espnTeamId === p.game.away.espnTeamId) return fail('IDENTITY_UNRESOLVED', 'package.game');
    if (p.game.canonicalId !== 'espn:' + p.game.espnGameId || p.packageId !== 'mosport-a:' + p.game.canonicalId) return fail('GAME_ID_MISMATCH', 'package.game.canonicalId');
    if (!isIanaZone(p.game.venue.timeZone) || localDate(p.game.venue.timeZone, p.game.tipoffAt) !== p.game.venue.localDate) return fail('INVALID_VENUE_TIMEZONE', 'package.game.venue');
    var lifecycleAt = epoch(p.lifecycle.receipt.observedAt);
    if (lifecycleAt < observed || lifecycleAt > at || p.lifecycle.receipt.sourceRef !== p.evidence.receipt.sourceRef) return fail('INVALID_LIFECYCLE_PROVENANCE', 'package.lifecycle.receipt');
    var st = p.lifecycle.state;
    if ((st === 'ACTIVE' || st === 'STALE') && p.lifecycle.receipt.sha256 !== p.evidence.receipt.sha256) return fail('UNRECORDED_SUPERSESSION', 'package.lifecycle.receipt');
    if ((st === 'SUPERSEDED') !== (p.lifecycle.supersededByReceipt !== null)) return fail('INVALID_SUPERSESSION', 'package.lifecycle');
    if (st === 'SUPERSEDED' && (p.lifecycle.receipt.sha256 !== p.lifecycle.supersededByReceipt || p.lifecycle.receipt.sha256 === p.evidence.receipt.sha256)) return fail('INVALID_SUPERSESSION', 'package.lifecycle');
    if ((p.evidence.snapshot === null) !== (p.evidence.snapshotMissingReason !== null)) return fail('SNAPSHOT_MISSING_REASON_REQUIRED', 'package.evidence.snapshot');
    if (epoch(p.validUntil) !== Math.min(tip, observed + FRESH_MS)) return fail('INVALID_VALID_UNTIL', 'package.validUntil');
    if (p.qualification.schedule === 'OBSERVED_PROVISIONAL' && (observed >= lock || p.qualification.reason !== null)) return fail('PRELOCK_EVIDENCE_REQUIRED', 'package.qualification');
    if (p.qualification.schedule === 'BLOCKED_MISSING' && p.qualification.reason === null) return fail('MISSING_REASON_REQUIRED', 'package.qualification.reason');
    if (p.evidence.snapshot) {
      var cap = epoch(p.evidence.snapshot.capturedAt);
      if (cap > lock || cap <= observed) return fail('INVALID_SNAPSHOT_CHRONOLOGY', 'package.evidence.snapshot.capturedAt');
    }
    return { ok: true, pkg: p };
  }

  /**
   * readState(raw, now) → { ok: true, state } | { ok: false, code }.
   * Evaluate on every read; a stop state (WITHDRAWN, SUPERSEDED) wins over expiry.
   */
  function readState(raw, now) {
    var v = validate(raw);
    if (!v.ok) return v;
    var clock = C.parseInstant(now);
    if (isNaN(clock)) return fail('NO_CLOCK', 'now');
    if (clock < epoch(v.pkg.asOf)) return fail('PACKAGE_FROM_FUTURE', 'package.asOf');
    if (v.pkg.lifecycle.state !== 'ACTIVE') return { ok: true, state: v.pkg.lifecycle.state };
    return { ok: true, state: clock >= epoch(v.pkg.validUntil) ? 'STALE' : 'ACTIVE' };
  }

  /**
   * select(revisions, now) → { ok: true, pkg } | { ok: false, code }.
   * Needs A's complete revision set for one game. Any invalid, future, mixed or
   * conflicting revision refuses the set; there is no fallback to an older file.
   */
  function select(revisions, now) {
    if (!Array.isArray(revisions) || !revisions.length) return fail('NO_PACKAGE_REVISION', 'revisions');
    var clock = C.parseInstant(now);
    if (isNaN(clock)) return fail('NO_CLOCK', 'now');
    var parsed = [];
    for (var i = 0; i < revisions.length; i++) {
      var v = validate(revisions[i]);
      if (!v.ok) return fail(v.code, 'revisions[' + i + ']' + (v.path ? v.path.slice('package'.length) : ''));
      parsed.push(v.pkg);
    }
    if (parsed.some(function (p) { return p.packageId !== parsed[0].packageId; })) return fail('MIXED_GAME_REVISIONS', 'revisions');
    var seen = {};
    for (var j = 0; j < parsed.length; j++) {
      var t = epoch(parsed[j].asOf);
      if (t > clock) return fail('PACKAGE_FROM_FUTURE', 'revisions[' + j + '].asOf');
      if (seen[t] && seen[t] !== parsed[j].fingerprint) return fail('CONFLICTING_PACKAGE_REVISIONS', 'revisions');
      seen[t] = parsed[j].fingerprint;
    }
    parsed.sort(function (a, b) { return epoch(a.asOf) - epoch(b.asOf); });
    return { ok: true, pkg: parsed[parsed.length - 1] };
  }

  /**
   * Why a package cannot reach the public reader. In v1 the list is never empty:
   * the wire contract itself forbids PUBLIC, ISSUED and verified rights.
   */
  function publicBlockers(p, state) {
    var out = [];
    if (state !== 'ACTIVE') out.push('READ_' + state);
    if (p.world.state !== 'ISSUED') out.push('WORLD_NOT_ISSUED');
    if (p.world.distributionEligibility !== 'PUBLIC' || p.world.publiclyEligible !== true) out.push('WORLD_INTERNAL');
    if (p.qualification.schedulePublicEligible !== true) out.push('SCHEDULE_NOT_PUBLIC_ELIGIBLE');
    if (p.qualification.rights !== 'VERIFIED') out.push('RIGHTS_UNVERIFIED');
    return out;
  }

  function reasonOf(m) { return { status: m.status, reason: m.reason }; }

  /**
   * internalView(raw, now): what the internal inspector may show. There is no
   * probability, interval or verdict field to show: v1 has none, and B adds none.
   * A refused package yields { status: 'REFUSED', code, path } and nothing else.
   */
  function internalView(raw, now) {
    var r = readState(raw, now);
    if (!r.ok) return { status: 'REFUSED', code: r.code, path: r.path };
    var p = raw;
    var blockers = publicBlockers(p, r.state);
    return {
      status: 'OK',
      schema: p.schema, packageId: p.packageId, revision: p.revision, producerVersion: p.producerVersion,
      asOf: p.asOf, lockAt: p.lockAt, validUntil: p.validUntil, readState: r.state,
      game: {
        canonicalId: p.game.canonicalId, espnGameId: p.game.espnGameId, nbaGameId: reasonOf(p.game.nbaGameId),
        competition: p.game.competition, tipoffAt: p.game.tipoffAt,
        away: { franchiseId: p.game.away.franchiseId, displayCode: p.game.away.displayCode },
        home: { franchiseId: p.game.home.franchiseId, displayCode: p.game.home.displayCode },
        venue: { venueId: p.game.venue.venueId, timeZone: p.game.venue.timeZone, localDate: p.game.venue.localDate, role: p.game.venue.role }
      },
      evidence: {
        sourceClass: p.evidence.receipt.sourceClass, sourceRef: p.evidence.receipt.sourceRef,
        receiptObservedAt: p.evidence.receipt.observedAt, receiptSha256: p.evidence.receipt.sha256,
        snapshot: p.evidence.snapshot ? { capturedAt: p.evidence.snapshot.capturedAt, sha256: p.evidence.snapshot.sha256 } : null,
        snapshotMissingReason: p.evidence.snapshotMissingReason
      },
      qualification: { schedule: p.qualification.schedule, reason: p.qualification.reason, rights: p.qualification.rights },
      lifecycle: { state: p.lifecycle.state, receiptObservedAt: p.lifecycle.receipt.observedAt, receiptSha256: p.lifecycle.receipt.sha256, supersededByReceipt: p.lifecycle.supersededByReceipt },
      world: {
        state: p.world.state, missingReason: p.world.missingReason,
        engine: reasonOf(p.world.engine), why: reasonOf(p.world.why),
        distributionEligibility: p.world.distributionEligibility
      },
      follow: { status: reasonOf(p.follow.status), score: reasonOf(p.follow.score), settlement: reasonOf(p.follow.settlement) },
      publicRenderable: blockers.length === 0,
      publicBlockers: blockers,
      consumerLimits: CONSUMER_LIMITS.slice()
    };
  }

  /**
   * publicProjection(raw, now): the only door to the public reader. It returns
   * null with the blockers; a v1 package never opens it. A refused package is null too.
   */
  function publicProjection(raw, now) {
    var v = internalView(raw, now);
    if (v.status !== 'OK') return { game: null, blockers: ['PACKAGE_REFUSED:' + v.code] };
    return { game: null, blockers: v.publicBlockers.length ? v.publicBlockers : ['NO_PUBLIC_MAPPING_IN_V1'] };
  }

  var api = {
    SCHEMA: SCHEMA, PRODUCER: PRODUCER, READ_STATES: READ_STATES, CONSUMER_LIMITS: CONSUMER_LIMITS,
    validate: validate, readState: readState, select: select, fingerprintOf: fingerprintOf,
    internalView: internalView, publicProjection: publicProjection
  };
  if (node) module.exports = api;
  else root.MOSPORT_WORLD_A1 = api;
})(typeof window !== 'undefined' ? window : globalThis);
