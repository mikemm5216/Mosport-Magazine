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
  const draft = createDraft({publicDir:dir,siteUrl:'https://mosport.app/'});
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
    assert.equal(url.origin,'https://mosport.app');
    assert.equal(url.searchParams.get('game'),'0022600051');
    assert.equal(url.searchParams.get('utm_source'),post.channel);
    assert.equal(url.searchParams.get('utm_medium'),'organic_social');
    assert.equal(url.searchParams.get('utm_campaign'),'mosport_beta0_launch');
    assert.match(post.text,/Lakers 106, Kings 104/);
    assert.match(post.text,/archive|archived/i);
    assert.equal(post.approval.state,'PENDING_HUMAN');
    assert.equal(post.publication.state,'NOT_POSTED');
    assert.equal(post.performance.state,'NOT_OBSERVED');
    assert.equal(post.publication.platformUrl,null);
    assert.equal(post.performance.impressions,null);
  }
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
  assert.throws(()=>createDraft({publicDir:dir,siteUrl:'https://mosport.app/'}),
    /PUBLIC_FILE_PIN_MISMATCH/, 'cannot use altered result');
}));
