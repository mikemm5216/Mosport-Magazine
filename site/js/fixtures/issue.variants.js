/*
 * Test fixtures derived from the DEMO issue.
 *   empty  : no eligible World read and no published story (acceptance U-01)
 *   bypass : unapproved high-risk items placed in every slot (human-gate check)
 */
(function () {
  var F = window.MOSPORT_FIXTURES;
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  var empty = clone(F.demo);
  empty.items = [];
  empty.games.forEach(function (g) { g.world = { state: 'NOT_ISSUED', missingReason: 'NOT_YET_QUALIFIED' }; });
  empty.layout = { cover: [], lead: null, games: empty.games.map(function (g) { return g.gameId; }), stories: [] };
  F.empty = empty;

  var bypass = clone(F.demo);
  var bad = function (id, label, triggers, approval, extra) {
    return Object.assign({
      id: id, type: 'NEWS', editorialLabel: label, riskTriggers: triggers,
      publishState: 'PUBLISHED', homeEligible: true, demo: true,
      sourceRefs: ['src:demo-x'], verifiedFacts: ['x'], publishedAt: '2026-10-31T22:00:00Z',
      approval: approval, approvalReceiptRef: 'RCPT-BYPASS-' + id,
      zh: { headline: '【不應出現】' + id, summary: '繞過人工核准' },
      en: { headline: '[MUST NOT RENDER] ' + id, summary: 'human gate bypass' }
    }, extra || {});
  };
  bypass.items = bypass.items.concat([
    bad('BYP-MAJOR-AUTO', 'BREAKING_NEWS', ['MAJOR_NEWS'], { mode: 'AUTO', policyVersion: 'demo-policy-0' }),
    bad('BYP-EXCL-NOAPPROVER', 'MOSPORT_EXCLUSIVE', ['EXCLUSIVE_CLAIM'], { mode: 'HUMAN' }),
    bad('BYP-SENSITIVE-AUTO', null, ['SENSITIVE_NEWS'], { mode: 'AUTO', policyVersion: 'demo-policy-0' }),
    bad('BYP-RUMOR-PUB', null, ['UNVERIFIED_RUMOR'], { mode: 'AUTO', policyVersion: 'demo-policy-0' }),
    bad('BYP-REVIEW-AUTO', null, [], { mode: 'AUTO', policyVersion: 'demo-policy-0' }, { type: 'REVIEW', teams: ['SAC', 'PHX'] }),
    bad('BYP-NO-SOURCE', null, [], { mode: 'AUTO', policyVersion: 'demo-policy-0' }, { sourceRefs: [] }),
    bad('BYP-EXPIRED', null, [], { mode: 'AUTO', policyVersion: 'demo-policy-0' }, { validUntil: '2026-10-30T00:00:00Z' })
  ]);
  bypass.layout = {
    cover: ['BYP-MAJOR-AUTO', 'BYP-EXCL-NOAPPROVER', 'BYP-SENSITIVE-AUTO', 'BYP-RUMOR-PUB'],
    lead: 'BYP-RUMOR-PUB',
    games: bypass.layout.games,
    stories: ['BYP-REVIEW-AUTO', 'BYP-NO-SOURCE', 'BYP-EXPIRED']
  };
  F.bypass = bypass;
})();
