'use strict';
/*
 * Asset-ready acceptance:
 *  - every documented art slot is present where the registry says it is
 *  - missing art never changes the layout (fallback parity, desktop at 100% and mobile)
 *  - production policy drops PLACEHOLDER art to the fallback
 *  - over http, a newer registry from the server is used; an invalid one is ignored
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.resolve(__dirname, '../../site');
const KEYS = ['.cv-name', '.cv-slogan', '.cv-coach', '.teaser', '.lead', '.lead .cta', '.pct', '.lead mo-team-logo', '.g-card', '.story', '.pg-foot', '.today-mast', '#reader-bar', '.mnav'];

async function geometry(page) {
  return page.evaluate((keys) => {
    const out = {};
    for (const k of keys) {
      const els = [...document.querySelectorAll(k)].filter((e) => e.getClientRects().length);
      out[k] = els.map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((n) => Math.round(n)); });
    }
    return out;
  }, KEYS);
}
const slotStates = (page) => page.evaluate(() => [...document.querySelectorAll('mo-art')].map((e) => ({ slot: e.dataset.slot, state: e.dataset.state, reason: e.dataset.reason, bg: e.style.background })));

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
  let override = null;
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/data/asset-registry.json' && override) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(override); }
    const f = path.join(SITE, decodeURIComponent(u.pathname));
    if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, port: srv.address().port, set: (j) => { override = j; } })));
}

module.exports = async function assetSuite(browser, check, open, OUT) {
  /* Slots present */
  for (const [url, w, want] of [
    ['index.html', 1440, ['cover-desktop-art', 'today-feature-art', 'editorial-card-art']],
    ['index.html', 390, ['cover-mobile-art', 'today-feature-art', 'editorial-card-art']],
    ['match.html?game=DEMO-0041', 1440, ['match-hero-art']]
  ]) {
    const { ctx, page } = await open(browser, url, w, 900);
    const got = (await slotStates(page)).map((s) => s.slot);
    check(`slots ${url}@${w}: ${want.join(', ')}`, want.every((s) => got.includes(s)), got.join(','));
    await ctx.close();
  }

  /* Fallback parity: same geometry with and without art */
  for (const [w, h, q] of [[1440, 900, '&zoom=100'], [1024, 768, '&zoom=fit'], [390, 844, ''], [360, 740, '']]) {
    for (const lang of ['zh', 'en']) {
      const a = await open(browser, `index.html?lang=${lang}${q}`, w, h);
      const b = await open(browser, `index.html?lang=${lang}${q}&art=fallback`, w, h);
      const ga = await geometry(a.page), gb = await geometry(b.page);
      const diff = Object.keys(ga).filter((k) => JSON.stringify(ga[k]) !== JSON.stringify(gb[k]));
      check(`fallback parity ${w}x${h} ${lang}: layout identical without art`, diff.length === 0, diff.join(','));
      const st = await slotStates(b.page);
      check(`fallback ${w}x${h} ${lang}: every art slot falls back with a background`, st.every((s) => s.state === 'fallback' && s.bg), JSON.stringify(st));
      if (lang === 'zh' && (w === 1440 || w === 390)) {
        await a.page.screenshot({ path: path.join(OUT, `asset-${w}-art.png`) });
        await b.page.screenshot({ path: path.join(OUT, `asset-${w}-fallback.png`) });
      }
      await a.ctx.close(); await b.ctx.close();
    }
  }

  /* Production policy: PLACEHOLDER art is not shown; brand mark (ACTIVE, OWNED) is */
  {
    const { ctx, page } = await open(browser, 'schedule.html?mode=production', 1440, 900);
    const brand = await page.evaluate(() => document.querySelector('mo-brand-logo').dataset.state);
    await ctx.close();
    /* DEMO pages refuse to render in production, so check the policy through the page's own resolver. */
    const m = await open(browser, 'index.html', 1440, 900);
    const st = await m.page.evaluate(() => ['cover-desktop-art', 'cover-mobile-art', 'today-feature-art', 'match-hero-art', 'editorial-card-art']
      .map((id) => Object.assign({ slot: id }, window.MOSPORT_REGISTRY.resolveArt(window.MOSPORT_REG, id, { mode: 'production', variant: 'desktop' }))));
    check('production: placeholder art falls back, brand mark renders', brand === 'art' && st.every((s) => s.state === 'fallback' && /PLACEHOLDER|NO_ACTIVE_VERSION/.test(s.reason)), JSON.stringify(st.map((s) => s.slot + ':' + s.reason)) + ' brand ' + brand);
    await m.ctx.close();
  }

  /* Remote registry over http: used when valid, ignored when invalid */
  {
    const S = await serve();
    const base = JSON.parse(fs.readFileSync(path.join(SITE, 'data/asset-registry.json'), 'utf8'));
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    const newer = JSON.parse(JSON.stringify(base));
    newer.registryVersion = 'remote-test.1';
    newer.slots['cover-desktop-art'].activeVersion = null;          /* e.g. a CMS retired the art */
    S.set(JSON.stringify(newer));
    await page.goto(`http://127.0.0.1:${S.port}/index.html`);
    await page.waitForTimeout(600);
    let cover = await page.evaluate(() => { const e = document.querySelector('mo-art[data-slot="cover-desktop-art"]'); return { state: e.dataset.state, reason: e.dataset.reason, v: window.MOSPORT_REG.registryVersion }; });
    check('remote registry: newer valid registry is applied', cover.v === 'remote-test.1' && cover.state === 'fallback' && cover.reason === 'NO_ACTIVE_VERSION', JSON.stringify(cover));

    const bad = JSON.parse(JSON.stringify(base));
    bad.registryVersion = 'remote-test.bad';
    bad.slots['cover-desktop-art'].versions[0].content.containsPerson = true;   /* must be rejected */
    S.set(JSON.stringify(bad));
    await page.goto(`http://127.0.0.1:${S.port}/index.html`);
    await page.waitForTimeout(600);
    cover = await page.evaluate(() => { const e = document.querySelector('mo-art[data-slot="cover-desktop-art"]'); return { state: e.dataset.state, v: window.MOSPORT_REG.registryVersion }; });
    check('remote registry: invalid registry (person in art) is ignored', cover.v === base.registryVersion && cover.state === 'art', JSON.stringify(cover));
    await ctx.close();
    S.srv.close();
  }
};
