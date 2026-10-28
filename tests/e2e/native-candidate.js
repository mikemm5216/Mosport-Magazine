'use strict';
const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const out=path.resolve(__dirname,'../../artifacts/native-v2');fs.mkdirSync(out,{recursive:true});
 let checks=0;
 for(const [name,w,h,file] of [['desktop',1440,900,'index.html'],['mobile',390,844,'index.html'],['match',1440,900,'match.html?game=DEMO-0041']]){
  const ctx=await browser.newContext({viewport:{width:w,height:h}});const page=await ctx.newPage();
  const url='file://'+path.resolve(__dirname,'../../site',file);
  const sep=file.includes('?')?'&':'?';
  await page.goto(url+sep+'art=candidate:native-illustration-v2');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(350);
  const states=await page.locator('mo-art').evaluateAll(es=>es.map(e=>({slot:e.dataset.slot,v:e.dataset.version,state:e.dataset.state})));
  assert.ok(await page.locator('mo-team-logo img').evaluateAll(is=>is.length>0&&is.every(i=>i.complete&&i.naturalWidth>0)));checks++;
  assert.ok(states.length);assert.ok(states.every(s=>s.v==='native-illustration-v2'&&s.state==='art'));checks++;
  assert.ok(await page.locator('mo-art img').evaluateAll(is=>is.length>0&&is.every(i=>i.complete&&i.naturalWidth>0)));checks++;
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
  const geometry=()=>page.locator('mo-art').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));
  const before=await geometry();
  await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight/2){scrollTo(0,y);await new Promise(r=>setTimeout(r,40))}scrollTo(0,0);await Promise.all([...document.images].map(i=>i.decode().catch(()=>null)))});
  await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
  await page.goto(url+sep+'art=fallback');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
  assert.deepEqual(await geometry(),before);checks++;
  await page.goto(url+sep+'art=candidate:native-illustration-v2&mode=production');
  assert.ok(await page.evaluate(()=>Object.keys(window.MOSPORT_REG.slots).every(id=>window.MOSPORT_REGISTRY.resolveArt(window.MOSPORT_REG,id,{mode:'production',preview:true,previewVersion:'native-illustration-v2'}).state==='fallback')));checks++;
  await ctx.close();
 }
 await browser.close();console.log(checks+' native-v2 browser checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
