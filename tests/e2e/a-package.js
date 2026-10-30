'use strict';
/* B-P2-01a browser check: the internal inspector reads A's authentic CLE at ATL package,
   shows its typed state and never a number; the public reader pages never load the adapter. */
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const REAL = path.join(ROOT, 'tests/fixtures/a-world/real-401909893-20261029.json');
const OUT = path.join(ROOT, 'artifacts/a-package');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  let checks = 0;
  for (const f of fs.readdirSync(SITE).filter((n) => n.endsWith('.html'))) {
    assert.ok(!/world-a1\.js|internal\//.test(fs.readFileSync(path.join(SITE, f), 'utf8')), f + ' loads the A adapter or internal code'); checks++;
  }
  const browser = await chromium.launch();
  const tampered = path.join(OUT, 'tampered.json');
  const t = JSON.parse(fs.readFileSync(REAL, 'utf8')); t.world.homeWinProbability = 0.61;
  fs.writeFileSync(tampered, JSON.stringify(t));
  for (const [name, w, h, now, state] of [
    ['active-1440', 1440, 900, '2026-10-29T08:50:00.000Z', 'ACTIVE'],
    ['stale-1440', 1440, 900, '2026-10-30T02:48:00.000Z', 'STALE'],
    ['stale-390', 390, 844, '2026-10-30T02:48:00.000Z', 'STALE']
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.join(SITE, 'internal/a-package.html') + '?now=' + now);
    await page.setInputFiles('#ap-file', REAL);
    await page.waitForSelector('#ap-out[data-status="OK"]');
    assert.equal(await page.getAttribute('#ap-out', 'data-read-state'), state); checks++;
    const body = await page.innerText('#ap-out');
    assert.ok(/CLE @ ATL · espn:401909893/.test(body)); checks++;
    assert.ok(/NOT_ISSUED · FEATURE_PIPELINE_NOT_CONNECTED/.test(body)); checks++;
    assert.ok(/NOT RENDERED · .*WORLD_NOT_ISSUED.*WORLD_INTERNAL.*SCHEDULE_NOT_PUBLIC_ELIGIBLE.*RIGHTS_UNVERIFIED/.test(body)); checks++;
    assert.equal(/READ_STALE/.test(body), state === 'STALE'); checks++;
    assert.ok(/6bae65fd8326e7e2cddb5dd75c45721d19218bd8aaf259172a1e025bc1ed5c38/.test(body), 'snapshot hash shown'); checks++;
    assert.deepEqual(body.match(/\d+(\.\d+)?\s*%/g), null, 'no percentage'); checks++;
    assert.ok(!/\d\.\d/.test(body.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '').replace(/[0-9a-f]{64}/g, '')), 'no probability-like number'); checks++;
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow'); checks++;
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    await page.setInputFiles('#ap-file', tampered);
    await page.waitForSelector('#ap-refused');
    assert.ok(/REFUSED · WRONG_VALUE @ package\.world\.homeWinProbability/.test(await page.innerText('#ap-out'))); checks++;
    assert.deepEqual(errors, []); checks++;
    await ctx.close();
  }
  await browser.close();
  console.log(checks + ' A-package browser checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
