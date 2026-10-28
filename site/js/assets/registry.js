/*
 * Asset Registry resolver (pure functions; browser + Node).
 *
 * The registry (site/data/asset-registry.json) is data, editable by people, an AI
 * agent or a future CMS. Components ask for a slot id; this module decides which
 * version may render, with which crop, or that the slot falls back. No component
 * hard-codes a path or a switching rule.
 *
 * A version renders only if ALL hold:
 *   - it is the slot's activeVersion
 *   - its status and rights status are allowed by renderPolicy[mode]
 *   - its format is allowed for the slot
 *   - for artwork: containsPerson, containsLogo and containsText are all false
 * Otherwise the slot renders its fallback, and the reason is reported.
 */
(function (root) {
  var ART_KEYS = ['label', 'placement', 'deliver', 'fit', 'fallback', 'activeVersion', 'versions'];
  var RIGHTS = ['OWNED', 'LICENSED', 'EMBED_PERMITTED', 'UNVERIFIED', 'BLOCKED'];
  var STATUS = ['ACTIVE', 'PLACEHOLDER', 'CANDIDATE', 'RETIRED'];

  function validate(reg) {
    var errs = [];
    var e = function (m) { errs.push(m); };
    if (!reg || reg.schemaVersion !== 1) e('schemaVersion must be 1');
    if (!reg.renderPolicy || !reg.renderPolicy.prototype || !reg.renderPolicy.production) e('renderPolicy.prototype and .production required');
    var checkVersion = function (where, v, slot, isArt) {
      ['id', 'status', 'file', 'format', 'width', 'height', 'sha256', 'rights', 'provenance', 'content'].forEach(function (k) { if (v[k] === undefined) e(where + ': missing ' + k); });
      if (STATUS.indexOf(v.status) === -1) e(where + ': bad status ' + v.status);
      if (!v.rights || RIGHTS.indexOf(v.rights.status) === -1) e(where + ': bad rights.status');
      if (slot.deliver && slot.deliver.formats && slot.deliver.formats.indexOf(v.format) === -1) e(where + ': format ' + v.format + ' not allowed');
      if (v.sha256 && !/^[0-9a-f]{64}$/.test(v.sha256)) e(where + ': sha256 must be 64 hex chars');
      if (isArt && v.content && (v.content.containsPerson || v.content.containsLogo || v.content.containsText)) e(where + ': artwork must not contain a person, a logo or text');
      if (v.content && v.content.kinds && v.content.kinds.indexOf('athlete') !== -1) e(where + ': kind athlete is not allowed');
    };
    var checkSlot = function (id, s, isArt) {
      ART_KEYS.forEach(function (k) { if (s[k] === undefined) e(id + ': missing ' + k); });
      if (!s.fallback || !s.fallback.kind) e(id + ': fallback.kind required');
      var ids = (s.versions || []).map(function (v) { return v.id; });
      if (s.activeVersion !== null && ids.indexOf(s.activeVersion) === -1) e(id + ': activeVersion ' + s.activeVersion + ' not in versions');
      (s.versions || []).forEach(function (v, i) { checkVersion(id + '.versions[' + i + ']', v, s, isArt); });
    };
    Object.keys((reg && reg.slots) || {}).forEach(function (id) { checkSlot(id, reg.slots[id], true); });
    Object.keys((reg && reg.logos) || {}).forEach(function (id) { checkSlot(id, reg.logos[id], false); });
    var tl = (reg && reg.teamLogos) || {};
    Object.keys(tl.entries || {}).forEach(function (code) {
      var s = Object.assign({ deliver: tl.deliver, fit: tl.fit, fallback: tl.fallback, label: code, placement: 'team logo' }, tl.entries[code]);
      checkSlot('teamLogos.' + code, s, false);
    });
    return errs;
  }

  /* opts: { variant: 'desktop'|'mobile', theme: 'light'|'dark', mode: 'prototype'|'production', preview: bool }
   * preview (prototype only): show the newest CANDIDATE version of each slot, for Founder review
   * before a candidate is promoted to activeVersion. Production ignores preview. */
  function pick(reg, s, opts, isArt) {
    opts = opts || {};
    var preview = !!opts.preview && opts.mode !== 'production' && reg.renderPolicy && reg.renderPolicy.preview;
    var policy = (reg.renderPolicy || {})[preview ? 'preview' : (opts.mode || 'prototype')] || { allowRights: [], allowStatus: [] };
    var base = { fit: s.fit, fallback: s.fallback, slotLabel: s.label };
    var v = null;
    var activeId = s.activeVersion;
    if (preview) (s.versions || []).forEach(function (x) { if (x.status === 'CANDIDATE' && (!opts.previewVersion || x.id === opts.previewVersion)) activeId = x.id; });
    (s.versions || []).forEach(function (x) { if (x.id === activeId) v = x; });
    var no = function (reason) { return Object.assign(base, { state: 'fallback', reason: reason, version: v ? v.id : null }); };
    if (!activeId) return no('NO_ACTIVE_VERSION');
    if (!v) return no('ACTIVE_VERSION_MISSING');
    if (policy.allowStatus.indexOf(v.status) === -1) return no('STATUS_' + v.status + '_NOT_ALLOWED');
    if (!v.rights || policy.allowRights.indexOf(v.rights.status) === -1) return no('RIGHTS_' + (v.rights && v.rights.status) + '_NOT_ALLOWED');
    if (s.deliver && s.deliver.formats && s.deliver.formats.indexOf(v.format) === -1) return no('FORMAT_NOT_ALLOWED');
    if (v.content && v.content.kinds && v.content.kinds.indexOf('athlete') !== -1) return no('ATHLETE_NOT_ALLOWED');
    if (isArt && v.content && (v.content.containsPerson || v.content.containsLogo || v.content.containsText)) return no('ART_CONTENT_NOT_ALLOWED');
    var crop = (v.crops || {})[opts.variant || 'desktop'] || {};
    var focal = crop.focal || s.defaultFocal || { x: 0.5, y: 0.5 };
    return Object.assign(base, {
      state: 'art', version: v.id, status: v.status, rights: v.rights.status,
      src: opts.theme === 'dark' && v.darkFile ? v.darkFile : v.file,
      objectPosition: Math.round(focal.x * 100) + '% ' + Math.round(focal.y * 100) + '%'
    });
  }

  function resolveArt(reg, slotId, opts) {
    var s = reg && reg.slots && reg.slots[slotId];
    if (!s) return { state: 'fallback', reason: 'UNKNOWN_SLOT', fallback: { kind: 'none' } };
    return pick(reg, s, opts, true);
  }
  function resolveLogo(reg, id, opts) {
    var s = reg && reg.logos && reg.logos[id];
    if (!s) return { state: 'fallback', reason: 'UNKNOWN_SLOT', fallback: { kind: 'text' } };
    return pick(reg, s, opts, false);
  }
  function resolveTeamLogo(reg, code, opts) {
    var tl = (reg && reg.teamLogos) || {};
    var entry = (tl.entries || {})[code];
    if (!entry) return { state: 'fallback', reason: 'NO_ENTRY', fallback: tl.fallback || { kind: 'tricode-badge' }, fit: tl.fit };
    return pick(reg, Object.assign({ deliver: tl.deliver, fit: tl.fit, fallback: tl.fallback }, entry), opts, false);
  }
  /* CSS background for a fallback, by theme. */
  function fallbackCss(fb, theme) {
    if (!fb || fb.kind !== 'gradient') return '';
    return theme === 'dark' && fb.dark ? fb.dark : fb.light;
  }

  var api = { validate: validate, resolveArt: resolveArt, resolveLogo: resolveLogo, resolveTeamLogo: resolveTeamLogo, fallbackCss: fallbackCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOSPORT_REGISTRY = api;
})(typeof window !== 'undefined' ? window : globalThis);
