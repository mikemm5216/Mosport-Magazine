'use strict';
// Offline only. Never selects a latest revision or derives trusted pins from input.
const fs = require('node:fs');
const R = require('../site/js/contracts/locked-world.js');
try {
  const args = process.argv.slice(2), values = {};
  const allowed = ['--inspection','--pins','--now','--facts','--leaders'];
  for (let i=0;i<args.length;i+=2) {
    if (!allowed.includes(args[i]) || values[args[i]] !== undefined || !args[i+1] || args[i+1].startsWith('--')) throw new Error('INVALID_ARGUMENTS');
    values[args[i]]=args[i+1];
  }
  if (!values['--inspection'] || !values['--pins']) throw new Error('INSPECTION_AND_TRUSTED_PINS_REQUIRED');
  const read = p => JSON.parse(fs.readFileSync(p,'utf8'));
  const optional={};
  for (const key of ['facts','leaders']) if (values['--'+key]) optional[key]=read(values['--'+key]);
  const now=values['--now'] || new Date().toISOString();
  const result=R.inspect(read(values['--inspection']),read(values['--pins']),now,optional);
  console.log(JSON.stringify({clockMode:values['--now']?'EXPLICIT_REPLAY':'LIVE',now,result},null,2));
  if (result.status !== 'OK') process.exitCode=1;
} catch (error) { console.error(error.message); process.exitCode=1; }
