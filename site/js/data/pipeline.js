/*
 * B-P2-03 — one data path for every public page:
 *
 *   load (provider) → contract validation → reference resolution → eligibility → public model
 *
 * Pages receive only the public model. It carries what may be shown and nothing
 * else: no exclusion reasons, no approver identity, no source payloads, no raw
 * World probability, and no number for a game whose read is not public. The
 * diagnostics (problems, exclusions) are returned separately for tests and the
 * internal editor, never handed to a page.
 *
 * Status: OK | REFUSED | INVALID | STALE | LOAD_FAILED. Only OK renders magazine
 * content. STALE and INVALID keep the page usable (Schedule still lists valid games
 * for STALE) and never substitute invented content.
 */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('../contracts/contracts.js') : root.MOSPORT_CONTRACTS;
  var E = node ? require('../editorial/eligibility.js') : root.MOSPORT_ELIGIBILITY;

  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; }
  function copyOf(c) { return c ? { headline: c.headline, summary: c.summary || null, meta: c.meta || null } : null; }

  /* Public reason a game has no read. Internal codes (INTERNAL distribution etc.) stay internal. */
  function publicReason(g) {
    if (g.status === 'POSTPONED') return 'POSTPONED';
    if (g.status === 'CANCELLED') return 'CANCELLED';
    if (!g.world || g.world.state !== 'ISSUED') return 'NOT_ISSUED';
    return 'NOT_PUBLIC';
  }

  function publicWorld(w) {
    return {
      version: w.version, snapshotId: w.snapshotId,
      percent: E.worldPercent(w),
      interval60: w.interval60 || null,
      verdict: w.verdict, why: w.why || null
    };
  }
  function publicGame(g, eligible) {
    var out = pick(g, ['gameId', 'away', 'home', 'status', 'tipoff', 'venueTz']);
    out.score = g.score || null;
    out.hasRead = !!eligible;
    if (eligible) out.world = publicWorld(g.world);
    else out.noReadReason = publicReason(g);
    return out;
  }
  function publicItem(it) {
    return {
      id: it.id, type: it.type, editorialLabel: it.editorialLabel || null,
      linkedTeams: (it.linkedTeams || []).slice(), teams: (it.teams || []).slice(),
      zh: copyOf(it.zh), en: copyOf(it.en),
      approvalMode: it.approval.mode, approvedOn: it.approval.approvedAt, receiptRef: it.approvalReceiptRef
    };
  }

  function emptyModel(status, reason) {
    return { status: status, reason: reason || null, demo: false, meta: null, cover: [], lead: null, games: [], stories: [], schedule: [], invalidGames: 0 };
  }

  /**
   * raw  : the issue as loaded (or { __loadError }).
   * opts : { mode: 'prototype'|'production', now: ISO instant }
   */
  function run(raw, opts) {
    opts = opts || {};
    var mode = opts.mode || 'prototype';
    var diag = { fatal: [], problems: [], excluded: [] };
    if (raw == null || raw.__loadError) return { model: emptyModel('LOAD_FAILED', 'LOAD_FAILED'), diagnostics: Object.assign(diag, { loadError: raw && raw.__loadError || 'NO_DATA' }) };
    if (raw.mode === 'DEMO' && mode !== 'prototype') return { model: emptyModel('REFUSED', 'DEMO_IN_PRODUCTION'), diagnostics: diag };
    if (isNaN(C.parseInstant(opts.now))) return { model: emptyModel('INVALID', 'NO_CLOCK'), diagnostics: Object.assign(diag, { fatal: [{ code: 'NO_CLOCK', path: 'opts.now' }] }) };

    var v = C.validateIssue(raw, { mode: mode });
    diag.fatal = v.fatal; diag.problems = v.problems;
    if (v.fatal.length) return { model: emptyModel('INVALID', v.fatal[0].code), diagnostics: diag };

    var bad = v.records;
    /* Build from the validated index: a null or malformed entry is skipped, not dereferenced. */
    var okGames = raw.games.filter(function (g) { return g && typeof g.gameId === 'string' && v.index.game[g.gameId] === g && !bad.game[g.gameId]; });
    var meta = { issueId: raw.issueId, volume: raw.issue.volume, number: raw.issue.number, date: raw.issue.date, page: raw.issue.page,
      topic: { line1: raw.issue.topic.line1, line2: raw.issue.topic.line2 }, edition: { zh: raw.issue.edition.zh, en: raw.issue.edition.en },
      generatedAt: raw.generatedAt, validUntil: raw.validUntil, worldSource: raw.worldSource };
    var demo = raw.mode === 'DEMO';
    var invalidGames = raw.games.length - okGames.length;

    if (C.parseInstant(opts.now) >= C.parseInstant(raw.validUntil)) {
      /* An expired issue shows no reads anywhere; Schedule keeps the games with a notice. */
      var m = emptyModel('STALE', 'ISSUE_EXPIRED');
      m.demo = demo; m.meta = meta; m.invalidGames = invalidGames;
      m.schedule = okGames.map(function (g) { return publicGame(g, false); });
      m.schedule.forEach(function (g) { g.noReadReason = 'STALE'; });
      return { model: m, diagnostics: diag };
    }

    /* Reference resolution: the approval shown to the gate comes only from a receipt
       that matches this item's id, revision and content hash. */
    var items = raw.items.filter(function (it) { return it && typeof it.id === 'string' && v.index.item[it.id] === it && !bad.item[it.id]; }).map(function (it) {
      var r = JSON.parse(JSON.stringify(it));
      var a = it.approvalReceiptRef ? v.index.approval[it.approvalReceiptRef] : null;
      r.approval = a ? { mode: a.mode, approverId: a.approverId, approvedAt: a.decidedAt, policyVersion: a.policyVersion } : null;
      return r;
    });
    var itemById = {};
    items.forEach(function (it) { itemById[it.id] = it; });

    /* A structurally bad layout (schema, wrong issue, double placement) is dropped whole;
       one that only points at missing or unfitting items keeps its other entries. */
    var RELATION = ['DANGLING_REF', 'REF_TO_INVALID', 'SLOT_TYPE_MISMATCH'];
    var layoutProbs = raw.layout ? (bad.layout[raw.layout.id] || bad.layout.layout || []) : [];
    var L = raw.layout && !layoutProbs.some(function (p) { return RELATION.indexOf(p.code) === -1; }) ? raw.layout : null;
    var fits = function (slot) {
      return function (id) {
        var it = itemById[id];
        var ok = !it || C.LAYOUT_SLOT_TYPES[slot].indexOf(it.type) !== -1;
        if (!ok) diag.excluded.push({ slot: slot, id: id, reason: 'SLOT_TYPE_MISMATCH' });
        return ok;
      };
    };
    /* A layout that failed relation checks keeps only its fitting entries, in the Editor's order. */
    var layout = L ? {
      cover: L.cover.filter(fits('cover')),
      lead: L.lead && fits('lead')(L.lead) ? L.lead : null,
      games: L.games.slice(),
      stories: L.stories.filter(fits('stories'))
    } : { cover: [], lead: null, games: [], stories: [] };
    if (!L) diag.excluded.push({ slot: 'layout', id: raw.layout && raw.layout.id, reason: raw.layout ? 'LAYOUT_INVALID' : 'NO_LAYOUT' });

    var resolved = E.resolveIssue({ mode: raw.mode, games: okGames, items: items, layout: layout }, { mode: mode, now: opts.now });
    diag.excluded = diag.excluded.concat(resolved.excluded);
    if (resolved.refused) return { model: emptyModel('REFUSED', resolved.refused), diagnostics: diag };

    var model = {
      status: 'OK', reason: null, demo: demo, meta: meta, invalidGames: invalidGames,
      cover: resolved.cover.map(publicItem),
      lead: resolved.lead ? { item: publicItem(resolved.lead.item), game: publicGame(resolved.lead.game, true), percent: resolved.lead.percent } : null,
      games: resolved.games.map(function (g) { return publicGame(g, true); }),
      stories: resolved.stories.map(publicItem),
      schedule: okGames.map(function (g) { return publicGame(g, E.gameOnMagazine(g)); })
    };
    return { model: model, diagnostics: diag };
  }

  var api = { run: run, publicReason: publicReason };
  if (node) module.exports = api;
  else root.MOSPORT_PIPELINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
