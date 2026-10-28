/* Schedule: every game of the day, eligible or not (spec 02 §4.2, acceptance U-01). */
window.MOSPORT_PAGE = {
  id: 'schedule',
  render: function (c) {
    var T = c.T, esc = c.esc, R = c.issue, I = c.fixture.issue;
    if (R.refused) return c.topbar + '<main class="sheet"><p>' + esc(T('refused')) + '</p></main>';
    var rows = R.schedule.slice().sort(function (a, b) { return Date.parse(a.tipoff) - Date.parse(b.tipoff); }).map(function (g) {
      var st = g.status === 'LIVE' ? '<span class="st st-live">● ' + T('live') + (g.score ? ' · ' + g.home + ' ' + g.score.home + '–' + g.score.away : '') + '</span>'
        : g.status === 'POSTPONED' ? '<span class="st st-off">' + T('postponed') + '</span>'
        : '<span class="st st-plain">' + T('scheduled') + '</span>';
      var read = c.onMagazine(g)
        ? '<a class="pill" href="' + c.href('match.html', { game: g.gameId }) + '">' + T('readOpen') + ' →</a>'
        : '<span class="muted">' + T('readNone') + '</span>';
      return '<tr><td><span class="sch-m"><mo-team-logo code="' + g.away + '" size="sm"></mo-team-logo><b>' + g.away + ' @ ' + g.home + '</b><span class="muted">' + esc(c.teamName(g.away, 'nick') + ' @ ' + c.teamName(g.home, 'nick')) + '</span><mo-team-logo code="' + g.home + '" size="sm"></mo-team-logo></span></td>' +
        '<td>' + esc(c.tipShort(g)) + '</td><td>' + st + '</td><td>' + read + '</td></tr>';
    }).join('');
    return c.topbar + '<main class="sheet">' +
      '<header class="sheet-head"><p class="kicker">MOSPORT · ' + esc(c.issueDate(I.date)) + (R.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</p><h1>' + T('scheduleTitle') + '</h1><p class="muted">' + T('scheduleIntro') + '</p></header>' +
      '<div class="table-wrap"><table class="sch"><thead><tr><th>' + T('colMatch') + '</th><th>' + T('colTime') + '</th><th>' + T('colStatus') + '</th><th>' + T('colRead') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</main>';
  }
};
