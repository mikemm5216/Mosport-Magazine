/*
 * DEMO issue fixture. Real NBA team names and codes; every read, number, story
 * and source is fictional. Shapes follow the PROPOSED contracts in
 * docs/founder/2026-10-28-spec-lock/02_UI_PRODUCT_HANDOFF.md §5 and 03 §3–5.
 * None of this is a prediction or a news report.
 */
(function () {
  var F = (window.MOSPORT_FIXTURES = window.MOSPORT_FIXTURES || {});

  var games = [
    {
      gameId: 'DEMO-0041', away: 'GSW', home: 'LAL', status: 'SCHEDULED',
      tipoff: '2026-11-01T03:00:00Z', venueTz: 'America/Los_Angeles',
      world: {
        state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'FINAL_CONFIRMED',
        snapshotId: '4f9c2a1e', homeWinProbability: 0.61,
        interval60: [0.54, 0.67],
        verdict: { zh: '湖人主場較有利。', en: 'The Lakers at home are favoured.' },
        why: {
          zh: '勇士背靠背第二晚，賽前移動 560 公里，並少了 31.5 分鐘的輪替時間；湖人休息兩天、輪替完整。',
          en: 'Golden State is on the second night of a back-to-back after 560 km of travel and is missing 31.5 rotation minutes; the Lakers are rested with a full rotation.'
        }
      }
    },
    {
      gameId: 'DEMO-0042', away: 'BOS', home: 'NYK', status: 'SCHEDULED',
      tipoff: '2026-11-01T00:00:00Z', venueTz: 'America/New_York',
      world: {
        state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'INITIAL', snapshotId: '7a01c3d9',
        homeWinProbability: 0.52,
        verdict: { zh: '接近均勢，尼克主場略有利。', en: 'Close to even; the Knicks have a slight home edge.' }
      }
    },
    {
      gameId: 'DEMO-0043', away: 'DEN', home: 'OKC', status: 'LIVE', score: { away: 29, home: 34 },
      tipoff: '2026-11-01T01:00:00Z', venueTz: 'America/Chicago',
      world: {
        state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'FINAL_CONFIRMED', snapshotId: 'c55e0b21',
        homeWinProbability: 0.58,
        verdict: { zh: '賽前判讀已鎖定，比賽中不重算。', en: 'Pregame read locked; not recomputed during play.' }
      }
    },
    {
      gameId: 'DEMO-0044', away: 'PHI', home: 'TOR', status: 'SCHEDULED',
      tipoff: '2026-11-01T00:30:00Z', venueTz: 'America/Toronto',
      world: {
        state: 'ISSUED', distributionEligibility: 'PUBLIC', version: 'INITIAL', snapshotId: '19bd7e44',
        homeWinProbability: 0.47,
        verdict: { zh: '76人客場略有利，等待最終確認。', en: 'Philadelphia slightly favoured on the road; final check pending.' }
      }
    },
    {
      /* Schedule-only: World has not issued. Must stay off the magazine. */
      gameId: 'DEMO-0045', away: 'MIA', home: 'MIL', status: 'POSTPONED',
      tipoff: '2026-11-01T00:00:00Z', venueTz: 'America/Chicago',
      world: { state: 'NOT_ISSUED', missingReason: 'GAME_POSTPONED' }
    },
    {
      /* Issued but internal only. Its number must never render. */
      gameId: 'DEMO-0046', away: 'SAS', home: 'DAL', status: 'SCHEDULED',
      tipoff: '2026-11-01T01:30:00Z', venueTz: 'America/Chicago',
      world: { state: 'ISSUED', distributionEligibility: 'INTERNAL', version: 'INITIAL', snapshotId: 'aa31f002', homeWinProbability: 0.55 }
    }
  ];

  var approvedHuman = function (who, at) { return { mode: 'HUMAN', approverId: who, approvedAt: at }; };
  var auto = { mode: 'AUTO', policyVersion: 'demo-policy-0' };

  var items = [
    {
      id: 'ED-LEAD-0041', type: 'GAME_ANALYSIS', publishState: 'PUBLISHED', homeEligible: true,
      worldAnalysisRef: 'DEMO-0041', linkedGameIds: ['DEMO-0041'],
      sourceRefs: ['world:DEMO-0041@4f9c2a1e'], verifiedFacts: ['world-package'],
      publishedAt: '2026-10-31T23:45:00Z', approval: auto, approvalReceiptRef: 'RCPT-DEMO-001',
      zh: { headline: '湖人主場較有利' }, en: { headline: 'Lakers favoured at home' }
    },
    {
      id: 'ED-NEWS-0007', type: 'NEWS', editorialLabel: 'BREAKING_NEWS', riskTriggers: ['MAJOR_NEWS'],
      publishState: 'PUBLISHED', homeEligible: true, demo: true,
      sourceRefs: ['src:demo-official-injury-report'], verifiedFacts: ['official-injury-report'],
      publishedAt: '2026-10-31T22:10:00Z', validUntil: '2026-11-01T06:00:00Z',
      approval: approvedHuman('editor:demo-01', '2026-10-31T22:05:00Z'), approvalReceiptRef: 'RCPT-DEMO-002',
      zh: { headline: '湖人主場戰關鍵戰', summary: '最新傷兵更新與戰力影響解析' },
      en: { headline: 'Lakers home showdown', summary: 'Latest injury update and what it changes' }
    },
    {
      id: 'ED-FEAT-0003', type: 'FEATURE', editorialLabel: 'MOSPORT_EXCLUSIVE', riskTriggers: ['EXCLUSIVE_CLAIM'],
      publishState: 'PUBLISHED', homeEligible: true, demo: true,
      sourceRefs: ['src:mosport-original-demo'], verifiedFacts: ['original-analysis'],
      publishedAt: '2026-10-31T20:00:00Z',
      approval: approvedHuman('editor:demo-01', '2026-10-31T19:40:00Z'), approvalReceiptRef: 'RCPT-DEMO-003',
      zh: { headline: '勇士新陣容化學反應', summary: '數據揭露 3 個決定性變化' },
      en: { headline: 'The Warriors’ new-lineup chemistry', summary: 'Three decisive changes in the numbers' }
    },
    {
      id: 'ED-STRK-0011', type: 'STREAK', editorialLabel: 'STREAK_WATCH',
      publishState: 'PUBLISHED', homeEligible: true, demo: true, linkedTeams: ['BOS'],
      sourceRefs: ['src:demo-official-results-1029', 'src:demo-official-results-1030', 'src:demo-official-results-1031'],
      verifiedFacts: ['official-final-x3'],
      publishedAt: '2026-10-31T16:00:00Z', approval: auto, approvalReceiptRef: 'RCPT-DEMO-004',
      zh: { headline: '塞爾提克三連勝', summary: '三場官方終場結果確認。連勝是已發生的事實，不是下一場的預測。' },
      en: { headline: 'Celtics win three straight', summary: 'Three official final results confirmed. A streak is what happened, not a forecast for the next game.' }
    },
    {
      id: 'ED-REV-0040', type: 'REVIEW', publishState: 'PUBLISHED', homeEligible: true, demo: true,
      linkedGameIds: ['DEMO-0040'], teams: ['SAC', 'PHX'],
      sourceRefs: ['world:DEMO-0040@final-lock', 'src:demo-official-final-0040'], verifiedFacts: ['official-final'],
      publishedAt: '2026-10-31T09:00:00Z',
      approval: approvedHuman('editor:demo-02', '2026-10-31T08:40:00Z'), approvalReceiptRef: 'RCPT-DEMO-005',
      zh: {
        headline: '太陽守住主場',
        summary: '官方比分 112–107。鎖定的最終版判讀中，三個 Falsifier 都沒有觸發，兩個 Turning Point 發生了一個。',
        meta: '對照 15:30 ET 鎖定的最終版 · 官方修訂 1 次 · 原判讀不改寫'
      },
      en: {
        headline: 'Phoenix holds at home',
        summary: 'Official score 112–107. In the locked final read, none of the three falsifiers triggered, and one of two turning points occurred.',
        meta: 'Against the final read locked 15:30 ET · 1 official revision · original read not rewritten'
      }
    },
    {
      /* Rumour waiting for a human: tracked internally, never rendered. */
      id: 'ED-RUM-0002', type: 'NEWS', editorialLabel: 'BREAKING_NEWS', riskTriggers: ['UNVERIFIED_RUMOR'],
      publishState: 'AWAITING_HUMAN_APPROVAL', homeEligible: false, demo: true,
      sourceRefs: ['src:demo-anonymous-post'], verifiedFacts: [],
      publishedAt: null, approval: null, approvalReceiptRef: null,
      zh: { headline: '【不應出現】未證實的教練解職傳聞' }, en: { headline: '[MUST NOT RENDER] Unverified coach-firing rumour' }
    }
  ];

  F.demo = {
    mode: 'DEMO',
    issue: {
      volume: 1, number: 305, date: '2026-11-01', page: 2,
      topic: { line1: 'NBA', line2: 'GAME DAY' },
      edition: { zh: 'NBA 版', en: 'NBA EDITION' }
    },
    games: games,
    items: items,
    /* Editor layout plan: which item goes where. The renderer adds nothing to it. */
    layout: {
      cover: ['ED-NEWS-0007', 'ED-FEAT-0003', 'ED-RUM-0002'],
      lead: 'ED-LEAD-0041',
      games: ['DEMO-0042', 'DEMO-0043', 'DEMO-0044', 'DEMO-0045', 'DEMO-0046'],
      stories: ['ED-REV-0040', 'ED-STRK-0011']
    }
  };
})();
