'use strict';
/*
 * B-P2-03 browser checks: every page renders from the one pipeline, keeps usable
 * states for bad data, never shows unapproved or internal content, never runs
 * markup from content, and keeps the Codex zoom/URL fix.
 */
const path = require('node:path');

const PAGES = ['index.html', 'schedule.html', 'review.html', 'match.html'];
const dom = (page) => page.evaluate(() => document.documentElement.outerHTML);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const bodyText = (page) => page.evaluate(() => { const b = document.getElementById('reader-bar'); const t = document.body.innerText; return b ? t.replace(b.innerText, '') : t; });

module.exports = async function dataSuite(browser, check, open, OUT) {
  /* 1. Bad-data states on every page, desktop and mobile: usable, no errors, no invention. */
  const states = [
    ['invalid', /未通過格式檢查|failed its data checks/],
    ['dupid', /未通過格式檢查|failed its data checks/],
    ['live', /未通過格式檢查|failed its data checks/],
    ['loadfail', /載入失敗|could not be loaded/],
    ['nosuchfixture', /載入失敗|could not be loaded/]
  ];
  for (const [fx, msg] of states) {
    for (const p of PAGES) {
      for (const [w, h] of [[1440, 900], [390, 800]]) {
        const { ctx, page, errors } = await open(browser, `${p}?fixture=${fx}&lang=${w > 1000 ? 'zh' : 'en'}`, w, h);
        const t = await bodyText(page);
        const navVisible = await page.evaluate(() => [...document.querySelectorAll('a[href^="schedule.html"], a[href^="index.html"]')].some((a) => a.getClientRects().length && getComputedStyle(a).visibility !== 'hidden'));
        check(`data ${fx} ${p} ${w}: state message, visible navigation, no errors`, msg.test(t) && navVisible && errors.length === 0, errors.join(' | ') || t.slice(0, 120));
        check(`data ${fx} ${p} ${w}: no number, no story, no overflow`, !/\d+\s*%/.test(t) && !/MUST NOT RENDER|不應出現/.test(await dom(page)) && (await overflow(page)) <= 0);
        if (p === 'index.html' && w === 1440 && fx === 'invalid') await page.screenshot({ path: path.join(OUT, 'data-invalid-1440.png') });
        if (p === 'index.html' && w === 390 && fx === 'loadfail') await page.screenshot({ path: path.join(OUT, 'data-loadfail-390.png') });
        await ctx.close();
      }
    }
  }

  /* 2. Expired issue: no read anywhere; Schedule still lists every game. */
  {
    const { ctx, page } = await open(browser, 'index.html?fixture=stale', 1440, 900);
    const t = await bodyText(page);
    check('data stale home: expired notice + schedule link, no %', /已過期/.test(t) && !/\d+\s*%/.test(t) && (await page.locator('.state-msg a[href*="schedule.html"]').count()) === 1);
    await ctx.close();
    const s = await open(browser, 'schedule.html?fixture=stale&lang=en', 1440, 900);
    const rows = await s.page.locator('table.sch tbody tr').count();
    const st = await bodyText(s.page);
    check('data stale schedule: all six games, no read links, expired notice', rows === 6 && (await s.page.locator('a[href*="match.html"]').count()) === 0 && /expired/i.test(st), `${rows} rows`);
    await s.page.screenshot({ path: path.join(OUT, 'data-stale-schedule-1440.png'), fullPage: true });
    await s.ctx.close();
    const m = await open(browser, 'match.html?fixture=stale&game=DEMO-0041', 1440, 900);
    check('data stale match: no number for a read in an expired issue', !/\d+\s*%/.test(await bodyText(m.page)));
    await m.ctx.close();
  }

  /* 3. Bad times: only the bad records drop; the bad game is counted, not guessed. */
  {
    const { ctx, page } = await open(browser, 'schedule.html?fixture=badtime', 1440, 900);
    check('data badtime schedule: 5 valid games + "1 more game failed" notice', (await page.locator('table.sch tbody tr').count()) === 5 && /另有 1 場/.test(await bodyText(page)));
    await ctx.close();
    const h = await open(browser, 'index.html?fixture=badtime', 1440, 900);
    const t = await bodyText(h.page);
    check('data badtime home: malformed-time story and streak are absent; others stay', !/湖人主場戰關鍵戰/.test(t) && !/塞爾提克三連勝/.test(t) && /勇士新陣容化學反應/.test(t));
    await h.ctx.close();
  }

  /* 4. Gate on the DOM: unapproved, stale-approved, retracted, mis-slotted items never appear. */
  for (const fx of ['bypass', 'bypass2', 'staleapproval', 'retracted', 'slotmismatch']) {
    for (const p of ['index.html', 'review.html']) {
      const { ctx, page, errors } = await open(browser, `${p}?fixture=${fx}`, 1440, 900);
      const html = await dom(page);
      check(`data ${fx} ${p}: nothing unapproved or stale in the DOM`, !/MUST NOT RENDER|不應出現|核准後被改寫|BYP-/.test(html) && errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }
  {
    const { ctx, page } = await open(browser, 'index.html?fixture=retracted', 1440, 900);
    check('data retracted: the story on a retracted source is gone, the other cover story stays', !/湖人主場戰關鍵戰/.test(await bodyText(page)) && /勇士新陣容化學反應/.test(await bodyText(page)));
    await ctx.close();
  }

  /* 5. Internal read: its number is not in the DOM on any page. */
  for (const p of ['index.html', 'schedule.html', 'match.html?game=DEMO-0046']) {
    const { ctx, page } = await open(browser, p + (p.includes('?') ? '&' : '?') + 'lang=en', 1440, 900);
    const html = await dom(page);
    check(`data internal read on ${p}: 55% and its snapshot never reach the DOM`, !/55\s*%/.test(await bodyText(page)) && !html.includes('aa31f002'));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, 'match.html?game=DEMO-0046&lang=en', 1440, 900);
    check('data match internal: public wording, no internal reason code', /not cleared for public release/.test(await bodyText(page)) && !/DISTRIBUTION|INTERNAL/.test(await bodyText(page)));
    await ctx.close();
  }

  /* 6. Unknown game: a not-found state, never another game's read. */
  for (const id of ['NOPE-1', '%3Cscript%3E', 'DEMO-0045']) {
    const { ctx, page, errors } = await open(browser, `match.html?game=${id}`, 390, 800);
    const t = await bodyText(page);
    const shouldBeMissing = id !== 'DEMO-0045';
    check(`data match ?game=${decodeURIComponent(id)}: ${shouldBeMissing ? 'not-found state' : 'postponed, no read'}`,
      (shouldBeMissing ? /找不到這場比賽/.test(t) : /延期/.test(t)) && !/湖人主場較有利/.test(t) && !/\d+\s*%/.test(t) && errors.length === 0, t.slice(0, 120));
    await ctx.close();
  }

  /* 7. Script injection: content markup renders as text; unsafe records are dropped. */
  for (const p of ['index.html', 'review.html', 'schedule.html', 'match.html?game=DEMO-0043']) {
    for (const w of [1440, 390]) {
      const { ctx, page, errors } = await open(browser, p + (p.includes('?') ? '&' : '?') + 'fixture=xss', w, 900);
      await page.mouse.move(200, 300); await page.mouse.move(600, 500);
      await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => ({ x: window.__xss, imgX: [...document.images].filter((i) => /\/x$/.test(i.src)).length, scripts: [...document.querySelectorAll('#app script, #app svg[onload], #app [onerror], #app [onclick], #app [onmouseover]')].length, js: [...document.querySelectorAll('a[href]')].filter((a) => /^\s*javascript:/i.test(a.getAttribute('href'))).length }));
      check(`data xss ${p} ${w}: no script ran, no injected element or handler, no javascript: link`, r.x === undefined && r.imgX === 0 && r.scripts === 0 && r.js === 0 && errors.length === 0, JSON.stringify(r) + errors.join('|'));
      if (p === 'index.html' && w === 1440) {
        check('data xss home: the markup is visible as literal text', /<script>window.__xss=2<\/script>/.test(await bodyText(page)));
        await page.screenshot({ path: path.join(OUT, 'data-xss-1440.png') });
      }
      await ctx.close();
    }
  }

  /* 8. Long titles hold the layout at every width and in both languages. */
  for (const [w, h] of [[1440, 900], [1280, 800], [390, 800], [360, 740]]) {
    for (const lang of ['zh', 'en']) {
      const { ctx, page, errors } = await open(browser, `index.html?fixture=longtitle&lang=${lang}&zoom=width`, w, h);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('.teaser-h, .story h3, .g-read, .lead-verdict')].filter((e) => e.getClientRects().length && e.scrollWidth > e.clientWidth + 2).length);
      check(`data longtitle ${w} ${lang}: no sideways overflow or clipped headline`, (await overflow(page)) <= 0 && clipped === 0 && errors.length === 0, `clipped=${clipped}`);
      if (lang === 'zh' && (w === 1440 || w === 390)) await page.screenshot({ path: path.join(OUT, `data-longtitle-${w}.png`), fullPage: w < 1024 });
      await ctx.close();
    }
  }

  /* 9. Production refuses DEMO on every page; the public reader never loads internal code. */
  for (const p of PAGES) {
    const { ctx, page } = await open(browser, `${p}?mode=production`, 1440, 900);
    const internal = await page.evaluate(() => [...document.scripts].filter((s) => /internal\//.test(s.src)).length + (window.MOSPORT_STORE || window.MOSPORT_WORKFLOW ? 1 : 0));
    check(`data production ${p}: DEMO refused, no internal code loaded`, /未取得發布資格/.test(await bodyText(page)) && internal === 0);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, 'index.html', 1440, 900);
    check('data reader: no diagnostics object on the public page', await page.evaluate(() => typeof window.MOSPORT_DIAGNOSTICS === 'undefined'));
    await ctx.close();
  }

  /* 10. ?issue= is confined to data/issues/<name>.json; on file:// it fails to load (state shown). */
  for (const q of ['issue=demo', 'issue=..%2F..%2Fevil', 'issue=https%3A%2F%2Fevil.example%2Fx']) {
    const { ctx, page, errors } = await open(browser, `index.html?${q}`, 1440, 900, { allow404: true });
    check(`data provider ${decodeURIComponent(q)}: load-failed state, nothing rendered`, /載入失敗/.test(await bodyText(page)) && errors.length === 0, errors.join('|'));
    await ctx.close();
  }

  /* 11. Codex P2 regression: toggling theme/language keeps the zoom the reader chose. */
  {
    const { ctx, page } = await open(browser, 'index.html?lang=en&theme=dark&zoom=width', 1440, 900);
    await page.click('[data-zoom="in"]');
    await page.click('[data-zoom="in"]');
    const chosen = await page.evaluate(() => window.MOSPORT_READER.token());
    await page.click('[data-act="theme"]');
    await page.click('[data-act="lang"][data-lang="zh"]');
    const url = new URL(page.url());
    check('data zoom/url: theme + language toggles keep the chosen zoom in the URL', url.searchParams.get('zoom') === chosen && url.searchParams.get('theme') === 'light' && url.searchParams.get('lang') === 'zh', `${chosen} vs ${url.search}`);
    await page.reload();
    await page.waitForTimeout(300);
    check('data zoom/url: reload restores the chosen zoom, not the original zoom=width', (await page.evaluate(() => window.MOSPORT_READER.token())) === chosen);
    await ctx.close();
  }

  /* 12. DEMO is labelled on every page that shows DEMO content. */
  for (const p of ['index.html', 'schedule.html', 'review.html', 'match.html?game=DEMO-0041']) {
    for (const w of [1440, 390]) {
      const { ctx, page } = await open(browser, p, w, 900);
      const visible = await page.evaluate(() => [...document.querySelectorAll('.demo-badge')].some((b) => b.getClientRects().length));
      check(`data DEMO mark on ${p} ${w}`, visible);
      await ctx.close();
    }
  }
};
