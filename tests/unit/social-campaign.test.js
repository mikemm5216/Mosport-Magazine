'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../../scripts/build-public-release.js');
const { createDraft, writeDraft, publicSite } = require('../../scripts/prepare-social-campaign.js');
function withBuilt(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mosport-social-test-'));
  try {
    const dir = path.join(tmp,'public');
    build(dir);
    return fn(dir,tmp);
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
}
test('M6 Social campaign uses verified final and creates EN drafts, not external publications', () => withBuilt((dir,tmp) => {
  const draft = createDraft({publicDir:dir,siteUrl:'https://magazine.mosport.app/'});
  assert.equal(draft.schema,'mosport-media/social-campaign-draft@1');
  assert.equal(draft.status,'DRAFT_ONLY_NOT_AUTHORIZED_FOR_PUBLISH');
  assert.equal(draft.language,'en');
  assert.equal(draft.source.nbaGameId,'0022600051');
  assert.equal(draft.source.officialResultReceipt,'NBA-0022600051-R1');
  assert.match(draft.source.resultPin,/^[a-f0-9]{64}$/);
  assert.equal(draft.posts.length,3);
  assert.deepEqual(draft.posts.map(p=>p.channel), ['threads','x','instagram']);
  for (const post of draft.posts) {
    const url = new URL(post.trackableLandingUrl);
    assert.equal(url.origin,'https://magazine.mosport.app');
    assert.equal(url.searchParams.get('game'),'0022600051');
    assert.equal(url.searchParams.get('utm_source'),post.channel);
    assert.equal(url.searchParams.get('utm_medium'),'organic_social');
    assert.equal(url.searchParams.get('utm_campaign'),'mosport_beta0_launch');
    assert.match(post.text, post.channel === 'x' ? /LAL 106–104 SAC/ : /Lakers 106, Kings 104/);
    assert.match(post.text,/archive|archived/i);
    assert.equal(post.approval.state,'PENDING_HUMAN');
    assert.equal(post.publication.state,'NOT_POSTED');
    assert.equal(post.performance.state,'NOT_OBSERVED');
    assert.equal(url.searchParams.get('utm_content'),'0022600051-official-final');
    assert.equal(post.locale,'en');
    assert.equal(post.contentSha256,require('node:crypto').createHash('sha256').update(post.text).digest('hex'));
    assert.match(post.text,/Official final|official NBA result/);
    if (post.channel !== 'x') assert.match(post.text,/not live|not a live game/);
    assert.doesNotMatch(post.text,/\blive now\b|\btoday\b|\btonight\b/i);
    if (post.channel !== 'x') assert.match(post.text,/Nov 20, 2026 \(Pacific time\)/);
    assert.deepEqual(post.approval,{state:'PENDING_HUMAN',receiptRef:null});
    assert.deepEqual(post.publication,{state:'NOT_POSTED',platformPostId:null,platformUrl:null,publishedAt:null});
    // Unobserved metrics stay null; 0 would claim a measurement that never happened.
    assert.deepEqual(post.performance,{state:'NOT_OBSERVED',measuredAt:null,impressions:null,engagement:null,landingVisits:null});
    assert.equal(post.accountId,null);
  }
  const limits={threads:500,x:280,instagram:2200};
  for (const post of draft.posts) assert.ok(post.text.length <= limits[post.channel], post.channel+' length');
  assert.ok(draft.posts.find(p=>p.channel==='x').text.length <= 280);
  assert.equal(draft.posts.find(p=>p.channel==='instagram').assetRequired,true);
  const pathToDraft=path.join(tmp,'handoff.json');
  writeDraft(pathToDraft,draft,dir);
  assert.deepEqual(JSON.parse(fs.readFileSync(pathToDraft,'utf8')),draft);
  assert.throws(()=>writeDraft(pathToDraft,draft,dir),/OUTPUT_ALREADY_EXISTS/);
  assert.throws(()=>writeDraft(path.join(dir,'published.json'),draft,dir),/CANNOT_WRITE_IN_PUBLIC_ARTIFACT/);
}));
test('M6 Social refuses untrusted site base and tampered official artifacts',()=>withBuilt((dir) => {
  for(const url of ['http://mosport.app/','https://evil.example/',
    'https://mosport.app/track','https://mosport.app/?x=1','https://localhost/',
    'https://mosport.app.evil.example/']) {
    assert.throws(()=>publicSite(url),/SITE_/);
  }
  const rel='data/results/0022600051.json';
  const f=path.join(dir,rel);
  const raw=fs.readFileSync(f,'utf8');
  fs.writeFileSync(f,raw.replace('"homeScore": 106','"homeScore": 107'));
  assert.throws(()=>createDraft({publicDir:dir,siteUrl:'https://magazine.mosport.app/'}),
    /PUBLIC_FILE_PIN_MISMATCH/, 'cannot use altered result');
}));
test('M6 Social accepts only exact approved origins: no explicit port or look-alike Vercel project',()=>{
  for(const url of ['https://magazine.mosport.app:8443/','https://magazine.mosport.app:80/'])
    assert.throws(()=>publicSite(url),/SITE_PORT_NOT_APPROVED/,url);
  // The apex and www serve the Baseball site (Founder decision 2026-11-24, #35).
  for(const url of ['https://mosport.app/','https://www.mosport.app/','https://mosport-magazine.vercel.app/',
    'https://mosport-magazine-evil.vercel.app/','https://mosport-magazine-git-x-michael-mos-projects.vercel.app/',
    'https://magazine.mosport.app./','https://magazine.mosport.app.evil.example/','https://api.mosport.app/'])
    assert.throws(()=>publicSite(url),/SITE_HOST_NOT_MOSPORT/,url);
  assert.equal(publicSite('https://magazine.mosport.app:443/').href,'https://magazine.mosport.app/');
  assert.equal(publicSite('https://magazine.mosport.app').href,'https://magazine.mosport.app/');
});
test('M6 Social draft labels the release commit as a manifest claim, not a deployment binding',()=>withBuilt((dir)=>{
  const draft=createDraft({publicDir:dir,siteUrl:'https://magazine.mosport.app/'});
  assert.equal(draft.source.publicReleaseSourceCommitState,'MANIFEST_CLAIM_NOT_BOUND_TO_DEPLOYMENT');
  assert.equal(draft.landingVerification,'NOT_VERIFIED');
}));
test('M6 Social refuses a symlinked output path that resolves inside the public artifact',()=>withBuilt((dir,tmp)=>{
  const draft=createDraft({publicDir:dir,siteUrl:'https://magazine.mosport.app/'});
  fs.symlinkSync(path.join(dir,'data'),path.join(tmp,'into-public'));
  assert.throws(()=>writeDraft(path.join(tmp,'into-public','draft.json'),draft,dir),/CANNOT_WRITE_IN_PUBLIC_ARTIFACT/);
  assert.ok(!fs.existsSync(path.join(dir,'data','draft.json')));
  fs.symlinkSync(dir,path.join(tmp,'public-alias'));
  assert.throws(()=>writeDraft(path.join(dir,'draft.json'),draft,path.join(tmp,'public-alias')),/CANNOT_WRITE_IN_PUBLIC_ARTIFACT/);
  assert.throws(()=>writeDraft(path.join(tmp,'public-alias','draft.json'),draft,dir),/CANNOT_WRITE_IN_PUBLIC_ARTIFACT/);
  assert.ok(!fs.existsSync(path.join(dir,'draft.json')));
}));
test('M6 Social never overwrites a concurrent writer and never removes another writer temp file',()=>withBuilt((dir,tmp)=>{
  const draft=createDraft({publicDir:dir,siteUrl:'https://magazine.mosport.app/'});
  const out=path.join(tmp,'handoff.json');
  const foreign=[out+'.tmp',out+'.999.0000000000000000.tmp'];
  for(const f of foreign) fs.writeFileSync(f,'OTHER WRITER TEMP');
  const link=fs.linkSync;
  fs.linkSync=(from,to)=>{ fs.writeFileSync(to,'OTHER WRITER OUTPUT'); return link(from,to); };
  try { assert.throws(()=>writeDraft(out,draft,dir),/OUTPUT_ALREADY_EXISTS/); }
  finally { fs.linkSync=link; }
  assert.equal(fs.readFileSync(out,'utf8'),'OTHER WRITER OUTPUT');
  for(const f of foreign) assert.equal(fs.readFileSync(f,'utf8'),'OTHER WRITER TEMP');
  const out2=path.join(tmp,'handoff-2.json');
  writeDraft(out2,draft,dir);
  assert.deepEqual(JSON.parse(fs.readFileSync(out2,'utf8')),draft);
  assert.equal((fs.statSync(out2).mode & 0o777),0o600);
  const left=fs.readdirSync(tmp).filter(n=>n.endsWith('.tmp')).sort();
  assert.deepEqual(left,foreign.map(f=>path.basename(f)).sort(),'only the other writer temp files remain');
}));
test('M6 Social rejects an artifact whose manifest was rewritten to match altered schedule or result bytes',()=>{
  const C=require('../../site/js/contracts/contracts.js');
  const sha=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
  for (const [rel,edit] of [
    ['data/schedules/0022600051.json', s => { s.game.tipoff='2026-11-21T01:56:00Z'; s.source.contentFingerprint=C.sha256(C.canonical({game:s.game,originalUrl:s.source.originalUrl,observedAt:s.source.observedAt})); return s; }],
    ['data/results/0022600051.json', r => { r.homeScore=107; return r; }],
    ['data/results/0022600051.json', r => { r.confirmations.nba.observedAt='2026-11-21T06:00:00.000Z'; return r; }]
  ]) withBuilt((dir)=>{
    const file=path.join(dir,rel);
    const bytes=Buffer.from(JSON.stringify(edit(JSON.parse(fs.readFileSync(file,'utf8'))),null,2)+'\n');
    fs.writeFileSync(file,bytes);
    const mf=path.join(dir,'public-release-manifest.json');
    const manifest=JSON.parse(fs.readFileSync(mf,'utf8'));
    manifest.files[rel]=sha(bytes);
    fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n');
    assert.throws(()=>createDraft({publicDir:dir,siteUrl:'https://magazine.mosport.app/'}),/PUBLIC_FILE_NOT_REPO_SOURCE/,rel);
  });
});
