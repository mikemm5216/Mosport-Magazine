/* Reader v3 preview. Read the release catalog and the same validated models as the other pages. */
(function (root) {
  'use strict';
  const p = new URLSearchParams(location.search);
  const requested = p.get('game');
  const editions = root.MOSPORT_CONFIG.editions || [];
  const activeId = p.get('schedule') || (editions.some(e => e.id === requested) ? requested : editions[0]?.id);
  const records = new Map();
  let filter = 'all';
  const zh = c => c.lang === 'zh';
  const tr = (c, en, tw) => zh(c) ? tw : en;
  const mark = (c, code, size) => '<mo-team-logo code="' + c.esc(code) + '" size="' + size + '"></mo-team-logo>';
  const route = 'reader-v3.html';
  const link = (c, params) => c.esc(c.href(route, params));
  const pathTo = (c, id) => link(c, { game: id, schedule: id });
  const dateKey = value => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Taipei' }).format(new Date(value));
  const team = (c, code) => c.esc(c.teamName(code, 'nick'));
  const fmt = (c, at, opts) => new Intl.DateTimeFormat(zh(c) ? 'zh-TW' : 'en-GB',
    Object.assign({ timeZone: 'Asia/Taipei', hourCycle: 'h23' }, opts)).format(new Date(at));
  const clock = (c, at) => fmt(c, at, { hour: '2-digit', minute: '2-digit' });
  const day = (c, at) => fmt(c, at, { month: 'short', day: 'numeric', year: 'numeric' });
  // The shell owns the active game's fetch and timed recheck. Load just the other
  // published editions through the same provider; they can never supply an unpinned final.
  for (const {id} of editions) {
    if (id === activeId || p.has('fixture') || p.has('issue')) continue;
    const select = root.MOSPORT_PROVIDERS.select('schedule=' + id, root.MOSPORT_CONFIG);
    root.MOSPORT_PROVIDERS.load(select, (raw, extra) => {
      records.set(id, { raw, result: extra?.result });
      root.MOSPORT_APP?.render();
    });
  }

  function record(model, id, finalSource) {
    const g = model.meta?.scheduleOnly && model.schedule[0];
    if (!g || g.gameId !== id) return null;
    return { g, source: finalSource || g.source, stale: model.status === 'STALE' };
  }

  function dayRecords(c, date, now) {
    return editions.filter(e => dateKey(e.tipoff) === date && Date.parse(e.availableAt) <= Date.parse(now))
      .map(({id}) => {
        if (id === activeId) return record(c.issue, id, c.finalSource);
        const capture = records.get(id);
        if (!capture) return null;
        const model = root.MOSPORT_PIPELINE.run(capture.raw, {
          mode: 'production', now, pins: root.MOSPORT_RESULT_PINS, result: capture.result
        }).model;
        const finalSource = model.reason === 'FINAL' ? {
          url: capture.result.officialUrl, observedAt: capture.result.confirmations.nba.observedAt
        } : null;
        return record(model, id, finalSource);
      }).filter(Boolean)
      .sort((a,b) => Date.parse(a.g.tipoff) - Date.parse(b.g.tipoff) || a.g.gameId.localeCompare(b.g.gameId));
  }

  function status(c, g, stale) {
    if (stale) return tr(c, 'Schedule awaiting confirmation', '賽程待確認');
    if (c.isFinal(g)) return c.T('final');
    if (g.pastTipoff) return tr(c, 'Awaiting verified result', '等待核實賽果');
    return c.statusLabel(g);
  }
  function nav(c, detail) {
    return '<header class="nav"><div class="nav-inner"><a href="' + link(c) + '" class="brand">' +
      '<mo-brand-logo tone="on-dark"></mo-brand-logo>MOSPORT</a><nav aria-label="' + c.esc(c.T('navLabel')) +
      '"><a href="' + link(c) + '"' + (detail ? '' : ' aria-current="page"') + '>' + c.T('today') +
      '</a><a href="' + c.esc(c.href('schedule.html')) + '"' + (detail ? ' aria-current="page"' : '') + '>' + c.T('schedule') +
      '</a><a href="' + c.esc(c.href('review.html')) + '">' + c.T('review') + '</a></nav>' +
      '<div class="sports"><span>NBA</span><button type="button" data-act="note" data-note="note_sport">MLB <small>' + c.T('comingSoon') +
      '</small></button><button type="button" data-act="note" data-note="note_sport">CPBL <small>' + c.T('comingSoon') +
      '</small></button></div>' + c.utilButtons() + '</div></header>';
  }
  function boardRow(c, g, side, small) {
    const code = g[side], final = c.isFinal(g);
    const pts = final ? '<b class="pts ' + (g.score[side] > g.score[side === 'away' ? 'home' : 'away'] ? 'winner' : '') + '">' + g.score[side] + '</b>' : '';
    return '<div class="team-row">' + mark(c, code, small ? 'xs' : 'sm') + '<span>' + team(c, code) + '</span>' + pts + '</div>';
  }
  function rail(c, games, current) {
    return '<div class="rail" aria-label="' + tr(c,'Game scores','本期賽事') + '"><div class="rail-inner">' + games.map(({g, stale}) =>
      '<a class="chip" href="' + pathTo(c, g.gameId) + '"' + (current === g.gameId ? ' aria-current="page"' : '') + '><span class="chip-status">' +
      (c.isFinal(g) || g.pastTipoff || stale ? status(c,g,stale) : clock(c,g.tipoff) + ' · ' + c.T('taipei')) + '</span>' +
      boardRow(c,g,'away',true) + boardRow(c,g,'home',true) + '</a>').join('') + '</div></div>';
  }
  function source(c, record) {
    return '<a class="source" href="' + c.esc(record.source.url) + '" target="_blank" rel="noopener noreferrer">NBA ↗</a> · ' +
      '<time datetime="' + c.esc(record.source.observedAt) + '">' + c.esc(fmt(c,record.source.observedAt,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})) +
      ' ' + c.T('taipei') + '</time>';
  }
  function footer(c, games) {
    return '<footer><div class="foot-inner"><b>MOSPORT</b><div>' + games.map(r => '<div>' + c.esc(r.g.away + ' @ ' + r.g.home) +
      ' · ' + source(c,r) + '</div>').join('') + '</div></div></footer>';
  }
  function duo(c, g) {
    const final = c.isFinal(g);
    const mid = final ? '<span class="' + (g.score.away>g.score.home?'win':'') + '">' + g.score.away + '</span><i>–</i><span class="' + (g.score.home>g.score.away?'win':'') + '">' + g.score.home + '</span>'
      : '<span>' + clock(c,g.tipoff) + '</span>';
    return '<div class="duo"><div class="duo-team">' + mark(c,g.away,'lg') + '<b>' + team(c,g.away) + '</b><small>' + tr(c,'Away','客隊') +
      '</small></div><div class="duo-mid"><strong>' + mid + '</strong><small>' + (final ? c.T('final') : tr(c,'Taipei tip-off','台北開球')) +
      '</small></div><div class="duo-team">' + mark(c,g.home,'lg') + '<b>' + team(c,g.home) + '</b><small>' + tr(c,'Home','主隊') + '</small></div></div>';
  }
  function calendar(c, date, today, now) {
    const dates = new Set(editions.filter(e => Date.parse(e.availableAt) <= Date.parse(now)).map(e => dateKey(e.tipoff)));
    dates.add(today);
    dates.add(date);
    const options = [...dates].sort().map(d => '<option value="' + d + '"' + (d === date ? ' selected' : '') + '>' + d + '</option>');
    return '<div class="season-nav"><label>' + tr(c,'Game date (Taipei)','比賽日期（台北）') +
      ' <select data-reader-day>' + options.join('') + '</select></label></div>';
  }

  function today(c, games, date, currentDay, now) {
    const lead = games[0]?.g;
    const categories = { all: tr(c,'All','全部'), live: c.T('live'), final: c.T('final') };
    const matches = (mode,r) => mode === 'all' || (mode === 'final' ? c.isFinal(r.g) : !r.stale && r.g.status === 'LIVE');
    const cards = games.filter(r => matches(filter,r));
    const updated = day(c,date + 'T12:00:00+08:00');
    const mast = '<div class="mast"><div class="issue"><b>NBA GAME DAY</b> · ' + c.esc(updated) +
      ' · ' + c.T('taipei') + '</div><h1>MOSPORT</h1><p class="slogan">MORE THAN SPORT</p>' +
      '<p class="coach">BE YOUR OWN COACH</p></div>';
    const featured = lead ? '<div class="lead"><div class="lead-top"><b>' + tr(c,'Featured matchup','本期焦點') +
      '</b><span>' + c.esc(status(c,lead,games[0].stale)) + '</span></div>' + duo(c,lead) +
      '<a class="action" href="' + pathTo(c,lead.gameId) + '">' + tr(c,'Open matchup','進入比賽') + ' →</a></div>' : '';
    const heading = '<h2>' + (date === currentDay ? 'TODAY' : 'GAME DAY') + '</h2>';
    const filters = games.length ? '<div class="filters" aria-label="' + tr(c,'Game filter','篩選賽事') + '">' +
      Object.entries(categories).map(([key,name]) => '<button type="button" data-act="filter" data-filter="' + key +
        '" aria-pressed="' + (filter === key) + '">' + name + ' ' + games.filter(r => matches(key,r)).length + '</button>').join('') + '</div>' : '';
    const listing = cards.map(({g, stale}) => '<a class="card" href="' + pathTo(c,g.gameId) + '"><div class="card-meta"><b>' +
      c.esc(status(c,g,stale)) + '</b><span>' + clock(c,g.tipoff) + ' ' + c.T('taipei') + '</span></div>' +
      boardRow(c,g,'away',false) + boardRow(c,g,'home',false) + '<div class="card-foot">' + tr(c,'Match details','比賽詳情') + ' →</div></a>');
    const message = games.length ? tr(c,'No games match this filter.','本期沒有符合此篩選的賽事。') :
      tr(c,'No verified games are available for this date.','這天尚無已核實賽事。');
    return nav(c,false) + (games.length ? rail(c,games) : '') + '<main><section class="cover"><div class="cover-inner">' +
      mast + featured + '</div></section>' + calendar(c,date,currentDay,now) + '<section class="board"><div class="board-head">' +
      heading + filters + '</div><div class="cards">' + (cards.length ? listing.join('') : '<p role="status">' + message + '</p>') +
      '</div></section></main>' + footer(c,games);
  }

  function match(c, entry, games, date) {
    const g = entry.g;
    const others = games.filter(r => r.g.gameId !== g.gameId);
    const hero = '<section class="match-hero"><div class="match-inner"><div class="match-meta"><a href="' +
      link(c,{date}) + '">‹ ' + c.T('schedule') + '</a><span>' + c.esc(c.tipLine(g)) + '</span></div><h1 class="sr-only">' +
      c.esc(c.teamName(g.away) + ' @ ' + c.teamName(g.home)) + '</h1>' + duo(c,g) +
      (c.isFinal(g) ? '' : '<p class="margin">' + c.esc(status(c,g,entry.stale)) + '</p>') + '</div></section>';
    const details = '<section class="facts"><h2>' + tr(c,'Game facts','賽事紀錄') + '</h2><dl><dt>' +
      tr(c,'Matchup','對戰') + '</dt><dd>' + team(c,g.away) + ' @ ' + team(c,g.home) + '</dd><dt>' +
      tr(c,'Tip-off','開球時間') + '</dt><dd>' + c.esc(c.tipShort(g)) + '</dd><dt>' + tr(c,'Source','資料來源') +
      '</dt><dd>' + source(c,entry) + '</dd></dl></section>';
    const side = others.length ? '<aside class="others"><h2>' + tr(c,'Other games','同日其他比賽') + '</h2>' +
      others.map(({g:other}) => '<a href="' + pathTo(c,other.gameId) + '"><span>' + team(c,other.away) + ' @ ' +
        team(c,other.home) + '</span><b>' + (c.isFinal(other) ? other.score.away + '–' + other.score.home : clock(c,other.tipoff)) +
        ' →</b></a>').join('') + '</aside>' : '';
    return nav(c,true) + rail(c,games,g.gameId) + '<main>' + hero + '<div class="match-content">' + details + side +
      '</div></main>' + footer(c,[entry]);
  }

  root.MOSPORT_PAGE = {
    id: 'today',
    render(c) {
      const now = new Date().toISOString();
      const currentDay = dateKey(now);
      const dateParam = p.get('date');
      const selected = editions.find(e => e.id === requested);
      const date = selected ? dateKey(selected.tipoff) : /^\d{4}-\d{2}-\d{2}$/.test(dateParam || '') &&
        Number.isFinite(Date.parse(dateParam)) ? dateParam : currentDay;
      if (p.has('fixture') || p.has('issue')) return nav(c,false) + c.stateMessage(c.issue,{ scheduleLink:false });
      const games = dayRecords(c,date,now);
      if (!requested) return today(c,games,date,currentDay,now);
      const entry = games.find(r => r.g.gameId === requested);
      return entry ? match(c,entry,games,date) : nav(c,true) + '<main class="board"><p role="status">' +
        tr(c,'No verified schedule is available for this matchup.','此場尚無已核實賽程。') +
        '</p><a href="' + link(c) + '">‹ ' + c.T('today') + '</a></main>';
    },
    onAct(action, button, render) {
      if (action !== 'filter') return;
      filter = button.dataset.filter;
      render();
      document.querySelector('[data-filter="' + filter + '"]')?.focus();
    }
  };

  document.addEventListener('change', e => {
    if (!e.target.matches('[data-reader-day]')) return;
    const next = new URLSearchParams(location.search);
    next.set('date',e.target.value);
    next.delete('game');
    next.delete('schedule');
    next.set('lang',root.MOSPORT_APP.state.lang);
    next.set('theme',root.MOSPORT_APP.state.theme);
    location.search = next.toString();
  });
})(window);
