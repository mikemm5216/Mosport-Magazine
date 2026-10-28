'use strict';
/*
 * B-P3-01 local persistence: the workflow's event log as a JSON file.
 *
 *   save(path, workflow)  writes atomically (temp file + rename) and refuses to
 *                         replace a file whose events are not a prefix of the new
 *                         log (append-only: history cannot be rewritten through save)
 *   load(path, opts)      replays and re-validates every event (createWorkflow.fromJSON)
 *
 * This guards against accidental rewrites on one machine. It is NOT tamper-proof
 * storage: anyone with file access can replace the file. Production needs
 * server-side, access-controlled, append-only storage (ADR-B003).
 */
const fs = require('node:fs');
const path = require('node:path');
const { createWorkflow } = require('../../site/internal/js/workflow.js');

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function save(file, wf) {
  const next = wf.toJSON();
  if (fs.existsSync(file)) {
    const prev = read(file);
    const a = prev.events || [], b = next.events;
    if (a.length > b.length || a.some((e, i) => e.hash !== b[i].hash)) {
      const err = new Error('APPEND_ONLY_VIOLATION: the saved log is not a prefix of the new one');
      err.code = 'APPEND_ONLY_VIOLATION';
      throw err;
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 1));
  fs.renameSync(tmp, file);
  return next.events.length;
}

function load(file, opts) {
  return createWorkflow.fromJSON(read(file), opts);
}

module.exports = { save, load };
