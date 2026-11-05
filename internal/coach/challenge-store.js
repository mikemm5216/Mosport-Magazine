'use strict';
// Internal Coach domain only. No HTTP route, public identity or World computation.
const { createHash } = require('node:crypto');
const SCHEMA = 'mosport-coach/challenge@1';
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(value);
const instant = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function requireThat(ok, reason) { if (!ok) throw new Error(reason); }
function exact(value, keys) { return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(','); }
function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

class ChallengeStore {
  constructor(filename, { authenticate, resolveGame, clock = () => new Date().toISOString() } = {}) {
    requireThat(typeof authenticate === 'function' && typeof resolveGame === 'function' && typeof clock === 'function', 'TRUSTED_ADAPTERS_REQUIRED');
    const { DatabaseSync } = require('node:sqlite'); // Optional internal runtime: Node >=22.12.
    this.db = new DatabaseSync(filename);
    this.authenticate = authenticate; this.resolveGame = resolveGame; this.clock = clock;
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA recursive_triggers=ON;
      CREATE TABLE IF NOT EXISTS coach_clock (singleton INTEGER PRIMARY KEY CHECK(singleton=1), value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS coach_games (game_id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS coach_records (
        request_id TEXT PRIMARY KEY, actor TEXT NOT NULL, game_id TEXT NOT NULL,
        target_id TEXT, kind TEXT NOT NULL, command_hash TEXT NOT NULL, body TEXT NOT NULL,
        UNIQUE(actor, game_id, kind, target_id));
      CREATE UNIQUE INDEX IF NOT EXISTS coach_one_stance ON coach_records(actor,game_id) WHERE kind='STANCE';
      CREATE TRIGGER IF NOT EXISTS coach_no_update BEFORE UPDATE ON coach_records BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RECORD'); END;
      CREATE TRIGGER IF NOT EXISTS coach_no_delete BEFORE DELETE ON coach_records BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RECORD'); END;
      CREATE TRIGGER IF NOT EXISTS coach_game_no_update BEFORE UPDATE ON coach_games BEGIN SELECT RAISE(ABORT,'IMMUTABLE_GAME'); END;
      CREATE TRIGGER IF NOT EXISTS coach_game_no_delete BEFORE DELETE ON coach_games BEGIN SELECT RAISE(ABORT,'IMMUTABLE_GAME'); END;`);
  }
  close() { this.db.close(); }
  submit(authContext, command) {
    requireThat(exact(command, ['requestId','gameId','kind','selection','targetId']), 'INVALID_COMMAND');
    requireThat(id(command.requestId) && /^espn:\d+$/.test(command.gameId) && typeof command.gameId === 'string', 'INVALID_IDENTIFIER');
    requireThat(['STANCE','CHALLENGE'].includes(command.kind) && ['HOME','AWAY'].includes(command.selection), 'INVALID_SELECTION');
    requireThat(command.kind === 'STANCE' ? command.targetId === null : id(command.targetId), 'INVALID_TARGET');
    const principal = this.authenticate(authContext);
    requireThat(exact(principal, ['subject','active']) && id(principal.subject) && principal.active === true, 'UNAUTHENTICATED');
    const actor = principal.subject;
    // Whitelist fields and fixed ordering; never persist authContext or credentials.
    const input = { requestId: command.requestId, gameId: command.gameId, kind: command.kind, selection: command.selection, targetId: command.targetId };
    const commandHash = hash({ actor, input });
    this.db.exec('BEGIN IMMEDIATE');
    let attemptStarted = false;
    try {
      const now = this.clock();
      requireThat(instant(now), 'INVALID_CLOCK');
      const last = this.db.prepare('SELECT value FROM coach_clock WHERE singleton=1').get();
      requireThat(!last || now >= last.value, 'CLOCK_ROLLBACK');
      this.db.prepare('INSERT INTO coach_clock VALUES (1,?) ON CONFLICT(singleton) DO UPDATE SET value=excluded.value').run(now);
      this.db.exec('SAVEPOINT attempt'); attemptStarted = true;
      const old = this.db.prepare('SELECT * FROM coach_records WHERE request_id=?').get(input.requestId);
      if (old) {
        requireThat(old.command_hash === commandHash, 'REQUEST_REPLAY_CONFLICT');
        this.db.prepare('INSERT INTO coach_clock VALUES (1,?) ON CONFLICT(singleton) DO UPDATE SET value=excluded.value').run(now);
        this.db.exec('COMMIT');
        return { status: 'EXISTING', record: JSON.parse(old.body) };
      }
      const game = this.resolveGame(input.gameId);
      requireThat(exact(game, ['gameId','homeId','awayId','tipoffAt','cutoffAt','revision','state']) && game.gameId === input.gameId && id(game.homeId) && id(game.awayId) && game.homeId !== game.awayId && /^[0-9a-f]{64}$/.test(game.revision) && typeof game.revision === 'string' && game.state === 'SCHEDULED' && instant(game.tipoffAt) && instant(game.cutoffAt) && game.cutoffAt < game.tipoffAt, 'UNQUALIFIED_GAME');
      requireThat(now < game.cutoffAt, 'PREGAME_CLOSED');
      const gameBody = JSON.stringify({ gameId: game.gameId, homeId: game.homeId, awayId: game.awayId, tipoffAt: game.tipoffAt, cutoffAt: game.cutoffAt, revision: game.revision, state: game.state });
      const pinned = this.db.prepare('SELECT body FROM coach_games WHERE game_id=?').get(input.gameId);
      requireThat(!pinned || pinned.body === gameBody, 'GAME_REVISION_CHANGED');
      let target = null;
      if (input.kind === 'CHALLENGE') {
        const row = this.db.prepare('SELECT body FROM coach_records WHERE request_id=?').get(input.targetId);
        requireThat(row, 'TARGET_NOT_FOUND'); target = JSON.parse(row.body);
        requireThat(target.kind === 'STANCE' && target.game.gameId === input.gameId && target.actor !== actor && target.selection !== input.selection, 'INVALID_CHALLENGE');
      }
      const prior = this.db.prepare('SELECT body FROM coach_records WHERE actor=? AND game_id=? LIMIT 1').get(actor, input.gameId);
      requireThat(!prior || JSON.parse(prior.body).selection === input.selection, 'LOCKED_POSITION_CONFLICT');
      const record = { schema: SCHEMA, recordId: input.requestId, kind: input.kind, actor, selection: input.selection, targetId: input.targetId, targetDigest: target ? target.digest : null, recordedAt: now, game: JSON.parse(gameBody), visibility: 'PRIVATE', result: 'NOT_SETTLED' };
      record.digest = hash(record);
      if (!pinned) this.db.prepare('INSERT INTO coach_games VALUES (?,?)').run(input.gameId, gameBody);
      this.db.prepare('INSERT INTO coach_records VALUES (?,?,?,?,?,?,?)').run(input.requestId, actor, input.gameId, input.targetId, input.kind, commandHash, JSON.stringify(record));
      this.db.prepare('INSERT INTO coach_clock VALUES (1,?) ON CONFLICT(singleton) DO UPDATE SET value=excluded.value').run(now);
      this.db.exec('COMMIT');
      return { status: 'CREATED', record };
    } catch (error) {
      // A failed attempt must not erase a later observed clock and reopen cutoff.
      if (attemptStarted) { this.db.exec('ROLLBACK TO attempt; RELEASE attempt; COMMIT'); }
      else { this.db.exec('ROLLBACK'); }
      throw error;
    }
  }
}
module.exports = { ChallengeStore, SCHEMA };
