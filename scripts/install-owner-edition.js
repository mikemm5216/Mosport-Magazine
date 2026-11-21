'use strict';
/* Install into the existing private Site checkout only. Caller verifies owner-only
   access with the hosting service immediately before every private deployment. */
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const contracts = require('../site/js/contracts/contracts.js');
const reader = require('../site/js/data/pregame-edition.js');

function install(directory, editionDirectory) {
  const dst = path.resolve(directory);
  const hosting = JSON.parse(fs.readFileSync(path.join(dst, '..', '.openai', 'hosting.json')));
  if (typeof hosting.project_id !== 'string' || contracts.sha256(hosting.project_id) !== '931ef1d41479dd5e299dc8f409fb1e73d4cef309603e82304856ea94d535589c' || path.basename(dst) !== hosting.static.directory) throw Error('Wrong private Site target');
  const source = path.resolve(editionDirectory);
  if (source === dst || source.startsWith(dst + path.sep)) throw Error('Edition source must be outside the hosting directory');
  const edition = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json')));
  const schedules = new Map();
  for (const [id, game] of Object.entries(edition.games)) {
    if (!/^\d{10}$/.test(id)) throw Error('Invalid schedule ID');
    const read = file => JSON.parse(fs.readFileSync(path.join(source, id, file)));
    const schedule = read('schedule.json');
    if (schedule.game.gameId !== id || reader.digest(schedule) !== game.pins.schedule ||
        contracts.validateSchedule(schedule,{now:new Date().toISOString()}).length) throw Error('Invalid official schedule');
    const files = {article:'article.json',INITIAL:'initial.json',FINAL:'final.json',scoreINITIAL:'score-initial.json',scoreFINAL:'score-final.json',
      exploration:'exploration.json',deskCopy:'desk-copy.json',explorationScore:'exploration-score.json'};
    for (const [key,file] of Object.entries(files)) {
      if (!game.pins[key]) continue;
      game[key]=read(file);
      if (reader.digest(game[key]) !== game.pins[key]) throw Error('Pin mismatch: ' + key);
    }
    const view=reader.editionGame(edition,schedule,null,new Date().toISOString());
    if (!view || !view.article || !view.stages.some(s => s.stage==='INITIAL') ||
        (game.FINAL && !view.stages.some(s => s.stage==='FINAL'))) throw Error('Invalid research or editorial data');
    if (['exploration','deskCopy','explorationScore'].some(key => Object.hasOwn(game.pins,key)) && !view.desks) {
      throw Error('Incomplete or invalid three-desk edition');
    }
    schedules.set(id,schedule);
  }
  // Overlay only changed reader modules. Preserve private logo assets and existing result pins.
  for (const file of ['js/app.js','js/data/pipeline.js','js/data/pregame-edition.js','js/pages/home.js','js/pages/schedule.js','js/pages/match.js','css/pages.css']) {
    fs.copyFileSync(path.join(base,'site',file),path.join(dst,file));
  }
  for (const [id,schedule] of schedules) {
    fs.writeFileSync(path.join(dst,'data/schedules',id+'.json'),JSON.stringify(schedule,null,2)+'\n');
  }
  fs.writeFileSync(path.join(dst,'js/data/owner-edition.js'),'window.MOSPORT_OWNER_EDITION='+JSON.stringify(edition)+';\n');
  for (const page of ['index','match','schedule','review']) {
    const file=path.join(dst,page+'.html'),anchor='<script src="js/data/pipeline.js"></script>';
    let html=fs.readFileSync(file,'utf8');
    if (!html.includes(anchor)) throw Error('Missing reader pipeline in '+file);
    if (!html.includes('js/data/owner-edition.js')) {
      html=html.replace(anchor, '<script src="js/data/pregame-edition.js"></script>\n<script src="js/data/owner-edition.js"></script>\n'+anchor);
      fs.writeFileSync(file,html);
    }
  }
}
if (require.main===module) {
  if (process.argv.length !== 4) throw Error('Usage: node scripts/install-owner-edition.js <private-staging-dist> <edition-input-directory>');
  install(process.argv[2],process.argv[3]);
}
module.exports={install};
