/*
 * Home: the open magazine. Left page = cover, right page = TODAY.
 * Mobile (< 1024px): the cover is the first screen; TODAY follows on scroll.
 * Renders only what resolveIssue() returned. An absent slot emits no markup.
 */
window.MOSPORT_PAGE = {
  id: 'today',
  render: function (c) {
    var T = c.T, esc = c.esc, L = c.lang, R = c.issue, I = c.fixture.issue, B = window.MOSPORT_BRAND, LB = window.MOSPORT_LABELS;
    if (R.refused) return c.topbar + '<main class="refused"><p>' + esc(T('refused')) + '</p></main>';

    var issueLine = T('issueLine', { vol: String(I.volume).padStart(2, '0'), no: I.number, date: c.issueDateLong(I.date) });
    var readCount = R.games.length + (R.lead ? 1 : 0);
    var review = R.stories.filter(function (s) { return s.type === 'REVIEW'; })[0];
    var streak = R.stories.filter(function (s) { return s.type === 'STREAK'; })[0];
    var demo = R.demo ? '<span class="demo-badge">' + T('demoBadge') + '</span>' : '';

    /* ---------- cover lines: derived only from what actually renders ---------- */
    var lines = [];
    if (readCount) lines.push(T('coverLineReads', { n: readCount }));
    if (review) lines.push(T('coverLineReview', { h: review[L].headline }));
    if (streak) lines.push(T('coverLineStreak', { h: streak[L].headline }));

    var teasers = R.cover.map(function (it) {
      return '<article class="teaser teaser-' + it.editorialLabel.toLowerCase() + '">' +
        '<p class="teaser-label">' + LB[it.editorialLabel] + '</p>' +
        '<h3 class="teaser-h">' + esc(it[L].headline) + '</h3>' +
        (it[L].summary ? '<p class="teaser-s">' + esc(it[L].summary) + '</p>' : '') +
      '</article>';
    }).join('');

    var cover =
      '<section class="pg pg-cover" aria-label="MOSPORT">' +
        '<mo-art slot-id="cover-desktop-art" slot-mobile="cover-mobile-art"></mo-art>' +
        '<div class="cv-shade" aria-hidden="true"></div>' +
        '<div class="cv-mob-top">' +
          '<a class="cv-mark" href="index.html' + c.keepQuery() + '"><mo-brand-logo tone="on-dark"></mo-brand-logo></a>' + c.utilButtons() +
        '</div>' +
        '<div class="cv-meta"><span>' + esc(issueLine) + '</span><span>' + esc(I.edition[L]) + '</span></div>' +
        '<h1 class="cv-mast"><span class="cv-name">' + B.name + '</span><span class="cv-slogan">' + B.slogan + '</span></h1>' +
        '<div class="cv-topic">' +
          '<p class="cv-this">' + T('thisIssue') + '</p>' +
          '<p class="cv-t1">' + esc(I.topic.line1) + '</p><p class="cv-t2">' + esc(I.topic.line2) + '</p>' +
          '<p class="cv-tag">' + T('tagline').map(esc).join('<br>') + '</p>' +
        '</div>' +
        (teasers ? '<div class="cv-teasers">' + teasers + '</div>' : '') +
        '<div class="cv-foot">' +
          (lines.length ? '<div class="cv-lines"><span class="cv-plus" aria-hidden="true">+</span><ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' : '<span></span>') +
          '<p class="cv-coach">' + B.coach.split(' ').reduce(function (a, w, i) { return a + (i === 2 ? ' <br>' : i ? ' ' : '') + w; }, '') + '</p>' +
        '</div>' +
      '</section>';

    var mnav = '<div class="mnav">' + c.navLinks('today', 'mnav-sec') + c.sportButtons('mnav-sports') + '</div>';

    /* ---------- TODAY page ---------- */
    var lead = '';
    if (R.lead) {
      var g = R.lead.game, w = g.world;
      lead =
        '<article class="lead" aria-label="' + esc(c.teamName(g.away) + ' @ ' + c.teamName(g.home)) + '">' +
          '<div class="lead-art">' +
            '<mo-art slot-id="today-feature-art"></mo-art>' +
            '<div class="lead-teams">' +
              '<div class="lead-team"><mo-team-logo code="' + g.away + '" size="lg"></mo-team-logo><p class="lt-code">' + g.away + '</p><p class="lt-name">' + esc(c.teamName(g.away)) + '</p></div>' +
              '<span class="lead-at">@</span>' +
              '<div class="lead-team"><mo-team-logo code="' + g.home + '" size="lg"></mo-team-logo><p class="lt-code">' + g.home + '</p><p class="lt-name">' + esc(c.teamName(g.home)) + '</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="lead-read">' +
            '<p class="ver">' + T('ver_' + w.version) + '</p>' +
            '<p class="lead-verdict">' + esc(w.verdict[L]) + '</p>' +
            (R.lead.percent != null ? '<p class="lead-pct"><span class="pct">' + R.lead.percent + '%</span><span class="pct-l">' + T('homeWin') + '</span></p>' : '') +
          '</div>' +
          '<div class="lead-foot">' +
            '<div><p class="lead-time">' + esc(c.tipLine(g)) + '</p>' + (w.why ? '<p class="lead-why">' + esc(w.why[L]) + '</p>' : '') + '</div>' +
            '<a class="cta" href="' + c.href('match.html', { game: g.gameId }) + '">' + T('open') + ' <span aria-hidden="true">→</span></a>' +
          '</div>' +
        '</article>';
    }

    var games = '';
    if (R.games.length) {
      games =
        '<section class="others" aria-labelledby="others-h">' +
          '<div class="sec-head"><h2 id="others-h">' + T('otherGames') + '</h2><a class="pill" href="schedule.html' + c.keepQuery() + '">' + T('seeAll') + ' <span aria-hidden="true">→</span></a></div>' +
          '<div class="g-rail-wrap"><div class="g-rail" id="g-rail">' +
          R.games.map(function (g) {
            var st = g.status === 'LIVE'
              ? '<span class="st st-live">● ' + T('live') + '</span>'
              : '<span class="st st-ver">' + T('ver_' + g.world.version) + '</span>';
            var score = g.status === 'LIVE' && g.score ? '<p class="g-score">' + g.home + ' ' + g.score.home + ' – ' + g.score.away + '</p>' : '';
            return '<a class="g-card" href="schedule.html' + c.keepQuery() + '">' +
              '<div class="g-teams"><mo-team-logo code="' + g.away + '" size="sm"></mo-team-logo><span class="g-codes">' + g.away + ' <i>@</i> ' + g.home + '</span><mo-team-logo code="' + g.home + '" size="sm"></mo-team-logo></div>' +
              '<p class="g-time">' + esc(c.tipShort(g)) + '</p>' + st + score +
              '<p class="g-read">' + esc(g.world.verdict[L]) + '</p>' +
            '</a>';
          }).join('') +
          '</div>' +
          (R.games.length > 2 ? '<button type="button" class="g-next" data-act="rail" aria-label="' + esc(T('scrollMore')) + '">›</button>' : '') +
          '</div>' +
        '</section>';
    }

    var reviewCard = review ?
      '<section class="story story-review" aria-labelledby="rv-h">' +
        '<div class="sec-head"><h2 id="rv-h">' + T('reviewHead') + '</h2><a class="pill" href="review.html' + c.keepQuery() + '">' + T('seeReview') + ' <span aria-hidden="true">→</span></a></div>' +
        '<div class="story-body">' +
          '<div class="rv-top"><mo-team-logo code="' + review.teams[0] + '" size="sm"></mo-team-logo><mo-team-logo code="' + review.teams[1] + '" size="sm"></mo-team-logo>' +
            '<div><p class="rv-codes">' + review.teams[0] + ' @ ' + review.teams[1] + '</p><h3>' + esc(review[L].headline) + '</h3></div></div>' +
          '<p class="story-s">' + esc(review[L].summary) + '</p>' +
          (review[L].meta ? '<p class="story-meta">' + esc(review[L].meta) + '</p>' : '') +
        '</div>' +
      '</section>' : '';

    var streakCard = streak ?
      '<section class="story story-streak" aria-labelledby="sk-h">' +
        '<div class="sec-head"><h2 id="sk-h">' + T('streakHead') + '</h2></div>' +
        '<div class="story-body story-dark"><mo-art slot-id="editorial-card-art"></mo-art>' +
          '<p class="teaser-label lbl-streak">' + LB.STREAK_WATCH + '</p>' +
          '<div class="sk-top">' + (streak.linkedTeams || []).map(function (t) { return '<mo-team-logo code="' + t + '" size="md"></mo-team-logo>'; }).join('') +
            '<h3>' + esc(streak[L].headline) + '</h3></div>' +
          '<p class="story-s">' + esc(streak[L].summary) + '</p>' +
          '<p class="sk-dots" aria-hidden="true"><i></i><i></i><i></i></p>' +
        '</div>' +
      '</section>' : '';

    var stories = (reviewCard || streakCard) ? '<div class="stories' + (reviewCard && streakCard ? '' : ' stories-one') + '">' + reviewCard + streakCard + '</div>' : '';
    var emptyMsg = !R.lead && !R.games.length && !R.stories.length
      ? '<div class="today-empty"><p>' + esc(T('emptyToday')) + '</p><a class="cta" href="schedule.html' + c.keepQuery() + '">' + T('openSchedule') + ' <span aria-hidden="true">→</span></a></div>' : '';

    var inner =
      '<section class="pg pg-inner" id="today" aria-labelledby="today-h">' +
        '<div class="runhead"><span>MOSPORT · ' + esc(I.topic.line1 + ' ' + I.topic.line2) + '</span><span class="rh-right"><span>' + esc(issueLine) + '</span><b>' + String(I.page).padStart(2, '0') + '</b></span></div>' +
        '<div class="today-head"><h2 id="today-h" class="today-mast">' + T('todayMast') + '</h2>' +
          '<div class="today-date"><p class="td-d">' + esc(c.issueDate(I.date)) + '</p><p class="td-s">' + esc(T('slate', { total: R.schedule.length, read: readCount })) + '</p></div></div>' +
        lead + games + stories + emptyMsg +
        '<footer class="pg-foot">' + (R.demo ? '<span>' + demo + ' ' + esc(T('demoNote').replace(/^DEMO · /, '')) + '</span>' : '<span></span>') + '<b>' + String(I.page).padStart(2, '0') + '</b></footer>' +
      '</section>';

    var bar =
      '<div class="reader-bar" id="reader-bar" role="toolbar" aria-label="' + esc(T('zoomLabel')) + '" aria-controls="reader">' +
        '<span class="rb-label">' + T('zoomLabel') + '</span>' +
        '<button type="button" class="rb-btn rb-fit" data-zoom="width" aria-pressed="true">' + T('zoomWidth') + '</button>' +
        '<button type="button" class="rb-btn rb-fit" data-zoom="fit" aria-pressed="false">' + T('zoomFit') + '</button>' +
        '<button type="button" class="rb-btn rb-icon" data-zoom="out" aria-label="' + esc(T('zoomOut')) + '">−</button>' +
        '<output class="rb-val" data-zoom-value aria-live="polite" aria-label="' + esc(T('zoomCurrent')) + '">100%</output>' +
        '<button type="button" class="rb-btn rb-icon" data-zoom="in" aria-label="' + esc(T('zoomIn')) + '">+</button>' +
        '<button type="button" class="rb-btn" data-zoom="reset" aria-label="' + esc(T('zoomReset')) + '">100%</button>' +
        '<span class="rb-hint">' + T('zoomHint') + '</span>' +
      '</div>';
    return c.topbar + bar + '<main class="desk reader" id="reader" tabindex="0" aria-label="' + esc(T('readerLabel')) + '"><div class="sizer" id="sizer"><div class="spread">' + cover + mnav + inner + '</div></div></main>';
  },
  after: function () { if (window.MOSPORT_READER) window.MOSPORT_READER.mount(); },
  onAct: function (act) {
    if (act === 'rail') {
      var r = document.getElementById('g-rail');
      if (r) r.scrollBy({ left: r.clientWidth * 0.8, behavior: 'smooth' });
    }
  }
};
