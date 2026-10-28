'use strict';
/*
 * Magazine Reader Zoom acceptance (Founder addendum, issue #2).
 * Desktop: Fit / − / + / 100% / bounds / resize / reachability / keyboard / nav unscaled.
 * Mobile: native flow, no zoom bar, browser pinch-zoom not disabled. Browser 200% zoom.
 */
const path = require('node:path');

const zoomOf = (page) => page.evaluate(() => { const r = document.getElementById('reader'); return { pct: +r.dataset.zoom, mode: r.dataset.zoomMode }; });
const rects = (page) => page.evaluate(() => {
  const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  return { reader: r('#reader'), spread: r('.spread'), cover: r('.pg-cover'), inner: r('.pg-inner'), topbar: r('.topbar'), bar: r('#reader-bar') };
});
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1.5);

module.exports = async function zoomSuite(browser, check, open, OUT) {
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
    const id = `zoom-${w}x${h}`;
    const { ctx, page, errors } = await open(browser, 'index.html', w, h);

    /* Fit (default) shows the whole spread inside the reader viewport */
    let z = await zoomOf(page);
    let R = await rects(page);
    check(`${id}: opens in Fit Page mode`, z.mode === 'fit' && z.pct >= 50 && z.pct <= 200, JSON.stringify(z));
    check(`${id}: Fit shows the whole spread (width and height)`,
      R.spread.l >= R.reader.l - 0.5 && R.spread.r <= R.reader.r + 0.5 && R.spread.t >= R.reader.t - 0.5 && R.spread.b <= R.reader.b + 0.5, JSON.stringify(R));
    check(`${id}: Fit button pressed`, (await page.getAttribute('[data-zoom="fit"]', 'aria-pressed')) === 'true');
    check(`${id}: no page-level horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    const fitPct = z.pct;
    const ratio0 = R.cover.w / R.inner.w;
    const top0 = R.topbar;
    await page.screenshot({ path: path.join(OUT, `zoom-${w}-fit.png`) });

    /* + and − step on a 10% grid; cover and TODAY scale together; nav is not scaled */
    await page.click('[data-zoom="in"]');
    z = await zoomOf(page);
    check(`${id}: + steps up to the next 10%`, z.mode === 'manual' && z.pct === Math.floor(fitPct / 10) * 10 + 10, `fit ${fitPct} → ${z.pct}`);
    R = await rects(page);
    check(`${id}: cover and TODAY scale as one spread`, near(R.cover.w / R.inner.w, ratio0, 0.01) && near(R.cover.t, R.inner.t));
    check(`${id}: site navigation is not scaled`, near(R.topbar.h, top0.h) && near(R.topbar.w, top0.w));
    await page.click('[data-zoom="out"]');
    z = await zoomOf(page);
    check(`${id}: − steps down by 10%`, z.pct === Math.floor(fitPct / 10) * 10, String(z.pct));

    /* 100% reset is the unscaled spread */
    await page.click('[data-zoom="reset"]');
    z = await zoomOf(page);
    R = await rects(page);
    check(`${id}: 100% reset`, z.pct === 100 && near(R.spread.w, 1360), `${z.pct}% width ${R.spread.w}`);
    if (w === 1440) await page.screenshot({ path: path.join(OUT, `zoom-${w}-100.png`) });

    /* Bounds 50%–200%, buttons disabled at the limits */
    for (let i = 0; i < 20 && !(await page.isDisabled('[data-zoom="in"]')); i++) await page.click('[data-zoom="in"]');
    z = await zoomOf(page);
    check(`${id}: upper bound 200%, + disabled`, z.pct === 200 && (await page.isDisabled('[data-zoom="in"]')));

    /* Reachability at 200%: every edge can be scrolled into view, nothing clipped */
    const reach = await page.evaluate(() => {
      const r = document.getElementById('reader'), s = document.querySelector('.spread');
      const vis = () => { const a = r.getBoundingClientRect(), b = s.getBoundingClientRect(); return { a, b }; };
      r.scrollLeft = 0; r.scrollTop = 0;
      let v = vis(); const topLeft = v.b.left >= v.a.left - 1 && v.b.top >= v.a.top - 1;
      r.scrollLeft = r.scrollWidth; r.scrollTop = r.scrollHeight;
      v = vis(); const bottomRight = v.b.right <= v.a.right - (r.offsetWidth - r.clientWidth) + 1 && v.b.bottom <= v.a.bottom - (r.offsetHeight - r.clientHeight) + 1;
      const foot = document.querySelector('.pg-foot b').getBoundingClientRect();
      const footVisible = foot.right <= v.a.right && foot.bottom <= v.a.bottom && foot.width > 0;
      return { topLeft, bottomRight, footVisible, sw: r.scrollWidth, sh: r.scrollHeight };
    });
    check(`${id}: 200% pans to every edge without clipping`, reach.topLeft && reach.bottomRight && reach.footVisible, JSON.stringify(reach));
    if (w === 1440) await page.screenshot({ path: path.join(OUT, `zoom-${w}-200-bottom-right.png`) });

    for (let i = 0; i < 20 && !(await page.isDisabled('[data-zoom="out"]')); i++) await page.click('[data-zoom="out"]');
    z = await zoomOf(page);
    check(`${id}: lower bound 50%, − disabled`, z.pct === 50 && (await page.isDisabled('[data-zoom="out"]')));

    /* Resize: Fit recomputes; a manual zoom is kept */
    await page.click('[data-zoom="fit"]');
    const before = (await zoomOf(page)).pct;
    await page.setViewportSize({ width: w, height: h + 260 });
    await page.waitForTimeout(250);
    const after = await zoomOf(page);
    check(`${id}: Fit recomputes on resize`, after.mode === 'fit' && after.pct > before, `${before} → ${after.pct}`);
    R = await rects(page);
    check(`${id}: after resize the spread still fits`, R.spread.b <= R.reader.b + 0.5 && R.spread.r <= R.reader.r + 0.5);
    await page.click('[data-zoom="reset"]');
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(250);
    check(`${id}: manual zoom survives resize`, (await zoomOf(page)).pct === 100);

    /* Keyboard: reader shortcuts, Tab + Enter on buttons, Ctrl/Cmd left to the browser */
    await page.click('[data-zoom="fit"]');
    await page.focus('#reader');
    await page.keyboard.press('+');
    const k1 = await zoomOf(page);
    await page.keyboard.press('0');
    const k2 = await zoomOf(page);
    await page.keyboard.press('f');
    const k3 = await zoomOf(page);
    check(`${id}: keyboard + / 0 / F`, k1.mode === 'manual' && k1.pct > fitPct && k2.pct === 100 && k3.mode === 'fit', JSON.stringify([k1, k2, k3]));
    await page.focus('[data-zoom="in"]');
    await page.keyboard.press('Enter');
    check(`${id}: buttons operate from the keyboard`, (await zoomOf(page)).mode === 'manual');
    const ctrlKept = await page.evaluate(() => {
      const e = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true });
      const before = document.getElementById('reader').dataset.zoom;
      document.getElementById('reader').dispatchEvent(e);
      return !e.defaultPrevented && document.getElementById('reader').dataset.zoom === before;
    });
    check(`${id}: Ctrl/Cmd zoom is not hijacked`, ctrlKept);
    const labels = await page.evaluate(() => [...document.querySelectorAll('#reader-bar button')].every((b) => (b.getAttribute('aria-label') || b.textContent).trim().length > 0));
    check(`${id}: controls have accessible names`, labels && (await page.getAttribute('#reader-bar', 'role')) === 'toolbar');

    /* Links still work inside a zoomed spread */
    await page.click('[data-zoom="reset"]');
    await page.click('.lead .cta');
    await page.waitForTimeout(300);
    check(`${id}: lead link works when zoomed`, /match\.html\?.*game=DEMO-0041/.test(page.url()));
    check(`${id}: no script errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  /* Language / theme representative coverage of the bar */
  for (const [lang, theme, re] of [['en', 'dark', /Fit page/], ['zh', 'dark', /整頁/]]) {
    const { ctx, page } = await open(browser, `index.html?lang=${lang}&theme=${theme}`, 1440, 900);
    const t = await page.locator('#reader-bar').innerText();
    check(`zoom bar ${lang}/${theme}: labelled in the edition language`, re.test(t));
    await page.click('[data-zoom="in"]');
    check(`zoom ${lang}/${theme}: theme kept while zooming`, (await page.evaluate(() => document.documentElement.dataset.theme)) === theme);
    await page.click('.topbar [data-act="theme"]');
    check(`zoom ${lang}/${theme}: zoom kept across theme re-render`, (await zoomOf(page)).mode === 'manual');
    await page.screenshot({ path: path.join(OUT, `zoom-1440-${lang}-${theme}-toggled.png`) });
    await ctx.close();
  }

  /* Mobile: native flow and native pinch zoom */
  for (const w of [390, 360]) {
    const { ctx, page } = await open(browser, 'index.html', w, 800);
    const m = await page.evaluate(() => ({
      bar: getComputedStyle(document.getElementById('reader-bar')).display,
      transform: getComputedStyle(document.querySelector('.spread')).transform,
      viewport: document.querySelector('meta[name="viewport"]').content,
      scrolls: document.documentElement.scrollHeight > innerHeight,
      overflow: document.documentElement.scrollWidth - innerWidth
    }));
    check(`mobile ${w}: no zoom bar, spread not transformed`, m.bar === 'none' && (m.transform === 'none' || m.transform === ''), JSON.stringify(m));
    check(`mobile ${w}: browser pinch-zoom allowed`, !/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(m.viewport), m.viewport);
    check(`mobile ${w}: vertical cover → TODAY flow, no sideways overflow`, m.scrolls && m.overflow <= 0);
    await page.click('.mnav-sports .sport:nth-child(2)');
    check(`mobile ${w}: sport switch still works`, /即將推出|Coming soon/.test(await page.locator('.note').innerText()));
    await ctx.close();
  }

  /* Browser zoom 200% on a 1440×900 screen = 720×450 CSS px */
  {
    const { ctx, page, errors } = await open(browser, 'index.html', 720, 450);
    const r = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, bar: getComputedStyle(document.getElementById('reader-bar')).display }));
    check('browser zoom 200%: readable reflow, no sideways overflow', r.overflow <= 0 && r.bar === 'none' && errors.length === 0, JSON.stringify(r));
    await page.click('.mnav-sec a[href^="schedule.html"]');
    await page.waitForTimeout(250);
    check('browser zoom 200%: navigation reachable', /schedule\.html/.test(page.url()));
    await ctx.close();
  }
};
