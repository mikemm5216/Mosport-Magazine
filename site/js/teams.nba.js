/*
 * NBA team identity map — 30 franchises.
 *
 * Key = Mosport canonical team code (official NBA tricode). Resolve logos and
 * names by this code, never by display name.
 *
 * Fields
 *   code        canonical tricode used everywhere in the UI and the asset manifest
 *   aliases     other codes seen in sources (e.g. the legacy Terminal file uses "wsh")
 *   city / name zh-Hant and en display strings
 *   colors      [primary, secondary] — used only by the abbreviation fallback badge
 *   providerIds external ids. null = not yet verified (typed missing, do not guess)
 *   legacyRef   where a logo file exists in the read-only legacy repo, for the
 *               source inventory. Prototype marks are now registered separately with UNVERIFIED rights.
 */
(function () {
  var T = function (code, cityZh, nameZh, cityEn, nameEn, c1, c2, legacy, aliases) {
    return {
      code: code,
      league: 'NBA',
      aliases: aliases || [],
      city: { zh: cityZh, en: cityEn },
      name: { zh: nameZh, en: nameEn },
      colors: [c1, c2],
      providerIds: { nbaStats: null, espn: null },
      legacyRef: {
        repo: 'mikemm5216/Mosport-Terminal',
        path: 'frontend/public/logos/nba-' + (legacy || code.toLowerCase()) + '.png',
        note: 'reference only — 500×500 RGBA PNG; rights not verified'
      }
    };
  };

  var list = [
    T('ATL', '亞特蘭大', '老鷹', 'Atlanta', 'Hawks', '#E03A3E', '#C1D32F'),
    T('BOS', '波士頓', '塞爾提克', 'Boston', 'Celtics', '#007A33', '#BA9653'),
    T('BKN', '布魯克林', '籃網', 'Brooklyn', 'Nets', '#000000', '#FFFFFF'),
    T('CHA', '夏洛特', '黃蜂', 'Charlotte', 'Hornets', '#1D1160', '#00788C'),
    T('CHI', '芝加哥', '公牛', 'Chicago', 'Bulls', '#CE1141', '#000000'),
    T('CLE', '克里夫蘭', '騎士', 'Cleveland', 'Cavaliers', '#860038', '#FDBB30'),
    T('DAL', '達拉斯', '獨行俠', 'Dallas', 'Mavericks', '#00538C', '#B8C4CA'),
    T('DEN', '丹佛', '金塊', 'Denver', 'Nuggets', '#0E2240', '#FEC524'),
    T('DET', '底特律', '活塞', 'Detroit', 'Pistons', '#C8102E', '#1D42BA'),
    T('GSW', '金州', '勇士', 'Golden State', 'Warriors', '#1D428A', '#FFC72C'),
    T('HOU', '休士頓', '火箭', 'Houston', 'Rockets', '#CE1141', '#000000'),
    T('IND', '印第安納', '溜馬', 'Indiana', 'Pacers', '#002D62', '#FDBB30'),
    T('LAC', '洛杉磯', '快艇', 'LA', 'Clippers', '#C8102E', '#1D428A'),
    T('LAL', '洛杉磯', '湖人', 'Los Angeles', 'Lakers', '#552583', '#FDB927'),
    T('MEM', '曼菲斯', '灰熊', 'Memphis', 'Grizzlies', '#5D76A9', '#12173F'),
    T('MIA', '邁阿密', '熱火', 'Miami', 'Heat', '#98002E', '#F9A01B'),
    T('MIL', '密爾瓦基', '公鹿', 'Milwaukee', 'Bucks', '#00471B', '#EEE1C6'),
    T('MIN', '明尼蘇達', '灰狼', 'Minnesota', 'Timberwolves', '#0C2340', '#78BE20'),
    T('NOP', '紐奧良', '鵜鶘', 'New Orleans', 'Pelicans', '#0C2340', '#C8102E'),
    T('NYK', '紐約', '尼克', 'New York', 'Knicks', '#006BB6', '#F58426'),
    T('OKC', '奧克拉荷馬', '雷霆', 'Oklahoma City', 'Thunder', '#007AC1', '#EF3B24'),
    T('ORL', '奧蘭多', '魔術', 'Orlando', 'Magic', '#0077C0', '#C4CED4'),
    T('PHI', '費城', '76人', 'Philadelphia', '76ers', '#006BB6', '#ED174C'),
    T('PHX', '鳳凰城', '太陽', 'Phoenix', 'Suns', '#1D1160', '#E56020'),
    T('POR', '波特蘭', '拓荒者', 'Portland', 'Trail Blazers', '#E03A3E', '#000000'),
    T('SAC', '沙加緬度', '國王', 'Sacramento', 'Kings', '#5A2D81', '#63727A'),
    T('SAS', '聖安東尼奧', '馬刺', 'San Antonio', 'Spurs', '#000000', '#C4CED4'),
    T('TOR', '多倫多', '暴龍', 'Toronto', 'Raptors', '#CE1141', '#000000'),
    T('UTA', '猶他', '爵士', 'Utah', 'Jazz', '#002B5C', '#F9A01B'),
    T('WAS', '華盛頓', '巫師', 'Washington', 'Wizards', '#002B5C', '#E31837', 'wsh', ['WSH'])
  ];

  var byCode = {};
  list.forEach(function (t) {
    byCode[t.code] = t;
    t.aliases.forEach(function (a) { byCode[a] = t; });
  });

  window.MOSPORT_TEAMS = {
    list: list,
    /** Resolve a canonical code or a known alias. Returns null when unknown — never a guess. */
    get: function (code) { return code ? byCode[String(code).toUpperCase()] || null : null; }
  };
})();
