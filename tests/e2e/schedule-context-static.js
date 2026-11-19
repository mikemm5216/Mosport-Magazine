'use strict';
/* Static layout evidence only. Reuse the existing unit harness' real app/page
 * renderer, then export HTML for a separate CSS renderer. No browser, public
 * release, Web Component upgrade, or interactive acceptance is asserted. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { renderPage } = require('../unit/helpers.js');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/reports/2026-11-19-beta0-schedule/static');
const PL = require('../../site/js/data/pipeline.js');
const C = require('../unit/helpers.js').C;
const saved = require('../../site/data/schedules/0022600051.json');
const candidate = require('../fixtures/context-snapshot-v2.json');
const clone = value => JSON.parse(JSON.stringify(value));
const cases = [];
fs.mkdirSync(OUT, { recursive: true });
for (const [viewport, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  for (const page of ['schedule', 'match']) {
    for (const state of ['MISSING', 'HOME', 'NEUTRAL']) {
      const raw = clone(state === 'MISSING' ? saved : candidate);
      let projection;
      if (state !== 'MISSING') {
        raw.contextSnapshot.homeCourt.evidence.value = state;
        assert.deepEqual(C.validateContextSnapshot(raw.contextSnapshot, raw.game, '2026-11-19T08:10:00Z'), []);
        const production = PL.run(clone(raw), { mode: 'production', now: '2026-11-19T08:10:00Z' });
        assert.equal(production.model.schedule[0].pregameSnapshot, null);
        projection = PL.contextSnapshotView(raw.contextSnapshot);
      }
      const query = '?schedule=' + raw.game.gameId + '&game=' + raw.game.gameId + '&mode=production&lang=zh';
      const rendered = renderPage(raw, page, query, projection);
      assert.ok(rendered.includes(raw.game.gameId));
      assert.ok(rendered.includes(state === 'MISSING' ? '這場的賽前判讀還沒出來。' : state));
      if (state !== 'MISSING') assert.ok(!rendered.includes('0022600051') && !rendered.includes('這場的賽前判讀還沒出來。'));
      const label = '靜態 HTML/CSS 排版檢視 · ' + width + 'px · 非瀏覽器截圖／非互動驗收 · ' +
        (state === 'MISSING' ? '已保存賽程 0022600051' : '隔離 fixture 0022600999 · ' + state + ' · 非真實 snapshot／非公開資格驗收');
      let html = fs.readFileSync(path.join(ROOT, 'site', page + '.html'), 'utf8')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/g, '')
        .replace('<div id="app"></div>', '<aside class="qa-static-label">' + label + '</aside><div id="app">' + rendered + '</div><div id="qa-render-end"></div>');
      const name = page + '-' + state.toLowerCase() + '-' + viewport;
      fs.writeFileSync(path.join(OUT, name + '.html'), html);
      cases.push({ name, page, state, viewport, width, viewportHeight: height, nbaGameId: raw.game.gameId,
        input: state === 'MISSING' ? 'SAVED_SCHEDULE' : 'ISOLATED_RENDERER_FIXTURE',
        htmlSha256: crypto.createHash('sha256').update(html).digest('hex') });
    }
  }
}
const sourceFiles = ['site/schedule.html', 'site/match.html', 'site/js/app.js', 'site/js/pages/schedule.js', 'site/js/pages/match.js', 'site/js/data/pipeline.js', 'site/js/data/providers.js', 'site/js/contracts/contracts.js', 'site/js/i18n.js', 'site/css/fonts.css', 'site/css/tokens.css', 'site/css/components.css', 'site/css/pages.css', 'site/data/schedules/0022600051.json', 'tests/fixtures/context-snapshot-v2.json', 'tests/unit/schedule-context.test.js'].map(name => {
  const bytes = fs.readFileSync(path.join(ROOT, name));
  return { path: name, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), gitBlobSha: crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex') };
});
fs.writeFileSync(path.join(OUT, 'html-evidence.json'), JSON.stringify({
  sourceHead: process.env.VISUAL_SOURCE_HEAD || null, pageClock: '2026-11-19T08:10:00Z',
  method: 'EXISTING_APP_PAGE_RENDERER_VIA_EXISTING_VM_TEST_HELPER',
  publicQualification: 'NOT_ASSERTED', webComponents: 'NOT_EXECUTED', sourceFiles, cases
}, null, 2) + '\n');
console.log('Exported ' + cases.length + ' static layout inputs through the existing app/page test helper; no browser acceptance asserted.');
