/*
 * B-P2-02 — Editorial content store (internal; never loaded by the public reader).
 *
 * Event-sourced: every change is a validated event appended to a hash-chained
 * log; state is the fold of that log. Reloading = replaying the log, which
 * re-validates every event, so a saved log and a live store cannot disagree.
 *
 *   createStore({ clock })              clock(): ISO instant (inject for tests)
 *   store.addSource(receipt)            immutable source receipt
 *   store.recordSourceEvent(event)      later state of a source (retracted, disputed…)
 *   store.putGames(games)               B prototype schedule (not an A contract)
 *   store.saveItem(item, { expectedRevision })   new content revision (history kept)
 *   store.addApproval(receipt)          bound to item id + revision + content hash
 *   store.saveLayout(plan, { expectedRevision }) Editor layout plan revision
 *   store.buildIssue(meta)              public MagazineIssue snapshot
 *   store.toJSON() / createStore.fromJSON(json, { clock, extend })
 *
 * Status (publishState, publishedAt, approval ref) is not content: it lives in
 * `status[id]` and is changed only through defineEvent handlers (the P3 workflow).
 * The hash chain is an integrity check for an accidental or careless edit of a
 * local file. It is not an identity proof and not tamper-proof storage.
 */
(function (root) {
  'use strict';
  var C = typeof module !== 'undefined' && module.exports ? require('../../js/contracts/contracts.js') : root.MOSPORT_CONTRACTS;

  var STATUS_FIELDS = ['publishState', 'publishedAt', 'approvalReceiptRef'];
  var LOG_SCHEMA = 'mosport-b/store-log@1';

  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function fail(code, problems, detail) { return { ok: false, code: code, problems: problems || [], detail: detail || '' }; }
  function okRes(extra) { var r = { ok: true }; for (var k in extra) r[k] = extra[k]; return r; }

  function emptyState() {
    return { sources: {}, sourceEvents: [], games: [], items: {}, status: {}, approvals: {}, layouts: {}, ext: {} };
  }

  function createStore(opts) {
    opts = opts || {};
    var clock = opts.clock || function () { return new Date().toISOString(); };
    var state = emptyState();
    var log = [];
    var handlers = {};

    function now() {
      var t = clock();
      if (isNaN(C.parseInstant(t))) throw new Error('clock returned a non-ISO instant: ' + t);
      return t;
    }

    /**
     * Register an event type. check(state, data) → null | failure; apply(state, data, event).
     * check must be pure so replay gives the same answer.
     */
    function defineEvent(type, def) {
      if (handlers[type]) throw new Error('event already defined: ' + type);
      handlers[type] = def;
    }

    function append(type, data, at) {
      var h = handlers[type];
      if (!h) return fail('UNKNOWN_EVENT', [], type);
      var ts = at || now();
      var bad = h.check(state, data, ts);
      if (bad) return bad;
      var prev = log.length ? log[log.length - 1].hash : null;
      var ev = { seq: log.length + 1, type: type, at: ts, data: clone(data), prevHash: prev };
      ev.hash = C.sha256(C.canonical(ev));
      h.apply(state, ev.data, ev);
      log.push(ev);
      return okRes({ event: ev });
    }

    /* ---------------- content events ---------------- */

    defineEvent('SOURCE_ADDED', {
      check: function (s, d) {
        var p = C.validateRecord('source', d);
        if (p.length) return fail('INVALID_RECORD', p);
        if (s.sources[d.id]) return fail('DUPLICATE_ID', [], 'source ' + d.id);
        return null;
      },
      apply: function (s, d) { s.sources[d.id] = d; }
    });

    defineEvent('SOURCE_EVENT', {
      check: function (s, d) {
        var p = C.validateRecord('sourceEvent', d);
        if (p.length) return fail('INVALID_RECORD', p);
        if (!s.sources[d.sourceId]) return fail('DANGLING_REF', [], 'source ' + d.sourceId);
        if (s.sourceEvents.some(function (e) { return e.id === d.id; })) return fail('DUPLICATE_ID', [], 'source event ' + d.id);
        return null;
      },
      apply: function (s, d) { s.sourceEvents.push(d); }
    });

    defineEvent('GAMES_SET', {
      check: function (s, d) {
        if (!Array.isArray(d.games)) return fail('WRONG_TYPE', [], 'games');
        var seen = {}, probs = [];
        d.games.forEach(function (g, i) {
          probs = probs.concat(C.validateRecord('game', g, 'games[' + i + ']'));
          if (g && seen[g.gameId]) probs.push({ code: 'DUPLICATE_ID', path: 'games[' + i + ']', detail: g.gameId });
          if (g) seen[g.gameId] = 1;
        });
        return probs.length ? fail('INVALID_RECORD', probs) : null;
      },
      apply: function (s, d) { s.games = d.games; }
    });

    defineEvent('ITEM_REVISION', {
      check: function (s, d) {
        var item = d.item;
        var p = C.validateRecord('item', item);
        if (p.length) return fail('INVALID_RECORD', p);
        /* Content revisions carry no workflow status. */
        if (item.publishState !== 'DRAFT' || item.publishedAt || item.approvalReceiptRef) {
          return fail('STATUS_NOT_CONTENT', [], 'a revision is saved as DRAFT; status changes go through the workflow');
        }
        var hist = s.items[item.id] || [];
        var cur = hist.length;
        if (d.expectedRevision != null && d.expectedRevision !== cur) return fail('REVISION_CONFLICT', [], 'expected ' + d.expectedRevision + ', store has ' + cur);
        if (item.revision !== cur + 1) return fail('REVISION_CONFLICT', [], 'revision must be ' + (cur + 1));
        if (hist.length && hist[0].type !== item.type) return fail('TYPE_CHANGED', [], 'an item keeps its type across revisions');
        var missing = item.sourceRefs.filter(function (r) { return !s.sources[r]; });
        if (missing.length) return fail('DANGLING_REF', [], 'sources ' + missing.join(','));
        if (item.worldAnalysisRef && !s.games.some(function (g) { return g.gameId === item.worldAnalysisRef; })) return fail('DANGLING_REF', [], 'game ' + item.worldAnalysisRef);
        if (item.correctionOfRevision != null && !hist[item.correctionOfRevision - 1]) return fail('DANGLING_REF', [], 'revision ' + item.correctionOfRevision);
        return null;
      },
      apply: function (s, d, ev) {
        var rec = clone(d.item);
        rec.__hash = C.contentHash(rec);
        rec.__savedAt = ev.at;
        (s.items[rec.id] = s.items[rec.id] || []).push(rec);
        if (!s.status[rec.id]) s.status[rec.id] = { publishState: 'DRAFT', revision: rec.revision, publishedRevision: null, publishedAt: null, approvalReceiptRef: null, history: [] };
        else s.status[rec.id].revision = rec.revision;
      }
    });

    defineEvent('APPROVAL_ADDED', {
      check: function (s, d) {
        var p = C.validateRecord('approval', d);
        if (p.length) return fail('INVALID_RECORD', p);
        if (s.approvals[d.id]) return fail('DUPLICATE_ID', [], 'approval ' + d.id);
        var rev = (s.items[d.itemId] || [])[d.itemRevision - 1];
        if (!rev) return fail('DANGLING_REF', [], 'item ' + d.itemId + '@' + d.itemRevision);
        if (rev.__hash !== d.contentHash) return fail('APPROVAL_STALE', [], 'content hash does not match that revision');
        return null;
      },
      apply: function (s, d) { s.approvals[d.id] = d; }
    });

    defineEvent('LAYOUT_REVISION', {
      check: function (s, d) {
        var L = d.plan;
        var p = C.validateRecord('layout', L);
        if (p.length) return fail('INVALID_RECORD', p);
        var hist = s.layouts[L.issueId] || [];
        if (d.expectedRevision != null && d.expectedRevision !== hist.length) return fail('REVISION_CONFLICT', [], 'expected ' + d.expectedRevision + ', store has ' + hist.length);
        if (L.revision !== hist.length + 1) return fail('REVISION_CONFLICT', [], 'revision must be ' + (hist.length + 1));
        var probs = [];
        var slot = function (name, id) {
          var h = s.items[id];
          if (!h) { probs.push({ code: 'DANGLING_REF', path: 'layout.' + name, detail: id }); return; }
          var type = h[0].type;
          if (C.LAYOUT_SLOT_TYPES[name].indexOf(type) === -1) probs.push({ code: 'SLOT_TYPE_MISMATCH', path: 'layout.' + name, detail: id + ' is ' + type });
          if (name === 'cover' && !h[h.length - 1].editorialLabel) probs.push({ code: 'SLOT_TYPE_MISMATCH', path: 'layout.cover', detail: id + ' has no cover label' });
        };
        L.cover.forEach(function (id) { slot('cover', id); });
        if (L.lead) slot('lead', L.lead);
        L.stories.forEach(function (id) { slot('stories', id); });
        L.games.forEach(function (id) { if (!s.games.some(function (g) { return g.gameId === id; })) probs.push({ code: 'DANGLING_REF', path: 'layout.games', detail: id }); });
        return probs.length ? fail('INVALID_LAYOUT', probs) : null;
      },
      apply: function (s, d) { (s.layouts[d.plan.issueId] = s.layouts[d.plan.issueId] || []).push(d.plan); }
    });

    /* ---------------- reads ---------------- */

    function stripInternal(rec) { var o = clone(rec); delete o.__hash; delete o.__savedAt; return o; }
    function itemRevision(id, rev) {
      var h = state.items[id];
      if (!h) return null;
      var r = rev == null ? h[h.length - 1] : h[rev - 1];
      return r ? stripInternal(r) : null;
    }
    /** The item as the reader would receive it: the published revision plus its status. */
    function publishedItem(id) {
      var st = state.status[id];
      if (!st || st.publishState !== 'PUBLISHED' || !st.publishedRevision) return null;
      var it = itemRevision(id, st.publishedRevision);
      STATUS_FIELDS.forEach(function (k) { it[k] = st[k]; });
      return it;
    }

    /**
     * Public issue snapshot. Only PUBLISHED revisions and what they reference are
     * exported: drafts, rejected items, QA notes and the log stay internal.
     */
    function buildIssue(meta) {
      var items = Object.keys(state.items).map(publishedItem).filter(Boolean);
      var srcIds = {}, apIds = {};
      items.forEach(function (it) { it.sourceRefs.forEach(function (r) { srcIds[r] = 1; }); if (it.approvalReceiptRef) apIds[it.approvalReceiptRef] = 1; });
      var layouts = state.layouts[meta.issueId] || [];
      return {
        schema: C.SCHEMAS.issue,
        issueId: meta.issueId,
        mode: meta.mode,
        worldSource: 'PROTOTYPE_FIXTURE',
        generatedAt: meta.generatedAt || now(),
        validUntil: meta.validUntil,
        issue: clone(meta.issue),
        games: clone(state.games),
        items: items,
        sources: Object.keys(srcIds).map(function (id) { return clone(state.sources[id]); }),
        sourceEvents: state.sourceEvents.filter(function (e) { return srcIds[e.sourceId]; }).map(clone),
        approvals: Object.keys(apIds).map(function (id) { return clone(state.approvals[id]); }),
        layout: layouts.length ? clone(layouts[layouts.length - 1]) : null
      };
    }

    var store = {
      defineEvent: defineEvent,
      append: append,
      now: now,
      state: function () { return state; },
      addSource: function (rec) { return append('SOURCE_ADDED', rec); },
      recordSourceEvent: function (rec) { return append('SOURCE_EVENT', rec); },
      putGames: function (games) { return append('GAMES_SET', { games: games }); },
      saveItem: function (item, o) { return append('ITEM_REVISION', { item: item, expectedRevision: o && o.expectedRevision != null ? o.expectedRevision : null }); },
      addApproval: function (rec) { return append('APPROVAL_ADDED', rec); },
      saveLayout: function (plan, o) { return append('LAYOUT_REVISION', { plan: plan, expectedRevision: o && o.expectedRevision != null ? o.expectedRevision : null }); },
      item: itemRevision,
      itemHistory: function (id) { return (state.items[id] || []).map(stripInternal); },
      itemHash: function (id, rev) { var r = itemRevision(id, rev); return r ? C.contentHash(r) : null; },
      status: function (id) { return clone(state.status[id] || null); },
      source: function (id) { return clone(state.sources[id] || null); },
      sourceState: function (id) {
        var st = C.effectiveSourceStates({ sources: Object.keys(state.sources).map(function (k) { return state.sources[k]; }), sourceEvents: state.sourceEvents });
        return st[id] ? st[id].state : null;
      },
      approval: function (id) { return clone(state.approvals[id] || null); },
      layout: function (issueId) { var h = state.layouts[issueId] || []; return h.length ? clone(h[h.length - 1]) : null; },
      layoutHistory: function (issueId) { return clone(state.layouts[issueId] || []); },
      publishedItem: publishedItem,
      buildIssue: buildIssue,
      log: function () { return clone(log); },
      toJSON: function () { return { schema: LOG_SCHEMA, events: clone(log) }; }
    };
    return store;
  }

  /**
   * Rebuild a store from a saved log. Every event is re-validated and the hash
   * chain is checked; the first bad event stops the replay.
   * opts.extend(store) registers extra event types (the workflow) before replay.
   */
  createStore.fromJSON = function (json, opts) {
    opts = opts || {};
    if (!json || json.schema !== LOG_SCHEMA || !Array.isArray(json.events)) throw new Error('not a ' + LOG_SCHEMA + ' file');
    var store = createStore({ clock: opts.clock });
    var target = opts.extend ? opts.extend(store) || store : store;
    var prev = null;
    json.events.forEach(function (ev, i) {
      var body = { seq: ev.seq, type: ev.type, at: ev.at, data: ev.data, prevHash: ev.prevHash };
      if (ev.seq !== i + 1 || ev.prevHash !== prev || C.sha256(C.canonical(body)) !== ev.hash) {
        throw new Error('log integrity check failed at event ' + (i + 1));
      }
      var r = store.append(ev.type, ev.data, ev.at);
      if (!r.ok) throw new Error('log replay rejected event ' + (i + 1) + ' (' + ev.type + '): ' + r.code + ' ' + r.detail);
      prev = ev.hash;
    });
    return target;
  };

  var api = { createStore: createStore, LOG_SCHEMA: LOG_SCHEMA };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOSPORT_STORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
