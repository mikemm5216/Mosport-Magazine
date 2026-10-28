'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../site/js/reader.js'), 'utf8');

function harness({ width = 1440, height = 900, query = '', stored = null } = {}) {
  const controls = {};
  for (const k of ['width', 'fit', 'out', 'in', 'reset']) {
    controls['[data-zoom="' + k + '"]'] = {
      disabled: false, attrs: {},
      setAttribute(key, value) { this.attrs[key] = value; },
      getAttribute(key) { return this.attrs[key] ?? null; }
    };
  }
  const out = { textContent: '' };
  const bar = { querySelector(k) { return k === '[data-zoom-value]' ? out : controls[k]; } };
  const spread = { style: {}, offsetHeight: 1213 };
  const sizer = { style: {}, querySelector(s) { return s === '.spread' ? spread : null; } };
  const listeners = {};
  const reader = {
    style: {}, dataset: {}, clientWidth: width, clientHeight: height - 104,
    scrollWidth: width, scrollHeight: height - 104, scrollLeft: 0, scrollTop: 0,
    addEventListener(k, fn) { listeners[k] = fn; }
  };
  const doc = {
    getElementById(k) { return ({ reader, sizer, 'reader-bar': bar })[k]; },
    querySelectorAll() { return []; },
    addEventListener() {},
    fonts: null
  };
  const storage = new Map(stored ? [['mosport.zoom', stored]] : []);
  const sessionStorage = {
    getItem(k) { return storage.get(k) ?? null; },
    setItem(k, v) { storage.set(k, v); }
  };
  const win = {
    matchMedia() { return { matches: true }; },
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };
  const context = vm.createContext({
    window: win, document: doc,
    location: { search: query, pathname: '/index.html', hash: '' },
    sessionStorage, history: { replaceState() {} }, URLSearchParams,
    getComputedStyle() {
      return { paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' };
    }
  });
  vm.runInContext(source, context, { filename: 'site/js/reader.js' });
  win.MOSPORT_READER.mount();
  return { api: win.MOSPORT_READER, reader, storage, listeners, controls };
}

test('fresh reader defaults to Fit Width, not Fit Page', () => {
  for (const [width, height, pct] of [[1440, 900, 100], [1280, 800, 90], [1024, 768, 71]]) {
    const x = harness({ width, height });
    assert.equal(x.api.state.mode, 'width');
    assert.equal(Number(x.reader.dataset.zoom), pct);
    assert.equal(x.controls['[data-zoom="width"]'].getAttribute('aria-pressed'), 'true');
  }
});

test('Fit Page, reset, Fit Width remain separate modes', () => {
  const x = harness();
  x.api.zoom('fit');
  assert.equal(x.api.state.mode, 'fit');
  assert.equal(Number(x.reader.dataset.zoom), 61);
  x.api.zoom('reset');
  assert.equal(x.api.state.mode, 'manual');
  assert.equal(Number(x.reader.dataset.zoom), 100);
  x.api.zoom('width');
  assert.equal(x.api.token(), 'width');
});

test('explicit URL wins over session, otherwise session wins over default', () => {
  assert.equal(harness({ query: '?zoom=fit', stored: 'width' }).api.state.mode, 'fit');
  const manual = harness({ stored: '130' });
  assert.equal(manual.api.state.mode, 'manual');
  assert.equal(Number(manual.reader.dataset.zoom), 130);
  assert.equal(harness({ query: '?zoom=width', stored: '130' }).api.token(), 'width');
});

test('W/F shortcuts work without hijacking browser Ctrl zoom', () => {
  const x = harness();
  const fire = (key, ctrlKey = false) => {
    let prevented = false;
    x.listeners.keydown({
      key, ctrlKey, metaKey: false, altKey: false, target: { tagName: 'DIV' },
      preventDefault() { prevented = true; }
    });
    return prevented;
  };
  assert.equal(fire('f'), true);
  assert.equal(x.api.token(), 'fit');
  assert.equal(fire('w'), true);
  assert.equal(x.api.token(), 'width');
  assert.equal(fire('+', true), false);
  assert.equal(x.api.token(), 'width');
});
