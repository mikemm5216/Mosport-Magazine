/*
 * B-P2-02 — MOSPORT-B owned contracts (versioned, machine-checked).
 * Pure functions, no DOM, no network. Works in the browser
 * (window.MOSPORT_CONTRACTS) and in Node (module.exports).
 *
 * These are B's own records: editorial items, source / approval / publication
 * receipts, the Editor layout plan and the magazine issue that bundles them.
 * The game entries inside an issue use B's *prototype* World view
 * (`mosport-b/prototype-game@0`). That is a B fixture shape, NOT a MOSPORT-A
 * contract: A has no published game-level World package yet
 * (docs/P2_CONTRACT_COMPATIBILITY.md). Nothing here computes a World value.
 *
 * Every validator returns a list of problems `{ code, path, detail }`;
 * an empty list means valid. Unknown fields are rejected, so a record cannot
 * smuggle an extra field (for example an embedded `approval`) past the gate.
 */
(function (root) {
  'use strict';

  var SCHEMAS = {
    item: 'mosport-b/editorial-item@1',
    source: 'mosport-b/source-receipt@1',
    sourceEvent: 'mosport-b/source-event@1',
    approval: 'mosport-b/approval-receipt@1',
    layout: 'mosport-b/layout-plan@1',
    issue: 'mosport-b/magazine-issue@1',
    publication: 'mosport-b/publication-receipt@1',
    game: 'mosport-b/prototype-game@0'
  };

  var ENUM = {
    itemType: ['GAME_ANALYSIS', 'NEWS', 'FEATURE', 'STREAK', 'REVIEW'],
    label: ['BREAKING_NEWS', 'MOSPORT_EXCLUSIVE', 'STREAK_WATCH'],
    trigger: ['MAJOR_NEWS', 'UNVERIFIED_RUMOR', 'SENSITIVE_NEWS', 'EXCLUSIVE_CLAIM'],
    publishState: ['DRAFT', 'IN_QA', 'HELD_FOR_EVIDENCE', 'AWAITING_HUMAN_APPROVAL', 'APPROVED', 'PUBLISHED', 'CORRECTION_PENDING', 'WITHDRAWN', 'REJECTED'],
    sourceKind: ['OFFICIAL_FACT', 'REPORT', 'RUMOR', 'OPINION', 'SOCIAL_REACTION', 'WORLD_PACKAGE', 'MOSPORT_ORIGINAL'],
    rights: ['OWNED', 'LICENSED', 'PERMITTED_QUOTE', 'LINK_ONLY', 'UNVERIFIED', 'BLOCKED'],
    access: ['OFFICIAL_PAGE', 'RSS', 'API_FREE', 'MANUAL', 'INTERNAL', 'DEMO'],
    verification: ['CONFIRMED', 'CORROBORATED', 'UNVERIFIED', 'DISPUTED', 'FALSE', 'RETRACTED'],
    sourceEventState: ['CONFIRMED', 'DISPUTED', 'CONTRADICTED', 'RETRACTED', 'FALSE', 'UNAVAILABLE', 'RESTORED'],
    approvalMode: ['AUTO', 'HUMAN'],
    decision: ['APPROVED', 'REJECTED'],
    qa: ['PASS', 'FAIL', 'NOT_RUN'],
    issueMode: ['DEMO', 'LIVE'],
    worldSource: ['PROTOTYPE_FIXTURE'],
    gameStatus: ['SCHEDULED', 'LIVE', 'FINAL', 'POSTPONED', 'CANCELLED'],
    worldState: ['ISSUED', 'NOT_ISSUED'],
    distribution: ['PUBLIC', 'INTERNAL'],
    worldVersion: ['INITIAL', 'FINAL_CONFIRMED', 'FINAL_UPDATED'],
    pubAction: ['PUBLISH', 'CORRECT', 'WITHDRAW']
  };
  /* Source states that invalidate what was built on the source. */
  var INVALIDATING = ['DISPUTED', 'CONTRADICTED', 'RETRACTED', 'FALSE'];
  var QA_KEYS = ['fact', 'language', 'rights', 'policy'];

  var RE = {
    id: /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,79}$/,
    team: /^[A-Z]{2,4}$/,
    hex64: /^[0-9a-f]{64}$/,
    tz: /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$|^UTC$/,
    lang: /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/,
    /* Full instant with an explicit zone. No date-only, no local time. */
    dateTime: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/,
    date: /^(\d{4})-(\d{2})-(\d{2})$/
  };

  /* ---------------- time ---------------- */

  function validCalendar(y, m, d) {
    var t = new Date(Date.UTC(+y, +m - 1, +d));
    return t.getUTCFullYear() === +y && t.getUTCMonth() === +m - 1 && t.getUTCDate() === +d;
  }
  /** Milliseconds for a strict ISO-8601 instant with zone, or NaN. */
  function parseInstant(s) {
    if (typeof s !== 'string') return NaN;
    var m = RE.dateTime.exec(s);
    if (!m) return NaN;
    if (!validCalendar(m[1], m[2], m[3])) return NaN;
    if (+m[4] > 23 || +m[5] > 59 || (m[6] && +m[6] > 59)) return NaN;
    return Date.parse(s);
  }
  function isDate(s) {
    var m = typeof s === 'string' && RE.date.exec(s);
    return !!m && validCalendar(m[1], m[2], m[3]);
  }

  /* ---------------- canonical JSON + SHA-256 (integrity only) ---------------- */

  function canonical(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    return '{' + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort().map(function (k) {
      return JSON.stringify(k) + ':' + canonical(v[k]);
    }).join(',') + '}';
  }

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  function utf8(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  /** SHA-256 hex of a string (UTF-8). Synchronous so the renderer and Node agree. */
  function sha256(str) {
    var bytes = utf8(String(str));
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (var s = 7; s >= 0; s--) bytes.push(s >= 4 ? 0 : (bitLen >>> (s * 8)) & 255);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var W = new Array(64);
    for (var off = 0; off < bytes.length; off += 64) {
      for (var t = 0; t < 16; t++) W[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
      for (t = 16; t < 64; t++) {
        var x = W[t - 15], y = W[t - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (v) { return ('00000000' + (v >>> 0).toString(16)).slice(-8); }).join('');
  }

  /* Fields an approval is bound to. Changing any of them makes a new content hash. */
  var CONTENT_FIELDS = ['id', 'type', 'editorialLabel', 'riskTriggers', 'homeEligible', 'sourceRefs', 'verifiedFacts',
    'validUntil', 'worldAnalysisRef', 'linkedGameIds', 'linkedTeams', 'teams', 'zh', 'en', 'demo'];
  function contentHash(item) {
    var o = {};
    CONTENT_FIELDS.forEach(function (k) { o[k] = item[k] === undefined ? null : item[k]; });
    return sha256(canonical(o));
  }

  /* ---------------- tiny shape checker ---------------- */

  function P(code, path, detail) { return { code: code, path: path, detail: detail || '' }; }

  function typeOk(v, t) {
    if (t === 'array') return Array.isArray(v);
    if (t === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v);
    if (t === 'int') return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
    if (t === 'number') return typeof v === 'number' && isFinite(v);
    return typeof v === t;
  }

  /*
   * shape: { field: rule }. rule: { t, req, nul, enum, re, max, min, time, date, items, shape, url }
   *   req: field must be present; nul: null allowed.
   */
  function checkShape(obj, shape, path, out) {
    if (!typeOk(obj, 'object')) { out.push(P('WRONG_TYPE', path, 'expected object')); return; }
    Object.keys(obj).forEach(function (k) { if (!shape[k]) out.push(P('UNKNOWN_FIELD', path + '.' + k)); });
    Object.keys(shape).forEach(function (k) { checkValue(obj[k], k in obj, shape[k], path + '.' + k, out); });
  }
  function checkValue(v, present, r, path, out) {
    if (!present || v === undefined) { if (r.req) out.push(P('MISSING_FIELD', path)); return; }
    if (v === null) { if (!r.nul) out.push(P('WRONG_TYPE', path, 'null not allowed')); return; }
    if (!typeOk(v, r.t)) { out.push(P('WRONG_TYPE', path, 'expected ' + r.t)); return; }
    if (r.enum && r.enum.indexOf(v) === -1) out.push(P('BAD_ENUM', path, String(v)));
    if (r.re && !r.re.test(v)) out.push(P('BAD_FORMAT', path, String(v).slice(0, 80)));
    if (r.t === 'string' && r.max != null && v.length > r.max) out.push(P('TOO_LONG', path, v.length + ' > ' + r.max));
    if (r.t === 'string' && r.min != null && v.trim().length < r.min) out.push(P('TOO_SHORT', path));
    if ((r.t === 'number' || r.t === 'int') && ((r.min != null && v < r.min) || (r.max != null && v > r.max))) out.push(P('OUT_OF_RANGE', path, String(v)));
    if (r.time && isNaN(parseInstant(v))) out.push(P('BAD_TIME', path, String(v).slice(0, 40)));
    if (r.date && !isDate(v)) out.push(P('BAD_TIME', path, String(v).slice(0, 40)));
    if (r.url && !safeUrl(v)) out.push(P('UNSAFE_URL', path, String(v).slice(0, 80)));
    if (r.t === 'array') {
      if (r.maxItems != null && v.length > r.maxItems) out.push(P('TOO_MANY', path, v.length + ' > ' + r.maxItems));
      if (r.minItems != null && v.length < r.minItems) out.push(P('TOO_FEW', path));
      if (r.items) v.forEach(function (x, i) { checkValue(x, true, r.items, path + '[' + i + ']', out); });
      if (r.unique) {
        var seen = {};
        v.forEach(function (x, i) { var k = canonical(x); if (seen[k]) out.push(P('DUPLICATE_VALUE', path + '[' + i + ']')); seen[k] = 1; });
      }
    }
    if (r.t === 'object' && r.shape) checkShape(v, r.shape, path, out);
  }

  var tzCache = {};
  function supportedTimeZone(tz) {
    if (Object.prototype.hasOwnProperty.call(tzCache, tz)) return tzCache[tz];
    var ok;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(0); ok = true; } catch (e) { ok = false; }
    tzCache[tz] = ok;
    return ok;
  }

  /** Only absolute http(s) URLs. Rejects javascript:, data:, protocol-relative and credentials. */
  function safeUrl(s) {
    if (typeof s !== 'string' || s.length > 2048 || /[\s<>"'`\\]/.test(s)) return false;
    var m = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i.exec(s);
    return !!m && m[1].indexOf('@') === -1;
  }

  var str = function (max, extra) { var r = { t: 'string', max: max }; for (var k in extra) r[k] = extra[k]; return r; };
  var idRule = { t: 'string', re: RE.id };
  var teamRule = { t: 'string', re: RE.team };
  var bilingual = function (max) { return { t: 'object', shape: { zh: str(max, { req: true, min: 1 }), en: str(max, { req: true, min: 1 }) } }; };
  var copyShape = { headline: str(200, { req: true, min: 1 }), summary: str(600, { nul: true }), meta: str(300, { nul: true }) };
  var qaShape = { fact: { t: 'string', req: true, enum: ENUM.qa }, language: { t: 'string', req: true, enum: ENUM.qa }, rights: { t: 'string', req: true, enum: ENUM.qa }, policy: { t: 'string', req: true, enum: ENUM.qa } };

  var SHAPES = {
    item: {
      schema: { t: 'string', req: true }, id: Object.assign({ req: true }, idRule),
      revision: { t: 'int', req: true, min: 1 },
      type: { t: 'string', req: true, enum: ENUM.itemType },
      editorialLabel: { t: 'string', nul: true, enum: ENUM.label },
      riskTriggers: { t: 'array', req: true, items: { t: 'string', enum: ENUM.trigger }, unique: true },
      publishState: { t: 'string', req: true, enum: ENUM.publishState },
      homeEligible: { t: 'boolean', req: true },
      sourceRefs: { t: 'array', req: true, items: idRule, unique: true, maxItems: 20 },
      verifiedFacts: { t: 'array', req: true, items: str(120, { min: 1 }), maxItems: 20 },
      publishedAt: { t: 'string', nul: true, time: true },
      validUntil: { t: 'string', nul: true, time: true },
      approvalReceiptRef: Object.assign({ nul: true }, idRule),
      worldAnalysisRef: Object.assign({ nul: true }, idRule),
      linkedGameIds: { t: 'array', items: idRule, unique: true, maxItems: 10 },
      linkedTeams: { t: 'array', items: teamRule, unique: true, maxItems: 4 },
      teams: { t: 'array', items: teamRule, maxItems: 2 },
      correctionOfRevision: { t: 'int', nul: true, min: 1 },
      demo: { t: 'boolean', req: true },
      zh: { t: 'object', req: true, shape: copyShape },
      en: { t: 'object', req: true, shape: copyShape }
    },
    source: {
      schema: { t: 'string', req: true }, id: Object.assign({ req: true }, idRule),
      kind: { t: 'string', req: true, enum: ENUM.sourceKind },
      originalUrl: { t: 'string', nul: true, req: true, url: true },
      publisher: str(120, { req: true, min: 1 }),
      authorOrAccount: str(120, { nul: true }),
      publishedAt: { t: 'string', nul: true, time: true },
      observedAt: { t: 'string', req: true, time: true },
      rightsStatus: { t: 'string', req: true, enum: ENUM.rights },
      accessMethod: { t: 'string', req: true, enum: ENUM.access },
      contentFingerprint: { t: 'string', req: true, re: RE.hex64 },
      quotedSpan: str(500, { nul: true }),
      language: { t: 'string', req: true, re: RE.lang },
      verificationState: { t: 'string', req: true, enum: ENUM.verification },
      dedupeClusterId: Object.assign({ nul: true }, idRule),
      demo: { t: 'boolean', req: true }
    },
    sourceEvent: {
      schema: { t: 'string', req: true }, id: Object.assign({ req: true }, idRule),
      sourceId: Object.assign({ req: true }, idRule),
      state: { t: 'string', req: true, enum: ENUM.sourceEventState },
      at: { t: 'string', req: true, time: true },
      note: str(300, { nul: true }),
      demo: { t: 'boolean', req: true }
    },
    approval: {
      schema: { t: 'string', req: true }, id: Object.assign({ req: true }, idRule),
      itemId: Object.assign({ req: true }, idRule),
      itemRevision: { t: 'int', req: true, min: 1 },
      contentHash: { t: 'string', req: true, re: RE.hex64 },
      mode: { t: 'string', req: true, enum: ENUM.approvalMode },
      decision: { t: 'string', req: true, enum: ENUM.decision },
      policyVersion: str(60, { req: true, min: 1 }),
      approverId: str(80, { nul: true, req: true }),
      decidedAt: { t: 'string', req: true, time: true },
      qa: { t: 'object', req: true, shape: qaShape },
      note: str(300, { nul: true }),
      demo: { t: 'boolean', req: true }
    },
    layout: {
      schema: { t: 'string', req: true }, id: Object.assign({ req: true }, idRule),
      issueId: Object.assign({ req: true }, idRule),
      revision: { t: 'int', req: true, min: 1 },
      decidedBy: str(80, { req: true, min: 1 }),
      decidedAt: { t: 'string', req: true, time: true },
      cover: { t: 'array', req: true, items: idRule, unique: true, maxItems: 3 },
      lead: Object.assign({ nul: true, req: true }, idRule),
      games: { t: 'array', req: true, items: idRule, unique: true, maxItems: 12 },
      stories: { t: 'array', req: true, items: idRule, unique: true, maxItems: 6 },
      overrides: { t: 'array', items: { t: 'object', shape: {
        slot: { t: 'string', req: true, enum: ['cover', 'lead', 'games', 'stories'] },
        ref: Object.assign({ req: true }, idRule), reason: str(300, { req: true, min: 3 }),
        by: str(80, { req: true, min: 1 }), at: { t: 'string', req: true, time: true } } } },
      demo: { t: 'boolean', req: true }
    },
    game: {
      schema: { t: 'string', req: true }, gameId: Object.assign({ req: true }, idRule),
      away: Object.assign({ req: true }, teamRule), home: Object.assign({ req: true }, teamRule),
      status: { t: 'string', req: true, enum: ENUM.gameStatus },
      tipoff: { t: 'string', req: true, time: true },
      venueTz: { t: 'string', req: true, re: RE.tz },
      score: { t: 'object', nul: true, shape: { away: { t: 'int', req: true, min: 0, max: 400 }, home: { t: 'int', req: true, min: 0, max: 400 } } },
      world: { t: 'object', req: true, shape: {
        state: { t: 'string', req: true, enum: ENUM.worldState },
        distributionEligibility: { t: 'string', nul: true, enum: ENUM.distribution },
        version: { t: 'string', nul: true, enum: ENUM.worldVersion },
        snapshotId: Object.assign({ nul: true }, idRule),
        homeWinProbability: { t: 'number', nul: true, min: 0, max: 1 },
        interval60: { t: 'array', nul: true, items: { t: 'number', min: 0, max: 1 }, minItems: 2, maxItems: 2 },
        verdict: Object.assign({ nul: true }, bilingual(200)),
        why: Object.assign({ nul: true }, bilingual(600)),
        missingReason: { t: 'string', nul: true, re: /^[A-Z][A-Z0-9_]{1,59}$/ }
      } }
    },
    publication: {
      schema: { t: 'string', req: true }, id: Object.assign({ req: true }, idRule),
      action: { t: 'string', req: true, enum: ENUM.pubAction },
      itemId: Object.assign({ req: true }, idRule),
      itemRevision: { t: 'int', req: true, min: 1 },
      contentHash: { t: 'string', req: true, re: RE.hex64 },
      policyVersion: str(60, { req: true, min: 1 }),
      qa: { t: 'object', req: true, shape: qaShape },
      approvalMode: { t: 'string', nul: true, req: true, enum: ENUM.approvalMode },
      approvalReceiptRef: Object.assign({ nul: true, req: true }, idRule),
      approverId: str(80, { nul: true, req: true }),
      sourceRefs: { t: 'array', req: true, items: idRule },
      sourceFingerprints: { t: 'array', req: true, items: { t: 'string', re: RE.hex64 } },
      publicPath: { t: 'string', nul: true, req: true, re: /^[a-z0-9][a-z0-9._/-]{0,199}$/ },
      recordedAt: { t: 'string', req: true, time: true },
      previousReceiptId: Object.assign({ nul: true, req: true }, idRule),
      previousReceiptHash: { t: 'string', nul: true, req: true, re: RE.hex64 },
      reason: str(500, { nul: true, req: true }),
      commandId: Object.assign({ req: true }, idRule),
      demo: { t: 'boolean', req: true },
      receiptHash: { t: 'string', req: true, re: RE.hex64 }
    }
  };
  SHAPES.issue = {
    schema: { t: 'string', req: true }, issueId: Object.assign({ req: true }, idRule),
    mode: { t: 'string', req: true, enum: ENUM.issueMode },
    worldSource: { t: 'string', req: true, enum: ENUM.worldSource },
    generatedAt: { t: 'string', req: true, time: true },
    validUntil: { t: 'string', req: true, time: true },
    issue: { t: 'object', req: true, shape: {
      volume: { t: 'int', req: true, min: 1, max: 999 }, number: { t: 'int', req: true, min: 1, max: 99999 },
      date: { t: 'string', req: true, date: true }, page: { t: 'int', req: true, min: 1, max: 999 },
      topic: { t: 'object', req: true, shape: { line1: str(24, { req: true, min: 1 }), line2: str(24, { req: true, min: 1 }) } },
      edition: Object.assign({ req: true }, bilingual(40))
    } },
    /* Collections are validated record by record (see validateIssue). */
    games: { t: 'array', req: true, maxItems: 30 },
    items: { t: 'array', req: true, maxItems: 200 },
    sources: { t: 'array', req: true, maxItems: 1000 },
    sourceEvents: { t: 'array', req: true, maxItems: 1000 },
    approvals: { t: 'array', req: true, maxItems: 400 },
    layout: { t: 'object', nul: true, req: true },
    publications: { t: 'array', maxItems: 1000 }
  };

  function validateRecord(kind, rec, path) {
    var out = [];
    path = path || kind;
    if (!typeOk(rec, 'object')) return [P('WRONG_TYPE', path, 'expected object')];
    if (rec.schema !== SCHEMAS[kind]) {
      out.push(P('SCHEMA_UNSUPPORTED', path + '.schema', String(rec.schema)));
      return out;
    }
    checkShape(rec, SHAPES[kind], path, out);
    if (out.length) return out;
    /* Cross-field rules inside one record. */
    if (kind === 'item') {
      if (rec.publishState === 'PUBLISHED' && !rec.publishedAt) out.push(P('MISSING_TIME', path + '.publishedAt', 'PUBLISHED needs publishedAt'));
      if (rec.type === 'GAME_ANALYSIS' && !rec.worldAnalysisRef) out.push(P('MISSING_FIELD', path + '.worldAnalysisRef'));
      if (rec.type !== 'GAME_ANALYSIS' && rec.worldAnalysisRef) out.push(P('FIELD_NOT_ALLOWED', path + '.worldAnalysisRef'));
      if (rec.type === 'REVIEW' && !(rec.teams && rec.teams.length === 2)) out.push(P('MISSING_FIELD', path + '.teams', 'REVIEW needs two teams'));
      if (rec.publishedAt && rec.validUntil && parseInstant(rec.validUntil) <= parseInstant(rec.publishedAt)) out.push(P('BAD_TIME', path + '.validUntil', 'not after publishedAt'));
      if (rec.correctionOfRevision != null && rec.correctionOfRevision >= rec.revision) out.push(P('BAD_REFERENCE', path + '.correctionOfRevision'));
    }
    if (kind === 'approval') {
      if (rec.mode === 'HUMAN' && !(rec.approverId && rec.approverId.trim())) out.push(P('MISSING_FIELD', path + '.approverId', 'HUMAN needs an approver'));
      if (rec.mode === 'AUTO' && rec.approverId) out.push(P('FIELD_NOT_ALLOWED', path + '.approverId', 'AUTO has no human approver'));
    }
    if (kind === 'source') {
      var needsUrl = ['WORLD_PACKAGE', 'MOSPORT_ORIGINAL'].indexOf(rec.kind) === -1;
      if (needsUrl && !rec.originalUrl) out.push(P('MISSING_FIELD', path + '.originalUrl', rec.kind + ' needs its original URL'));
      if (rec.publishedAt && parseInstant(rec.publishedAt) > parseInstant(rec.observedAt)) out.push(P('BAD_TIME', path + '.publishedAt', 'after observedAt'));
    }
    if (kind === 'game') {
      var w = rec.world;
      /* The spelling pattern is not enough: the runtime must know the zone, or formatting throws. */
      if (!supportedTimeZone(rec.venueTz)) out.push(P('BAD_FORMAT', path + '.venueTz', 'unknown time zone ' + rec.venueTz));
      if (rec.away === rec.home) out.push(P('BAD_FORMAT', path + '.home', 'same team twice'));
      if (w.interval60 && w.interval60[0] > w.interval60[1]) out.push(P('OUT_OF_RANGE', path + '.world.interval60'));
      if (w.state === 'NOT_ISSUED' && (w.homeWinProbability != null || w.verdict)) out.push(P('FIELD_NOT_ALLOWED', path + '.world', 'NOT_ISSUED carries no read'));
    }
    if (kind === 'publication') {
      if (rec.receiptHash !== publicationHash(rec)) out.push(P('HASH_MISMATCH', path + '.receiptHash'));
      if (rec.action !== 'PUBLISH' && !rec.previousReceiptId) out.push(P('MISSING_FIELD', path + '.previousReceiptId', rec.action + ' must chain to a prior receipt'));
      if (rec.action !== 'PUBLISH' && !(rec.reason && rec.reason.trim())) out.push(P('MISSING_FIELD', path + '.reason'));
      if (rec.approvalMode === 'HUMAN' && !rec.approverId) out.push(P('MISSING_FIELD', path + '.approverId'));
    }
    if (kind === 'layout' && rec.lead && (rec.cover.indexOf(rec.lead) !== -1 || rec.stories.indexOf(rec.lead) !== -1)) out.push(P('DUPLICATE_PLACEMENT', path + '.lead'));
    if (kind === 'layout') rec.cover.forEach(function (id) { if (rec.stories.indexOf(id) !== -1) out.push(P('DUPLICATE_PLACEMENT', path + '.stories', id)); });
    return out;
  }

  /** The hash a publication receipt must carry: all fields except receiptHash itself. */
  function publicationHash(rec) {
    var o = {};
    Object.keys(rec).forEach(function (k) { if (k !== 'receiptHash') o[k] = rec[k]; });
    return sha256(canonical(o));
  }

  /* ---------------- issue-level validation + relations ---------------- */

  var LAYOUT_SLOT_TYPES = {
    cover: ['NEWS', 'FEATURE'],
    lead: ['GAME_ANALYSIS'],
    stories: ['REVIEW', 'STREAK', 'FEATURE', 'NEWS']
  };

  function effectiveSourceStates(issue) {
    var st = {};
    (issue.sources || []).forEach(function (s) { if (s && s.id) st[s.id] = { state: s.verificationState, at: s.observedAt }; });
    var evs = (issue.sourceEvents || []).filter(function (e) { return e && e.sourceId && !isNaN(parseInstant(e.at)); })
      .map(function (e, i) { return { e: e, i: i }; })
      .sort(function (a, b) { return (parseInstant(a.e.at) - parseInstant(b.e.at)) || (a.i - b.i); });
    evs.forEach(function (x) {
      if (!st[x.e.sourceId]) return;
      st[x.e.sourceId] = { state: x.e.state === 'RESTORED' ? 'CONFIRMED' : x.e.state, at: x.e.at };
    });
    return st;
  }

  /**
   * Validate an issue. Returns { fatal: [...], records: { kind: { id: [problems] } }, problems: [...] }.
   * fatal  : the issue as a whole cannot be trusted (bad envelope, unsupported schema,
   *          duplicate ids). Nothing from it may render.
   * records: problems of one record. That record (and anything referencing it) is excluded.
   */
  function validateIssue(issue, opts) {
    opts = opts || {};
    var res = { fatal: [], records: { item: {}, source: {}, sourceEvent: {}, approval: {}, game: {}, layout: {}, publication: {} }, problems: [] };
    if (!typeOk(issue, 'object')) { res.fatal.push(P('WRONG_TYPE', 'issue', 'expected object')); return res; }
    if (issue.schema !== SCHEMAS.issue) { res.fatal.push(P('SCHEMA_UNSUPPORTED', 'issue.schema', String(issue.schema))); return res; }
    checkShape(issue, SHAPES.issue, 'issue', res.fatal);
    if (res.fatal.length) return res;
    if (parseInstant(issue.validUntil) <= parseInstant(issue.generatedAt)) res.fatal.push(P('BAD_TIME', 'issue.validUntil', 'not after generatedAt'));
    /* B's prototype World view is fixture data. A LIVE issue cannot carry it; a LIVE
       issue becomes possible only once a real A game-package adapter exists. */
    if (issue.mode === 'LIVE' && issue.worldSource === 'PROTOTYPE_FIXTURE') res.fatal.push(P('PROTOTYPE_WORLD_IN_LIVE', 'issue.worldSource'));
    if (opts.mode === 'production' && issue.mode === 'DEMO') res.fatal.push(P('DEMO_IN_PRODUCTION', 'issue.mode'));
    if (res.fatal.length) return res;

    var coll = { game: ['games', 'gameId'], item: ['items', 'id'], source: ['sources', 'id'], sourceEvent: ['sourceEvents', 'id'], approval: ['approvals', 'id'], publication: ['publications', 'id'] };
    var index = {};
    Object.keys(coll).forEach(function (kind) {
      var list = issue[coll[kind][0]] || [], key = coll[kind][1], seen = {};
      index[kind] = {};
      list.forEach(function (rec, i) {
        var id = rec && rec[key];
        var path = coll[kind][0] + '[' + i + ']';
        if (typeof id === 'string' && seen[id]) {
          /* Two records claim one id: we cannot know which is authoritative. */
          res.fatal.push(P('DUPLICATE_ID', path, kind + ' ' + id));
          return;
        }
        if (typeof id === 'string') seen[id] = 1;
        var probs = validateRecord(kind, rec, path);
        if (issue.mode === 'LIVE' && rec && rec.demo === true) probs.push(P('DEMO_RECORD_IN_LIVE_ISSUE', path));
        if (probs.length) res.records[kind][typeof id === 'string' ? id : path] = probs;
        else index[kind][id] = rec;
      });
    });
    if (res.fatal.length) return res;

    var layoutProbs = issue.layout ? validateRecord('layout', issue.layout, 'issue.layout') : [];
    if (issue.layout && !layoutProbs.length && issue.layout.issueId !== issue.issueId) layoutProbs.push(P('LAYOUT_ISSUE_MISMATCH', 'issue.layout.issueId'));
    if (layoutProbs.length) res.records.layout[(issue.layout && issue.layout.id) || 'layout'] = layoutProbs;

    var states = effectiveSourceStates({ sources: values(index.source), sourceEvents: values(index.sourceEvent) });
    var add = function (kind, id, p) { (res.records[kind][id] = res.records[kind][id] || []).push(p); };

    values(index.sourceEvent).forEach(function (e) {
      if (!index.source[e.sourceId]) add('sourceEvent', e.id, P('DANGLING_REF', 'sourceEvents.' + e.id + '.sourceId', e.sourceId));
    });

    values(index.item).forEach(function (it) {
      var path = 'items.' + it.id;
      it.sourceRefs.forEach(function (r) {
        if (!index.source[r]) add('item', it.id, P(res.records.source[r] ? 'REF_TO_INVALID' : 'DANGLING_REF', path + '.sourceRefs', r));
        else if (INVALIDATING.indexOf(states[r].state) !== -1) add('item', it.id, P('SOURCE_INVALIDATED', path + '.sourceRefs', r + ' ' + states[r].state));
        else if (index.source[r].rightsStatus === 'BLOCKED') add('item', it.id, P('SOURCE_RIGHTS_BLOCKED', path + '.sourceRefs', r));
      });
      if (it.worldAnalysisRef && !index.game[it.worldAnalysisRef]) add('item', it.id, P(res.records.game[it.worldAnalysisRef] ? 'REF_TO_INVALID' : 'DANGLING_REF', path + '.worldAnalysisRef', it.worldAnalysisRef));
      if (it.approvalReceiptRef) {
        var a = index.approval[it.approvalReceiptRef];
        if (!a) add('item', it.id, P(res.records.approval[it.approvalReceiptRef] ? 'REF_TO_INVALID' : 'DANGLING_REF', path + '.approvalReceiptRef', it.approvalReceiptRef));
        else {
          if (a.itemId !== it.id || a.itemRevision !== it.revision) add('item', it.id, P('APPROVAL_MISMATCH', path + '.approvalReceiptRef', 'receipt is for ' + a.itemId + '@' + a.itemRevision));
          else if (a.contentHash !== contentHash(it)) add('item', it.id, P('APPROVAL_STALE', path + '.approvalReceiptRef', 'content changed after approval'));
          if (a.decision !== 'APPROVED') add('item', it.id, P('APPROVAL_REJECTED', path + '.approvalReceiptRef'));
          if (a.mode === 'AUTO' && QA_KEYS.some(function (k) { return a.qa[k] !== 'PASS'; })) add('item', it.id, P('AUTO_QA_INCOMPLETE', path + '.approvalReceiptRef'));
          if (opts.mode === 'production' && a.demo) add('item', it.id, P('DEMO_APPROVAL_IN_PRODUCTION', path + '.approvalReceiptRef'));
          if (it.publishedAt && parseInstant(a.decidedAt) > parseInstant(it.publishedAt)) add('item', it.id, P('BAD_TIME', path + '.publishedAt', 'published before approval'));
        }
      }
    });

    if (issue.layout && !layoutProbs.length) {
      var L = issue.layout, lid = L.id;
      var slotCheck = function (slot, id) {
        var it = index.item[id];
        if (!it) { add('layout', lid, P(res.records.item[id] ? 'REF_TO_INVALID' : 'DANGLING_REF', 'layout.' + slot, id)); return; }
        if (LAYOUT_SLOT_TYPES[slot].indexOf(it.type) === -1) add('layout', lid, P('SLOT_TYPE_MISMATCH', 'layout.' + slot, id + ' is ' + it.type));
        if (slot === 'cover' && !it.editorialLabel) add('layout', lid, P('SLOT_TYPE_MISMATCH', 'layout.cover', id + ' has no cover label'));
      };
      L.cover.forEach(function (id) { slotCheck('cover', id); });
      if (L.lead) slotCheck('lead', L.lead);
      L.stories.forEach(function (id) { slotCheck('stories', id); });
      L.games.forEach(function (id) { if (!index.game[id]) add('layout', lid, P(res.records.game[id] ? 'REF_TO_INVALID' : 'DANGLING_REF', 'layout.games', id)); });
    }

    Object.keys(res.records).forEach(function (k) {
      Object.keys(res.records[k]).forEach(function (id) { res.records[k][id].forEach(function (p) { res.problems.push(Object.assign({ kind: k, id: id }, p)); }); });
    });
    res.index = index;
    res.sourceStates = states;
    return res;
  }

  function values(o) { return Object.keys(o).map(function (k) { return o[k]; }); }

  var api = {
    SCHEMAS: SCHEMAS, ENUM: ENUM, INVALIDATING: INVALIDATING, QA_KEYS: QA_KEYS, CONTENT_FIELDS: CONTENT_FIELDS,
    LAYOUT_SLOT_TYPES: LAYOUT_SLOT_TYPES,
    parseInstant: parseInstant, isDate: isDate, canonical: canonical, sha256: sha256,
    contentHash: contentHash, publicationHash: publicationHash, safeUrl: safeUrl,
    validateRecord: validateRecord, validateIssue: validateIssue, effectiveSourceStates: effectiveSourceStates
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOSPORT_CONTRACTS = api;
})(typeof window !== 'undefined' ? window : globalThis);
