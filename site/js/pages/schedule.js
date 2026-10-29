/*
 * Schedule: every valid game the issue carries, eligible or not (spec 02 §4.2,
 * acceptance U-01). Home eligibility never removes a game from here. Games whose
 * record failed validation are counted, not shown and not guessed.
 */
window.MOSPORT_PAGE = {
  id: 'schedule',
  render: function (c) {
    var T = c.T, esc = c.esc, R = c.issue, I = c.meta;
    if (R.status !== 'OK' && R.status !== 'STALE') return c.topbar + '<main class="sheet">' + c.stateMessage(R) + '</main>';
    var rows = R.schedule.slice().sort(function (a, b) { return Date.parse(a.tipoff) - Date.parse(b.tipoff); }).map(function (g) {
      var st = g.status === 'LIVE' ? '<span class="st st-live">● ' + T('live') + (g.score ? ' · ' + esc(g.home) + ' ' + esc(g.score.home) + '–' + esc(g.score.away) : '') + '</span>'
        : g.status === 'POSTPONED' ? '<span class="st st-off">' + T('postponed') + '</span>'
        : g.status === 'CANCELLED' ? '<span class="st st-off">' + T('cancelled') + '</span>'
        : g.status === 'FINAL' ? '<span class="st st-plain">' + T('final') + '</span>'
        : '<span class="st st-plain">' + T('scheduled') + '</span>';
      var read = c.onMagazine(g)
        ? '<a class="pill" href="' + c.href('match.html', { game: g.gameId }) + '">' + T('readOpen') + ' →</a>'
        : '<span class="muted">' + esc(T(g.noReadReason === 'STALE' ? 'readStale' : 'readNone')) + '</span>';
      return '<tr><td><span class="sch-m"><mo-team-logo code="' + esc(g.away) + '" size="sm"></mo-team-logo><b>' + esc(g.away) + ' @ ' + esc(g.home) + '</b><span class="muted">' + esc(c.teamName(g.away, 'nick') + ' @ ' + c.teamName(g.home, 'nick')) + '</span><mo-team-logo code="' + esc(g.home) + '" size="sm"></mo-team-logo></span></td>' +
        '<td>' + esc(c.tipShort(g)) + '</td><td>' + st + '</td><td>' + read + '</td></tr>';
    }).join('');
    var invalid = R.invalidGames ? '<p class="state-msg state-partial" role="status">' + esc(T('invalidGames', { n: R.invalidGames })) + '</p>' : '';
    var table = rows
      ? '<div class="table-wrap"><table class="sch"><thead><tr><th>' + T('colMatch') + '</th><th>' + T('colTime') + '</th><th>' + T('colStatus') + '</th><th>' + T('colRead') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<p class="today-empty">' + esc(T('scheduleEmpty')) + '</p>';
    return c.topbar + '<main class="sheet">' +
      '<header class="sheet-head"><p class="kicker">MOSPORT · ' + esc(c.issueDate(I.date)) + (R.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</p><h1>' + T('scheduleTitle') + '</h1><p class="muted">' + T('scheduleIntro') + '</p></header>' +
      (R.status === 'STALE' ? c.stateMessage(R) : '') + invalid + table +
    '</main>';
  }
};
