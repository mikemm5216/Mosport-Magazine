'use strict';
/* Test-only serialization of the ORIGINAL light-DOM component render methods.
 * This is not a browser upgrade, layout engine, or replacement product renderer.
 * No events, network resources, image failures, or responsive lifecycle are run. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const registry = require('../../site/js/assets/registry.js');
const reg = require('../../site/data/asset-registry.json');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

module.exports = function serializeComponents(html, options) {
  const classes = {}, slots = [];
  class ElementShim {
    constructor() {
      this.attrs = {}; this.dataset = {}; this.innerHTML = ''; this.className = '';
      this.style = { setProperty: (name, value) => { this.style[name] = value; } };
      this.classList = { add: name => { this.className = (this.className + ' ' + name).trim(); } };
    }
    getAttribute(name) { return this.attrs[name] || null; }
    querySelector(selector) {
      if (selector !== 'img') throw new Error('Unsupported static component selector: ' + selector);
      return { addEventListener() {} };
    }
  }
  const window = {
    MOSPORT_REGISTRY: registry, MOSPORT_REG: reg, MOSPORT_CONFIG: { mode: options.mode },
    matchMedia: () => ({ matches: options.width < 1024, addEventListener() {} })
  };
  const context = vm.createContext({ window, HTMLElement: ElementShim,
    document: { documentElement: { lang: 'zh-Hant', dataset: { theme: 'light' } } },
    location: { search: '' }, customElements: { define: (name, cls) => { classes[name] = cls; } }
  });
  for (const file of ['site/js/teams.nba.js', 'site/js/components.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  const output = html.replace(/<(mo-art|mo-team-logo|mo-brand-logo)\b([^>]*)>[\s\S]*?<\/\1>/g, (_, name, attrs) => {
    const element = new classes[name]();
    for (const match of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) element.attrs[match[1]] = match[2];
    element.connectedCallback();
    const data = Object.entries(element.dataset).map(([key, value]) => ' data-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + '="' + esc(value) + '"').join('');
    const style = Object.entries(element.style).filter(([, value]) => typeof value === 'string' && value).map(([key, value]) => key + ':' + value).join(';');
    slots.push({ tag: name, ...element.dataset });
    return '<' + name + attrs + ' class="' + esc(element.className) + '"' + data + (style ? ' style="' + esc(style) + '"' : '') + '>' + element.innerHTML + '</' + name + '>';
  });
  return { html: output, slots };
};
