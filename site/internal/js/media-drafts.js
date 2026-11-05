/* Offline internal draft compiler. World is the only judgment authority.
 * Templates render supplied, validated records; no generation service or publishing. */
(function(root) {
  'use strict';
  var node=typeof module!=='undefined' && module.exports;
  var C=node?require('../../js/contracts/contracts.js'):root.MOSPORT_CONTRACTS;
  var R=node?require('../../js/contracts/locked-world.js'):root.MOSPORT_LOCKED_WORLD;
  var SCHEMA='mosport-b/internal-media-drafts@1';
  function fail(code) {return {ok:false,code:code};}
  function exact(x,keys) {return x!==null && typeof x==='object' && Object.getPrototypeOf(x)===Object.prototype && Object.keys(x).sort().join('|')===keys.slice().sort().join('|');}
  function instant(x) {var n=typeof x==='string'?Date.parse(x):NaN;return Number.isFinite(n) && new Date(n).toISOString()===x?n:NaN;}
  function build(inspection,pins,options,now,facts) {
    try {
      if (!exact(options,['createdAt','mode']) || !['DEMO','INTERNAL_INPUT'].includes(options.mode) || !Number.isFinite(instant(options.createdAt)) || !Number.isFinite(instant(now)) || instant(options.createdAt)>instant(now)) return fail('DRAFT_OPTIONS_REFUSED');
      var view=R.inspect(inspection,pins,now,facts===undefined?undefined:{facts:facts});
      if(view.status!=='OK')return fail(view.code);
      if(view.world.readState!=='ACTIVE')return fail('READ_'+view.world.readState);
      // No backdating draft creation to before the selected artifact existed.
      if(instant(options.createdAt)<instant(view.world.asOf))return fail('DRAFT_BEFORE_SOURCE');
      if(facts!==undefined && !view.facts.ok)return fail(view.facts.reason);
      var p=inspection.worldPackage, game=p.game;
      var label=options.mode==='DEMO'?'DEMO・合成測試草稿':'INTERNAL・未發布草稿';
      var refs={world:{revision:p.revision,inspectionFingerprint:inspection.fingerprint,lockFingerprint:inspection.lock.fingerprint,stage:inspection.lock.stage},receipt:{sourceRef:p.evidence.receipt.sourceRef,observedAt:p.evidence.receipt.observedAt,sha256:p.evidence.receipt.sha256},facts:facts===undefined?null:{fingerprint:facts.fingerprint,worldRevision:facts.worldRevision}};
      var statements=[
        {id:'matchup',text:game.away.displayCode+' @ '+game.home.displayCode,provenance:['world','receipt']},
        {id:'schedule',text:'來源暫定開賽時間：'+game.tipoffAt+'；尚未獨立確認。',provenance:['world','receipt']},
        {id:'world-status',text:'World 尚未產生預測；勝率、結論及原因均不提供。',provenance:['world']},
        {id:'lock-status',text:'紀錄階段：'+inspection.lock.stage+'；時間狀態：'+inspection.lock.timing+'。這不是已發布預測。',provenance:['world']}
      ];
      if(facts!==undefined) {
        var names={overallRecord:'來源總戰績',avgPoints:'來源平均得分',avgRebounds:'來源平均籃板',avgAssists:'來源平均助攻',fieldGoalPct:'來源投籃百分比',threePointPct:'來源三分百分比'};
        ['away','home'].forEach(function(side){var s=view.facts.sides[side];var values=Object.assign({overallRecord:s.overallRecord},s.statistics);Object.keys(names).forEach(function(key){if(values[key].status==='OBSERVED')statements.push({id:side+'-'+key,text:game[side].displayCode+' '+names[key]+'：'+values[key].displayValue+'。',provenance:['world','receipt','facts']});});});
      }
      var notice='僅供內部編輯檢查。資料權利未確認，禁止直接發布；本草稿不是預測或建議。';
      statements.unshift({id:'draft-disclosure',text:label+'。'+notice,provenance:[]});
      var body={schema:SCHEMA,templateVersion:'1',state:'DRAFT',visibility:'INTERNAL_ONLY',mode:options.mode,createdAt:options.createdAt,validUntil:p.validUntil,gameId:inspection.lock.gameId,label:label,notice:notice,sourceQualification:'NOT_INDEPENDENTLY_AUTHENTICATED',rights:'UNVERIFIED',publiclyEligible:false,approval:null,qa:'NOT_RUN',provenance:refs,statements:statements,
        article:{title:label+'｜'+game.away.displayCode+' @ '+game.home.displayCode,notice:notice,paragraphs:statements.map(function(s){return {text:s.text,statementRefs:[s.id]};})},
        podcast:{status:'SCRIPT_ONLY_NO_AUDIO',label:label,notice:notice,segments:statements.map(function(s,i){return {speaker:i%2?'EDITOR_B':'EDITOR_A',text:s.text,statementRefs:[s.id]};})},
        imageShort:{status:'STORYBOARD_ONLY_NO_ASSETS',label:label,notice:notice,cards:statements.map(function(s){return {label:label,text:s.text,statementRefs:[s.id],asset:null};})}
      };
      return {ok:true,bundle:Object.assign(body,{fingerprint:C.sha256(C.canonical(body))})};
    }catch(_error){return fail('MEDIA_DRAFT_REFUSED');}
  }
  // Re-read the exact source/pins on every export. A stored draft is not a publication receipt.
  function read(bundle,inspection,pins,now,facts) {
    if(!bundle || bundle.schema!==SCHEMA)return fail('MEDIA_DRAFT_REFUSED');
    var rebuilt=build(inspection,pins,{createdAt:bundle.createdAt,mode:bundle.mode},now,facts);
    if(!rebuilt.ok)return rebuilt;
    if(C.canonical(rebuilt.bundle)!==C.canonical(bundle))return fail('DRAFT_SOURCE_OR_CONTENT_CHANGED');
    return rebuilt;
  }
  var api={SCHEMA:SCHEMA,build:build,read:read};if(node)module.exports=api;else root.MOSPORT_MEDIA_DRAFTS=api;
})(typeof window!=='undefined'?window:globalThis);
