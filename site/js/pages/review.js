/*
 * Review: only human-approved public reviews (Founder C-4). Internal audit, the
 * approver's identity and the source payload are never shown; the reader sees that
 * the editorial review date. Receipt references remain in the data model.
 */
window.MOSPORT_PAGE = {
  id: 'review',
  render: function (c) {
    var T = c.T, esc = c.esc, L = c.lang, R = c.issue;
    if (R.status !== 'OK' && R.status !== 'SCHEDULE_ONLY') return c.topbar + '<main class="sheet">' + c.stateMessage(R) + '</main>';
    var reviews = R.stories.filter(function (s) { return s.type === 'REVIEW' && s.approvalMode === 'HUMAN'; });
    /* Owner edition only: the pinned postgame review for ?game=, a separate article from the
       pregame column (which stays as filed on the matchup page). Public C-4 reviews below are
       unchanged; with no owner review the page offers the pregame preview instead. */
    var gameId = new URLSearchParams(location.search).get('game');
    var g = (R.schedule || []).filter(function (x) { return gameId ? x.gameId === gameId : !!(x.analysis && x.analysis.postgameReview); })[0];
    var own = g && g.analysis && g.analysis.postgameReview, owned = '';
    var pregame = g && g.analysis && g.analysis.article ? '<a class="pill" href="' + esc(c.href('match.html', { game: g.gameId })) + '#pregame-column">' +
      (L === 'zh' ? '閱讀賽前預測' : 'Read the pregame preview') + ' <span aria-hidden="true">→</span></a>' : '';
    /* Film guide: game-clock moments (time remaining in the period) with an optional
       link out to this game's NBA.com video. No embed, no fetch, no player seek. */
    function film(f) {
      if (!f) return '';
      function period(n) { return n <= 4 ? (L === 'zh' ? '第 ' + n + ' 節' : 'Q' + n) : (L === 'zh' ? '延長賽 ' + (n - 4) : 'OT' + (n - 4)); }
      return '<section class="edition-film" id="film-guide"><h3>' + (L === 'zh' ? '比賽關鍵時刻' : 'Key moments') + '</h3><ol>' + f.moments.map(function (m) {
        return '<li><p><b>' + esc(period(m.period)) + ' · ' + (L === 'zh' ? '比賽鐘（比賽剩餘時間）' : 'Game clock (time remaining)') + ' ' + esc(m.clock) + '</b></p><p>' + esc(m[L]) + '</p>' +
          (m.video ? '<p><a href="' + esc(m.video.url) + '" rel="noopener noreferrer">' + (L === 'zh' ? 'NBA 官網影片：' : 'NBA.com video: ') + esc(m.video[L]) + '</a> <span class="pv">' +
            (L === 'zh' ? '片長 ' : 'Length ') + esc(m.video.duration) + '</span></p>' : '') + '</li>';
      }).join('') + '</ol><p class="pv">' + (L === 'zh' ? '比賽鐘為該節剩餘時間；影片連到 NBA 官網本場影片頁，本站不嵌入、不下載。' :
        'Game clock is the time remaining in the period. Videos open this game\'s page on NBA.com; nothing is embedded or downloaded here.') + '</p></section>';
    }
    if (own) {
      var copy = own[L], filed = new Intl.DateTimeFormat(L === 'zh' ? 'zh-TW' : 'en-US', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(own.preparedAt));
      owned = '<article class="card edition-article rv-article" id="postgame-review"><div class="rv-top"><mo-team-logo code="' + esc(g.away) + '" size="md"></mo-team-logo><mo-team-logo code="' + esc(g.home) + '" size="md"></mo-team-logo><p class="rv-codes">' + esc(g.away) + ' @ ' + esc(g.home) + '</p></div>' +
        '<p class="lbl lbl-brand">' + (L === 'zh' ? 'MOSPORT 賽後檢討' : 'MOSPORT Postgame Review') + '</p><h2>' + esc(copy.title) + '</h2><p class="lede"><b>' + esc(copy.dek) + '</b></p>' +
        '<p class="result-note">' + esc(c.finalLine(g)) + '</p>' +
        copy.body.split(/\r?\n\s*\n/).filter(function (p) { return p.trim(); }).map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('') +
        '<p class="pv">' + (L === 'zh' ? '檢討定稿 ' : 'Review filed ') + '<time datetime="' + esc(own.preparedAt) + '">' + esc(filed) + ' UTC+8</time></p>' +
        film(g.analysis.filmGuide) +
        '<p class="edition-index">' + pregame + '<a class="pill" href="' + esc(c.href('match.html', { game: g.gameId })) + '">' + esc(T('gameDetails')) + '</a></p></article>';
    } else if (pregame) {
      owned = '<section class="card" id="postgame-missing"><p>' + (L === 'zh' ? '這場的賽後檢討尚未刊出。' : 'The postgame review for this game is not out yet.') + '</p><p>' + pregame + '</p></section>';
    }
    var body = reviews.length ? reviews.map(function (r) {
      return '<article class="rv-article"><div class="rv-top"><mo-team-logo code="' + esc(r.teams[0]) + '" size="md"></mo-team-logo><mo-team-logo code="' + esc(r.teams[1]) + '" size="md"></mo-team-logo><p class="rv-codes">' + esc(r.teams[0]) + ' @ ' + esc(r.teams[1]) + '</p></div>' +
        '<h2>' + esc(r[L].headline) + '</h2>' + (r[L].summary ? '<p>' + esc(r[L].summary) + '</p>' : '') + (r[L].meta ? '<p class="pv">' + esc(r[L].meta) + '</p>' : '') +
        '<p class="pv">' + esc(T('humanApproved', { at: r.approvedOn.slice(0, 10), ref: r.receiptRef })) + '</p></article>';
    }).join('') : own ? '' : '<p class="today-empty">' + T('reviewEmpty') + '</p>';
    return c.topbar + '<main class="sheet">' +
      '<header class="sheet-head"><p class="kicker">MOSPORT' + (R.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</p><h1>' + T('reviewTitle') + '</h1><p class="muted">' + T('reviewIntro') + '</p></header>' + owned + body + '</main>';
  }
};
