'use strict';
/*
 * Founder preview of the CANDIDATE art (?art=candidate). Verifies the candidate
 * files actually render in every slot, that the layout is the same as without art,
 * and that reading behaviour (one %, zoom, pinch, 200% reach) is unchanged.
 * Writes the screenshots used for the visual review.
 */
const path = require('node:path');

const states = (page) => page.evaluate(() => [...document.querySelectorAll('mo-art')].map((e) => ({ slot: e.dataset.slot, state: e.dataset.state, v: e.dataset.version })));
const loaded = (page) => page.evaluate(() => Promise.all([...document.querySelectorAll('mo-art img')].map((i) => i.decode().then(() => i.naturalWidth > 0, () => false))));
const geom = (page) => page.evaluate(() => ['.cv-name', '.teaser', '.lead', '.lead .cta', '.pct', '.g-card', '.story', '.pg-foot', '.mnav'].map((k) => [...document.querySelectorAll(k)].filter((e) => e.getClientRects().length).map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round).join(','); }).join('|')).join('#'));

module.exports = async function candidateSuite(browser, check, open, OUT) {
  const runs = [
    ['1440-fit', 1440, 900, 'zoom=fit', 'zh', 'light'],
    ['1440-100', 1440, 900, 'zoom=100', 'zh', 'light'],
    ['1440-100-en-dark', 1440, 900, 'zoom=100', 'en', 'dark'],
    ['1024-fit', 1024, 768, 'zoom=fit', 'en', 'light'],
    ['390', 390, 844, '', 'zh', 'light'],
    ['390-en-dark', 390, 844, '', 'en', 'dark'],
    ['360', 360, 740, '', 'zh', 'light']
  ];
  for (const [name, w, h, z, lang, theme] of runs) {
    const q = `lang=${lang}&theme=${theme}${z ? '&' + z : ''}`;
    const a = await open(browser, `index.html?${q}&art=candidate`, w, h);
    const ok = await loaded(a.page);
    const st = await states(a.page);
    const want = w >= 1024 ? 'cover-desktop-art' : 'cover-mobile-art';
    check(`candidate ${name}: every art slot shows chatgpt-art-v1 and loads`,
      st.length >= 3 && st.every((s) => s.state === 'art' && s.v === 'chatgpt-art-v1') && ok.every(Boolean) && st.some((s) => s.slot === want), JSON.stringify(st));
    check(`candidate ${name}: no sideways overflow, no errors`, (await a.page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && a.errors.length === 0, a.errors.join(' | '));
    const b = await open(browser, `index.html?${q}&art=fallback`, w, h);
    check(`candidate ${name}: layout identical to no-art`, (await geom(a.page)) === (await geom(b.page)));
    await b.ctx.close();
    await a.page.screenshot({ path: path.join(OUT, `candidate-${name}.png`) });
    if (w < 1024) {
      await a.page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await Promise.all([...document.images].map((i) => i.decode().catch(() => null))); });
      await a.page.waitForTimeout(300);
      await a.page.screenshot({ path: path.join(OUT, `candidate-${name}-full.png`), fullPage: true });
      const cdp = await a.ctx.newCDPSession(a.page);
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
      await a.page.waitForTimeout(200);
      await a.page.screenshot({ path: path.join(OUT, `candidate-${name}-pinch-2x.png`) });
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    } else if (z === 'zoom=100' && lang === 'zh') {
      for (let i = 0; i < 12 && !(await a.page.isDisabled('[data-zoom="in"]')); i++) await a.page.click('[data-zoom="in"]');
      const reach = await a.page.evaluate(() => { const r = document.getElementById('reader'); r.scrollLeft = r.scrollWidth; r.scrollTop = r.scrollHeight; const f = document.querySelector('.pg-foot b').getBoundingClientRect(), v = r.getBoundingClientRect(); return f.right <= v.right && f.bottom <= v.bottom && f.width > 0; });
      check(`candidate ${name}: 200% reaches the last page corner`, reach);
      await a.page.screenshot({ path: path.join(OUT, `candidate-${name}-200-bottom-right.png`) });
    }
    await a.ctx.close();
  }
  {
    const { ctx, page } = await open(browser, 'match.html?game=DEMO-0041&art=candidate', 1440, 900);
    const st = await states(page);
    check('candidate match: hero shows chatgpt-art-v1', st.length === 1 && st[0].state === 'art' && st[0].v === 'chatgpt-art-v1', JSON.stringify(st));
    await page.screenshot({ path: path.join(OUT, 'candidate-match-1440.png') });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, 'index.html?art=candidate&mode=production', 1440, 900);
    const n = await page.evaluate(() => ['cover-desktop-art', 'today-feature-art'].map((id) => window.MOSPORT_REGISTRY.resolveArt(window.MOSPORT_REG, id, { mode: 'production', preview: true }).version));
    check('candidate: production never shows CANDIDATE art', n.every((v) => v !== 'chatgpt-art-v1'), n.join(','));
    await ctx.close();
  }
};
