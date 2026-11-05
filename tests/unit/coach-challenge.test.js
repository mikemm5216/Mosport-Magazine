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
  const dir=mkdtempSync(join(tmpdir(),'coach-test-')); let now='2026-11-06T00:00:00.000Z'; let source=game();
  const opts={ authenticate: token=> ['alice','bob','carol'].includes(token) ? {subject:token,active:true} : null, resolveGame:()=>source, clock:()=>now };
  const filename=join(dir,'ledger.sqlite'); const s=new ChallengeStore(filename,opts);
  t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true});});
  return { s,filename,opts,setTime:x=>now=x,setGame:x=>source=x };
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
