/*
 * Match Detail — UI-01-a order: Verdict → Because → But → Watch, version, factors,
 * PMV, Turning Point, Falsifier, External Sources, Evidence/Provenance.
 * Verdict and numbers come only from the World package via the eligibility gate.
 */
(function () {
  var showFirst = false;
  var requestedColumn = typeof location !== 'undefined' ? (location.hash || '').slice(1) : '';


  function recordColumn(c, g, initial) {
    var zh = c.lang === 'zh', esc = c.esc;
    function name(side) {
      var nick = c.teamName(side === 'HOME' ? g.home : g.away, 'nick');
      return zh ? nick : 'the ' + nick;
    }
    function standing(side, record) {
      var team = name(side);
      if (!record) return zh ? team + '的戰績尚缺' : 'I’m missing the record for ' + team;
      return zh ? team + ' ' + record.wins + ' 勝 ' + record.losses + ' 敗' : 'The ' + team.slice(4) + ' sit at ' + record.wins + '–' + record.losses;
    }
    var records = standing('AWAY', initial.awayRecord) + (zh ? '，' : '. ') + standing('HOME', initial.homeRecord) + (zh ? '。' : '. ');
    var rule = zh ? '我每場都選本季勝率較高的一隊，想看看這樣能比場場選主隊多猜對幾場。遇到平手或戰績不全，我就棄權。' :
      'I take the team with the higher season win rate. If the percentages tie or a record is missing, I sit it out. Over a season, how many more games can I call than someone who always picks the home team?';
    var title, comparison;
    if (initial.pick === null) {
      title = initial.reason === 'TIED' ? (zh ? '兩隊勝率打平，這一票我留白' : 'A tie on win rate. I’m sitting this one out.') :
        (zh ? '戰績還缺一塊，這一票我留白' : 'I’m a record short, so I’ll pass.');
      comparison = initial.baseline ? (zh ? '這場我棄權，主場基準照常選' + name(initial.baseline) + '，這一票只記在主場派的帳上。' :
        'I’m passing. The home rule still picks ' + name(initial.baseline) + ', so only that pick goes on the scorecard.') :
        (zh ? '主場基準這場也棄權，兩邊都沒有一票要算。' : 'The home rule is sitting this one out too. Neither of us has a pick to score.');
    } else {
      var pick = name(initial.pick);
      title = zh ? '這一票我投' + pick : 'My pick is ' + pick;
      if (!initial.baseline) {
        comparison = zh ? '主場基準這場棄權，只看我這一票猜得準不準。' :
          'The home rule has no pick in this one. Only my call will be scored.';
      } else if (initial.pick === initial.baseline) {
        title += zh ? '，贏了也拉不開差距' : '. Even a win won’t put me ahead.';
        comparison = zh ? '這場兩種選法都挑' + pick + '。贏就一起贏，猜錯也一起錯。' :
          'The home rule also takes ' + pick + ' today. We’ll both get this one right or both get it wrong.';
      } else {
        comparison = zh ? '主場派選' + name(initial.baseline) + '，我選' + pick + '。這場結束，兩種選法只會有一邊猜對。' :
          'The home rule takes ' + name(initial.baseline) + '. I’m backing ' + pick + '. One of us will be right when the final is in.';
      }
    }
    return '<p class="lbl lbl-brand">' + (zh ? 'MOSPORT 研究專欄 · 戰績觀察室' : 'MOSPORT Research Column · Record Desk') +
      '</p><h2>' + esc(title) + '</h2><p>' + esc(records + rule) + '</p><p>' + esc(comparison) + '</p>';
  }

  function renderAnalysis(c, g) {
    var a = g.analysis, zh = c.lang === 'zh', esc = c.esc;
    function time(iso) {
      var value = new Intl.DateTimeFormat(zh ? 'zh-TW' : 'en-US', { timeZone:'Asia/Taipei', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date(iso));
      return '<time datetime="' + esc(iso) + '">' + esc(value) + ' UTC+8</time>';
    }
    function paragraphs(text) {
      return text.split(/\r?\n\s*\n/).filter(function (p) { return p.trim(); }).map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('');
    }
    var deskNames = zh ? {'season-record':'戰績觀察室', turnovers:'球權保管室', 'second-chance':'二波編輯台'} :
      {'season-record':'Record Desk', turnovers:'Turnover Desk', 'second-chance':'Second-Chance Desk'};
    function signedColumn(id) {
      var copy = a.desks.copy.columns[id][c.lang];
      return '<p class="lbl lbl-brand">' + (zh ? 'MOSPORT 研究專欄 · ' : 'MOSPORT Research Column · ') + deskNames[id] +
        '</p><h2>' + esc(copy.title) + '</h2>' + paragraphs(copy.body) + '<h3>' + (zh ? '我會看什麼' : 'What I’m watching') +
        '</h3>' + paragraphs(copy.watch) + '<h3>' + (zh ? '這一票的局限' : 'Where this pick can go wrong') + '</h3>' +
        paragraphs(copy.limit) + '<p class="pv">' + (zh ? '專欄定稿 ' : 'Column filed ') + time(a.desks.copy.preparedAt) + '</p>';
    }
    var article = '';
    if (a.article) {
      var data = a.article, copy = data[c.lang];
      article = '<article class="card edition-article" id="pregame-column"><p class="lbl lbl-brand">' + (zh ? 'MOSPORT 賽前專欄' : 'MOSPORT Pregame Column') + '</p><h2>' + esc(copy.title) +
        '</h2>' + paragraphs(copy.body) + '<h3>' + (zh ? '比賽觀察' : 'What to watch') + '</h3>' + paragraphs(copy.watch) +
        '<h3>' + (zh ? '何時改變判斷' : 'What would change the read') + '</h3><p>' + esc(copy.falsifier) +
        '</p><p class="pv">' + (zh ? '資料截至 ' : 'Sources through ') + time(data.cutoffAt) + ' · ' + (zh ? '定稿 ' : 'Filed ') + time(data.preparedAt) + '</p><p class="pv">' +
        data.sources.map(function (source) { return '<a href="' + esc(source.url) + '" rel="noopener noreferrer">' + esc(source.label) + '</a>'; }).join(' · ') + '</p></article>';
    }
    if (!a.stages.length) return article;
    function pick(side) { return side === null ? (zh ? '棄權' : 'Abstain') : c.teamName(side === 'HOME' ? g.home : g.away, 'nick'); }
    function record(team,r) { return c.teamName(team, 'nick') + (r ? ' ' + r.wins + '–' + r.losses : (zh ? ' 戰績缺失' : ' record unavailable')); }
    var labels = zh ? {HIT:'命中',MISS:'未命中',ABSTAIN:'棄權'} : {HIT:'Hit',MISS:'Miss',ABSTAIN:'Abstention'};
    var cards = a.stages.map(function (s) {
      var header = s.late ? (zh ? 'T−15 逾時記錄，僅供核對' : 'Late T−15 record · review only') : s.stage === 'INITIAL' ? (zh ? '賽前初選' : 'Initial pick') : (zh ? 'T−15 準時鎖定' : 'On-time T−15 lock');
      return '<section class="edition-stage"><h3>' + header + ' · ' + esc(pick(s.pick)) + '</h3><p>' + esc(record(g.away,s.awayRecord) + ' / ' + record(g.home,s.homeRecord)) +
        '</p><p class="pv">' + (zh ? '資料截至 ' : 'Cutoff ') + time(s.cutoff) + ' · ' + (zh ? '鎖定 ' : 'Locked ') + time(s.lockedAt) +
        '</p><p class="pv">' + (zh ? '主場基準選擇 ' : 'Home baseline pick: ') + esc(pick(s.baseline)) + '</p>' +
        (s.evaluation ? '<p>' + (zh ? '研究選擇 ' : 'Research pick: ') + labels[s.evaluation.outcome] + ' · ' + (zh ? '基準 ' : 'Baseline: ') + labels[s.evaluation.baselineOutcome] + '</p>' : '<p class="pv">' + (s.late ? (zh ? '不列入成績' : 'Excluded from scoring') : (zh ? '尚未結算' : 'Scoring pending')) + '</p>') + '</section>';
    }).join('');
    var pending = a.finalStatus === 'PENDING' ? (zh ? 'T−15 鎖定窗口開始於 ' : 'T−15 window opens ') + time(a.finalWindowAt) :
      a.finalStatus === 'OPEN' ? (zh ? 'T−15 窗口已開啟，等待鎖定紀錄。' : 'The T−15 window is open. Awaiting a lock.') :
      a.finalStatus === 'NOT_RECORDED' ? (zh ? '本站未收錄開賽前的 T−15 鎖定紀錄。' : 'No pre-tip T−15 lock has been published here.') : '';
    var initial = a.stages.find(function (s) { return s.stage === 'INITIAL'; });
    if (!initial) return article;
    function baselineComparison(side) {
      if (!initial.baseline) return zh ? '主場基準棄權' : 'Home baseline abstained';
      if (!side) return zh ? '本桌棄權，主場基準選' + pick(initial.baseline) : 'Desk abstained; home baseline picked ' + pick(initial.baseline);
      return (side === initial.baseline ? (zh ? '與主場基準同選' : 'Agrees with the home baseline: ') :
        (zh ? '與主場基準選擇相反，基準選' : 'Opposes the home baseline, which picked ')) + pick(initial.baseline);
    }
    var recordHead = a.desks ? signedColumn('season-record') : recordColumn(c,g,initial);
    var recordDesk = '<aside class="card edition-pick" id="desk-season-record" data-desk="season-record">' + recordHead +
      '<p class="pv">' + (zh ? '規則 v1 · 戰績核對 ' : 'Rule v1 · Records checked against ') + '<a href="' + esc(g.source.url) + '" rel="noopener noreferrer">NBA</a> · <a href="https://www.espn.com/nba/game/_/gameId/' + esc(a.espnGameId) + '" rel="noopener noreferrer">ESPN</a></p>' +
      (a.desks ? '<p>' + esc(baselineComparison(initial.pick)) + '</p>' : '') +
      cards + (pending ? '<p class="pv">' + pending + '</p>' : '') + '</aside>';
    if (!a.desks) return article + recordDesk;
    var exploration = a.desks.exploration, score = a.desks.score;
    var sample = '<p class="pv edition-sample">' + (zh ? '三個專欄追蹤同一場比賽，樣本共 1 場。' : 'Three desks cover the same matchup. Sample: one game.') + '</p>';
    var columns = exploration.desks.map(function (desk, index) {
      var metric = desk.id === 'turnovers' ? (zh ? '場均失誤，取較低者' : 'Turnovers per game, lower wins the vote') :
        (zh ? '場均二次進攻得分，取較高者' : 'Second-chance points per game, higher wins the vote');
      function value(team, number) { return c.teamName(team,'nick') + ' ' + (number === null ? (zh ? '資料不足' : 'unavailable') : number); }
      return '<aside class="card edition-pick edition-exploration" id="desk-' + desk.id + '" data-desk="' + desk.id + '">' + signedColumn(desk.id) +
        '<section class="edition-stage"><h3>' + (zh ? '探索票 · ' : 'Exploratory pick · ') + esc(pick(desk.pick)) + '</h3>' +
        '<p>' + esc(metric) + ' · ' + esc(value(g.away,desk.awayValue)) + ' / ' + esc(value(g.home,desk.homeValue)) + '</p><p>' + esc(baselineComparison(desk.pick)) + '</p>' +
        '<p class="pv">' + (zh ? 'NBA 資料觀測 ' : 'NBA source observed ') + time(exploration.source.observedAt) + ' · ' +
        (zh ? '探索票登錄 ' : 'Pick recorded ') + time(exploration.filedAt) + '</p><p class="pv">' +
        '<a href="' + esc(exploration.source.url) + '" rel="noopener noreferrer">NBA</a> · ' + (zh ? '規則 v1' : 'Rule v1') + '</p>' +
        (score ? '<p>' + (zh ? '研究選擇 ' : 'Research pick: ') + labels[score.desks[index].outcome] + ' · ' +
          (zh ? '基準 ' : 'Baseline: ') + labels[score.baselineOutcome] + '</p>' : '<p class="pv">' + (zh ? '尚未結算' : 'Scoring pending') + '</p>') + '</section></aside>';
    }).join('');
    var index = '<nav class="edition-index" aria-label="' + (zh ? '本場專欄' : 'Matchup columns') + '">' +
      (article ? '<a class="pill" href="#pregame-column">' + (zh ? '賽前專欄' : 'Pregame column') + '</a>' : '') +
      Object.keys(deskNames).map(function (id) { return '<a class="pill" href="#desk-' + id + '">' + deskNames[id] + '</a>'; }).join('') + '</nav>';
    return index + article + sample + recordDesk + columns;
  }

  function cells(pos, partial) {
    var out = '';
    for (var i = 0; i < 11; i++) {
      var cls = 'cell';
      if (i === 5) cls += ' cell-mid';
      else if (partial) cls += ' cell-dash';
      else if (pos > 0 && i > 5 && i <= 5 + pos) cls += ' cell-on';
      else if (pos < 0 && i >= 5 + pos && i < 5) cls += ' cell-on';
      out += '<span class="' + cls + '"></span>';
    }
    return out;
  }

  window.MOSPORT_PAGE = {
    id: 'today',
    after: function () {
      // Schedule data can arrive after the browser's initial fragment scroll.
      if (!/^(pregame-column|desk-(season-record|turnovers|second-chance))$/.test(requestedColumn)) return;
      var target = document.getElementById(requestedColumn);
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView();
        requestedColumn = '';
      }
    },
    onAct: function (act, el, rerender) { if (act === 'first') { showFirst = !showFirst; rerender(); } },
    render: function (c) {
      var T = c.T, esc = c.esc, L = c.lang, R = c.issue;
      if (R.status !== 'OK' && R.status !== 'SCHEDULE_ONLY' && !(R.status === 'STALE' && c.meta && c.meta.scheduleOnly)) return c.topbar + '<main class="sheet">' + c.stateMessage(R) + '</main>';
      var id = new URLSearchParams(location.search).get('game');
      /* An unknown game id shows a not-found state; it never falls back to another game. */
      var g = id ? R.schedule.filter(function (x) { return x.gameId === id; })[0] : (R.lead && R.lead.game) || (c.editions && c.editions.length && R.schedule[0]);
      if (!g) return c.topbar + '<main class="sheet"><div class="state-msg" role="status"><p>' + esc(T(id ? 'unknownGame' : 'emptyToday')) + '</p><a class="cta" href="' + c.href('schedule.html') + '">' + T('openSchedule') + ' <span aria-hidden="true">→</span></a></div></main>';
      var w = g.world || {};
      var eligible = c.onMagazine(g);
      var pct = c.percentOf(g);
      /* DEMO detail copy exists only for DEMO issues and eligible games. */
      var d = R.demo && eligible ? ((window.MOSPORT_FIXTURES.details || {})[g.gameId] || {})[L] : null;

      var head =
        '<section class="m-hero" aria-labelledby="m-h">' +
          '<mo-art slot-id="match-hero-art"></mo-art>' +
          '<div class="m-run"><span>' + (d ? esc(d.runhead) : 'MATCH DETAIL') + '</span><span>' + esc(g.gameId) + '</span></div>' +
          '<div class="m-teams">' +
            '<div class="m-team"><mo-team-logo code="' + esc(g.away) + '" size="xl"></mo-team-logo><p class="m-name">' + esc(c.teamName(g.away)) + '</p><p class="m-side">' + (L === 'zh' ? '客隊' : 'Away') + ' · ' + esc(g.away) + '</p></div>' +
            '<div class="m-mid"><h1 id="m-h">' + esc(g.away) + ' <span>@</span> ' + esc(g.home) + '</h1><p>' + esc(c.tipLine(g)) + '</p>' +
              (eligible ? '<p class="m-badges"><span class="b b-hero">' + T('ver_' + w.version) + '</span><span class="b b-hero2">' + (L === 'zh' ? '快照 ' : 'Snapshot ') + esc(w.snapshotId) + '</span></p>' : '') +
            '</div>' +
            '<div class="m-team"><mo-team-logo code="' + esc(g.home) + '" size="xl"></mo-team-logo><p class="m-name">' + esc(c.teamName(g.home)) + '</p><p class="m-side">' + (L === 'zh' ? '主隊' : 'Home') + ' · ' + esc(g.home) + '</p></div>' +
          '</div>' +
        '</section>';

      var top = '<div class="m-top"><a class="back" href="' + c.href(g.source ? 'schedule.html' : 'index.html') + '">‹ ' + T(g.source ? 'openSchedule' : 'back') + '</a>' + (R.demo ? '<span class="demo-line"><span class="demo-badge">DEMO</span> ' + esc(d ? d.demo : T('demoNote')) + '</span>' : '') + '</div>';

      if (!eligible) {
        /* An empty pregame card is not shown: no record, no tipoff notice, no reason line. */
        var pregameBody = c.pregameRecord(g) + (g.source ? '' : '<p class="pv">' + esc(T('noRead_' + g.noReadReason)) + '</p>');
        var analysis = g.analysis ? renderAnalysis(c, g) : '';
        return c.topbar + '<main class="sheet">' + top + head + analysis +
          (R.status === 'STALE' ? c.stateMessage(R) : '') +
          (g.source ? '<section class="card"><p>' + esc(T('savedSchedule')) + ' · ' + esc(c.statusLabel(g)) + '</p><p class="pv">NBA game ID ' + esc(g.gameId) + '</p>' + c.sourceNote(g.source) + '</section>' : '') +
          (pregameBody ? '<section class="card"><p class="lbl">' + esc(T(c.isFinal(g) ? 'final' : 'pregameTitle')) + '</p>' + pregameBody + '</section>' : '') + '</main>';
      }

      var read =
        '<section class="card card-read" aria-labelledby="rd"><p id="rd" class="lbl lbl-brand">② World · Coach Read</p>' +
          '<p class="verdict">' + esc(w.verdict[L]) + '</p>' +
          (d ? '<div class="bbw"><p><span class="lbl">' + esc(d.because) + '</span>' + esc(d.becauseTxt) + '</p><p><span class="lbl">' + esc(d.but) + '</span>' + esc(d.butTxt) + '</p><p class="watch"><span class="lbl">' + esc(d.watch) + '</span>' + esc(d.watchTxt) + '</p></div>' : (w.why ? '<p>' + esc(w.why[L]) + '</p>' : '')) +
          '<div class="nums">' +
            (pct != null ? '<div class="nums-win"><p class="lbl">' + T('homeWin') + '</p><p class="big">' + pct + '%</p>' +
              (w.interval60 ? '<div class="band" role="img" aria-label="' + esc(d ? d.bandAria : '') + '"><i class="band-r" style="left:' + Math.round(w.interval60[0] * 100) + '%;width:' + Math.round((w.interval60[1] - w.interval60[0]) * 100) + '%"></i><i class="band-p" style="left:' + pct + '%"></i></div><p class="pv">' + esc(d ? d.bandNote : '') + '</p>' : '') +
            '</div>' : '') +
            (d ? '<div class="nums-2"><p class="lbl">' + esc(d.scoreLbl) + '</p><p class="mid">' + esc(d.score) + '</p></div><div><p class="lbl">' + esc(d.marginLbl) + '</p><p class="mid">' + esc(d.margin) + '</p></div><div><p class="lbl">' + esc(d.totalLbl) + '</p><div class="na"><p>' + esc(d.notQualified) + '</p><p class="pv">ENGINE_NOT_QUALIFIED</p></div></div>' : '') +
          '</div>' + (d ? '<p class="pv">' + esc(d.fieldNote) + '</p>' : '') +
        '</section>';

      if (!d) {
        return c.topbar + '<main class="sheet">' + top + head + '<div class="main main-one">' + read + '</div></main>';
      }

      var ver =
        '<aside class="card card-ver" aria-labelledby="vr"><p id="vr" class="lbl">' + esc(d.verLabel) + '</p><span class="b b-ver">' + T('ver_' + w.version) + '</span>' +
          '<ol class="vers"><li><b>' + esc(d.v1) + '</b><span>' + esc(d.v1Time) + '</span></li><li class="is-cur"><b>' + esc(d.v2) + '</b><span>' + esc(d.v2Time) + '</span></li></ol>' +
          '<p class="small"><span class="lbl">' + esc(d.changes) + '</span>' + esc(d.changesTxt) + '</p>' +
          (showFirst ? '<div class="first">' + esc(d.firstSummary) + '</div>' : '') +
          '<button type="button" class="ghost" data-act="first" aria-expanded="' + showFirst + '">' + (showFirst ? d.firstHide : d.firstShow) + '</button>' +
          '<dl class="meta"><dt>' + esc(d.snapLbl) + '</dt><dd>' + esc(w.snapshotId) + '</dd><dt>' + esc(d.cutoffLbl) + '</dt><dd>' + esc(d.cutoff) + '</dd><dt>' + esc(d.modelLbl) + '</dt><dd>world-demo-0.1</dd></dl>' +
          '<p class="pv">' + esc(d.recoveryNote) + '</p></aside>';

      var fac = '<section class="card card-fac"><p class="lbl">' + esc(d.facLabel) + '</p>' + d.factors.map(function (f) {
        return '<div class="row"><div><p class="row-t">' + esc(f.name) + '</p><p class="row-s">' + esc(f.dir) + '</p></div><div class="cells" role="img" aria-label="' + esc(f.dir) + '">' + cells(f.pos, f.partial) + '</div></div>';
      }).join('') + '<p class="pv">' + esc(d.facNote) + '</p></section>';

      var pmv = '<section class="card card-pmv"><p class="lbl">' + esc(d.pmvLabel) + '</p>' + d.players.map(function (p) {
        return '<div class="row"><div class="pl"><p class="row-t"><mo-team-logo code="' + esc(p.team) + '" size="xs"></mo-team-logo>' + esc(p.name) + '</p><p class="pl-b"><span class="b b-q">' + esc(p.avail) + '</span><span class="b b-ver">' + esc(p.level) + '</span></p><p class="row-s">' + esc(p.why) + '</p></div>' +
          (p.val ? '<div class="pmv"><p class="lbl">PMV</p><p class="mid">[X.X]</p></div>' : '<span class="b b-ne">' + esc(p.valNote) + '</span>') + '</div>';
      }).join('') + '<p class="pv">' + esc(d.pmvNote) + '</p></section>';

      var tp = '<section class="card card-tp"><p class="lbl">' + esc(d.tpLabel) + '</p>' + d.turns.map(function (x) { return '<div class="row row-col"><p class="row-t">' + esc(x.k) + '</p><p>' + esc(x.v) + '</p></div>'; }).join('') + '<p class="pv">' + esc(d.tpNote) + '</p></section>';
      var fal = '<section class="card card-fal"><p class="lbl">' + esc(d.falLabel) + '</p><ul class="fals">' + d.fals.map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('') + '</ul></section>';

      var ext = '<section class="ext-wrap"><div><h2 class="lbl lbl-ink">' + esc(d.extLabel) + '</h2><p class="small muted">' + esc(d.extNote) + '</p></div><div class="ext">' +
        '<article class="src"><div class="src-h"><p>DEMO Odds Source A</p><span class="b b-q">LICENSED</span></div><div class="odds"><div><p class="lbl">Moneyline</p><p>' + esc(g.home) + ' −175<br>' + esc(g.away) + ' +150</p></div><div><p class="lbl">Spread</p><p>' + esc(g.home) + ' −4.5</p></div><div><p class="lbl">Total</p><p>224.5</p></div></div><p class="pv">' + esc(d.oddsMeta) + '</p><span class="b b-q">' + esc(d.atFinal) + '</span><a class="lk" href="#">' + esc(d.origin) + ' ↗</a></article>' +
        '<article class="src"><div class="src-h"><p>DEMO Creator Channel 1</p><span class="b b-q">EMBED_PERMITTED</span></div><p class="small">' + esc(d.videoTitle) + '</p><div class="embed"><span>' + esc(d.embed) + '</span></div><p class="pv">' + esc(d.videoMeta) + '</p><span class="b b-q">' + esc(d.atFirst) + '</span><a class="lk" href="#">' + esc(d.origin) + ' ↗</a></article>' +
        '<article class="src"><div class="src-h"><p>DEMO Analyst 1 · DEMO Platform</p><span class="b b-q">LINK_ONLY</span></div><p class="small">' + esc(d.analystTitle) + '</p><p class="pv">' + esc(d.analystMeta) + '</p><span class="b b-na">' + esc(d.later) + '</span><a class="lk" href="#">' + esc(d.origin) + ' ↗</a></article>' +
      '</div></section>';

      var ev = '<section class="card"><div class="ev-h"><p class="lbl">' + esc(d.evLabel) + '</p><span class="b b-na">' + esc(d.partial) + '</span></div><div class="ev">' +
        d.evidence.map(function (e) { return '<span>' + esc(e[0]) + '</span><span class="ev-v"><span class="b b-' + esc(e[2]) + '">' + esc(e[1]) + '</span></span>'; }).join('') +
        '</div><details><summary>' + esc(d.fullProv) + '</summary><p class="pv">fingerprint ' + esc(w.snapshotId) + '…b71d · NBA.G.HOME_COURT v1 OBSERVED · injury report 17:30 PT · rosters observed 18:40 PT · rights UNVERIFIED</p></details></section>';

      return c.topbar + '<main class="sheet">' + top + head + '<div class="main">' + read + ver + fac + pmv + tp + fal + '</div>' + ext + ev + '<p class="small muted">' + esc(d.foot) + '</p></main>';
    }
  };
})();
