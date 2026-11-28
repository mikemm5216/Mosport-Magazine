/* M6 public Vercel static release-gate: no private content, no DEMO, no unlicensed logos. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { build, ALLOW, validatePublicDependencies } = require('../../scripts/build-public-release.js');
const { compileSeason } = require('../../scripts/release-nba-season.js');
const C = require('../../site/js/contracts/contracts.js');
const pipeline = require('../../site/js/data/pipeline.js');
const catalog = require('../../site/data/nba-season-2026-27.json');
const gameBoxes = require('../../site/data/nba-game-boxes.json');
const resultPins = require('../../site/js/data/result-pins.js');
const nbaTeams = new Set(Object.keys(require('../../site/data/asset-registry.json').teamLogos.entries));
const releaseTime = '2026-11-28T11:30:00Z';
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
function walk(dir, base=dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory()
    ? walk(path.join(dir,e.name),base) : [path.relative(base,path.join(dir,e.name)).replaceAll(path.sep,'/')]);
}
function withTemp(fn) {const d=fs.mkdtempSync(path.join(os.tmpdir(),'mosport-public-test-'));try{return fn(d)}finally{fs.rmSync(d,{recursive:true,force:true})}}
test('M6 production build publishes only allowlisted files, exact source and trusted result', () => withTemp(dir => {
  const dest=path.join(dir,'public');
  const record=build(dest);
  assert.equal(record.schema, 'mosport-public-static@1');
  assert.equal(record.publicGameId,'0022600051');
  assert.equal(record.resultReceipt,'NBA-0022600051-R1');
  assert.equal(record.gameMode,'production');
  const shipped=walk(dest).sort();
  assert.deepEqual(shipped,Object.keys(record.files).concat('public-release-manifest.json').sort());
  for(const [file,expected] of Object.entries(record.files)) {
    assert.equal(sha(fs.readFileSync(path.join(dest,file))),expected,file+' fingerprint');
    assert.ok(!/^(?:internal\/|js\/fixtures\/|assets\/teams\/|assets\/flags\/)|owner-edition|\.map$|\.zip$/.test(file),file);
  }
  assert.ok(ALLOW.every(file => shipped.includes(file)));
  const cfg=fs.readFileSync(path.join(dest,'js/production-config.js'),'utf8');
  assert.match(cfg,/mode:\s*["']production["']/);
  assert.match(cfg,/defaultLanguage:\s*["']en["']/);
  const registry=JSON.parse(fs.readFileSync(path.join(dest,'data/asset-registry.json')));
  assert.deepEqual(registry.teamLogos.entries,{});
  // sourceUrl contains founder-linked Drive provenance; never include in public output.
  assert.doesNotMatch(JSON.stringify(registry), /"sourceUrl"\s*:/);
  assert.doesNotMatch(fs.readFileSync(path.join(dest,'data/asset-registry.js'),'utf8'), /"sourceUrl"\s*:/);

  for(const group of [registry.slots, registry.logos])for(const slot of Object.values(group)) {
    assert.ok(slot.versions.length<=1);
    for(const v of slot.versions) {
      assert.ok(['OWNED','LICENSED'].includes(v.rights.status));
      assert.equal(v.status,'ACTIVE');
      assert.ok(shipped.includes(v.file));
    }
  }
  for(const file of ['index.html','schedule.html','match.html','review.html']) {
    const html=fs.readFileSync(path.join(dest,file),'utf8');
    assert.match(html, /<html lang="en"/, file+' should be English-first');
    assert.ok(!/js\/fixtures\//.test(html));
    assert.ok(!/owner-edition\.js/.test(html));
    assert.ok(html.indexOf('js/production-config.js')<html.indexOf('js/assets/loader.js'));
    // Basic Vercel Web Analytics: exactly once, last script before </body>, served by Vercel.
    const analytics='<script src="_vercel/insights/script.js"></script>';
    assert.equal(html.split(analytics).length,2,file+' analytics include exactly once');
    assert.ok(html.indexOf(analytics)>html.indexOf('js/app.js') && html.indexOf(analytics)<html.indexOf('</body>'),file+' analytics after app.js');
    for(const m of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"?#]+)"/g))
      if (m[1] !== '_vercel/insights/script.js') assert.ok(shipped.includes(m[1]),file+' missing dependency '+m[1]);
  }
  // The runtime path is never shipped or pinned, and prototype shells never load it.
  assert.ok(!shipped.some(f=>f.startsWith('_vercel/')));
  assert.ok(!Object.keys(record.files).some(f=>f.startsWith('_vercel/')));
  for(const file of ['index.html','schedule.html','match.html','review.html'])
    assert.ok(!fs.readFileSync(path.join(__dirname,'../../site',file),'utf8').includes('_vercel/'),'prototype '+file);
  for(const rel of [...(fs.readFileSync(path.join(dest,'css/fonts.css'),'utf8')).matchAll(/url\('\.\.\/([^']+)'\)/g)].map(m=>m[1]))
    assert.ok(shipped.includes(rel),'font referenced by CSS missing '+rel);
  assert.ok(!shipped.includes('site/data/schedules/0022600274.json'));
}));
test('the season catalog generates the full fact-only schedule without overwriting exact-game releases', () => withTemp(dir => {
  const dest = path.join(dir, 'season');
  const record = build(dest);
  const scheduled = Object.keys(record.files).filter(file => /^data\/schedules\/\d{10}\.json$/.test(file));
  assert.equal(scheduled.length, 1204);
  assert.equal(Object.keys(record.files).filter(file => file.startsWith('data/results/')).length, 4);
  assert.equal(nbaTeams.size, 30);
  assert.ok(!record.files['data/nba-season-2026-27.json']);
  const readGame = id => JSON.parse(fs.readFileSync(path.join(dest, 'data/schedules', id + '.json')));
  const first = readGame('0022600001');
  assert.equal(first.schema, C.SCHEMAS.seasonSchedule);
  assert.equal(first.source.originalUrl, 'https://www.nba.com/pistons/schedule');
  const historical = pipeline.run(first, { mode: 'production', now: releaseTime }).model;
  assert.equal(historical.schedule[0].historicalSchedule, true);
  assert.equal(historical.schedule[0].score, null);
  assert.equal(historical.schedule[0].pregameSnapshot, null);
  assert.equal(readGame('0022600064').schema, C.SCHEMAS.schedule);
  for (const [id] of catalog.pending) assert.ok(!record.files['data/schedules/' + id + '.json']);
}));
test('season publication rejects source, identity and time drift', () => {
  const first = catalog.games[0];
  const data = { ...catalog, games: [first], pending: [] };
  const run = (input, editions = []) => compileSeason(input, editions, nbaTeams, releaseTime);
  const good = run(data);
  assert.equal(good.files.size, 1);
  const sourceIndex = first[4];
  for (const url of ['https://sports.example.com/schedule', 'https://www.nba.com/games?date=2026-10-21']) {
    const sources = catalog.sources.slice();
    sources[sourceIndex] = { ...sources[sourceIndex], url };
    assert.throws(() => run({ ...data, sources }), /SCHEDULE_SOURCE_MISMATCH/);
  }
  assert.throws(() => run({ ...data, games: [first, first] }), /NBA_SEASON_DUPLICATE/);
  assert.throws(() => run(data, [{ id: first[0], away: 'CHA', home: first[2], tipoff: first[3] }]), /NBA_SEASON_RELEASE_CONFLICT/);
  assert.throws(() => run({ ...data, pending: [['0062600001', 'Championship', '2026-12-09', '2026-12-12T01:00:00Z', sourceIndex]] }), /NBA_SEASON_PENDING_INVALID/);
  const entry = JSON.parse(good.files.values().next().value);
  assert.equal(pipeline.run(entry, { mode: 'production', now: '2026-10-20T14:00:00Z' }).model.status, 'INVALID');
  const privateField = { ...entry, contextSnapshot: {} };
  assert.equal(pipeline.run(privateField, { mode: 'production', now: releaseTime }).model.status, 'INVALID');
  const withQuote = { ...entry, source: { ...entry.source, quotedSpan: 'unapproved excerpt' } };
  assert.equal(pipeline.run(withQuote, { mode: 'production', now: releaseTime }).model.status, 'INVALID');
  const unpinned = pipeline.run(entry, { mode: 'production', now: releaseTime, result: { awayScore: 999 } }).model;
  assert.equal(unpinned.schedule[0].score, null);
});
test('reduced NBA boxes require the same verified final and reconcile periods and shooting', () => {
  for (const [id, box] of Object.entries(gameBoxes)) {
    const entry = require('../../site/data/schedules/' + id + '.json');
    const result = require('../../site/data/results/' + id + '.json');
    const opts = { mode:'production', now:releaseTime, pins:resultPins, result, gameBoxes };
    const game = overrides => pipeline.run(entry,{...opts,...overrides}).model.schedule[0];
    assert.deepEqual(C.validateGameBox(box, result, releaseTime), []);
    assert.deepEqual(game().box.away.periods, box.away.periods);
    assert.equal(game({pins:{}}).box, undefined);
    assert.equal(game({result:null}).box, undefined);
    assert.equal(game({now:entry.game.tipoff}).box, undefined);
    assert.equal(game({gameBoxes:{[id]:{ ...box, receiptRef:'OTHER' }}}).box, undefined);
    assert.equal(game({gameBoxes:{[id]:{ ...box, officialUrl:'https://example.com/' }}}).box, undefined);
    assert.equal(game({gameBoxes:{[id]:{ ...box, home:{...box.home, periods:[0,1,2,3]} }}}).box, undefined);
    assert.equal(game({gameBoxes:{[id]:{ ...box, away:{...box.away, fieldGoals:[400,1]} }}}).box, undefined);
    assert.equal(game({gameBoxes:{[id]:{ ...box, text:'Private notes' }}}).box, undefined);
    const inheritedKeys = JSON.parse('{"__proto__":{"publication":"private"},"constructor":"private","toString":"private"}');
    for (const invalid of [{...box,...inheritedKeys}, {...box,home:{...box.home,...inheritedKeys}}]) {
      assert.ok(C.validateGameBox(invalid, result, releaseTime).some(problem => problem.code === 'UNKNOWN_FIELD'));
      assert.equal(game({gameBoxes:{[id]:invalid}}).box, undefined);
    }
    assert.equal(game({gameBoxes:{[id]:{ ...box, receiptRef:'OTHER' }}}).score.home, result.homeScore);
  }
});
test('Reader V3 homepage preview replaces only the homepage in the public manifest', () => withTemp(dir => {
  const standardDir = path.join(dir, 'standard');
  const previewDir = path.join(dir, 'preview');
  const standard = build(standardDir);
  const builder = path.resolve(__dirname, '../../scripts/build-public-release.js');
  execFileSync(process.execPath, [builder, previewDir, '--reader-v3-home']);
  const preview = JSON.parse(fs.readFileSync(path.join(previewDir, 'public-release-manifest.json')));
  assert.notEqual(standard.files['index.html'], standard.files['reader-v3.html']);
  assert.deepEqual(preview, {
    ...standard,
    files: { ...standard.files, 'index.html': standard.files['reader-v3.html'] }
  });
  assert.deepEqual(
    fs.readFileSync(path.join(previewDir, 'index.html')),
    fs.readFileSync(path.join(standardDir, 'reader-v3.html'))
  );
}));
test('M6 builder fails closed if output already exists or targets a repository source',()=>withTemp(dir => {
  const dest=path.join(dir,'public');fs.mkdirSync(dest);
  fs.writeFileSync(path.join(dest,'keep.txt'),'original');
  assert.throws(()=>build(dest),/OUTPUT_MUST_NOT_EXIST/);
  assert.equal(fs.readFileSync(path.join(dest,'keep.txt'),'utf8'),'original');
  assert.throws(()=>build(path.resolve(__dirname,'../../site')),/UNSAFE_OUTPUT/);
}));
test('M6 builder rejects unallowlisted HTML dependencies before deployment', () => {
  const eligible = new Set(['js/app.js', 'css/home.css']);
  assert.doesNotThrow(() => validatePublicDependencies(
    '<script src="js/app.js"></script><link rel="stylesheet" href="css/home.css">', eligible));
  assert.throws(() => validatePublicDependencies(
    '<script src="js/fixtures/missing.js"></script>', eligible), /PUBLIC_DEPENDENCY_MISSING/);
  assert.throws(() => validatePublicDependencies(
    '<script src="js/data/owner-edition.js"></script>', eligible), /PUBLIC_DEPENDENCY_MISSING/);
});

test('M6 public shells follow a strict grammar: no tag, quoting, parser-differential or URL form ships an unlisted fetch', () => {
  const eligible = new Set(['js/app.js', 'css/home.css', 'assets/brand/mosport-mark.svg']);
  for (const ok of [
    "<SCRIPT SRC='js/app.js'></SCRIPT>", '<script src=js/app.js></script>', '<script src="js/app.js?v=2"></script>',
    '<script/src="js/app.js"></script>', '<link rel="icon" href="assets/brand/mosport-mark.svg">',
    '<LINK REL=Stylesheet HREF=css/home.css>', '<!-- note --><script src="js/app.js"></script>',
    '<meta charset="UTF-8"><script src="\n js/app.js \t"></script>',
    '<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>MOSPORT · More than sport</title><link rel="stylesheet" href="css/home.css"></head><body class="x"><div id="app"></div><script src="js/app.js"></script></body></html>'
  ]) assert.doesNotThrow(() => validatePublicDependencies(ok, eligible), ok);
  const X = 'https://cdn.example/x';
  for (const bad of [
    // URL forms and earlier bypasses
    "<script src='js/fixtures/demo.js'></script>", '<script src=js/data/owner-edition.js></script>', '<SCRIPT SRC="internal/store.js"></SCRIPT>',
    "<LINK REL=stylesheet HREF='css/extra.css'>", `<script src="${X}.js"></script>`, "<script src='//cdn.example/x.js'></script>",
    '<script src="/js/app.js"></script>', '<script src="js/../internal/store.js"></script>', '<script src="data:text/javascript,1"></script>',
    '<script src="js/app.js&#x2f;x"></script>', '<script src="js/%2e%2e/x.js"></script>', '<script src=""></script>', '<script></script>',
    `<script/src="${X}.js"></script>`, `<script type="x"src="${X}.js"></script>`, `<img alt="a > b" src="${X}.png">`,
    // a82ffcf regression: an unpaired quote must not hide anything
    `<img alt=a"b src=${X}.png>`, `<script x" src="${X}.js"></script>`, "<script x' src=internal/store.js></script>",
    // tags and attributes outside the shell grammar
    '<base href="https://evil.example/">', '<style>@import url(x)</style>', '<div style="background:url(x)"></div>',
    '<body background="x.png">', '<meta http-equiv="refresh" content="0;url=x">', '<iframe srcdoc="x"></iframe>',
    '<script src="js/app.js" onload="fetch(1)"></script>', '<a href="javascript:fetch(1)">x</a>', '<a href="java&#x09;script:x">x</a>',
    '<link rel="preload" href="css/home.css">', '<link rel="modulepreload" href="js/app.js">', '<link rel=icon href=css/home.css imagesrcset=x>',
    '<script src="js/app.js" src="https://cdn.example/x.js"></script>', '<script type=module>import "x"</script>',
    '<object data="x.pdf"></object>', '<embed src="x.swf">', '<video poster="x.webp"></video>', '<input type=image src=x>',
    // independent QA of 1e10ac1, classes A–F (parser differentials and SVG/MathML)
    `<svg><rect fill="url(${X})"/></svg>`, `<svg><image><animate attributeName=href values=${X}></image></svg>`,
    `<svg><title><img src=${X}.png></title></svg>`, `<math><style><img src=${X}.png></style></math>`,
    `<svg><![CDATA[><img src=${X}.png>]]></svg>`, `<noscript><img src="${X}.png"></noscript>`, `<template><img src=${X}.png></template>`,
    `<title></titlex><img src=${X}.png></title>`, `<div></div a=">"><img src=${X}.png>`, `</div x><img src=${X}.png>`,
    `<p>${'İ'.repeat(40)}</p><title></title><img src=${X}.png>`, `<title>${'İ'.repeat(40)}</title><img src=${X}.png>`,
    `<title><script src="js/app.js"></script></title>`, `<script src="js/app.js"><!--<script>--></script>`,
    `<!--><script src="${X}.js"></script>-->`, `<!-- a --!><script src="${X}.js"></script>-->`, `<! x><img src=${X}>`,
    '<script src="js/app.js"', '<title>unterminated', '<html lang="x" lang="y">', 'a < b', '<p>' + 'x'.repeat(64 * 1024) + '</p>',
    // independent QA of 08d4304: F1 non-ASCII whitespace around URLs, F2 non-UTF-8 charset and control bytes
    '<script src="\u00a0js/app.js"></script>', '<script src="js/app.js\ufeff"></script>', '<script src="\u2028js/app.js"></script>',
    '<script src="js/app.js\u00a0"></script>', '<meta charset="iso-2022-jp">', '<meta charset=" shift_jis ">',
    `<meta charset="utf-8"><title>\x1b$B</title><img src=${X}.png>`, '<div id="a\x00b"></div>'
  ]) assert.throws(() => validatePublicDependencies(bad, eligible), /PUBLIC_(DEPENDENCY|HTML|INLINE)/, bad);
  // linear time: pathological pages up to the size cap are decided quickly
  const started = Date.now();
  for (const evil of ['<title>' + '</title><title>'.repeat(4000), '<div' + ' id="'.repeat(16000), '<script ' + '"'.repeat(60000),
    '<'.repeat(60000), '<!--' + '-'.repeat(60000), '<html lang=a"b '.repeat(4000)]) {
    try { validatePublicDependencies(evil, eligible); } catch (e) { /* any rejection is fine */ }
  }
  assert.ok(Date.now() - started < 2000);
});
test('M6 public build opens in English for a new visitor and keeps an explicit or saved zh choice', async () => {
  const { chromium } = require('playwright');
  const http = require('node:http');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosport-public-lang-'));
  const dest = path.join(dir, 'public');
  build(dest);
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(dest, rel);
    if (!file.startsWith(dest + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  try {
    const read = async (url, saved) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      if (saved) { await page.goto(base + 'index.html'); await page.evaluate(v => localStorage.setItem('mosport.lang', v), saved); }
      await page.goto(base + url);
      await page.waitForFunction(() => /\d{2,3}\s*[–\-：:]\s*\d{2,3}/.test(document.body.innerText));
      const out = await page.evaluate(() => ({ lang: document.documentElement.lang, mode: window.MOSPORT_CONFIG.mode,
        cjk: /[一-鿿]/.test(document.body.innerText.replace(/繁中/g, '')) }));
      await ctx.close();
      return out;
    };
    const landing = 'match.html?game=0022600051&utm_source=x&utm_medium=organic_social&utm_campaign=mosport_beta0_launch&utm_content=0022600051-official-final';
    for (const url of ['index.html', landing]) {
      assert.deepEqual(await read(url), { lang: 'en', mode: 'production', cjk: false }, url + ' fresh visitor');
      assert.deepEqual(await read(url + (url.includes('?') ? '&' : '?') + 'lang=zh'), { lang: 'zh-Hant', mode: 'production', cjk: true }, url + ' ?lang=zh');
      assert.deepEqual(await read(url, 'zh'), { lang: 'zh-Hant', mode: 'production', cjk: true }, url + ' saved zh');
    }
    const games = [
      ['0022600064', 'MIA @ NYK', '08:00', ['108','105']],
      ['0022600068', 'ATL @ BOS', '09:00', ['87','86']],
      ['0022600071', 'LAL @ SAS', '10:30', ['96','99']]
    ];
    for (const viewport of [{ width: 1366, height: 850 }, { width: 390, height: 844 }]) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date('2026-11-27T13:00:00Z'));
      for (const entry of ['index.html', 'schedule.html']) {
        for (const [id, matchup, time] of games) {
          await page.goto(base + entry);
          const link = page.locator('a[href*="schedule=' + id + '"][href*="game=' + id + '"]');
          await link.waitFor({state:'visible'});
          assert.ok((await link.innerText()).includes(time));
          await link.click();
          await page.getByRole('heading', {name:matchup, exact:true}).waitFor();
          assert.equal(new URL(page.url()).searchParams.get('game'), id);
          assert.equal(await page.locator('#m-final, .m-badges').count(), 0);
        }
      }
      await page.clock.setFixedTime(new Date('2026-11-27T12:15:00Z'));
      await page.goto(base + 'index.html');
      await page.getByRole('link', {name:'Game details', exact:false}).first().waitFor();
      assert.equal(await page.locator('a[href*="game=0022600064"]').count(), 0);
      await ctx.close();
    }
    for (const width of [1440, 1280, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 850 } });
      const page = await ctx.newPage();
      const errors = [];
      const scheduleRequests = [];
      page.on('request', request => {
        const rel = new URL(request.url()).pathname;
        const schedule = /^\/data\/schedules\/(\d{10})\.json$/.exec(rel);
        if (schedule) scheduleRequests.push(schedule[1]);
      });
      page.on('pageerror', error => errors.push(error.message));
      for (const theme of ['light', 'dark']) {
        // Final JSON is already in this artifact, but the reader must wait
        // for each source's actual observation time to reveal it.
        await page.clock.setFixedTime(new Date('2026-11-28T03:10:00Z'));
        scheduleRequests.length = 0;
        await page.goto(base + 'reader-v3.html?theme=' + theme);
        await page.waitForFunction(() => document.querySelectorAll('.cards .card').length === 3);
        assert.equal(await page.locator('.cards .pts').count(), 0);
        assert.deepEqual(scheduleRequests.sort(), games.map(([id]) => id));
        await page.clock.setFixedTime(new Date('2026-11-28T06:00:00Z'));
        await page.reload();
        await page.waitForFunction(() => document.querySelectorAll('.cards .pts').length === 6);
        assert.equal(await page.getByText('Reader zoom', { exact: false }).count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        for (const [id, , , score] of games) {
          await page.locator('.cards a[href*="game=' + id + '"]').click();
          await page.locator('.match-hero').waitFor();
          await page.waitForFunction(() => document.querySelectorAll('.duo-mid strong span').length === 2);
          assert.deepEqual(await page.locator('.duo-mid strong span').allTextContents(), score);
          const result = JSON.parse(fs.readFileSync(path.join(dest, 'data/results', id + '.json')));
          assert.equal(await page.locator('.facts a').getAttribute('href'), result.officialUrl);
          const box = page.getByRole('region', { name:'Box score' });
          const facts = gameBoxes[id];
          assert.equal(await box.getByRole('table').count(), 2);
          assert.deepEqual(await box.locator('table').first().locator('tbody td').allTextContents(),
            [...facts.away.periods, result.awayScore, ...facts.home.periods, result.homeScore].map(String));
          const comparison = box.locator('table').nth(1);
          assert.deepEqual(await comparison.locator('thead th').allTextContents(), [result.away, 'Stat', result.home]);
          assert.deepEqual(await comparison.locator('tbody th').allTextContents(),
            ['Field goals', '3-pointers', 'Free throws', 'Rebounds', 'Assists']);
          assert.deepEqual(await comparison.locator('tbody tr').first().locator('td').allTextContents(),
            [facts.away.fieldGoals.join('–'), facts.home.fieldGoals.join('–')]);
          assert.equal(await box.getByRole('link', { name:/Official NBA box score/ }).getAttribute('href'), facts.officialUrl);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.locator('.match-meta a').click();
          await page.waitForFunction(() => document.querySelectorAll('.cards .card').length === 3);
        }
        scheduleRequests.length = 0;
        await Promise.all([
          page.waitForURL(url => url.searchParams.get('date') === '2026-11-21'),
          page.locator('[data-reader-day]').selectOption('2026-11-21')
        ]);
        await page.locator('.cards .card').waitFor();
        assert.deepEqual(scheduleRequests, ['0022600051']);
        await page.locator('.cards .card').click();
        await page.waitForFunction(() => document.querySelectorAll('.duo-mid strong span').length === 2);
        assert.deepEqual(await page.locator('.duo-mid strong span').allTextContents(), ['104', '106']);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
      }
      await page.clock.setFixedTime(new Date(releaseTime));
      scheduleRequests.length = 0;
      await page.goto(base + 'reader-v3.html?date=2026-11-28');
      await page.waitForFunction(() => document.querySelectorAll('.cards .card[href*="game="]').length === 11);
      assert.equal(new Set(scheduleRequests).size, 11);
      assert.equal(await page.locator('.board .card[href*="game="] .pts').count(), 6);
      assert.equal(await page.locator('[aria-labelledby="cup-pending"] .card').count(), 3);
      assert.equal(await page.getByText('2026-12-08 ET · Tip-off time to be determined').count(), 2);
      assert.equal(await page.getByText(/12 Dec 2026 · 09:00 Taipei/).count(), 1);
      await page.goto(base + 'reader-v3.html?game=0022600065');
      await page.getByRole('heading', { name: 'Milwaukee Bucks @ Detroit Pistons', exact: true }).waitFor();
      assert.equal(await page.getByRole('region', { name:'Box score' }).count(), 0);
      assert.equal(await page.locator('.duo-mid strong span').allTextContents().then(xs => xs.join('')), '08:30');
      assert.equal(await page.locator('.facts a').getAttribute('href'), 'https://www.nba.com/games?date=2026-11-27');
      assert.equal(await page.locator('.match-hero').getByText('Historical schedule · No verified score').count(), 1);
      assert.equal(await page.evaluate(() => {
        dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        return document.querySelectorAll('script[src*="result-pins.js?recheck"]').length;
      }), 0);
      assert.deepEqual(errors, []);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('M6 builder allows only the one Vercel analytics runtime path, nothing else under _vercel',()=>{
  const { publicHtml } = require('../../scripts/build-public-release.js');
  const html = publicHtml(fs.readFileSync(path.join(__dirname,'../../site/index.html')));
  // Eligible = every dependency the real shell uses, so only the substituted URL can fail.
  const eligible = new Set([...html.matchAll(/(?:src|href)="([^"?#]+)"/g)].map(m=>m[1]));
  assert.ok(eligible.has('_vercel/insights/script.js'));
  validatePublicDependencies(html, eligible); // the real shell passes
  for (const bad of ['_vercel/insights/other.js','/_vercel/insights/script.js',
    'https://cdn.vercel-insights.com/v1/script.js','_vercel/speed-insights/script.js'])
    assert.throws(()=>validatePublicDependencies(html.replace('_vercel/insights/script.js', bad), eligible),
      /PUBLIC_DEPENDENCY_MISSING/, bad);
});
test('Vercel config redirects only the project vercel.app host to the one public origin',()=>{
  const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'../../vercel.json'),'utf8'));
  assert.equal(cfg.buildCommand,'node scripts/build-public-release.js dist-public --reader-v3-home');
  assert.equal(cfg.outputDirectory,'dist-public');
  assert.deepEqual(cfg.redirects,[{source:'/:path*',has:[{type:'host',value:'mosport-magazine\\.vercel\\.app'}],
    destination:'https://www.mosport.app/:path*',permanent:true}]);
  // Exact host match: deployment URLs, previews and www itself are not redirected.
  const re=new RegExp('^'+cfg.redirects[0].has[0].value+'$');
  assert.ok(re.test('mosport-magazine.vercel.app'));
  for(const h of ['www.mosport.app','mosport-magazine-env3ij3to-michael-mos-projects.vercel.app','mosport-magazine-michael-mos-projects.vercel.app','mosport-magazineXvercel.app'])
    assert.ok(!re.test(h),h);
});
