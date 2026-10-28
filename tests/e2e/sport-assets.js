'use strict';
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();const out=path.resolve(__dirname,'../../artifacts/sport-assets');fs.mkdirSync(out,{recursive:true});let checks=0;
for(const w of [1440,390]){
 const c=await browser.newContext({viewport:{width:w,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+path.resolve(__dirname,'../../site/asset-catalog.html'));await p.evaluate(()=>document.fonts.ready);
 const imgs=await p.evaluate(async()=>Promise.all([...document.images].map(async i=>{try{await i.decode();return i.naturalWidth>0&&i.naturalHeight>0}catch{return false}})));
 assert.equal(imgs.length,277);assert.ok(imgs.every(Boolean));checks++;
 assert.equal(await p.locator('#cpbl figure').count(),6);checks++;
 assert.equal(await p.locator('#flags figure').count(),271);checks++;
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
 assert.deepEqual(errors,[]);checks++;
 await p.screenshot({path:path.join(out,'catalog-'+w+'.png')});
 await p.locator('#filter').fill('TW');assert.equal(await p.locator('#flags figure:visible').count(),1);assert.equal(await p.locator('#flags figure:visible').getAttribute('data-code'),'TW');checks++;
 await p.locator('#filter').fill('Japan');assert.equal(await p.locator('#flags figure:visible').getAttribute('data-code'),'JP');checks++;
 await p.locator('#filter').fill('GB-ENG');assert.equal(await p.locator('#flags figure:visible').count(),1);checks++;
 await p.locator('#filter').fill('no-such-country');assert.equal(await p.locator('#flags figure:visible').count(),0);checks++;
 await c.close();
}await browser.close();console.log(checks+' sport-asset browser checks passed');})().catch(e=>{console.error(e);process.exit(1)});
