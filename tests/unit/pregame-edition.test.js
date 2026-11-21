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
test('the signed columns describe the frozen initial vote in either language and every baseline branch', () => {
  const scenarios = [
    {changes:{}, en:['My pick is the ORL', 'The home rule takes the DET'], zh:['這一票我投ORL', '主場派選DET，我選ORL']},
    {changes:{pick:'HOME', awayRecord:{wins:2,losses:4},homeRecord:{wins:4,losses:2}},
      en:['My pick is the DET', 'We’ll both get this one right'], zh:['這一票我投DET，贏了也拉不開差距', '贏就一起贏']},
    {changes:{baselinePick:null}, en:['Only my call will be scored'], zh:['只看我這一票']},
    {changes:{pick:null,reason:'TIED',homeRecord:{wins:4,losses:2}}, en:['A tie on win rate', 'only that pick goes on the scorecard'], zh:['兩隊勝率打平', '只記在主場派的帳上']},
    {changes:{pick:null,reason:'RECORD_MISSING',awayRecord:null,baselinePick:null},
      en:['I’m a record short', 'I’m missing the record for the ORL', 'Neither of us has a pick to score'],
      zh:['這一票我留白', 'ORL的戰績尚缺', '兩邊都沒有一票要算']}
  ];
  for (const {changes,en,zh} of scenarios) {
    const {game,schedule,edition,final} = sample();
    Object.assign(game.INITIAL,changes);
    game.pins.INITIAL = digest(game.INITIAL);
    final(cutoff);
    // A subsequent observation may describe a different vote. The column stays with INITIAL.
    Object.assign(game.FINAL,{pick:null,reason:'RECORD_MISSING',awayRecord:null});
    game.pins.FINAL = digest(game.FINAL);
    for (const [lang,expected] of [['en',en],['zh',zh]]) {
      const html = renderPage(schedule,'match','?lang='+lang+'&game='+id,null,{ownerEdition:edition,now:tip});
      const beforeStage = html.split('<section class="edition-stage">')[0];
      for (const phrase of expected) assert.ok(beforeStage.includes(phrase),phrase);
      if (lang === 'en') assert.match(beforeStage,/\. I take the team/);
      for (const byline of lang==='zh' ? ['MOSPORT 賽前專欄','MOSPORT 研究專欄 · 戰績觀察室'] : ['MOSPORT Pregame Column','MOSPORT Research Column · Record Desk']) {
        assert.ok(beforeStage.includes(byline),byline);
      }
      assert.match(html,lang==='zh' ? /T−15 準時鎖定/ : /On-time T−15 lock/);
    }
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
