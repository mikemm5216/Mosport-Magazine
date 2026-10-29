/*
 * B-P3-02 — DEMO policy cases for Founder acceptance M-01…M-07 (spec 04 §2).
 * Shared by tests/unit/policy-cases.test.js and the internal editor prototype.
 * Everything is fictional and marked demo; URLs use the reserved .invalid domain.
 */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('../../js/contracts/contracts.js') : root.MOSPORT_CONTRACTS;
  var S = C.SCHEMAS;
  var fp = function (s) { return C.sha256('demo-case:' + s); };

  function source(id, kind, extra) {
    return Object.assign({
      schema: S.source, id: id, kind: kind, originalUrl: kind === 'WORLD_PACKAGE' || kind === 'MOSPORT_ORIGINAL' ? null : 'https://demo.invalid/case/' + id,
      publisher: 'DEMO ' + kind.toLowerCase().replace(/_/g, ' '), authorOrAccount: null, publishedAt: '2026-10-31T10:00:00Z', observedAt: '2026-10-31T10:05:00Z',
      rightsStatus: kind === 'WORLD_PACKAGE' || kind === 'MOSPORT_ORIGINAL' ? 'OWNED' : 'LINK_ONLY', accessMethod: 'DEMO', contentFingerprint: fp(id),
      quotedSpan: null, language: 'en', verificationState: kind === 'RUMOR' ? 'UNVERIFIED' : 'CONFIRMED', dedupeClusterId: null, demo: true
    }, extra || {});
  }

  var HOT_QUOTE = 'The franchise confirmed on Friday that its starting point guard will miss the next six weeks after an MRI revealed a grade two hamstring strain suffered in the fourth quarter.';

  var SOURCES = [
    source('S-OFF-FINAL', 'OFFICIAL_FACT', { publisher: 'DEMO official results' }),
    source('S-OFF-INJURY', 'OFFICIAL_FACT', { publisher: 'DEMO official injury report' }),
    source('S-OFF-RETRACT', 'OFFICIAL_FACT', { publisher: 'DEMO official notice (later retracted)' }),
    source('S-OFF-CORRECT', 'OFFICIAL_FACT', { publisher: 'DEMO official notice (later disputed)' }),
    source('S-RUMOR-POST', 'RUMOR', { publisher: 'DEMO social post', authorOrAccount: 'demo-anon', dedupeClusterId: 'CL-COACH' }),
    source('S-REPORT-OTHER', 'REPORT', { publisher: 'DEMO other outlet' }),
    source('S-HOT-LINKONLY', 'REPORT', { publisher: 'DEMO trending outlet', quotedSpan: HOT_QUOTE }),
    source('S-WORLD-LOCK', 'WORLD_PACKAGE', { publisher: 'MOSPORT World (DEMO fixture)' }),
    source('S-MOSPORT-ORIG', 'MOSPORT_ORIGINAL', { publisher: 'MOSPORT (DEMO)' })
  ];
  /* Ten URLs repeating one anonymous post: one independent source, not ten (media acceptance 4). */
  for (var i = 1; i <= 10; i++) SOURCES.push(source('S-RUMOR-COPY-' + i, 'RUMOR', { publisher: 'DEMO repost site ' + i, dedupeClusterId: 'CL-COACH' }));

  var GAMES = [{
    schema: S.game, gameId: 'CASE-0001', away: 'GSW', home: 'LAL', status: 'SCHEDULED', tipoff: '2026-11-01T03:00:00Z', venueTz: 'America/Los_Angeles', score: null,
    world: { state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'FINAL_CONFIRMED', snapshotId: 'case0001', homeWinProbability: 0.61, interval60: null,
      verdict: { zh: '湖人主場較有利。', en: 'The Lakers at home are favoured.' }, why: null, missingReason: null }
  }];

  function item(id, type, zh, en, extra) {
    return Object.assign({
      schema: S.item, id: id, revision: 1, type: type, editorialLabel: null, riskTriggers: [], publishState: 'DRAFT', homeEligible: true,
      sourceRefs: [], verifiedFacts: ['demo-fact'], publishedAt: null, validUntil: null, approvalReceiptRef: null, worldAnalysisRef: null,
      linkedGameIds: [], linkedTeams: [], teams: [], correctionOfRevision: null, demo: true,
      zh: { headline: zh[0], summary: zh[1] || null, meta: null }, en: { headline: en[0], summary: en[1] || null, meta: null }
    }, extra || {});
  }

  var CASES = {
    'M-01': {
      title: 'Ordinary confirmed official news: AUTO → PUBLISHED with receipt',
      item: item('CASE-M01', 'NEWS', ['公牛終場比分確認', '官方終場比分已公布，比賽依原訂時間完成。'], ['Bulls final score confirmed', 'The official final score is posted; the game finished as scheduled.'],
        { sourceRefs: ['S-OFF-FINAL'], linkedTeams: ['CHI'] }),
      expect: { afterQA: 'AWAITING_OR_APPROVED', route: 'AUTO', final: 'PUBLISHED' }
    },
    'M-02': {
      title: 'Unverified coach-firing rumour: tracked, waits for a human, never a confirmed fact',
      item: item('CASE-M02', 'NEWS', ['教練去留傳聞（未獲證實）', '社群貼文稱教練將被解職，球隊未證實。此訊息未獲證實。'], ['Coach status rumour (unconfirmed)', 'A social post claims the coach will be fired; the team has not confirmed it. This is unconfirmed.'],
        { riskTriggers: ['UNVERIFIED_RUMOR'], sourceRefs: ['S-RUMOR-POST', 'S-RUMOR-COPY-1', 'S-RUMOR-COPY-2'], verifiedFacts: ['post-exists'] }),
      undeclared: item('CASE-M02-UNDECLARED', 'NEWS', ['教練確定被解職', '球隊已決定解職教練。'], ['Coach has been fired', 'The team has decided to fire the coach.'],
        { sourceRefs: ['S-RUMOR-POST'] }),
      expect: { route: 'HUMAN', final: 'AWAITING_HUMAN_APPROVAL' }
    },
    'M-03': {
      title: 'Confirmed major injury: still HUMAN_REQUIRED; no publication without sign-off',
      item: item('CASE-M03', 'NEWS', ['主力控衛傷停六週', '官方傷病報告確認控衛傷停六週。'], ['Starting point guard out six weeks', 'The official injury report confirms a six-week absence.'],
        { editorialLabel: 'BREAKING_NEWS', riskTriggers: ['MAJOR_NEWS'], sourceRefs: ['S-OFF-INJURY'], linkedTeams: ['LAL'] }),
      expect: { route: 'HUMAN', final: 'PUBLISHED_AFTER_HUMAN' }
    },
    'M-04': {
      title: '"MOSPORT EXCLUSIVE" that is a repost: label fails, cannot be approved as exclusive',
      item: item('CASE-M04', 'FEATURE', ['獨家：勇士陣容調整', '勇士將調整先發陣容。'], ['Exclusive: Warriors lineup change', 'The Warriors will change their starting lineup.'],
        { editorialLabel: 'MOSPORT_EXCLUSIVE', riskTriggers: ['EXCLUSIVE_CLAIM'], sourceRefs: ['S-REPORT-OTHER'] }),
      fixed: { editorialLabel: null, riskTriggers: [], zh: { headline: '勇士陣容調整（引述他報）', summary: '他報報導勇士將調整先發陣容。', meta: null }, en: { headline: 'Warriors lineup change, per another outlet', summary: 'Another outlet reports the Warriors will change their starting lineup.', meta: null } },
      expect: { qa: 'policy FAIL EXCLUSIVE_NOT_PROVEN', final: 'DRAFT' }
    },
    'M-05': {
      title: 'Public Review with complete data: still HUMAN',
      item: item('CASE-M05', 'REVIEW', ['太陽守住主場', '官方比分確認；對照已鎖定的最終版判讀。'], ['Phoenix holds at home', 'Official score confirmed; checked against the locked final read.'],
        { sourceRefs: ['S-OFF-FINAL', 'S-WORLD-LOCK'], teams: ['SAC', 'PHX'] }),
      expect: { route: 'HUMAN', final: 'AWAITING_HUMAN_APPROVAL' }
    },
    'M-06': {
      title: 'Source retracted / contradicted after publication: pulled, corrected or withdrawn, receipts kept',
      item: item('CASE-M06', 'NEWS', ['賽程調整公告', '官方公告比賽改期。'], ['Schedule change notice', 'An official notice moves the game.'], { sourceRefs: ['S-OFF-RETRACT'] }),
      second: item('CASE-M06B', 'NEWS', ['開賽時間更新', '官方公告開賽時間提前。'], ['Tip-off time update', 'An official notice moves tip-off earlier.'], { sourceRefs: ['S-OFF-CORRECT'] }),
      expect: { final: 'CORRECTION_PENDING → WITHDRAWN / CORRECTED' }
    },
    'M-07': {
      title: 'Trending source with no reuse rights: receipt kept, full-text reproduction blocked',
      item: item('CASE-M07', 'NEWS', ['控衛傷停六週', HOT_QUOTE.slice(0, 120)], ['Point guard out six weeks', HOT_QUOTE], { sourceRefs: ['S-HOT-LINKONLY'] }),
      rewritten: { zh: { headline: '他報：控衛傷停', summary: '他報報導控衛將缺陣一段時間，詳見原文連結。', meta: null }, en: { headline: 'Report: point guard sidelined', summary: 'Another outlet reports the point guard will miss time; see the original link.', meta: null } },
      expect: { qa: 'rights FAIL REPRODUCTION_NOT_PERMITTED', final: 'HELD_FOR_EVIDENCE' }
    }
  };

  var PASS_ALL = {
    fact: { result: 'PASS', by: 'qa:demo-fact-checker' }, language: { result: 'PASS', by: 'qa:demo-language-checker' },
    rights: { result: 'PASS', by: 'qa:demo-rights-checker' }, policy: { result: 'PASS', by: 'qa:demo-policy-checker' }
  };

  var api = { SOURCES: SOURCES, GAMES: GAMES, CASES: CASES, PASS_ALL: PASS_ALL, HOT_QUOTE: HOT_QUOTE };
  if (node) module.exports = api;
  else root.MOSPORT_POLICY_CASES = api;
})(typeof window !== 'undefined' ? window : globalThis);
