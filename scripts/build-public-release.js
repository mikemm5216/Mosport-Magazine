/* M6: build an explicitly allowlisted, production-only Vercel artifact.
 * The repository's site/ contains demo fixtures, internal QA and rights-unknown
 * assets. Never publish site/ directly and never consume an owner edition. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'site');
const GAME_ID = '0022600051';
const ALLOW = [
  'index.html', 'schedule.html', 'match.html', 'review.html',
  'css/fonts.css', 'css/tokens.css', 'css/components.css', 'css/home.css', 'css/pages.css',
  'js/teams.nba.js', 'js/assets/registry.js', 'js/assets/loader.js',
  'js/components.js', 'js/i18n.js', 'js/contracts/contracts.js',
  'js/editorial/eligibility.js', 'js/reader.js',
  'js/pages/home.js', 'js/pages/schedule.js', 'js/pages/match.js', 'js/pages/review.js',
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
// Every tag that makes the browser fetch something, in any case and with any
// quoting, must name an allowlisted same-site relative file. Anchors are
// navigation, not fetched dependencies, and are not checked here.
// The tag body is quote-aware (a '>' inside a quoted value does not end the tag)
// and an attribute may follow whitespace, '/', or a closing quote, as browsers allow.
const DEPENDENCY_TAG = /<(?:script|link|img|source|iframe|frame|embed|object|audio|video|track|input|image|feimage|use|base)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const URL_ATTR = /[\s/"'](src|href|srcset|data|poster|xlink:href|imagesrcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
function dependencyUrls(tag) {
  const out = [];
  for (const a of tag.matchAll(URL_ATTR)) {
    const value = (a[2] ?? a[3] ?? a[4]).trim();
    if (/srcset$/i.test(a[1])) value.split(',').forEach(part => { const u = part.trim().split(/\s+/)[0]; if (u) out.push(u); });
    else out.push(value);
  }
  return out;
}
function validatePublicDependencies(html, eligible) {
  for (const t of html.matchAll(DEPENDENCY_TAG)) {
    if (/^<base\b/i.test(t[0])) throw Error('PUBLIC_DEPENDENCY_BASE: '+t[0]);
    for (const raw of dependencyUrls(t[0])) {
      const rel = raw.replace(/[?#].*$/, '');
      if (!rel || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//') || raw.startsWith('\\')
        || rel.startsWith('/') || rel.includes('\\') || rel.split('/').includes('..') || !eligible.has(rel)) {
        throw Error('PUBLIC_DEPENDENCY_MISSING: '+raw);
      }
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
function publicHtml(bytes) {
  let html = bytes.toString('utf8');
  html = html.replace(/<script\s+src="js\/fixtures\/[^"]+"><\/script>\s*/g, '');
  if (/js\/fixtures\//.test(html) || /owner-edition\.js/.test(html)) throw Error('UNSAFE_HTML_SCRIPT');
  const anchor = '<script src="js/assets/loader.js"></script>';
  if (html.split(anchor).length !== 2) throw Error('PRODUCTION_CONFIG_ANCHOR_MISSING');
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
}
function build(outDir) {
  const destination = path.resolve(outDir);
  if (destination === sourceRoot || destination === root || destination.startsWith(sourceRoot+path.sep))
    throw Error('UNSAFE_OUTPUT');
  if (fs.existsSync(destination)) throw Error('OUTPUT_MUST_NOT_EXIST');
  officialGate();
  const { cleaned, files: activeAssets } = cleanRegistry(JSON.parse(read('data/asset-registry.json')));
  const fonts = fs.readdirSync(path.join(sourceRoot, 'assets/fonts'))
    .filter(name => /^([a-z0-9-]+\.woff2|LICENSE-[A-Za-z0-9-]+\.txt)$/.test(name))
    .map(name => 'assets/fonts/'+name).sort();
  const sourceFiles = [...ALLOW, ...fonts, ...activeAssets];
  if (new Set(sourceFiles).size !== sourceFiles.length) throw Error('DUPLICATED_ALLOWLIST_PATH');
  sourceFiles.forEach(read); // fail closed before creating output
  const eligible = new Set([...sourceFiles, 'data/asset-registry.json',
    'data/asset-registry.js', 'js/production-config.js']);
  // A typo or injected HTML dependency must fail the Vercel build itself,
  // not merely a test the Vercel build may never run.
  for (const file of sourceFiles.filter(rel => rel.endsWith('.html'))) {
    validatePublicDependencies(publicHtml(read(file)), eligible);
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
      const bytes = read(rel);
      put(rel, rel.endsWith('.html') ? Buffer.from(publicHtml(bytes)) : bytes);
    }
    put('data/asset-registry.json', Buffer.from(JSON.stringify(cleaned, null, 2)+'\n'));
    put('data/asset-registry.js', Buffer.from('/* M6 public-only registry (source: reviewed asset-registry.json) */\nwindow.MOSPORT_ASSET_REGISTRY = '+JSON.stringify(cleaned, null, 2)+';\n'));
    put('js/production-config.js', Buffer.from('/* Static public build; no private owner manifest and no DEMO providers. */\nwindow.MOSPORT_CONFIG = { mode: "production", assetRegistryUrl: null };\n'));
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
    const out = process.argv[2] || path.join(root, 'dist-public');
    const x = build(out);
    console.log('PUBLIC_VERCEL_CANDIDATE_OK files='+Object.keys(x.files).length+' sha='+x.sourceCommit);
  } catch(e) { console.error('PUBLIC_VERCEL_BLOCKED: '+e.message); process.exitCode=1; }
}
module.exports = { build, cleanRegistry, publicHtml, validatePublicDependencies, ALLOW, GAME_ID };