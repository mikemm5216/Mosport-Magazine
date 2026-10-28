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
module.exports = { C, SITE, loadFixtures, clone };
