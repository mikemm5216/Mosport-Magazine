'use strict';
/* Original app/page + registry component output, serialized for STATIC evidence.
 * The production pipeline and source images are not changed for this preview. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { renderPage, clone } = require('../unit/helpers.js');
const serializeComponents = require('./static-components.js');
const saved = require('../../site/data/schedules/0022600051.json');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/reports/2026-11-19-home-spread/static');
const clock = '2026-11-19T08:10:00Z';
const sourceCss = fs.readFileSync(path.join(ROOT, 'site/css/home.css'), 'utf8');
const naturalWidth = Number(fs.readFileSync(path.join(ROOT, 'site/js/reader.js'), 'utf8').match(/var NATURAL_WIDTH = (\d+)/)[1]);
const spreadRule = sourceCss.match(/\.spread\s*\{[^}]*grid-template-columns:[^}]+\}/)[0];
const columns = spreadRule.match(/grid-template-columns:\s*minmax\(0,\s*([.\d]+)fr\)\s*minmax\(0,\s*([.\d]+)fr\)/);
assert.ok(columns, 'Use the source spread ratio, never invent a comparison layout');
const coverWidth = naturalWidth * Number(columns[1]) / (Number(columns[1]) + Number(columns[2]));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [];
fs.mkdirSync(OUT, { recursive: true });
for (const config of [
  { name: 'home-saved-desktop', width: 1600, viewportHeight: 1200, mode: 'prototype', state: 'MISSING' },
  { name: 'home-saved-mobile', width: 390, viewportHeight: 844, mode: 'prototype', state: 'MISSING' },
  { name: 'home-production-desktop', width: 1600, viewportHeight: 1200, mode: 'production', state: 'MISSING' },
  { name: 'home-load-failed-mobile', width: 390, viewportHeight: 844, mode: 'production', state: 'LOAD_FAILED' }
]) {
  const raw = config.state === 'LOAD_FAILED' ? { __loadError: 'STATIC_QA_LOAD_FAILURE' } : clone(saved);
  const query = '?schedule=0022600051&mode=' + config.mode + '&lang=zh';
  const rendered = renderPage(raw, 'home', query, null, { mode: config.mode, now: clock, realTeams: true });
  assert.ok(rendered.includes('class="spread"') && rendered.includes('pg-cover') && rendered.includes('id="today"'));
  assert.ok(rendered.indexOf('pg-cover') < rendered.indexOf('id="today"'));
  assert.ok(!rendered.includes('<table'));
  if (config.state === 'MISSING') assert.ok(rendered.includes('0022600051') && rendered.includes('賽前紀錄尚未提供公開顯示'));
  const serialized = serializeComponents(rendered, config);
  const label = '靜態 HTML/CSS 構圖檢視 · 非瀏覽器截圖 · ' + config.width + 'px · ' +
    (config.state === 'LOAD_FAILED' ? '隔離載入失敗測試' : '已保存賽程 0022600051') + ' · ' +
    (config.mode === 'prototype' ? '版面預覽：既有 PLACEHOLDER 美術' : 'production：原素材資格與背景替代樣式');
  const html = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace('<div id="app"></div>', '<aside class="qa-static-label">' + label + '</aside><div id="app">' + serialized.html + '</div><div id="qa-render-end"></div>');
  fs.writeFileSync(path.join(OUT, config.name + '.html'), html);
  // Explicit grid placement and stretch repair WeasyPrint's auto-placement;
  // track widths still come from the unmodified source spread declaration.
  const sharedStaticCss = '.lead{width:100%}.lead-art{grid-column:1;grid-row:1}.lead-foot{grid-column:1/-1}.cv-t2{background:none;color:#FF7A1A}';
  const staticCss = sharedStaticCss + (config.width >= 1024
    ? 'body.page-home{height:auto;overflow:visible}.page-home #app{height:auto;display:block}#reader{display:block;overflow:visible}#sizer{width:' + naturalWidth + 'px;height:auto}#sizer .spread{position:relative;transform:none;grid-template-columns:' + coverWidth + 'px ' + (naturalWidth-coverWidth) + 'px}.pg-cover{grid-column:1;grid-row:1}.pg-inner{grid-column:2;grid-row:1}.lead-read{grid-column:2;grid-row:1}.lead-foot{grid-row:2}'
    : '.pg-inner{width:100%}.lead-read{grid-column:1;grid-row:2}.lead-foot{grid-row:3}.pg-inner>.state-msg,.pg-inner>.today-empty{width:100%}');
  cases.push({ ...config, page: 'index.html', viewport: config.width >= 1024 ? 'desktop' : 'mobile',
    input: config.state === 'LOAD_FAILED' ? 'ISOLATED_LOAD_FAILURE' : 'SAVED_SCHEDULE',
    nbaGameId: config.state === 'LOAD_FAILED' ? null : '0022600051',
    containerWidth: config.width >= 1024 ? coverWidth : config.width, staticCss,
    staticGeometry: config.width >= 1024 ? 'NATIVE_READER_WIDTH_UNSCALED_FULL_CONTENT; EXPLICIT_SOURCE_GRID_PLACEMENT; not browser zoom/scroll acceptance' : 'SOURCE_MOBILE_FLOW_WITH_EXPLICIT_GRID_PLACEMENT',
    rendererDeviations: ['WeasyPrint grid placement/stretch is made explicit using source column ratios and DOM order', 'Unsupported clipped orange gradient text uses its source first color #FF7A1A', 'Shadows and unsupported decorations are not browser-verified'],
    expectedText: config.state === 'MISSING' ? ['MOSPORT', '賽前紀錄尚未提供公開顯示'] : ['MOSPORT'],
    htmlSha256: digest(html), componentSlots: serialized.slots });
}
const sourceFiles = ['site/index.html','site/js/app.js','site/js/pages/home.js','site/js/reader.js','site/js/i18n.js',
  'site/js/data/providers.js','site/js/data/pipeline.js','site/js/contracts/contracts.js','site/js/components.js',
  'site/js/teams.nba.js','site/js/assets/registry.js','site/data/asset-registry.json','site/data/schedules/0022600051.json',
  'site/css/fonts.css','site/css/tokens.css','site/css/components.css','site/css/home.css','tests/unit/helpers.js',
  'tests/e2e/static-components.js','tests/e2e/home-spread-static.js','tests/e2e/render-schedule-static.py'].map(name => {
    const bytes = fs.readFileSync(path.join(ROOT, name));
    return { path: name, sha256: digest(bytes), gitBlobSha: crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex') };
  });
fs.writeFileSync(path.join(OUT, 'html-evidence.json'), JSON.stringify({
  sourceHead: null, baseHead: '7cee0ed57b97ca6f9fb20def53de22c680095c0e', sourceState: 'WORKTREE_BOUND_BY_SOURCE_FILE_HASHES',
  pageClock: clock, method: 'EXISTING_APP_PAGE_RENDERER_AND_COMPONENT_METHODS_VIA_TEST_SHIM',
  publicQualification: 'NOT_ASSERTED', webComponents: 'ORIGINAL_RENDER_METHODS_ONLY; NO_BROWSER_LIFECYCLE',
  cssFiles: ['fonts.css','tokens.css','components.css','home.css'], sourceFiles, cases
}, null, 2) + '\n');
console.log('Exported four source-bound home spread inputs; no browser acceptance asserted.');
