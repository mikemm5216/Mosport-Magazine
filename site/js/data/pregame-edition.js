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
  function hash64(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
  function validPolicy(policy, entry, initial, now) {
    if (!initial || !pinned(policy,entry.pins.finalPolicy) || !exactKeys(policy,'schema nbaGameId espnGameId tipoffAt initialDigest optedInAt')) return false;
    return policy.schema === 'mosport-a/research-final-policy@2' && policy.nbaGameId === initial.nbaGameId &&
      policy.espnGameId === initial.espnGameId && C.parseInstant(policy.tipoffAt) === C.parseInstant(initial.tipoffAt) &&
      policy.initialDigest === digest(initial) && beforeOrAt(initial.lockedAt,policy.optedInAt) && beforeOrAt(policy.optedInAt,now) &&
      C.parseInstant(policy.optedInAt) < C.parseInstant(initial.tipoffAt) - 1200000;
  }
  function validWitness(w, entry, policy, now) {
    if (!policy || !pinned(w,entry.pins.finalWitness) ||
        !exactKeys(w,'schema nbaGameId espnGameId tipoffAt initialDigest policyDigest sealedDigest witnessedAt')) return false;
    var tip = C.parseInstant(policy.tipoffAt), seen = C.parseInstant(w.witnessedAt);
    return w.schema === 'mosport-a/research-final-witness@2' && w.nbaGameId === policy.nbaGameId &&
      w.espnGameId === policy.espnGameId && C.parseInstant(w.tipoffAt) === tip && w.initialDigest === policy.initialDigest &&
      w.policyDigest === digest(policy) && hash64(w.sealedDigest) && seen >= tip - 1200000 && seen < tip - 900000 && beforeOrAt(w.witnessedAt, now);
  }
  function validSeal(f, w) {
    var seal = f.seal, cutoff = C.parseInstant(f.dataCutoff), lock = C.parseInstant(f.lockedAt);
    if (!w || f.policyDigest !== w.policyDigest || f.sealedDigest !== w.sealedDigest || f.witnessedAt !== w.witnessedAt ||
        !Number.isSafeInteger(f.recordingDelayMs) || f.recordingDelayMs !== lock - cutoff ||
        !exactKeys(seal,'preparedAt snapshotFingerprint snapshotCapturedAt sources') || !hash64(seal.snapshotFingerprint) ||
        !beforeOrAt(seal.snapshotCapturedAt,seal.preparedAt) || !beforeOrAt(seal.preparedAt,w.witnessedAt) ||
        !exactKeys(seal.sources,'nba espn')) return false;
    var validSources = [seal.sources.nba,seal.sources.espn].every(function (source) {
      if (!exactKeys(source,'observedAt sha256') || !hash64(source.sha256)) return false;
      var at = C.parseInstant(source.observedAt);
      return at >= cutoff - 300000 && at < cutoff && beforeOrAt(source.observedAt,seal.preparedAt);
    });
    if (!validSources) return false;
    var sealed = Object.assign({},f);
    ['lockedAt','witnessedAt','recordingDelayMs','sealedDigest'].forEach(function (key) { delete sealed[key]; });
    return digest(sealed) === w.sealedDigest;
  }
  function validForecast(f, stage, entry, schedule, now, initialDigest, optedIn, witness) {
    var v2 = stage === 'FINAL' && optedIn;
    var keys = 'schema nbaGameId espnGameId away home tipoffAt stage lockedAt dataCutoff personaId personaVersion feature awayRecord homeRecord pick reason baselinePick priorDigest';
    if (!pinned(f, entry.pins[stage]) || !exactKeys(f, keys + (v2 ? ' policyDigest seal sealedDigest witnessedAt recordingDelayMs' : ''))) return false;
    var game = schedule.game, tip = C.parseInstant(game.tipoff), lock = C.parseInstant(f.lockedAt);
    if (f.schema !== (v2 ? 'mosport-a/research-pick@2' : 'mosport-a/research-pick@1') || f.stage !== stage || f.nbaGameId !== game.gameId ||
        f.espnGameId !== entry.espnGameId || f.away !== game.away || f.home !== game.home ||
        C.parseInstant(f.tipoffAt) !== tip || !beforeOrAt(f.dataCutoff, f.lockedAt) || !beforeOrAt(f.lockedAt, now) ||
        f.personaId !== 'season-record' || f.personaVersion !== '1' || f.feature !== 'SEASON_WIN_RATIO') return false;
    if (stage === 'INITIAL' ? (lock >= tip - 900000 || f.priorDigest !== null) :
      (lock < tip - 900000 || lock >= tip || C.parseInstant(f.dataCutoff) !== tip - 900000 || !initialDigest || f.priorDigest !== initialDigest)) return false;
    if (v2 && !validSeal(f,witness)) return false;
    function record(r) { return r === null || (exactKeys(r, 'wins losses') && [r.wins,r.losses].every(function (n) { return Number.isSafeInteger(n) && n >= 0; })); }
    return record(f.homeRecord) && record(f.awayRecord) && ['HOME',null].includes(f.baselinePick) &&
      ((f.reason === 'HIGHER_WIN_RATIO' && ['HOME','AWAY'].includes(f.pick) && f.homeRecord && f.awayRecord) ||
       (['TIED','RECORD_MISSING'].includes(f.reason) && f.pick === null));
  }
  function scoreFor(s, f, entry, result) {
    if ((f.stage === 'FINAL' && f.schema === 'mosport-a/research-pick@1' && C.parseInstant(f.lockedAt) !== C.parseInstant(f.dataCutoff)) ||
        !result || !s || !pinned(s, entry.pins['score' + f.stage]) ||
        !exactKeys(s, 'schema nbaGameId espnGameId stage forecastDigest receiptRef outcome baselineOutcome') ||
        s.schema !== 'mosport-a/research-score@1' || s.stage !== f.stage || s.forecastDigest !== digest(f) ||
        s.receiptRef !== result.receiptRef || s.nbaGameId !== f.nbaGameId || s.espnGameId !== f.espnGameId ||
        result.espnGameId !== f.espnGameId || ![s.outcome,s.baselineOutcome].every(function (o) { return ['HIT','MISS','ABSTAIN'].includes(o); })) return null;
    return { outcome:s.outcome, baselineOutcome:s.baselineOutcome };
  }
  var explorationIds = ['turnovers', 'second-chance'];
  function deskRows(rows, keys, accept) {
    return Array.isArray(rows) && rows.length === explorationIds.length && rows.every(function (row, i) {
      return exactKeys(row, keys) && row.id === explorationIds[i] && accept(row);
    });
  }
  function validExploration(e, entry, schedule, initial, now) {
    if (!initial || !pinned(e, entry.pins.exploration) ||
        !exactKeys(e, 'schema nbaGameId espnGameId tipoffAt away home filedAt initialDigest source desks')) return false;
    var game = schedule.game;
    if (e.schema !== 'mosport-a/exploration@1' || e.nbaGameId !== game.gameId || e.espnGameId !== initial.espnGameId ||
        e.initialDigest !== digest(initial) || e.away !== game.away || e.home !== game.home ||
        C.parseInstant(e.tipoffAt) !== C.parseInstant(game.tipoff) || !(C.parseInstant(e.filedAt) > C.parseInstant(initial.lockedAt)) ||
        !(C.parseInstant(e.filedAt) < C.parseInstant(game.tipoff)) || !beforeOrAt(e.filedAt, now)) return false;
    if (!exactKeys(e.source, 'url observedAt sha256') || e.source.url !== schedule.source.originalUrl ||
        typeof e.source.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(e.source.sha256) || !beforeOrAt(e.source.observedAt,e.filedAt)) return false;
    return deskRows(e.desks, 'id version awayValue homeValue pick', function (desk) {
      return desk.version === '1' && [desk.awayValue,desk.homeValue].every(function (n) { return n === null || (Number.isFinite(n) && n >= 0); }) &&
        ['AWAY','HOME',null].includes(desk.pick) && (desk.pick === null || (desk.awayValue !== null && desk.homeValue !== null && desk.awayValue !== desk.homeValue));
    });
  }
  function validDeskCopy(copy, entry, game, now) {
    if (!pinned(copy, entry.pins.deskCopy) || !exactKeys(copy, 'nbaGameId preparedAt columns') || copy.nbaGameId !== game.gameId ||
        !beforeOrAt(copy.preparedAt, now) || !(C.parseInstant(copy.preparedAt) < C.parseInstant(game.tipoff)) ||
        !exactKeys(copy.columns, 'season-record turnovers second-chance')) return false;
    return Object.values(copy.columns).every(function (column) {
      return exactKeys(column, 'zh en') && [column.zh,column.en].every(function (lang) {
        return exactKeys(lang, 'title body watch limit') && Object.values(lang).every(function (text) { return typeof text === 'string' && text.trim().length > 0; });
      });
    });
  }
  function explorationScore(entry, result, e) {
    var score = entry.explorationScore;
    if (!result || !pinned(score,entry.pins.explorationScore) || !exactKeys(score, 'schema nbaGameId espnGameId initialDigest explorationDigest receiptRef baselineOutcome desks')) return null;
    function outcome(value) { return ['HIT','MISS','ABSTAIN'].includes(value); }
    if (score.schema !== 'mosport-a/exploration-score@1' || score.nbaGameId !== e.nbaGameId || score.espnGameId !== e.espnGameId ||
        result.nbaGameId !== e.nbaGameId || result.espnGameId !== e.espnGameId || result.receiptRef !== score.receiptRef ||
        score.initialDigest !== e.initialDigest || score.explorationDigest !== digest(e) || !outcome(score.baselineOutcome) ||
        !deskRows(score.desks, 'id outcome', function (row) { return outcome(row.outcome); })) return null;
    return score;
  }
  function editionGame(edition, schedule, result, now) {
    var entry = edition && edition.games && edition.games[schedule.game.gameId];
    if (!entry || !entry.pins || !pinned(schedule, entry.pins.schedule)) return null;
    var article = validArticle(entry.article, schedule, entry.pins.article, now) ? entry.article : null;
    var initial = validForecast(entry.INITIAL, 'INITIAL', entry, schedule, now, null) ? entry.INITIAL : null;
    var optedIn = Object.hasOwn(entry.pins,'finalPolicy') || Object.hasOwn(entry.pins,'finalWitness') ||
      Object.hasOwn(entry,'finalPolicy') || Object.hasOwn(entry,'finalWitness');
    var policy = validPolicy(entry.finalPolicy,entry,initial,now) ? entry.finalPolicy : null;
    var witness = validWitness(entry.finalWitness,entry,policy,now) ? entry.finalWitness : null;
    var final = initial && validForecast(entry.FINAL, 'FINAL', entry, schedule, now, digest(initial), optedIn, witness) ? entry.FINAL : null;
    if (!article && !initial) return null;
    var stages = [initial,final].filter(Boolean).map(function (f) {
      return { stage:f.stage, lockedAt:f.lockedAt, cutoff:f.dataCutoff, pick:f.pick, reason:f.reason,
        seal:f.schema === 'mosport-a/research-pick@2' ? {preparedAt:f.seal.preparedAt,witnessedAt:f.witnessedAt,recordingDelayMs:f.recordingDelayMs} : null,
        late:f.stage === 'FINAL' && f.schema === 'mosport-a/research-pick@1' && C.parseInstant(f.lockedAt) > C.parseInstant(f.dataCutoff),
        baseline:f.baselinePick, homeRecord:f.homeRecord, awayRecord:f.awayRecord,
        evaluation:scoreFor(entry['score'+f.stage], f, entry, result) };
    });
    var desks = null;
    if (validExploration(entry.exploration, entry, schedule, initial, now) && validDeskCopy(entry.deskCopy, entry, schedule.game, now) &&
        beforeOrAt(entry.exploration.source.observedAt,entry.deskCopy.preparedAt) && beforeOrAt(initial.lockedAt,entry.deskCopy.preparedAt)) {
      desks = {copy:entry.deskCopy, exploration:entry.exploration, score:explorationScore(entry,result,entry.exploration)};
    }
    return { article:article, desks:desks, stages:stages, optedInAt:policy && policy.optedInAt, witnessedAt:witness && witness.witnessedAt, espnGameId:initial ? initial.espnGameId : null, finalWindowAt:new Date(C.parseInstant(schedule.game.tipoff)-900000).toISOString(),
      finalStatus:final && final.schema === 'mosport-a/research-pick@2' ? 'SEALED_FINAL' : final ? (C.parseInstant(final.lockedAt) === C.parseInstant(final.dataCutoff) ? 'ON_TIME' : 'LATE_RECORDED') : C.parseInstant(now) >= C.parseInstant(schedule.game.tipoff) ? 'NOT_RECORDED' : C.parseInstant(now) >= C.parseInstant(schedule.game.tipoff)-900000 ? 'OPEN' : 'PENDING' };
  }
  var api={ editionGame:editionGame, digest:digest };
  if (node) module.exports=api; else root.MOSPORT_PREGAME_EDITION=api;
})(typeof window !== 'undefined' ? window : globalThis);
