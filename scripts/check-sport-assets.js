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
 if(a.file.endsWith('.png')){assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16),a.width);assert.equal(b.readUInt32BE(20),a.height);assert.ok(a.sourceUrl.startsWith('https://www.cpbl.com.tw/'));}
 else {const svg=b.toString();assert.match(svg,/<svg\b/);assert.doesNotMatch(svg,/<script|<foreignObject|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i);assert.equal(a.rights.licence,'MIT');}
}
for(const [stem,name] of [['cpbl-team-registry','MOSPORT_CPBL_ASSETS'],['flag-registry','MOSPORT_FLAG_ASSETS']]){const j=fs.readFileSync(path.join(site,'data',stem+'.json'),'utf8').trim();assert.equal(fs.readFileSync(path.join(site,'data',stem+'.js'),'utf8'),'window.'+name+' = '+j+';\n');}
assert.match(fs.readFileSync(path.join(site,'assets/flags/LICENSE.txt'),'utf8'),/Permission is hereby granted/);
console.log('Sport assets OK: 6 CPBL marks, 249 ISO flags + 22 additional symbols; hashes, dimensions, local copies and licence checked');
