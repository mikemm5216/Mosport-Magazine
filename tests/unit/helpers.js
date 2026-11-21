'use strict';
/* Shared test loaders: the DEMO fixtures are browser scripts, so they run in a vm
   with the same globals the pages give them (window.MOSPORT_CONTRACTS). */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../../site/js/contracts/contracts.js');

const SITE = path.join(__dirname, '../../site');
function loadFixtures() {
  const ctx = { window: { MOSPORT_CONTRACTS: C } };
  vm.createContext(ctx);
  for (const f of ['issue.demo.js', 'issue.variants.js']) {
    vm.runInContext(fs.readFileSync(path.join(SITE, 'js/fixtures', f), 'utf8'), ctx);
  }
  return ctx.window.MOSPORT_FIXTURES;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

/* Shared page/app harness, moved from schedule-context.test.js. The supplied raw
   payload replaces only provider I/O; selection, pipeline and rendering are real.
   A projected snapshot is an isolated template contract, never release evidence. */
function renderPage(raw, page, query, projected, opts) {
  opts = opts || {};
  const clock = opts.now || '2026-11-19T08:10:00Z';
  const mount = { innerHTML: '' };
  const document = { documentElement: { dataset: {} }, addEventListener() {}, getElementById: () => mount };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } }
  const window = {
    MOSPORT_I18N: null, MOSPORT_PIPELINE: require('../../site/js/data/pipeline.js'),
    MOSPORT_CONFIG: { mode: opts.mode || 'production' }, MOSPORT_CONTRACTS: C,
    MOSPORT_TEAMS: { get: () => null }, MOSPORT_FIXTURES: opts.fixtures || {}
  };
  const search = query === undefined ? (raw && raw.game ? '?game=' + raw.game.gameId : '') : query;
  const context = { window, document, Date: FixedDate, URLSearchParams, Intl,
    location: { search, pathname: (page === 'home' ? 'index' : page) + '.html', hash: opts.hash || '', protocol: 'https:' },
    localStorage: { getItem: () => null, setItem() {} }, history: { replaceState() {} } };
  vm.createContext(context);
  /* Static layout evidence may opt into the same team names as the live page. */
  if (opts.realTeams) vm.runInContext(fs.readFileSync(path.join(SITE, 'js/teams.nba.js'), 'utf8'), context);
  for (const f of ['js/i18n.js', 'js/pages/' + page + '.js', 'js/data/providers.js']) vm.runInContext(fs.readFileSync(path.join(SITE, f), 'utf8'), context);
  const select = window.MOSPORT_PROVIDERS.select;
  window.MOSPORT_PROVIDERS.select = (search, config) => {
    const selected = select(search, config);
    if (opts.onSelect) opts.onSelect(selected, search, config);
    return selected;
  };
  window.MOSPORT_PROVIDERS.load = (selected, done) => done(selected.error ? { __loadError: selected.error } : raw == null ? raw : clone(raw), { result: opts.result === undefined ? null : clone(opts.result) });
  // Isolated tests only: a test may supply its own pins; production pins come from result-pins.js.
  window.MOSPORT_RESULT_PINS = opts.pins || require('../../site/js/data/result-pins.js');
  if (projected) {
    const render = window.MOSPORT_PAGE.render;
    window.MOSPORT_PAGE.render = c => {
      const issue = Object.assign({}, c.issue, { schedule: c.issue.schedule.map(g => Object.assign({}, g, { pregameSnapshot: projected })) });
      return render(Object.assign({}, c, { issue }));
    };
  }
  vm.runInContext(fs.readFileSync(path.join(SITE, 'js/app.js'), 'utf8'), context);
  return mount.innerHTML;
}

module.exports = { C, SITE, loadFixtures, clone, renderPage };
