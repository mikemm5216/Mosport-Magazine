'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { ChallengeStore } = require('../../internal/coach/challenge-store.js');
let sqlite = true; try { require('node:sqlite'); } catch (_) { sqlite = false; }
const game = () => ({ gameId:'espn:100', homeId:'HOME', awayId:'AWAY', tipoffAt:'2026-11-06T01:00:00.000Z', cutoffAt:'2026-11-06T00:45:00.000Z', revision:'a'.repeat(64), state:'SCHEDULED' });
const command = (extra={}) => ({ requestId:'stance-1', gameId:'espn:100', kind:'STANCE', selection:'HOME', targetId:null, ...extra });
function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'coach-test-')); let now='2026-11-06T00:00:00.000Z'; let source=game(); let official=null; let pin=null;
  const opts={ authenticate: token=> ['alice','bob','carol'].includes(token) ? {subject:token,active:true} : null, resolveGame:()=>source, clock:()=>now, resolveOfficialResult:()=>official, resolveResultPin:()=>pin };
  const filename=join(dir,'ledger.sqlite'); const s=new ChallengeStore(filename,opts);
  t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true});});
  return { s,filename,opts,setTime:x=>now=x,setGame:x=>source=x,setResult:(r,p)=>{official=r;pin=p;} };
}
function check(name, fn){test(name,{skip:!sqlite},fn);}
check('persists original stance and opposing challenge across independent connections',t=>{
 const {s,filename,opts}=setup(t); const a=s.submit('alice',command());
 const other=new ChallengeStore(filename,opts);
 try { const b=other.submit('bob',command({requestId:'challenge-1',kind:'CHALLENGE',selection:'AWAY',targetId:a.record.recordId}));
 assert.equal(b.status,'CREATED');assert.equal(b.record.targetDigest,a.record.digest);assert.equal(b.record.visibility,'PRIVATE');assert.equal(b.record.result,'NOT_SETTLED');
 assert.equal(s.submit('bob',command({requestId:'challenge-1',kind:'CHALLENGE',selection:'AWAY',targetId:a.record.recordId})).status,'EXISTING');
 }finally{other.close();}
});
check('requires authentication and rejects user-controlled actor/clock fields',t=>{
 const {s}=setup(t);assert.throws(()=>s.submit('forged',command()),/UNAUTHENTICATED/);
 for(const extra of [{actor:'alice'},{recordedAt:'2000-01-01T00:00:00.000Z'},{digest:'x'}]) assert.throws(()=>s.submit('alice',command(extra)),/INVALID_COMMAND/);
 assert.equal(s.db.prepare('SELECT count(*) n FROM coach_records').get().n,0);
});
check('refuses exact cutoff and later; one millisecond before cutoff succeeds',t=>{
 const {s,setTime}=setup(t);setTime('2026-11-06T00:44:59.999Z');s.submit('alice',command());
 setTime(game().cutoffAt);assert.throws(()=>s.submit('bob',command({requestId:'s2'})),/PREGAME_CLOSED/);
 setTime('2026-11-06T01:01:00.000Z');assert.throws(()=>s.submit('bob',command({requestId:'s3'})),/PREGAME_CLOSED/);
 assert.equal(s.submit('alice',command()).status,'EXISTING');
});
check('request replay cannot change actor, selection, target or kind',t=>{
 const {s}=setup(t);s.submit('alice',command());
 assert.throws(()=>s.submit('bob',command()),/REQUEST_REPLAY_CONFLICT/);
 assert.throws(()=>s.submit('alice',command({selection:'AWAY'})),/REQUEST_REPLAY_CONFLICT/);
 assert.throws(()=>s.submit('bob',command({kind:'CHALLENGE',targetId:'stance-1',selection:'AWAY'})),/REQUEST_REPLAY_CONFLICT/);
});
check('one immutable stance per participant/game and one challenge per target',t=>{
 const {s}=setup(t);s.submit('alice',command());
 assert.throws(()=>s.submit('alice',command({requestId:'second'})),/UNIQUE/);
 const c=command({requestId:'c1',kind:'CHALLENGE',selection:'AWAY',targetId:'stance-1'});s.submit('bob',c);
 assert.throws(()=>s.submit('bob',{...c,requestId:'c2'}),/UNIQUE/);
 assert.throws(()=>s.db.exec("UPDATE coach_records SET actor='mallory'"),/IMMUTABLE_RECORD/);
 assert.throws(()=>s.db.exec('DELETE FROM coach_records'),/IMMUTABLE_RECORD/);
 assert.throws(()=>s.db.exec("INSERT OR REPLACE INTO coach_records SELECT * FROM coach_records WHERE request_id='stance-1'"),/IMMUTABLE_RECORD/);
 assert.equal(s.db.prepare('SELECT count(*) n FROM coach_records').get().n,2);
});
check('no self-challenge, same stance, missing target or challenge-of-challenge',t=>{
 const {s}=setup(t);s.submit('alice',command());
 const c=command({requestId:'c1',kind:'CHALLENGE',selection:'AWAY',targetId:'stance-1'});
 assert.throws(()=>s.submit('alice',c),/INVALID_CHALLENGE/);
 assert.throws(()=>s.submit('bob',{...c,selection:'HOME'}),/INVALID_CHALLENGE/);
 assert.throws(()=>s.submit('bob',{...c,targetId:'missing'}),/TARGET_NOT_FOUND/);
 s.submit('bob',c);assert.throws(()=>s.submit('carol',{...c,requestId:'c2',targetId:'c1',selection:'HOME'}),/INVALID_CHALLENGE/);
});
check('binds game revision and refuses changed schedule/team identities',t=>{
 const {s,setGame}=setup(t);s.submit('alice',command());
 for(const change of [{revision:'b'.repeat(64)},{homeId:'OTHER'},{cutoffAt:'2026-11-06T00:50:00.000Z'}]){
 setGame({...game(),...change});assert.throws(()=>s.submit('bob',command({requestId:'s2'})),/GAME_REVISION_CHANGED/);
 }
 assert.equal(s.db.prepare('SELECT count(*) n FROM coach_records').get().n,1);
});
check('rejects unqualified, malformed or non-pregame trusted game payloads',t=>{
 const {s,setGame}=setup(t);
 for(const change of [{state:'FINAL'},{state:'CANCELLED'},{homeId:'AWAY'},{gameId:'espn:200'},{cutoffAt:game().tipoffAt},{tipoffAt:'2026-02-30T01:00:00.000Z'},{revision:1},{extra:true}]){
 setGame({...game(),...change});assert.throws(()=>s.submit('alice',command()),/UNQUALIFIED_GAME/);
 }
});
check('clock rollback fails, including after idempotent receipt',t=>{
 const {s,setTime}=setup(t);s.submit('alice',command());
 setTime('2026-11-06T00:01:00.000Z');s.submit('alice',command());
 setTime('2026-11-06T00:00:59.999Z');assert.throws(()=>s.submit('bob',command({requestId:'s2'})),/CLOCK_ROLLBACK/);
 setTime('invalid');assert.throws(()=>s.submit('alice',command()),/INVALID_CLOCK/);
});
check('invalid command shapes and selectors are refused without rows',t=>{
 const {s}=setup(t);
 for(const c of [null,[],{},command({requestId:1}),command({selection:'DRAW'}),command({gameId:123}),command({targetId:'x'}),command({kind:'CHALLENGE',targetId:null})]) assert.throws(()=>s.submit('alice',c));
 assert.equal(s.db.prepare('SELECT count(*) n FROM coach_records').get().n,0);
});
check('challenge cannot cross games even when both trusted games are scheduled',t=>{
 const {s,setGame}=setup(t);s.submit('alice',command());
 setGame({...game(),gameId:'espn:200'});
 assert.throws(()=>s.submit('bob',command({requestId:'c2',gameId:'espn:200',kind:'CHALLENGE',selection:'AWAY',targetId:'stance-1'})),/INVALID_CHALLENGE/);
 assert.equal(s.db.prepare("SELECT count(*) n FROM coach_games WHERE game_id='espn:200'").get().n,0);
});
check('same request on a reopened database returns the original time and digest',t=>{
 const {s,filename,opts,setTime}=setup(t);const first=s.submit('alice',command()).record;
 setTime('2026-11-06T00:01:00.000Z');const reopened=new ChallengeStore(filename,opts);
 try{assert.deepEqual(reopened.submit('alice',command()).record,first);}finally{reopened.close();}
});
check('rejected post-cutoff attempt persists clock floor and cannot reopen game',t=>{
 const {s,setTime}=setup(t);s.submit('alice',command());
 setTime('2026-11-06T01:05:00.000Z');assert.throws(()=>s.submit('bob',command({requestId:'late'})),/PREGAME_CLOSED/);
 setTime('2026-11-06T00:30:00.000Z');assert.throws(()=>s.submit('bob',command({requestId:'early'})),/CLOCK_ROLLBACK/);
});
check('participant cannot hedge against their own locked position',t=>{
 const {s}=setup(t);s.submit('alice',command());s.submit('bob',command({requestId:'bob-home'}));
 assert.throws(()=>s.submit('bob',command({requestId:'bob-away',kind:'CHALLENGE',selection:'AWAY',targetId:'stance-1'})),/LOCKED_POSITION_CONFLICT/);
 s.submit('carol',command({requestId:'carol-away',kind:'CHALLENGE',selection:'AWAY',targetId:'stance-1'}));
 assert.throws(()=>s.submit('carol',command({requestId:'carol-home'})),/LOCKED_POSITION_CONFLICT/);
});

// Synthetic A-side coach-official-result@1 shape (NBA #178); no real game, score or receipt.
const RECEIPT='c'.repeat(64);
const result=(extra={})=>({ schema:'mosport-a/coach-official-result@1', status:'VERIFIED', nbaGameId:'0000000100', gameId:'espn:100', homeId:'HOME', awayId:'AWAY', tipoffAt:game().tipoffAt, gameRevision:'a'.repeat(64), homeScore:101, awayScore:99, winner:'HOME', revision:1, receiptSha256:RECEIPT, producedAt:'2026-11-06T03:30:00.000Z', ...extra });
function pair(t){
 const env=setup(t); env.s.submit('alice',command());
 env.s.submit('bob',command({requestId:'challenge-1',kind:'CHALLENGE',selection:'AWAY',targetId:'stance-1'}));
 env.setResult(result(),RECEIPT); return env;
}
const reason=r=>{assert.equal(r.status,'UNAVAILABLE');assert.equal(Object.keys(r).length,3);return r.reason;};
check('settles a locked pair privately from the pinned same-game official result, writing nothing',t=>{
 const {s}=pair(t); const before=s.db.prepare('SELECT request_id,body FROM coach_records ORDER BY request_id').all();
 const a=s.readout('alice','challenge-1'), b=s.readout('bob','challenge-1');
 assert.equal(a.status,'SETTLED');assert.equal(a.visibility,'PRIVATE');assert.equal(a.winner,'HOME');
 assert.deepEqual([a.viewerRole,a.viewerSelection,a.viewerOutcome],['STANCE','HOME','WON']);
 assert.deepEqual([b.viewerRole,b.viewerSelection,b.viewerOutcome],['CHALLENGE','AWAY','LOST']);
 assert.equal(a.stanceDigest,b.stanceDigest);assert.equal(a.challengeDigest,b.challengeDigest);assert.equal(a.resultReceiptSha256,RECEIPT);
 assert.ok(!JSON.stringify(a).includes('bob')&&!JSON.stringify(b).includes('alice'),'readout carries no participant subject');
 assert.deepEqual(s.readout('alice','challenge-1'),a,'deterministic');
 assert.deepEqual(s.db.prepare('SELECT request_id,body FROM coach_records ORDER BY request_id').all(),before);
});
check('unavailable without trusted identity or for a non-participant',t=>{
 const {s,filename,opts}=pair(t);
 assert.equal(reason(s.readout('forged','challenge-1')),'IDENTITY_UNAVAILABLE');
 assert.equal(reason(s.readout('carol','challenge-1')),'NOT_VISIBLE');
 const down=new ChallengeStore(filename,{...opts,authenticate:()=>{throw new Error('identity provider down');}});
 try{assert.equal(reason(down.readout('alice','challenge-1')),'IDENTITY_UNAVAILABLE');}finally{down.close();}
});
check('authenticated non-member and missing ticket get one identical response; finer reasons only after authorisation',t=>{
 const {s}=pair(t); const hidden=s.readout('carol','challenge-1');
 assert.deepEqual(hidden,{schema:'mosport-coach/challenge-readout@1',status:'UNAVAILABLE',reason:'NOT_VISIBLE'});
 for(const [who,idv] of [['carol','missing'],['alice','missing'],['bob','stance-1'],['carol','stance-1'],['alice',null],['alice','bad id'],['alice',{}]]) assert.deepEqual(s.readout(who,idv),hidden);
 assert.equal(reason(s.readout('alice','stance-1')),'TICKET_UNAVAILABLE'); // own original stance is not a pair
});
check('corrupt, null or reshaped stored ticket bodies fail closed without throwing',t=>{
 const {s}=pair(t); s.db.exec('DROP TRIGGER coach_no_update'); // simulate out-of-band file damage only
 const ok=s.readout('alice','challenge-1'); assert.equal(ok.status,'SETTLED');
 for(const rid of ['challenge-1','stance-1']){
  const orig=s.db.prepare('SELECT body FROM coach_records WHERE request_id=?').get(rid).body;
  for(const bad of ['{not json','null','[]','"x"','42',JSON.stringify({...JSON.parse(orig),extra:1}),JSON.stringify({...JSON.parse(orig),game:null})]){
   s.db.prepare('UPDATE coach_records SET body=? WHERE request_id=?').run(bad,rid);
   for(const who of ['alice','bob']){ let r; assert.doesNotThrow(()=>{r=s.readout(who,'challenge-1');}); assert.equal(r.status,'UNAVAILABLE'); assert.match(r.reason,/^(TICKET_UNAVAILABLE|TICKET_DIGEST_MISMATCH)$/); }
   assert.equal(reason(s.readout('carol','challenge-1')),'NOT_VISIBLE');
  }
  s.db.prepare('UPDATE coach_records SET body=? WHERE request_id=?').run(orig,rid);
 }
 assert.deepEqual(s.readout('alice','challenge-1'),ok);
});
check('SQL target_id must equal body.targetId, and an original stance must target null',t=>{
 const {s}=pair(t); s.db.exec('DROP TRIGGER coach_no_update');
 const redigest=r=>{const {digest,...b}=r;r.digest=require('node:crypto').createHash('sha256').update(JSON.stringify(b)).digest('hex');return JSON.stringify(r);};
 for(const [rid,change] of [['challenge-1',{targetId:'other'}],['stance-1',{targetId:'challenge-1'}]]){
  const orig=s.db.prepare('SELECT body FROM coach_records WHERE request_id=?').get(rid).body;
  s.db.prepare('UPDATE coach_records SET body=? WHERE request_id=?').run(redigest({...JSON.parse(orig),...change}),rid);
  assert.equal(reason(s.readout('alice','challenge-1')),'TICKET_DIGEST_MISMATCH');
  s.db.prepare('UPDATE coach_records SET body=? WHERE request_id=?').run(orig,rid);
 }
 s.db.prepare("UPDATE coach_records SET target_id='challenge-1' WHERE request_id='stance-1'").run();
 assert.equal(reason(s.readout('alice','challenge-1')),'TICKET_DIGEST_MISMATCH');
 s.db.prepare("UPDATE coach_records SET target_id=NULL WHERE request_id='stance-1'").run();
 s.db.exec('DROP TRIGGER coach_no_delete'); s.db.prepare("DELETE FROM coach_records WHERE request_id='stance-1'").run();
 assert.equal(reason(s.readout('alice','challenge-1')),'NOT_VISIBLE'); // stance owner no longer provable from rows
 assert.equal(reason(s.readout('bob','challenge-1')),'TICKET_UNAVAILABLE');
});
check('unavailable when a stored ticket digest or opponent target no longer matches',t=>{
 const {s}=pair(t);
 s.db.exec('DROP TRIGGER coach_no_update'); // simulate out-of-band file tampering only
 const tamper=(rid,fn)=>{const row=s.db.prepare('SELECT body FROM coach_records WHERE request_id=?').get(rid);const r=JSON.parse(row.body);fn(r);s.db.prepare('UPDATE coach_records SET body=? WHERE request_id=?').run(JSON.stringify(r),rid);return row.body;};
 let orig=tamper('stance-1',r=>{r.selection='AWAY';});
 assert.equal(reason(s.readout('alice','challenge-1')),'TICKET_DIGEST_MISMATCH');
 s.db.prepare('UPDATE coach_records SET body=? WHERE request_id=?').run(orig,'stance-1');
 orig=tamper('challenge-1',r=>{r.targetDigest='0'.repeat(64);const {digest,...b}=r;r.digest=require('node:crypto').createHash('sha256').update(JSON.stringify(b)).digest('hex');});
 assert.equal(reason(s.readout('alice','challenge-1')),'TARGET_MISMATCH');
 s.db.prepare('UPDATE coach_records SET body=? WHERE request_id=?').run(orig,'challenge-1');
 assert.equal(s.readout('alice','challenge-1').status,'SETTLED');
});
check('unavailable when the official result is missing, unverified, unpinned or off-pin',t=>{
 const {s,filename,opts,setResult}=pair(t);
 for(const [r,p] of [[null,RECEIPT],[{schema:'mosport-a/coach-official-result@1',status:'MISSING'},RECEIPT],[result({status:'MISSING'}),RECEIPT],[result({extra:1}),RECEIPT],[result({schema:'mosport-b/game-result@1'}),RECEIPT]]){setResult(r,p);assert.equal(reason(s.readout('alice','challenge-1')),'RESULT_UNAVAILABLE');}
 for(const p of [null,'d'.repeat(64),'C'.repeat(64)]){setResult(result(),p);assert.equal(reason(s.readout('alice','challenge-1')),'RESULT_PIN_MISMATCH');}
 setResult(()=>{throw new Error('x');},RECEIPT);
 const thrower=new ChallengeStore(filename,{...opts,resolveOfficialResult:()=>{throw new Error('provider down');}});
 const bare=new ChallengeStore(filename,{authenticate:opts.authenticate,resolveGame:opts.resolveGame,clock:opts.clock});
 try{assert.equal(reason(thrower.readout('alice','challenge-1')),'RESULT_UNAVAILABLE');assert.equal(reason(bare.readout('alice','challenge-1')),'RESULT_UNAVAILABLE');}finally{thrower.close();bare.close();}
 assert.throws(()=>new ChallengeStore(filename,{...opts,resolveResultPin:'pin'}),/TRUSTED_ADAPTERS_REQUIRED/);
});
check('unavailable when the result is for another game, team identity, tipoff or snapshot revision',t=>{
 const {s,setResult}=pair(t);
 for(const extra of [{gameId:'espn:200'},{homeId:'AWAY',awayId:'HOME'},{homeId:'OTHER'},{tipoffAt:'2026-11-06T01:30:00.000Z'},{gameRevision:'b'.repeat(64)}]){setResult(result(extra),RECEIPT);assert.equal(reason(s.readout('alice','challenge-1')),'RESULT_GAME_MISMATCH');}
});
check('unavailable for internally inconsistent official result values',t=>{
 const {s,setResult}=pair(t);
 for(const extra of [{winner:'AWAY'},{homeScore:99,awayScore:99,winner:'HOME'},{homeScore:-1},{homeScore:1.5},{revision:0},{producedAt:game().tipoffAt},{producedAt:'not-a-time'},{nbaGameId:'x'}]){setResult(result(extra),RECEIPT);assert.equal(reason(s.readout('alice','challenge-1')),'RESULT_INVALID');}
 setResult(result({homeScore:90,awayScore:99,winner:'AWAY',revision:2}),RECEIPT);
 const r=s.readout('alice','challenge-1');assert.deepEqual([r.winner,r.viewerOutcome,r.resultRevision],['AWAY','LOST',2]);
});
check('unavailable when a ticket is outside the pinned game or after the cutoff',t=>{
 const {s}=pair(t);
 s.db.exec('DROP TRIGGER coach_game_no_update');
 const g=s.db.prepare("SELECT body FROM coach_games WHERE game_id='espn:100'").get().body;
 s.db.prepare("UPDATE coach_games SET body=? WHERE game_id='espn:100'").run(JSON.stringify({...JSON.parse(g),homeId:'OTHER'}));
 assert.equal(reason(s.readout('alice','challenge-1')),'GAME_MISMATCH');
 s.db.prepare("UPDATE coach_games SET body=? WHERE game_id='espn:100'").run(g);
 s.db.exec('DROP TRIGGER coach_no_update');
 const row=s.db.prepare("SELECT body FROM coach_records WHERE request_id='challenge-1'").get();const r=JSON.parse(row.body);
 r.recordedAt=game().cutoffAt;const {digest,...b}=r;r.digest=require('node:crypto').createHash('sha256').update(JSON.stringify(b)).digest('hex');
 s.db.prepare("UPDATE coach_records SET body=? WHERE request_id='challenge-1'").run(JSON.stringify(r));
 assert.equal(reason(s.readout('alice','challenge-1')),'DEADLINE_VIOLATION');
});
