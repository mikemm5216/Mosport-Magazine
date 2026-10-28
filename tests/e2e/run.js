'use strict';
/*
 * Browser acceptance for B-P1 (no test framework; Playwright only).
 * Writes screenshots and a side-by-side comparison with the visual master to artifacts/.
 * Exit code 1 on any failed check.
 */
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../..');
const SITE = 'file://' + path.join(ROOT, 'site') + '/';
const OUT = path.join(ROOT, 'artifacts');
const REF = path.join(ROOT, 'docs/founder/2026-10-28-spec-lock/VISUAL_REFERENCE_CURRENT.png');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); }

async function open(browser, url, w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !(opts.allow404 && /ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text()))) errors.push(m.text()); });
  await page.goto(SITE + url);
  await page.waitForTimeout(350);
  return { ctx, page, errors };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
/* Reader text without the zoom toolbar (its 100% / current % are controls, not content). */
const text = (page) => page.evaluate(() => { const c = document.body.cloneNode(true); const b = c.querySelector('#reader-bar'); if (b) b.remove(); document.documentElement.appendChild(c); c.style.position = 'absolute'; c.style.left = '-99999px'; const t = c.innerText; c.remove(); return t; });
const visibleText = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent !== null).map((e) => e.innerText).join('\n'), sel);

(async () => {
  const browser = await chromium.launch();

  /* 1. Matrix: width × language × theme on home */
  for (const w of [1440, 1280, 390, 360]) {
    for (const lang of ['zh', 'en']) {
      for (const theme of ['light', 'dark']) {
        const h = w >= 1024 ? 900 : 800;
        const id = `home-${w}-${lang}-${theme}`;
        const { ctx, page, errors } = await open(browser, `index.html?lang=${lang}&theme=${theme}`, w, h);
        check(`${id}: no horizontal overflow`, (await overflow(page)) <= 0);
        check(`${id}: no script errors`, errors.length === 0, errors.join(' | '));
        check(`${id}: theme applied`, (await page.evaluate(() => document.documentElement.dataset.theme)) === theme);
        const cover = await visibleText(page, '.pg-cover');
        check(`${id}: masthead MOSPORT`, /MOSPORT/.test(cover));
        check(`${id}: slogan More than sport`, /MORE THAN SPORT/i.test(cover));
        check(`${id}: Be Your Own Coach`, /BE YOUR\s+OWN COACH/i.test(cover));
        const body = await text(page);
        const pcts = (body.match(/\d+\s*%/g) || []);
        check(`${id}: exactly one win percentage on home`, pcts.length === 1, pcts.join(','));
        if (lang === 'en') {
          const cjk = await page.evaluate(() => {
            const skip = (el) => el.closest('[data-lang]');
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const bad = [];
            while (walker.nextNode()) {
              const n = walker.currentNode;
              if (/[㐀-鿿]/.test(n.nodeValue) && !skip(n.parentElement) && n.parentElement.offsetParent !== null) bad.push(n.nodeValue.trim());
            }
            return bad;
          });
          check(`${id}: English edition has no Chinese text`, cjk.length === 0, cjk.slice(0, 3).join(' / '));
        }
        if (w >= 1024) {
          const spread = await page.evaluate(() => { const c = document.querySelector('.pg-cover').getBoundingClientRect(); const i = document.querySelector('.pg-inner').getBoundingClientRect(); return { cover: c.width, inner: i.width, sameRow: Math.abs(c.top - i.top) < 2 }; });
          check(`${id}: open spread (cover left, TODAY right)`, spread.sameRow && spread.cover > 200 && spread.inner > spread.cover);
        } else {
          const first = await page.evaluate(() => { const c = document.querySelector('.pg-cover').getBoundingClientRect(); return { top: c.top, h: c.height, vh: window.innerHeight }; });
          check(`${id}: cover is the first screen`, first.top <= 1 && first.h >= first.vh * 0.75, JSON.stringify(first));
        }
        if (theme === 'light' || w === 1440) await page.screenshot({ path: path.join(OUT, `${id}.png`), fullPage: true });
        await ctx.close();
      }
    }
  }

  /* 2. Empty issue (U-01) */
  {
    const { ctx, page } = await open(browser, 'index.html?fixture=empty', 1440, 900);
    const counts = await page.evaluate(() => ({ teaser: document.querySelectorAll('.teaser').length, lead: document.querySelectorAll('.lead').length, games: document.querySelectorAll('.g-card').length, stories: document.querySelectorAll('.story').length }));
    check('empty: no teaser/lead/game/story DOM', Object.values(counts).every((n) => n === 0), JSON.stringify(counts));
    check('empty: no percentage anywhere', !/\d+\s*%/.test(await text(page)));
    await page.screenshot({ path: path.join(OUT, 'home-1440-empty.png'), fullPage: true });
    await page.click('.today-empty .cta');
    await page.waitForTimeout(250);
    check('empty: schedule still lists every game', (await page.locator('.sch tbody tr').count()) === 6);
    await ctx.close();
  }

  /* 3. Human-gate bypass attempts never render */
  for (const url of ['index.html?fixture=bypass', 'review.html?fixture=bypass', 'index.html?fixture=bypass&lang=en']) {
    const { ctx, page } = await open(browser, url, 1440, 900);
    const t = await text(page);
    check(`bypass ${url}: nothing unapproved renders`, !/MUST NOT RENDER|不應出現/.test(t));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, 'index.html', 1440, 900);
    check('demo: tracked rumour does not render', !/不應出現|MUST NOT RENDER/.test(await text(page)));
    await ctx.close();
  }

  /* 4. DEMO fence in production mode */
  {
    const { ctx, page } = await open(browser, 'index.html?mode=production', 1440, 900);
    const t = await text(page);
    check('production: DEMO issue refused, no lead, no %', (await page.locator('.lead').count()) === 0 && !/\d+\s*%/.test(t) && /未取得發布資格|not cleared/.test(t));
    await ctx.close();
  }

  /* 5. Logo / mark failover (U-05) */
  {
    const { ctx, page, errors } = await open(browser, 'index.html?logoFail=1', 1440, 900, { allow404: true });
    await page.waitForTimeout(300);
    const fb = await page.evaluate(() => ({
      gsw: document.querySelector('.lead mo-team-logo[code="GSW"]').dataset.fallback,
      lal: document.querySelector('.lead mo-team-logo[code="LAL"]').dataset.fallback,
      abbr: document.querySelector('.lead mo-team-logo[code="GSW"]').innerText.trim(),
      mark: document.querySelector('mo-brand-logo').dataset.fallback
    }));
    check('logoFail: team logos fall back to tricode', fb.gsw === 'abbr' && fb.lal === 'abbr' && fb.abbr === 'GSW', JSON.stringify(fb));
    check('logoFail: brand mark falls back to text', fb.mark === 'text');
    check('logoFail: page intact', errors.length === 0 && (await page.locator('.lead').count()) === 1, errors.join(' | '));
    await ctx.close();
  }

  /* 6. Imagery: only manifest assets, none of kind athlete, no remote hosts (U-07) */
  for (const url of ['index.html', 'match.html?game=DEMO-0041', 'schedule.html', 'review.html']) {
    const { ctx, page } = await open(browser, url, 1440, 900);
    const r = await page.evaluate(() => {
      const A = window.MOSPORT_ASSETS;
      const all = [].concat(Object.values(A.brand), Object.values(A.cover), Object.values(A.teams));
      const allowed = new Set(all.filter((a) => a.src && a.kind !== 'athlete').map((a) => new URL(a.src, location.href).href));
      const imgs = [...document.images].map((i) => i.src);
      return { imgs, bad: imgs.filter((s) => !allowed.has(s) || !s.startsWith('file:')), athlete: all.filter((a) => a.kind === 'athlete').length };
    });
    check(`imagery ${url}: only local manifest assets, no athlete kind`, r.bad.length === 0 && r.athlete === 0, r.bad.join(','));
    await ctx.close();
  }

  /* 7. Navigation and controls */
  {
    const { ctx, page } = await open(browser, 'index.html', 1440, 900);
    await page.click('.topbar .tb-nav a[href^="schedule.html"]');
    await page.waitForTimeout(250);
    check('nav: Schedule link works', /schedule\.html/.test(page.url()) && (await page.locator('.sch tbody tr').count()) === 6);
    await page.click('.topbar .tb-nav a[href^="review.html"]');
    await page.waitForTimeout(250);
    check('nav: Review shows only the human-approved review', (await page.locator('.rv-article').count()) === 1);
    await page.click('.topbar .tb-nav a[href^="index.html"]');
    await page.waitForTimeout(250);
    await page.click('.topbar [data-act="theme"]');
    check('control: theme toggles to dark', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
    await page.reload(); await page.waitForTimeout(250);
    check('control: theme preference remembered', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
    await page.click('.topbar [data-act="theme"]');
    await page.click('.topbar [data-lang="en"]');
    check('control: language switches to English', (await page.evaluate(() => document.documentElement.lang)) === 'en');
    await page.click('.topbar [data-lang="zh"]');
    await page.click('.tb-almanac');
    check('control: Almanac is a labelled not-live entry', /尚未上線|not live/.test(await page.locator('.note').innerText()));
    await page.click('.note [data-act="close-note"]');
    await page.click('.tb-sports .sport:nth-child(2)');
    check('control: Coming-soon sport explains itself', /即將推出|Coming soon/.test(await page.locator('.note').innerText()));
    await page.click('.lead .cta');
    await page.waitForTimeout(300);
    check('nav: lead opens Match Detail', /match\.html\?.*game=DEMO-0041/.test(page.url()));
    check('match: number shown is the World value', /61%/.test(await page.locator('.card-read').innerText()));
    await ctx.close();
  }
  {
    /* Edition and appearance survive navigation (fresh context, no stored preference). */
    const { ctx, page } = await open(browser, 'index.html?lang=en&theme=dark', 1440, 900);
    for (const sel of ['.topbar .tb-nav a[href^="schedule.html"]', '.topbar .tb-nav a[href^="review.html"]', '.topbar .tb-nav a[href^="index.html"]', '.lead .cta']) {
      await page.click(sel);
      await page.waitForTimeout(250);
      const s = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.theme]);
      check(`nav keeps en + dark: ${sel}`, s[0] === 'en' && s[1] === 'dark', s.join(','));
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, 'index.html', 390, 800);
    await page.click('.mnav-sec a[href^="schedule.html"]');
    await page.waitForTimeout(250);
    check('mobile nav: Schedule tab works', /schedule\.html/.test(page.url()));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, 'match.html?game=DEMO-0046', 1440, 900);
    check('match: internal-only World read shows no number', !/\d+\s*%/.test(await text(page)));
    await ctx.close();
  }

  /* 8. Inner pages at mobile widths */
  for (const url of ['match.html?game=DEMO-0041', 'schedule.html', 'review.html']) {
    for (const w of [390, 360]) {
      const { ctx, page, errors } = await open(browser, url + (url.includes('?') ? '&' : '?') + 'lang=en', w, 800);
      check(`${url} @${w}: no overflow, no errors`, (await overflow(page)) <= 0 && errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }
  for (const [name, url, w] of [['match-1440', 'match.html?game=DEMO-0041', 1440], ['schedule-1440', 'schedule.html', 1440], ['review-1440', 'review.html', 1440], ['match-390', 'match.html?game=DEMO-0041', 390]]) {
    const { ctx, page } = await open(browser, url, w, 900);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    await ctx.close();
  }

  /* 9. Magazine Reader Zoom (Founder addendum) */
  await require('./zoom-suite')(browser, check, open, OUT);

  /* 10. Side-by-side with the visual master (for human review; not an automated pass/fail) */
  {
    const ref = 'data:image/png;base64,' + fs.readFileSync(REF).toString('base64');
    const d = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, 'zoom-1440-fit.png')).toString('base64');
    const h = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, 'zoom-1440-100.png')).toString('base64');
    const m = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, 'home-390-zh-light.png')).toString('base64');
    const ctx = await browser.newContext({ viewport: { width: 2500, height: 1100 } });
    const page = await ctx.newPage();
    await page.setContent(`<body style="margin:0;background:#222;display:flex;gap:16px;padding:16px;font:14px sans-serif;color:#fff">
      <figure style="margin:0"><figcaption>VISUAL_REFERENCE_CURRENT.png</figcaption><img src="${ref}" style="height:1024px"></figure>
      <figure style="margin:0"><figcaption>Browser 1440×900 · Fit Page</figcaption><img src="${d}" style="width:820px;display:block"><figcaption style="margin-top:8px">Browser 1440×900 · 100%</figcaption><img src="${h}" style="width:820px;display:block"></figure>
      <figure style="margin:0"><figcaption>Browser 390 · zh · light (top)</figcaption><div style="height:1024px;overflow:hidden"><img src="${m}" style="width:260px"></div></figure></body>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'compare-visual-master.png'), fullPage: true });
    await ctx.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'ok    ' : 'FAIL  '} ${r.name}${r.ok || !r.detail ? '' : '  — ' + r.detail}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: artifacts/`);
  fs.writeFileSync(path.join(OUT, 'e2e-results.json'), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
