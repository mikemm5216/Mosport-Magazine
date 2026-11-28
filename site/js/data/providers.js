/*
 * B-P2-03 — issue providers. A provider only loads; it never validates, fills or
 * repairs. Everything it returns goes through MOSPORT_PIPELINE.run.
 *
 *   demo   DEMO fixtures bundled with the prototype (?fixture=<name>, default "demo").
 *          Unknown names fail to load; they do not fall back to the demo issue.
 *   file   A same-origin JSON issue under data/issues/<name>.json (?issue=<name>),
 *          prototype mode only. The name is restricted so a link cannot point the
 *          reader at an arbitrary URL. Served over http(s); file:// fails to load.
 *
 *   schedule A saved, sourced observation under data/schedules/<nbaGameId>.json.
 *          Available in production; no live refresh and no implicit World release.
 *
 * There is no MOSPORT-A provider. A's world-analysis-package@1 is read only by the
 * internal inspector (js/contracts/world-a1.js): v1 is INTERNAL and NOT_ISSUED, and
 * A has no delivery transport or release rules yet (docs/P2_CONTRACT_COMPATIBILITY.md).
 * `worldSource` stays PROTOTYPE_FIXTURE.
 */
(function (root) {
  'use strict';
  var NAME = /^[a-z0-9][a-z0-9-]{0,40}$/;

  function select(search, cfg) {
    var q = new URLSearchParams(search || '');
    var mode = (cfg && cfg.mode) || 'prototype';
    if (q.has('schedule')) {
      var id = q.get('schedule');
      if (!/^\d{10}$/.test(id) || q.getAll('schedule').length !== 1 || q.has('issue') || q.has('fixture')) return { kind: 'schedule', error: 'BAD_SCHEDULE_SELECTION' };
      return { kind: 'schedule', name: id, url: 'data/schedules/' + id + '.json' };
    }
    if (q.has('issue')) {
      var name = q.get('issue');
      if (mode !== 'prototype') return { kind: 'file', name: name, error: 'FILE_PROVIDER_PROTOTYPE_ONLY' };
      if (!NAME.test(name)) return { kind: 'file', name: name, error: 'BAD_ISSUE_NAME' };
      return { kind: 'file', name: name, url: 'data/issues/' + name + '.json' };
    }
    var f = q.get('fixture') || 'demo';
    return { kind: 'demo', name: f };
  }

  /** load(sel, done): done(raw, extra). raw is the issue object or { __loadError }.
      For a schedule, done is called at once with extra.result = null and, only for a
      pinned game whose result file arrives, once more with extra.result set. */
  function load(sel, done) {
    if (sel.error) { done({ __loadError: sel.error }); return; }
    if (sel.kind === 'demo') {
      var F = root.MOSPORT_FIXTURES || {};
      var raw = Object.prototype.hasOwnProperty.call(F, sel.name) && sel.name !== 'details' && sel.name !== 'DEMO_NOW' ? F[sel.name] : null;
      done(raw ? JSON.parse(JSON.stringify(raw)) : { __loadError: 'UNKNOWN_FIXTURE' });
      return;
    }
    if (typeof fetch !== 'function' || !/^https?:$/.test(location.protocol)) { done({ __loadError: 'FETCH_UNAVAILABLE' }); return; }
    fetch(sel.url, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (sel.kind !== 'schedule') { done(j); return; }
        var schemas = root.MOSPORT_CONTRACTS.SCHEMAS;
        if (!j || (j.schema !== schemas.schedule && j.schema !== schemas.seasonSchedule) || !j.game || j.game.gameId !== sel.name) { done({ __loadError: 'SCHEDULE_ID_MISMATCH' }); return; }
        /* The schedule renders at once. A result is requested only for a pinned game and,
           if it arrives, the page re-renders; a slow, missing or failed result changes nothing. */
        done(j, { result: null });
        if (j.schema === schemas.seasonSchedule) return;
        var pins = root.MOSPORT_RESULT_PINS || {};
        if (!Object.prototype.hasOwnProperty.call(pins, sel.name)) return;
        fetch('data/results/' + sel.name + '.json', { credentials: 'same-origin', cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (res) { if (res != null) done(j, { result: res }); }, function () {});
      }, function (e) { done({ __loadError: 'FETCH_FAILED: ' + String(e && e.message || e).slice(0, 80) }); });
  }

  root.MOSPORT_PROVIDERS = { select: select, load: load };
})(window);
