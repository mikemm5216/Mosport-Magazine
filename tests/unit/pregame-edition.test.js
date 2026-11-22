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

function threeDesks() {
  const base=sample(), {game,schedule}=base;
  const recorded='2026-01-01T12:00:00Z';
  const desks=[{id:'turnovers',version:'1',awayValue:10,homeValue:13,pick:'AWAY'},
    {id:'second-chance',version:'1',awayValue:14,homeValue:16,pick:'HOME'}];
  game.exploration={schema:'mosport-a/exploration@1',nbaGameId:id,espnGameId:espnId,away:'ORL',home:'DET',tipoffAt:tip,
    initialDigest:game.pins.INITIAL,filedAt:recorded,source:{url:schedule.source.originalUrl,observedAt:observed,sha256:'a'.repeat(64)},desks};
  const columns={};
  for (const desk of ['season-record','turnovers','second-chance']) {
    const copy = {title:desk,body:'One.\n\nTwo.',watch:'Watch the ball.',limit:'One sample.'};
    columns[desk]={en:copy,zh:{...copy,title:'測試 '+desk}};
  }
  game.deskCopy={nbaGameId:id,preparedAt:recorded,columns};
  function pin() { for (const key of ['exploration','deskCopy']) game.pins[key]=digest(game[key]); }
  pin();
  return {...base,recorded,pin};
}
test('three independently filed columns keep the original pick, actual timestamps, full paragraphs and linked numbers', () => {
  const {game,edition,schedule,recorded}=threeDesks();
  game.article.en.body='Opening paragraph.\n\nLater paragraph.';
  game.article.en.watch='Watch one.\n\nWatch two.';
  game.pins.article=digest(game.article);
  const opts={ownerEdition:edition,now:recorded};
  for (const lang of ['en','zh']) {
    const html=renderPage(schedule,'match','?game='+id+'&lang='+lang,null,opts);
    assert.equal((html.match(/data-desk="/g)||[]).length,3);
    for (const desk of ['season-record','turnovers','second-chance']) {
      assert.ok(html.includes('href="#desk-'+desk+'"') && html.includes('id="desk-'+desk+'"'));
    }
    assert.equal((html.match(/<p>One\.<\/p><p>Two\.<\/p>/g)||[]).length,3);
    for (const iso of [filed,recorded,observed]) assert.ok(html.includes('datetime="'+iso+'"'));
    assert.equal((html.match(lang==='zh' ? /尚未結算/g : /Scoring pending/g)||[]).length,3);
    if (lang==='en') {
      assert.match(html,/<p>Opening paragraph\.<\/p><p>Later paragraph\.<\/p>/);
      assert.match(html,/<p>Watch one\.<\/p><p>Watch two\.<\/p>/);
      assert.match(html,/Exploratory pick · ORL/);
      assert.match(html,/Exploratory pick · DET/);
      assert.match(html,/Sample: one game/);
    }
  }
  assert.doesNotMatch(renderPage(schedule,'home','?lang=en',null,opts),/Later paragraph/);
});
test('absent, partial, future, wrong-game, late and tampered exploration never supplies any new desk', () => {
  const cases=[
    g=>{delete g.deskCopy.columns.turnovers;}, g=>{delete g.deskCopy.columns['season-record'].en.limit;},
    g=>{g.exploration.desks.reverse();}, g=>{g.exploration.desks.pop();}, g=>{g.exploration.desks[1].id='turnovers';},
    g=>{g.exploration.source.url='https://unverified.example/';}, g=>{g.exploration.espnGameId='123456789';},
    g=>{g.exploration.initialDigest='f'.repeat(64);}, g=>{g.exploration.filedAt=tip;},g=>{g.exploration.filedAt=observed;},
    g=>{g.exploration.desks[0].awayValue=null;}, g=>{g.deskCopy.preparedAt=tip;}
  ];
  for (const change of cases) {
    const {game,view,pin}=threeDesks();
    change(game); pin();
    assert.equal(view(end).desks,null);
    assert.equal(view(end).stages.length,1);
  }
  const {game,view,recorded}=threeDesks();
  assert.equal(view(filed).desks,null);
  game.deskCopy.columns.turnovers.en.title='Changed after pinning';
  assert.equal(view(recorded).desks,null);
});
test('exploratory scoring requires the independently pinned result, matching pick set, initials and receipt', () => {
  const {game,schedule,edition}=threeDesks();
  const receiptRef='NBA-'+id+'-R1';
  const result={schema:'mosport-b/game-result@1',nbaGameId:id,espnGameId:espnId,away:'ORL',home:'DET',awayScore:95,homeScore:85,status:'FINAL',
    officialUrl:schedule.source.originalUrl,confirmations:{nba:{observedAt:end},espn:{observedAt:end}},receiptRef};
  const pins={[id]:{digest:digest(result),receiptRef}};
  function score(resultPins) {
    return pipeline.run(schedule,{mode:'production',now:end,ownerEdition:edition,result,pins:resultPins}).model.schedule[0].analysis.desks.score;
  }
  const original={schema:'mosport-a/exploration-score@1',nbaGameId:id,espnGameId:espnId,initialDigest:game.pins.INITIAL,
    explorationDigest:game.pins.exploration,receiptRef,baselineOutcome:'MISS',desks:[{id:'turnovers',outcome:'HIT'},{id:'second-chance',outcome:'MISS'}]};
  game.explorationScore=original;
  assert.equal(score(pins),null);
  game.pins.explorationScore=digest(original);
  assert.deepEqual(score(pins),original);
  assert.equal(score({}),null);
  for (const changes of [{explorationDigest:'x'},{initialDigest:'x'},{receiptRef:'other'},{desks:[original.desks[1],original.desks[0]]}]) {
    game.explorationScore={...original,...changes}; game.pins.explorationScore=digest(game.explorationScore);
    assert.equal(score(pins),null);
  }
});

function sealedFinal() {
  const base=sample(), {game}=base;
  const policy={schema:'mosport-a/research-final-policy@2',nbaGameId:id,espnGameId:espnId,tipoffAt:tip,
    initialDigest:digest(game.INITIAL),optedInAt:filed};
  const snapAt='2026-01-01T17:43:00.000Z', preparedAt='2026-01-01T17:44:30.125Z';
  const witnessedAt='2026-01-01T17:44:59.999Z', recordedAt='2026-01-01T17:45:00.001Z';
  const seal={snapshotFingerprint:'a'.repeat(64),snapshotCapturedAt:snapAt,preparedAt,
    sources:{nba:{observedAt:'2026-01-01T17:40:00.000Z',sha256:'b'.repeat(64)},espn:{observedAt:snapAt,sha256:'c'.repeat(64)}}};
  base.final(recordedAt);
  const final=game.FINAL;
  Object.assign(final,{schema:'mosport-a/research-pick@2',policyDigest:digest(policy),seal,witnessedAt,recordingDelayMs:1});
  const witness={schema:'mosport-a/research-final-witness@2',nbaGameId:id,espnGameId:espnId,tipoffAt:tip,
    initialDigest:policy.initialDigest,policyDigest:digest(policy),witnessedAt};
  game.finalPolicy=policy;game.finalWitness=witness;
  function repin() {
    game.pins.finalPolicy=digest(policy);
    final.policyDigest=game.pins.finalPolicy;
    const {lockedAt,witnessedAt,recordingDelayMs,sealedDigest,...sealed}=final;
    final.sealedDigest=digest(sealed);witness.sealedDigest=final.sealedDigest;witness.policyDigest=final.policyDigest;
    game.pins.finalWitness=digest(witness);game.pins.FINAL=digest(final);
  }
  repin();
  return {...base,final,policy,witness,recordedAt,repin};
}

test('v2 prospective enrollment, independent witness and registration appear in their actual order', () => {
  const {game,view,policy,witness,recordedAt,schedule,edition}=sealedFinal();
  assert.equal(view(observed),null);
  assert.equal(view(filed).optedInAt,policy.optedInAt);
  assert.equal(view(filed).witnessedAt,null);
  assert.equal(view(witness.witnessedAt).witnessedAt,witness.witnessedAt);
  assert.equal(view(cutoff).stages.length,1);
  assert.equal(view(recordedAt).finalStatus,'SEALED_FINAL');
  assert.deepEqual(view(recordedAt).stages[1].seal,{preparedAt:game.FINAL.seal.preparedAt,witnessedAt:witness.witnessedAt,recordingDelayMs:1});
  for (const lang of ['zh','en']) {
    const html=renderPage(schedule,'match','?game='+id+'&lang='+lang,null,{ownerEdition:edition,now:recordedAt});
    const waiting=renderPage(schedule,'match','?game='+id+'&lang='+lang,null,{ownerEdition:edition,now:cutoff});
    assert.match(waiting,lang==='zh' ? /資料觀測與封存時段/ : /Source observation and seal window/);
    assert.match(waiting,lang==='zh' ? /最終票登錄時段/ : /Final registration window/);
    assert.doesNotMatch(waiting,/T−15 鎖定窗口|T−15 window opens/);
    for (const time of [cutoff,witness.witnessedAt,recordedAt]) assert.ok(html.includes('datetime="'+time+'"'),time);
    assert.match(html,lang==='zh' ? /開賽前實際登錄/ : /Registered before tipoff/);
    assert.match(html,lang==='zh' ? /登錄距截止 1 毫秒/ : /Registration delay 1 ms/);
    assert.doesNotMatch(html,/準時鎖定|On-time T−15 lock/);
  }
});

test('v2 refuses incorrect identity, opt-in, evidence windows, timestamp order and even a fully repinned invalid record', () => {
  const changes=[
    x=>{x.policy.optedInAt=observed;},x=>{x.policy.optedInAt='2026-01-01T17:40:00.000Z';},x=>{x.policy.espnGameId='888888888';},
    x=>{x.policy.initialDigest='f'.repeat(64);},x=>{x.final.priorDigest='d'.repeat(64);},x=>{x.witness.espnGameId='888888888';},
    x=>{x.witness.witnessedAt=x.final.witnessedAt=cutoff;},x=>{x.witness.witnessedAt=observed;},
    x=>{x.final.seal.sources.espn.observedAt='2026-01-01T17:39:59.999Z';},x=>{x.final.seal.sources.nba.observedAt=cutoff;},
    x=>{x.final.seal.snapshotFingerprint='invalid';},x=>{x.final.seal.sources.nba.sha256='invalid';},
    x=>{x.final.seal.sources.nba.observedAt=x.witness.witnessedAt;},x=>{x.final.seal.preparedAt=cutoff;},
    x=>{x.final.seal.snapshotCapturedAt=cutoff;},x=>{x.final.witnessedAt=x.policy.optedInAt;},
    x=>{x.final.recordingDelayMs=0;},x=>{x.final.lockedAt=tip;x.final.recordingDelayMs=900000;},
    x=>{x.final.dataCutoff='2026-01-01T17:44:59.999Z';},x=>{x.final.lockedAt=x.witness.witnessedAt;x.final.recordingDelayMs=-1;}
  ];
  for (const change of changes) {
    const x=sealedFinal(); change(x); x.repin();
    assert.equal(x.view(end).stages.length,1,change.toString());
  }
  for (const key of ['finalPolicy','finalWitness','FINAL']) {
    const x=sealedFinal();delete x.game.pins[key];
    assert.equal(x.view(end).stages.length,1,key);
  }
  const x=sealedFinal();
  x.final.seal.sources.nba.sha256='e'.repeat(64);x.game.pins.FINAL=digest(x.final);
  assert.equal(x.view(end).stages.length,1,'registration cannot rewrite the witnessed payload');
  Object.assign(x.game,{FINAL:{...x.game.INITIAL,stage:'FINAL',dataCutoff:cutoff,lockedAt:cutoff,priorDigest:x.policy.initialDigest}});
  x.game.pins.FINAL=digest(x.game.FINAL);
  assert.equal(x.view(end).stages.length,1,'no downgrade from an opted-in entry to v1');
});

test('v2 uses the whole registered projection for scoring and never scores from a witness alone', () => {
  const {game,edition,schedule,final}=sealedFinal();
  const receiptRef='NBA-'+id+'-R1';
  const result={schema:'mosport-b/game-result@1',nbaGameId:id,espnGameId:espnId,away:'ORL',home:'DET',awayScore:95,homeScore:85,status:'FINAL',
    officialUrl:schedule.source.originalUrl,confirmations:{nba:{observedAt:end},espn:{observedAt:end}},receiptRef};
  const pin={[id]:{digest:digest(result),receiptRef}};
  function score(pins) {
    const stages=pipeline.run(schedule,{mode:'production',now:end,ownerEdition:edition,result,pins}).model.schedule[0].analysis.stages;
    return stages.find(s=>s.stage==='FINAL')?.evaluation ?? null;
  }
  game.scoreFINAL={schema:'mosport-a/research-score@1',nbaGameId:id,espnGameId:espnId,stage:'FINAL',forecastDigest:final.sealedDigest,
    receiptRef,outcome:'HIT',baselineOutcome:'MISS'};
  game.pins.scoreFINAL=digest(game.scoreFINAL);
  assert.equal(score(pin),null,'seal digest is not the final projection digest');
  game.scoreFINAL.forecastDigest=game.pins.FINAL;game.pins.scoreFINAL=digest(game.scoreFINAL);
  assert.deepEqual(score(pin),{outcome:'HIT',baselineOutcome:'MISS'});
  assert.equal(score({}),null);
  delete game.pins.finalWitness;
  assert.equal(score(pin),null);
});

// Owner-only postgame review: a second, separate article. Synthetic data only, never live evidence.
function postgameSample() {
  const base = sample();
  const {schedule,game} = base;
  const receiptRef = 'NBA-'+id+'-R1';
  const result = {schema:'mosport-b/game-result@1',nbaGameId:id,espnGameId:espnId,away:'ORL',home:'DET',awayScore:95,homeScore:85,status:'FINAL',
    officialUrl:schedule.source.originalUrl,confirmations:{nba:{observedAt:end},espn:{observedAt:end}},receiptRef};
  const pins = {[id]:{digest:digest(result),receiptRef}};
  const review = {nbaGameId:id,espnGameId:espnId,receiptRef,resultDigest:digest(result),pregameDigest:game.pins.article,boxSha256:'b'.repeat(64),
    preparedAt:'2026-01-01T23:30:00Z',zh:{title:'測試賽後檢討',dek:'測試導言',body:'檢討第一段\n\n檢討第二段'},
    en:{title:'Synthetic postgame review',dek:'Synthetic dek',body:'Review one\n\nReview two'}};
  game.postgameReview = review; game.pins.postgameReview = digest(review);
  const after = '2026-01-02T01:00:00Z';
  const opts = extra => Object.assign({ownerEdition:base.edition,now:after,result,pins}, extra || {});
  const model = extra => pipeline.run(schedule,Object.assign({mode:'production'},opts(extra))).model.schedule[0];
  return Object.assign(base,{result,pins,review,after,opts,model});
}
const q = (lang, page) => '?lang='+lang+'&schedule='+id+'&game='+id;
test('postgame review renders only on its own page; the pregame preview stays as filed and both link to each other', () => {
  const {schedule,opts,model} = postgameSample();
  assert.equal(model().analysis.postgameReview.zh.title,'測試賽後檢討');
  for (const [lang,title,dek,body1,body2,toReview,toPregame,fin] of [
    ['zh','測試賽後檢討','測試導言','檢討第一段','檢討第二段','閱讀賽後檢討','閱讀賽前預測','終場'],
    ['en','Synthetic postgame review','Synthetic dek','Review one','Review two','Read the postgame review','Read the pregame preview','Final:']]) {
    const review = renderPage(schedule,'review',q(lang),null,opts());
    for (const t of [title,dek,body1,body2,fin,'id="postgame-review"']) assert.ok(review.includes(t),lang+' review '+t);
    assert.match(review,new RegExp('href="match\\.html\\?[^"]*game='+id+'[^"]*#pregame-column"'));
    assert.ok(!review.includes('Synthetic article') && !review.includes('reviewEmpty'),'no pregame body in the review');
    const match = renderPage(schedule,'match',q(lang),null,opts());
    for (const t of [title,dek,toReview,'Synthetic article','id="pregame-column"','4–2']) assert.ok(match.includes(t),lang+' match '+t);
    assert.ok(!match.includes(body2),'review body is not placed in the pregame page');
    assert.match(match,new RegExp('href="review\\.html\\?[^"]*game='+id));
    const home = renderPage(schedule,'home','?lang='+lang,null,opts());
    assert.ok(home.includes(title) && home.includes(toReview) && home.includes(toPregame),lang+' home leads with the review');
    assert.match(home,new RegExp('href="review\\.html\\?[^"]*game='+id)); assert.match(home,/#pregame-column"/);
    const listing = renderPage(schedule,'schedule','?lang='+lang,null,opts());
    assert.ok(listing.includes(toReview) && listing.includes(toPregame),lang+' schedule');
  }
});
test('a missing, mispinned, unverified, early or mismatched review hides only itself', () => {
  const s = postgameSample();
  const {schedule,game,review,result,pins,opts,model} = s;
  const original = JSON.parse(JSON.stringify(review));
  function hidden(label, mutate, extra, repin = true) {
    game.postgameReview = JSON.parse(JSON.stringify(original)); mutate(game.postgameReview);
    game.pins.postgameReview = repin ? digest(game.postgameReview) : digest(original);
    const g = model(extra);
    assert.equal(g.analysis.postgameReview,null,label);
    assert.ok(g.analysis.article && g.analysis.stages.length,label+': pregame column and desks stay');
    const page = renderPage(schedule,'review',q('zh'),null,opts(extra));
    assert.ok(!page.includes('檢討第二段') && !page.includes('id="postgame-review"'),label);
    const match = renderPage(schedule,'match',q('zh'),null,opts(extra));
    assert.ok(!match.includes('postgame-entry') && match.includes('Synthetic article'),label);
    return page;
  }
  hidden('wrong pin',r => { r.zh.title='改過的標題'; },undefined,false);
  hidden('result digest',r => { r.resultDigest='0'.repeat(64); });
  hidden('receipt',r => { r.receiptRef='NBA-'+id+'-R2'; });
  hidden('espn id',r => { r.espnGameId='1'; });
  hidden('nba id',r => { r.nbaGameId='0090000002'; });
  hidden('pregame digest',r => { r.pregameDigest='0'.repeat(64); });
  hidden('box hash format',r => { r.boxSha256='B'.repeat(64); });
  hidden('before confirmations',r => { r.preparedAt='2026-01-01T22:59:59Z'; });
  hidden('not filed yet',r => { r.preparedAt='2026-01-02T02:00:00Z'; });
  hidden('extra field',r => { r.approvedBy='x'; });
  hidden('non-string field',r => { r.boxSha256=null; });
  hidden('missing dek',r => { delete r.en.dek; });
  hidden('blank body',r => { r.zh.body='  '; });
  const notFinal = hidden('no verified result',() => {},{result:null});
  assert.ok(notFinal.includes('這場的賽後檢討尚未刊出') && /#pregame-column"/.test(notFinal),'missing review offers the pregame preview');
  hidden('result not pinned',() => {},{pins:{}});
  hidden('result digest differs from pin',() => {},{result:Object.assign({},result,{homeScore:86}),pins});
  // A review is tied to the pinned pregame article it reviews: without that article it is hidden too.
  game.postgameReview = JSON.parse(JSON.stringify(original)); game.pins.postgameReview = digest(game.postgameReview);
  game.pins.article = '0'.repeat(64);
  const g = model();
  assert.equal(g.analysis.article,null); assert.equal(g.analysis.postgameReview,null);
  assert.ok(g.analysis.stages.length,'desks stay');
});
test('without the owner edition the review page keeps its public behaviour and shows no private review', () => {
  const {schedule,result,pins} = postgameSample();
  const page = renderPage(schedule,'review',q('zh'),null,{now:'2026-01-02T01:00:00Z',result,pins});
  assert.ok(!/測試賽後檢討|檢討第二段|postgame-review|postgame-missing|pregame-column/.test(page));
  assert.ok(page.includes('today-empty'));
});

// Owner-only film guide under the postgame review. Synthetic data only.
function filmSample() {
  const s = postgameSample();
  const {game,review} = s;
  const video = slug => 'https://www.nba.com/watch/video/' + slug + '?game-highlights=' + id;
  const film = {nbaGameId:id,espnGameId:espnId,reviewDigest:digest(review),boxSha256:review.boxSha256,preparedAt:'2026-01-01T23:40:00Z',moments:[
    {period:1,clock:'11:46–11:44',zh:'測試觀察一',en:'Synthetic moment one',video:{url:video('synthetic-clip-one'),zh:'第一節開局片段',en:'First-quarter opening clip',duration:'2:47'}},
    {period:4,clock:'0:26.8–0:19.2',zh:'測試觀察二',en:'Synthetic moment two',video:null},
    {period:5,clock:'4:59–4:30',zh:'測試觀察三',en:'Synthetic moment three',video:{url:video('synthetic-clip-three'),zh:'延長賽片段',en:'Overtime clip',duration:'0:58'}}]};
  game.filmGuide = film; game.pins.filmGuide = digest(film);
  return Object.assign(s,{film,video});
}
test('film guide renders up to three game-clock moments under the review, linking out only to this game on NBA.com', () => {
  const {schedule,opts,model,film} = filmSample();
  assert.deepEqual(model().analysis.filmGuide,film);
  for (const [lang,label,first,link,length,third] of [['zh','比賽鐘（比賽剩餘時間）','第 1 節','NBA 官網影片：第一節開局片段','片長 2:47','延長賽 1'],
    ['en','Game clock (time remaining)','Q1','NBA.com video: First-quarter opening clip','Length 2:47','OT1']]) {
    const page = renderPage(schedule,'review',q(lang),null,opts());
    for (const t of ['id="film-guide"',label,first,link,length,third,'11:46–11:44','0:26.8–0:19.2']) assert.ok(page.includes(t),lang+' '+t);
    assert.equal((page.match(/<li>/g) || []).length,3);
    assert.equal((page.match(/href="https:\/\/www\.nba\.com\/watch\/video\//g) || []).length,2,'null video has no link');
    assert.ok(!/<iframe|<video|<embed|<source/.test(page),'no embedded media');
    const match = renderPage(schedule,'match',q(lang),null,opts());
    assert.ok(!match.includes('film-guide') && !match.includes('Synthetic moment'),'not on the pregame page');
  }
});
test('a mispinned, mismatched, early, malformed or off-site film guide hides only itself', () => {
  const s = filmSample();
  const {schedule,game,film,opts,model,video} = s;
  const original = JSON.parse(JSON.stringify(film));
  function hidden(label, mutate, repin = true) {
    game.filmGuide = JSON.parse(JSON.stringify(original)); mutate(game.filmGuide);
    game.pins.filmGuide = repin ? digest(game.filmGuide) : digest(original);
    const g = model();
    assert.equal(g.analysis.filmGuide,null,label);
    assert.ok(g.analysis.postgameReview && g.analysis.article,label+': both articles stay');
    const page = renderPage(schedule,'review',q('zh'),null,opts());
    assert.ok(page.includes('id="postgame-review"') && !page.includes('film-guide'),label);
  }
  const url = (u) => f => { f.moments[0].video.url = u; };
  hidden('wrong pin',f => { f.moments[0].zh = '改過'; },false);
  hidden('review digest',f => { f.reviewDigest = '0'.repeat(64); });
  hidden('box hash',f => { f.boxSha256 = 'c'.repeat(64); });
  hidden('other game',f => { f.nbaGameId = '0090000002'; });
  hidden('other ESPN id',f => { f.espnGameId = '1'; });
  hidden('before the review',f => { f.preparedAt = '2026-01-01T23:29:59Z'; });
  hidden('not filed yet',f => { f.preparedAt = '2026-01-02T02:00:00Z'; });
  hidden('four moments',f => { f.moments.push(f.moments[1]); });
  hidden('no moments',f => { f.moments = []; });
  hidden('extra field',f => { f.source = 'x'; });
  hidden('period zero',f => { f.moments[0].period = 0; });
  hidden('fractional period',f => { f.moments[0].period = 1.5; });
  for (const clock of ['11:46-11:44','11:44–11:46','12:01–11:59','5:01–4:59 OT','11:46','1:60–1:00','0:26.85–0:19.2'])
    hidden('clock '+clock,f => { f.moments[clock === '5:01–4:59 OT' ? 2 : 0].clock = clock === '5:01–4:59 OT' ? '5:01–4:59' : clock; });
  hidden('blank observation',f => { f.moments[0].en = ' '; });
  hidden('duration',f => { f.moments[0].video.duration = '167s'; });
  hidden('video extra field',f => { f.moments[0].video.embed = true; });
  hidden('missing video label',f => { delete f.moments[0].video.en; });
  for (const bad of [
    'http://www.nba.com/watch/video/synthetic-clip-one?game-highlights='+id,
    'https://nba.com/watch/video/synthetic-clip-one?game-highlights='+id,
    'https://www.nba.com.evil.test/watch/video/synthetic-clip-one?game-highlights='+id,
    'https://user:pw@www.nba.com/watch/video/synthetic-clip-one?game-highlights='+id,
    'https://www.nba.com:8443/watch/video/synthetic-clip-one?game-highlights='+id,
    'https://www.nba.com/watch/video/synthetic-clip-one?game-highlights=0090000002',
    'https://www.nba.com/watch/video/synthetic-clip-one?game-highlights='+id+'&autoplay=1',
    'https://www.nba.com/watch/video/synthetic-clip-one?game-highlights='+id+'&game-highlights='+id,
    'https://www.nba.com/watch/video/synthetic-clip-one',
    'https://www.nba.com/watch/video/synthetic-clip-one?game-highlights='+id+'#t=30',
    'https://www.nba.com/game/synthetic-clip-one?game-highlights='+id,
    'https://www.nba.com/watch/video/Synthetic_Clip?game-highlights='+id,
    'https://www.nba.com/watch/video/a/b?game-highlights='+id,
    'https://www.nba.com/watch/video/synthetic-clip-one?plsrc=other&game-highlights='+id,
    'https://www.nba.com/watch/video/synthetic-clip-one?plsrc=nba&plsrc=nba&game-highlights='+id,
    'javascript:alert(1)']) hidden('url '+bad,url(bad));
  // NBA.com's own plsrc=nba alongside the single game-highlights parameter is accepted.
  game.filmGuide = JSON.parse(JSON.stringify(original));
  game.filmGuide.moments[0].video.url = 'https://www.nba.com/watch/video/synthetic-clip-one?plsrc=nba&game-highlights='+id;
  game.pins.filmGuide = digest(game.filmGuide);
  assert.ok(model().analysis.filmGuide,'plsrc=nba accepted');
  // Without a valid review there is no film guide either.
  game.filmGuide = JSON.parse(JSON.stringify(original)); game.pins.filmGuide = digest(original);
  assert.equal(model({result:null}).analysis.filmGuide,null);
  assert.ok(video('x').startsWith('https://www.nba.com/watch/video/'));
});

test('the two articles are independent: a valid review stands without the pregame body, and the preview stands without the review', () => {
  // Review without the pregame body (absent, or failing its own pin) and without INITIAL.
  for (const [label, drop] of [['pregame body fails its pin', g => { g.article = Object.assign({}, g.article, { preparedAt: '2026-01-01T11:00:01Z' }); }],
    ['pregame body and INITIAL absent', g => { delete g.article; delete g.INITIAL; delete g.pins.INITIAL; }]]) {
    const s = postgameSample();
    const {schedule,game,opts,model} = s;
    drop(game);
    const g = model();
    assert.equal(g.analysis.article,null,label); assert.ok(g.analysis.postgameReview,label+': review stands');
    for (const lang of ['zh','en']) {
      const review = renderPage(schedule,'review',q(lang),null,opts());
      assert.ok(review.includes('id="postgame-review"') && review.includes(lang === 'zh' ? '檢討第二段' : 'Review two'),label);
      assert.ok(!review.includes('#pregame-column') && !/閱讀賽前預測|Read the pregame preview/.test(review),label+': no preview link without the preview');
      const match = renderPage(schedule,'match',q(lang),null,opts());
      assert.ok(match.includes('postgame-entry') && !match.includes('id="pregame-column"') && !match.includes('Synthetic article'),label);
      const home = renderPage(schedule,'home','?lang='+lang,null,opts());
      assert.ok(home.includes(lang === 'zh' ? '測試賽後檢討' : 'Synthetic postgame review') && !home.includes('#pregame-column'),label+' home');
      const listing = renderPage(schedule,'schedule','?lang='+lang,null,opts());
      assert.ok(/review\.html\?[^"]*game=/.test(listing) && !listing.includes('#pregame-column'),label+' schedule');
    }
  }
  // An article pin that is not a 64-hex digest cannot anchor a review.
  {
    const {game,model} = postgameSample();
    game.pins.article = 'not-a-digest';
    assert.equal(model().analysis.postgameReview,null);
  }
  // Preview without the review: the pregame article renders as filed, with no review link.
  {
    const {schedule,game,opts,model} = postgameSample();
    delete game.postgameReview; delete game.pins.postgameReview;
    const g = model();
    assert.equal(g.analysis.postgameReview,null); assert.ok(g.analysis.article);
    const match = renderPage(schedule,'match',q('zh'),null,opts());
    assert.ok(match.includes('Synthetic article') && match.includes('id="pregame-column"') && !match.includes('postgame-entry') && !/review\.html\?[^"]*game=/.test(match));
    const review = renderPage(schedule,'review',q('zh'),null,opts());
    assert.ok(review.includes('這場的賽後檢討尚未刊出') && review.includes('#pregame-column'));
  }
});

// M5 (NBA #180): three desk postgame reviews, each separately pinned. Synthetic data only, never live evidence.
function deskReviewSample() {
  const s = postgameSample();
  const {game,schedule,review} = s;
  const recorded = '2026-01-01T12:00:00Z';
  game.exploration = {schema:'mosport-a/exploration@1',nbaGameId:id,espnGameId:espnId,away:'ORL',home:'DET',tipoffAt:tip,
    initialDigest:game.pins.INITIAL,filedAt:recorded,source:{url:schedule.source.originalUrl,observedAt:observed,sha256:'a'.repeat(64)},
    desks:[{id:'turnovers',version:'1',awayValue:10,homeValue:13,pick:'AWAY'},{id:'second-chance',version:'1',awayValue:14,homeValue:16,pick:'HOME'}]};
  const columns = {};
  for (const desk of ['season-record','turnovers','second-chance']) {
    const copy = {title:'Pregame '+desk,body:'One.\n\nTwo.',watch:'Watch the ball.',limit:'One sample.'};
    columns[desk] = {en:copy,zh:{...copy,title:'賽前 '+desk}};
  }
  game.deskCopy = {nbaGameId:id,preparedAt:recorded,columns};
  game.pins.exploration = digest(game.exploration); game.pins.deskCopy = digest(game.deskCopy);
  const shared = {nbaGameId:id,espnGameId:espnId,receiptRef:review.receiptRef,resultDigest:review.resultDigest,boxSha256:'b'.repeat(64),
    pregameColumnsDigest:game.pins.deskCopy,preparedAt:'2026-01-01T23:45:00Z'};
  const make = (deskId,kind,vote,pick,tag) => ({deskId,...shared,originalVoteDigest:vote,originalVoteKind:kind,originalPick:pick,
    zh:{title:'測試'+tag+'檢討',dek:tag+'導言',body:tag+'第一段\n\n'+tag+'第二段'},en:{title:'Synthetic '+tag+' review',dek:tag+' dek',body:tag+' one\n\n'+tag+' two'}});
  const keys = {'season-record':'deskReviewSeasonRecord',turnovers:'deskReviewTurnovers','second-chance':'deskReviewSecondChance'};
  const originals = {
    'season-record': make('season-record','INITIAL',game.pins.INITIAL,'AWAY','戰績'),
    turnovers: make('turnovers','EXPLORATION',game.pins.exploration,'AWAY','失誤'),
    'second-chance': make('second-chance','EXPLORATION',game.pins.exploration,'HOME','二波')};
  function set(deskId, value, repin = true) {
    const key = keys[deskId];
    if (value === undefined) { delete game[key]; delete game.pins[key]; return; }
    game[key] = value; game.pins[key] = repin ? digest(value) : digest(originals[deskId]);
  }
  for (const deskId of Object.keys(keys)) set(deskId, JSON.parse(JSON.stringify(originals[deskId])));
  return Object.assign(s,{keys,originals,set});
}
const DESKS = ['season-record','turnovers','second-chance'];
const present = g => DESKS.filter(d => g.analysis.deskReviews[d]);
test('M5 (1, 7, 8): three complete, distinct desk reviews render on the review page with fixed anchors; pregame columns, votes and the editor review stay', () => {
  const {schedule,opts,model,originals} = deskReviewSample();
  const g = model();
  assert.deepEqual(present(g),DESKS);
  assert.equal(new Set(DESKS.map(d => g.analysis.deskReviews[d].zh.body)).size,3,'three different articles');
  for (const [lang,label,picks,sample,back,forward] of [
    ['zh','MOSPORT 研究專欄 · 戰績觀察室 · 賽後檢討',['賽前原票：魔術（賽前初選）','賽前原票：魔術（探索票）','賽前原票：活塞（探索票）'],'各席檢討同一場比賽，樣本共 1 場。','閱讀本席賽前專欄','閱讀本席賽後檢討'],
    ['en','MOSPORT Research Column · Record Desk · Postgame review',['Original pregame pick: Magic (initial pick)','Original pregame pick: Magic (exploratory pick)','Original pregame pick: Pistons (exploratory pick)'],'Each desk reviews the same game. Sample: one game.','Read this desk’s pregame column','Read this desk’s postgame review']]) {
    const page = renderPage(schedule,'review',q(lang),null,opts({realTeams:true}));
    for (const d of DESKS) {
      assert.ok(page.includes('id="desk-review-'+d+'"'),lang+' anchor '+d);
      assert.ok(page.includes(originals[d][lang].title) && page.includes(originals[d][lang].dek),lang+' '+d);
      assert.match(page,new RegExp('href="match\\.html\\?[^"]*game='+id+'[^"]*#desk-'+d+'"'),lang+' back link '+d);
    }
    assert.equal((page.match(/data-desk-review=/g) || []).length,3);
    for (const t of [label,...picks,sample,back,'id="postgame-review"']) assert.ok(page.includes(t),lang+' '+t);
    const match = renderPage(schedule,'match',q(lang),null,opts({realTeams:true}));
    for (const d of DESKS) assert.match(match,new RegExp('href="review\\.html\\?[^"]*game='+id+'[^"]*#desk-review-'+d+'"'),lang+' match link '+d);
    assert.equal(match.split(forward).length - 1,3);
    // Original pregame columns, picks and the editor review entry are unchanged and not replaced by review text.
    for (const t of ['postgame-entry','id="desk-season-record"','id="desk-turnovers"','id="desk-second-chance"',lang === 'zh' ? '賽前初選 · 魔術' : 'Initial pick · Magic',lang === 'zh' ? '探索票 · 魔術' : 'Exploratory pick · Magic',lang === 'zh' ? '探索票 · 活塞' : 'Exploratory pick · Pistons',lang === 'zh' ? '賽前 turnovers' : 'Pregame turnovers'])
      assert.ok(match.includes(t),lang+' match keeps '+t);
    assert.ok(!match.includes(originals.turnovers[lang].body.split('\n')[0]),'review body not placed in the pregame page');
  }
  // Public site: no desk review and nothing private.
  const pub = renderPage(schedule,'review',q('zh'),null,{now:'2026-01-02T01:00:00Z',result:opts().result,pins:opts().pins});
  assert.ok(!/desk-review|測試戰績檢討|研究專欄/.test(pub) && pub.includes('today-empty'));
});
test('M5 (2, 6): a missing desk review hides only itself; a single published review stands without the others or the editor review', () => {
  const s = deskReviewSample();
  const {schedule,game,opts,model,set} = s;
  set('turnovers');
  assert.deepEqual(present(model()),['season-record','second-chance']);
  let page = renderPage(schedule,'review',q('zh'),null,opts());
  assert.ok(!page.includes('desk-review-turnovers') && page.includes('desk-review-season-record') && page.includes('id="postgame-review"'));
  let match = renderPage(schedule,'match',q('zh'),null,opts());
  assert.ok(!match.includes('#desk-review-turnovers') && match.includes('#desk-review-second-chance'));
  // Only one desk review published, and no editor review.
  set('second-chance'); delete game.postgameReview; delete game.pins.postgameReview;
  const g = model();
  assert.deepEqual(present(g),['season-record']); assert.equal(g.analysis.postgameReview,null);
  page = renderPage(schedule,'review',q('zh'),null,opts());
  assert.ok(page.includes('id="desk-review-season-record"') && page.includes('本場 MOSPORT 總評尚未刊出') && page.includes('終場'));
  assert.equal((page.match(/data-desk-review=/g) || []).length,1);
  match = renderPage(schedule,'match',q('zh'),null,opts());
  assert.equal(match.split('閱讀本席賽後檢討').length - 1,1);
  assert.ok(match.includes('id="desk-turnovers"') && match.includes('id="desk-second-chance"'),'pregame desk columns stay');
});
test('M5 (3, 4, 5): wrong game, receipt, digest, desk ID or original vote, no verified final, or an early or future filing hide only that review', () => {
  const s = deskReviewSample();
  const {game,model,originals,set} = s;
  function only(target, label, mutate, repin = true) {
    for (const d of DESKS) set(d, JSON.parse(JSON.stringify(originals[d])));
    const value = JSON.parse(JSON.stringify(originals[target])); mutate(value); set(target, value, repin);
    const g = model();
    assert.equal(g.analysis.deskReviews[target],null,target+': '+label);
    assert.deepEqual(present(g),DESKS.filter(d => d !== target),target+': '+label+' leaves the others');
    assert.ok(g.analysis.postgameReview && g.analysis.article && g.analysis.desks && g.analysis.stages.length,label+': editor review and pregame stay');
  }
  for (const target of DESKS) {
    only(target,'wrong pin',r => { r.zh.title = '改過'; },false);
    only(target,'other NBA game',r => { r.nbaGameId = '0090000002'; });
    only(target,'other ESPN game',r => { r.espnGameId = '1'; });
    only(target,'other receipt',r => { r.receiptRef = 'NBA-'+id+'-R2'; });
    only(target,'result digest',r => { r.resultDigest = '0'.repeat(64); });
    only(target,'box hash format',r => { r.boxSha256 = 'B'.repeat(64); });
    only(target,'pregame columns digest',r => { r.pregameColumnsDigest = '0'.repeat(64); });
    only(target,'original vote digest',r => { r.originalVoteDigest = '0'.repeat(64); });
    only(target,'original pick flipped',r => { r.originalPick = r.originalPick === 'HOME' ? 'AWAY' : 'HOME'; });
    only(target,'vote kind',r => { r.originalVoteKind = r.originalVoteKind === 'INITIAL' ? 'EXPLORATION' : 'INITIAL'; });
    only(target,'desk id',r => { r.deskId = target === 'turnovers' ? 'second-chance' : 'turnovers'; });
    only(target,'before confirmations',r => { r.preparedAt = '2026-01-01T22:59:59Z'; });
    only(target,'not filed yet',r => { r.preparedAt = '2026-01-02T02:00:00Z'; });
    only(target,'extra field',r => { r.outcome = 'HIT'; });
    only(target,'non-string field',r => { r.preparedAt = 1; });
    only(target,'blank body',r => { r.en.body = ' '; });
  }
  // Swapped articles: the second-chance review filed under the turnovers key is refused; second-chance itself stands.
  for (const d of DESKS) set(d, JSON.parse(JSON.stringify(originals[d])));
  set('turnovers', JSON.parse(JSON.stringify(originals['second-chance'])));
  assert.deepEqual(present(model()),['season-record','second-chance']);
  // No verified final: every desk review and the editor review are hidden; the pregame stays.
  for (const d of DESKS) set(d, JSON.parse(JSON.stringify(originals[d])));
  for (const extra of [{result:null},{pins:{}}]) {
    const g = model(extra);
    assert.deepEqual(present(g),[]); assert.equal(g.analysis.postgameReview,null); assert.ok(g.analysis.article && g.analysis.desks);
  }
  // A broken exploration hides the two exploratory desk reviews, not the record desk review.
  game.exploration.filedAt = '2026-01-01T12:00:01Z';
  assert.deepEqual(present(model()),['season-record']);
});
test('M5: a desk review is tied to the pregame columns by pin; without their bodies it stands, with no dead link back', () => {
  const s = deskReviewSample();
  const {schedule,game,opts,model} = s;
  game.deskCopy = Object.assign({},game.deskCopy,{preparedAt:'2026-01-01T12:00:01Z'});   // body no longer matches its pin
  const g = model();
  assert.equal(g.analysis.desks,null); assert.deepEqual(present(g),DESKS);
  const page = renderPage(schedule,'review',q('zh'),null,opts());
  assert.ok(page.includes('#desk-season-record"') && !page.includes('#desk-turnovers"') && !page.includes('#desk-second-chance"'),'links back only to cards that exist');
  game.pins.deskCopy = 'not-a-digest';
  assert.deepEqual(present(model()),[]);
});
