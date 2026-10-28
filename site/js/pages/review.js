/* Review: only human-approved public reviews (Founder C-4). Internal audit is never shown. */
window.MOSPORT_PAGE = {
  id: 'review',
  render: function (c) {
    var T = c.T, esc = c.esc, L = c.lang, R = c.issue;
    if (R.refused) return c.topbar + '<main class="sheet"><p>' + esc(T('refused')) + '</p></main>';
    var reviews = R.stories.filter(function (s) { return s.type === 'REVIEW'; });
    var body = reviews.length ? reviews.map(function (r) {
      return '<article class="rv-article"><div class="rv-top"><mo-team-logo code="' + r.teams[0] + '" size="md"></mo-team-logo><mo-team-logo code="' + r.teams[1] + '" size="md"></mo-team-logo><p class="rv-codes">' + r.teams[0] + ' @ ' + r.teams[1] + '</p></div>' +
        '<h2>' + esc(r[L].headline) + '</h2><p>' + esc(r[L].summary) + '</p>' + (r[L].meta ? '<p class="pv">' + esc(r[L].meta) + '</p>' : '') +
        '<p class="pv">' + (L === 'zh' ? '人工核准 ' : 'Human approval ') + esc(r.approval.approverId) + ' · ' + esc(r.approval.approvedAt) + ' · ' + esc(r.approvalReceiptRef) + '</p></article>';
    }).join('') : '<p class="today-empty">' + T('reviewEmpty') + '</p>';
    return c.topbar + '<main class="sheet">' +
      '<header class="sheet-head"><p class="kicker">MOSPORT' + (R.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</p><h1>' + T('reviewTitle') + '</h1><p class="muted">' + T('reviewIntro') + '</p></header>' + body + '</main>';
  }
};
