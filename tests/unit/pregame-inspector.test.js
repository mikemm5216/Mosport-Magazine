'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../../site/js/contracts/contracts.js');
const W = require('../../site/js/contracts/world-a1.js');
const F = require('../../site/js/contracts/pregame-facts.js');
const world = require('../fixtures/a-world/synthetic-package.a.json');
const clone = x => JSON.parse(JSON.stringify(x));
function facts() {
  const missing = () => ({ status: 'MISSING', reason: 'ABSENT_OR_AMBIGUOUS' });
  const side = team => ({ team, overallRecord: {status:'OBSERVED',displayValue:'4-2'}, statistics:{avgPoints:{status:'OBSERVED',displayValue:'121.0'},avgRebounds:missing(),avgAssists:missing(),fieldGoalPct:missing(),threePointPct:missing()} });
  const body = {schema:'mosport/internal-pregame-facts@1',distribution:'INTERNAL_UNQUALIFIED',rights:'UNVERIFIED',worldState:'NOT_ISSUED',worldRevision:world.revision,asOf:world.asOf,lockAt:world.lockAt,validUntil:world.validUntil,lifecycle:world.lifecycle.state,game:world.game,source:world.evidence.receipt,sides:{home:side(world.game.home),away:side(world.game.away)}};
  return {...body,fingerprint:C.sha256(C.canonical(body))};
}
function mount(live = false) {
  class El { constructor(tag){ this.tag=tag; this.children=[]; this.dataset={}; this.listeners={}; this.value=''; this._text=''; } set textContent(v){this._text=v;this.children=[];} get textContent(){return this._text+this.children.map(x=>x.textContent).join(' ');} appendChild(x){this.children.push(x);} addEventListener(name,fn){this.listeners[name]=fn;} }
  const map = Object.fromEntries(['ap-out','ap-now','ap-file','ap-facts','ap-clock-mode'].map(id=>[id,new El('div')]));
  let clock = world.asOf, tick = () => {};
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } }
  const ctx={window:{MOSPORT_WORLD_A1:W,MOSPORT_PREGAME_FACTS:F},document:{getElementById:id=>map[id],createElement:tag=>new El(tag)},URLSearchParams,location:{search:live ? '' : '?now='+encodeURIComponent(world.asOf)},Date:Clock,JSON,setInterval:fn=>{ tick=fn; return 0; }};
  map.advance = value => { clock=value; tick(); };
  vm.runInNewContext(fs.readFileSync('site/internal/js/a-package.js','utf8'),ctx);
  return map;
}
async function upload(el,obj){ el.listeners.change({target:{files:[{text:()=>Promise.resolve(JSON.stringify(obj))}]}}); await new Promise(resolve=>setImmediate(resolve)); }
test('internal inspector shows bound facts only while current and removes them on expiry',async()=>{
  const e=mount();await upload(e['ap-file'],world);await upload(e['ap-facts'],facts());
  assert.match(e['ap-out'].textContent,/賽前來源事實/);assert.match(e['ap-out'].textContent,/121\.0/);assert.match(e['ap-out'].textContent,/未產生 World 預測/);
  e['ap-now'].value=world.validUntil;e['ap-now'].listeners.change();
  assert.match(e['ap-out'].textContent,/READ_STALE/);assert.doesNotMatch(e['ap-out'].textContent,/121\.0/);
});
test('internal inspector refuses altered facts without rendering the injected value',async()=>{
  const e=mount(),f=clone(facts());f.sides.home.statistics.avgPoints.displayValue='<script>alert(1)</script>';
  await upload(e['ap-file'],world);await upload(e['ap-facts'],f);
  assert.match(e['ap-out'].textContent,/FACT_FINGERPRINT_MISMATCH/);assert.doesNotMatch(e['ap-out'].textContent,/<script>/);
});

test('live inspector removes facts automatically when the source expires',async()=>{
  const e=mount(true);await upload(e['ap-file'],world);await upload(e['ap-facts'],facts());
  assert.match(e['ap-out'].textContent,/121\.0/);assert.match(e['ap-clock-mode'].textContent,/Live clock/);
  e.advance(world.validUntil);assert.match(e['ap-out'].textContent,/READ_STALE/);assert.doesNotMatch(e['ap-out'].textContent,/121\.0/);
});

test('editing the replay clock is not overwritten by live refresh',async()=>{
  const e=mount(true); await upload(e['ap-file'],world); await upload(e['ap-facts'],facts());
  e['ap-now'].value='2027-10'; e['ap-now'].listeners.input();
  e.advance(world.validUntil); assert.equal(e['ap-now'].value,'2027-10');
  assert.match(e['ap-clock-mode'].textContent,/Replay clock/); assert.doesNotMatch(e['ap-out'].textContent,/121\.0/);
});
