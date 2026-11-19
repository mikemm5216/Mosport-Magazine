'use strict';
/* Real saved schedule through HTTP provider; isolated positive template checks
   are deliberately NOT a public snapshot end-to-end acceptance claim. */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'docs/reports/2026-11-19-beta0-schedule');
const candidate = require('../fixtures/context-snapshot-v2.json');
const saved = require('../../site/data/schedules/0022600051.json');
const now = '2026-11-19T08:10:00Z';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const file = path.resolve(SITE, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(SITE + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
const content = page => page.locator('main').innerText();
const noNumbers = text => !/\d+(?:\.\d+)?\s*%|DEMO|0\.5|61|HOME_COURT|World · Coach Read/.test(text.replace(/0022600051|2026|11\/21|11:00|07:58:50|2026-11-19/g, ''));
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const launch = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {};
  const browser = await chromium.launch(launch);
  let checks = 0;
  const screenshots = [];
  const capture = async (page, filename, detail) => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, image => image.complete ? Promise.resolve() : new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true });
      })));
    });
    const file = path.join(OUT, filename);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
    screenshots.push(Object.assign({ file: filename, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }, detail));
  };
  try {
    fs.mkdirSync(OUT, { recursive: true });
    // The real homepage entrance intentionally has NO fixture/issue/schedule
    // selector. Legacy DEMO suites must never substitute for this acceptance.
    for (const [viewport, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1,
        locale: 'zh-TW', colorScheme: 'light', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.clock.setFixedTime(new Date(now));
      const entrance = base + 'index.html?mode=production&lang=zh';
      await page.goto(entrance);
      await page.waitForSelector('.lead-schedule .pregame-missing');
      const text = await page.locator('.spread').innerText();
      assert.ok(text.includes('SAC') && text.includes('LAL') && text.includes('11:00') && !text.includes('NBA game ID')); checks++;
      assert.ok(text.includes('這場的賽前判讀還沒出來。') && text.includes('非即時更新') && !/NBA game ID|UTC|HOME_COURT@/.test(text)); checks++;
      assert.ok(!/\d+\s*%|DEMO/.test(text) && await page.locator('.spread table').count() === 0); checks++;
      const geometry = await page.evaluate(() => {
        const cover = document.querySelector('.pg-cover').getBoundingClientRect();
        const today = document.querySelector('#today').getBoundingClientRect();
        return { cx: cover.x, cy: cover.y, cw: cover.width, ch: cover.height,
          tx: today.x, ty: today.y, tw: today.width, scroll: document.documentElement.scrollWidth };
      });
      if (viewport === 'desktop') {
        assert.ok(Math.abs(geometry.cy - geometry.ty) < 2 && geometry.tx >= geometry.cx + geometry.cw - 2 && geometry.tw > geometry.cw, JSON.stringify(geometry));
      } else {
        assert.ok(geometry.cy <= 1 && geometry.ch >= height * .75 && geometry.ty >= geometry.cy + geometry.ch, JSON.stringify(geometry));
      }
      checks++;
      assert.ok(geometry.scroll <= width); checks++;
      assert.equal(await page.locator('.lead-source a[href="https://www.nba.com/game/sac-vs-lal-0022600051"]').count(), 1); checks++;
      for (const selector of ['.pg-foot a[href^="schedule.html"]', '.lead-foot a[href^="match.html"]']) {
        assert.ok((await page.locator(selector).getAttribute('href')).includes('schedule=0022600051')); checks++;
      }
      await capture(page, 'home-missing-' + viewport + '.png', { page: 'index.html', viewport, width, height,
        state: 'MISSING', nbaGameId: '0022600051', input: 'DEFAULT_SAVED_SCHEDULE', geometry });
      await page.locator('.cv-next').click();
      assert.ok(new URL(page.url()).hash === '#today'); checks++;
      // A failed source keeps the magazine shell and does not invent a matchup.
      await page.route('**/data/schedules/0022600051.json', route => route.fulfill({ status: 503, body: 'isolated test failure' }));
      await page.goto(entrance); await page.waitForSelector('.pg-inner .state-msg');
      const failed = await page.locator('.spread').innerText();
      assert.ok(failed.includes('暫時打不開') && !failed.includes('這場的賽前判讀還沒出來。')); checks++;
      assert.equal(await page.locator('.pg-cover').count(), 1); checks++;
      assert.ok(!/0022600051|\d+\s*%|DEMO/.test(failed)); checks++;
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
    for (const [name, viewport, width, height] of [
      ['schedule.html', 'desktop', 1440, 900], ['schedule.html', 'mobile', 390, 844],
      ['match.html', 'desktop', 1440, 900], ['match.html', 'mobile', 390, 844]
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'zh-TW', colorScheme: 'light', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.clock.setFixedTime(new Date(now));
      // Capture the existing page context strictly for isolated renderer tests below.
      await page.addInitScript(() => {
        let value;
        Object.defineProperty(window, 'MOSPORT_PAGE', { configurable: true, get: () => value, set: p => {
          const render = p.render; p.render = c => { window.__templateContext = c; return render(c); }; value = p;
        } });
      });
      const query = '?schedule=0022600051&game=0022600051&mode=production&lang=zh';
      await page.goto(base + name + query);
      await page.waitForSelector('.pregame-missing');
      let text = await content(page);
      assert.ok(/SAC\s*@\s*LAL/.test(text) && /0022600051/.test(text) && /11:00/.test(text) && /11\/21/.test(text), text); checks++;
      assert.ok(text.includes('這場的賽前判讀還沒出來。') && text.includes('NBA') && text.includes('07:58:50Z')); checks++;
      assert.ok(noNumbers(text), text); checks++;
      assert.equal(await page.locator('a[href="https://www.nba.com/game/sac-vs-lal-0022600051"]').count(), 1); checks++;
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
      await capture(page, name.replace('.html', '') + '-missing-' + viewport + '.png', { page: name, viewport, width, height, state: 'MISSING', nbaGameId: '0022600051', input: 'SAVED_SCHEDULE' });
      const link = name.startsWith('schedule') ? 'a[href^="match.html"]' : '.m-top a';
      assert.ok((await page.locator(link).first().getAttribute('href')).includes('schedule=0022600051')); checks++;
      await page.locator(link).first().click();
      await page.waitForSelector('.pregame-missing');
      assert.ok((await content(page)).includes('0022600051') && (await content(page)).includes('這場的賽前判讀還沒出來。')); checks++;
      // Isolated 0999 provider fixture stays missing through the real public pipeline.
      // Only the renderer receives a test projection; no release gate is changed.
      await page.route('**/data/schedules/0022600999.json', route => route.fulfill({ json: candidate }));
      await page.goto(base + name + '?schedule=0022600999&game=0022600999&mode=production&lang=zh');
      await page.waitForSelector('.pregame-missing');
      assert.ok((await content(page)).includes('0022600999') && !(await content(page)).includes('0022600051')); checks++;
      for (const value of ['HOME', 'NEUTRAL']) {
        await page.evaluate(({ candidate, value }) => {
          const c = window.__templateContext;
          const raw = JSON.parse(JSON.stringify(candidate.contextSnapshot)); raw.homeCourt.evidence.value = value;
          const game = Object.assign({}, c.issue.schedule[0], candidate.game, { source: { publisher: candidate.source.publisher, url: candidate.source.originalUrl, observedAt: candidate.source.observedAt }, pregameSnapshot: window.MOSPORT_PIPELINE.contextSnapshotView(raw) });
          const issue = Object.assign({}, c.issue, { schedule: [game] });
          document.getElementById('app').innerHTML = window.MOSPORT_PAGE.render(Object.assign({}, c, { issue }));
          let badge = document.getElementById('qa-fixture-label');
          if (!badge) {
            badge = document.createElement('aside'); badge.id = 'qa-fixture-label';
            badge.setAttribute('role', 'note');
            badge.style.cssText = 'padding:12px 16px;background:#fff3c4;color:#332600;border-bottom:2px solid #946b00;font:700 14px/1.5 sans-serif;overflow-wrap:anywhere';
            document.body.prepend(badge);
          }
          badge.textContent = '視覺測試 · 隔離 fixture 0022600999 · ' + value + '（非真實 snapshot／非公開資格驗收）';
        }, { candidate, value });
        const ready = await content(page);
        assert.ok(ready.includes(value) && ready.includes('HOME_COURT@1') && ready.includes('08:05:00Z') && ready.includes('08:00:00Z') && ready.includes('bbbbbbbb')); checks++;
        assert.ok(!ready.includes('這場的賽前判讀還沒出來。') && !/\d+\s*%/.test(ready)); checks++;
        assert.ok(ready.includes('0022600999') && !ready.includes('0022600051')); checks++;
        assert.ok((await page.locator('#qa-fixture-label').innerText()).includes(value)); checks++;
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
        await capture(page, name.replace('.html', '') + '-' + value.toLowerCase() + '-' + viewport + '.png', { page: name, viewport, width, height, state: value, nbaGameId: '0022600999', input: 'ISOLATED_RENDERER_FIXTURE', publicQualification: 'NOT_ASSERTED' });
      }
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
    const context = await browser.newContext(); const page = await context.newPage();
    await page.clock.setFixedTime(new Date(now));
    const url = base + 'match.html?schedule=0022600051&game=0022600051&mode=production&lang=zh';
    for (const [label, mutate, message] of [
      ['missing source', r => { delete r.source; }, '暫時無法閱讀'],
      ['wrong ID', r => { r.game.gameId = '0022600999'; }, '暫時打不開'],
      ['stale source', r => { r.validUntil = '2026-11-19T08:00:00Z'; }, '先前的賽程'],
      ['boolean is not release', r => { r.contextSnapshot = { public: true }; }, '這場的賽前判讀還沒出來。']
    ]) {
      const raw = JSON.parse(JSON.stringify(saved)); mutate(raw);
      await page.route('**/data/schedules/0022600051.json', route => route.fulfill({ json: raw }));
      await page.goto(url); await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      const text = await content(page); assert.ok(text.includes(message), label + ': ' + text); checks++;
      assert.ok(!/\d+\s*%|HOME_COURT/.test(text), label); checks++;
      await page.unroute('**/data/schedules/0022600051.json');
    }
    await page.goto(url.replace('game=0022600051', 'game=UNKNOWN'));
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
    assert.ok((await content(page)).includes('找不到這場比賽')); checks++;
    await context.close();
    fs.writeFileSync(path.join(OUT, 'visual-evidence.json'), JSON.stringify({
      method: 'PLAYWRIGHT_CHROMIUM', browserVersion: browser.version(), sourceHead: process.env.VISUAL_SOURCE_HEAD || null,
      capturedAt: new Date().toISOString(), pageClock: now, fullPage: true, deviceScaleFactor: 1,
      mobileMeaning: 'CSS viewport, not a physical device', checks, screenshots
    }, null, 2) + '\n');
    console.log(checks + ' schedule/context browser checks passed; positive renderer checks are isolated, public qualification remains blocked.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
