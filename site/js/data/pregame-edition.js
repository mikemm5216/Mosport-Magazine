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
  /* Owner-only postgame review, a separate article from the pregame column. It renders only
     beside the reader's own B-pinned, A-verified result (the pipeline passes no other), for
     the same game, after both confirmations, once filed, and tied by digest to the pinned
     pregame article it reviews. Any miss hides this review alone; nothing else changes. */
  function validReview(r, entry, schedule, result, now) {
    var fields = ['nbaGameId','espnGameId','receiptRef','resultDigest','pregameDigest','boxSha256','preparedAt'];
    /* Tied to the pregame article by its pin alone: the review stands even if that body is
       absent or fails its own checks; the preview link appears only when the article does. */
    if (!result || !r || !hash64(entry.pins.article) || !pinned(r, entry.pins.postgameReview) || !exactKeys(r, fields.concat(['zh','en']).join(' ')) ||
        !fields.every(function (k) { return typeof r[k] === 'string'; })) return false;
    var seen = result.confirmations || {};
    if (r.nbaGameId !== schedule.game.gameId || r.nbaGameId !== result.nbaGameId || r.espnGameId !== result.espnGameId ||
        r.receiptRef !== result.receiptRef || r.resultDigest !== digest(result) || r.pregameDigest !== entry.pins.article ||
        !hash64(r.boxSha256) || !seen.nba || !seen.espn || !beforeOrAt(seen.nba.observedAt, r.preparedAt) ||
        !beforeOrAt(seen.espn.observedAt, r.preparedAt) || !beforeOrAt(r.preparedAt, now)) return false;
    return [r.zh, r.en].every(function (copy) {
      return exactKeys(copy, 'title dek body') && Object.values(copy).every(function (text) { return typeof text === 'string' && text.trim().length > 0; });
    });
  }
  /* Owner-only film guide under a valid postgame review: at most three game-clock moments,
     each optionally linking out to this game's own NBA.com watch/video page. Nothing is
     embedded or fetched; a link is shown only in its exact canonical form. Any miss hides
     the guide alone; both articles stay. */
  function clockSeconds(text) {
    var m = /^(\d{1,2}):([0-5]\d)(?:\.(\d))?$/.exec(text);
    return m ? Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(m[3]) / 10 : 0) : NaN;
  }
  function validClock(text, max) {
    var parts = typeof text === 'string' ? text.split('–') : [];
    if (parts.length !== 2) return false;
    var from = clockSeconds(parts[0]), to = clockSeconds(parts[1]);
    return Number.isFinite(from) && Number.isFinite(to) && from <= max && to < from;
  }
  function validVideo(video, nbaGameId) {
    if (video === null) return true;
    if (!exactKeys(video, 'url zh en duration') || ![video.zh, video.en].every(function (t) { return typeof t === 'string' && t.trim().length > 0; }) ||
        typeof video.duration !== 'string' || !/^\d{1,2}:[0-5]\d$/.test(video.duration) || typeof video.url !== 'string') return false;
    try {
      var u = new URL(video.url), keys = [];
      u.searchParams.forEach(function (value, key) { keys.push(key); });
      return u.href === video.url && u.protocol === 'https:' && u.hostname === 'www.nba.com' && !u.username && !u.password && !u.port && !u.hash &&
        /^\/watch\/video\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(u.pathname) &&
        /* Exactly one game-highlights equal to this game; NBA.com's own plsrc=nba is the only other parameter allowed. */
        u.searchParams.getAll('game-highlights').length === 1 && u.searchParams.get('game-highlights') === nbaGameId &&
        keys.every(function (key) { return key === 'game-highlights' || key === 'plsrc'; }) &&
        u.searchParams.getAll('plsrc').every(function (value) { return value === 'nba'; }) && u.searchParams.getAll('plsrc').length <= 1;
    } catch (e) { return false; }
  }
  function validFilm(f, entry, review, now) {
    if (!review || !f || !pinned(f, entry.pins.filmGuide) || !exactKeys(f, 'nbaGameId espnGameId reviewDigest boxSha256 preparedAt moments')) return false;
    if (f.nbaGameId !== review.nbaGameId || f.espnGameId !== review.espnGameId || f.reviewDigest !== digest(review) || f.boxSha256 !== review.boxSha256 ||
        typeof f.preparedAt !== 'string' || !beforeOrAt(review.preparedAt, f.preparedAt) || !beforeOrAt(f.preparedAt, now) ||
        !Array.isArray(f.moments) || f.moments.length < 1 || f.moments.length > 3) return false;
    return f.moments.every(function (m) {
      return exactKeys(m, 'period clock zh en video') && Number.isSafeInteger(m.period) && m.period >= 1 && validClock(m.clock, m.period <= 4 ? 720 : 300) &&
        [m.zh, m.en].every(function (t) { return typeof t === 'string' && t.trim().length > 0; }) && validVideo(m.video, f.nbaGameId);
    });
  }
  /* Owner-only postgame review per research desk (M5, NBA #180): three separately pinned
     articles, each tied to the same verified final and to its own original vote, read
     from the verified INITIAL (season-record) or the verified exploration desk with the
     same ID. One missing or failing review hides only itself. */
  var deskReviewKeys = { 'season-record': 'deskReviewSeasonRecord', turnovers: 'deskReviewTurnovers', 'second-chance': 'deskReviewSecondChance' };
  function validDeskReview(deskId, entry, schedule, result, now, initial, exploration) {
    var key = deskReviewKeys[deskId], r = entry[key];
    var fields = ['deskId','nbaGameId','espnGameId','receiptRef','resultDigest','boxSha256','pregameColumnsDigest','originalVoteDigest','originalVoteKind','originalPick','preparedAt'];
    if (!result || !r || !pinned(r, entry.pins[key]) || !exactKeys(r, fields.concat(['zh','en']).join(' ')) ||
        !fields.every(function (k) { return typeof r[k] === 'string'; }) || r.deskId !== deskId) return false;
    var seen = result.confirmations || {};
    if (r.nbaGameId !== schedule.game.gameId || r.nbaGameId !== result.nbaGameId || r.espnGameId !== result.espnGameId ||
        r.receiptRef !== result.receiptRef || r.resultDigest !== digest(result) || !hash64(r.boxSha256) ||
        !hash64(entry.pins.deskCopy) || r.pregameColumnsDigest !== entry.pins.deskCopy ||
        !seen.nba || !seen.espn || !beforeOrAt(seen.nba.observedAt, r.preparedAt) || !beforeOrAt(seen.espn.observedAt, r.preparedAt) ||
        !beforeOrAt(r.preparedAt, now) || ['HOME','AWAY'].indexOf(r.originalPick) < 0) return false;
    var vote = null;
    if (deskId === 'season-record') {
      if (r.originalVoteKind !== 'INITIAL' || !initial) return false;
      vote = { digest: digest(initial), pick: initial.pick };
    } else {
      if (r.originalVoteKind !== 'EXPLORATION' || !exploration) return false;
      var desk = exploration.desks.filter(function (d) { return d.id === deskId; })[0];
      vote = desk ? { digest: digest(exploration), pick: desk.pick } : null;
    }
    if (!vote || r.originalVoteDigest !== vote.digest || r.originalPick !== vote.pick) return false;
    return [r.zh, r.en].every(function (copy) {
      return exactKeys(copy, 'title dek body') && Object.values(copy).every(function (text) { return typeof text === 'string' && text.trim().length > 0; });
    });
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
    var review = validReview(entry.postgameReview, entry, schedule, result, now) ? entry.postgameReview : null;
    if (!article && !initial && !review) return null;
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
    var film = validFilm(entry.filmGuide, entry, review, now) ? entry.filmGuide : null;
    var exploration = validExploration(entry.exploration, entry, schedule, initial, now) ? entry.exploration : null;
    var deskReviews = {};
    Object.keys(deskReviewKeys).forEach(function (deskId) {
      deskReviews[deskId] = validDeskReview(deskId, entry, schedule, result, now, initial, exploration) ? entry[deskReviewKeys[deskId]] : null;
    });
    return { article:article, postgameReview:review, filmGuide:film, deskReviews:deskReviews, desks:desks, stages:stages, optedInAt:policy && policy.optedInAt, witnessedAt:witness && witness.witnessedAt, espnGameId:initial ? initial.espnGameId : null, finalWindowAt:new Date(C.parseInstant(schedule.game.tipoff)-900000).toISOString(),
      finalStatus:final && final.schema === 'mosport-a/research-pick@2' ? 'SEALED_FINAL' : final ? (C.parseInstant(final.lockedAt) === C.parseInstant(final.dataCutoff) ? 'ON_TIME' : 'LATE_RECORDED') : C.parseInstant(now) >= C.parseInstant(schedule.game.tipoff) ? 'NOT_RECORDED' : C.parseInstant(now) >= C.parseInstant(schedule.game.tipoff)-900000 ? 'OPEN' : 'PENDING' };
  }
  var api={ editionGame:editionGame, digest:digest };
  if (node) module.exports=api; else root.MOSPORT_PREGAME_EDITION=api;
})(typeof window !== 'undefined' ? window : globalThis);
