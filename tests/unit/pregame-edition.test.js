'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { digest, editionGame } = require('../../site/js/data/pregame-edition.js');
const pipeline = require('../../site/js/data/pipeline.js');
const { clone, renderPage } = require('./helpers.js');

// Synthetic contract inputs exist only here. No real article, selection or score ships with the public site.
const id = '0090000001', espnId = '999999999';
const observed = '2026-01-01T10:00:00Z', filed = '2026-01-01T11:00:00Z';
const cutoff = '2026-01-01T17:45:00Z', tip = '2026-01-01T18:00:00Z', end = '2026-01-01T23:00:00Z';
function sample() {
  const schedule = clone(require('../../site/data/schedules/0022600051.json'));
  schedule.game = {gameId:id, home:'DET', away:'ORL', status:'SCHEDULED', tipoff:tip};
  schedule.validUntil = tip;
  schedule.contextSnapshot = null;
  delete schedule.editorial;
  const url = 'https://www.nba.com/game/orl-vs-det-' + id;
  Object.assign(schedule.source, {observedAt:observed, originalUrl:url, contentFingerprint:digest({game:schedule.game,originalUrl:url,observedAt:observed})});
  const copy = {title:'Reader test',body:'Synthetic article',watch:'Watch',falsifier:'Revise'};
  const article = {nbaGameId:id,zh:{...copy,title:'測試文章'},en:copy,sources:[{label:'NBA',url,observedAt:observed}],cutoffAt:observed,preparedAt:filed};
  const INITIAL = {schema:'mosport-a/research-pick@1',nbaGameId:id,espnGameId:espnId,away:'ORL',home:'DET',tipoffAt:tip,
    stage:'INITIAL',lockedAt:filed,dataCutoff:observed,personaId:'season-record',personaVersion:'1',feature:'SEASON_WIN_RATIO',
    awayRecord:{wins:4,losses:2},homeRecord:{wins:2,losses:4},pick:'AWAY',reason:'HIGHER_WIN_RATIO',baselinePick:'HOME',priorDigest:null};
  const game = {espnGameId:espnId,article,INITIAL,pins:{schedule:digest(schedule),article:digest(article),INITIAL:digest(INITIAL)}};
  const edition = {catalog:[{id,away:'ORL',home:'DET',availableAt:filed}],games:{[id]:game}};
  function final(lock) {
    game.FINAL = {...INITIAL,stage:'FINAL',lockedAt:lock,dataCutoff:cutoff,priorDigest:digest(INITIAL)};
    game.pins.FINAL = digest(game.FINAL);
  }
  function view(now) { return editionGame(edition,schedule,null,now); }
  return {schedule,edition,game,view,final};
}
test('real entry points accept only the pinned edition, in both languages, with archive and World independence', () => {
  const {schedule,edition} = sample();
  for (const lang of ['zh','en']) {
    const opts = {ownerEdition:edition,now:filed};
    const home = renderPage(schedule,'home','?lang='+lang,null,opts);
    const match = renderPage(schedule,'match','?lang='+lang+'&game='+id,null,opts);
    const listing = renderPage(schedule,'schedule','?lang='+lang,null,opts);
    assert.match(home,lang === 'zh' ? /測試文章/ : /Reader test/);
    for (const page of [home,listing]) assert.match(page,new RegExp('match.html[^"]*game='+id));
    assert.match(match,lang === 'zh' ? /戰績觀察室/ : /Record Desk/);
    assert.match(match,/Synthetic article/);
    assert.match(match,/4–2/);
    assert.match(match,/ESPN/);
    assert.match(match,new RegExp(filed));
    assert.doesNotMatch(match,/data-pct|class="lead-pct"|class="verdict"/);
    assert.doesNotMatch(renderPage(schedule,'match','?game='+id,null,{now:filed}),/Synthetic article|Record Desk/);
  }
});
test('matching pins, both identities, timestamps and source domains are independently required', () => {
  const {game,view} = sample();
  assert.equal(view(observed),null);
  assert.equal(view(filed).stages.length,1);
  game.INITIAL.pick = 'HOME';
  assert.equal(view(filed).stages.length,0);
  game.INITIAL.espnGameId = '888888888';
  game.pins.INITIAL = digest(game.INITIAL);
  assert.equal(view(filed).stages.length,0);
  game.article.sources[0].url = 'https://elsewhere.invalid/';
  game.pins.article = digest(game.article);
  assert.equal(view(filed),null);
});
test('FINAL needs the exact T−15 source cutoff and INITIAL digest, and never issues after tip', () => {
  const {game,view,final} = sample();
  assert.equal(view(filed).finalStatus,'PENDING');
  assert.equal(view(cutoff).finalStatus,'OPEN');
  assert.equal(view(tip).finalStatus,'NOT_RECORDED');
  final(cutoff);
  assert.equal(view(cutoff).finalStatus,'ON_TIME');
  final('2026-01-01T17:45:00.001Z');
  assert.equal(view(tip).finalStatus,'LATE_RECORDED');
  assert.equal(view(tip).stages[1].late,true);
  for (const changes of [{dataCutoff:observed},{priorDigest:null},{lockedAt:tip}]) {
    final(cutoff); Object.assign(game.FINAL,changes); game.pins.FINAL=digest(game.FINAL);
    assert.equal(view(end).stages.length,1);
  }
});
test('only a matching verified result and a separately pinned matching stage score qualify', () => {
  const {schedule,edition,game,final} = sample();
  final(cutoff);
  const receiptRef = 'NBA-'+id+'-R1';
  const result = {schema:'mosport-b/game-result@1',nbaGameId:id,espnGameId:espnId,away:'ORL',home:'DET',awayScore:95,homeScore:85,status:'FINAL',
    officialUrl:schedule.source.originalUrl,confirmations:{nba:{observedAt:end},espn:{observedAt:end}},receiptRef};
  function score() {
    game.scoreFINAL = {schema:'mosport-a/research-score@1',nbaGameId:id,espnGameId:espnId,stage:'FINAL',forecastDigest:digest(game.FINAL),receiptRef,outcome:'HIT',baselineOutcome:'MISS'};
    game.pins.scoreFINAL=digest(game.scoreFINAL);
  }
  function actual(pins) {
    return pipeline.run(schedule,{mode:'production',now:end,ownerEdition:edition,result,pins}).model.schedule[0].analysis.stages[1].evaluation;
  }
  const pins = {[id]:{digest:digest(result),receiptRef}};
  score();
  assert.deepEqual(actual(pins),{outcome:'HIT',baselineOutcome:'MISS'});
  assert.equal(actual({}),null);
  game.scoreFINAL.receiptRef='NBA-'+id+'-R2';
  game.pins.scoreFINAL=digest(game.scoreFINAL);
  assert.equal(actual(pins),null);
  final('2026-01-01T17:45:01Z');
  score();
  assert.equal(actual(pins),null);
});
