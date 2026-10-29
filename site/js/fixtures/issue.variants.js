/*
 * DEMO test issues derived from the DEMO issue. Each is a risky input the
 * pipeline must handle without inventing content or bypassing the gate.
 *   empty         no eligible World read and no published story (acceptance U-01)
 *   bypass        unapproved / mis-approved high-risk items in every slot (human gate)
 *   invalid       unsupported schema version (whole issue refused)
 *   dupid         two items share one id (whole issue refused, no "last one wins")
 *   badtime       malformed and impossible timestamps on records
 *   stale         the issue's validUntil has passed
 *   staleapproval content edited after its approval (old approval must not carry over)
 *   retracted     a source behind a published story was retracted
 *   slotmismatch  layout puts a review on the cover and a streak in the lead
 *   longtitle     very long headlines and verdicts (layout must hold)
 *   xss           markup and javascript: URLs inside content (must render as text / be rejected)
 *   loadfail      the provider fails (network / file error)
 *   live          LIVE issue carrying a DEMO record (rejected record)
 */
(function () {
  var C = window.MOSPORT_CONTRACTS;
  var S = C.SCHEMAS;
  var F = window.MOSPORT_FIXTURES;
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var QA_PASS = { fact: 'PASS', language: 'PASS', rights: 'PASS', policy: 'PASS' };
  var find = function (iss, id) { return iss.items.filter(function (i) { return i.id === id; })[0]; };
  var rehash = function (iss, itemId, approvalId) {
    var a = iss.approvals.filter(function (x) { return x.id === approvalId; })[0];
    a.contentHash = C.contentHash(find(iss, itemId));
  };

  var empty = clone(F.demo);
  empty.items = []; empty.approvals = []; empty.sources = [];
  empty.games.forEach(function (g) { g.world = { state: 'NOT_ISSUED', distributionEligibility: null, version: null, snapshotId: null, homeWinProbability: null, interval60: null, verdict: null, why: null, missingReason: 'NOT_YET_QUALIFIED' }; });
  empty.layout.cover = []; empty.layout.lead = null; empty.layout.stories = [];
  F.empty = empty;

  /* ---------- bypass: every way a high-risk item could try to reach the page ---------- */
  var bypass = clone(F.demo);
  var bad = function (id, label, triggers, mode, extra) {
    var it = Object.assign({
      schema: S.item, id: id, revision: 1, type: 'NEWS', editorialLabel: label, riskTriggers: triggers,
      publishState: 'PUBLISHED', homeEligible: true, sourceRefs: ['src:demo-official-injury-report'], verifiedFacts: ['x'],
      publishedAt: '2026-10-31T22:00:00Z', validUntil: null, approvalReceiptRef: 'RCPT-BYP-' + id, worldAnalysisRef: null,
      linkedGameIds: [], linkedTeams: [], teams: [], correctionOfRevision: null, demo: true,
      zh: { headline: '【不應出現】' + id, summary: '繞過人工核准', meta: null },
      en: { headline: '[MUST NOT RENDER] ' + id, summary: 'human gate bypass', meta: null }
    }, extra || {});
    bypass.items.push(it);
    if (mode) {
      bypass.approvals.push({ schema: S.approval, id: 'RCPT-BYP-' + id, itemId: id, itemRevision: 1, contentHash: C.contentHash(it),
        mode: mode, decision: 'APPROVED', policyVersion: 'demo-policy-0', approverId: mode === 'HUMAN' ? 'editor:demo-x' : null,
        decidedAt: '2026-10-31T21:59:00Z', qa: QA_PASS, note: null, demo: true });
    }
    return it;
  };
  bad('BYP-MAJOR-AUTO', 'BREAKING_NEWS', ['MAJOR_NEWS'], 'AUTO');
  bad('BYP-SENSITIVE-AUTO', null, ['SENSITIVE_NEWS'], 'AUTO');
  bad('BYP-RUMOR-PUB', null, ['UNVERIFIED_RUMOR'], 'AUTO');
  bad('BYP-EXCL-AUTO', 'MOSPORT_EXCLUSIVE', ['EXCLUSIVE_CLAIM'], 'AUTO', { type: 'FEATURE' });
  bad('BYP-BREAKING-LABEL-AUTO', 'BREAKING_NEWS', [], 'AUTO');
  bad('BYP-REVIEW-AUTO', null, [], 'AUTO', { type: 'REVIEW', teams: ['SAC', 'PHX'] });
  bad('BYP-NO-SOURCE', null, [], 'AUTO', { sourceRefs: [] });
  bad('BYP-EXPIRED', null, [], 'AUTO', { validUntil: '2026-10-31T23:00:00Z' });
  bad('BYP-NO-RECEIPT', null, [], null);
  /* An approval for another item cannot be borrowed. */
  bad('BYP-BORROWED', 'BREAKING_NEWS', ['MAJOR_NEWS'], null, { approvalReceiptRef: 'RCPT-DEMO-002' });
  /* A receipt that says REJECTED is not an approval. */
  var rej = bad('BYP-REJECTED', null, [], 'AUTO');
  bypass.approvals[bypass.approvals.length - 1].decision = 'REJECTED';
  /* An embedded approval object is not part of the contract: the record is invalid. */
  bad('BYP-EMBEDDED', 'BREAKING_NEWS', ['MAJOR_NEWS'], null, { approval: { mode: 'HUMAN', approverId: 'me', approvedAt: '2026-10-31T21:00:00Z' }, approvalReceiptRef: null });
  /* A human approval and publication dated after the reader's now. */
  bad('BYP-FUTURE-HUMAN', 'BREAKING_NEWS', ['MAJOR_NEWS'], 'HUMAN', { publishedAt: '2026-11-03T00:00:00Z' });
  bypass.approvals[bypass.approvals.length - 1].decidedAt = '2026-11-02T23:00:00Z';
  void rej;
  bypass.layout.cover = ['BYP-MAJOR-AUTO', 'BYP-EXCL-AUTO', 'BYP-BREAKING-LABEL-AUTO'];
  bypass.layout.lead = null;
  bypass.layout.stories = ['BYP-REVIEW-AUTO', 'BYP-NO-SOURCE', 'BYP-EXPIRED', 'BYP-NO-RECEIPT', 'BYP-REJECTED', 'BYP-SENSITIVE-AUTO', 'BYP-RUMOR-PUB'].slice(0, 6);
  F.bypass = bypass;
  /* Second bypass page: the remaining cases in the cover slots. */
  var bypass2 = clone(bypass);
  bypass2.layout.cover = ['BYP-BORROWED', 'BYP-EMBEDDED', 'BYP-FUTURE-HUMAN'];
  bypass2.layout.stories = [];
  F.bypass2 = bypass2;

  var invalid = clone(F.demo);
  invalid.schema = 'mosport-b/magazine-issue@99';
  F.invalid = invalid;

  var dupid = clone(F.demo);
  var twin = clone(find(dupid, 'ED-NEWS-0007'));
  twin.zh.headline = '【不應出現】重複 id'; twin.en.headline = '[MUST NOT RENDER] duplicate id';
  dupid.items.push(twin);
  F.dupid = dupid;

  var badtime = clone(F.demo);
  find(badtime, 'ED-NEWS-0007').validUntil = '2026-11-31T25:00:00Z';
  find(badtime, 'ED-STRK-0011').publishedAt = '31/10/2026';
  badtime.games[1].tipoff = '2026-11-01 00:00';
  F.badtime = badtime;

  var stale = clone(F.demo);
  stale.validUntil = '2026-10-31T23:55:00Z';
  F.stale = stale;

  var staleapproval = clone(F.demo);
  find(staleapproval, 'ED-NEWS-0007').zh.headline = '【不應出現】核准後被改寫';
  find(staleapproval, 'ED-NEWS-0007').en.headline = '[MUST NOT RENDER] edited after approval';
  F.staleapproval = staleapproval;

  var retracted = clone(F.demo);
  retracted.sourceEvents.push({ schema: S.sourceEvent, id: 'SEV-DEMO-001', sourceId: 'src:demo-official-injury-report', state: 'RETRACTED',
    at: '2026-10-31T23:30:00Z', note: 'DEMO: publisher withdrew the report', demo: true });
  F.retracted = retracted;

  var slotmismatch = clone(F.demo);
  slotmismatch.layout.cover = ['ED-REV-0040'];
  slotmismatch.layout.lead = 'ED-STRK-0011';
  slotmismatch.layout.stories = ['ED-LEAD-0041'];
  F.slotmismatch = slotmismatch;

  var longtitle = clone(F.demo);
  var longZh = '湖人主場迎戰勇士，背靠背、長途移動與輪替缺口同時出現，這場比賽的節奏與板凳深度可能成為最後兩分鐘的關鍵';
  var longEn = 'Lakers host Golden State as a back-to-back, long travel and a rotation gap all arrive at once, and pace and bench depth may decide the final two minutes';
  ['ED-NEWS-0007', 'ED-FEAT-0003', 'ED-STRK-0011', 'ED-REV-0040'].forEach(function (id) {
    var it = find(longtitle, id);
    it.zh.headline = longZh.slice(0, 60); it.en.headline = longEn.slice(0, 140);
  });
  rehash(longtitle, 'ED-NEWS-0007', 'RCPT-DEMO-002'); rehash(longtitle, 'ED-FEAT-0003', 'RCPT-DEMO-003');
  rehash(longtitle, 'ED-STRK-0011', 'RCPT-DEMO-004'); rehash(longtitle, 'ED-REV-0040', 'RCPT-DEMO-005');
  longtitle.games[1].world.verdict = { zh: '接近均勢，尼克主場略有利，但兩隊近期的三分球命中波動很大，結果仍高度不確定。', en: 'Close to even; the Knicks have a slight home edge, but both teams’ recent three-point shooting has swung widely.' };
  F.longtitle = longtitle;

  var xss = clone(F.demo);
  var x = find(xss, 'ED-NEWS-0007');
  x.zh.headline = '<img src=x onerror="window.__xss=1">湖人<script>window.__xss=2</script>';
  x.en.headline = '<img src=x onerror="window.__xss=1">Lakers<script>window.__xss=2</script>';
  x.zh.summary = '"><svg onload="window.__xss=3">'; x.en.summary = '"><svg onload="window.__xss=3">';
  rehash(xss, 'ED-NEWS-0007', 'RCPT-DEMO-002');
  /* A javascript: URL in a source receipt is rejected by the contract. */
  xss.sources.filter(function (s) { return s.id === 'src:mosport-original-demo'; })[0].originalUrl = 'javascript:window.__xss=4';
  /* A label that would break out of a class attribute is not in the enum. */
  find(xss, 'ED-STRK-0011').editorialLabel = 'STREAK_WATCH" onmouseover="window.__xss=5';
  xss.games[2].world.verdict = { zh: '<b onclick="window.__xss=6">粗體</b>', en: '<b onclick="window.__xss=6">bold</b>' };
  F.xss = xss;

  var live = clone(F.demo);
  live.mode = 'LIVE';
  F.live = live;

  F.loadfail = { __loadError: 'DEMO: provider failed (simulated network error)' };
})();
