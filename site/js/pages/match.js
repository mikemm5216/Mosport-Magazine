/*
 * Match Detail — UI-01-a order: Verdict → Because → But → Watch, version, factors,
 * PMV, Turning Point, Falsifier, External Sources, Evidence/Provenance.
 * Verdict and numbers come only from the World package via the eligibility gate.
 */
(function () {
  var showFirst = false;

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
    onAct: function (act, el, rerender) { if (act === 'first') { showFirst = !showFirst; rerender(); } },
    render: function (c) {
      var T = c.T, esc = c.esc, L = c.lang, R = c.issue;
      if (R.status !== 'OK') return c.topbar + '<main class="sheet">' + c.stateMessage(R) + '</main>';
      var id = new URLSearchParams(location.search).get('game');
      /* An unknown game id shows a not-found state; it never falls back to another game. */
      var g = id ? R.schedule.filter(function (x) { return x.gameId === id; })[0] : (R.lead && R.lead.game);
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

      var top = '<div class="m-top"><a class="back" href="' + c.href('index.html') + '">‹ ' + T('back') + '</a>' + (R.demo ? '<span class="demo-line"><span class="demo-badge">DEMO</span> ' + esc(d ? d.demo : T('demoNote')) + '</span>' : '') + '</div>';

      if (!eligible) {
        return c.topbar + '<main class="sheet">' + top + head +
          '<section class="card"><p class="lbl">② World · Coach Read</p><p class="na-big">' + (L === 'zh' ? '本場尚無可公開的判讀。' : 'No public read for this game.') +
          '</p><p class="pv">' + esc(T('noRead_' + g.noReadReason)) + '</p></section></main>';
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
