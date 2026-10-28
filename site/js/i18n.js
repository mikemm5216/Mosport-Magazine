/*
 * Interface strings. Brand strings (MOSPORT, More than sport, Be Your Own Coach)
 * are fixed English in both editions (Founder lock B-01, B-02, B-05) and live in
 * BRAND, not here. Editorial labels (BREAKING NEWS, MOSPORT EXCLUSIVE, STREAK
 * WATCH) and the TODAY section masthead follow the visual master and are Latin
 * display type in both editions.
 */
window.MOSPORT_BRAND = { name: 'MOSPORT', slogan: 'More than sport', coach: 'Be Your Own Coach' };
window.MOSPORT_LABELS = { BREAKING_NEWS: 'BREAKING NEWS', MOSPORT_EXCLUSIVE: 'MOSPORT EXCLUSIVE', STREAK_WATCH: 'STREAK WATCH' };

window.MOSPORT_I18N = {
  zh: {
    navLabel: '主要導覽', today: '今日', schedule: '賽程', review: '檢討',
    almanac: 'Almanac 歷史資料庫', almanacSoon: '即將推出',
    sportLabel: '運動', nba: 'NBA', baseball: '棒球', soccer: '足球', comingSoon: '即將推出',
    toDark: '夜間', toLight: '日間', langLabel: '語言',
    issueLine: 'VOL. {vol} · 第 {no} 期 · {date}',
    thisIssue: '本期主題',
    tagline: ['每一場比賽。', '清楚的分析。', '開賽前讀完。'],
    todayMast: 'TODAY',
    slate: '台北時間 · {total} 場比賽 · {read} 場已有判讀',
    emptyToday: '今日尚無已發布的判讀或報導。完整場次請見賽程。',
    openSchedule: '查看賽程',
    ver_INITIAL: '第一版', ver_FINAL_CONFIRMED: '最終版 · 已確認', ver_FINAL_UPDATED: '最終版 · 已更新',
    homeWin: '主隊勝率',
    open: '閱讀完整分析',
    otherGames: '今日其他比賽', seeAll: '查看全部', scrollMore: '更多比賽',
    live: '進行中', postponed: '延期', scheduled: '未開賽', final: '終場', notIssued: '尚無判讀',
    reviewHead: '昨日檢討', seeReview: '查看檢討',
    streakHead: '連勝觀察',
    coverLineReads: '今日 {n} 場重點判讀',
    coverLineReview: '昨日檢討：{h}',
    coverLineStreak: '連勝觀察：{h}',
    demoNote: 'DEMO · 真實球隊名稱，判讀、數值與報導皆為虛構，不是預測 · 今日頁不顯示賠率',
    demoBadge: 'DEMO',
    refused: '此期內容未取得發布資格，暫不顯示。',
    taipei: '台北', venue: '場館',
    note_almanac: 'MOSPORT Almanac 是歷史資料庫入口，尚未上線。',
    note_sport: '此運動即將推出：目前沒有賽程、分析或上線日期。',
    close: '關閉',
    scheduleTitle: '賽程', scheduleIntro: '本日全部場次，包括尚未有判讀、延期或僅供內部的場次。',
    colMatch: '對戰', colTime: '台北時間', colStatus: '狀態', colRead: '判讀',
    readOpen: '查看判讀', readNone: '尚未發布',
    reviewTitle: '檢討', reviewIntro: '公開檢討只評估已鎖定的原判讀與官方結果，經人工核准後刊出；內部 Audit 不在此頁。',
    reviewEmpty: '目前沒有已核准的公開檢討。',
    back: '回到今日',
    zoomLabel: '閱讀縮放', zoomWidth: '符合寬度', zoomFit: '整頁', zoomOut: '縮小', zoomIn: '放大', zoomReset: '回到 100%', zoomCurrent: '目前縮放比例',
    zoomHint: '鍵盤：+ − 0 F W', readerLabel: '雜誌跨頁（可縮放與捲動）'
  },
  en: {
    navLabel: 'Primary', today: 'Today', schedule: 'Schedule', review: 'Review',
    almanac: 'MOSPORT Almanac', almanacSoon: 'Coming later',
    sportLabel: 'Sport', nba: 'NBA', baseball: 'Baseball', soccer: 'Soccer', comingSoon: 'Coming soon',
    toDark: 'Dark', toLight: 'Light', langLabel: 'Language',
    issueLine: 'VOL. {vol} · NO. {no} · {date}',
    thisIssue: 'This issue',
    tagline: ['Every game.', 'Clear analysis.', 'Before tip-off.'],
    todayMast: 'TODAY',
    slate: 'Taipei time · {total} games · {read} with a read',
    emptyToday: 'No published read or story yet today. Every game is on the Schedule.',
    openSchedule: 'Open the schedule',
    ver_INITIAL: 'First read', ver_FINAL_CONFIRMED: 'Final · Confirmed', ver_FINAL_UPDATED: 'Final · Updated',
    homeWin: 'Home win',
    open: 'Read the full analysis',
    otherGames: 'Other games today', seeAll: 'See all', scrollMore: 'More games',
    live: 'Live', postponed: 'Postponed', scheduled: 'Scheduled', final: 'Final', notIssued: 'No read yet',
    reviewHead: 'Yesterday’s review', seeReview: 'See the review',
    streakHead: 'Streak watch',
    coverLineReads: '{n} games read today',
    coverLineReview: 'Review: {h}',
    coverLineStreak: 'Streak watch: {h}',
    demoNote: 'DEMO · real team names; reads, numbers and stories are fictional, not predictions · Today shows no odds',
    demoBadge: 'DEMO',
    refused: 'This issue is not cleared for publication.',
    taipei: 'Taipei', venue: 'Venue',
    note_almanac: 'MOSPORT Almanac is the historical archive. It is not live yet.',
    note_sport: 'Coming soon: no schedule, analysis or launch date yet.',
    close: 'Close',
    scheduleTitle: 'Schedule', scheduleIntro: 'Every game today, including games without a read, postponed games and internal-only reads.',
    colMatch: 'Game', colTime: 'Taipei time', colStatus: 'Status', colRead: 'Read',
    readOpen: 'Open the read', readNone: 'Not published',
    reviewTitle: 'Review', reviewIntro: 'A public review judges only the locked original read against the official result, and is published after human approval. Internal audit is not shown here.',
    reviewEmpty: 'No approved public review yet.',
    back: 'Back to Today',
    zoomLabel: 'Reader zoom', zoomWidth: 'Fit width', zoomFit: 'Fit page', zoomOut: 'Zoom out', zoomIn: 'Zoom in', zoomReset: 'Reset to 100%', zoomCurrent: 'Current zoom',
    zoomHint: 'Keys: + − 0 F W', readerLabel: 'Magazine spread (zoom and scroll)'
  }
};
