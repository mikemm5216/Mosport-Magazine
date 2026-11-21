'use strict';
/* Original app/page + registry component output, serialized for STATIC evidence.
 * The production pipeline and source images are not changed for this preview. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const GENERATOR_ROOT = path.resolve(__dirname, '../..');
const ROOT = process.env.MOSPORT_EVIDENCE_SOURCE_ROOT || GENERATOR_ROOT;
const BEFORE = process.env.MOSPORT_EVIDENCE_BEFORE === '1';
const { renderPage, clone, loadFixtures } = require(path.join(ROOT, 'tests/unit/helpers.js'));
const serializeComponents = require(path.join(ROOT, 'tests/e2e/static-components.js'));
const saved = require(path.join(ROOT, 'site/data/schedules/0022600051.json'));
const fixtures = loadFixtures();
const OUT = process.env.MOSPORT_EVIDENCE_OUTPUT || path.join(GENERATOR_ROOT, 'docs/reports/2026-11-19-home-copy/static');
const clock = process.env.MOSPORT_EVIDENCE_CLOCK || new Date(Date.parse(saved.editorial ? saved.editorial.observedAt : saved.source.observedAt) + 60000).toISOString();
const sourceCss = fs.readFileSync(path.join(ROOT, 'site/css/home.css'), 'utf8');
const naturalWidth = Number(fs.readFileSync(path.join(ROOT, 'site/js/reader.js'), 'utf8').match(/var NATURAL_WIDTH = (\d+)/)[1]);
const spreadRule = sourceCss.match(/\.spread\s*\{[^}]*grid-template-columns:[^}]+\}/)[0];
const columns = spreadRule.match(/grid-template-columns:\s*minmax\(0,\s*([.\d]+)fr\)\s*minmax\(0,\s*([.\d]+)fr\)/);
assert.ok(columns, 'Use the source spread ratio, never invent a comparison layout');
const coverWidth = naturalWidth * Number(columns[1]) / (Number(columns[1]) + Number(columns[2]));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [];
fs.mkdirSync(OUT, { recursive: true });
const configs = [
  { name: 'home-saved-desktop', width: 1440, viewportHeight: 1000, mode: 'prototype', state: 'MISSING', lang: 'zh' },
  { name: 'home-saved-mobile', width: 390, viewportHeight: 844, mode: 'prototype', state: 'MISSING', lang: 'zh' },
  { name: 'home-demo-desktop', width: 1440, viewportHeight: 1100, mode: 'prototype', state: 'DEMO', lang: 'zh' },
  { name: 'home-production-desktop', width: 1440, viewportHeight: 1000, mode: 'production', state: 'MISSING', lang: 'zh' },
  { name: 'home-demo-mobile', width: 390, viewportHeight: 844, mode: 'prototype', state: 'DEMO', lang: 'zh' },
  { name: 'home-missing-mobile-en', width: 360, viewportHeight: 780, mode: 'prototype', state: 'MISSING', lang: 'en' },
  { name: 'home-load-failed-mobile', width: 390, viewportHeight: 844, mode: 'production', state: 'LOAD_FAILED', lang: 'zh' },
  { name: 'home-stale-mobile', width: 390, viewportHeight: 844, mode: 'production', state: 'STALE', lang: 'zh' }
];
const requested = process.env.MOSPORT_EVIDENCE_CASES ? process.env.MOSPORT_EVIDENCE_CASES.split(',') : null;
for (const config of (BEFORE ? configs.slice(0, 3) : configs).filter(c => !requested || requested.includes(c.name))) {
  const raw = config.state === 'LOAD_FAILED' ? { __loadError: 'STATIC_QA_LOAD_FAILURE' } : config.state === 'DEMO' ? fixtures.demo : clone(saved);
  const query = '?' + (config.state === 'DEMO' ? 'fixture=demo' : 'schedule=0022600051') + '&mode=' + config.mode + '&lang=' + config.lang;
  const pageClock = config.state === 'STALE' ? saved.validUntil : clock;
  const rendered = renderPage(raw, 'home', query, null, { mode: config.mode, now: pageClock, realTeams: true, fixtures });
  assert.ok(rendered.includes('class="spread"') && rendered.includes('pg-cover') && rendered.includes('id="today"'));
  assert.ok(rendered.indexOf('pg-cover') < rendered.indexOf('id="today"'));
  assert.ok(!rendered.includes('<table'));
  if (config.state === 'MISSING') assert.ok(rendered.includes('0022600051') && (BEFORE ? rendered.includes('賽前紀錄尚未提供公開顯示') : !/賽前判讀還沒出來|not out yet/.test(rendered)));
  if (config.state === 'STALE') assert.ok(rendered.includes('先前的賽程') && !rendered.includes('class="lead-story"'));
  const serialized = serializeComponents(rendered, config);
  // Test-only row wrapper preserves content/order while translating nested grid.
  serialized.html = serialized.html.replace('<div class="lead-art">', '<div class="qa-lead-row"><div class="lead-art">').replace('<div class="lead-foot">', '</div><div class="lead-foot">');
  const label = (process.env.MOSPORT_EVIDENCE_LABEL || (BEFORE ? '調整前' : '文案調整後')) + ' · 靜態構圖檢視 · 非瀏覽器截圖 · ' + config.width + 'px · ' +
    (config.state === 'LOAD_FAILED' ? '無法讀取示例' : config.state === 'DEMO' ? 'DEMO 虛構示例' : config.state === 'STALE' ? '過期賽程示例' : '已保存賽程') + ' · ' +
    (config.mode === 'prototype' ? '既有示意美術' : '正式素材顯示規則');
  const html = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace(/<html\b[^>]*>/, '<html lang="' + (config.lang === 'en' ? 'en' : 'zh-Hant') + '" data-theme="light">')
    .replace('<div id="app"></div>', '<aside class="qa-static-label">' + label + '</aside><div id="app">' + serialized.html + '</div><div id="qa-render-end"></div>');
  fs.writeFileSync(path.join(OUT, config.name + '.html'), html);
  // Explicit grid placement and stretch repair WeasyPrint's auto-placement;
  // track widths still come from the unmodified source spread declaration.
  const desktop = config.width >= 1024;
  const innerRules = [...sourceCss.matchAll(/\.pg-inner\s*\{([^}]*)\}/g)].map(m => m[1]);
  const rule = innerRules.find(r => desktop ? r.includes('border-radius') : r.includes('border-top'));
  const pad = rule.match(/padding:\s*([\d.]+)px\s+([\d.]+)px\s+([\d.]+)px(?:\s+([\d.]+)px)?/);
  assert.ok(pad, 'Derive content width from source padding');
  const contentWidth = (desktop ? naturalWidth-coverWidth : config.width) - Number(pad[2]) - Number(pad[4] || pad[2]);
  const leadCols = sourceCss.match(/\.lead\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*([.\d]+)fr\)\s*minmax\(0,\s*([.\d]+)fr\)/);
  assert.ok(leadCols, 'Derive lead tracks from source ratio');
  const artWidth = desktop ? contentWidth * Number(leadCols[1]) / (Number(leadCols[1]) + Number(leadCols[2])) : contentWidth;
  const readWidth = desktop ? contentWidth-artWidth : contentWidth;
  const sharedStaticCss = '.lead{width:' + contentWidth + 'px;grid-template-columns:' + artWidth + 'px' + (desktop ? ' '+readWidth+'px' : '') + '}.lead-art{grid-column:1;grid-row:1;width:' + artWidth + 'px}.lead-read{width:' + readWidth + 'px}.lead-foot{width:' + contentWidth + 'px;grid-column:1/-1}.stories{width:' + contentWidth + 'px;grid-template-columns:' + (BEFORE && desktop ? ((contentWidth-16)/2)+'px '+((contentWidth-16)/2)+'px' : contentWidth+'px') + '}.cv-t2{background:none;color:#FF7A1A}';
  const sourceArtHeight = Number(sourceCss.match(/\.lead-art\s*\{[^}]*min-height:\s*(\d+)px/)[1]);
  const staticRowCss = '.lead{display:block}.qa-lead-row{display:' + (desktop ? 'table;table-layout:fixed' : 'block') + ';width:' + contentWidth + 'px}.lead-art,.lead-read{display:' + (desktop ? 'table-cell;vertical-align:middle' : 'block') + '}.lead-art{height:' + (desktop ? sourceArtHeight : Number(sourceCss.match(/\.lead-art\s*\{\s*min-height:\s*(\d+)px/)[1])) + 'px}.lead-read>*+*{margin-top:10px}.lead-foot{display:block}.lead-foot>a{margin-top:10px}.lead-foot>.lead-time{margin:0}';
  const storyWidth = BEFORE && desktop ? (contentWidth-16)/2 : contentWidth;
  const bodyPad = sourceCss.match(/\.story-body\s*\{[^}]*padding:\s*(\d+)px\s+(\d+)px/);
  assert.ok(bodyPad);
  const storyContent = storyWidth - 2*Number(bodyPad[2]) - 2;
  const staticFlowCss = '.story{display:block;width:'+storyWidth+'px}.story-body{display:block;width:'+storyWidth+'px}.story-body>*{max-width:'+storyContent+'px;white-space:normal;overflow-wrap:anywhere}.story-s,.story-meta{width:'+storyContent+'px;margin-top:10px}.rv-top{display:block}.rv-top>mo-team-logo{display:inline-block}.rv-top>div{display:block}.g-card{display:block}.g-card>*{max-width:100%;white-space:normal}.g-card .st{display:inline-block;width:auto;white-space:nowrap}.g-time,.g-score,.g-read{margin-top:6px}.g-teams{display:block}.g-teams mo-team-logo,.g-codes{display:inline-block}';
  const railRule = sourceCss.match(/\.g-rail\s*\{[^}]*grid-auto-columns:\s*calc\(\(100% - (\d+)px\) \/ (\d+)\)/);
  const railGap = Number(sourceCss.match(/\.g-rail\s*\{[^}]*gap:\s*(\d+)px/)[1]);
  const mobileRatio = Number(sourceCss.match(/\.g-rail\s*\{\s*grid-auto-columns:\s*(\d+)%;/)[1])/100;
  assert.ok(railRule);
  const cardWidth = desktop ? (contentWidth-Number(railRule[1]))/Number(railRule[2]) : contentWidth*mobileRatio;
  const cardPad = Number(sourceCss.match(/\.g-card\s*\{[^}]*padding:\s*\d+px\s+(\d+)px/)[1]);
  const cardContent = cardWidth-2*cardPad-2;
  const cardCount = (rendered.match(/class="g-card"/g) || []).length;
  const railCss = '.g-rail-wrap{overflow:hidden}.g-rail{display:table;table-layout:fixed;border-spacing:'+railGap+'px 0;margin-left:-'+railGap+'px;width:'+(cardCount*cardWidth+(cardCount+1)*railGap)+'px}.g-card{display:table-cell;vertical-align:top;width:'+cardWidth+'px}.g-card>*{width:'+cardContent+'px;max-width:'+cardContent+'px}.g-card .st{width:auto}.g-teams{width:'+cardContent+'px}.g-codes{display:inline}.g-teams mo-team-logo{vertical-align:middle}';
  const staticCss = sharedStaticCss + staticRowCss + staticFlowCss + railCss + (config.width >= 1024
    ? 'body.page-home{height:auto;overflow:visible}.page-home #app{height:auto;display:block}#reader{display:block;overflow:visible}#sizer{width:' + naturalWidth + 'px;height:auto}#sizer .spread{position:relative;transform:none;grid-template-columns:' + coverWidth + 'px ' + (naturalWidth-coverWidth) + 'px}.pg-cover{grid-column:1;grid-row:1}.pg-inner{grid-column:2;grid-row:1}.lead-read{grid-column:2;grid-row:1}.lead-foot{grid-row:2}'
    : '.pg-inner{width:100%}.lead-read{grid-column:1;grid-row:2}.lead-foot{grid-row:3}.pg-inner>.state-msg,.pg-inner>.today-empty{width:100%}');
  cases.push({ ...config, pageClock, page: 'index.html', viewport: config.width >= 1024 ? 'desktop' : 'mobile',
    input: config.state === 'LOAD_FAILED' ? 'ISOLATED_LOAD_FAILURE' : 'SAVED_SCHEDULE',
    nbaGameId: config.state === 'MISSING' ? '0022600051' : null,
    derivedWidths: { contentWidth, artWidth, readWidth },
    containerWidth: config.width >= 1024 ? coverWidth : config.width, staticCss,
    staticGeometry: config.width >= 1024 ? 'NATIVE_READER_WIDTH_UNSCALED_FULL_CONTENT; EXPLICIT_SOURCE_GRID_PLACEMENT; not browser zoom/scroll acceptance' : 'SOURCE_MOBILE_FLOW_WITH_EXPLICIT_GRID_PLACEMENT',
    rendererDeviations: ['WeasyPrint nested fr columns collapse to zero; source-derived widths use a test-only table row/block stack, same DOM content/order; footer action stacks in static output', 'Unsupported clipped orange gradient text uses its source first color #FF7A1A', 'Static story flex descendants use source-derived block widths; game rail uses source-derived table tracks with clipped horizontal overflow; shadows, navigation/controls and browser interactions are not verified'],
    expectedText: ['MOSPORT', config.state === 'MISSING' ? (BEFORE ? '賽前紀錄尚未提供公開顯示' : config.lang === 'en' ? 'SAC' : '國王') : config.state === 'DEMO' ? 'DEMO' : config.state === 'STALE' ? '先前的賽程' : '這一期暫時打不開。'],
    htmlSha256: digest(html), componentSlots: serialized.slots });
}
const sourceFiles = ['site/index.html','site/js/app.js','site/js/pages/home.js','site/js/reader.js','site/js/i18n.js',
  'site/js/fixtures/issue.demo.js','site/js/data/providers.js','site/js/data/pipeline.js','site/js/contracts/contracts.js','site/js/components.js',
  'site/js/teams.nba.js','site/js/assets/registry.js','site/data/asset-registry.json','site/data/schedules/0022600051.json',
  'site/css/fonts.css','site/css/tokens.css','site/css/components.css','site/css/home.css','tests/unit/helpers.js',
  'tests/e2e/static-components.js','tests/e2e/home-spread-static.js','tests/e2e/render-schedule-static.py'].map(name => {
    const bytes = fs.readFileSync(name === 'tests/e2e/home-spread-static.js' || name === 'tests/e2e/render-schedule-static.py' ? path.join(GENERATOR_ROOT, name) : path.join(ROOT, name));
    return { path: name, sha256: digest(bytes), gitBlobSha: crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex') };
  });
fs.writeFileSync(path.join(OUT, 'html-evidence.json'), JSON.stringify({
  sourceHead: process.env.MOSPORT_EVIDENCE_SOURCE_HEAD || (BEFORE ? 'c1b19c42968914dea1dbf959c2233a5cfb32136f' : null), baseHead: '544709c3a84c92208a13b4e0afa4ca395484eef4', sourceState: 'WORKTREE_BOUND_BY_SOURCE_FILE_HASHES',
  pageClock: clock, method: 'EXISTING_APP_PAGE_RENDERER_AND_COMPONENT_METHODS_VIA_TEST_SHIM',
  publicQualification: 'NOT_ASSERTED', webComponents: 'ORIGINAL_RENDER_METHODS_ONLY; NO_BROWSER_LIFECYCLE',
  cssFiles: ['fonts.css','tokens.css','components.css','home.css'], sourceFiles, cases
}, null, 2) + '\n');
console.log('Exported ' + cases.length + ' source-bound inputs; no browser acceptance asserted.');
