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
      if (R.refused) return c.topbar + '<main class="sheet"><p>' + esc(T('refused')) + '</p></main>';
      var id = new URLSearchParams(location.search).get('game');
      var g = R.schedule.filter(function (x) { return x.gameId === id; })[0] || (R.lead && R.lead.game);
      if (!g) return c.topbar + '<main class="sheet"><p>' + esc(T('emptyToday')) + '</p></main>';
      var w = g.world || {};
      var eligible = c.onMagazine(g);
      var pct = c.percentOf(g);
      var d = ((window.MOSPORT_FIXTURES.details || {})[g.gameId] || {})[L];

      var head =
        '<section class="m-hero" aria-labelledby="m-h">' +
          '<mo-cover-artwork name="arena"></mo-cover-artwork>' +
          '<div class="m-run"><span>' + (d ? esc(d.runhead) : 'MATCH DETAIL') + '</span><span>' + g.gameId + '</span></div>' +
          '<div class="m-teams">' +
            '<div class="m-team"><mo-team-logo code="' + g.away + '" size="xl"></mo-team-logo><p class="m-name">' + esc(c.teamName(g.away)) + '</p><p class="m-side">' + (L === 'zh' ? '客隊' : 'Away') + ' · ' + g.away + '</p></div>' +
            '<div class="m-mid"><h1 id="m-h">' + g.away + ' <span>@</span> ' + g.home + '</h1><p>' + esc(c.tipLine(g)) + '</p>' +
              (eligible ? '<p class="m-badges"><span class="b b-hero">' + T('ver_' + w.version) + '</span><span class="b b-hero2">' + (L === 'zh' ? '快照 ' : 'Snapshot ') + esc(w.snapshotId) + '</span></p>' : '') +
            '</div>' +
            '<div class="m-team"><mo-team-logo code="' + g.home + '" size="xl"></mo-team-logo><p class="m-name">' + esc(c.teamName(g.home)) + '</p><p class="m-side">' + (L === 'zh' ? '主隊' : 'Home') + ' · ' + g.home + '</p></div>' +
          '</div>' +
        '</section>';

      var top = '<div class="m-top"><a class="back" href="' + c.href('index.html') + '">‹ ' + T('back') + '</a>' + (R.demo ? '<span class="demo-line"><span class="demo-badge">DEMO</span> ' + esc(d ? d.demo : T('demoNote')) + '</span>' : '') + '</div>';

      if (!eligible) {
        return c.topbar + '<main class="sheet">' + top + head +
          '<section class="card"><p class="lbl">② World · Coach Read</p><p class="na-big">' + (L === 'zh' ? '本場尚無可公開的判讀。' : 'No public read for this game.') +
          '</p><p class="pv">' + esc(w.missingReason || (w.distributionEligibility && w.distributionEligibility !== 'PUBLIC' ? 'DISTRIBUTION_NOT_PUBLIC' : 'NOT_ISSUED')) + '</p></section></main>';
      }

      var read =
        '<section class="card card-read" aria-labelledby="rd"><p id="rd" class="lbl lbl-brand">② World · Coach Read</p>' +
          '<p class="verdict">' + esc(w.verdict[L]) + '</p>' +
          (d ? '<div class="bbw"><p><span class="lbl">' + d.because + '</span>' + esc(d.becauseTxt) + '</p><p><span class="lbl">' + d.but + '</span>' + esc(d.butTxt) + '</p><p class="watch"><span class="lbl">' + d.watch + '</span>' + esc(d.watchTxt) + '</p></div>' : (w.why ? '<p>' + esc(w.why[L]) + '</p>' : '')) +
          '<div class="nums">' +
            (pct != null ? '<div class="nums-win"><p class="lbl">' + T('homeWin') + '</p><p class="big">' + pct + '%</p>' +
              (w.interval60 ? '<div class="band" role="img" aria-label="' + esc(d ? d.bandAria : '') + '"><i class="band-r" style="left:' + Math.round(w.interval60[0] * 100) + '%;width:' + Math.round((w.interval60[1] - w.interval60[0]) * 100) + '%"></i><i class="band-p" style="left:' + pct + '%"></i></div><p class="pv">' + esc(d ? d.bandNote : '') + '</p>' : '') +
            '</div>' : '') +
            (d ? '<div class="nums-2"><p class="lbl">' + d.scoreLbl + '</p><p class="mid">' + d.score + '</p></div><div><p class="lbl">' + d.marginLbl + '</p><p class="mid">' + d.margin + '</p></div><div><p class="lbl">' + d.totalLbl + '</p><div class="na"><p>' + d.notQualified + '</p><p class="pv">ENGINE_NOT_QUALIFIED</p></div></div>' : '') +
          '</div>' + (d ? '<p class="pv">' + esc(d.fieldNote) + '</p>' : '') +
        '</section>';

      if (!d) {
        return c.topbar + '<main class="sheet">' + top + head + '<div class="main main-one">' + read + '</div></main>';
      }

      var ver =
        '<aside class="card card-ver" aria-labelledby="vr"><p id="vr" class="lbl">' + d.verLabel + '</p><span class="b b-ver">' + T('ver_' + w.version) + '</span>' +
          '<ol class="vers"><li><b>' + d.v1 + '</b><span>' + d.v1Time + '</span></li><li class="is-cur"><b>' + d.v2 + '</b><span>' + d.v2Time + '</span></li></ol>' +
          '<p class="small"><span class="lbl">' + d.changes + '</span>' + d.changesTxt + '</p>' +
          (showFirst ? '<div class="first">' + d.firstSummary + '</div>' : '') +
          '<button type="button" class="ghost" data-act="first" aria-expanded="' + showFirst + '">' + (showFirst ? d.firstHide : d.firstShow) + '</button>' +
          '<dl class="meta"><dt>' + d.snapLbl + '</dt><dd>' + esc(w.snapshotId) + '</dd><dt>' + d.cutoffLbl + '</dt><dd>' + d.cutoff + '</dd><dt>' + d.modelLbl + '</dt><dd>world-demo-0.1</dd></dl>' +
          '<p class="pv">' + d.recoveryNote + '</p></aside>';

      var fac = '<section class="card card-fac"><p class="lbl">' + d.facLabel + '</p>' + d.factors.map(function (f) {
        return '<div class="row"><div><p class="row-t">' + f.name + '</p><p class="row-s">' + f.dir + '</p></div><div class="cells" role="img" aria-label="' + esc(f.dir) + '">' + cells(f.pos, f.partial) + '</div></div>';
      }).join('') + '<p class="pv">' + d.facNote + '</p></section>';

      var pmv = '<section class="card card-pmv"><p class="lbl">' + d.pmvLabel + '</p>' + d.players.map(function (p) {
        return '<div class="row"><div class="pl"><p class="row-t"><mo-team-logo code="' + p.team + '" size="xs"></mo-team-logo>' + p.name + '</p><p class="pl-b"><span class="b b-q">' + p.avail + '</span><span class="b b-ver">' + p.level + '</span></p><p class="row-s">' + p.why + '</p></div>' +
          (p.val ? '<div class="pmv"><p class="lbl">PMV</p><p class="mid">[X.X]</p></div>' : '<span class="b b-ne">' + p.valNote + '</span>') + '</div>';
      }).join('') + '<p class="pv">' + d.pmvNote + '</p></section>';

      var tp = '<section class="card card-tp"><p class="lbl">' + d.tpLabel + '</p>' + d.turns.map(function (x) { return '<div class="row row-col"><p class="row-t">' + x.k + '</p><p>' + x.v + '</p></div>'; }).join('') + '<p class="pv">' + d.tpNote + '</p></section>';
      var fal = '<section class="card card-fal"><p class="lbl">' + d.falLabel + '</p><ul class="fals">' + d.fals.map(function (z) { return '<li>' + z + '</li>'; }).join('') + '</ul></section>';

      var ext = '<section class="ext-wrap"><div><h2 class="lbl lbl-ink">' + d.extLabel + '</h2><p class="small muted">' + d.extNote + '</p></div><div class="ext">' +
        '<article class="src"><div class="src-h"><p>DEMO Odds Source A</p><span class="b b-q">LICENSED</span></div><div class="odds"><div><p class="lbl">Moneyline</p><p>' + g.home + ' −175<br>' + g.away + ' +150</p></div><div><p class="lbl">Spread</p><p>' + g.home + ' −4.5</p></div><div><p class="lbl">Total</p><p>224.5</p></div></div><p class="pv">' + d.oddsMeta + '</p><span class="b b-q">' + d.atFinal + '</span><a class="lk" href="#">' + d.origin + ' ↗</a></article>' +
        '<article class="src"><div class="src-h"><p>DEMO Creator Channel 1</p><span class="b b-q">EMBED_PERMITTED</span></div><p class="small">' + d.videoTitle + '</p><div class="embed"><span>' + d.embed + '</span></div><p class="pv">' + d.videoMeta + '</p><span class="b b-q">' + d.atFirst + '</span><a class="lk" href="#">' + d.origin + ' ↗</a></article>' +
        '<article class="src"><div class="src-h"><p>DEMO Analyst 1 · DEMO Platform</p><span class="b b-q">LINK_ONLY</span></div><p class="small">' + d.analystTitle + '</p><p class="pv">' + d.analystMeta + '</p><span class="b b-na">' + d.later + '</span><a class="lk" href="#">' + d.origin + ' ↗</a></article>' +
      '</div></section>';

      var ev = '<section class="card"><div class="ev-h"><p class="lbl">' + d.evLabel + '</p><span class="b b-na">' + d.partial + '</span></div><div class="ev">' +
        d.evidence.map(function (e) { return '<span>' + e[0] + '</span><span class="ev-v"><span class="b b-' + e[2] + '">' + e[1] + '</span></span>'; }).join('') +
        '</div><details><summary>' + d.fullProv + '</summary><p class="pv">fingerprint ' + esc(w.snapshotId) + '…b71d · NBA.G.HOME_COURT v1 OBSERVED · injury report 17:30 PT · rosters observed 18:40 PT · rights UNVERIFIED</p></details></section>';

      return c.topbar + '<main class="sheet">' + top + head + '<div class="main">' + read + ver + fac + pmv + tp + fal + '</div>' + ext + ev + '<p class="small muted">' + d.foot + '</p></main>';
    }
  };
})();
