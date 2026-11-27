/* Deterministic social card renderer (Trend-to-Content V1, #35 #7164029496).
 * Renders a text-and-graphics card from a JSON spec with Mosport's own assets only:
 * the owned brand mark (site/assets/brand/mosport-mark.svg), OFL fonts
 * (site/assets/fonts) and brand colour tokens. No network requests are allowed
 * (any non-file request aborts the render), no team logos, no player imagery.
 * Output PNGs are checked for exact pixel size and hashed (SHA-256). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SITE = path.resolve(__dirname, '..', 'site');
const SIZES = { 'instagram-4x5': [1080, 1350], 'threads-1x1': [1080, 1080] };
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw Error('NOT_PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

function html(spec, format) {
  const [w, h] = SIZES[format];
  const square = format === 'threads-1x1';
  const font = f => 'file://' + path.join(SITE, 'assets/fonts', f);
  const mark = fs.readFileSync(path.join(SITE, 'assets/brand/mosport-mark.svg'), 'utf8');
  const steps = spec.steps.map((s, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(s)}</span></li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url('${font('anton-latin-400-normal.woff2')}')}
@font-face{font-family:Barlow;font-weight:700;src:url('${font('barlow-condensed-latin-700-normal.woff2')}')}
@font-face{font-family:Inter;font-weight:500;src:url('${font('inter-latin-500-normal.woff2')}')}
@font-face{font-family:Inter;font-weight:700;src:url('${font('inter-latin-700-normal.woff2')}')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px}
body{background:#0B1A3D;color:#F3F1EB;font-family:Inter;position:relative;overflow:hidden;padding:${square ? 64 : 80}px}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(131,171,247,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(131,171,247,.07) 1px,transparent 1px);background-size:60px 60px}
.wrap{position:relative;height:100%;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:18px;font-family:Anton;font-size:44px;letter-spacing:2px}
.brand svg{width:64px;height:64px}
.kicker{font-family:Barlow;font-weight:700;font-size:${square ? 24 : 28}px;letter-spacing:3px;color:#83ABF7;text-transform:uppercase;text-align:right}
h1{font-family:Anton;font-weight:400;font-size:${square ? 104 : 112}px;line-height:.98;letter-spacing:1px;margin-top:${square ? 44 : 64}px;text-transform:uppercase}
h1 em{font-style:normal;color:#4C7DFF;display:block}
.lead{font-family:Barlow;font-weight:700;font-size:${square ? 30 : 36}px;letter-spacing:2px;text-transform:uppercase;color:#DCEAFF;margin-top:${square ? 32 : 44}px}
ol{list-style:none;margin-top:${square ? 18 : 28}px;border-top:3px solid #1F4FD0}
li{display:flex;gap:28px;align-items:baseline;padding:${square ? 14 : 18}px 0;border-bottom:1px solid rgba(220,234,255,.22);font-size:${square ? 34 : 40}px;font-weight:700}
li b{font-family:Anton;font-weight:400;color:#4C7DFF;font-size:${square ? 34 : 40}px;min-width:64px}
.note{margin-top:${square ? 22 : 28}px;font-size:${square ? 26 : 30}px;line-height:1.35;color:#E8EDF5;font-weight:500}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-size:22px;color:#A9B4C6;font-weight:500}
.url{font-family:Barlow;font-weight:700;font-size:${square ? 34 : 40}px;letter-spacing:2px;color:#F3F1EB}
.src{max-width:60%;text-align:right;line-height:1.35}
</style></head><body><div class="grid"></div><div class="wrap">
<div class="top"><div class="brand">${mark}<span>MOSPORT</span></div><div class="kicker">${esc(spec.kicker).replace(/\n/g, '<br>')}</div></div>
<h1>${esc(spec.headline)}<em>${esc(spec.headline2)}</em></h1>
<div class="lead">${esc(spec.lead)}</div><ol>${steps}</ol>
<div class="note">${esc(spec.note)}</div>
<div class="foot"><div class="url">${esc(spec.url)}</div><div class="src">${esc(spec.source)}</div></div>
</div></body></html>`;
}

async function render(spec, outDirArg) {
  const outDir = path.resolve(outDirArg);
  const { chromium } = require('playwright');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const out = {};
  try {
    for (const format of Object.keys(SIZES)) {
      const [w, h] = SIZES[format];
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const external = [];
      await page.route('**/*', r => { if (r.request().url().startsWith('file://') || r.request().url().startsWith('data:')) r.continue(); else { external.push(r.request().url()); r.abort(); } });
      const file = path.join(outDir, `${spec.slug}-${format}.html`);
      fs.writeFileSync(file, html(spec, format));
      await page.goto('file://' + file);
      await page.evaluate(() => document.fonts.ready);
      if (external.length) throw Error('EXTERNAL_REQUEST: ' + external.join(','));
      const overflow = await page.evaluate(() => { const f = document.querySelector('.foot').getBoundingClientRect(), n = document.querySelector('.note').getBoundingClientRect(); return f.bottom > innerHeight - 40 || n.bottom > f.top - 16; });
      if (overflow) throw Error('LAYOUT_OVERFLOW: ' + format);
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
      const [pw, ph] = pngSize(png);
      if (pw !== w || ph !== h) throw Error(`SIZE_MISMATCH ${format}: ${pw}x${ph}`);
      const name = `${spec.slug}-${format}.png`;
      fs.writeFileSync(path.join(outDir, name), png);
      fs.unlinkSync(file);
      out[format] = { file: name, width: w, height: h, sha256: sha256(png) };
      await page.close();
    }
  } finally { await browser.close(); }
  return out;
}

if (require.main === module) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  render(spec, process.argv[3]).then(o => console.log(JSON.stringify(o, null, 2))).catch(e => { console.error('RENDER_BLOCKED: ' + e.message); process.exitCode = 1; });
}
module.exports = { render, html, pngSize, SIZES };
