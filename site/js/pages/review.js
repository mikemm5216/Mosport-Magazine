/*
 * Review: only human-approved public reviews (Founder C-4). Internal audit, the
 * approver's identity and the source payload are never shown; the reader sees that
 * a person approved it, when, and the receipt reference.
 */
window.MOSPORT_PAGE = {
  id: 'review',
  render: function (c) {
    var T = c.T, esc = c.esc, L = c.lang, R = c.issue;
    if (R.status !== 'OK') return c.topbar + '<main class="sheet">' + c.stateMessage(R) + '</main>';
    var reviews = R.stories.filter(function (s) { return s.type === 'REVIEW' && s.approvalMode === 'HUMAN'; });
    var body = reviews.length ? reviews.map(function (r) {
      return '<article class="rv-article"><div class="rv-top"><mo-team-logo code="' + esc(r.teams[0]) + '" size="md"></mo-team-logo><mo-team-logo code="' + esc(r.teams[1]) + '" size="md"></mo-team-logo><p class="rv-codes">' + esc(r.teams[0]) + ' @ ' + esc(r.teams[1]) + '</p></div>' +
        '<h2>' + esc(r[L].headline) + '</h2>' + (r[L].summary ? '<p>' + esc(r[L].summary) + '</p>' : '') + (r[L].meta ? '<p class="pv">' + esc(r[L].meta) + '</p>' : '') +
        '<p class="pv">' + esc(T('humanApproved', { at: r.approvedOn.slice(0, 10), ref: r.receiptRef })) + '</p></article>';
    }).join('') : '<p class="today-empty">' + T('reviewEmpty') + '</p>';
    return c.topbar + '<main class="sheet">' +
      '<header class="sheet-head"><p class="kicker">MOSPORT' + (R.demo ? ' <span class="demo-badge">DEMO</span>' : '') + '</p><h1>' + T('reviewTitle') + '</h1><p class="muted">' + T('reviewIntro') + '</p></header>' + body + '</main>';
  }
};
