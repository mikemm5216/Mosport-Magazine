'use strict';
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();const out=path.resolve(__dirname,'../../artifacts/sport-assets');fs.mkdirSync(out,{recursive:true});let checks=0;
for(const w of [1440,390]){
 const c=await browser.newContext({viewport:{width:w,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+path.resolve(__dirname,'../../site/asset-catalog.html'));await p.evaluate(()=>document.fonts.ready);
 const imgs=await p.evaluate(async()=>Promise.all([...document.images].map(async i=>{try{await i.decode();return i.naturalWidth>0&&i.naturalHeight>0}catch{return false}})));
 assert.equal(imgs.length,506);assert.ok(imgs.every(Boolean));checks++;
 assert.equal(await p.locator('#cpbl figure').count(),6);checks++;
 assert.ok(await p.locator('#cpbl img').evaluateAll(is=>is.every(i=>i.naturalWidth===80&&i.naturalHeight===80&&i.getBoundingClientRect().width===80&&i.getBoundingClientRect().height===80)));checks++;
 assert.equal(await p.locator('#flags figure').count(),271);checks++;
 for(const [league,count] of [['nba',30],['mlb',30],['soccer',137],['nhl',32]]){assert.equal(await p.locator('#'+league+' figure').count(),count);checks++;}
 assert.ok(await p.locator('.logos img').evaluateAll(is=>is.length===235&&is.every(i=>i.naturalWidth===80&&i.naturalHeight===80&&i.getBoundingClientRect().width===80&&i.getBoundingClientRect().height===80)));checks++;
 for(const [id,count] of [['eng.1',20],['esp.1',20],['ita.1',20],['ger.1',18],['fra.1',18],['por.1',18],['ned.1',18],['legacy',5]]){await p.locator('#soccer-league').selectOption(id);assert.equal(await p.locator('#soccer figure:visible').count(),count);checks++;if(w===1440)await p.locator('#soccer-group').screenshot({path:path.join(out,'soccer-'+id.replace('.','-')+'.png')});}
 await p.locator('#soccer-league').selectOption('all');
 if(w===1440)for(const league of ['mlb','soccer','nhl'])await p.locator('#'+league+'-group').screenshot({path:path.join(out,league+'-80.png')});
 await p.evaluate(()=>scrollTo(0,0));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
 assert.deepEqual(errors,[]);checks++;
 assert.ok(!/undefined/.test(await p.locator('body').innerText()));checks++;
 await p.screenshot({path:path.join(out,'catalog-'+w+'.png')});
 await p.locator('#filter').fill('TW');assert.equal(await p.locator('#flags figure:visible').count(),1);assert.equal(await p.locator('#flags figure:visible').getAttribute('data-code'),'TW');checks++;
 await p.locator('#filter').fill('Japan');assert.equal(await p.locator('#flags figure:visible').getAttribute('data-code'),'JP');checks++;
 await p.locator('#filter').fill('GB-ENG');assert.equal(await p.locator('#flags figure:visible').count(),1);checks++;
 await p.locator('#filter').fill('no-such-country');assert.equal(await p.locator('#flags figure:visible').count(),0);checks++;
 await p.goto('file://'+path.resolve(__dirname,'../../site/index.html')+'?lang=en');
 assert.ok(/Soccer/i.test(await p.locator('.tb-sports').innerText()));assert.ok(!/Football/i.test(await p.locator('.tb-sports').innerText()));checks++;
 await c.close();
}await browser.close();console.log(checks+' sport-asset browser checks passed');})().catch(e=>{console.error(e);process.exit(1)});
