/*
 * Home: the open magazine. Left page = cover, right page = TODAY.
 * Mobile (< 1024px): the cover is the first screen; TODAY follows on scroll.
 * Renders only the public model. Missing content keeps the magazine shell;
 * an absent editorial slot emits no markup and never borrows fixture copy.
 */
window.MOSPORT_PAGE = {
  id: 'today',
  render: function (c) {
    var T = c.T, esc = c.esc, L = c.lang, R = c.issue, I = c.meta, B = window.MOSPORT_BRAND, LB = window.MOSPORT_LABELS;
    var hasIssue = !!(I && !I.scheduleOnly);
    var savedGame = I && I.scheduleOnly ? R.schedule[0] : null;
    var issueLine = hasIssue ? T('issueLine', { vol: String(I.volume).padStart(2, '0'), no: I.number, date: c.issueDateLong(I.date) }) : (savedGame ? c.tipDate(savedGame) : T('nbaEdition'));
    var topic = hasIssue ? I.topic : { line1: 'NBA', line2: 'TODAY' };
    var edition = hasIssue ? I.edition[L] : T('nba');
    var pageNumber = hasIssue ? '<b>' + String(I.page).padStart(2, '0') + '</b>' : '';
    var readCount = R.games.length + (R.lead ? 1 : 0);
    var review = R.stories.filter(function (s) { return s.type === 'REVIEW'; })[0];
    var demo = R.demo ? '<span class="demo-badge">' + T('demoBadge') + '</span>' : '';
    /* No editorial facts are borrowed from the DEMO or from a missing/stale source. */
    var ed = savedGame && savedGame.editorial && savedGame.editorial.kind === 'CUP_REMATCH' ? savedGame.editorial : null;
    var storyTitle = '', storyLede = '';
    if (ed) {
      var prev = ed.previous, awayName = c.teamName(savedGame.away, 'nick'), homeName = c.teamName(savedGame.home, 'nick');
      var storyVars = {
        away: awayName, home: homeName, gap: String(prev.awayPoints - prev.homePoints),
        loserPoints: String(prev.homePoints), winnerPoints: String(prev.awayPoints)
      };
      storyTitle = T('cupRematchTitle', storyVars);
      storyLede = T('cupRematchLede', storyVars);
    }

    /* ---------- cover lines: derived only from what actually renders ---------- */
    var lines = [];
    if (readCount) lines.push(T('coverLineReads', { n: readCount }));
    if (review) lines.push(T('coverLineReview', { h: review[L].headline }));

    var teasers = R.cover.map(function (it) {
      return '<article class="teaser teaser-' + esc(it.editorialLabel.toLowerCase()) + '">' +
        '<p class="teaser-label">' + esc(LB[it.editorialLabel]) + '</p>' +
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
        '<div class="cv-meta"><span>' + esc(issueLine) + '</span><span>' + esc(edition) + '</span></div>' +
        '<h1 class="cv-mast"><span class="cv-name">' + B.name + '</span><span class="cv-slogan">' + B.slogan + '</span></h1>' +
        '<div class="cv-topic">' +
          '<p class="cv-this">' + T('coverFocus') + '</p>' +
          '<p class="cv-t1">' + esc(topic.line1) + '</p><p class="cv-t2">' + esc(topic.line2) + '</p>' +
          '<p class="cv-tag">' + T('tagline').map(esc).join('<br>') + '</p>' +
        '</div>' +
        (savedGame ? '<div class="cv-brief">' +
          ('<p class="cv-game' + (storyTitle ? ' is-editorial' : '') + '">' + esc(storyTitle || c.teamName(savedGame.away, 'nick') + ' @ ' + c.teamName(savedGame.home, 'nick')) + '</p><p class="cv-time">' + esc(c.tipShort(savedGame)) + '</p>') +
          '<p class="cv-status">' + esc(savedGame.pastTipoff ? T('pastTipoffLabel') : T(savedGame.pregameSnapshot ? 'context_' + savedGame.pregameSnapshot.homeCourt : 'pregameMissing', { team: c.teamName(savedGame.home, 'nick') })) + '</p></div>' : '') +
        (teasers ? '<div class="cv-teasers">' + teasers + '</div>' : '') +
        '<div class="cv-foot">' +
          '<div class="cv-guide">' + demo +
            (lines.length ? '<div class="cv-lines"><span class="cv-plus" aria-hidden="true">+</span><ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' : '') +
            '<a class="cv-next" href="#today">' + esc(T('openToday')) + ' <span aria-hidden="true">↓</span></a>' +
          '</div>' +
          '<p class="cv-coach">' + B.coach.split(' ').reduce(function (a, w, i) { return a + (i === 2 ? ' <br>' : i ? ' ' : '') + w; }, '') + '</p>' +
        '</div>' +
      '</section>';

    var mnav = '<div class="mnav">' + c.navLinks('today', 'mnav-sec') + c.sportButtons('mnav-sports') + '</div>';

    /* ---------- TODAY page ---------- */
    function leadArt(g) {
      return '<div class="lead-art">' +
        '<mo-art slot-id="today-feature-art"></mo-art>' +
        '<div class="lead-teams">' +
          '<div class="lead-team"><mo-team-logo code="' + esc(g.away) + '" size="lg"></mo-team-logo><p class="lt-code">' + esc(g.away) + '</p><p class="lt-name">' + esc(c.teamName(g.away)) + '</p></div>' +
          '<span class="lead-at">@</span>' +
          '<div class="lead-team"><mo-team-logo code="' + esc(g.home) + '" size="lg"></mo-team-logo><p class="lt-code">' + esc(g.home) + '</p><p class="lt-name">' + esc(c.teamName(g.home)) + '</p></div>' +
        '</div>' +
      '</div>';
    }
    var lead = '';
    if (R.lead) {
      var g = R.lead.game, w = g.world;
      lead =
        '<article class="lead" aria-label="' + esc(c.teamName(g.away) + ' @ ' + c.teamName(g.home)) + '">' +
          leadArt(g) +
          '<div class="lead-read">' +
            '<p class="ver">' + esc(T('ver_' + w.version)) + '</p>' +
            '<p class="lead-verdict">' + esc(w.verdict[L]) + '</p>' +
            (R.lead.percent != null ? '<p class="lead-pct"><span class="pct">' + R.lead.percent + '%</span><span class="pct-l">' + T('homeWin') + '</span></p>' : '') +
          '</div>' +
          '<div class="lead-foot">' +
            '<div><p class="lead-time">' + esc(c.tipLine(g)) + '</p>' + (w.why ? '<p class="lead-why">' + esc(w.why[L]) + '</p>' : '') + '</div>' +
            '<a class="cta" href="' + c.href('match.html', { game: g.gameId }) + '">' + T('open') + ' <span aria-hidden="true">→</span></a>' +
          '</div>' +
        '</article>';
    } else if (savedGame) {
      lead =
        '<article class="lead lead-schedule" aria-label="' + esc(c.teamName(savedGame.away) + ' @ ' + c.teamName(savedGame.home)) + '">' +
          leadArt(savedGame) +
          '<div class="lead-read' + (storyTitle ? ' has-editorial' : '') + '"><p class="ver">' + esc(c.statusLabel(savedGame)) + '</p><h3 class="lead-record-title">' + esc(storyTitle || T(savedGame.pregameSnapshot || savedGame.pastTipoff ? 'gameFacts' : 'pregameTitle')) + '</h3>' +
            (storyLede ? '<p class="lead-story">' + esc(storyLede) + '</p>' : '') + c.pregameRecord(savedGame, { reader: true }) + '</div>' +
          '<div class="lead-foot"><div><p class="lead-time">' + esc(c.tipLine(savedGame)) + '</p></div>' +
            '<a class="pill" href="' + c.href('match.html', { game: savedGame.gameId }) + '">' + esc(T('gameDetails')) + ' <span aria-hidden="true">→</span></a></div>' +
        '</article>' +
        '<div class="lead-source">' + c.sourceNote(savedGame.source, { reader: true }) +
          (ed ? '<p class="pv">' + esc(T('cupRematchSource')) + ' <a href="' + esc(ed.sources.previousUrl) + '" rel="noopener noreferrer">NBA</a></p>' : '') + '</div>';
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
              : '<span class="st st-ver">' + esc(T('ver_' + g.world.version)) + '</span>';
            var score = g.status === 'LIVE' && g.score ? '<p class="g-score">' + esc(g.home) + ' ' + esc(g.score.home) + ' – ' + esc(g.score.away) + '</p>' : '';
            return '<a class="g-card" href="schedule.html' + c.keepQuery() + '">' +
              '<div class="g-teams"><mo-team-logo code="' + esc(g.away) + '" size="sm"></mo-team-logo><span class="g-codes">' + esc(g.away) + ' <i>@</i> ' + esc(g.home) + '</span><mo-team-logo code="' + esc(g.home) + '" size="sm"></mo-team-logo></div>' +
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
          '<div class="rv-top"><mo-team-logo code="' + esc(review.teams[0]) + '" size="sm"></mo-team-logo><mo-team-logo code="' + esc(review.teams[1]) + '" size="sm"></mo-team-logo>' +
            '<div><p class="rv-codes">' + esc(review.teams[0]) + ' @ ' + esc(review.teams[1]) + '</p><h3>' + esc(review[L].headline) + '</h3></div></div>' +
          '<p class="story-s">' + esc(review[L].summary) + '</p>' +
          (review[L].meta ? '<p class="story-meta">' + esc(review[L].meta) + '</p>' : '') +
        '</div>' +
      '</section>' : '';

    var stories = reviewCard ? '<div class="stories stories-one">' + reviewCard + '</div>' : '';
    var emptyMsg = R.status === 'OK' && !lead && !R.games.length && !review
      ? '<div class="today-empty"><p>' + esc(T('emptyToday')) + '</p><a class="pill" href="schedule.html' + c.keepQuery() + '">' + T('openSchedule') + ' <span aria-hidden="true">→</span></a></div>' : '';
    var stateNote = R.status === 'OK' || R.status === 'SCHEDULE_ONLY' ? '' : c.stateMessage(R, { scheduleLink: !savedGame });
    var date = hasIssue ? c.issueDate(I.date) : savedGame ? c.tipDate(savedGame) : '';
    var slate = hasIssue ? T('slate', { total: R.schedule.length, read: readCount }) : (savedGame ? T(R.schedule.length === 1 ? 'scheduleSlateOne' : 'scheduleSlate', { total: R.schedule.length }) : T('nbaEdition'));

    var inner =
      '<section class="pg pg-inner" id="today" tabindex="-1" aria-labelledby="today-h">' +
        '<div class="runhead"><span>MOSPORT · ' + esc(topic.line1 + ' ' + topic.line2) + '</span><span class="rh-right"><span>' + esc(issueLine) + '</span>' + pageNumber + '</span></div>' +
        '<div class="today-head"><h2 id="today-h" class="today-mast">' + T('todayMast') + '</h2>' +
          '<div class="today-date">' + (date ? '<p class="td-d">' + esc(date) + '</p>' : '') + '<p class="td-s">' + esc(slate) + '</p></div></div>' +
        stateNote + lead + games + stories + emptyMsg +
        '<footer class="pg-foot">' + (R.demo ? '<span>' + demo + ' ' + esc(T('demoNote').replace(/^DEMO · /, '')) + '</span>' : '<span>' + esc(B.slogan) + '</span>') +
          (savedGame ? '<a class="pill" href="schedule.html' + c.keepQuery() + '">' + esc(T('openSchedule')) + ' <span aria-hidden="true">→</span></a>' : '') + pageNumber + '</footer>' +
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
