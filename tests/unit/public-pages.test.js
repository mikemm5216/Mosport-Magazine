/* M6 public GitHub Pages release-gate: no private content, no DEMO, no unlicensed logos. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { build, ALLOW } = require('../../scripts/build-public-pages.js');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
function walk(dir, base=dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory()
    ? walk(path.join(dir,e.name),base) : [path.relative(base,path.join(dir,e.name)).replaceAll(path.sep,'/')]);
}
function withTemp(fn) {const d=fs.mkdtempSync(path.join(os.tmpdir(),'mosport-public-test-'));try{return fn(d)}finally{fs.rmSync(d,{recursive:true,force:true})}}
test('M6 production build publishes only allowlisted files, exact source and trusted result', () => withTemp(dir => {
  const dest=path.join(dir,'public');
  const record=build(dest);
  assert.equal(record.schema, 'mosport-public-pages@1');
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
  const registry=JSON.parse(fs.readFileSync(path.join(dest,'data/asset-registry.json')));
  assert.deepEqual(registry.teamLogos.entries,{});
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
    assert.ok(!/js\/fixtures\//.test(html));
    assert.ok(!/owner-edition\.js/.test(html));
    assert.ok(html.indexOf('js/production-config.js')<html.indexOf('js/assets/loader.js'));
    for(const m of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"?#]+)"/g))
      assert.ok(shipped.includes(m[1]),file+' missing dependency '+m[1]);
  }
  for(const rel of [...(fs.readFileSync(path.join(dest,'css/fonts.css'),'utf8')).matchAll(/url\('\.\.\/([^']+)'\)/g)].map(m=>m[1]))
    assert.ok(shipped.includes(rel),'font referenced by CSS missing '+rel);
  assert.ok(!shipped.includes('site/data/schedules/0022600274.json'));
}));
test('M6 builder fails closed if output already exists or targets a repository source',()=>withTemp(dir => {
  const dest=path.join(dir,'public');fs.mkdirSync(dest);
  fs.writeFileSync(path.join(dest,'keep.txt'),'original');
  assert.throws(()=>build(dest),/OUTPUT_MUST_NOT_EXIST/);
  assert.equal(fs.readFileSync(path.join(dest,'keep.txt'),'utf8'),'original');
  assert.throws(()=>build(path.resolve(__dirname,'../../site')),/UNSAFE_OUTPUT/);
}));