/*
 * Render-path eligibility gate (ADR-B002). Pure functions, no DOM.
 * Works in the browser (window.MOSPORT_ELIGIBILITY) and in Node (module.exports).
 *
 * The gate only removes things. It never creates, ranks or computes content,
 * and it never alters a World value: it either passes the number through
 * unchanged (as a rounded percentage for display) or returns null.
 */
(function (root) {
  var C = typeof module !== 'undefined' && module.exports ? require('../contracts/contracts.js') : root.MOSPORT_CONTRACTS;
  var at = function (s) { return C.parseInstant(s); };
  var HUMAN_TRIGGERS = ['MAJOR_NEWS', 'UNVERIFIED_RUMOR', 'SENSITIVE_NEWS', 'EXCLUSIVE_CLAIM'];
  /* Conservative default (spec 03 §4.2, PROPOSED): these labels always need a human. */
  var HUMAN_LABELS = ['BREAKING_NEWS', 'MOSPORT_EXCLUSIVE'];
  var LOCKED_VERSIONS = ['INITIAL', 'FINAL_CONFIRMED', 'FINAL_UPDATED'];

  function requiresHuman(item) {
    if (!item) return true;
    if (item.type === 'REVIEW') return true;
    if (item.editorialLabel && HUMAN_LABELS.indexOf(item.editorialLabel) !== -1) return true;
    return (item.riskTriggers || []).some(function (t) { return HUMAN_TRIGGERS.indexOf(t) !== -1; });
  }

  /** A complete human approval: approver, a valid decision time, and not dated after `now`. */
  function humanApproved(item, now) {
    var a = item && item.approval;
    if (!(a && a.mode === 'HUMAN' && typeof a.approverId === 'string' && a.approverId.trim())) return false;
    var t = at(a.approvedAt);
    if (isNaN(t)) return false;
    return !(now && t > at(now));
  }

  /** Returns null when the item may render, otherwise the reason it may not. */
  function itemBlockReason(item, now) {
    if (!item) return 'MISSING';
    if (item.publishState !== 'PUBLISHED') return 'NOT_PUBLISHED';
    if (item.homeEligible !== true) return 'NOT_HOME_ELIGIBLE';
    if (!item.approvalReceiptRef) return 'NO_RECEIPT';
    if (!item.sourceRefs || item.sourceRefs.length === 0) return 'NO_SOURCE';
    if (!item.verifiedFacts || item.verifiedFacts.length === 0) return 'NO_VERIFIED_FACTS';
    if (item.validUntil != null) {
      /* A malformed or unchecked expiry never passes: no clock, no render. */
      if (isNaN(at(item.validUntil))) return 'BAD_TIME';
      if (!now || isNaN(at(now))) return 'NO_CLOCK';
      if (at(item.validUntil) <= at(now)) return 'EXPIRED';
    }
    if (item.publishedAt != null && isNaN(at(item.publishedAt))) return 'BAD_TIME';
    if (item.publishedAt && now && at(item.publishedAt) > at(now)) return 'NOT_YET_PUBLISHED';
    if (requiresHuman(item) && !humanApproved(item, now)) return 'HUMAN_APPROVAL_REQUIRED';
    if (!item.approval || (item.approval.mode !== 'HUMAN' && item.approval.mode !== 'AUTO')) return 'NO_APPROVAL_MODE';
    return null;
  }

  /** Display percentage for an eligible World package, else null. Never estimates. */
  function worldPercent(world) {
    if (!world || world.state !== 'ISSUED') return null;
    if (world.distributionEligibility !== 'PUBLIC') return null;
    if (LOCKED_VERSIONS.indexOf(world.version) === -1) return null;
    var p = world.homeWinProbability;
    if (typeof p !== 'number' || !isFinite(p) || p < 0 || p > 1) return null;
    return Math.round(p * 100);
  }

  /** A game may appear on the magazine only with a public, locked World read. */
  function gameOnMagazine(game) {
    if (!game || !game.world) return false;
    if (game.status === 'POSTPONED' || game.status === 'CANCELLED') return false;
    var w = game.world;
    return w.state === 'ISSUED' && w.distributionEligibility === 'PUBLIC' && LOCKED_VERSIONS.indexOf(w.version) !== -1 && !!w.verdict;
  }

  /**
   * Resolve the Editor layout plan into renderable slots.
   * opts.mode: 'prototype' | 'production'. A DEMO fixture renders only in prototype mode.
   */
  function resolveIssue(fixture, opts) {
    opts = opts || {};
    var mode = opts.mode || 'prototype';
    var now = opts.now || null;
    var out = { refused: null, demo: false, cover: [], lead: null, games: [], stories: [], excluded: [], schedule: [] };
    if (!fixture) { out.refused = 'NO_ISSUE'; return out; }
    if (fixture.mode === 'DEMO' && mode !== 'prototype') { out.refused = 'DEMO_IN_PRODUCTION'; return out; }
    out.demo = fixture.mode === 'DEMO';

    /* Two records with one id: refuse rather than let the later one win. */
    var byId = {}, gameById = {}, dup = null;
    (fixture.items || []).forEach(function (it) { if (it && byId[it.id]) dup = it.id; if (it) byId[it.id] = it; });
    (fixture.games || []).forEach(function (g) { if (g && gameById[g.gameId]) dup = g.gameId; if (g) gameById[g.gameId] = g; });
    if (dup) { out.refused = 'DUPLICATE_ID'; out.demo = false; return out; }
    out.schedule = (fixture.games || []).slice();

    var take = function (id, slot) {
      var it = byId[id];
      var why = itemBlockReason(it, now);
      if (why) { out.excluded.push({ slot: slot, id: id, reason: why }); return null; }
      return it;
    };
    var plan = fixture.layout || {};

    (plan.cover || []).forEach(function (id) {
      var it = take(id, 'cover');
      if (it && it.editorialLabel) out.cover.push(it);
      else if (it) out.excluded.push({ slot: 'cover', id: id, reason: 'NO_COVER_LABEL' });
    });

    if (plan.lead) {
      var lead = take(plan.lead, 'lead');
      if (lead && lead.type === 'GAME_ANALYSIS') {
        var g = gameById[lead.worldAnalysisRef];
        if (gameOnMagazine(g)) out.lead = { item: lead, game: g, percent: worldPercent(g.world) };
        else out.excluded.push({ slot: 'lead', id: plan.lead, reason: 'WORLD_NOT_ELIGIBLE' });
      } else if (lead) {
        out.excluded.push({ slot: 'lead', id: plan.lead, reason: 'LEAD_NOT_GAME_ANALYSIS' });
      }
    }

    (plan.games || []).forEach(function (id) {
      var g = gameById[id];
      if (gameOnMagazine(g)) out.games.push(g);
      else out.excluded.push({ slot: 'games', id: id, reason: g ? 'WORLD_NOT_ELIGIBLE' : 'MISSING' });
    });

    (plan.stories || []).forEach(function (id) {
      var it = take(id, 'stories');
      if (it) out.stories.push(it);
    });
    return out;
  }

  var api = {
    HUMAN_TRIGGERS: HUMAN_TRIGGERS, HUMAN_LABELS: HUMAN_LABELS,
    requiresHuman: requiresHuman, humanApproved: humanApproved, itemBlockReason: itemBlockReason,
    worldPercent: worldPercent, gameOnMagazine: gameOnMagazine, resolveIssue: resolveIssue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOSPORT_ELIGIBILITY = api;
})(typeof window !== 'undefined' ? window : globalThis);
