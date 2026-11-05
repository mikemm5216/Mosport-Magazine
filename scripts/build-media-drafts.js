'use strict';
// Read-only compilation to stdout. Does not save to editorial store or publish.
const fs=require('node:fs'), M=require('../site/internal/js/media-drafts.js');
try {
 const args=process.argv.slice(2),v={};
 const allowed=['--inspection','--pins','--mode','--now','--facts'];
 for(let i=0;i<args.length;i+=2){if(!allowed.includes(args[i]) || v[args[i]]!==undefined || !args[i+1] || args[i+1].startsWith('--'))throw new Error('INVALID_ARGUMENTS');v[args[i]]=args[i+1];}
 for(const key of ['--inspection','--pins','--mode'])if(!v[key])throw new Error('INSPECTION_TRUSTED_PINS_AND_MODE_REQUIRED');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),now=v['--now']||new Date().toISOString();
 const result=M.build(read(v['--inspection']),read(v['--pins']),{createdAt:now,mode:v['--mode']},now,v['--facts']?read(v['--facts']):undefined);
 console.log(JSON.stringify({clockMode:v['--now']?'EXPLICIT_REPLAY':'LIVE',result},null,2));if(!result.ok)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}
