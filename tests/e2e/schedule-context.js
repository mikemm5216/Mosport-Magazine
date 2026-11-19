'use strict';
/* Real saved schedule through HTTP provider; isolated positive template checks
   are deliberately NOT a public snapshot end-to-end acceptance claim. */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
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
  try {
    fs.mkdirSync(OUT, { recursive: true });
    for (const [name, width] of [['schedule.html', 1100], ['match.html', 390]]) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
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
      assert.ok(text.includes('賽前紀錄尚未提供公開顯示') && text.includes('NBA') && text.includes('07:58:50Z')); checks++;
      assert.ok(noNumbers(text), text); checks++;
      assert.equal(await page.locator('a[href="https://www.nba.com/game/sac-vs-lal-0022600051"]').count(), 1); checks++;
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
      await page.screenshot({ path: path.join(OUT, name.startsWith('schedule') ? 'schedule-missing.png' : 'match-missing.png'), fullPage: true });
      const link = name.startsWith('schedule') ? 'a[href^="match.html"]' : '.m-top a';
      assert.ok((await page.locator(link).first().getAttribute('href')).includes('schedule=0022600051')); checks++;
      await page.locator(link).first().click();
      await page.waitForSelector('.pregame-missing');
      assert.ok((await content(page)).includes('0022600051') && (await content(page)).includes('賽前紀錄尚未提供公開顯示')); checks++;
      // Return, then exercise the same template with a test-only projected model.
      await page.goto(base + name + query); await page.waitForSelector('.pregame-missing');
      for (const value of ['HOME', 'NEUTRAL']) {
        await page.evaluate(({ candidate, value }) => {
          const c = window.__templateContext;
          const raw = JSON.parse(JSON.stringify(candidate.contextSnapshot)); raw.homeCourt.evidence.value = value;
          const game = Object.assign({}, c.issue.schedule[0], candidate.game, { source: { publisher: candidate.source.publisher, url: candidate.source.originalUrl, observedAt: candidate.source.observedAt }, pregameSnapshot: window.MOSPORT_PIPELINE.contextSnapshotView(raw) });
          const q = new URLSearchParams(location.search); q.set('game', candidate.game.gameId); history.replaceState(null, '', location.pathname + '?' + q);
          const issue = Object.assign({}, c.issue, { schedule: [game] });
          document.getElementById('app').innerHTML = window.MOSPORT_PAGE.render(Object.assign({}, c, { issue }));
        }, { candidate, value });
        const ready = await content(page);
        assert.ok(ready.includes(value) && ready.includes('HOME_COURT@1') && ready.includes('08:05:00Z') && ready.includes('08:00:00Z') && ready.includes('bbbbbbbb')); checks++;
        assert.ok(!ready.includes('賽前紀錄尚未提供公開顯示') && !/\d+\s*%/.test(ready)); checks++;
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
      }
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
    const context = await browser.newContext(); const page = await context.newPage();
    await page.clock.setFixedTime(new Date(now));
    const url = base + 'match.html?schedule=0022600051&game=0022600051&mode=production&lang=zh';
    for (const [label, mutate, message] of [
      ['missing source', r => { delete r.source; }, '未通過格式檢查'],
      ['wrong ID', r => { r.game.gameId = '0022600999'; }, '載入失敗'],
      ['stale source', r => { r.validUntil = '2026-11-19T08:00:00Z'; }, '歷史觀測'],
      ['boolean is not release', r => { r.contextSnapshot = { public: true }; }, '賽前紀錄尚未提供公開顯示']
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
    console.log(checks + ' schedule/context browser checks passed; positive renderer checks are isolated, public qualification remains blocked.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
