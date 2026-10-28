'use strict';
/* B-P2-02 contracts: valid records pass; risky malformed ones are rejected with a reason. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { C, loadFixtures, clone } = require('./helpers.js');

const F = loadFixtures();
const codes = (probs) => probs.map((p) => p.code);
const item = () => clone(F.demo.items[1]);           // ED-NEWS-0007, BREAKING, human-approved
const source = () => clone(F.demo.sources[2]);       // official injury report
const approval = () => clone(F.demo.approvals[1]);   // RCPT-DEMO-002

test('sha256 matches Node crypto, including CJK and astral characters', () => {
  for (const s of ['', 'abc', '湖人主場較有利。', '😀 MOSPORT', 'x'.repeat(5000)]) {
    assert.equal(C.sha256(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'));
  }
});

test('canonical JSON is key-order independent', () => {
  assert.equal(C.canonical({ b: 1, a: [2, { d: 3, c: 4 }] }), C.canonical({ a: [2, { c: 4, d: 3 }], b: 1 }));
});

test('instants must be full ISO-8601 with a zone and a real calendar date', () => {
  for (const ok of ['2026-11-01T00:00:00Z', '2026-11-01T08:00:00+08:00', '2026-11-01T00:00Z', '2026-02-28T23:59:59.999Z']) assert.ok(!isNaN(C.parseInstant(ok)), ok);
  for (const bad of ['2026-11-01', '2026-11-01T00:00:00', '2026-02-30T00:00:00Z', '2026-11-01T24:00:00Z', '2026-13-01T00:00:00Z', '31/10/2026', '', null, 1793491200000]) {
    assert.ok(isNaN(C.parseInstant(bad)), String(bad));
  }
});

test('every record in the DEMO issue is valid against its schema', () => {
  const v = C.validateIssue(F.demo, { mode: 'prototype' });
  assert.deepEqual(v.fatal, []);
  assert.deepEqual(v.problems, []);
});

test('unsupported schema versions are rejected, per record and per issue', () => {
  const it = item(); it.schema = 'mosport-b/editorial-item@2';
  assert.deepEqual(codes(C.validateRecord('item', it)), ['SCHEMA_UNSUPPORTED']);
  assert.equal(C.validateIssue({ ...clone(F.demo), schema: 'x' }).fatal[0].code, 'SCHEMA_UNSUPPORTED');
});

test('unknown fields are rejected, so an embedded approval cannot ride along', () => {
  const it = item(); it.approval = { mode: 'HUMAN', approverId: 'me', approvedAt: '2026-10-31T00:00:00Z' };
  assert.ok(codes(C.validateRecord('item', it)).includes('UNKNOWN_FIELD'));
});

test('wrong types, bad enums and missing fields are reported', () => {
  const it = item();
  it.revision = '1'; it.type = 'GOSSIP'; delete it.sourceRefs; it.homeEligible = 'yes';
  const c = codes(C.validateRecord('item', it));
  for (const k of ['WRONG_TYPE', 'BAD_ENUM', 'MISSING_FIELD']) assert.ok(c.includes(k), k);
});

test('a PUBLISHED item needs publishedAt; validUntil must be after it', () => {
  const it = item(); it.publishedAt = null;
  assert.ok(codes(C.validateRecord('item', it)).includes('MISSING_TIME'));
  const it2 = item(); it2.validUntil = '2026-10-31T00:00:00Z';
  assert.ok(codes(C.validateRecord('item', it2)).includes('BAD_TIME'));
});

test('a GAME_ANALYSIS needs a World reference; other types may not carry one', () => {
  const lead = clone(F.demo.items[0]); lead.worldAnalysisRef = null;
  assert.ok(codes(C.validateRecord('item', lead)).includes('MISSING_FIELD'));
  const news = item(); news.worldAnalysisRef = 'DEMO-0041';
  assert.ok(codes(C.validateRecord('item', news)).includes('FIELD_NOT_ALLOWED'));
});

test('source URLs: only absolute http(s), no scripts, data, credentials or protocol-relative links', () => {
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<b>', '//evil.example/x', 'https://user:pw@evil.example/', 'https://a.example/"onmouseover=x', 'ftp://a.example/x']) {
    const s = source(); s.originalUrl = bad;
    assert.ok(codes(C.validateRecord('source', s)).includes('UNSAFE_URL'), bad);
  }
  const ok = source(); ok.originalUrl = 'https://www.nba.com/news/x?y=1#z';
  assert.deepEqual(C.validateRecord('source', ok), []);
});

test('a news source needs its original URL; a source cannot be published after it was observed', () => {
  const s = source(); s.originalUrl = null;
  assert.ok(codes(C.validateRecord('source', s)).includes('MISSING_FIELD'));
  const s2 = source(); s2.publishedAt = '2026-11-01T00:00:00Z';
  assert.ok(codes(C.validateRecord('source', s2)).includes('BAD_TIME'));
});

test('approval receipts: HUMAN needs an approver, AUTO may not name one', () => {
  const h = approval(); h.approverId = null;
  assert.ok(codes(C.validateRecord('approval', h)).includes('MISSING_FIELD'));
  const a = approval(); a.mode = 'AUTO';
  assert.ok(codes(C.validateRecord('approval', a)).includes('FIELD_NOT_ALLOWED'));
});

test('layout: one item cannot sit in two slots; at most three cover teasers', () => {
  const L = clone(F.demo.layout); L.stories = ['ED-NEWS-0007'];
  assert.ok(codes(C.validateRecord('layout', L)).includes('DUPLICATE_PLACEMENT'));
  const L2 = clone(F.demo.layout); L2.cover = ['a', 'b', 'c', 'd'];
  assert.ok(codes(C.validateRecord('layout', L2)).includes('TOO_MANY'));
});

test('prototype game: NOT_ISSUED carries no read; probability bounded; teams distinct', () => {
  const g = clone(F.demo.games[4]); g.world.homeWinProbability = 0.5;
  assert.ok(codes(C.validateRecord('game', g)).includes('FIELD_NOT_ALLOWED'));
  const g2 = clone(F.demo.games[0]); g2.world.homeWinProbability = 1.2;
  assert.ok(codes(C.validateRecord('game', g2)).includes('OUT_OF_RANGE'));
  const g3 = clone(F.demo.games[0]); g3.home = g3.away;
  assert.ok(codes(C.validateRecord('game', g3)).includes('BAD_FORMAT'));
  const g4 = clone(F.demo.games[0]); g4.home = 'LA"L';
  assert.ok(codes(C.validateRecord('game', g4)).includes('BAD_FORMAT'));
});

test('issue relations: dangling, mismatched, stale and rejected approvals are caught', () => {
  const v = (iss) => C.validateIssue(iss, { mode: 'prototype' }).problems.map((p) => p.id + ':' + p.code);
  const a = clone(F.demo); a.items[1].sourceRefs = ['src:nope'];
  assert.ok(v(a).includes('ED-NEWS-0007:DANGLING_REF'));
  const b = clone(F.demo); b.items[1].approvalReceiptRef = 'RCPT-DEMO-003';
  assert.ok(v(b).includes('ED-NEWS-0007:APPROVAL_MISMATCH'));
  const c = clone(F.demo); c.items[1].en.summary = 'changed after approval';
  assert.ok(v(c).includes('ED-NEWS-0007:APPROVAL_STALE'));
  const d = clone(F.demo); d.approvals[1].decision = 'REJECTED';
  assert.ok(v(d).includes('ED-NEWS-0007:APPROVAL_REJECTED'));
  const e = clone(F.demo); e.approvals[0].qa.rights = 'NOT_RUN';
  assert.ok(v(e).includes('ED-LEAD-0041:AUTO_QA_INCOMPLETE'));
  const f = clone(F.demo); f.items[1].publishedAt = '2026-10-31T21:00:00Z';
  assert.ok(v(f).includes('ED-NEWS-0007:BAD_TIME'), 'published before it was approved');
});

test('a retracted, disputed or contradicted source invalidates the items built on it; RESTORED clears it', () => {
  for (const state of ['RETRACTED', 'DISPUTED', 'CONTRADICTED', 'FALSE']) {
    const iss = clone(F.demo);
    iss.sourceEvents.push({ schema: C.SCHEMAS.sourceEvent, id: 'E1', sourceId: 'src:demo-official-injury-report', state, at: '2026-10-31T23:00:00Z', note: null, demo: true });
    const p = C.validateIssue(iss).problems.map((x) => x.id + ':' + x.code);
    assert.ok(p.includes('ED-NEWS-0007:SOURCE_INVALIDATED'), state);
  }
  const iss = clone(F.demo);
  iss.sourceEvents.push(
    { schema: C.SCHEMAS.sourceEvent, id: 'E1', sourceId: 'src:demo-official-injury-report', state: 'DISPUTED', at: '2026-10-31T23:00:00Z', note: null, demo: true },
    { schema: C.SCHEMAS.sourceEvent, id: 'E2', sourceId: 'src:demo-official-injury-report', state: 'RESTORED', at: '2026-10-31T23:30:00Z', note: null, demo: true });
  assert.deepEqual(C.validateIssue(iss).problems, []);
});

test('a source with BLOCKED rights cannot back a renderable item', () => {
  const iss = clone(F.demo); iss.sources[2].rightsStatus = 'BLOCKED';
  assert.ok(C.validateIssue(iss).problems.some((p) => p.id === 'ED-NEWS-0007' && p.code === 'SOURCE_RIGHTS_BLOCKED'));
});

test('duplicate ids anywhere in the issue are fatal', () => {
  for (const coll of ['items', 'games', 'sources', 'approvals']) {
    const iss = clone(F.demo); iss[coll].push(clone(iss[coll][0]));
    assert.equal(C.validateIssue(iss).fatal[0].code, 'DUPLICATE_ID', coll);
  }
});

test('a LIVE issue cannot carry B prototype World data; production refuses DEMO', () => {
  assert.equal(C.validateIssue({ ...clone(F.demo), mode: 'LIVE' }).fatal[0].code, 'PROTOTYPE_WORLD_IN_LIVE');
  assert.equal(C.validateIssue(clone(F.demo), { mode: 'production' }).fatal[0].code, 'DEMO_IN_PRODUCTION');
});

test('content hash binds the editorial content, not the workflow status', () => {
  const it = item();
  const h = C.contentHash(it);
  assert.equal(C.contentHash({ ...it, publishState: 'WITHDRAWN', publishedAt: null, approvalReceiptRef: null, revision: 9 }), h);
  assert.notEqual(C.contentHash({ ...it, zh: { ...it.zh, headline: '改' } }), h);
  assert.notEqual(C.contentHash({ ...it, riskTriggers: [] }), h);
  assert.notEqual(C.contentHash({ ...it, sourceRefs: [] }), h);
});
