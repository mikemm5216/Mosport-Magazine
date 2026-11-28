/* M6: build an explicitly allowlisted, production-only Vercel artifact.
 * The repository's site/ contains demo fixtures, internal QA and rights-unknown
 * assets. Never publish site/ directly and never consume an owner edition. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseArgs } = require('node:util');
const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'site');
const GAME_ID = '0022600051';
const FOLLOW_UP_GAME_IDS = ['0022600064', '0022600068', '0022600071'];
const ALLOW = [
  'index.html', 'schedule.html', 'match.html', 'review.html', 'reader-v3.html',
  'css/fonts.css', 'css/tokens.css', 'css/components.css', 'css/home.css', 'css/pages.css', 'css/reader-v3.css',
  'js/teams.nba.js', 'js/assets/registry.js', 'js/assets/loader.js',
  'js/components.js', 'js/i18n.js', 'js/contracts/contracts.js',
  'js/editorial/eligibility.js', 'js/reader.js',
  'js/pages/home.js', 'js/pages/schedule.js', 'js/pages/match.js', 'js/pages/review.js', 'js/pages/reader-v3.js',
  'js/data/result-pins.js', 'js/data/pipeline.js', 'js/data/pregame-edition.js',
  'js/data/providers.js', 'js/app.js',
  `data/schedules/${GAME_ID}.json`, `data/results/${GAME_ID}.json`
];
const APPROVED_RIGHTS = new Set(['OWNED', 'LICENSED']);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const read = rel => {
  if (!/^[a-zA-Z0-9._/-]+$/.test(rel) || rel.split('/').includes('..')) throw Error('INVALID_SOURCE_PATH');
  const p = path.join(sourceRoot, rel);
  if (!fs.statSync(p).isFile() || fs.lstatSync(p).isSymbolicLink()) throw Error('NOT_REGULAR_SOURCE: '+rel);
  return fs.readFileSync(p);
};
function approved(v, art) {
  return !!v && v.status === 'ACTIVE' && APPROVED_RIGHTS.has(v.rights && v.rights.status) &&
    !(v.content && (v.content.containsPerson || (art && (v.content.containsLogo || v.content.containsText))));
}
function cleanSlot(slot, art, assets) {
  const selected = (slot.versions || []).find(v => v.id === slot.activeVersion && approved(v, art));
  const kept = selected ? [selected] : [];
  if (selected) assets.add(selected.file);
  if (selected && selected.darkFile) assets.add(selected.darkFile);
  return { ...slot, activeVersion: selected ? selected.id : null, versions: kept };
}
function stripPrivateSourceLinks(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach(stripPrivateSourceLinks); return; }
  delete value.sourceUrl;
  for (const child of Object.values(value)) stripPrivateSourceLinks(child);
}
// The public pages are tiny HTML shells we author; the renderer builds the
// rest in JS from allowlisted files. So the shells are held to a strict grammar
// instead of being parsed generally: only the tags and attributes they use, only
// <!doctype html> and unambiguous comments, end tags exactly '</name>', no stray
// '<', raw-text bodies without '<', <link> limited to icon/stylesheet, <script>
// only with src and an empty body. Every src/href must be an allowlisted
// same-site relative file. Anything else fails the build (linear time; 64 KiB cap).
const MAX_PUBLIC_HTML = 64 * 1024;
const PUBLIC_TAGS = {
  html: ['lang', 'data-theme'], head: [], meta: ['charset', 'name', 'content'], title: [],
  link: ['rel', 'href'], body: ['class'], div: ['id', 'class'], script: ['src']
};
const PUBLIC_LINK_RELS = new Set(['icon', 'stylesheet']);
const PUBLIC_RAW_TEXT = new Set(['title', 'script']);
function parsePublicHtml(html) {
  if (html.length > MAX_PUBLIC_HTML) throw Error('PUBLIC_HTML_TOO_LARGE: ' + html.length);
  // Control bytes (e.g. ESC for ISO-2022-JP) let a non-UTF-8 decoder see different markup.
  if (/[\x00-\x08\x0b\x0e-\x1f\x7f]/.test(html)) throw Error('PUBLIC_HTML_CONTROL_CHARACTER');
  const tags = [], n = html.length, ws = c => c === ' ' || c === '\t' || c === '\n' || c === '\f' || c === '\r';
  const fail = (code, at) => { throw Error(code + ' at ' + at); };
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  let i = 0;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    i = lt + 1;
    if (/^!doctype html>/i.test(html.slice(i, i + 14))) { i += 14; continue; }
    if (html.startsWith('!--', i)) {
      // Browsers also end a comment at '<!-->', '<!--->' and '--!>'; those forms fail closed.
      const end = html.indexOf('-->', i + 3);
      if (end < 0 || html[i + 3] === '>' || html.startsWith('->', i + 3) || html.slice(i + 3, end).includes('--!>')) fail('PUBLIC_HTML_UNPARSEABLE: ambiguous comment', lt);
      i = end + 3; continue;
    }
    const endTag = /^\/([A-Za-z]+)>/.exec(html.slice(i, i + 16));
    if (endTag) {
      if (!own(PUBLIC_TAGS, endTag[1].toLowerCase())) fail('PUBLIC_HTML_TAG_NOT_ALLOWED: /' + endTag[1], lt);
      i += endTag[0].length; continue;
    }
    if (!/[A-Za-z]/.test(html[i] || '')) fail('PUBLIC_HTML_UNPARSEABLE: stray <', lt);
    let j = i; while (j < n && !ws(html[j]) && html[j] !== '/' && html[j] !== '>') j++;
    const name = html.slice(i, j).toLowerCase();
    if (!own(PUBLIC_TAGS, name)) fail('PUBLIC_HTML_TAG_NOT_ALLOWED: ' + name, lt);
    const tag = { name, attrs: new Map(), body: '' };
    i = j;
    for (;;) {
      while (i < n && (ws(html[i]) || html[i] === '/')) i++;
      if (i >= n) fail('PUBLIC_HTML_UNPARSEABLE: unterminated <' + name + '>', lt);
      if (html[i] === '>') { i++; break; }
      let k = i + 1; // the first character, even '=' or a quote, belongs to the name
      while (k < n && !ws(html[k]) && html[k] !== '/' && html[k] !== '>' && html[k] !== '=') k++;
      const attr = html.slice(i, k).toLowerCase();
      if (!PUBLIC_TAGS[name].includes(attr)) fail('PUBLIC_HTML_ATTRIBUTE_NOT_ALLOWED: ' + name + ' ' + attr, i);
      if (tag.attrs.has(attr)) fail('PUBLIC_HTML_ATTRIBUTE_DUPLICATED: ' + name + ' ' + attr, i);
      i = k; while (i < n && ws(html[i])) i++;
      let value = '';
      if (html[i] === '=') {
        i++; while (i < n && ws(html[i])) i++;
        const q = html[i];
        if (q === '"' || q === "'") { const end = html.indexOf(q, i + 1); if (end < 0) fail('PUBLIC_HTML_UNPARSEABLE: unterminated value', i); value = html.slice(i + 1, end); i = end + 1; }
        else { let e = i; while (e < n && !ws(html[e]) && html[e] !== '>') e++; value = html.slice(i, e); i = e; }
      }
      tag.attrs.set(attr, value);
    }
    if (PUBLIC_RAW_TEXT.has(name)) {
      // Search the original string (no case-mapped copy, whose indexes can shift).
      const close = new RegExp('</' + name + '[\\t\\n\\f\\r />]', 'gi');
      close.lastIndex = i;
      const m = close.exec(html);
      if (!m) fail('PUBLIC_HTML_UNPARSEABLE: unterminated <' + name + '> content', lt);
      tag.body = html.slice(i, m.index);
      if (tag.body.includes('<')) fail('PUBLIC_HTML_UNPARSEABLE: markup inside <' + name + '>', i);
      i = m.index;
    }
    tags.push(tag);
  }
  return tags;
}
function publicUrl(raw, eligible) {
  // Browsers strip only ASCII whitespace around a URL; anything else (NBSP, BOM, U+2028)
  // stays in the path, so only those five characters are trimmed here.
  const v = raw.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, ''), rel = v.replace(/[?#].*$/, '');
  if (!rel || !/^[A-Za-z0-9._\/-]+$/.test(rel) || rel.startsWith('/') || rel.split('/').includes('..') || !eligible.has(rel)) {
    throw Error('PUBLIC_DEPENDENCY_MISSING: ' + raw);
  }
}
function validatePublicDependencies(html, eligible) {
  for (const tag of parsePublicHtml(html)) {
    if (tag.name === 'meta' && tag.attrs.has('charset') && tag.attrs.get('charset').trim().toLowerCase() !== 'utf-8') throw Error('PUBLIC_HTML_CHARSET');
    if (tag.name === 'link') {
      if (!PUBLIC_LINK_RELS.has((tag.attrs.get('rel') || '').trim().toLowerCase())) throw Error('PUBLIC_DEPENDENCY_LINK_REL');
      publicUrl(tag.attrs.get('href') || '', eligible);
    }
    if (tag.name === 'script') {
      if (tag.body.trim() || !tag.attrs.has('src')) throw Error('PUBLIC_INLINE_SCRIPT');
      publicUrl(tag.attrs.get('src'), eligible);
    }
  }
}
function cleanRegistry(reg) {
  const assets = new Set();
  const cleaned = JSON.parse(JSON.stringify(reg));
  for (const [key,slot] of Object.entries(reg.slots || {})) cleaned.slots[key] = cleanSlot(slot, true, assets);
  for (const [key,slot] of Object.entries(reg.logos || {})) cleaned.logos[key] = cleanSlot(slot, false, assets);
  /* All 30 currently registered NBA logo versions are rights=UNVERIFIED. */
  cleaned.teamLogos.entries = {};
  // The public registry must not expose founder-owned Drive/source URLs.
  stripPrivateSourceLinks(cleaned);
  const files = [...assets].sort();
  for (const rel of files) {
    if (!/^assets\/(art|brand)\/[a-zA-Z0-9._-]+\.(webp|png|svg)$/.test(rel))
      throw Error('ASSET_NOT_ALLOWLISTED: '+rel);
    read(rel); // fail before writing any stage file if a selected asset is absent
  }
  return { cleaned, files };
}
// Fetched from Vercel at runtime, never shipped in the artifact or its manifest.
const VERCEL_ANALYTICS_SCRIPT = '_vercel/insights/script.js';
function publicHtml(bytes) {
  let html = bytes.toString('utf8');
  html = html.replace(/<script\s+src="js\/fixtures\/[^"]+"><\/script>\s*/g, '');
  if (/js\/fixtures\//.test(html) || /owner-edition\.js/.test(html)) throw Error('UNSAFE_HTML_SCRIPT');
  const anchor = '<script src="js/assets/loader.js"></script>';
  if (html.split(anchor).length !== 2) throw Error('PRODUCTION_CONFIG_ANCHOR_MISSING');
  if (!html.includes('<html lang="zh-Hant"')) throw Error('HTML_LANGUAGE_BASE_NOT_FOUND');
  html = html.replace('<html lang="zh-Hant"', '<html lang="en"');
  // Vercel Web Analytics (basic, cookieless; Founder decision 2026-11-24/25, Hobby plan).
  // Served by Vercel at /_vercel/insights/script.js; the shells sit at the site root,
  // so the relative form passes the strict dependency gate unchanged. Production only.
  const bodyEnd = '</body>';
  if (html.split(bodyEnd).length !== 2) throw Error('PUBLIC_HTML_BODY_END_MISSING');
  html = html.replace(bodyEnd, '<script src="' + VERCEL_ANALYTICS_SCRIPT + '"></script>\n' + bodyEnd);
  return html.replace(anchor, '<script src="js/production-config.js"></script>\n' + anchor);
}
function officialGate() {
  const C = require(path.join(sourceRoot, 'js/contracts/contracts.js'));
  const pins = require(path.join(sourceRoot, 'js/data/result-pins.js'));
  const schedule = JSON.parse(read(`data/schedules/${GAME_ID}.json`));
  const result = JSON.parse(read(`data/results/${GAME_ID}.json`));
  const now = new Date().toISOString();
  if (C.validateSchedule(schedule, { now }).length) throw Error('OFFICIAL_SCHEDULE_REJECTED');
  if (C.validateGameResult(result, schedule, pins[GAME_ID], now).length) throw Error('OFFICIAL_FINAL_REJECTED');
  if (schedule.contextSnapshot != null) throw Error('PRIVATE_SNAPSHOT_MUST_NOT_SHIP');
  if (result.receiptRef !== 'NBA-0022600051-R1' || result.awayScore !== 104 || result.homeScore !== 106)
    throw Error('UNEXPECTED_RESULT_RELEASE');
  function navigationEntry(entry) {
    const { gameId: id, away, home, tipoff } = entry.game;
    return { id, away, home, tipoff, availableAt: entry.source.observedAt };
  }
  const editions = [navigationEntry(schedule)];
  const files = [];
  for (const id of FOLLOW_UP_GAME_IDS) {
    const schedulePath = `data/schedules/${id}.json`;
    const resultPath = `data/results/${id}.json`;
    const hasSchedule = !!fs.lstatSync(path.join(sourceRoot, schedulePath), { throwIfNoEntry: false });
    const hasResult = !!fs.lstatSync(path.join(sourceRoot, resultPath), { throwIfNoEntry: false });
    const hasPin = Object.prototype.hasOwnProperty.call(pins, id);
    if (!hasSchedule) {
      if (hasResult || hasPin) throw Error('OFFICIAL_SCHEDULE_MISSING: ' + id);
      continue;
    }
    const entry = JSON.parse(read(schedulePath));
    if (C.validateSchedule(entry, { now }).length || entry.game.gameId !== id)
      throw Error('OFFICIAL_SCHEDULE_REJECTED: ' + id);
    if (entry.contextSnapshot != null) throw Error('PRIVATE_SNAPSHOT_MUST_NOT_SHIP: ' + id);
    if (entry.editorial != null || entry.source.rightsStatus !== 'LINK_ONLY' ||
        Object.keys(entry).some(key => !['schema', 'mode', 'validUntil', 'game', 'source', 'editorial', 'contextSnapshot'].includes(key)) ||
        Object.keys(entry.game).some(key => !['gameId', 'away', 'home', 'status', 'tipoff'].includes(key)) ||
        Object.keys(entry.source).some(key => !['schema', 'id', 'kind', 'originalUrl', 'publisher', 'observedAt', 'rightsStatus', 'accessMethod', 'contentFingerprint', 'language', 'verificationState', 'demo'].includes(key)))
      throw Error('NON_PUBLIC_SCHEDULE_FIELDS: ' + id);
    files.push(schedulePath);
    editions.push(navigationEntry(entry));
    if (!hasResult && !hasPin) continue;
    if (!hasResult) throw Error('OFFICIAL_FINAL_MISSING: ' + id);
    const final = JSON.parse(read(resultPath));
    if (C.validateGameResult(final, entry, pins[id], now).length)
      throw Error('OFFICIAL_FINAL_REJECTED: ' + id);
    files.push(resultPath);
  }
  return { files, editions };
}
function build(outDir, { readerV3Home = false } = {}) {
  const destination = path.resolve(outDir);
  if (destination === sourceRoot || destination === root || destination.startsWith(sourceRoot+path.sep))
    throw Error('UNSAFE_OUTPUT');
  if (fs.existsSync(destination)) throw Error('OUTPUT_MUST_NOT_EXIST');
  const { files: followUpFiles, editions } = officialGate();
  const { cleaned, files: activeAssets } = cleanRegistry(JSON.parse(read('data/asset-registry.json')));
  const fonts = fs.readdirSync(path.join(sourceRoot, 'assets/fonts'))
    .filter(name => /^([a-z0-9-]+\.woff2|LICENSE-[A-Za-z0-9-]+\.txt)$/.test(name))
    .map(name => 'assets/fonts/'+name).sort();
  const sourceFiles = [...ALLOW, ...followUpFiles, ...fonts, ...activeAssets];
  if (new Set(sourceFiles).size !== sourceFiles.length) throw Error('DUPLICATED_ALLOWLIST_PATH');
  sourceFiles.forEach(read); // fail closed before creating output
  const eligible = new Set([...sourceFiles, 'data/asset-registry.json',
    'data/asset-registry.js', 'js/production-config.js', VERCEL_ANALYTICS_SCRIPT]);
  // A typo or injected HTML dependency must fail the Vercel build itself,
  // not merely a test the Vercel build may never run.
  const publicPages = new Map();
  for (const file of sourceFiles.filter(rel => rel.endsWith('.html'))) {
    const source = readerV3Home && file === 'index.html' ? 'reader-v3.html' : file;
    const html = publicHtml(read(source));
    validatePublicDependencies(html, eligible);
    publicPages.set(file, Buffer.from(html));
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), '.mosport-public-'));
  const inventory = {};
  try {
    function put(rel, bytes) {
      const p = path.join(stage, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, bytes, { flag: 'wx', mode: 0o644 });
      inventory[rel] = hash(bytes);
    }
    for (const rel of sourceFiles) {
      put(rel, publicPages.get(rel) ?? read(rel));
    }
    put('data/asset-registry.json', Buffer.from(JSON.stringify(cleaned, null, 2)+'\n'));
    put('data/asset-registry.js', Buffer.from('/* M6 public-only registry (source: reviewed asset-registry.json) */\nwindow.MOSPORT_ASSET_REGISTRY = '+JSON.stringify(cleaned, null, 2)+';\n'));
    put('js/production-config.js', Buffer.from('/* Static public build; no private owner manifest and no DEMO providers. */\nwindow.MOSPORT_CONFIG = { mode: "production", defaultLanguage: "en", assetRegistryUrl: null, editions: ' + JSON.stringify(editions) + ' };\n'));
    put('.nojekyll', Buffer.alloc(0));
    const release = {
      schema: 'mosport-public-static@1',
      sourceCommit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'UNPINNED_LOCAL_BUILD',
      publicGameId: GAME_ID,
      resultReceipt: 'NBA-0022600051-R1',
      gameMode: 'production',
      teamLogos: 'abbreviation-fallback-until-rights-cleared',
      files: Object.fromEntries(Object.entries(inventory).sort(([a],[b]) => a.localeCompare(b)))
    };
    put('public-release-manifest.json', Buffer.from(JSON.stringify(release,null,2)+'\n'));
    fs.renameSync(stage, destination);
    return release;
  } catch(err) { fs.rmSync(stage,{recursive:true,force:true}); throw err; }
}
if (require.main === module) {
  try {
    const { positionals, values } = parseArgs({
      allowPositionals: true,
      options: { 'reader-v3-home': { type: 'boolean' } }
    });
    if (positionals.length > 1) throw Error('EXPECTED_ONE_OUTPUT_DIRECTORY');
    const out = positionals[0] || path.join(root, 'dist-public');
    const x = build(out, { readerV3Home: values['reader-v3-home'] });
    console.log('PUBLIC_VERCEL_CANDIDATE_OK files='+Object.keys(x.files).length+' sha='+x.sourceCommit);
  } catch(e) { console.error('PUBLIC_VERCEL_BLOCKED: '+e.message); process.exitCode=1; }
}
module.exports = { build, cleanRegistry, publicHtml, validatePublicDependencies, ALLOW, GAME_ID };
