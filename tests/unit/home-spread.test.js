'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { clone, loadFixtures, renderPage } = require('./helpers.js');
const PL = require('../../site/js/data/pipeline.js');
const schedule = require('../../site/data/schedules/0022600051.json');
const candidate = require('../fixtures/context-snapshot-v2.json');
const F = loadFixtures();
const now = '2026-11-19T08:10:00Z';
const scheduleNow = new Date(Date.parse(schedule.editorial.observedAt) + 60000).toISOString();
const text = html => html.replace(/<[^>]*>/g, ' ');
const home = (raw, query = '', projected, opts) => renderPage(raw, 'home', query, projected,
  Object.assign({ now: raw && raw.game && raw.game.gameId === schedule.game.gameId ? scheduleNow : now }, opts));
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

// Founder 2026-11-21: no displayable read means no read block and no sentence about it.
const EMPTY_READ = /賽前判讀還沒出來|賽前判讀已不適用|not out yet|out of date/;

test('normal index entry selects the existing 0051 schedule in each existing mode', () => {
  for (const mode of ['production', 'prototype']) {
    let selection;
    const html = home(schedule, '', null, { mode, onSelect: s => { selection = s; } });
    assert.equal(selection.kind, 'schedule');
    assert.equal(selection.name, '0022600051');
    assert.equal(selection.url, 'data/schedules/0022600051.json');
    assertSpread(html);
    assert.ok(html.includes('lead-schedule'));
    const checkedAt = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(schedule.source.observedAt));
    assert.ok(html.includes('<time datetime="' + schedule.source.observedAt + '">' + checkedAt + ' 核對（台北）</time>'));
    for (const value of ['SAC', 'LAL', '2026/11/21', '11:00']) assert.ok(html.includes(value), value);
    assert.ok(!EMPTY_READ.test(text(html)) && !html.includes('pregame-missing') && !html.includes('class="cv-status"'));
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
    assert.ok(html.includes('這一期暫時打不開。'));
  }
});

test('validated candidate remains missing on the actual public pipeline and homepage', () => {
  const result = PL.run(clone(candidate), { mode: 'production', now });
  assert.equal(result.model.schedule[0].pregameSnapshot, null);
  assert.deepEqual(result.diagnostics.excluded.map(e => e.reason), ['PUBLIC_QUALIFICATION_UNAVAILABLE']);
  const html = home(candidate, '?schedule=0022600999');
  assertSpread(html);
  assert.ok(!EMPTY_READ.test(text(html)) && !html.includes('pregame-missing'));
  for (const forbidden of [candidate.contextSnapshot.snapshotId, 'HOME_COURT@', 'homeWinProbability', '61%', '0.5']) assert.ok(!text(html).includes(forbidden), forbidden);
});

test('isolated homepage projection renders HOME and NEUTRAL through the existing record template', () => {
  for (const value of ['HOME', 'NEUTRAL']) {
    const snapshot = clone(candidate.contextSnapshot);
    snapshot.homeCourt.evidence.value = value;
    const projected = PL.contextSnapshotView(snapshot);
    const html = home(candidate, '?schedule=0022600999', projected);
    assertSpread(html);
    assert.ok(html.includes(value === 'HOME' ? 'LAL在主場出賽。' : '本場在中立場地進行。'));
    for (const hidden of ['HOME_COURT@1', snapshot.snapshotId, '08:05:00Z', '08:00:00Z']) assert.ok(!text(html).includes(hidden), hidden);
    assert.ok(!text(html).includes('這場的賽前判讀還沒出來。'));
    assert.ok(!/61%|0\.5|homeWinProbability/.test(text(html)));
  }
  assert.equal(PL.run(clone(candidate), { mode: 'production', now }).model.schedule[0].pregameSnapshot, null);
});

test('homepage hides technical snapshot IDs and source payloads', () => {
  const projected = PL.contextSnapshotView(candidate.contextSnapshot);
  projected.snapshotId = '<script>evil</script>';
  projected.source.publisher = '<img src=x onerror=evil>';
  const html = home(candidate, '?schedule=0022600999', projected);
  assert.ok(!html.includes('&lt;script&gt;evil&lt;/script&gt;'));
  assert.ok(!html.includes('&lt;img src=x onerror=evil&gt;'));
  assert.ok(!html.includes('<script>evil') && !html.includes('<img src=x'));
});

test('no source, no payload and load failure keep the magazine without borrowed dates or content', () => {
  const noSource = clone(schedule); delete noSource.source;
  for (const [raw, expected] of [[noSource, 'state-invalid'], [null, 'state-load_failed'], [{ __loadError: 'FETCH_FAILED' }, 'state-load_failed']]) {
    const html = home(raw);
    assertSpread(html);
    assert.ok(html.includes(expected));
    assert.ok(!text(html).includes('這場'));
    assert.ok(!html.includes('class="today-empty"'));
    assert.ok(!html.includes('class="td-d"'));
    assert.ok(!/DEMO|VOL\.|SAC|LAL|2026\/11\/21|61%|HOME_COURT@/.test(text(html)));
    assert.ok(!html.includes('lead-schedule') && !html.includes('class="teaser '));
  }
});

test('expired saved schedule remains labelled history with missing pregame record', () => {
  const html = home(candidate, '?schedule=0022600999', null, { now: candidate.validUntil });
  assertSpread(html);
  for (const expected of ['state-stale', '以下是先前的賽程，開賽時間可能有變動。', '核對（台北）']) assert.ok(html.includes(expected));
  assert.ok(!EMPTY_READ.test(text(html)) && !html.includes('pregame-missing'));
  assert.ok(!html.includes(candidate.contextSnapshot.snapshotId));
  assert.ok(!/VOL\.|61%|0\.5|HOME_COURT@/.test(text(html)));
});

test('eligible explicit DEMO keeps its original editorial output and visible DEMO marks', () => {
  const html = demoHome('demo');
  assertSpread(html);
  for (const expected of ['61%', '湖人主場較有利', '湖勇交手，傷兵牽動戰局', '勇士新陣容，變化在哪裡？', 'class="story story-review"', 'class="demo-badge"']) assert.ok(html.includes(expected), expected);
  assert.ok(html.indexOf('class="demo-badge"') < html.indexOf('id="today"'));
  assert.ok(!/52%|60% 區間|三層內容|HOME_COURT@|World|Evidence|External|snapshot|receipt|資格|Falsifier|Turning Point|三連勝/i.test(text(html)));
  assert.ok(!html.includes('story-streak'));
  const refused = home(F.demo, '?fixture=demo&mode=production', null, { fixtures: F });
  assertSpread(refused);
  assert.ok(refused.includes('state-refused'));
  assert.ok(!/61%|湖人主場較有利|湖勇交手，傷兵牽動戰局|勇士新陣容，變化在哪裡？/.test(text(refused)));
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
  assert.ok(!EMPTY_READ.test(text(html)));
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

test('home status copy is reader-facing in both editions without leaking technical metadata', () => {
  for (const lang of ['zh', 'en']) {
    const cases = [home(schedule, '?lang=' + lang), home(null, '?lang=' + lang), ...['demo', 'empty', 'stale', 'invalid', 'bypass'].map(name => home(F[name], '?fixture=' + name + '&lang=' + lang, null, { mode: 'prototype', fixtures: F }))];
    for (const html of cases) assert.ok(!/World|Evidence|External|snapshot|receipt|資格|分層|HOME_COURT@|NBA game ID|UTC|格式檢查|載入失敗|Falsifier|Turning Point/i.test(text(html)), lang);
  }
});

test('saved-schedule review page explains the missing review in reader language', () => {
  const html = renderPage(schedule, 'review', '?schedule=0022600051', null, { now: scheduleNow });
  assert.ok(html.includes('這一期的賽後檢討還沒出來。'));
  assert.ok(!/資格|receipt|snapshot|World|先看對戰/.test(text(html)));
});

test('cover-only stories are not contradicted by the TODAY empty state, and stale issues keep a schedule exit', () => {
  const coverOnly = clone(F.demo);
  coverOnly.layout.lead = null; coverOnly.layout.games = []; coverOnly.layout.stories = [];
  const html = home(coverOnly, '?fixture=demo', null, { mode: 'prototype', fixtures: F });
  assert.ok(html.includes('class="teaser '));
  assert.ok(html.includes('本期暫無賽前判讀。先看賽程。'));
  assert.ok(!html.includes('報導還沒出來'));
  const today = demoHome('stale').split('id="today"')[1];
  assert.ok(/href="schedule\.html/.test(today));
});

test('official NBA Cup rematch headline reaches the real default homepage after sourced observation', () => {
  const clock = scheduleNow;
  const actual = home(schedule, '', null, { mode: 'production', now: clock, realTeams: true });
  assertSpread(actual);
  assert.ok(actual.includes('13 分之差，國王盃賽再戰湖人'));
  assert.ok(actual.includes('103：116') && actual.includes('NBA 盃西區 C 組'));
  assert.ok(!EMPTY_READ.test(text(actual)) && !actual.includes('pregame-missing'));
  assert.ok(actual.includes('https://www.nba.com/game/lal-vs-sac-0022600185'));
  assert.ok(!/61%|52%|homeWinProbability|World · Coach Read|DEMO/.test(text(actual)));
  const english = home(schedule, '?lang=en', null, { mode: 'production', now: clock, realTeams: true });
  assert.ok(english.includes('13-point loss') && english.includes('NBA Cup West Group C'));
  assert.ok(english.includes('103–116') && !EMPTY_READ.test(text(english)));
  const earlier = home(schedule, '', null, { mode: 'production', now: schedule.source.observedAt, realTeams: true });
  assert.ok(!earlier.includes('13 分之差') && earlier.includes('國王 @ 湖人') && !earlier.includes('賽前看點') && !EMPTY_READ.test(text(earlier)));
  const expired = clone(schedule); expired.validUntil = '2026-11-21T02:30:00Z';
  const stale = home(expired, '', null, { mode: 'production', now: expired.validUntil, realTeams: true });
  assert.ok(stale.includes('先前的賽程') && !stale.includes('13 分之差'));
  const tipped = home(schedule, '', null, { mode: 'production', now: schedule.game.tipoff, realTeams: true });
  assertSpread(tipped);
  assert.ok(tipped.includes('已過原定開賽時間（台北 11:00）。') && tipped.includes('查看 NBA 官方賽況'));
  assert.ok(tipped.includes('class="cv-status">已過原定開賽時間<') && tipped.includes('比賽資訊'));
  assert.ok(!/13 分之差|先前的賽程|還沒出來|未開賽|state-stale|未發布|曾發布|不再更新/.test(tipped));
  const tippedEn = home(schedule, '?lang=en', null, { mode: 'production', now: schedule.game.tipoff, realTeams: true });
  assert.ok(tippedEn.includes('Past the scheduled tip-off (11:00 Taipei).') && tippedEn.includes('See NBA.com for the game'));
  const withoutEditorial = clone(schedule); delete withoutEditorial.editorial;
  const missing = home(withoutEditorial, '', null, { mode: 'production', now: clock, realTeams: true });
  assert.ok(missing.includes('lead-record-title">國王 @ 湖人<') && !missing.includes('賽前看點') && !EMPTY_READ.test(text(missing)) && !missing.includes('class="cv-status"'));
  assert.ok(!missing.includes('lead-story') && !missing.includes('13 分之差'));
});
