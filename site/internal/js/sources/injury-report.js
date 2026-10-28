/*
 * B-P3-03 — offline parser for the NBA official injury report (text layer).
 *
 * Input: the text of one report as extracted with `pdftotext -layout` (the PDF is
 * published by the league at official.nba.com; see docs/sources/FREE_SOURCE_INVENTORY.md).
 * This module never fetches anything and never stores the league's file: tests use a
 * synthetic text fixture with fictional players.
 *
 * Output: { ok, report, rows, notSubmitted, errors }.
 *   - rows carry what the report states: game, team, player, status, reason
 *   - every uncertain line becomes a typed error; nothing is guessed or filled
 *   - ok is true only when there are no errors
 *
 * Status vocabulary seen in league reports: Out, Doubtful, Questionable, Probable,
 * Available, and the team-level placeholder NOT YET SUBMITTED.
 */
(function (root) {
  'use strict';
  var STATUSES = ['Out', 'Doubtful', 'Questionable', 'Probable', 'Available'];
  var NOT_SUBMITTED = 'NOT YET SUBMITTED';
  var COLUMNS = ['Game Date', 'Game Time', 'Matchup', 'Team', 'Player Name', 'Current Status', 'Reason'];
  var KEYS = ['date', 'time', 'matchup', 'team', 'player', 'status', 'reason'];

  /* UTC offset (minutes) of America/New_York at a UTC instant, from the runtime's tz data. */
  function etOffsetMinutes(utcMs) {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(utcMs));
    var g = {}; parts.forEach(function (p) { g[p.type] = p.value; });
    var asUtc = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute);
    return Math.round((asUtc - utcMs) / 60000);
  }
  /** Eastern wall-clock time → UTC ISO string, DST-correct; null if the time does not exist. */
  function etToUtc(y, mo, d, h, mi) {
    var guess = Date.UTC(y, mo - 1, d, h, mi);
    for (var i = 0; i < 2; i++) guess = Date.UTC(y, mo - 1, d, h, mi) - etOffsetMinutes(guess) * 60000;
    var back = new Date(guess + etOffsetMinutes(guess) * 60000);
    if (back.getUTCHours() !== h || back.getUTCMinutes() !== mi || back.getUTCDate() !== d) return null;
    return new Date(guess).toISOString().replace('.000Z', 'Z');
  }
  function to24(h, ampm) { h = +h; if (h < 1 || h > 12) return NaN; return ampm === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12); }

  function tokens(line) {
    var out = [], re = /\S+(?: \S+)*/g, m;
    while ((m = re.exec(line))) out.push({ text: m[0], start: m.index });
    return out;
  }

  /**
   * text      : report text
   * teamCode  : function(fullTeamName) → tricode or null (never guessed here)
   */
  function parse(text, teamCode) {
    var res = { ok: false, report: null, rows: [], notSubmitted: [], errors: [] };
    var err = function (line, code, detail) { res.errors.push({ line: line, code: code, detail: String(detail || '').slice(0, 120) }); };
    if (typeof text !== 'string' || !text.trim()) { err(0, 'EMPTY_INPUT'); return res; }
    var lines = text.replace(/\r\n?/g, '\n').split('\n');

    var title = null, titleAt = -1;
    for (var t = 0; t < lines.length && !title; t++) {
      var tm = /Injury Report:\s*(\d{2})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/.exec(lines[t]);
      if (tm) { title = tm; titleAt = t; }
    }
    if (!title) { err(0, 'NO_REPORT_TITLE'); return res; }
    var publishedAt = etToUtc(2000 + +title[3], +title[1], +title[2], to24(title[4], title[6]), +title[5]);
    if (!publishedAt) { err(0, 'BAD_REPORT_TIME', title[0]); return res; }
    res.report = { stampET: title[0].replace(/^Injury Report:\s*/, ''), publishedAt: publishedAt };

    var cols = null;
    var cur = { date: null, time: null, matchup: null, team: null };
    var last = null;
    lines.forEach(function (raw, i) {
      var n = i + 1;
      if (i < titleAt) return; /* anything before the report title (e.g. a fixture banner) */
      if (!raw.trim() || /Injury Report:/.test(raw) || /^\s*Page \d+ of \d+\s*$/.test(raw)) return;
      if (COLUMNS.every(function (c) { return raw.indexOf(c) !== -1; })) {
        cols = COLUMNS.map(function (c) { return raw.indexOf(c); });
        return;
      }
      if (!cols) { err(n, 'NO_HEADER_BEFORE_ROW', raw.trim()); return; }
      var row = {};
      tokens(raw).forEach(function (tk) {
        var idx = 0;
        for (var c = 0; c < cols.length; c++) if (tk.start + 3 >= cols[c]) idx = c;
        row[KEYS[idx]] = row[KEYS[idx]] ? row[KEYS[idx]] + ' ' + tk.text : tk.text;
      });
      var only = Object.keys(row);
      /* A wrapped reason: only the reason column on this line. */
      if (only.length === 1 && only[0] === 'reason') {
        if (last && last.reason != null) { last.reason += ' ' + row.reason; return; }
        err(n, 'ORPHAN_REASON_LINE', row.reason); return;
      }
      if (row.date) {
        var dm = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(row.date);
        var dd = dm && new Date(Date.UTC(+dm[3], +dm[1] - 1, +dm[2]));
        if (!dm || dd.getUTCMonth() !== +dm[1] - 1 || dd.getUTCDate() !== +dm[2]) { err(n, 'BAD_GAME_DATE', row.date); return; }
        cur = { date: dm[3] + '-' + dm[1] + '-' + dm[2], time: null, matchup: null, team: null };
      }
      if (row.time) {
        var gt = /^(\d{2}):(\d{2})\s*\(ET\)$/.exec(row.time);
        if (!gt) { err(n, 'BAD_GAME_TIME', row.time); return; }
        cur.time = row.time; cur.team = null; cur.matchup = null;
      }
      if (row.matchup) {
        var mm = /^([A-Z]{2,4})@([A-Z]{2,4})$/.exec(row.matchup);
        if (!mm) { err(n, 'BAD_MATCHUP', row.matchup); return; }
        cur.matchup = { away: mm[1], home: mm[2] }; cur.team = null;
      }
      if (row.team) {
        var code = teamCode(row.team);
        if (!code) { err(n, 'UNKNOWN_TEAM', row.team); return; }
        if (cur.matchup && code !== cur.matchup.away && code !== cur.matchup.home) { err(n, 'TEAM_NOT_IN_MATCHUP', row.team); return; }
        cur.team = { name: row.team, code: code };
      }
      if (!cur.date || !cur.time || !cur.matchup || !cur.team) { err(n, 'MISSING_CONTEXT', raw.trim()); return; }
      var status = row.status || null;
      /* The report prints "07:30 (ET)" with no AM/PM, so no UTC tip-off is derived here:
         the game is identified by date + matchup, and tip-off comes from a schedule source. */
      var game = { date: cur.date, timeET: cur.time, tipoffUTC: null, tipoffMissingReason: 'AM_PM_NOT_STATED', away: cur.matchup.away, home: cur.matchup.home };
      if (status === NOT_SUBMITTED || (row.player === undefined && /NOT YET SUBMITTED/.test(raw))) {
        res.notSubmitted.push({ game: game, team: cur.team.code, line: n });
        last = null;
        return;
      }
      if (!row.player && !row.status) { last = null; return; } /* a team/game heading line */
      if (!row.player) { err(n, 'MISSING_PLAYER', raw.trim()); return; }
      if (STATUSES.indexOf(status) === -1) { err(n, 'UNKNOWN_STATUS', status); return; }
      if (!row.reason) { err(n, 'MISSING_REASON', row.player); return; }
      last = { game: game, team: cur.team.code, player: row.player, status: status, reason: row.reason, line: n };
      res.rows.push(last);
    });
    if (!cols) err(0, 'NO_HEADER');
    if (!res.rows.length && !res.notSubmitted.length && !res.errors.length) err(0, 'NO_ROWS');
    res.ok = res.errors.length === 0;
    return res;
  }

  /**
   * Team-name resolver from the B team registry (list of { code, city.en, name.en }).
   * Exact "City Name" or a unique nickname suffix ("LA Clippers" → Clippers); else null.
   */
  function teamResolver(list) {
    return function (full) {
      var exact = list.filter(function (t) { return t.city.en + ' ' + t.name.en === full; });
      if (exact.length === 1) return exact[0].code;
      var suf = list.filter(function (t) { return full.slice(-(t.name.en.length + 1)) === ' ' + t.name.en; });
      return suf.length === 1 ? suf[0].code : null;
    };
  }

  var api = { parse: parse, etToUtc: etToUtc, teamResolver: teamResolver, STATUSES: STATUSES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOSPORT_INJURY_REPORT = api;
})(typeof window !== 'undefined' ? window : globalThis);
