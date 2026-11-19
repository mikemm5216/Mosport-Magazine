'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { clone, loadFixtures, renderPage } = require('./helpers.js');
const PL = require('../../site/js/data/pipeline.js');
const schedule = require('../../site/data/schedules/0022600051.json');
const candidate = require('../fixtures/context-snapshot-v2.json');
const F = loadFixtures();
const now = '2026-11-19T08:10:00Z';
const text = html => html.replace(/<[^>]*>/g, ' ');
const home = (raw, query = '', projected, opts) => renderPage(raw, 'home', query, projected, opts);
const demoHome = name => home(F[name], '?fixture=' + name, null, { mode: 'prototype', fixtures: F });

function assertSpread(html) {
  assert.ok(html.includes('class="spread"'));
  assert.ok(html.includes('class="pg pg-cover"'));
  assert.ok(html.includes('class="pg pg-inner" id="today" tabindex="-1"'));
  assert.ok(html.includes('href="#today"'));
  assert.ok(html.indexOf('class="pg pg-cover"') < html.indexOf('id="today"'));
  assert.ok(html.includes('id="reader"'));
  assert.ok(!html.includes('<main class="sheet">'));
}

test('normal index entry selects the existing 0051 schedule in each existing mode', () => {
  for (const mode of ['production', 'prototype']) {
    let selection;
    const html = home(schedule, '', null, { mode, onSelect: s => { selection = s; } });
    assert.equal(selection.kind, 'schedule');
    assert.equal(selection.name, '0022600051');
    assert.equal(selection.url, 'data/schedules/0022600051.json');
    assertSpread(html);
    assert.ok(html.includes('lead-schedule'));
    for (const value of ['SAC', 'LAL', '2026/11/21', '11:00', '07:58:50Z', 'NBA game ID 0022600051', '賽前紀錄尚未提供公開顯示', '已保存賽程（非即時）']) assert.ok(html.includes(value), value);
    assert.ok(html.includes('href="https://www.nba.com/game/sac-vs-lal-0022600051"'));
    assert.ok(!/DEMO|VOL\.|第 \d+ 期|61%|52%|0\.5|World · Coach Read|BREAKING NEWS|MOSPORT EXCLUSIVE|三層/.test(text(html)));
    assert.ok(!html.includes('class="teaser ') && !html.includes('class="stories'));
    assert.ok(!html.includes('<b>02</b>'));
  }
});

test('explicit schedule, issue and fixture selections are never replaced by the default', () => {
  for (const [query, mode, raw, kind, name] of [
    ['?schedule=0022600999', 'production', candidate, 'schedule', '0022600999'],
    ['?issue=existing-issue', 'prototype', F.demo, 'file', 'existing-issue'],
    ['?fixture=demo', 'prototype', F.demo, 'demo', 'demo'],
    ['?fixture=loadfail', 'prototype', F.loadfail, 'demo', 'loadfail']
  ]) {
    let selection;
    const html = home(raw, query, null, { mode, fixtures: F, onSelect: s => { selection = s; } });
    assert.equal(selection.kind, kind);
    assert.equal(selection.name, name);
    assert.ok(!html.includes('schedule=0022600051'));
    assertSpread(html);
  }
});

test('ambiguous or invalid explicit selection stays failed, with no fallback game', () => {
  for (const query of ['?schedule=../../evil', '?schedule=0022600051&fixture=demo', '?schedule=0022600051&schedule=0022600999', '?issue=existing-issue&mode=production']) {
    const html = home(schedule, query);
    assertSpread(html);
    assert.ok(html.includes('state-load_failed'));
    assert.ok(!html.includes('lead-schedule'));
    assert.ok(!text(html).includes('SAC'));
    assert.ok(html.includes('賽前紀錄尚未提供公開顯示'));
  }
});

test('validated candidate remains missing on the actual public pipeline and homepage', () => {
  const result = PL.run(clone(candidate), { mode: 'production', now });
  assert.equal(result.model.schedule[0].pregameSnapshot, null);
  assert.deepEqual(result.diagnostics.excluded.map(e => e.reason), ['PUBLIC_QUALIFICATION_UNAVAILABLE']);
  const html = home(candidate, '?schedule=0022600999');
  assertSpread(html);
  assert.ok(html.includes('賽前紀錄尚未提供公開顯示'));
  for (const forbidden of [candidate.contextSnapshot.snapshotId, 'HOME_COURT@', 'homeWinProbability', '61%', '0.5']) assert.ok(!text(html).includes(forbidden), forbidden);
});

test('isolated homepage projection renders HOME and NEUTRAL through the existing record template', () => {
  for (const value of ['HOME', 'NEUTRAL']) {
    const snapshot = clone(candidate.contextSnapshot);
    snapshot.homeCourt.evidence.value = value;
    const projected = PL.contextSnapshotView(snapshot);
    const html = home(candidate, '?schedule=0022600999', projected);
    assertSpread(html);
    for (const expected of [value, 'HOME_COURT@1', snapshot.snapshotId, '08:05:00Z', '08:00:00Z']) assert.ok(html.includes(expected), expected);
    assert.ok(!text(html).includes('賽前紀錄尚未提供公開顯示'));
    assert.ok(!/61%|0\.5|homeWinProbability/.test(text(html)));
  }
  assert.equal(PL.run(clone(candidate), { mode: 'production', now }).model.schedule[0].pregameSnapshot, null);
});

test('isolated homepage projection escapes source labels and snapshot IDs', () => {
  const projected = PL.contextSnapshotView(candidate.contextSnapshot);
  projected.snapshotId = '<script>evil</script>';
  projected.source.publisher = '<img src=x onerror=evil>';
  const html = home(candidate, '?schedule=0022600999', projected);
  assert.ok(html.includes('&lt;script&gt;evil&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=evil&gt;'));
  assert.ok(!html.includes('<script>evil') && !html.includes('<img src=x'));
});

test('no source, no payload and load failure keep the magazine without borrowed dates or content', () => {
  const noSource = clone(schedule); delete noSource.source;
  for (const [raw, expected] of [[noSource, 'state-invalid'], [null, 'state-load_failed'], [{ __loadError: 'FETCH_FAILED' }, 'state-load_failed']]) {
    const html = home(raw);
    assertSpread(html);
    assert.ok(html.includes(expected));
    assert.ok(html.includes('賽前紀錄尚未提供公開顯示'));
    assert.ok(!html.includes('class="td-d"'));
    assert.ok(!/DEMO|VOL\.|SAC|LAL|2026\/11\/21|61%|HOME_COURT@/.test(text(html)));
    assert.ok(!html.includes('lead-schedule') && !html.includes('class="teaser '));
  }
});

test('expired saved schedule remains labelled history with missing pregame record', () => {
  const html = home(candidate, '?schedule=0022600999', null, { now: candidate.validUntil });
  assertSpread(html);
  for (const expected of ['state-stale', '歷史觀測', '已保存賽程（非即時）', '賽前紀錄尚未提供公開顯示', 'NBA game ID 0022600999']) assert.ok(html.includes(expected));
  assert.ok(!html.includes(candidate.contextSnapshot.snapshotId));
  assert.ok(!/VOL\.|61%|0\.5|HOME_COURT@/.test(text(html)));
});

test('eligible explicit DEMO keeps its original editorial output and visible DEMO marks', () => {
  const html = demoHome('demo');
  assertSpread(html);
  for (const expected of ['61%', '湖人主場較有利', '湖人主場戰關鍵戰', '勇士新陣容化學反應', 'class="story story-review"', 'class="story story-streak"', 'class="demo-badge"']) assert.ok(html.includes(expected), expected);
  assert.ok(html.indexOf('class="demo-badge"') < html.indexOf('id="today"'));
  assert.ok(!/52%|60% 區間|三層內容|HOME_COURT@/.test(text(html)));
  const refused = home(F.demo, '?fixture=demo&mode=production', null, { fixtures: F });
  assertSpread(refused);
  assert.ok(refused.includes('state-refused'));
  assert.ok(!/61%|湖人主場較有利|湖人主場戰關鍵戰|勇士新陣容化學反應/.test(text(refused)));
});

test('empty, unapproved and stale issues retain eligibility decisions inside the magazine', () => {
  for (const name of ['empty', 'bypass', 'stale']) {
    const html = demoHome(name);
    assertSpread(html);
    assert.ok(!html.includes('class="teaser '));
    if (name !== 'bypass') assert.ok(!html.includes('class="lead"'));
    assert.ok(!html.includes('BYP-'));
  }
  assert.ok(demoHome('stale').includes('state-stale'));
});

test('TODAY anchor and secondary navigation preserve the selected schedule and appearance', () => {
  const query = '?lang=en&theme=dark&mode=production';
  const html = home(schedule, query, null, { hash: '#today' });
  assertSpread(html);
  assert.ok(html.includes('Read TODAY'));
  assert.ok(html.includes('Pregame record is not yet available for public display'));
  assert.ok(!text(html).replace(/繁中/g, '').match(/[\u3400-\u9fff]/));
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  for (const page of ['index.html', 'schedule.html', 'match.html']) {
    const link = links.find(href => href.startsWith(page + '?'));
    assert.ok(link, page);
    const url = new URL(link, 'https://mosport.test/');
    assert.equal(url.searchParams.get('schedule'), '0022600051');
    assert.equal(url.searchParams.get('lang'), 'en');
    assert.equal(url.searchParams.get('theme'), 'dark');
    assert.equal(url.searchParams.get('mode'), 'production');
    if (page === 'match.html') assert.equal(url.searchParams.get('game'), '0022600051');
  }
  const selectedAgain = [];
  const back = links.find(href => href.startsWith('index.html?'));
  home(schedule, new URL(back, 'https://mosport.test/').search, null, { onSelect: s => selectedAgain.push(s.name) });
  assert.deepEqual(selectedAgain, ['0022600051']);
});
