'use strict';

const C = require('../site/js/contracts/contracts.js');
const keysAre = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const nbaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });

function compileSeason(catalog, editions, teams, now) {
  if (!keysAre(catalog, ['schema', 'sources', 'games', 'pending']) || catalog.schema !== 'mosport-b/nba-season-catalog@1' ||
      ![catalog.sources, catalog.games, catalog.pending].every(Array.isArray) || !catalog.games.length) {
    throw Error('NBA_SEASON_CATALOG_INVALID');
  }

  const existing = new Map(editions.map(edition => [edition.id, edition]));
  const seen = new Set();
  const seasonEditions = [];
  const files = new Map();

  function acceptId(id) {
    if (seen.has(id)) throw Error('NBA_SEASON_DUPLICATE: ' + id);
    seen.add(id);
  }

  function receipt(index) {
    const source = Number.isInteger(index) && catalog.sources[index];
    if (!keysAre(source, ['url', 'observedAt', 'sha256']) || !/^[0-9a-f]{64}$/.test(source.sha256) ||
        !Number.isFinite(C.parseInstant(source.observedAt)) || C.parseInstant(source.observedAt) > C.parseInstant(now)) {
      throw Error('NBA_SEASON_RECEIPT_INVALID: ' + index);
    }
    return source;
  }

  for (const row of catalog.games) {
    if (!Array.isArray(row) || row.length !== 5) throw Error('NBA_SEASON_GAME_INVALID');
    const [id, away, home, tipoff, sourceIndex] = row;
    if (typeof id !== 'string' || !/^00[26]26\d{5}$/.test(id) || !teams.has(away) || !teams.has(home)) {
      throw Error('NBA_SEASON_GAME_INVALID: ' + id);
    }
    acceptId(id);
    const observed = receipt(sourceIndex);
    const game = { gameId: id, away, home, status: 'SCHEDULED', tipoff };
    const source = {
      schema: C.SCHEMAS.source, id: 'NBA-SEASON-' + id, kind: 'OFFICIAL_FACT', originalUrl: observed.url,
      publisher: 'NBA', observedAt: observed.observedAt, rightsStatus: 'LINK_ONLY', accessMethod: 'OFFICIAL_PAGE',
      contentFingerprint: C.sha256(C.canonical({ game, originalUrl: observed.url, observedAt: observed.observedAt })),
      language: 'en', verificationState: 'CONFIRMED', demo: false
    };
    const entry = { schema: C.SCHEMAS.seasonSchedule, mode: 'LIVE', game, source };
    const problems = C.validateSchedule(entry, { now });
    if (problems.length) throw Error('NBA_SEASON_GAME_INVALID: ' + id + ' ' + problems[0].code);
    const published = existing.get(id);
    if (published) {
      if (published.away !== away || published.home !== home || Date.parse(published.tipoff) !== Date.parse(tipoff)) {
        throw Error('NBA_SEASON_RELEASE_CONFLICT: ' + id);
      }
      continue;
    }
    seasonEditions.push({ id, away, home, tipoff, availableAt: observed.observedAt });
    files.set('data/schedules/' + id + '.json', Buffer.from(JSON.stringify(entry) + '\n'));
  }

  const pending = catalog.pending.map(row => {
    if (!Array.isArray(row) || row.length !== 5) throw Error('NBA_SEASON_PENDING_INVALID');
    const [id, stage, leagueDay, tipoff, sourceIndex] = row;
    if (typeof id !== 'string' || !/^00[26]26\d{5}$/.test(id) || !['Semifinal', 'Championship'].includes(stage) ||
        !C.isDate(leagueDay) || (tipoff !== null && (!Number.isFinite(C.parseInstant(tipoff)) ||
          nbaDay.format(new Date(tipoff)) !== leagueDay)) || existing.has(id)) {
      throw Error('NBA_SEASON_PENDING_INVALID: ' + id);
    }
    acceptId(id);
    const source = receipt(sourceIndex);
    if (source.url !== 'https://www.nba.com/games?date=' + leagueDay) throw Error('NBA_SEASON_PENDING_SOURCE_INVALID: ' + id);
    return { id, stage, leagueDay, tipoff, url: source.url, availableAt: source.observedAt };
  });

  return { files, seasonEditions, pending };
}

module.exports = { compileSeason };
