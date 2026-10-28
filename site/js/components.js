/*
 * Asset-slot components (light DOM, no build step). They hold no paths and no
 * switching rules: every decision comes from the Asset Registry via
 * MOSPORT_REGISTRY.resolve*(). Layout size is set by CSS, never by the image, so
 * a missing or replaced file cannot change the layout.
 *
 *   <mo-art slot-id="cover-desktop-art" slot-mobile="cover-mobile-art"></mo-art>
 *   <mo-team-logo code="LAL" size="xs|sm|md|lg|xl"></mo-team-logo>
 *   <mo-brand-logo tone="on-dark|on-light"></mo-brand-logo>
 *
 * Each element exposes data-slot, data-state (art|fallback), data-version and
 * data-reason. ?slots=1 outlines every slot with that information.
 */
(function () {
  var REG = function () { return window.MOSPORT_REG; };
  var R = function () { return window.MOSPORT_REGISTRY; };
  var cfg = function () { return window.MOSPORT_CONFIG || { mode: 'prototype' }; };
  var lang = function () { return document.documentElement.lang === 'en' ? 'en' : 'zh'; };
  var theme = function () { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; };
  var MOBILE = '(max-width: 1023px)';
  var variant = function () { return window.matchMedia(MOBILE).matches ? 'mobile' : 'desktop'; };
  var opts = function () { return { variant: variant(), theme: theme(), mode: cfg().mode, preview: !!cfg().previewCandidates, previewVersion: cfg().previewVersion || null }; };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function readableOn(hex) {
    var h = (hex || '#000000').replace('#', '');
    var c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.36 ? '#0B1220' : '#FFFFFF';
  }
  function tag(el, slot, res) {
    el.classList.add('mo-slot');
    el.dataset.slot = slot;
    el.dataset.state = res.state;
    el.dataset.version = res.version || '';
    el.dataset.reason = res.reason || '';
    el.dataset.slotLabel = slot + ' · ' + res.state + (res.version ? ' · ' + res.version : '') + (res.reason ? ' · ' + res.reason : '') + (res.src ? ' · ' + res.src : '');
  }

  /* ---------- artwork slot ---------- */
  class MoArt extends HTMLElement {
    connectedCallback() {
      this._mq = window.matchMedia(MOBILE);
      this._on = this.render.bind(this);
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._on);
      this.render();
    }
    disconnectedCallback() { if (this._mq && this._mq.removeEventListener) this._mq.removeEventListener('change', this._on); }
    render() {
      var o = opts();
      var slot = o.variant === 'mobile' && this.getAttribute('slot-mobile') ? this.getAttribute('slot-mobile') : this.getAttribute('slot-id');
      var res = R().resolveArt(REG(), slot, o);
      if (cfg().forceArtFallback && res.state === 'art') res = Object.assign({}, res, { state: 'fallback', reason: 'FORCED_FALLBACK' });
      tag(this, slot, res);
      this.style.background = R().fallbackCss(res.fallback, o.theme) || '';
      if (res.state === 'art') {
        this.innerHTML = '<img src="' + esc(res.src) + '" alt="" decoding="async" style="object-fit:' + esc(res.fit || 'cover') + ';object-position:' + esc(res.objectPosition) + '">';
        var self = this;
        this.querySelector('img').addEventListener('error', function () {
          self.innerHTML = ''; self.dataset.state = 'fallback'; self.dataset.reason = 'LOAD_ERROR';
        }, { once: true });
        if (/[?&]zones=1\b/.test(location.search)) this.drawZones(slot, res);
      } else this.innerHTML = '';
    }
    /* ?zones=1 : draw the slot's safe zones where they land after the cover crop (review aid). */
    drawZones(slot, res) {
      var s = REG().slots[slot], v = null;
      (s.versions || []).forEach(function (x) { if (x.id === res.version) v = x; });
      if (!v || !s.safeZones) return;
      var W = this.clientWidth, H = this.clientHeight;
      var k = Math.max(W / v.width, H / v.height), iw = v.width * k, ih = v.height * k;
      var pos = (res.objectPosition || '50% 50%').split(' ').map(function (p) { return parseFloat(p) / 100; });
      var ox = (W - iw) * pos[0], oy = (H - ih) * pos[1];
      var html = '';
      s.safeZones.forEach(function (z) {
        html += '<div class="mo-zone mo-zone-' + z.name + '" style="left:' + (ox + z.x * iw) + 'px;top:' + (oy + z.y * ih) + 'px;width:' + (z.w * iw) + 'px;height:' + (z.h * ih) + 'px"><span>' + z.name + '</span></div>';
      });
      this.insertAdjacentHTML('beforeend', html);
    }
  }

  /* ---------- team logo ---------- */
  var SIZES = { xs: 22, sm: 36, md: 52, lg: 84, xl: 120 };
  class MoTeamLogo extends HTMLElement {
    static get observedAttributes() { return ['code', 'size']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var code = (this.getAttribute('code') || '').toUpperCase();
      var team = window.MOSPORT_TEAMS && window.MOSPORT_TEAMS.get(code);
      var canon = team ? team.code : code;
      this.style.setProperty('--logo-default', (SIZES[this.getAttribute('size') || 'md'] || 52) + 'px');
      var res = R().resolveTeamLogo(REG(), canon, opts());
      tag(this, 'team-logo:' + canon, res);
      var name = team ? (lang() === 'zh' ? team.city.zh + team.name.zh : team.city.en + ' ' + team.name.en) : code;
      if (res.state === 'art') {
        this.innerHTML = '<img src="' + esc(res.src) + '" alt="' + esc(name) + '" decoding="async">';
        var self = this;
        this.querySelector('img').addEventListener('error', function () { self.dataset.state = 'fallback'; self.dataset.reason = 'LOAD_ERROR'; self.badge(team, canon, name); }, { once: true });
      } else this.badge(team, canon, name);
    }
    badge(team, code, name) {
      var bg = team ? team.colors[0] : '#5B6472';
      this.dataset.fallback = 'abbr';
      this.innerHTML = '<span class="mo-abbr" role="img" aria-label="' + esc(name) + '" style="--bg:' + bg + ';--fg:' + readableOn(bg) + ';--stripe:' + (team ? team.colors[1] : '#9AA5B4') + '">' + esc(code || '?') + '</span>';
    }
  }

  /* ---------- brand mark ---------- */
  class MoBrandLogo extends HTMLElement {
    connectedCallback() { this.render(); }
    render() {
      var res = R().resolveLogo(REG(), 'brand-mark', opts());
      this.className = 'mo-brand mo-tone-' + (this.getAttribute('tone') || 'on-dark');
      tag(this, 'brand-mark', res);
      if (res.state === 'art') {
        this.innerHTML = '<img src="' + esc(res.src) + '" alt="MOSPORT">';
        var self = this;
        this.querySelector('img').addEventListener('error', function () { self.dataset.state = 'fallback'; self.dataset.reason = 'LOAD_ERROR'; self.text(); }, { once: true });
      } else this.text();
    }
    text() { this.dataset.fallback = 'text'; this.innerHTML = '<span class="mo-brand-fb" role="img" aria-label="MOSPORT">M</span>'; }
  }

  customElements.define('mo-art', MoArt);
  customElements.define('mo-team-logo', MoTeamLogo);
  customElements.define('mo-brand-logo', MoBrandLogo);

  window.MOSPORT_REFRESH_SLOTS = function (root) {
    (root || document).querySelectorAll('mo-art,mo-team-logo,mo-brand-logo').forEach(function (el) { el.render(); });
  };
  if (/[?&]slots=1\b/.test(location.search)) document.documentElement.classList.add('show-slots');
})();
