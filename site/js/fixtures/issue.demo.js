/*
 * DEMO MagazineIssue (contract `mosport-b/magazine-issue@1`).
 * Real NBA team names and codes; every read, number, story, source and
 * approval is fictional and marked demo. Source URLs use the reserved
 * `.invalid` domain so they can never be mistaken for a real report.
 * The game entries use B's prototype World view (`mosport-b/prototype-game@0`),
 * not a MOSPORT-A contract. None of this is a prediction or a news report.
 */
(function () {
  var C = window.MOSPORT_CONTRACTS;
  var S = C.SCHEMAS;
  var F = (window.MOSPORT_FIXTURES = window.MOSPORT_FIXTURES || {});
  var fp = function (s) { return C.sha256('demo-fingerprint:' + s); };
  var QA_PASS = { fact: 'PASS', language: 'PASS', rights: 'PASS', policy: 'PASS' };

  function game(g) {
    var w = g.world;
    return {
      schema: S.game, gameId: g.gameId, away: g.away, home: g.home, status: g.status,
      tipoff: g.tipoff, venueTz: g.venueTz, score: g.score || null,
      world: {
        state: w.state, distributionEligibility: w.distributionEligibility || null, version: w.version || null,
        snapshotId: w.snapshotId || null, homeWinProbability: w.homeWinProbability == null ? null : w.homeWinProbability,
        interval60: w.interval60 || null, verdict: w.verdict || null, why: w.why || null, missingReason: w.missingReason || null
      }
    };
  }

  var games = [
    game({
      gameId: 'DEMO-0041', away: 'GSW', home: 'LAL', status: 'SCHEDULED',
      tipoff: '2026-11-01T03:00:00Z', venueTz: 'America/Los_Angeles',
      world: {
        state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'FINAL_CONFIRMED',
        snapshotId: '4f9c2a1e', homeWinProbability: 0.61, interval60: [0.54, 0.67],
        verdict: { zh: '湖人主場較有利。', en: 'The Lakers at home are favoured.' },
        why: {
          zh: '勇士背靠背第二晚，賽前移動 560 公里，並少了 31.5 分鐘的輪替時間；湖人休息兩天、輪替完整。',
          en: 'Golden State is on the second night of a back-to-back after 560 km of travel and is missing 31.5 rotation minutes; the Lakers are rested with a full rotation.'
        }
      }
    }),
    game({
      gameId: 'DEMO-0042', away: 'BOS', home: 'NYK', status: 'SCHEDULED',
      tipoff: '2026-11-01T00:00:00Z', venueTz: 'America/New_York',
      world: { state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'INITIAL', snapshotId: '7a01c3d9', homeWinProbability: 0.52,
        verdict: { zh: '接近均勢，尼克主場略有利。', en: 'Close to even; the Knicks have a slight home edge.' } }
    }),
    game({
      gameId: 'DEMO-0043', away: 'DEN', home: 'OKC', status: 'LIVE', score: { away: 29, home: 34 },
      tipoff: '2026-11-01T01:00:00Z', venueTz: 'America/Chicago',
      world: { state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'FINAL_CONFIRMED', snapshotId: 'c55e0b21', homeWinProbability: 0.58,
        verdict: { zh: '賽前判讀已鎖定，比賽中不重算。', en: 'Pregame read locked; not recomputed during play.' } }
    }),
    game({
      gameId: 'DEMO-0044', away: 'PHI', home: 'TOR', status: 'SCHEDULED',
      tipoff: '2026-11-01T00:30:00Z', venueTz: 'America/Toronto',
      world: { state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'INITIAL', snapshotId: '19bd7e44', homeWinProbability: 0.47,
        verdict: { zh: '76人客場略有利，等待最終確認。', en: 'Philadelphia slightly favoured on the road; final check pending.' } }
    }),
    /* Schedule-only: World has not issued. Must stay off the magazine. */
    game({ gameId: 'DEMO-0045', away: 'MIA', home: 'MIL', status: 'POSTPONED', tipoff: '2026-11-01T00:00:00Z', venueTz: 'America/Chicago',
      world: { state: 'NOT_ISSUED', missingReason: 'GAME_POSTPONED' } }),
    /* Issued but internal only. Its number must never reach the public payload. */
    game({ gameId: 'DEMO-0046', away: 'SAS', home: 'DAL', status: 'SCHEDULED', tipoff: '2026-11-01T01:30:00Z', venueTz: 'America/Chicago',
      world: { state: 'ISSUED', distributionEligibility: 'INTERNAL', version: 'INITIAL', snapshotId: 'aa31f002', homeWinProbability: 0.55 } })
  ];

  function source(id, kind, publisher, url, observedAt, extra) {
    return Object.assign({
      schema: S.source, id: id, kind: kind, originalUrl: url, publisher: publisher, authorOrAccount: null,
      publishedAt: null, observedAt: observedAt, rightsStatus: kind === 'WORLD_PACKAGE' || kind === 'MOSPORT_ORIGINAL' ? 'OWNED' : 'LINK_ONLY',
      accessMethod: 'DEMO', contentFingerprint: fp(id), quotedSpan: null, language: 'en',
      verificationState: kind === 'RUMOR' ? 'UNVERIFIED' : 'CONFIRMED', dedupeClusterId: null, demo: true
    }, extra || {});
  }
  var sources = [
    source('world:DEMO-0041@4f9c2a1e', 'WORLD_PACKAGE', 'MOSPORT World (DEMO fixture)', null, '2026-10-31T23:40:00Z'),
    source('world:DEMO-0040@final-lock', 'WORLD_PACKAGE', 'MOSPORT World (DEMO fixture)', null, '2026-10-31T08:00:00Z'),
    source('src:demo-official-injury-report', 'OFFICIAL_FACT', 'DEMO official injury report', 'https://demo.invalid/nba/injury-report/2026-10-31', '2026-10-31T21:50:00Z'),
    source('src:mosport-original-demo', 'MOSPORT_ORIGINAL', 'MOSPORT (DEMO)', null, '2026-10-31T19:00:00Z'),
    source('src:demo-official-results-1029', 'OFFICIAL_FACT', 'DEMO official results', 'https://demo.invalid/nba/results/2026-10-29', '2026-10-30T06:00:00Z'),
    source('src:demo-official-results-1030', 'OFFICIAL_FACT', 'DEMO official results', 'https://demo.invalid/nba/results/2026-10-30', '2026-10-31T06:00:00Z'),
    source('src:demo-official-results-1031', 'OFFICIAL_FACT', 'DEMO official results', 'https://demo.invalid/nba/results/2026-10-31', '2026-10-31T15:00:00Z'),
    source('src:demo-official-final-0040', 'OFFICIAL_FACT', 'DEMO official box score', 'https://demo.invalid/nba/final/DEMO-0040', '2026-10-31T07:30:00Z'),
    source('src:demo-anonymous-post', 'RUMOR', 'DEMO social post', 'https://demo.invalid/social/post/0002', '2026-10-31T21:00:00Z', { authorOrAccount: 'demo-anonymous', rightsStatus: 'UNVERIFIED' })
  ];

  function item(o) {
    return Object.assign({
      schema: S.item, revision: 1, editorialLabel: null, riskTriggers: [], homeEligible: true,
      publishState: 'PUBLISHED', validUntil: null, approvalReceiptRef: null, worldAnalysisRef: null,
      linkedGameIds: [], linkedTeams: [], teams: [], correctionOfRevision: null, demo: true
    }, o);
  }
  var items = [
    item({ id: 'ED-LEAD-0041', type: 'GAME_ANALYSIS', worldAnalysisRef: 'DEMO-0041', linkedGameIds: ['DEMO-0041'],
      sourceRefs: ['world:DEMO-0041@4f9c2a1e'], verifiedFacts: ['world-package'], publishedAt: '2026-10-31T23:45:00Z',
      approvalReceiptRef: 'RCPT-DEMO-001',
      zh: { headline: '湖人主場較有利', summary: null, meta: null }, en: { headline: 'Lakers favoured at home', summary: null, meta: null } }),
    item({ id: 'ED-NEWS-0007', type: 'NEWS', editorialLabel: 'BREAKING_NEWS', riskTriggers: ['MAJOR_NEWS'],
      sourceRefs: ['src:demo-official-injury-report'], verifiedFacts: ['official-injury-report'],
      publishedAt: '2026-10-31T22:10:00Z', validUntil: '2026-11-01T06:00:00Z', approvalReceiptRef: 'RCPT-DEMO-002',
      zh: { headline: '湖人主場戰關鍵戰', summary: '最新傷兵更新與戰力影響解析', meta: null },
      en: { headline: 'Lakers home showdown', summary: 'Latest injury update and what it changes', meta: null } }),
    item({ id: 'ED-FEAT-0003', type: 'FEATURE', editorialLabel: 'MOSPORT_EXCLUSIVE', riskTriggers: ['EXCLUSIVE_CLAIM'],
      sourceRefs: ['src:mosport-original-demo'], verifiedFacts: ['original-analysis'], publishedAt: '2026-10-31T20:00:00Z',
      approvalReceiptRef: 'RCPT-DEMO-003',
      zh: { headline: '勇士新陣容化學反應', summary: '數據揭露 3 個決定性變化', meta: null },
      en: { headline: 'The Warriors’ new-lineup chemistry', summary: 'Three decisive changes in the numbers', meta: null } }),
    item({ id: 'ED-STRK-0011', type: 'STREAK', editorialLabel: 'STREAK_WATCH', linkedTeams: ['BOS'],
      sourceRefs: ['src:demo-official-results-1029', 'src:demo-official-results-1030', 'src:demo-official-results-1031'],
      verifiedFacts: ['official-final-x3'], publishedAt: '2026-10-31T16:00:00Z', approvalReceiptRef: 'RCPT-DEMO-004',
      zh: { headline: '塞爾提克三連勝', summary: '三場官方終場結果確認。連勝是已發生的事實，不是下一場的預測。', meta: null },
      en: { headline: 'Celtics win three straight', summary: 'Three official final results confirmed. A streak is what happened, not a forecast for the next game.', meta: null } }),
    item({ id: 'ED-REV-0040', type: 'REVIEW', linkedGameIds: ['DEMO-0040'], teams: ['SAC', 'PHX'],
      sourceRefs: ['world:DEMO-0040@final-lock', 'src:demo-official-final-0040'], verifiedFacts: ['official-final'],
      publishedAt: '2026-10-31T09:00:00Z', approvalReceiptRef: 'RCPT-DEMO-005',
      zh: { headline: '太陽守住主場', summary: '官方比分 112–107。鎖定的最終版判讀中，三個 Falsifier 都沒有觸發，兩個 Turning Point 發生了一個。',
        meta: '對照 15:30 ET 鎖定的最終版 · 官方修訂 1 次 · 原判讀不改寫' },
      en: { headline: 'Phoenix holds at home', summary: 'Official score 112–107. In the locked final read, none of the three falsifiers triggered, and one of two turning points occurred.',
        meta: 'Against the final read locked 15:30 ET · 1 official revision · original read not rewritten' } }),
    /* Rumour waiting for a human: tracked internally, never rendered. */
    item({ id: 'ED-RUM-0002', type: 'NEWS', editorialLabel: 'BREAKING_NEWS', riskTriggers: ['UNVERIFIED_RUMOR'],
      publishState: 'AWAITING_HUMAN_APPROVAL', homeEligible: false, sourceRefs: ['src:demo-anonymous-post'], verifiedFacts: [],
      publishedAt: null,
      zh: { headline: '【不應出現】未證實的教練解職傳聞', summary: null, meta: null }, en: { headline: '[MUST NOT RENDER] Unverified coach-firing rumour', summary: null, meta: null } })
  ];

  function approval(id, it, mode, approverId, decidedAt) {
    return { schema: S.approval, id: id, itemId: it.id, itemRevision: it.revision, contentHash: C.contentHash(it),
      mode: mode, decision: 'APPROVED', policyVersion: 'demo-policy-0', approverId: approverId, decidedAt: decidedAt,
      qa: QA_PASS, note: null, demo: true };
  }
  var byId = {};
  items.forEach(function (i) { byId[i.id] = i; });
  var approvals = [
    approval('RCPT-DEMO-001', byId['ED-LEAD-0041'], 'AUTO', null, '2026-10-31T23:44:00Z'),
    approval('RCPT-DEMO-002', byId['ED-NEWS-0007'], 'HUMAN', 'editor:demo-01', '2026-10-31T22:05:00Z'),
    approval('RCPT-DEMO-003', byId['ED-FEAT-0003'], 'HUMAN', 'editor:demo-01', '2026-10-31T19:40:00Z'),
    approval('RCPT-DEMO-004', byId['ED-STRK-0011'], 'AUTO', null, '2026-10-31T15:59:00Z'),
    approval('RCPT-DEMO-005', byId['ED-REV-0040'], 'HUMAN', 'editor:demo-02', '2026-10-31T08:40:00Z')
  ];

  F.demo = {
    schema: S.issue, issueId: 'DEMO-ISSUE-0305', mode: 'DEMO', worldSource: 'PROTOTYPE_FIXTURE',
    generatedAt: '2026-10-31T23:50:00Z', validUntil: '2026-11-02T00:00:00Z',
    issue: {
      volume: 1, number: 305, date: '2026-11-01', page: 2,
      topic: { line1: 'NBA', line2: 'GAME DAY' },
      edition: { zh: 'NBA 版', en: 'NBA EDITION' }
    },
    games: games, items: items, sources: sources, sourceEvents: [], approvals: approvals,
    /* Editor layout plan: which item goes where. The renderer adds nothing to it. */
    layout: {
      schema: S.layout, id: 'LAYOUT-DEMO-0305', issueId: 'DEMO-ISSUE-0305', revision: 1,
      decidedBy: 'editor:demo-01', decidedAt: '2026-10-31T23:48:00Z',
      cover: ['ED-NEWS-0007', 'ED-FEAT-0003', 'ED-RUM-0002'],
      lead: 'ED-LEAD-0041',
      games: ['DEMO-0042', 'DEMO-0043', 'DEMO-0044', 'DEMO-0045', 'DEMO-0046'],
      stories: ['ED-REV-0040', 'ED-STRK-0011'],
      demo: true
    }
  };
  /* The pinned "now" a DEMO issue is read at (the morning of its date in Taipei). */
  F.DEMO_NOW = '2026-11-01T00:00:00Z';
})();
