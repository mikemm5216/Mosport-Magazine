/* Owner-edition reader. The build installs separately pinned editorial and research
   inputs; URL options cannot enable an edition. Research is authored and scored by A. */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var C = node ? require('../contracts/contracts.js') : root.MOSPORT_CONTRACTS;
  function digest(data) { return C.sha256(C.canonical(data)); }
  function pinned(value, pin) { return !!(value && pin && pin === digest(value)); }
  function beforeOrAt(a, b) {
    return Number.isFinite(C.parseInstant(a)) && C.parseInstant(a) <= C.parseInstant(b);
  }
  function exactKeys(object, list) {
    return !!object && typeof object === 'object' && !Array.isArray(object) &&
      Object.keys(object).sort().join('|') === list.split(' ').sort().join('|');
  }
  function validArticle(article, schedule, pin, now) {
    if (!pinned(article, pin) || !exactKeys(article, 'nbaGameId cutoffAt preparedAt zh en sources') ||
        article.nbaGameId !== schedule.game.gameId || !beforeOrAt(article.cutoffAt, article.preparedAt) ||
        !beforeOrAt(article.preparedAt, now) || !(C.parseInstant(article.preparedAt) < C.parseInstant(schedule.game.tipoff))) return false;
    if (![article.zh, article.en].every(function (copy) {
      return exactKeys(copy, 'title body watch falsifier') && Object.values(copy).every(function (s) { return typeof s === 'string' && s.trim().length > 0; });
    })) return false;
    return Array.isArray(article.sources) && article.sources.length > 0 && article.sources.every(function (source) {
      if (!exactKeys(source, 'label url observedAt') || !beforeOrAt(source.observedAt, article.cutoffAt) || !source.label) return false;
      try {
        var u = new URL(source.url);
        return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
          ['www.nba.com','site.api.espn.com','www.espn.com'].includes(u.hostname);
      } catch (e) { return false; }
    });
  }
  function validForecast(f, stage, entry, schedule, now, initialDigest) {
    if (!pinned(f, entry.pins[stage]) || !exactKeys(f, 'schema nbaGameId espnGameId away home tipoffAt stage lockedAt dataCutoff personaId personaVersion feature awayRecord homeRecord pick reason baselinePick priorDigest')) return false;
    var game = schedule.game, tip = C.parseInstant(game.tipoff), lock = C.parseInstant(f.lockedAt);
    if (f.schema !== 'mosport-a/research-pick@1' || f.stage !== stage || f.nbaGameId !== game.gameId ||
        f.espnGameId !== entry.espnGameId || f.away !== game.away || f.home !== game.home ||
        C.parseInstant(f.tipoffAt) !== tip || !beforeOrAt(f.dataCutoff, f.lockedAt) || !beforeOrAt(f.lockedAt, now) ||
        f.personaId !== 'season-record' || f.personaVersion !== '1' || f.feature !== 'SEASON_WIN_RATIO') return false;
    if (stage === 'INITIAL' ? (lock >= tip - 900000 || f.priorDigest !== null) :
      (lock < tip - 900000 || lock >= tip || C.parseInstant(f.dataCutoff) !== tip - 900000 || !initialDigest || f.priorDigest !== initialDigest)) return false;
    function record(r) { return r === null || (exactKeys(r, 'wins losses') && [r.wins,r.losses].every(function (n) { return Number.isSafeInteger(n) && n >= 0; })); }
    return record(f.homeRecord) && record(f.awayRecord) && ['HOME',null].includes(f.baselinePick) &&
      ((f.reason === 'HIGHER_WIN_RATIO' && ['HOME','AWAY'].includes(f.pick) && f.homeRecord && f.awayRecord) ||
       (['TIED','RECORD_MISSING'].includes(f.reason) && f.pick === null));
  }
  function scoreFor(s, f, entry, result) {
    if ((f.stage === 'FINAL' && C.parseInstant(f.lockedAt) !== C.parseInstant(f.dataCutoff)) ||
        !result || !s || !pinned(s, entry.pins['score' + f.stage]) ||
        !exactKeys(s, 'schema nbaGameId espnGameId stage forecastDigest receiptRef outcome baselineOutcome') ||
        s.schema !== 'mosport-a/research-score@1' || s.stage !== f.stage || s.forecastDigest !== digest(f) ||
        s.receiptRef !== result.receiptRef || s.nbaGameId !== f.nbaGameId || s.espnGameId !== f.espnGameId ||
        result.espnGameId !== f.espnGameId || ![s.outcome,s.baselineOutcome].every(function (o) { return ['HIT','MISS','ABSTAIN'].includes(o); })) return null;
    return { outcome:s.outcome, baselineOutcome:s.baselineOutcome };
  }
  function editionGame(edition, schedule, result, now) {
    var entry = edition && edition.games && edition.games[schedule.game.gameId];
    if (!entry || !entry.pins || !pinned(schedule, entry.pins.schedule)) return null;
    var article = validArticle(entry.article, schedule, entry.pins.article, now) ? entry.article : null;
    var initial = validForecast(entry.INITIAL, 'INITIAL', entry, schedule, now, null) ? entry.INITIAL : null;
    var final = initial && validForecast(entry.FINAL, 'FINAL', entry, schedule, now, digest(initial)) ? entry.FINAL : null;
    if (!article && !initial) return null;
    var stages = [initial,final].filter(Boolean).map(function (f) {
      return { stage:f.stage, lockedAt:f.lockedAt, cutoff:f.dataCutoff, pick:f.pick, reason:f.reason,
        late:f.stage === 'FINAL' && C.parseInstant(f.lockedAt) > C.parseInstant(f.dataCutoff),
        baseline:f.baselinePick, homeRecord:f.homeRecord, awayRecord:f.awayRecord,
        evaluation:scoreFor(entry['score'+f.stage], f, entry, result) };
    });
    return { article:article, stages:stages, espnGameId:initial ? initial.espnGameId : null, finalWindowAt:new Date(C.parseInstant(schedule.game.tipoff)-900000).toISOString(),
      finalStatus:final ? (C.parseInstant(final.lockedAt) === C.parseInstant(final.dataCutoff) ? 'ON_TIME' : 'LATE_RECORDED') : C.parseInstant(now) >= C.parseInstant(schedule.game.tipoff) ? 'NOT_RECORDED' : C.parseInstant(now) >= C.parseInstant(schedule.game.tipoff)-900000 ? 'OPEN' : 'PENDING' };
  }
  var api={ editionGame:editionGame, digest:digest };
  if (node) module.exports=api; else root.MOSPORT_PREGAME_EDITION=api;
})(typeof window !== 'undefined' ? window : globalThis);
