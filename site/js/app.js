/*
 * Page shell: language, theme, shared navigation, notices, and the one data path
 * (provider → MOSPORT_PIPELINE.run → public model) every page renders from.
 * A page sets window.MOSPORT_PAGE = { id, render(ctx) } before this file loads.
 * URL: ?lang=en  ?theme=dark  ?fixture=<demo test issue>  ?issue=<name>  ?slots=1  ?logoFail=1
 */
(function () {
  var root = document.documentElement;
  var q = new URLSearchParams(location.search);
  var store = {
    get: function (k) { try { return localStorage.getItem('mosport.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('mosport.' + k, v); } catch (e) { /* unavailable */ } }
  };
  var state = {
    lang: q.get('lang') === 'en' || q.get('lang') === 'zh' ? q.get('lang') : (store.get('lang') || 'zh'),
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
    var tp = fmt(g.tipoff, 'Asia/Taipei', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    var vn = fmt(g.tipoff, g.venueTz, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    var tzp = new Intl.DateTimeFormat('en-US', { timeZone: g.venueTz, timeZoneName: 'short' }).formatToParts(new Date(g.tipoff)).filter(function (x) { return x.type === 'timeZoneName'; })[0];
    if (tzp) vn += ' ' + tzp.value;
    return T('taipei') + ' ' + tp + ' · ' + T('venue') + ' ' + vn;
  }
  function tipShort(g) { return T('taipei') + ' ' + fmt(g.tipoff, 'Asia/Taipei', { hour: '2-digit', minute: '2-digit' }); }
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
    ['fixture', 'issue', 'slots', 'logoFail', 'mode', 'art'].forEach(function (k) { if (q.get(k)) keep.set(k, q.get(k)); });
    var s = keep.toString();
    return s ? '?' + s : '';
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
      lang: state.lang, theme: state.theme, T: T, esc: esc, teamName: teamName, tipLine: tipLine, tipShort: tipShort,
      issueDate: issueDate, issueDateLong: issueDateLong, issue: model, meta: model.meta,
      stateMessage: stateMessage,
      href: function (path, extra) { var k = new URLSearchParams(keepQuery().slice(1)); Object.keys(extra || {}).forEach(function (x) { k.set(x, extra[x]); }); var s = k.toString(); return path + (s ? '?' + s : ''); },
      topbar: topbar(page.id), navLinks: navLinks, sportButtons: sportButtons, utilButtons: utilButtons, keepQuery: keepQuery,
      percentOf: function (g) { return g.hasRead && g.world ? g.world.percent : null; },
      onMagazine: function (g) { return !!(g && g.hasRead); }
    };
    document.getElementById('app').innerHTML = page.render(ctx) + noteHtml();
    if (window.MOSPORT_REFRESH_SLOTS) window.MOSPORT_REFRESH_SLOTS();
    if (page.after) page.after(ctx);
  }
  function noteHtml() {
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
    else if (window.MOSPORT_PAGE.onAct) window.MOSPORT_PAGE.onAct(act, b, render);
  });

  /* A page-level message for a model that is not OK. Never invented content. */
  function stateMessage(model) {
    var key = { REFUSED: 'state_refused', INVALID: 'state_invalid', LOAD_FAILED: 'state_loadFailed', STALE: 'state_stale' }[model.status];
    if (!key) return '';
    var schedule = model.status === 'STALE' && window.MOSPORT_PAGE.id !== 'schedule'
      ? '<a class="cta" href="schedule.html' + keepQuery() + '">' + T('openSchedule') + ' <span aria-hidden="true">→</span></a>' : '';
    return '<div class="state-msg state-' + model.status.toLowerCase() + '" role="status"><p>' + esc(T(key)) + '</p>' + schedule + '</div>';
  }

  window.MOSPORT_APP = { render: render, state: state };
  var sel = window.MOSPORT_PROVIDERS.select(location.search, window.MOSPORT_CONFIG);
  /* Diagnostics (exclusion reasons, problems) are dropped here: only the model reaches the page. */
  window.MOSPORT_PROVIDERS.load(sel, function (raw) {
    data.model = window.MOSPORT_PIPELINE.run(raw, { mode: window.MOSPORT_CONFIG.mode, now: nowFor(raw) }).model;
    render();
  });
  if (!data.model) render();
})();
