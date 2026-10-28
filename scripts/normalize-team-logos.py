#!/usr/bin/env python3
"""Create reproducible 80px transparent team-mark derivatives; keep sources intact."""
from pathlib import Path
from PIL import Image
import copy,hashlib,json
SITE=Path(__file__).resolve().parents[1]/'site'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def normalize(file,league):
 source=SITE/file
 im=Image.open(source).convert('RGBA');bbox=im.getchannel('A').getbbox()
 if not bbox:raise ValueError('Empty mark: '+file)
 crop=im.crop(bbox);ratio=min(72/crop.width,72/crop.height)
 size=(max(1,round(crop.width*ratio)),max(1,round(crop.height*ratio)))
 mark=crop.resize(size,Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(80,80),(0,0,0,0));out.alpha_composite(mark,((80-size[0])//2,(80-size[1])//2))
 rel='assets/teams/normalized/'+league+'/'+source.name;p=SITE/rel;p.parent.mkdir(parents=True,exist_ok=True);out.save(p)
 return dict(file=rel,width=80,height=80,sha256=digest(p),bytes=p.stat().st_size,normalization={'canvas':[80,80],'contentBox':[72,72],'fit':'contain','position':'center','sourceFile':file,'sourceSha256':digest(source),'sourceSize':list(im.size),'sourceAlphaBounds':list(bbox)})
p=SITE/'data/asset-registry.json';reg=json.loads(p.read_text())
for slot in reg['teamLogos']['entries'].values():
 source=next(v for v in slot['versions'] if v['id']=='terminal-prototype-v1')
 v=copy.deepcopy(source);v.update(normalize(source['file'],'nba'));v['id']='normalized-80-v1';v['provenance']['note']='80×80 transparent derivative of preserved original; contain/center in 72×72 ink box; original rights unchanged.'
 slot['versions']=[x for x in slot['versions'] if x['id']!=v['id']]+[v];slot['activeVersion']=v['id']
reg['teamLogos']['deliver']['width']=80;reg['teamLogos']['deliver']['height']=80;reg['teamLogos']['deliver']['expectedFile']='assets/teams/normalized/nba/{code}.png'
reg['teamLogos']['note']='30 NBA active prototype marks use 80×80 normalized derivatives. Original Terminal files and their registry versions are preserved; rights remain UNVERIFIED.'
reg['registryVersion']='2026-10-28-normalized-80-v1';p.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n')
p=SITE/'data/cpbl-team-registry.json';cpbl=json.loads(p.read_text())
for a in cpbl['entries']:
 source=a.get('normalization',{}).get('sourceFile',a['file']);a.update(normalize(source,'cpbl'))
cpbl['logoStandard']={'width':80,'height':80,'contentBox':[72,72],'fit':'contain','position':'center'}
p.write_text(json.dumps(cpbl,ensure_ascii=False,indent=2)+'\n');p.with_suffix('.js').write_text('window.MOSPORT_CPBL_ASSETS = '+p.read_text().strip()+';\n')
print('Normalized 36 logos: 80×80 transparent canvas, 72×72 content box; sources preserved')
