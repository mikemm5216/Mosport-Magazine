'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const SITE='/home/user/mosport-magazine/site';
const font=f=>'file://'+path.join(SITE,'assets/fonts',f);
const ART='file:///home/user/mosport-magazine/site/assets/art/cover-desktop-art.v1-claude-crop.webp';
const mark=fs.readFileSync(path.join(SITE,'assets/brand/mosport-mark.svg'),'utf8');
function html(sq){const [w,h]=sq?[1080,1080]:[1080,1350];const P=sq?72:84;
return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url('${font('anton-latin-400-normal.woff2')}')}
@font-face{font-family:Barlow;font-weight:700;src:url('${font('barlow-condensed-latin-700-normal.woff2')}')}
@font-face{font-family:Inter;font-weight:500;src:url('${font('inter-latin-500-normal.woff2')}')}
@font-face{font-family:Inter;font-weight:700;src:url('${font('inter-latin-700-normal.woff2')}')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px}
body{background:linear-gradient(180deg,rgba(7,18,48,.55) 0%,rgba(7,18,48,.05) 22%,rgba(7,18,48,.35) ${sq?42:45}%,rgba(7,18,48,.93) ${sq?66:68}%,#071230 100%),linear-gradient(90deg,rgba(7,18,48,.75) 0%,rgba(7,18,48,.15) 55%,rgba(7,18,48,0) 100%),url('${ART}') ${sq?'right 30%':'right 18%'}/${sq?'115%':'110%'} auto no-repeat,#071230;color:#F3F1EB;font-family:Inter;overflow:hidden;padding:${P}px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:16px;font-family:Anton;font-size:40px;letter-spacing:2px}
.brand svg{width:56px;height:56px}
.tag{font-family:Barlow;font-weight:700;font-size:26px;letter-spacing:4px;color:#0B1A3D;background:#83ABF7;padding:8px 16px;border-radius:6px;text-transform:uppercase}
.mid{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:0 0 ${sq?28:44}px}.hero{}
.eyebrow{text-shadow:0 2px 12px rgba(0,0,0,.6);font-family:Barlow;font-weight:700;font-size:${sq?30:34}px;letter-spacing:5px;color:#83ABF7;text-transform:uppercase}
.big{font-family:Anton;font-size:${sq?250:330}px;line-height:.9;letter-spacing:-2px;margin-top:${sq?8:16}px;background:linear-gradient(180deg,#FFFFFF 0%,#BFD3FF 100%);-webkit-background-clip:text;color:transparent}
.big small{font-size:.42em;letter-spacing:0;margin-left:10px;color:#4C7DFF;-webkit-text-fill-color:#4C7DFF}
.sub{text-shadow:0 2px 16px rgba(0,0,0,.6);font-family:Anton;font-size:${sq?52:60}px;text-transform:uppercase;letter-spacing:1px;margin-top:${sq?10:18}px}
.sub b{color:#4C7DFF;font-weight:400}
.tiles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:${sq?36:60}px}
.t{background:rgba(11,26,61,.78);border:1px solid rgba(131,171,247,.35);backdrop-filter:blur(6px);border-radius:14px;padding:${sq?20:26}px 22px}
.t .n{font-family:Anton;font-size:${sq?60:68}px;line-height:1;color:#F3F1EB}
.t .l{margin-top:10px;font-size:${sq?21:23}px;line-height:1.3;color:#C9D6EE;font-weight:500}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.url{font-family:Barlow;font-weight:700;font-size:34px;letter-spacing:2px}
.src{text-align:right;font-size:20px;line-height:1.4;color:#A9B4C6;font-weight:500}
</style></head><body>
<div class="top"><div class="brand">${mark}<span>MOSPORT</span></div><div class="tag">NBA · Month one</div></div>
<div class="mid"><div class="hero"><div class="eyebrow">2026-27 · U.S. viewers, per the league</div>
<div class="big">75M<small>+</small></div>
<div class="sub">The NBA's <b>biggest first month.</b></div></div>
<div class="tiles">
<div class="t"><div class="n">+20%</div><div class="l">total viewers, year over year</div></div>
<div class="t"><div class="n">2.62M</div><div class="l">average for national games</div></div>
<div class="t"><div class="n">+50%</div><div class="l">viewership, adults 18&#8209;34</div></div></div></div>
<div class="foot"><div class="url">www.mosport.app</div><div class="src">Nielsen updated its measurement methods in 2026.<br>Sources: NBA.com (Nov 23); Nielsen (Aug 19), 2026.</div></div>
</body></html>`}
(async()=>{const b=await chromium.launch();for(const [name,sq] of [['threads-1x1',true],['instagram-4x5',false]]){
const p=await b.newPage({viewport:sq?{width:1080,height:1080}:{width:1080,height:1350}});
await p.route('**/*',r=>r.request().url().startsWith('file:')||r.request().url().startsWith('data:')?r.continue():r.abort());
const f=path.join(__dirname,name+'.html');fs.writeFileSync(f,html(sq));await p.goto('file://'+f);await p.evaluate(()=>document.fonts.ready);
const over=await p.evaluate(()=>{const f=document.querySelector('.foot').getBoundingClientRect(),t=document.querySelector('.tiles').getBoundingClientRect(),m=document.querySelector('.mid');return t.bottom+16>f.top||m.scrollHeight>m.clientHeight+1||document.body.scrollWidth>document.body.clientWidth});
const out=path.join(__dirname,'bg-'+name+'.png');await p.screenshot({path:out});console.log(name,over?'OVERFLOW':'ok',crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex'));}
await b.close()})();
