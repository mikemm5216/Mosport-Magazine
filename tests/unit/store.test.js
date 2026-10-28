'use strict';
/* B-P2-02 content store: references, revisions, history, injected clock, replay. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { C, loadFixtures, clone } = require('./helpers.js');
const { createStore } = require('../../site/internal/js/store.js');

const F = loadFixtures();
function clock(start = '2026-10-31T12:00:00Z') {
  let t = Date.parse(start);
  return () => { t += 60000; return new Date(t).toISOString(); };
}
const draft = (id, extra = {}) => Object.assign(clone(F.demo.items.find((i) => i.id === id)), { publishState: 'DRAFT', publishedAt: null, approvalReceiptRef: null }, extra);
function seeded() {
  const s = createStore({ clock: clock() });
  F.demo.sources.forEach((x) => assert.ok(s.addSource(clone(x)).ok));
  assert.ok(s.putGames(clone(F.demo.games)).ok);
  return s;
}

test('the injected clock stamps events; a non-ISO clock is refused', () => {
  const s = seeded();
  assert.equal(s.log()[0].at, '2026-10-31T12:01:00.000Z');
  const bad = createStore({ clock: () => 'noon' });
  assert.throws(() => bad.addSource(clone(F.demo.sources[0])), /non-ISO/);
});

test('duplicate source ids, invalid records and dangling references are rejected', () => {
  const s = seeded();
  assert.equal(s.addSource(clone(F.demo.sources[0])).code, 'DUPLICATE_ID');
  const bad = clone(F.demo.sources[2]); bad.id = 'src:new'; bad.originalUrl = 'javascript:x';
  assert.equal(s.addSource(bad).code, 'INVALID_RECORD');
  assert.equal(s.saveItem(draft('ED-NEWS-0007', { sourceRefs: ['src:missing'] })).code, 'DANGLING_REF');
  const lead = draft('ED-LEAD-0041', { worldAnalysisRef: 'DEMO-9999' });
  assert.equal(s.saveItem(lead).code, 'DANGLING_REF');
  assert.equal(s.recordSourceEvent({ schema: C.SCHEMAS.sourceEvent, id: 'E', sourceId: 'src:missing', state: 'RETRACTED', at: '2026-10-31T13:00:00Z', note: null, demo: true }).code, 'DANGLING_REF');
});

test('a revision is content only: a record arriving as PUBLISHED or with an approval is refused', () => {
  const s = seeded();
  assert.equal(s.saveItem(clone(F.demo.items[1])).code, 'STATUS_NOT_CONTENT');
  assert.ok(s.saveItem(draft('ED-NEWS-0007')).ok);
});

test('revisions must advance one by one; a stale editor gets REVISION_CONFLICT', () => {
  const s = seeded();
  assert.ok(s.saveItem(draft('ED-NEWS-0007'), { expectedRevision: 0 }).ok);
  assert.equal(s.saveItem(draft('ED-NEWS-0007', { revision: 3 })).code, 'REVISION_CONFLICT');
  const r2 = draft('ED-NEWS-0007', { revision: 2 }); r2.en.summary = 'second';
  assert.ok(s.saveItem(r2, { expectedRevision: 1 }).ok);
  const late = draft('ED-NEWS-0007', { revision: 2 }); late.en.summary = 'stale edit';
  assert.equal(s.saveItem(late, { expectedRevision: 1 }).code, 'REVISION_CONFLICT');
  assert.equal(s.itemHistory('ED-NEWS-0007').length, 2);
  assert.equal(s.itemHistory('ED-NEWS-0007')[0].en.summary, 'Latest injury update and what it changes', 'history kept, not overwritten');
});

test('an item keeps its type; a correction must point at an earlier revision that exists', () => {
  const s = seeded();
  s.saveItem(draft('ED-NEWS-0007'));
  assert.equal(s.saveItem(draft('ED-NEWS-0007', { revision: 2, type: 'FEATURE' })).code, 'TYPE_CHANGED');
  assert.ok(s.saveItem(draft('ED-NEWS-0007', { revision: 2, correctionOfRevision: 1 })).ok);
});

test('approvals bind to one revision and its exact content hash', () => {
  const s = seeded();
  s.saveItem(draft('ED-NEWS-0007'));
  const a = clone(F.demo.approvals[1]);
  a.contentHash = s.itemHash('ED-NEWS-0007', 1);
  assert.ok(s.addApproval(a).ok);
  assert.equal(s.addApproval(a).code, 'DUPLICATE_ID');
  const wrong = clone(a); wrong.id = 'RCPT-X'; wrong.contentHash = 'f'.repeat(64);
  assert.equal(s.addApproval(wrong).code, 'APPROVAL_STALE');
  const missing = clone(a); missing.id = 'RCPT-Y'; missing.itemRevision = 2;
  assert.equal(s.addApproval(missing).code, 'DANGLING_REF');
});

test('layout plans: references must exist and fit the slot; revisions are checked', () => {
  const s = seeded();
  ['ED-LEAD-0041', 'ED-NEWS-0007', 'ED-REV-0040', 'ED-STRK-0011'].forEach((id) => assert.ok(s.saveItem(draft(id)).ok, id));
  const L = clone(F.demo.layout);
  L.cover = ['ED-NEWS-0007']; L.stories = ['ED-REV-0040', 'ED-STRK-0011'];
  assert.ok(s.saveLayout(L, { expectedRevision: 0 }).ok);
  const bad = clone(L); bad.revision = 2; bad.cover = ['ED-REV-0040']; bad.stories = ['ED-STRK-0011'];
  assert.equal(s.saveLayout(bad).code, 'INVALID_LAYOUT');
  const lead = clone(L); lead.revision = 2; lead.lead = 'ED-STRK-0011'; lead.stories = ['ED-REV-0040'];
  assert.equal(s.saveLayout(lead).problems[0].code, 'SLOT_TYPE_MISMATCH');
  const dangling = clone(L); dangling.revision = 2; dangling.games = ['DEMO-9999'];
  assert.equal(s.saveLayout(dangling).problems[0].code, 'DANGLING_REF');
  const stale = clone(L); stale.revision = 2;
  assert.equal(s.saveLayout(stale, { expectedRevision: 0 }).code, 'REVISION_CONFLICT');
  assert.equal(s.layoutHistory(L.issueId).length, 1);
});

test('buildIssue exports nothing unpublished: drafts, approvals and sources of drafts stay internal', () => {
  const s = seeded();
  s.saveItem(draft('ED-NEWS-0007'));
  const iss = s.buildIssue({ issueId: 'DEMO-ISSUE-0305', mode: 'DEMO', validUntil: '2026-11-02T00:00:00Z', issue: clone(F.demo.issue) });
  assert.deepEqual([iss.items.length, iss.sources.length, iss.approvals.length], [0, 0, 0]);
  assert.deepEqual(C.validateIssue(iss).fatal, []);
});

test('save → reload replays to the same state; a tampered or reordered log is refused', () => {
  const s = seeded();
  s.saveItem(draft('ED-NEWS-0007'));
  s.recordSourceEvent({ schema: C.SCHEMAS.sourceEvent, id: 'SEV-1', sourceId: 'src:demo-official-injury-report', state: 'DISPUTED', at: '2026-10-31T13:00:00Z', note: null, demo: true });
  const saved = JSON.parse(JSON.stringify(s.toJSON()));
  const r = createStore.fromJSON(saved, { clock: clock('2026-11-01T00:00:00Z') });
  assert.deepEqual(r.itemHistory('ED-NEWS-0007'), s.itemHistory('ED-NEWS-0007'));
  assert.equal(r.sourceState('src:demo-official-injury-report'), 'DISPUTED');
  assert.equal(r.log().length, s.log().length);

  const edited = clone(saved); edited.events.find((e) => e.type === 'ITEM_REVISION').data.item.en.headline = 'quietly changed';
  assert.throws(() => createStore.fromJSON(edited), /integrity/);
  const swapped = clone(saved); [swapped.events[1], swapped.events[2]] = [swapped.events[2], swapped.events[1]];
  assert.throws(() => createStore.fromJSON(swapped), /integrity/);
  assert.throws(() => createStore.fromJSON({ schema: 'other', events: [] }), /not a/);
});
