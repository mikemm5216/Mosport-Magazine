/*
 * Page shell: language, theme, shared navigation, notices, and the one data path
 * (provider → MOSPORT_PIPELINE.run → public model) every page renders from.
 * A page sets window.MOSPORT_PAGE = { id, render(ctx) } before this file loads.
 * URL: ?lang=en  ?theme=dark  ?fixture=<demo test issue>  ?issue=<name>  ?slots=1  ?logoFail=1
 */
(function () {
  var root = document.documentElement;
  var q = new URLSearchParams(location.search);
  /* Beta-0's ordinary entry opens the existing saved schedule. Explicit issue,
     fixture and schedule selections retain their provider and mode rules. */
  var owner = window.MOSPORT_OWNER_EDITION || null;
  function editionsAt(now) {
    var config = window.MOSPORT_CONFIG;
    var catalog = owner ? owner.catalog : config && config.mode === 'production' && config.editions;
    return Array.isArray(catalog) ? catalog.filter(function (item) { return Date.parse(item.availableAt) <= now; }) : [];
  }
  if (!['schedule', 'issue', 'fixture'].some(function (key) { return q.has(key); })) {
    var editions = editionsAt(Date.now());
    var requested = q.get('game'), listed = editions.some(function (item) { return item.id === requested; });
    /* An owner-edition practice link opens its own saved game; the public site ignores it. */
    var practice = owner && q.get('practice') === '1' && /^\d{10}$/.test(requested || '');
    var pageDefault = window.MOSPORT_PAGE.defaultSchedule;
    var first = pageDefault ? pageDefault() : editions.length ? editions[0].id : '0022600051';
    var selected = listed || practice ? requested : first;
    if (selected) q.set('schedule', selected);
  }
  var store = {
    get: function (k) { try { return localStorage.getItem('mosport.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('mosport.' + k, v); } catch (e) { /* unavailable */ } }
  };
  var state = {
    lang: q.get('lang') === 'en' || q.get('lang') === 'zh' ? q.get('lang') : (store.get('lang') || (window.MOSPORT_CONFIG && window.MOSPORT_CONFIG.defaultLanguage === 'en' ? 'en' : 'zh')),
    theme: q.get('theme') === 'dark' || q.get('theme') === 'light' ? q.get('theme') : (store.get('theme') || 'light'),
    note: null
  };
  /* A language or theme chosen through the URL is a choice too: remember it. */
  if (q.get('lang') === state.lang) store.set('lang', state.lang);
  if (q.get('theme') === state.theme) store.set('theme', state.theme);
  /* Load once; every render reads the same public model. */
  var data = { model: null, diagnostics: null };
  function nowFor(raw) {
    /* DEMO issues are read at their pinned morning; anything else at the real clock. */
    var F = window.MOSPORT_FIXTURES || {};
    return raw && raw.mode === 'DEMO' && F.DEMO_NOW ? F.DEMO_NOW : new Date().toISOString();
  }

  function T(key, vars) {
    var d = window.MOSPORT_I18N[state.lang];
    var s = d[key] != null ? d[key] : window.MOSPORT_I18N.zh[key];
    if (typeof s === 'string' && vars) s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function teamName(code, form) {
    var t = window.MOSPORT_TEAMS.get(code);
    if (!t) return code;
    if (form === 'nick') return t.name[state.lang];
    return state.lang === 'zh' ? t.city.zh + ' ' + t.name.zh : t.city.en + ' ' + t.name.en;
  }
  function fmt(iso, tz, opts) {
    var loc = state.lang === 'zh' ? 'zh-TW' : 'en-US';
    return new Intl.DateTimeFormat(loc, Object.assign({ timeZone: tz, hour12: false }, opts)).format(new Date(iso));
  }
  function tipLine(g) {
    var tp = fmt(g.tipoff, 'Asia/Taipei', g.source ? { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' } : { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    if (!g.venueTz) return T('taipei') + ' ' + tp;
    var vn = fmt(g.tipoff, g.venueTz, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    var tzp = new Intl.DateTimeFormat('en-US', { timeZone: g.venueTz, timeZoneName: 'short' }).formatToParts(new Date(g.tipoff)).filter(function (x) { return x.type === 'timeZoneName'; })[0];
    if (tzp) vn += ' ' + tzp.value;
    return T('taipei') + ' ' + tp + ' · ' + T('venue') + ' ' + vn;
  }
  function tipShort(g) { return T('taipei') + ' ' + fmt(g.tipoff, 'Asia/Taipei', g.source ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' }); }
  function tipDate(g) { return fmt(g.tipoff, 'Asia/Taipei', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  /* Taipei calendar day of the game against the reader's clock: -1 past, 0 today, 1 future, null unknown.
     new Date() (not Date.now) so a pinned test clock and the real clock follow the same path. */
  function taipeiDay(ms) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); }
  function tipDay(g) {
    var t = g && Date.parse(g.tipoff);
    if (!Number.isFinite(t)) return null;
    var a = taipeiDay(t), b = taipeiDay(new Date().getTime());
    return a === b ? 0 : a < b ? -1 : 1;
  }
  function sourceNote(source, options) {
    if (!source) return '';
    if (options && options.reader) {
      var checked = fmt(source.observedAt, 'Asia/Taipei', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      return '<p class="pv">' + esc(T('scheduleSource')) + ' <a href="' + esc(source.url) + '" rel="noopener noreferrer">' + esc(source.publisher) + '</a> · <time datetime="' + esc(source.observedAt) + '">' + esc(T('sourceCheckedAt', { time: checked })) + '</time></p>';
    }
    return '<p class="pv">' + esc(T('dataSource')) + ' <a href="' + esc(source.url) + '" rel="noopener noreferrer">' + esc(source.publisher) + '</a> · ' + esc(T('observedAt')) + ' <time datetime="' + esc(source.observedAt) + '">' + esc(source.observedAt) + '</time></p>';
  }
  /* After the scheduled tip-off the clock is the only evidence: say the scheduled time
     has passed and link the official game page; never claim LIVE or a score, and never
     narrate whether a read was published (qualified content shows itself). */
  function tipoffNotice(g) {
    var time = fmt(g.tipoff, 'Asia/Taipei', { hour: '2-digit', minute: '2-digit' });
    var link = g.source && g.source.url ? ' <a class="tipoff-link" href="' + esc(g.source.url) + '" rel="noopener noreferrer">' + esc(T('officialGame')) + ' <span aria-hidden="true">→</span></a>' : '';
    return '<p class="pregame-missing tipoff-note">' + esc(T('pastTipoffNotice', { time: time })) + link + '</p>';
  }
  function finalLine(g) {
    return T('finalScore', { home: teamName(g.home, 'nick'), homeScore: g.score.home, awayScore: g.score.away, away: teamName(g.away, 'nick') });
  }
  /* Result only, no method: the evidence chain lives with A and the B-side pin. */
  function resultNotice(g) {
    var link = g.source && g.source.url ? ' <a class="tipoff-link" href="' + esc(g.source.url) + '" rel="noopener noreferrer">' + esc(T('officialGame')) + ' <span aria-hidden="true">→</span></a>' : '';
    return '<p class="pregame-missing tipoff-note result-note">' + esc(finalLine(g)) + link + '</p>';
  }
  function isFinal(g) { return g.status === 'FINAL' && !!g.score && !!g.source; }
  function statusLabel(g) {
    if (g.pastTipoff) return T('pastTipoffLabel');
    return T(g.status === 'SCHEDULED' ? 'scheduled' : g.status.toLowerCase());
  }
  function pregameRecord(g, options) {
    var snapshot = g.pregameSnapshot;
    var notice = isFinal(g) ? resultNotice(g) : g.pastTipoff ? tipoffNotice(g) : '';
    /* No displayable read: render nothing (Founder: 沒有就沒有), only the #25 tipoff notice when due. */
    if (!snapshot) return notice;
    if (options && options.reader) return '<p class="pregame-context">' + esc(T('context_' + snapshot.homeCourt, { team: teamName(g.home, 'nick') })) + '</p>' + notice;
    return notice + '<div class="pregame-record"><p><b>' + esc(snapshot.homeCourt) + '</b> · HOME_COURT@' + esc(snapshot.formulaVersion) + '</p><p class="pv">' + esc(T('savedSnapshot')) + ' <time datetime="' + esc(snapshot.capturedAt) + '">' + esc(snapshot.capturedAt) + '</time></p><p class="pv">' + esc(T('snapshotId')) + ' <code>' + esc(snapshot.snapshotId) + '</code> · v' + esc(snapshot.snapshotVersion) + '</p>' + sourceNote(snapshot.source) + '</div>';
  }
  function issueDate(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return state.lang === 'zh'
      ? (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '（' + '日一二三四五六'[d.getUTCDay()] + '）'
      : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
  }
  function issueDateLong(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return state.lang === 'zh'
      ? d.getUTCFullYear() + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + String(d.getUTCDate()).padStart(2, '0')
      : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d).toUpperCase();
  }

  function sportButtons(cls) {
    return '<div class="' + cls + '" role="group" aria-label="' + esc(T('sportLabel')) + '">' +
      '<button type="button" class="sport is-on" aria-pressed="true">' + T('nba') + '</button>' +
      '<button type="button" class="sport" aria-pressed="false" data-act="note" data-note="note_sport"><span>' + T('baseball') + '</span><small>' + T('comingSoon') + '</small></button>' +
      '<button type="button" class="sport" aria-pressed="false" data-act="note" data-note="note_sport"><span>' + T('soccer') + '</span><small>' + T('comingSoon') + '</small></button>' +
    '</div>';
  }
  function navLinks(active, cls) {
    var link = function (id, href) {
      var on = id === active;
      return '<a class="sec' + (on ? ' is-on' : '') + '" href="' + href + keepQuery() + '"' + (on ? ' aria-current="page"' : '') + '>' + T(id) + '</a>';
    };
    return '<nav class="' + cls + '" aria-label="' + esc(T('navLabel')) + '">' + link('today', 'index.html') + link('schedule', 'schedule.html') + link('review', 'review.html') + '</nav>';
  }
  function utilButtons() {
    return '<div class="utils">' +
      '<button type="button" class="ut' + (state.lang === 'zh' ? ' is-on' : '') + '" data-act="lang" data-lang="zh" aria-pressed="' + (state.lang === 'zh') + '">繁中</button>' +
      '<button type="button" class="ut' + (state.lang === 'en' ? ' is-on' : '') + '" data-act="lang" data-lang="en" aria-pressed="' + (state.lang === 'en') + '">EN</button>' +
      '<button type="button" class="ut ut-theme" data-act="theme" aria-pressed="' + (state.theme === 'dark') + '" aria-label="' + esc(state.theme === 'dark' ? T('toLight') : T('toDark')) + '">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' + (state.theme === 'dark'
          ? '<circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g>'
          : '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor"/>') + '</svg>' +
        '<span>' + (state.theme === 'dark' ? T('toLight') : T('toDark')) + '</span></button>' +
    '</div>';
  }
  function keepQuery() {
    var keep = new URLSearchParams();
    /* Carry the current edition and appearance so links work even where storage is blocked. */
    keep.set('lang', state.lang);
    keep.set('theme', state.theme);
    /* Carry the reader zoom so Today reopens at the same zoom after Schedule/Review/Match. */
    var z = window.MOSPORT_READER ? window.MOSPORT_READER.token() : null;
    if (z) keep.set('zoom', z);
    ['fixture', 'issue', 'schedule', 'slots', 'logoFail', 'mode', 'art'].forEach(function (k) { if (q.get(k)) keep.set(k, q.get(k)); });
    var s = keep.toString();
    return s ? '?' + s : '';
  }
  function moreMatchups(c) {
    var others = c.editions.filter(function (edition) {
      return !c.issue.schedule.some(function (game) { return game.gameId === edition.id; });
    });
    if (!others.length) return '';
    var links = others.map(function (edition) {
      var label = teamName(edition.away, 'nick') + ' @ ' + teamName(edition.home, 'nick');
      if (!owner) label += ' · ' + T('taipei') + ' ' + fmt(edition.tipoff, 'Asia/Taipei',
        { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      return '<a class="pill" href="' + esc(c.href('match.html', { schedule: edition.id, game: edition.id })) + '">' + esc(label) + '</a>';
    });
    return '<section class="card"><h2>' + (state.lang === 'zh' ? '其他對戰' : 'More matchups') + '</h2>' + links.join(' ') + '</section>';
  }
  function topbar(active) {
    return '<header class="topbar">' +
      '<a class="tb-brand" href="index.html' + keepQuery() + '"><mo-brand-logo tone="on-dark"></mo-brand-logo><span class="tb-name">MOSPORT</span></a>' +
      navLinks(active, 'tb-nav') +
      '<button type="button" class="tb-almanac" data-act="note" data-note="note_almanac">' + T('almanac') + ' <small>' + T('almanacSoon') + '</small></button>' +
      sportButtons('tb-sports') + utilButtons() +
    '</header>';
  }

  /* Keep the address bar in step with a toggled choice, so reload and sharing agree. */
  function syncUrl() {
    /* Read the address bar as it is now: the reader may have changed ?zoom= since load. */
    var cur = new URLSearchParams(location.search);
    if (!cur.has('lang') && !cur.has('theme')) return;
    cur.set('lang', state.lang); cur.set('theme', state.theme);
    try { history.replaceState(null, '', location.pathname + '?' + cur.toString() + location.hash); } catch (e) { /* file: or sandboxed */ }
  }

  function render() {
    syncUrl();
    root.lang = state.lang === 'en' ? 'en' : 'zh-Hant';
    root.dataset.theme = state.theme;
    var page = window.MOSPORT_PAGE;
    if (!data.model) {
      document.getElementById('app').innerHTML = topbar(page.id) + '<main class="sheet state-msg" aria-busy="true"><p>' + esc(T('loading')) + '</p></main>';
      return;
    }
    var model = data.model;
    var ctx = {
      lang: state.lang, theme: state.theme, T: T, esc: esc, teamName: teamName, tipLine: tipLine, tipShort: tipShort, tipDate: tipDate, tipDay: tipDay,
      issueDate: issueDate, issueDateLong: issueDateLong, issue: model, meta: model.meta,
      finalSource: model.reason === 'FINAL' && extra.result ? {
        url: extra.result.officialUrl, observedAt: extra.result.confirmations.nba.observedAt
      } : null,
      stateMessage: stateMessage, sourceNote: sourceNote, pregameRecord: pregameRecord, statusLabel: statusLabel, tipoffNotice: tipoffNotice, finalLine: finalLine, isFinal: isFinal,
      href: function (path, extra) { var k = new URLSearchParams(keepQuery().slice(1)); Object.keys(extra || {}).forEach(function (x) { k.set(x, extra[x]); }); var s = k.toString(); return path + (s ? '?' + s : ''); },
      editions: model.meta && model.meta.scheduleOnly ? editionsAt(Date.now()) : [],
      get moreMatchups() { return owner && page.id !== 'schedule' ? '' : moreMatchups(this); },
      topbar: topbar(page.id), navLinks: navLinks, sportButtons: sportButtons, utilButtons: utilButtons, keepQuery: keepQuery,
      percentOf: function (g) { return g.hasRead && g.world ? g.world.percent : null; },
      onMagazine: function (g) { return !!(g && g.hasRead); }
    };
    document.getElementById('app').innerHTML = page.render(ctx) + noteHtml();
    if (window.MOSPORT_REFRESH_SLOTS) window.MOSPORT_REFRESH_SLOTS();
    if (page.after) page.after(ctx);
  }
  function noteHtml() {
    /* Visual only: the announcement itself is spoken once by the persistent #mo-live region. */
    if (state.finalNote) return '<div class="note note-final"><span>' + esc(state.finalNote[state.lang]) + '</span><button type="button" class="ut" data-act="close-final">' + esc(T('close')) + '</button></div>';
    if (!state.note) return '';
    return '<div class="note" role="status"><span>' + esc(T(state.note)) + '</span><button type="button" class="ut" data-act="close-note">' + esc(T('close')) + '</button></div>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act;
    if (act === 'lang') { state.lang = b.dataset.lang; store.set('lang', state.lang); render(); }
    else if (act === 'theme') { state.theme = state.theme === 'dark' ? 'light' : 'dark'; store.set('theme', state.theme); render(); }
    else if (act === 'note') { state.note = b.dataset.note; render(); }
    else if (act === 'close-note') { state.note = null; render(); }
    else if (act === 'close-final') { state.finalNote = null; render(); }
    else if (window.MOSPORT_PAGE.onAct) window.MOSPORT_PAGE.onAct(act, b, render);
  });

  /* A page-level message for a model that is not OK. Never invented content. */
  function stateMessage(model, options) {
    var key = { REFUSED: 'state_refused', INVALID: 'state_invalid', LOAD_FAILED: 'state_loadFailed', STALE: 'state_stale', SCHEDULE_ONLY: 'state_scheduleOnly' }[model.status];
    if (!key) return '';
    if (model.reason === 'SCHEDULE_EXPIRED') key = 'state_scheduleStale';
    var schedule = !(options && options.scheduleLink === false) && (model.status === 'STALE' || model.status === 'SCHEDULE_ONLY') && window.MOSPORT_PAGE.id !== 'schedule'
      ? '<a class="cta" href="schedule.html' + keepQuery() + '">' + T('openSchedule') + ' <span aria-hidden="true">→</span></a>' : '';
    return '<div class="state-msg state-' + model.status.toLowerCase() + '" role="status"><p>' + esc(T(key)) + '</p>' + schedule + '</div>';
  }

  window.MOSPORT_APP = { render: render, state: state };
  var sel = window.MOSPORT_PROVIDERS.select(q.toString(), window.MOSPORT_CONFIG);
  /* Diagnostics (exclusion reasons, problems) are dropped here: only the model reaches the page. */
  /* A page left open must not keep showing what has since expired: re-run the same
     pipeline on the already-loaded data at its next time boundary (editorial visible,
     validUntil, scheduled tipoff). No new fetch. DEMO pages read a pinned clock.
     One clock read per pass both builds the model and picks the next boundary; if that
     boundary has already passed once rendering is done, the pass repeats immediately.
     Each pass reads a later clock, so boundaries strictly advance and the loop ends. */
  var boundaryTimer = null;
  function nextBoundary(raw, after) {
    if (!raw || raw.__loadError || raw.mode === 'DEMO') return null;
    var next = null;
    var boundaries = [raw.validUntil, raw.game && raw.game.tipoff, raw.editorial && raw.editorial.observedAt];
    var item = owner && raw.game && owner.games[raw.game.gameId];
    if (item) {
      var tipTime = Date.parse(raw.game.tipoff);
      if (Number.isFinite(tipTime)) boundaries.push(new Date(tipTime-900000).toISOString());
      boundaries.push(item.article && item.article.preparedAt, item.INITIAL && item.INITIAL.lockedAt, item.FINAL && item.FINAL.lockedAt,
        item.finalPolicy && item.finalPolicy.optedInAt, item.finalWitness && item.finalWitness.witnessedAt,
        item.exploration && item.exploration.filedAt, item.deskCopy && item.deskCopy.preparedAt,
        item.postgameReview && item.postgameReview.preparedAt);
    }
    boundaries.forEach(function (iso) {
      var t = typeof iso === 'string' ? Date.parse(iso) : NaN;
      if (!isNaN(t) && t > after && (next === null || t < next)) next = t;
    });
    return next;
  }
  var extra = { result: null };
  /* A page left open past tip-off asks again for the same two same-origin static files
     the page already trusts — the B pins script and the pinned result — and shows the
     final only when the unchanged pipeline validator accepts the pair. Only while the
     page is visible, one request at a time, at most RECHECK_MAX (96) timed passes per page
     load; returning to the page (visibilitychange, pageshow) asks once more. No source
     outside this site, nothing in the background, and it stops once the final shows. */
  /* 5 min × 96 = 8 h of foreground time: #176's first R1 came 4 h 43 min after tip-off. */
  var RECHECK_MS = 5 * 60 * 1000, RECHECK_MAX = 96;
  var recheck = { saved: undefined, timer: null, busy: false, left: RECHECK_MAX, announce: false, announced: {}, verified: null };
  /* The one live region exists before any change, so a later text change is announced. */
  var live = null;
  if (document.body && document.createElement) {
    live = document.createElement('div');
    live.id = 'mo-live'; live.className = 'mo-live';
    live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  function shownGame() {
    var m = data.model;
    return m && m.meta && m.meta.scheduleOnly && m.schedule && m.schedule[0] || null;
  }
  function waiting() { var g = shownGame(); return !!(g && !g.seasonSchedule && g.pastTipoff && !g.score && recheck.saved != null); }
  function pageVisible() { return typeof document.visibilityState !== 'string' || document.visibilityState === 'visible'; }
  function armRecheck() {
    if (recheck.timer || recheck.busy || recheck.left <= 0 || !pageVisible() || !waiting() || typeof setTimeout !== 'function') return;
    recheck.timer = setTimeout(function () { recheck.timer = null; recheckResult(true); }, RECHECK_MS);
  }
  function recheckResult(timed) {
    if (recheck.timer) { clearTimeout(recheck.timer); recheck.timer = null; }
    if (recheck.busy || !pageVisible() || !waiting() || typeof fetch !== 'function' || !document.createElement) return;
    if (timed) { if (recheck.left <= 0) return; recheck.left--; }
    recheck.busy = true;
    var id = shownGame().gameId, saved = recheck.saved;
    function finish(res) {
      recheck.busy = false;
      /* Ignore an answer for a page that has since changed games or already shows a final. */
      if (res != null && recheck.saved === saved && waiting() && shownGame().gameId === id) {
        extra = { result: JSON.parse(JSON.stringify(res)) };
        recheck.announce = true;
        refresh(saved);
      } else armRecheck();
    }
    /* Reload the trusted pin list itself: a first pin ships with the next deployment. */
    var tag = document.createElement('script');
    tag.src = 'js/data/result-pins.js?recheck=' + Date.now();
    function drop() { if (tag.parentNode) tag.parentNode.removeChild(tag); }
    /* A pins file that did not load says nothing new: no result request with the old
       global; the next foreground pass or a return to the page tries again. */
    tag.onerror = function () { drop(); finish(null); };
    tag.onload = function () {
      drop();
      var pins = window.MOSPORT_RESULT_PINS || {};
      if (!/^\d{10}$/.test(id) || !Object.prototype.hasOwnProperty.call(pins, id)) { finish(null); return; }
      fetch('data/results/' + id + '.json', { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(finish, function () { finish(null); });
    };
    (document.head || document.documentElement).appendChild(tag);
  }
  function announceFinal() {
    if (!recheck.announce) return;
    recheck.announce = false;
    /* Only a final that the validator accepted on this pass, once per game per page. */
    var g = shownGame();
    if (!g || !g.score || recheck.announced[g.gameId]) return;
    recheck.announced[g.gameId] = true;
    var lang = state.lang;
    state.finalNote = {};
    ['zh', 'en'].forEach(function (l) {
      state.lang = l;
      state.finalNote[l] = (l === 'zh' ? '比賽結束。' : 'The game is over. ') + finalLine(g);
    });
    state.lang = lang;
    if (live) live.textContent = state.finalNote[state.lang];
    render();
  }
  if (typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', function () {
      if (pageVisible()) recheckResult(false);
      else if (recheck.timer) { clearTimeout(recheck.timer); recheck.timer = null; }
    });
  }
  if (typeof window.addEventListener === 'function') window.addEventListener('pageshow', function (e) { if (e && e.persisted) recheckResult(false); });
  function refresh(saved) {
    if (boundaryTimer) { clearTimeout(boundaryTimer); boundaryTimer = null; }
    recheck.saved = saved;
    for (;;) {
      var raw = saved == null ? saved : JSON.parse(saved);
      var now = nowFor(raw);
      data.model = window.MOSPORT_PIPELINE.run(raw, { mode: window.MOSPORT_CONFIG.mode, now: now, result: extra.result,
        pins: window.MOSPORT_RESULT_PINS || {}, gameBoxes: window.MOSPORT_CONFIG.gameBoxes, ownerEdition: owner }).model;
      render();
      var shown = shownGame();
      if (shown && shown.score && extra.result != null) recheck.verified = { id: shown.gameId, saved: saved, result: extra.result };
      announceFinal();
      armRecheck();
      var next = nextBoundary(raw, Date.parse(now));
      if (next === null || typeof setTimeout !== 'function') return;
      var wait = next - Date.now();
      if (wait > 0) {
        boundaryTimer = setTimeout(function () { refresh(saved); }, Math.min(wait + 1, 2147483647));
        return;
      }
    }
  }
  window.MOSPORT_PROVIDERS.load(sel, function (raw, more) {
    extra = { result: more && more.result != null ? JSON.parse(JSON.stringify(more.result)) : null };
    var saved = raw === undefined ? null : JSON.stringify(raw);
    refresh(saved);
    /* A late provider answer (its first fetch, or an older file) never takes back a final
       the validator already accepted for the same schedule; it is tried once, no loop. */
    var kept = recheck.verified;
    if (kept && kept.saved === saved && waiting() && shownGame().gameId === kept.id) {
      extra = { result: kept.result };
      refresh(saved);
    }
  });
  if (!data.model) render();
})();
