'use strict';
/* B-P3-05 internal editor prototype: main operations in a real browser (DEMO only). */
const path = require('node:path');

const ED = '../site/internal/editor.html'.replace('../site/', '');
const stateOf = (page, id) => page.evaluate((i) => {
  const b = [...document.querySelectorAll('.ed-row')].find((x) => x.dataset.id === i);
  return b ? b.closest('.ed-group').querySelector('.ed-state').textContent : null;
}, id);

module.exports = async function editorSuite(browser, check, open, OUT) {
  for (const [w, h] of [[1440, 900], [390, 800]]) {
    const { ctx, page, errors } = await open(browser, 'internal/editor.html', w, h);
    const banner = await page.locator('.ed-banner').innerText();
    check(`editor ${w}: loads with DEMO banner, no errors, no sideways overflow`, /DEMO 演練/.test(banner) && errors.length === 0 && (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, errors.join('|'));
    check(`editor ${w}: seeded cases in their states`, (await stateOf(page, 'CASE-M01')) === '已發布' && (await stateOf(page, 'CASE-M03')) === '待人工審核' && (await stateOf(page, 'CASE-M07')) === '暫停：待補證據');
    if (w === 390) await page.screenshot({ path: path.join(OUT, 'editor-390.png'), fullPage: true });
    await ctx.close();
  }

  const { ctx, page, errors } = await open(browser, 'internal/editor.html', 1440, 900);
  const click = async (sel) => { await page.click(sel); await page.waitForTimeout(80); };
  const flash = () => page.locator('.ed-flash').innerText().catch(() => '');

  /* Human approval → publish → receipt (M-03). */
  await click('[data-act="select"][data-id="CASE-M03"]');
  check('editor M-03: awaiting item shows approve/reject/hold and blockers', (await page.locator('[data-act="approve"]').count()) === 1 && /NOT_APPROVED/.test(await page.locator('.ed-detail').innerText()));
  await page.screenshot({ path: path.join(OUT, 'editor-1440-awaiting.png'), fullPage: true });
  await click('[data-act="approve"]');
  check('editor M-03: DEMO approval recorded; item APPROVED', /DEMO 核准已記錄/.test(await flash()) && (await stateOf(page, 'CASE-M03')) === '已核准待發布');
  await click('[data-act="publish"]');
  check('editor M-03: published with a DEMO receipt', /已發布/.test(await flash()) && (await stateOf(page, 'CASE-M03')) === '已發布' && /PUB-CASE-M03-1/.test(await page.locator('.ed-detail').innerText()));

  /* A failed check cannot be approved past (M-04). */
  await click('[data-act="select"][data-id="CASE-M04"]');
  const m04 = await page.locator('.ed-detail').innerText();
  check('editor M-04: fake exclusive shows EXCLUSIVE_NOT_PROVEN and offers no approve button', /EXCLUSIVE_NOT_PROVEN/.test(m04) && (await page.locator('[data-act="approve"]').count()) === 0);

  /* Revise after approval needs a new decision (M-05). */
  await click('[data-act="select"][data-id="CASE-M05"]');
  await click('[data-act="approve"]');
  await page.locator('.ed-edit summary').click();
  await page.fill('[data-edit="zh.headline"]', '太陽守住主場（修訂）');
  await click('[data-act="revise"]');
  check('editor M-05: editing an approved item makes revision 2 in DRAFT; the old approval does not carry over', (await stateOf(page, 'CASE-M05')) === '草稿／候選' && /第 2 版/.test(await page.locator('.ed-detail .ed-head').innerText()) && /NO_APPROVAL_RECEIPT/.test(await page.locator('.ed-detail').innerText()));
  await click('[data-act="qa"]');
  check('editor M-05: after QA the new revision waits for a human again', (await stateOf(page, 'CASE-M05')) === '待人工審核');

  /* Source retracted → published item pulled → withdraw with receipt (M-06). */
  await click('[data-act="tab"][data-tab="sources"]');
  await click('[data-act="src"][data-src="S-OFF-RETRACT"][data-state="RETRACTED"]');
  await click('[data-act="tab"][data-tab="item"]');
  check('editor M-06: retracted source moves the published item to correction pending', (await stateOf(page, 'CASE-M06')) === '待更正');
  await click('[data-act="select"][data-id="CASE-M06"]');
  await click('[data-act="withdraw"]');
  check('editor M-06: withdrawn with a chained WITHDRAW receipt', (await stateOf(page, 'CASE-M06')) === '已撤稿' && /WITHDRAW/.test(await page.locator('.ed-detail').innerText()));

  /* Layout plan + public preview. */
  await click('[data-act="tab"][data-tab="layout"]');
  const before = await page.locator('.card').innerText();
  check('editor layout: preview renders only published items (M-01, M-03 now; M-06 withdrawn, M-05 awaiting)', /會刊出 2 則/.test(before), before.match(/會刊出 \d+ 則/));
  await page.selectOption('[data-lay-add="stories"]', 'CASE-M02');
  await click('[data-act="lay-save"]');
  check('editor layout: a new layout revision is saved; the rumour stays out of the preview', /版面已存為新版本/.test(await flash()) && /第 2 版/.test(await page.locator('.card').innerText()) && /會刊出 2 則/.test(await page.locator('.card').innerText()));
  await page.selectOption('[data-lay-lead]', 'CASE-M07');
  await click('[data-act="lay-save"]');
  check('editor layout: a NEWS item in the lead slot is refused (SLOT_TYPE_MISMATCH)', /SLOT_TYPE_MISMATCH/.test(await flash()), await flash());
  await click('[data-act="lay-reset"]');
  await page.screenshot({ path: path.join(OUT, 'editor-1440-layout.png'), fullPage: true });

  /* Log and receipts. */
  await click('[data-act="tab"][data-tab="log"]');
  const log = await page.locator('.ed-main').innerText();
  check('editor log: receipts for PUBLISH and WITHDRAW, each marked DEMO; events are hash-linked', /PUBLISH/.test(log) && /WITHDRAW/.test(log) && (await page.locator('.ed-main .demo-badge').count()) >= 3 && /WF_PUBLICATION/.test(log));
  await page.screenshot({ path: path.join(OUT, 'editor-1440-log.png'), fullPage: true });

  /* Reload: state replays from the saved log. */
  await page.reload(); await page.waitForTimeout(300);
  check('editor reload: the saved log replays to the same states', (await stateOf(page, 'CASE-M03')) === '已發布' && (await stateOf(page, 'CASE-M06')) === '已撤稿' && (await stateOf(page, 'CASE-M05')) === '待人工審核');
  await click('[data-act="select"][data-id="CASE-M03"]');
  await page.screenshot({ path: path.join(OUT, 'editor-1440-published.png'), fullPage: true });
  check('editor: no script errors across the whole flow', errors.length === 0, errors.join(' | '));
  await ctx.close();
};
