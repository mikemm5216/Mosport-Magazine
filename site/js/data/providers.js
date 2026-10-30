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
    if (q.has('issue')) {
      var name = q.get('issue');
      if (mode !== 'prototype') return { kind: 'file', name: name, error: 'FILE_PROVIDER_PROTOTYPE_ONLY' };
      if (!NAME.test(name)) return { kind: 'file', name: name, error: 'BAD_ISSUE_NAME' };
      return { kind: 'file', name: name, url: 'data/issues/' + name + '.json' };
    }
    var f = q.get('fixture') || 'demo';
    return { kind: 'demo', name: f };
  }

  /** load(sel, done): done(raw). raw is the issue object or { __loadError }. */
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
      .then(function (j) { done(j); }, function (e) { done({ __loadError: 'FETCH_FAILED: ' + String(e && e.message || e).slice(0, 80) }); });
  }

  root.MOSPORT_PROVIDERS = { select: select, load: load };
})(window);
