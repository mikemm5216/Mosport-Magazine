/*
 * B-P3-04 — Media → World Evidence Candidate (DRAFT research output, B side only).
 *
 * Spec 03 §7: a separate research lane, READ-ONLY to MOSPORT-A. A candidate records
 * what a source asserted, about whom, when it became available to us, and where it
 * came from. It has no scoring authority: no weight, score, probability or impact
 * field exists, `scoringAuthority` is always NONE and `sentToA` is always false.
 * Nothing here sends anything to A or changes any World value. A's acceptance format
 * is unconfirmed (docs/contracts/EVIDENCE_CANDIDATE_DRAFT.md).
 */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('../../js/contracts/contracts.js') : root.MOSPORT_CONTRACTS;

  var SCHEMA = 'mosport-b/evidence-candidate@0';
  var EVENT_TYPES = ['INJURY_STATUS_REPORTED', 'GAME_RESULT_OFFICIAL', 'TRANSACTION_ANNOUNCED', 'RUMOR_OBSERVED'];
  var PARSER = { name: 'nba-injury-report-text', version: '0.1.0' };

  var FIELDS = ['schema', 'id', 'eventType', 'subjects', 'assertion', 'verificationState', 'sourceRefs', 'sourcePublishedAt', 'firstObservedAt',
    'availableAt', 'rightsStatus', 'dedupeClusterId', 'supersedes', 'retractionOf', 'candidateFeatureFamily', 'missingReasons', 'provenance',
    'scoringAuthority', 'sentToA', 'demo'];

  /** Validate one candidate. Returns a list of problem codes (empty = valid). */
  function validate(c) {
    var p = [];
    if (!c || typeof c !== 'object') return ['WRONG_TYPE'];
    if (c.schema !== SCHEMA) return ['SCHEMA_UNSUPPORTED'];
    Object.keys(c).forEach(function (k) { if (FIELDS.indexOf(k) === -1) p.push('UNKNOWN_FIELD:' + k); });
    FIELDS.forEach(function (k) { if (!(k in c)) p.push('MISSING_FIELD:' + k); });
    if (p.length) return p;
    if (EVENT_TYPES.indexOf(c.eventType) === -1) p.push('BAD_ENUM:eventType');
    if (C.ENUM.verification.indexOf(c.verificationState) === -1) p.push('BAD_ENUM:verificationState');
    if (C.ENUM.rights.indexOf(c.rightsStatus) === -1) p.push('BAD_ENUM:rightsStatus');
    if (c.scoringAuthority !== 'NONE') p.push('SCORING_AUTHORITY_NOT_NONE');
    if (c.sentToA !== false) p.push('SENT_TO_A_NOT_FALSE');
    ['firstObservedAt', 'availableAt'].forEach(function (k) { if (isNaN(C.parseInstant(c[k]))) p.push('BAD_TIME:' + k); });
    if (c.sourcePublishedAt != null && isNaN(C.parseInstant(c.sourcePublishedAt))) p.push('BAD_TIME:sourcePublishedAt');
    /* Chronology: nothing is available before it was published or before we saw it. */
    if (c.sourcePublishedAt && C.parseInstant(c.availableAt) < C.parseInstant(c.sourcePublishedAt)) p.push('AVAILABLE_BEFORE_PUBLISHED');
    if (C.parseInstant(c.availableAt) < C.parseInstant(c.firstObservedAt)) p.push('AVAILABLE_BEFORE_OBSERVED');
    if (!Array.isArray(c.sourceRefs) || !c.sourceRefs.length) p.push('NO_SOURCE');
    if (!Array.isArray(c.subjects) || !c.subjects.length) p.push('NO_SUBJECT');
    else c.subjects.forEach(function (s, i) {
      if (s.id == null && !s.missingReason) p.push('SUBJECT_ID_MISSING_WITHOUT_REASON:' + i);
    });
    if (!Array.isArray(c.missingReasons)) p.push('WRONG_TYPE:missingReasons');
    if (c.eventType === 'RUMOR_OBSERVED' && c.verificationState === 'CONFIRMED') p.push('RUMOR_MARKED_CONFIRMED');
    return p;
  }

  /** Source receipt for one injury report. Rights stay UNVERIFIED: free to read is not free to reuse. */
  function reportSourceReceipt(opts) {
    return {
      schema: C.SCHEMAS.source, id: opts.sourceId, kind: 'OFFICIAL_FACT', originalUrl: opts.url,
      publisher: 'NBA official injury report', authorOrAccount: null, publishedAt: opts.publishedAt, observedAt: opts.observedAt,
      rightsStatus: 'UNVERIFIED', accessMethod: 'OFFICIAL_PAGE', contentFingerprint: C.sha256(opts.text),
      quotedSpan: null, language: 'en', verificationState: 'CONFIRMED', dedupeClusterId: null, demo: !!opts.demo
    };
  }

  function subjectKey(row) { return [row.game.date, row.game.away + '@' + row.game.home, row.team, row.player].join('|'); }

  /**
   * Build candidates from a clean parse of one report.
   * opts: { sourceId, observedAt, rightsStatus, demo, previous: [candidates from earlier reports] }
   * Returns { ok, candidates, unchanged, refused }.
   *   - a parse with any error is refused whole (nothing is half-imported)
   *   - an unchanged status already recorded is not emitted again (counted once)
   *   - a changed status supersedes the earlier candidate, which is kept
   */
  function fromInjuryReport(parsed, opts) {
    if (!parsed || !parsed.ok) return { ok: false, refused: 'PARSE_NOT_CLEAN', candidates: [], unchanged: 0, errors: parsed ? parsed.errors : [] };
    if (isNaN(C.parseInstant(opts.observedAt))) return { ok: false, refused: 'BAD_OBSERVED_AT', candidates: [], unchanged: 0 };
    if (C.parseInstant(opts.observedAt) < C.parseInstant(parsed.report.publishedAt)) return { ok: false, refused: 'OBSERVED_BEFORE_PUBLISHED', candidates: [], unchanged: 0 };
    var latest = {};
    (opts.previous || []).forEach(function (c) { latest[c.provenance.subjectKey] = c; });
    var out = [], unchanged = 0;
    parsed.rows.forEach(function (row) {
      var key = subjectKey(row);
      var prev = latest[key];
      var cluster = 'EVC-' + C.sha256(key + '|injuryStatus|' + row.status).slice(0, 16);
      if (prev && prev.assertion.value === row.status && prev.assertion.reason === row.reason) { unchanged++; return; }
      var c = {
        schema: SCHEMA,
        id: 'EVC-' + C.sha256(key + '|' + parsed.report.publishedAt + '|' + row.status).slice(0, 20),
        eventType: 'INJURY_STATUS_REPORTED',
        subjects: [
          { kind: 'TEAM', id: row.team },
          { kind: 'PLAYER', id: null, printedName: row.player, missingReason: 'PLAYER_ID_NOT_RESOLVED' },
          { kind: 'GAME', id: null, date: row.game.date, away: row.game.away, home: row.game.home, missingReason: 'GAME_ID_NOT_RESOLVED' }
        ],
        assertion: { field: 'injuryStatus', value: row.status, reason: row.reason },
        verificationState: 'CONFIRMED',
        sourceRefs: [opts.sourceId],
        sourcePublishedAt: parsed.report.publishedAt,
        firstObservedAt: opts.observedAt,
        availableAt: opts.observedAt,
        rightsStatus: opts.rightsStatus || 'UNVERIFIED',
        dedupeClusterId: cluster,
        supersedes: prev ? prev.id : null,
        retractionOf: null,
        candidateFeatureFamily: 'AVAILABILITY_RESEARCH',
        missingReasons: ['PLAYER_ID_NOT_RESOLVED', 'GAME_ID_NOT_RESOLVED', 'TIPOFF_AM_PM_NOT_STATED'],
        provenance: { parser: PARSER.name, parserVersion: PARSER.version, subjectKey: key, reportStampET: parsed.report.stampET, line: row.line },
        scoringAuthority: 'NONE',
        sentToA: false,
        demo: !!opts.demo
      };
      out.push(c);
      latest[key] = c;
    });
    var bad = out.map(validate).filter(function (p) { return p.length; });
    if (bad.length) return { ok: false, refused: 'CANDIDATE_INVALID', candidates: [], unchanged: unchanged, problems: bad };
    return { ok: true, candidates: out, unchanged: unchanged };
  }

  /** A source was retracted: emit a retraction candidate for each candidate built on it. */
  function retractionsFor(candidates, sourceId, at) {
    return candidates.filter(function (c) { return c.sourceRefs.indexOf(sourceId) !== -1 && !c.retractionOf; }).map(function (c) {
      return Object.assign(JSON.parse(JSON.stringify(c)), {
        id: c.id + '-RETRACTED', verificationState: 'RETRACTED', retractionOf: c.id, supersedes: null,
        firstObservedAt: at, availableAt: at
      });
    });
  }

  var api = { SCHEMA: SCHEMA, EVENT_TYPES: EVENT_TYPES, PARSER: PARSER, validate: validate, reportSourceReceipt: reportSourceReceipt, fromInjuryReport: fromInjuryReport, retractionsFor: retractionsFor };
  if (node) module.exports = api;
  else root.MOSPORT_EVIDENCE = api;
})(typeof window !== 'undefined' ? window : globalThis);
