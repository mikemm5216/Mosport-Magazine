/*
 * Image-slot components (light DOM, no build step).
 *
 *   <mo-brand-logo tone="on-dark|on-light"></mo-brand-logo>      the monogram mark
 *   <mo-team-logo code="LAL" size="xs|sm|md|lg|xl"></mo-team-logo>
 *   <mo-cover-artwork name="gameday" alt=""></mo-cover-artwork>    fills its positioned parent
 *
 * Every slot resolves through MOSPORT_ASSETS. With no usable file it renders a
 * fallback that is plainly a fallback: the monogram letter, the team tricode on
 * the team colour, or a flat navy field. No fallback imitates a real logo.
 * ?slots=1 outlines each slot with its id, path and rights.
 */
(function () {
  var A = function () { return window.MOSPORT_ASSETS || { brand: {}, cover: {}, teams: {} }; };
  var mode = function () { return (window.MOSPORT_CONFIG && window.MOSPORT_CONFIG.mode) || 'prototype'; };
  var lang = function () { return document.documentElement.lang === 'en' ? 'en' : 'zh'; };
  var dark = function () { return document.documentElement.dataset.theme === 'dark'; };
  var mobile = function () { return window.matchMedia('(max-width: 1023px)').matches; };

  function usable(a) {
    if (!a || !a.src) return false;
    if (a.kind === 'athlete') return false;
    if (a.rightsStatus === 'BLOCKED') return false;
    if (a.rightsStatus === 'UNVERIFIED' && mode() !== 'prototype') return false;
    return true;
  }
  function src(a) { return dark() && a.srcDark ? a.srcDark : a.src; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function readableOn(hex) {
    var h = (hex || '#000000').replace('#', '');
    var c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.36 ? '#0B1220' : '#FFFFFF';
  }
  function mark(el, id, a) {
    el.classList.add('mo-slot');
    el.dataset.slot = id;
    el.dataset.slotLabel = id + ' · ' + (a ? (a.src || a.expectedPath) + ' · ' + a.rightsStatus : 'no manifest entry');
  }

  var SIZES = { xs: 22, sm: 36, md: 52, lg: 84, xl: 120 };

  class MoTeamLogo extends HTMLElement {
    static get observedAttributes() { return ['code', 'size']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var code = (this.getAttribute('code') || '').toUpperCase();
      var team = window.MOSPORT_TEAMS && window.MOSPORT_TEAMS.get(code);
      var canon = team ? team.code : code;
      var px = SIZES[this.getAttribute('size') || 'md'] || 52;
      this.style.setProperty('--logo-default', px + 'px');
      var a = A().teams[canon];
      mark(this, 'teams.' + canon, a);
      var name = team ? (lang() === 'zh' ? team.city.zh + team.name.zh : team.city.en + ' ' + team.name.en) : code;
      if (usable(a)) {
        this.innerHTML = '<img src="' + esc(src(a)) + '" alt="' + esc(name) + '" decoding="async">';
        var self = this;
        this.querySelector('img').addEventListener('error', function () { self.fallback(team, canon, name); }, { once: true });
      } else this.fallback(team, canon, name);
    }
    fallback(team, code, name) {
      var bg = team ? team.colors[0] : '#5B6472';
      var stripe = team ? team.colors[1] : '#9AA5B4';
      this.dataset.fallback = 'abbr';
      this.innerHTML = '<span class="mo-abbr" role="img" aria-label="' + esc(name) + '" style="--bg:' + bg + ';--fg:' + readableOn(bg) + ';--stripe:' + stripe + '">' + esc(code || '?') + '</span>';
    }
  }

  class MoBrandLogo extends HTMLElement {
    connectedCallback() { this.render(); }
    render() {
      var a = A().brand.mark;
      mark(this, 'brand.mark', a);
      this.className = 'mo-brand mo-slot mo-tone-' + (this.getAttribute('tone') || 'on-dark');
      if (usable(a)) {
        this.innerHTML = '<img src="' + esc(src(a)) + '" alt="MOSPORT">';
        var self = this;
        this.querySelector('img').addEventListener('error', function () { self.fallback(); }, { once: true });
      } else this.fallback();
    }
    fallback() {
      this.dataset.fallback = 'text';
      this.innerHTML = '<span class="mo-brand-fb" role="img" aria-label="MOSPORT">M</span>';
    }
  }

  class MoCoverArtwork extends HTMLElement {
    connectedCallback() {
      this._mq = window.matchMedia('(max-width: 1023px)');
      this._on = this.render.bind(this);
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._on);
      this.render();
    }
    disconnectedCallback() { if (this._mq && this._mq.removeEventListener) this._mq.removeEventListener('change', this._on); }
    render() {
      var id = this.getAttribute('name');
      var a = A().cover[id];
      mark(this, 'cover.' + id, a);
      this.classList.add('mo-cover');
      if (usable(a)) {
        var focal = (mobile() ? a.focalMobile : a.focalDesktop) || '50% 50%';
        this.innerHTML = '<img src="' + esc(src(a)) + '" alt="' + esc(this.getAttribute('alt') || '') + '" style="object-position:' + esc(focal) + '" decoding="async">';
        var self = this;
        this.querySelector('img').addEventListener('error', function () { self.innerHTML = ''; self.dataset.fallback = 'flat'; }, { once: true });
      } else { this.innerHTML = ''; this.dataset.fallback = 'flat'; }
    }
  }

  customElements.define('mo-team-logo', MoTeamLogo);
  customElements.define('mo-brand-logo', MoBrandLogo);
  customElements.define('mo-cover-artwork', MoCoverArtwork);

  window.MOSPORT_REFRESH_SLOTS = function (root) {
    (root || document).querySelectorAll('mo-team-logo,mo-brand-logo,mo-cover-artwork').forEach(function (el) { el.render(); });
  };
  if (/[?&]slots=1\b/.test(location.search)) document.documentElement.classList.add('show-slots');
})();
