/* M6-SOCIAL: factual, human-approved campaign handoff; never posts to a platform.
 * Input is the already-reviewed public Vercel build, not owner-only materials.
 * Publishing and metrics belong to connected, user-authorized platforms. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const GAME = '0022600051';
const CAMPAIGN = 'mosport_beta0_launch';
const CHANNELS = ['threads', 'x', 'instagram'];

// Exact approved public origins only. A hostname pattern is not ownership: any
// Vercel user can register a project whose name matches 'mosport-magazine-*', and
// preview deployments may sit behind Vercel login. Matching here is not landing
// verification either; that stays NOT_VERIFIED until checked on the live page.
// Founder decision 2026-11-24 (#35 #7127647129): Mosport has ONE public origin,
// https://www.mosport.app. The apex only redirects there and no subdomain is a
// landing page. Until the approved cutover, www still serves the old site, so
// landingVerification stays NOT_VERIFIED.
const APPROVED_ORIGINS = new Set(['https://www.mosport.app']);
function publicSite(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw Error('SITE_URL_MUST_BE_VERIFIED_HTTPS_ORIGIN');
  // WHATWG URL drops the default :443, so any remaining port is non-default.
  if (url.port !== '') throw Error('SITE_PORT_NOT_APPROVED');
  if (!APPROVED_ORIGINS.has(url.origin)) throw Error('SITE_HOST_NOT_MOSPORT');
  return url;
}
function verifiedPublicRecord(dir) {
  if (!fs.lstatSync(dir).isDirectory() || fs.lstatSync(dir).isSymbolicLink())
    throw Error('PUBLIC_ARTIFACT_NOT_DIRECTORY');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'public-release-manifest.json'), 'utf8'));
  if (manifest.schema !== 'mosport-public-static@1' || manifest.gameMode !== 'production' ||
      manifest.publicGameId !== GAME || manifest.resultReceipt !== 'NBA-' + GAME + '-R1')
    throw Error('PUBLIC_MANIFEST_UNQUALIFIED');
  function verified(rel) {
    const expected = manifest.files && manifest.files[rel];
    if (!/^[a-f0-9]{64}$/.test(expected || '')) throw Error('PUBLIC_MANIFEST_MISSING_FILE: ' + rel);
    const file = path.join(dir, rel);
    if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())
      throw Error('PUBLIC_FILE_NOT_REGULAR: ' + rel);
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) !== expected) throw Error('PUBLIC_FILE_PIN_MISMATCH: ' + rel);
    // The manifest travels with the artifact and can be rewritten with it, so the
    // build's byte-identical copy must also match the reviewed source in this repo.
    if (sha256(fs.readFileSync(path.join(root, rel))) !== expected) throw Error('PUBLIC_FILE_NOT_REPO_SOURCE: ' + rel);
    return JSON.parse(bytes.toString('utf8'));
  }
  const root = path.resolve(__dirname, '..', 'site');
  const schedule = verified('data/schedules/' + GAME + '.json');
  const result = verified('data/results/' + GAME + '.json');
  // Reuse the one B-side contract and fixed official result pin. No new score engine.
  const C = require(path.join(root, 'js/contracts/contracts.js'));
  const pins = require(path.join(root, 'js/data/result-pins.js'));
  const now = new Date().toISOString();
  if (C.validateSchedule(schedule, { now }).length ||
      C.validateGameResult(result, schedule, pins[GAME], now).length ||
      schedule.contextSnapshot !== null) throw Error('OFFICIAL_SOURCE_NOT_QUALIFIED');
  if (result.receiptRef !== manifest.resultReceipt || result.status !== 'FINAL' ||
      result.officialUrl !== schedule.source.originalUrl) throw Error('RECEIPT_OR_LINK_MISMATCH');
  if (result.awayScore !== 104 || result.homeScore !== 106 ||
      result.away !== 'SAC' || result.home !== 'LAL') throw Error('UNEXPECTED_OFFICIAL_RESULT');
  return { manifest, schedule, result, pin: pins[GAME].digest };
}
function createDraft(opts) {
  const dir = path.resolve(opts.publicDir);
  const base = publicSite(opts.siteUrl);
  const record = verifiedPublicRecord(dir);
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles'
  }).format(new Date(record.schedule.game.tipoff));
  function link(channel) {
    const dest = new URL('match.html', base);
    dest.searchParams.set('game', GAME);
    dest.searchParams.set('utm_source', channel);
    dest.searchParams.set('utm_medium', 'organic_social');
    dest.searchParams.set('utm_campaign', CAMPAIGN);
    dest.searchParams.set('utm_content', GAME + '-official-final');
    return dest.href;
  }
  const fact = 'NBA archive · ' + date + ' (Pacific time): Lakers 106, Kings 104. Official final, not live.';
  const copy = {
    threads: fact + '\nMOSPORT keeps verified game facts separate from analysis that has not been published. ' +
      'See the source-backed game page: ' + link('threads'),
    x: 'NBA archive: LAL 106–104 SAC. Official final. ' + link('x'),
    instagram: fact + '\nMOSPORT: evidence first. An archived official NBA result, not a live game. ' +
      'See the game page via our bio link. #NBA #MOSPORT'
  };
  if (copy.x.length > 280 || copy.threads.length > 500 || copy.instagram.length > 2200)
    throw Error('SOCIAL_COPY_EXCEEDS_PLATFORM_LIMIT');
  const posts = CHANNELS.map(channel => ({
    channel, locale: 'en', text: copy[channel], contentSha256: sha256(copy[channel]),
    trackableLandingUrl: link(channel),
    assetRequired: channel === 'instagram',
    media: null, accountId: null, approval: { state: 'PENDING_HUMAN', receiptRef: null },
    publication: { state: 'NOT_POSTED', platformPostId: null, platformUrl: null, publishedAt: null },
    performance: { state: 'NOT_OBSERVED', measuredAt: null, impressions: null, engagement: null, landingVisits: null }
  }));
  return {
    schema: 'mosport-media/social-campaign-draft@1',
    status: 'DRAFT_ONLY_NOT_AUTHORIZED_FOR_PUBLISH',
    campaignId: CAMPAIGN, language: 'en',
    source: {
      nbaGameId: GAME, officialResultReceipt: record.result.receiptRef,
      resultPin: record.pin, officialUrl: record.result.officialUrl,
      sourceObservedAt: record.result.confirmations.nba.observedAt,
      publicReleaseSourceCommit: record.manifest.sourceCommit,
      // Read from the manifest only; nothing here proves which commit is deployed.
      publicReleaseSourceCommitState: 'MANIFEST_CLAIM_NOT_BOUND_TO_DEPLOYMENT'
    },
    siteUrl: base.href, landingVerification: 'NOT_VERIFIED', posts,
    distributionRule: 'Human approval and platform authorization required for every external post'
  };
}
// Containment is judged on real paths, so a symlinked parent cannot point back
// into the public artifact. The draft is published with link(), which never
// replaces an existing file, and each call uses its own temp name, so concurrent
// writers cannot overwrite each other's output or delete each other's temp file.
function writeDraft(target, draft, publicDir) {
  const out = path.resolve(target);
  let root, parent;
  try { root = fs.realpathSync(publicDir); } catch (_) { throw Error('PUBLIC_ARTIFACT_NOT_DIRECTORY'); }
  try { parent = fs.realpathSync(path.dirname(out)); } catch (_) { throw Error('OUTPUT_PARENT_MISSING'); }
  const real = path.join(parent, path.basename(out));
  const roots = [root, path.resolve(publicDir)];
  const inside = p => roots.some(r => p === r || p.startsWith(r + path.sep));
  if (inside(out) || inside(real)) throw Error('CANNOT_WRITE_IN_PUBLIC_ARTIFACT');
  if (fs.existsSync(real)) throw Error('OUTPUT_ALREADY_EXISTS');
  const temp = real + '.' + process.pid + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
  let created = false;
  try {
    fs.writeFileSync(temp, JSON.stringify(draft, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    created = true;
    try { fs.linkSync(temp, real); }
    catch (e) { if (e.code === 'EEXIST') throw Error('OUTPUT_ALREADY_EXISTS'); throw e; }
  } finally {
    if (created) { try { fs.unlinkSync(temp); } catch (_) { /* already gone */ } }
  }
}
if (require.main === module) {
  try {
    if (process.argv.length !== 5) throw Error('USAGE: node scripts/prepare-social-campaign.js <dist-public> <https-site-origin> <out-json>');
    const draft = createDraft({ publicDir: process.argv[2], siteUrl: process.argv[3] });
    writeDraft(process.argv[4], draft, process.argv[2]);
    console.log('SOCIAL_DRAFT_CREATED_NOT_PUBLISHED ' + draft.campaignId +
      ' posts=' + draft.posts.length + ' source=' + draft.source.nbaGameId);
  } catch (e) { console.error('SOCIAL_DRAFT_BLOCKED: ' + e.message); process.exitCode = 1; }
}
module.exports = { createDraft, writeDraft, publicSite, verifiedPublicRecord };
