/*
 * DEMO seed for the internal editor: the M-01…M-07 cases at realistic stages.
 * Fictional, marked demo. Never loaded by the public reader.
 */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var W = node ? require('./workflow.js') : root.MOSPORT_WORKFLOW;
  var PC = node ? require('./policy-cases.js') : root.MOSPORT_POLICY_CASES;
  var C = node ? require('../../js/contracts/contracts.js') : root.MOSPORT_CONTRACTS;

  var ISSUE_ID = 'DEMO-EDITOR-ISSUE';

  function seed(clock) {
    var wf = W.createWorkflow({ clock: clock });
    var n = 0, id = function () { return 'seed-' + (++n); };
    var must = function (r, what) { if (!r || !r.ok) throw new Error('seed failed at ' + what + ': ' + JSON.stringify(r)); return r; };
    var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
    PC.SOURCES.forEach(function (s) { must(wf.addSource(clone(s)), s.id); });
    must(wf.putGames(clone(PC.GAMES)), 'games');
    Object.keys(PC.CASES).forEach(function (k) {
      var it = clone(PC.CASES[k].item);
      must(wf.createDraft({ commandId: id(), item: it, authorId: 'writer:demo' }), k);
      must(wf.runQA({ commandId: id(), itemId: it.id, revision: 1, attestations: PC.PASS_ALL }), k + ' QA');
    });
    must(wf.publish({ commandId: id(), itemId: 'CASE-M01', revision: 1 }), 'M-01 publish');
    must(wf.publish({ commandId: id(), itemId: 'CASE-M06', revision: 1 }), 'M-06 publish');
    must(wf.saveLayout({
      schema: C.SCHEMAS.layout, id: 'L-EDITOR-1', issueId: ISSUE_ID, revision: 1, decidedBy: 'editor:demo-01',
      decidedAt: '2026-10-31T13:00:00Z', cover: [], lead: null, games: [], stories: ['CASE-M01', 'CASE-M06', 'CASE-M03', 'CASE-M05'], demo: true
    }), 'layout');
    return wf;
  }

  var api = { seed: seed, ISSUE_ID: ISSUE_ID };
  if (node) module.exports = api;
  else root.MOSPORT_DEMO_SEED = api;
})(typeof window !== 'undefined' ? window : globalThis);
