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
const now = new Date(Date.parse(saved.editorial ? saved.editorial.observedAt : saved.source.observedAt) + 60000).toISOString();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const file = path.resolve(SITE, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(SITE + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
const content = page => page.locator('main').innerText();
const noNumbers = text => !/\d+(?:\.\d+)?\s*%|DEMO|HOME_COURT|World · Coach Read|homeWinProbability/.test(text);
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
      await page.waitForSelector('.lead-schedule');
      for (const slot of ['cover-' + viewport + '-art', 'today-feature-art']) {
        const art = page.locator('mo-art[data-slot="' + slot + '"]');
        assert.equal(await art.getAttribute('data-version'), 'claude-crop-v1');
        const image = art.locator('img');
        assert.ok(await image.isVisible(), slot);
        assert.ok(await image.evaluate(async img => {
          await img.decode();
          return img.naturalWidth > 0 && img.naturalHeight > 0;
        }), slot);
        checks++;
      }
      const text = await page.locator('.spread').innerText();
      assert.ok(text.includes('SAC') && text.includes('LAL') && text.includes('11:00') && !text.includes('NBA game ID')); checks++;
      assert.ok(!/賽前判讀還沒出來|not out yet/.test(text) && text.includes('核對（台北）') && !/NBA game ID|UTC|HOME_COURT@/.test(text)); checks++;
      assert.equal(await page.locator('.pregame-missing, .cv-status').count(), 0, 'no empty read block or cover status'); checks++;
      assert.ok(text.includes('13 分之差，國王盃賽再戰湖人') && text.includes('103：116')); checks++;
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
      await page.waitForSelector('.m-hero, .sch');
      let text = await content(page);
      assert.ok(/SAC\s*@\s*LAL/.test(text) && /0022600051/.test(text) && /11:00/.test(text) && /11\/21/.test(text), text); checks++;
      assert.ok(!/賽前判讀還沒出來|賽前看點/.test(text) && text.includes('NBA') && text.includes(saved.source.observedAt)); checks++;
      assert.equal(await page.locator('.pregame-missing').count(), 0, name + ': no empty read block'); checks++;
      assert.ok(noNumbers(text), text); checks++;
      assert.equal(await page.locator('a[href="https://www.nba.com/game/sac-vs-lal-0022600051"]').count(), 1); checks++;
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
      await capture(page, name.replace('.html', '') + '-missing-' + viewport + '.png', { page: name, viewport, width, height, state: 'MISSING', nbaGameId: '0022600051', input: 'SAVED_SCHEDULE' });
      const link = name.startsWith('schedule') ? 'a[href^="match.html"]' : '.m-top a';
      assert.ok((await page.locator(link).first().getAttribute('href')).includes('schedule=0022600051')); checks++;
      await page.locator(link).first().click();
      await page.waitForSelector('.m-hero, .sch');
      assert.ok((await content(page)).includes('0022600051') && !/賽前判讀還沒出來|賽前看點/.test(await content(page))); checks++;
      // Isolated 0999 provider fixture stays missing through the real public pipeline.
      // Only the renderer receives a test projection; no release gate is changed.
      await page.route('**/data/schedules/0022600999.json', route => route.fulfill({ json: candidate }));
      await page.clock.setFixedTime(new Date('2026-11-19T08:10:00Z'));
      await page.goto(base + name + '?schedule=0022600999&game=0022600999&mode=production&lang=zh');
      await page.waitForSelector('.m-hero, .sch');
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
      ['stale source', r => { r.validUntil = '2026-11-21T02:30:00Z'; }, '先前的賽程'],
      ['past tipoff', () => {}, '已過原定開賽時間（台北 11:00）。'],
      ['boolean is not release', r => { r.contextSnapshot = { public: true }; }, '賽程資訊']
    ]) {
      const raw = JSON.parse(JSON.stringify(saved)); mutate(raw);
      await page.clock.setFixedTime(new Date(label === 'stale source' ? raw.validUntil : label === 'past tipoff' ? raw.game.tipoff : now));
      await page.route('**/data/schedules/0022600051.json', route => route.fulfill({ json: raw }));
      await page.goto(url); await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      const text = await content(page); assert.ok(text.includes(message), label + ': ' + text); checks++;
      assert.ok(!/\d+\s*%|HOME_COURT/.test(text), label); checks++;
      await page.unroute('**/data/schedules/0022600051.json');
    }
    // A homepage opened before tipoff and left open re-evaluates the loaded data at tipoff.
    {
      const live = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const open = await live.newPage();
      const pageErrors = []; open.on('pageerror', e => pageErrors.push(e.message));
      await open.clock.install({ time: new Date(Date.parse(saved.game.tipoff) - 1000) });
      let loads = 0;
      await open.route('**/data/schedules/0022600051.json', route => { loads++; return route.continue(); });
      await open.goto(base + 'index.html?mode=production&lang=zh');
      await open.waitForSelector('.lead-schedule');
      let before = await open.locator('.spread').innerText();
      assert.ok(before.includes('13 分之差，國王盃賽再戰湖人') && before.includes('103：116') && !before.includes('已過原定開賽時間'), 'before tipoff'); checks++;
      await open.clock.runFor(6 * 60 * 1000);
      const after = await open.locator('.spread').innerText();
      assert.ok(after.includes('已過原定開賽時間（台北 11:00）。') && after.includes('查看 NBA 官方賽況'), 'after tipoff: ' + after); checks++;
      assert.ok(!after.includes('13 分之差') && !after.includes('103：116') && !after.includes('先前的賽程'), 'editorial withdrawn without reload'); checks++;
      assert.equal(loads, 1, 'no reload or refetch'); checks++;
      assert.deepEqual(pageErrors, []); checks++;
      // Control: an observation that expired before tipoff stays expired across tipoff on an open page.
      const early = JSON.parse(JSON.stringify(saved)); early.validUntil = '2026-11-21T02:30:00Z';
      await open.unroute('**/data/schedules/0022600051.json');
      const expired = await live.newPage();
      await expired.clock.install({ time: new Date('2026-11-21T02:29:59Z') });
      await expired.route('**/data/schedules/0022600051.json', route => route.fulfill({ json: early }));
      await expired.goto(base + 'index.html?mode=production&lang=zh');
      await expired.waitForSelector('.lead-schedule');
      before = await expired.locator('.spread').innerText();
      assert.ok(before.includes('13 分之差') && !before.includes('先前的賽程'), 'valid before expiry'); checks++;
      await expired.clock.runFor(40 * 60 * 1000);
      const late = await expired.locator('.spread').innerText();
      assert.ok(late.includes('先前的賽程') && !late.includes('已過原定開賽時間') && !late.includes('13 分之差'), 'expired stays expired after tipoff: ' + late); checks++;
      await live.close();
    }
    // Fixed clock across a boundary: the pass reads 2 ms before it, rendering finishes 1 ms after.
    // The page must re-evaluate the already-loaded data at once, without waiting or refetching.
    {
      const straddle = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const early = JSON.parse(JSON.stringify(saved)); early.validUntil = '2026-11-21T02:30:00Z';
      for (const [label, raw, boundary, expected, gone] of [
        ['valid until tipoff', saved, saved.game.tipoff, '已過原定開賽時間（台北 11:00）。', '先前的賽程'],
        ['expired before tipoff', early, early.validUntil, '先前的賽程', '已過原定開賽時間']
      ]) {
        const p = await straddle.newPage();
        const pageErrors = []; p.on('pageerror', e => pageErrors.push(e.message));
        const edge = Date.parse(boundary);
        await p.addInitScript(([first, after]) => {
          const Real = Date;
          let now = first;
          class FixedDate extends Real {
            constructor(...a) { super(...(a.length ? a : [now])); }
            static now() { return now; }
          }
          window.Date = FixedDate;
          const html = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
          Object.defineProperty(Element.prototype, 'innerHTML', {
            configurable: true,
            get() { return html.get.call(this); },
            set(v) { html.set.call(this, v); if (this.id === 'app' && String(v).includes('lead-schedule')) now = after; }
          });
        }, [edge - 2, edge + 1]);
        let loads = 0;
        await p.route('**/data/schedules/0022600051.json', route => { loads++; return route.fulfill({ json: raw }); });
        await p.goto(base + 'index.html?mode=production&lang=zh');
        await p.waitForSelector('.lead-schedule');
        const shown = await p.locator('.spread').innerText();
        assert.ok(shown.includes(expected) && !shown.includes(gone) && !shown.includes('13 分之差') && !shown.includes('103：116'), label + ': ' + shown);
        assert.equal(loads, 1, label + ': loaded once');
        assert.deepEqual(pageErrors, [], label);
        checks++;
        await p.close();
      }
      await straddle.close();
    }
    // Official result projection through the real HTTP provider (synthetic 0999 only).
    // Unpinned: ignored. Pinned by an isolated test pin file: Home/Schedule/Match show the result.
    {
      const C = require('../../site/js/contracts/contracts.js');
      const res = {
        schema: 'mosport-b/game-result@1', nbaGameId: '0022600999', espnGameId: '401999999',
        away: 'SAC', home: 'LAL', awayScore: 101, homeScore: 112, status: 'FINAL',
        officialUrl: 'https://www.nba.com/game/sac-vs-lal-0022600999',
        confirmations: { nba: { observedAt: '2026-11-21T05:40:00Z' }, espn: { observedAt: '2026-11-21T05:41:00Z' } },
        receiptRef: 'TEST-ISOLATED-0999'
      };
      const pinJs = 'window.MOSPORT_RESULT_PINS = Object.freeze(' + JSON.stringify({ '0022600999': { digest: C.sha256(C.canonical(res)), receiptRef: res.receiptRef } }) + ');';
      for (const pinned of [false, true]) {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const p = await ctx.newPage();
        const pageErrors = []; p.on('pageerror', e => pageErrors.push(e.message));
        await p.clock.setFixedTime(new Date('2026-11-21T06:00:00Z'));
        await p.route('**/data/schedules/0022600999.json', route => route.fulfill({ json: candidate }));
        let resultRequests = 0, release = null;
        const held = new Promise(r => { release = r; });
        await p.route('**/data/results/0022600999.json', async route => { resultRequests++; if (pinned) await held; route.fulfill({ json: res }); });
        if (pinned) await p.route('**/js/data/result-pins.js', route => route.fulfill({ body: pinJs, contentType: 'text/javascript' }));
        // A held result request must not hold the schedule: each page is readable first.
        for (const page of pinned ? ['index.html', 'schedule.html', 'match.html'] : []) {
          await p.goto(base + page + '?schedule=0022600999&game=0022600999&mode=production&lang=zh');
          await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 5000 });
          const early = await p.locator('body').innerText();
          assert.ok(early.includes('11:00') && !early.includes('終場 湖人'), page + ' readable while result is held');
        }
        if (pinned) release();
        for (const page of ['index.html', 'schedule.html', 'match.html']) {
          await p.goto(base + page + '?schedule=0022600999&game=0022600999&mode=production&lang=zh');
          await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
          if (pinned) await p.waitForFunction(() => document.body.innerText.includes('終場'), null, { timeout: 5000 });
          const text = await p.locator('body').innerText();
          if (pinned) assert.ok(text.includes('終場 湖人 112：101 國王') && !/TEST-ISOLATED|雜湊|收據/.test(text), page + ' pinned: ' + text.slice(0, 300));
          else assert.ok(!text.includes('終場 湖人') && !text.includes('112：101'), page + ' unpinned');
        }
        assert.deepEqual(pageErrors, []);
        if (!pinned) assert.equal(resultRequests, 0, 'no result request without a pin');
        checks++;
        await ctx.close();
      }
    }
    // Real 0022600051 result with the production pin and the served file (no routes for either).
    {
      const real = require('../../site/data/results/0022600051.json');
      const edge = Date.parse(real.confirmations.espn.observedAt);
      for (const [label, clock, tamper, expectFinal] of [
        ['after final', '2026-11-21T06:00:00Z', false, true],
        ['1 ms before', new Date(edge - 1).toISOString(), false, false],
        ['altered file', '2026-11-21T06:00:00Z', true, false]
      ]) {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const p = await ctx.newPage();
        const pageErrors = []; p.on('pageerror', e => pageErrors.push(e.message));
        await p.clock.setFixedTime(new Date(clock));
        if (tamper) await p.route('**/data/results/0022600051.json', route => route.fulfill({ json: Object.assign({}, real, { homeScore: 107 }) }));
        for (const page of ['index.html', 'schedule.html', 'match.html']) {
          await p.goto(base + page + '?schedule=0022600051&game=0022600051&mode=production&lang=zh');
          await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
          if (expectFinal) await p.waitForFunction(() => document.body.innerText.includes('終場'), null, { timeout: 5000 });
          else await p.waitForTimeout(300);
          const text = await p.locator('body').innerText();
          if (expectFinal) assert.ok(text.includes('終場 湖人 106：104 國王') && !text.includes('已過原定開賽時間') && !/NBA-0022600051-R1|370e676a/.test(text), label + ' ' + page);
          else assert.ok(!text.includes('終場 湖人') && text.includes('已過原定開賽時間（台北 11:00）。'), label + ' ' + page + ': ' + text.slice(0, 200));
        }
        assert.deepEqual(pageErrors, []);
        checks++;
        await ctx.close();
      }
    }
    // Game over → tell the reader: real pinned 0022600051 final, header score, bounded visible-only recheck.
    // Pins and result are the site's own files, swapped per test only to model "not yet deployed".
    {
      const real = require('../../site/data/results/0022600051.json');
      const realPins = fs.readFileSync(path.join(SITE, 'js/data/result-pins.js'), 'utf8');
      const emptyPins = 'window.MOSPORT_RESULT_PINS = Object.freeze({});\n';
      const wrongPins = realPins.replace('370e676a592aa02547f5d7fd80e80d0f4156db9c02e5fb127f1160c8bfee864d', '0'.repeat(64));
      assert.notEqual(wrongPins, realPins);
      const STEP = 5 * 60 * 1000;
      const page390 = { width: 390, height: 844 };
      async function session(opts = {}) {
        const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        const p = await ctx.newPage();
        const errors = []; p.on('pageerror', e => errors.push(e.message));
        const served = { pins: opts.pins || emptyPins, result: opts.result === undefined ? null : opts.result };
        const asked = { pins: 0, result: 0, practice: 0 };
        await p.route('**/js/data/result-pins.js*', route => { asked.pins++; route.fulfill({ contentType: 'text/javascript', body: served.pins }); });
        await p.route('**/data/results/0022600051.json', route => { asked.result++; served.result ? route.fulfill({ json: served.result }) : route.fulfill({ status: 404, body: '' }); });
        p.on('request', r => { if (r.url().includes('/owner-edition/')) asked.practice++; });
        await p.addInitScript(() => {
          Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis || 'visible' });
        });
        if (opts.init) await p.addInitScript(opts.init.fn, opts.init.arg);
        await p.clock.install({ time: new Date(opts.clock || '2026-11-21T06:00:00Z') });
        return { ctx, p, errors, served, asked };
      }
      const settle = p => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      const tick = async (p, n = 1) => { for (let i = 0; i < n; i++) { await p.clock.runFor(STEP); await p.waitForTimeout(120); } };
      const header = p => p.locator('.m-hero').innerText();
      const url = (lang, extra = '') => base + 'match.html?schedule=0022600051&game=0022600051&mode=production&lang=' + lang + extra;

      // 1. Waiting → deploy pins (result not yet there) → result deployed → final, announced once.
      {
        const { ctx, p, errors, served, asked } = await session({ viewport: page390 });
        await p.goto(url('zh')); await settle(p);
        assert.ok((await header(p)).includes('等待官方核實賽果') && !/104|106/.test(await header(p)), 'waiting header');
        assert.equal(await p.locator('#m-final, .note').count(), 0);
        await tick(p);
        assert.equal(await p.locator('#m-final').count(), 0, 'nothing new yet');
        served.pins = realPins;                       // pins shipped first: the result file is still 404
        await tick(p);
        assert.equal(await p.locator('#m-final').count(), 0, 'pin without result is not a final');
        served.result = real;                         // result deployed
        await tick(p);
        await p.waitForSelector('#m-final');
        assert.ok((await header(p)).includes('比賽結束 · 官方核實終場') && (await p.locator('.m-score').innerText()).replace(/\s+/g, ' ') === '104 – 106');
        assert.equal(await p.locator('#m-final').getAttribute('aria-label'), '終場 湖人 106：104 國王');
        assert.equal(await p.locator('.note').innerText().then(t => t.split('\n')[0]), '比賽結束。終場 湖人 106：104 國王');
        assert.equal(await p.locator('#mo-live').getAttribute('aria-live'), 'polite');
        assert.equal(await p.locator('#mo-live').textContent(), '比賽結束。終場 湖人 106：104 國王');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no overflow at 390');
        await p.screenshot({ path: path.join(ROOT, 'artifacts', 'final-announced-zh-390.png'), fullPage: true });
        const after = { ...asked };
        await tick(p, 6);
        await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
        await p.waitForTimeout(150);
        assert.deepEqual(asked, after, 'no request once the final shows');
        assert.equal(await p.locator('.note').count(), 1, 'announced once');
        await p.locator('[data-act="close-final"]').click();
        await tick(p, 2);
        assert.equal(await p.locator('.note').count(), 0, 'closed stays closed');
        assert.equal(await p.locator('#m-final').count(), 1);
        await p.locator('[data-act="lang"][data-lang="en"]').click();
        assert.ok((await header(p)).includes('Game over · Verified final'));
        assert.equal(asked.practice, 0); assert.deepEqual(errors, []); checks++;
        await ctx.close();
      }
      // 2. Hidden page: no request at all; returning (visibilitychange) and pageshow each ask once.
      for (const back of ['visibilitychange', 'pageshow']) {
        const { ctx, p, errors, served, asked } = await session();
        await p.goto(url('en')); await settle(p);
        assert.ok((await header(p)).includes('Waiting for the verified result.'));
        await p.evaluate(() => { window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
        served.pins = realPins; served.result = real;
        const before = { ...asked };
        await tick(p, 12);
        assert.deepEqual(asked, before, back + ': hidden page asks nothing');
        assert.equal(await p.locator('#m-final').count(), 0);
        await p.evaluate(kind => {
          window.__vis = 'visible';
          if (kind === 'pageshow') window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
          else document.dispatchEvent(new Event('visibilitychange'));
        }, back);
        await p.waitForSelector('#m-final');
        assert.equal(await p.locator('#m-final').getAttribute('aria-label'), 'Final: Lakers 106–104 Kings');
        assert.equal(await p.locator('#mo-live').textContent(), 'The game is over. Final: Lakers 106–104 Kings');
        assert.equal(asked.pins - before.pins, 1, back + ': one pins request'); assert.equal(asked.result - before.result, 1);
        assert.deepEqual(errors, []); checks++;
        await ctx.close();
      }
      // 3. Wrong pin, or a result that differs from its pin: never a final, never an announcement; bounded.
      for (const [label, pins, result] of [['wrong pin', wrongPins, real], ['altered result', realPins, Object.assign({}, real, { homeScore: 107 })]]) {
        const { ctx, p, errors, served, asked } = await session({ pins, result });
        await p.goto(url('zh')); await settle(p);
        assert.ok((await header(p)).includes('等待官方核實賽果'), label);
        await tick(p, 40);
        assert.equal(await p.locator('#m-final, .note').count(), 0, label);
        assert.ok(!(await p.locator('main').innerText()).includes('終場 湖人'), label);
        assert.equal(await p.locator('#mo-live').count(), 0, label);
        assert.ok(asked.pins <= 1 + 36, label + ': at most 36 timed rechecks, got ' + asked.pins);
        const capped = asked.pins; await tick(p, 4); assert.equal(asked.pins, capped, label + ': stops at the cap');
        served.pins = realPins; served.result = real;   // a later return still checks once
        await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await p.waitForSelector('#m-final');
        assert.deepEqual(errors, []); checks++;
        await ctx.close();
      }
      // 4. Old practice links and old practice storage, first visit and return: score in the header,
      //    nothing to pick, lock, reveal or replay; no practice file request; no repeated announcement.
      for (const [lang, link, label] of [['zh', '&practice=1', '比賽結束 · 官方核實終場'], ['en', '&practice=1', 'Game over · Verified final'], ['zh', '', '比賽結束 · 官方核實終場']]) {
        const init = { fn: o => {
          window.MOSPORT_OWNER_EDITION = o;
          try { localStorage.setItem('mosport.practice.0022600051', JSON.stringify({ pick: 'AWAY', locked: true, lockedAt: '2026-11-21T05:00:00.000Z', revealed: true })); } catch (e) {}
        }, arg: { catalog: [{ id: '0090000009', away: 'ORL', home: 'DET', availableAt: '2026-01-01T00:00:00Z' }], games: {} } };
        const { ctx, p, errors, asked } = await session({ viewport: page390, pins: realPins, result: real, init });
        // The bare ?game=…&practice=1 form is the old shareable link; without it an owner edition opens its catalog.
        for (const target of link ? [base + 'match.html?game=0022600051&lang=' + lang + link, url(lang, link)] : [url(lang)]) {
          for (let visit = 0; visit < 2; visit++) {
            if (visit) await p.reload(); else await p.goto(target);
            await settle(p); await p.waitForSelector('#m-final');
            assert.ok((await header(p)).includes(label), target);
            assert.equal((await p.locator('.m-score').innerText()).replace(/\s+/g, ' '), '104 – 106');
            assert.equal(await p.locator('[data-act^="practice"], .practice-card, .practice-team, #practice-entry').count(), 0, target);
            assert.ok(!/猜對|沒猜中|You got it|Not this time|鎖定|Lock it in|揭曉|Reveal|再玩|Play again/.test(await p.locator('main').innerText()), target);
            assert.equal(await p.locator('.note').count(), 0, 'no announcement for a final already verified on arrival');
          }
        }
        if (lang === 'en') await p.screenshot({ path: path.join(ROOT, 'artifacts', 'final-header-en-390.png'), fullPage: true });
        assert.equal(asked.practice, 0); assert.deepEqual(errors, []); checks++;
        await ctx.close();
      }
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
