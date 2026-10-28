'use strict';
/*
 * Review evidence (not pass/fail): like-for-like BEFORE/AFTER pairs and a Fit vs
 * readable-zoom comparison. Every pair uses the same viewport, zoom, language,
 * theme and capture mode; only the art version differs.
 *   npm run evidence   → docs/reports/2026-10-28-b-p1/evidence-v2/*.jpg (+ evidence-log.json)
 */
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const SITE = 'file://' + path.resolve(__dirname, '../../site') + '/';
const OUT = path.resolve(__dirname, '../../docs/reports/2026-10-28-b-p1/evidence-v2');
const RAW = path.join(OUT, '_raw');   /* single captures, git-ignored */
fs.mkdirSync(RAW, { recursive: true });

async function shot(browser, url, w, h, full, file, clip) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(SITE + url);
  /* Off-screen images decode lazily: walk the page, then decode every image before capture. */
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
  });
  await page.waitForTimeout(400);
  const meta = await page.evaluate(() => ({ zoom: (document.getElementById('reader') || {}).dataset ? document.getElementById('reader').dataset.zoom : null, h: document.documentElement.scrollHeight }));
  const buf = clip ? await page.screenshot({ clip }) : await page.screenshot({ fullPage: full });
  fs.writeFileSync(path.join(RAW, file), buf);
  await ctx.close();
  return meta;
}

/* Side-by-side composite, both panes at their native height, labelled; no filler pane. */
async function pair(browser, a, b, la, lb, file) {
  const A = 'data:image/png;base64,' + fs.readFileSync(path.join(RAW, a)).toString('base64');
  const B = 'data:image/png;base64,' + fs.readFileSync(path.join(RAW, b)).toString('base64');
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  await page.setContent(`<body style="margin:0;padding:12px;background:#fff;font:600 14px sans-serif;display:flex;gap:12px;align-items:flex-start">
    <figure style="margin:0"><figcaption style="padding:4px 0">${la}</figcaption><img src="${A}" style="display:block;outline:1px solid #ccc"></figure>
    <figure style="margin:0"><figcaption style="padding:4px 0">${lb}</figcaption><img src="${B}" style="display:block;outline:1px solid #ccc"></figure></body>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, file.replace(/\.png$/, '.jpg')), fullPage: true, type: 'jpeg', quality: 80 });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const log = [];
  const both = async (name, q, w, h, full) => {
    const m1 = await shot(browser, `index.html?${q}`, w, h, full, `${name}-before.png`);
    const m2 = await shot(browser, `index.html?${q}&art=candidate`, w, h, full, `${name}-after.png`);
    log.push({ name, q, viewport: `${w}x${h}`, fullPage: full, zoomBefore: m1.zoom, zoomAfter: m2.zoom, pageHeightBefore: m1.h, pageHeightAfter: m2.h });
    const label = `${w}×${h} · ${q.replace(/&/g, ' · ')}${full ? ' · full page' : ''}`;
    await pair(browser, `${name}-before.png`, `${name}-after.png`, `BEFORE placeholder-v1 · ${label}`, `AFTER chatgpt-art-v1 (CANDIDATE) · ${label}`, `${name}-pair.png`);
  };

  /* Like-for-like BEFORE / AFTER */
  await both('m390-zh-light', 'lang=zh&theme=light', 390, 844, true);
  await both('m390-en-dark', 'lang=en&theme=dark', 390, 844, true);
  await both('m360-zh-light', 'lang=zh&theme=light', 360, 740, true);
  await both('d1440-fit-zh-light', 'lang=zh&theme=light&zoom=fit', 1440, 900, false);
  /* 100%: a tall viewport so the whole unscaled spread is in one capture */
  await both('d1440-100-zh-light', 'lang=zh&theme=light&zoom=100', 1440, 1400, false);
  await both('d1440-100-en-dark', 'lang=en&theme=dark&zoom=100', 1440, 1400, false);

  /* Fit Page vs readable zoom, same art (candidate), same viewport */
  for (const [w, h] of [[1440, 900], [1280, 800]]) {
    for (const z of ['fit', '100']) {
      const m = await shot(browser, `index.html?lang=zh&theme=light&art=candidate&zoom=${z}`, w, h, false, `read-${w}-${z}.png`);
      log.push({ name: `read-${w}-${z}`, zoom: m.zoom });
    }
    await pair(browser, `read-${w}-fit.png`, `read-${w}-100.png`, `Fit Page · ${w}×${h}`, `100% (readable, scroll) · ${w}×${h}`, `read-${w}-fit-vs-100.png`);
  }
  /* Body-copy legibility at actual pixels: the lead "why" paragraph at Fit vs 100% */
  for (const z of ['fit', '100']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(SITE + `index.html?lang=zh&theme=light&art=candidate&zoom=${z}`);
    await page.waitForTimeout(400);
    const el = page.locator('.lead-foot');
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: path.join(OUT, `read-1440-${z}-lead-copy.jpg`), type: 'jpeg', quality: 85 });
    const px = await page.evaluate(() => { const e = document.querySelector('.lead-why'); const r = document.getElementById('reader'); return Math.round(parseFloat(getComputedStyle(e).fontSize) * (+r.dataset.zoom / 100) * 10) / 10; });
    log.push({ name: `lead-copy-${z}`, effectiveFontPx: px });
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'evidence-log.json'), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 1));
})();
