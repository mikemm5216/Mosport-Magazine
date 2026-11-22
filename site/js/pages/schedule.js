/*
 * Schedule: every valid game the issue carries, eligible or not (spec 02 §4.2,
 * acceptance U-01). Home eligibility never removes a game from here. Games whose
 * record failed validation are counted, not shown and not guessed.
 */
window.MOSPORT_PAGE = {
  id: 'schedule',
  render: function (c) {
    var T = c.T, esc = c.esc, R = c.issue, I = c.meta;
    if (R.status !== 'OK' && R.status !== 'STALE' && R.status !== 'SCHEDULE_ONLY') return c.topbar + '<main class="sheet">' + c.stateMessage(R) + '</main>';
    var rows = R.schedule.slice().sort(function (a, b) { return Date.parse(a.tipoff) - Date.parse(b.tipoff); }).map(function (g) {
      var st = g.status === 'LIVE' ? '<span class="st st-live">● ' + T('live') + (g.score ? ' · ' + esc(g.home) + ' ' + esc(g.score.home) + '–' + esc(g.score.away) : '') + '</span>'
        : g.status === 'POSTPONED' ? '<span class="st st-off">' + T('postponed') + '</span>'
        : g.status === 'CANCELLED' ? '<span class="st st-off">' + T('cancelled') + '</span>'
        : g.status === 'FINAL' ? '<span class="st st-plain">' + T('final') + '</span>'
        : '<span class="st st-plain">' + esc(c.statusLabel(g)) + '</span>';
      var read = c.onMagazine(g)
        ? '<a class="pill" href="' + c.href('match.html', { game: g.gameId }) + '">' + T('readOpen') + ' →</a>'
        : '<span class="muted">' + esc(T(g.noReadReason === 'STALE' ? 'readStale' : 'readNone')) + '</span>';
      if (g.source) read = c.pregameRecord(g) + '<a class="pill" href="' + c.href('match.html', { game: g.gameId }) + '">' + esc(g.analysis && g.analysis.article ? (c.lang === 'zh' ? '閱讀賽前分析' : 'Read the matchup analysis') : T('gameDetails')) + ' →</a>';
      /* Game over with a filed review: the review leads, the pregame preview stays reachable. */
      if (g.source && g.analysis && g.analysis.postgameReview) read = c.pregameRecord(g) +
        '<a class="pill" href="' + c.href('review.html', { game: g.gameId }) + '">' + (c.lang === 'zh' ? '閱讀賽後檢討' : 'Read the postgame review') + ' →</a> ' +
        '<a class="pill" href="' + c.href('match.html', { game: g.gameId }) + '#pregame-column">' + (c.lang === 'zh' ? '閱讀賽前預測' : 'Read the pregame preview') + ' →</a>';
      return '<tr><td><span class="sch-m"><mo-team-logo code="' + esc(g.away) + '" size="sm"></mo-team-logo><b>' + esc(g.away) + ' @ ' + esc(g.home) + '</b><span class="muted">' + esc(c.teamName(g.away, 'nick') + ' @ ' + c.teamName(g.home, 'nick')) + '</span><mo-team-logo code="' + esc(g.home) + '" size="sm"></mo-team-logo></span>' + (g.source ? '<p class="pv">NBA game ID ' + esc(g.gameId) + '</p>' + c.sourceNote(g.source) : '') + '</td>' +
        '<td>' + esc(c.tipShort(g)) + '</td><td>' + st + '</td><td>' + read + '</td></tr>';
    }).join('');
    var invalid = R.invalidGames ? '<p class="state-msg state-partial" role="status">' + esc(T('invalidGames', { n: R.invalidGames })) + '</p>' : '';
    var otherEditions = (c.editions || []).filter(function (ed) { return !R.schedule.some(function (g) { return g.gameId === ed.id; }); });
    var archive = otherEditions.length ? '<section class="card"><h2>' + (c.lang === 'zh' ? '其他對戰' : 'More matchups') + '</h2>' +
      otherEditions.map(function (ed) { return '<a class="pill" href="' + c.href('match.html', { schedule: ed.id, game: ed.id }) + '">' +
        esc(c.teamName(ed.away,'nick') + ' @ ' + c.teamName(ed.home,'nick')) + '</a>'; }).join(' ') + '</section>' : '';
    var table = rows
      ? '<div class="table-wrap"><table class="sch"><thead><tr><th>' + T('colMatch') + '</th><th>' + T('colTime') + '</th><th>' + T('colStatus') + '</th><th>' + T('colRead') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<p class="today-empty">' + esc(T('scheduleEmpty')) + '</p>';
    return c.topbar + '<main class="sheet">' +
      '<header class="sheet-head"><p class="kicker">MOSPORT · ' + esc(I.scheduleOnly ? T('savedSchedule') : c.issueDate(I.date)) + (R.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</p><h1>' + T('scheduleTitle') + '</h1><p class="muted">' + T(I.scheduleOnly ? 'savedScheduleIntro' : 'scheduleIntro') + '</p></header>' +
      (R.status === 'STALE' ? c.stateMessage(R) : '') + invalid + table +
    archive + '</main>';
  }
};
