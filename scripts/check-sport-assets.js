'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'../site');
const cpbl=JSON.parse(fs.readFileSync(path.join(site,'data/cpbl-team-registry.json'))),flags=JSON.parse(fs.readFileSync(path.join(site,'data/flag-registry.json')));
assert.deepEqual(cpbl.entries.map(x=>x.providerCode).sort(),['AAA','ACN','ADD','AEO','AJL','AKP']);
assert.equal(flags.entries.filter(x=>x.iso3166Alpha2).length,249);assert.equal(flags.entries.length,271);
assert.ok(flags.entries.some(x=>x.code==='TW'));assert.ok(flags.entries.some(x=>x.code==='GB-ENG'));
const seen=new Set();
for(const a of [...cpbl.entries,...flags.entries]){
 assert.ok(!seen.has(a.file));seen.add(a.file);assert.ok(a.file.startsWith('assets/')&&!a.file.includes('..'));
 const b=fs.readFileSync(path.join(site,a.file));assert.ok(b.length>0);assert.equal(b.length,a.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);
 if(a.file.endsWith('.png')){assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16),a.width);assert.equal(b.readUInt32BE(20),a.height);assert.ok(a.sourceUrl.startsWith('https://www.cpbl.com.tw/'));assert.equal(a.width,80);assert.equal(a.height,80);const src=fs.readFileSync(path.join(site,a.normalization.sourceFile));assert.equal(crypto.createHash('sha256').update(src).digest('hex'),a.normalization.sourceSha256);}
 else {const svg=b.toString();assert.match(svg,/<svg\b/);assert.doesNotMatch(svg,/<script|<foreignObject|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i);assert.equal(a.rights.licence,'MIT');}
}
for(const [stem,name] of [['cpbl-team-registry','MOSPORT_CPBL_ASSETS'],['flag-registry','MOSPORT_FLAG_ASSETS']]){const j=fs.readFileSync(path.join(site,'data',stem+'.json'),'utf8').trim();assert.equal(fs.readFileSync(path.join(site,'data',stem+'.js'),'utf8'),'window.'+name+' = '+j+';\n');}
assert.match(fs.readFileSync(path.join(site,'assets/flags/LICENSE.txt'),'utf8'),/Permission is hereby granted/);
const nba=JSON.parse(fs.readFileSync(path.join(site,'data/asset-registry.json')));
for(const slot of Object.values(nba.teamLogos.entries)){
 const a=slot.versions.find(v=>v.id===slot.activeVersion),b=fs.readFileSync(path.join(site,a.file));
 assert.equal(a.width,80);assert.equal(a.height,80);assert.equal(b.readUInt32BE(16),80);assert.equal(b.readUInt32BE(20),80);
 const src=fs.readFileSync(path.join(site,a.normalization.sourceFile));assert.equal(crypto.createHash('sha256').update(src).digest('hex'),a.normalization.sourceSha256);
}
const multi=JSON.parse(fs.readFileSync(path.join(site,'data/multi-sport-team-registry.json')));
assert.deepEqual(Object.fromEntries(Object.entries(multi.groups).map(([k,v])=>[k,v.length])),{mlb:30,nhl:32,soccer:137});
const ids=new Set();
for(const entries of Object.values(multi.groups))for(const a of entries){
 assert.ok(!ids.has(a.id));ids.add(a.id);
 const b=fs.readFileSync(path.join(site,a.file)),src=fs.readFileSync(path.join(site,a.sourceFile));
 assert.equal(b.readUInt32BE(16),80);assert.equal(b.readUInt32BE(20),80);assert.equal(a.width,80);assert.equal(a.height,80);
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+src.length+'\0'),src])).digest('hex'),a.sourceBlob);
}
assert.equal(multi.groups.mlb.filter(a=>a.aliases.includes('OAK')).length,1);
assert.equal(multi.groups.mlb.find(a=>a.code==='ATH').mlbTeamId,133);
assert.equal(multi.groups.nhl.find(a=>a.code==='UTA').name,'Utah Mammoth');
const soccerIds=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/assets/soccer-team-identities.json'))).entries;
for(const a of multi.groups.soccer){const identity=soccerIds.find(x=>x.assetId===a.id);assert.ok(identity);assert.equal(a.providerTeamId,identity.providerTeamId);assert.equal(a.sourceUrl,identity.logoUrl);assert.ok(a.sourceFile.includes('/soccer-verified/'));}
for(const a of multi.groups.nhl){const svg=fs.readFileSync(path.join(site,a.vectorSourceFile));assert.equal(crypto.createHash('sha256').update(svg).digest('hex'),a.vectorSourceSha256);assert.ok(a.sourceUrl.startsWith('https://assets.nhle.com/logos/nhl/svg/'));}

assert.equal(fs.readFileSync(path.join(site,'data/multi-sport-team-registry.js'),'utf8'),'window.MOSPORT_MULTI_SPORT_ASSETS = '+fs.readFileSync(path.join(site,'data/multi-sport-team-registry.json'),'utf8').trim()+';\n');
for(const l of multi.soccerCoverage.leagueSnapshots){assert.equal(l.teamIds.length,l.expectedCount);assert.equal(multi.groups.soccer.filter(a=>a.leagueIds.includes(l.id)).length,l.expectedCount);}
assert.equal(multi.soccerCoverage.topFiveCount,96);assert.equal(multi.soccerCoverage.sevenLeagueCount,132);assert.equal(new Set(multi.groups.soccer.map(a=>a.providerTeamId)).size,137);
console.log('Sport assets OK: 6 CPBL marks, 249 ISO flags + 22 additional symbols; hashes, dimensions, local copies and licence checked');
