/*
 * B-P3-02 — QA checks and risk routing (internal). Pure functions.
 *
 * Kept apart on purpose (spec 03 §1: gates must not collapse into one model's "approved"):
 *   factChecks / languageChecks / rightsChecks / policyChecks
 *       deterministic machine checks. A FAIL here cannot be overridden by any
 *       attestation or by a human approval.
 *   route(item, ctx)
 *       risk routing: AUTO, HUMAN or BLOCK, with reason codes. It can add triggers
 *       to what the Editor declared, never remove them.
 * Approval and publication live in workflow.js.
 *
 * Every rule here is a conservative engineering default (PROPOSED). No quantitative
 * "major news" threshold, approver roster or SLA is defined here, because the Founder
 * has not set them (spec 01 §E).
 */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('../../js/contracts/contracts.js') : root.MOSPORT_CONTRACTS;
  var E = node ? require('../../js/editorial/eligibility.js') : root.MOSPORT_ELIGIBILITY;

  var POLICY_VERSION = 'b-policy-2026-10-29.proposed';
  var LOW_RISK_SOURCE_KINDS = ['OFFICIAL_FACT', 'WORLD_PACKAGE'];
  var LOW_RISK_TYPES = ['NEWS', 'STREAK', 'GAME_ANALYSIS'];
  var QUOTE_LIMIT = { OWNED: Infinity, LICENSED: Infinity, PERMITTED_QUOTE: 200, LINK_ONLY: 0, UNVERIFIED: 0, BLOCKED: 0 };
  /* A copied run at least this long from a source quote counts as reproduction (CJK is denser). */
  var REPRO_LATIN = 40, REPRO_CJK = 16;

  var CJK = /[㐀-鿿豈-﫿]/;
  var BETTING = /賠率推薦|下注|投注|穩贏|必勝|包牌|\bbet(?:s|ting|tor)?\b|\bpicks?\s+of\s+the\s+day\b|\block\s+of\s+the\s+day\b|\bparlay\b|\bspread\s+pick\b/i;
  var EXCLUSIVE_WORDS = /獨家|\bexclusive\b/i;
  var RUMOR_DISCLOSED_ZH = /未獲證實|未經證實|尚未證實/;
  var RUMOR_DISCLOSED_EN = /\bunconfirmed\b|\bunverified\b|\bnot (?:been )?confirmed\b/i;

  function texts(item) {
    var out = [];
    ['zh', 'en'].forEach(function (L) {
      var c = item[L] || {};
      ['headline', 'summary', 'meta'].forEach(function (k) { if (c[k]) out.push({ lang: L, field: k, text: c[k] }); });
    });
    return out;
  }
  function all(item) { return texts(item).map(function (t) { return t.text; }).join('\n'); }
  function stateOf(ctx, id) { return ctx.sourceStates && ctx.sourceStates[id] ? ctx.sourceStates[id] : (ctx.sources[id] && ctx.sources[id].verificationState); }
  function srcs(item, ctx) { return item.sourceRefs.map(function (r) { return ctx.sources[r]; }).filter(Boolean); }

  /** Distinct original reports: copies in one dedupe cluster count once (spec 03 §3, media acceptance 4). */
  function independentSourceCount(list) {
    var seen = {};
    list.forEach(function (s) { seen[s.dedupeClusterId || s.id] = 1; });
    return Object.keys(seen).length;
  }

  function longestCommonRun(a, b) {
    if (!a || !b) return 0;
    var best = 0, prev = new Array(b.length + 1).fill(0);
    for (var i = 1; i <= a.length; i++) {
      var cur = new Array(b.length + 1).fill(0);
      for (var j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > best) best = cur[j]; }
      }
      prev = cur;
    }
    return best;
  }

  /* ---------------- machine checks ---------------- */

  function factChecks(item, ctx) {
    var r = [];
    if (!item.verifiedFacts.length) r.push('NO_VERIFIED_FACTS');
    if (!item.sourceRefs.length) r.push('NO_SOURCE');
    item.sourceRefs.forEach(function (id) {
      if (!ctx.sources[id]) r.push('SOURCE_MISSING:' + id);
      else if (C.INVALIDATING.indexOf(stateOf(ctx, id)) !== -1) r.push('SOURCE_INVALIDATED:' + id);
    });
    var list = srcs(item, ctx);
    var isRumor = item.riskTriggers.indexOf('UNVERIFIED_RUMOR') !== -1;
    /* A rumour can be tracked, but it cannot be presented as a confirmed fact (M-02, M-04). */
    if (!isRumor && list.some(function (s) { return s.kind === 'RUMOR' || stateOf(ctx, s.id) === 'UNVERIFIED'; })) r.push('UNVERIFIED_SOURCE_AS_FACT');
    /* Numbers: a percentage in copy must be the eligible World number of the referenced game. */
    var pct = [];
    all(item).replace(/(\d{1,3})\s*[%％]/g, function (_, n) { pct.push(+n); return _; });
    if (item.type === 'GAME_ANALYSIS') {
      var g = ctx.game;
      if (!g || !E.gameOnMagazine(g)) r.push('WORLD_NOT_ELIGIBLE');
      else {
        var wp = E.worldPercent(g.world);
        if (pct.some(function (n) { return n !== wp; })) r.push('WORLD_NUMBER_MISMATCH');
      }
    } else if (pct.length) {
      r.push('NUMBER_WITHOUT_WORLD');
    }
    if (item.type === 'REVIEW') {
      var hasFinal = list.some(function (s) { return s.kind === 'OFFICIAL_FACT' && stateOf(ctx, s.id) === 'CONFIRMED'; });
      var hasLock = list.some(function (s) { return s.kind === 'WORLD_PACKAGE'; });
      if (!hasFinal || !hasLock) r.push('REVIEW_NEEDS_OFFICIAL_FINAL_AND_LOCKED_READ');
    }
    if (item.type === 'STREAK' && !list.some(function (s) { return s.kind === 'OFFICIAL_FACT'; })) r.push('STREAK_WITHOUT_OFFICIAL_RESULTS');
    return { ok: !r.length, reasons: r };
  }

  function languageChecks(item) {
    var r = [];
    if (!(item.zh && item.zh.headline && item.zh.headline.trim())) r.push('ZH_HEADLINE_MISSING');
    if (!(item.en && item.en.headline && item.en.headline.trim())) r.push('EN_HEADLINE_MISSING');
    /* English edition is all English (Founder B-05). */
    ['headline', 'summary', 'meta'].forEach(function (k) { if (item.en && item.en[k] && CJK.test(item.en[k])) r.push('CJK_IN_ENGLISH:' + k); });
    if (item.zh && item.zh.headline && !CJK.test(item.zh.headline)) r.push('ZH_HEADLINE_NOT_CHINESE');
    if (item.zh && item.en && item.zh.headline === item.en.headline) r.push('UNTRANSLATED');
    texts(item).forEach(function (t) { if (/<[a-z!/][^>]*>/i.test(t.text)) r.push('MARKUP_IN_COPY:' + t.lang + '.' + t.field); });
    return { ok: !r.length, reasons: r };
  }

  function rightsChecks(item, ctx) {
    var r = [];
    var copy = all(item);
    srcs(item, ctx).forEach(function (s) {
      if (s.rightsStatus === 'BLOCKED') r.push('RIGHTS_BLOCKED:' + s.id);
      else if (s.rightsStatus === 'UNVERIFIED') r.push('RIGHTS_UNVERIFIED:' + s.id);
      if (s.quotedSpan) {
        var run = longestCommonRun(copy, s.quotedSpan);
        var limit = QUOTE_LIMIT[s.rightsStatus];
        var repro = CJK.test(s.quotedSpan) ? REPRO_CJK : REPRO_LATIN;
        if (run >= repro && run > limit) r.push((limit === 0 ? 'REPRODUCTION_NOT_PERMITTED:' : 'QUOTE_TOO_LONG:') + s.id);
      }
    });
    return { ok: !r.length, reasons: r };
  }

  function exclusiveProven(item, ctx) {
    return srcs(item, ctx).some(function (s) { return s.kind === 'MOSPORT_ORIGINAL' && s.rightsStatus === 'OWNED' && !s.demo === !item.demo; });
  }

  function policyChecks(item, ctx) {
    var r = [];
    var copy = all(item);
    if (BETTING.test(copy)) r.push('BETTING_FRAMING');
    var claimsExclusive = item.editorialLabel === 'MOSPORT_EXCLUSIVE' || item.riskTriggers.indexOf('EXCLUSIVE_CLAIM') !== -1 || EXCLUSIVE_WORDS.test(copy);
    if (claimsExclusive && !exclusiveProven(item, ctx)) r.push('EXCLUSIVE_NOT_PROVEN');
    if (item.editorialLabel === 'MOSPORT_EXCLUSIVE' && item.riskTriggers.indexOf('EXCLUSIVE_CLAIM') === -1) r.push('EXCLUSIVE_LABEL_UNDECLARED');
    var isRumor = item.riskTriggers.indexOf('UNVERIFIED_RUMOR') !== -1;
    if (isRumor) {
      if (!RUMOR_DISCLOSED_ZH.test(all({ zh: item.zh }))) r.push('RUMOR_NOT_DISCLOSED_ZH');
      if (!RUMOR_DISCLOSED_EN.test(all({ en: item.en }))) r.push('RUMOR_NOT_DISCLOSED_EN');
      if (item.editorialLabel === 'BREAKING_NEWS') r.push('BREAKING_ON_RUMOR');
    }
    if (item.editorialLabel === 'BREAKING_NEWS') {
      var factual = srcs(item, ctx).some(function (s) { return (s.kind === 'OFFICIAL_FACT' || s.kind === 'REPORT') && ['CONFIRMED', 'CORROBORATED'].indexOf(stateOf(ctx, s.id)) !== -1; });
      if (!factual) r.push('BREAKING_WITHOUT_CONFIRMED_FACT');
    }
    if (item.type === 'REVIEW' && /lesson|教訓|內部/i.test(copy)) r.push('INTERNAL_LESSON_IN_PUBLIC_REVIEW');
    return { ok: !r.length, reasons: r };
  }

  /**
   * Risk route for an item whose QA passed.
   *   BLOCK : conflicting or invalidated sources, nothing to publish on
   *   HUMAN : any declared or derived human trigger, or anything not plainly low risk
   *   AUTO  : low-risk class, low-risk sources only, no trigger
   */
  function route(item, ctx) {
    var triggers = item.riskTriggers.slice();
    var reasons = [];
    var add = function (t, why) { if (triggers.indexOf(t) === -1) { triggers.push(t); reasons.push(why); } };
    var list = srcs(item, ctx);
    if (!list.length) return { route: 'BLOCK', triggers: triggers, reasons: ['NO_SOURCE'] };
    var conflict = list.some(function (s) { return C.INVALIDATING.indexOf(stateOf(ctx, s.id)) !== -1; });
    var clusters = {};
    list.forEach(function (s) {
      if (!s.dedupeClusterId) return;
      var st = stateOf(ctx, s.id);
      (clusters[s.dedupeClusterId] = clusters[s.dedupeClusterId] || {})[st] = 1;
    });
    Object.keys(clusters).forEach(function (k) { if (clusters[k].CONFIRMED && (clusters[k].UNVERIFIED || clusters[k].FALSE)) conflict = true; });
    if (conflict) return { route: 'BLOCK', triggers: triggers, reasons: ['SOURCE_CONFLICT'] };

    if (list.some(function (s) { return s.kind === 'RUMOR' || stateOf(ctx, s.id) === 'UNVERIFIED'; })) add('UNVERIFIED_RUMOR', 'DERIVED_FROM_SOURCE');
    if (item.type === 'REVIEW') reasons.push('PUBLIC_REVIEW');
    if (item.editorialLabel === 'BREAKING_NEWS' || item.editorialLabel === 'MOSPORT_EXCLUSIVE') reasons.push('LABEL_' + item.editorialLabel);
    if (item.editorialLabel === 'MOSPORT_EXCLUSIVE') add('EXCLUSIVE_CLAIM', 'DERIVED_FROM_LABEL');
    if (LOW_RISK_TYPES.indexOf(item.type) === -1) reasons.push('NOT_LOW_RISK_CLASS');
    if (list.some(function (s) { return LOW_RISK_SOURCE_KINDS.indexOf(s.kind) === -1; })) reasons.push('NOT_LOW_RISK_SOURCE');
    if (item.riskTriggers.length) reasons.push('DECLARED_TRIGGER');
    var human = triggers.length > 0 || reasons.length > 0;
    return { route: human ? 'HUMAN' : 'AUTO', triggers: triggers, reasons: human ? reasons : ['LOW_RISK'] };
  }

  /** All four machine checks and the route, for display and for the workflow. */
  function assess(item, ctx) {
    var m = { fact: factChecks(item, ctx), language: languageChecks(item), rights: rightsChecks(item, ctx), policy: policyChecks(item, ctx) };
    return { machine: m, route: route(item, ctx), independentSources: independentSourceCount(srcs(item, ctx)) };
  }

  var api = {
    POLICY_VERSION: POLICY_VERSION, LOW_RISK_SOURCE_KINDS: LOW_RISK_SOURCE_KINDS, LOW_RISK_TYPES: LOW_RISK_TYPES,
    factChecks: factChecks, languageChecks: languageChecks, rightsChecks: rightsChecks, policyChecks: policyChecks,
    route: route, assess: assess, independentSourceCount: independentSourceCount, longestCommonRun: longestCommonRun
  };
  if (node) module.exports = api;
  else root.MOSPORT_RISK = api;
})(typeof window !== 'undefined' ? window : globalThis);
