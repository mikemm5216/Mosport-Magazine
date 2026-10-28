/*
 * Magazine Reader Zoom (Founder addendum to issue #2).
 *
 * Desktop (≥ 1024 px): the whole spread (cover + TODAY together) is laid out at
 * a fixed natural width and scaled as one unit inside a scrollable reader
 * viewport. The site navigation is outside the reader and never scales.
 *   Fit Width  DEFAULT; largest scale fitting the spread width, capped at 100%
 *   Fit Page   largest scale that shows the whole spread in the available
 *              width AND height; recomputed on resize while Fit is active
 *   − / +      10% steps on a 10% grid, bounded to 50%–200%
 *   100%       the unscaled spread
 * Keyboard (focus inside the reader): + / − / 0 / F / W. Ctrl/Cmd combinations are
 * left to the browser, so browser zoom is never hijacked.
 *
 * Mobile (< 1024 px): nothing is scaled; the page keeps the native cover →
 * TODAY flow and native pinch-to-zoom.
 */
(function () {
  var NATURAL_WIDTH = 1360;   /* spread width at 100% (px) */
  var MIN = 0.5, MAX = 2, STEP = 0.1;
  var DESKTOP = '(min-width: 1024px)';
  var st = { mode: 'width', scale: 1, current: 1 };
  var ro = null, bound = false;

  /* Zoom is kept across the site: URL ?zoom=width|fit|50..200 first, then this tab's session. */
  var KEY = 'mosport.zoom';
  function parseToken(t) {
    if (t === 'width') return { mode: 'width' };
    if (t === 'fit') return { mode: 'fit' };
    var n = parseInt(t, 10);
    if (isFinite(n) && n >= MIN * 100 && n <= MAX * 100) return { mode: 'manual', scale: Math.round(n) / 100 };
    return null;
  }
  function token() { return st.mode === 'fit' || st.mode === 'width' ? st.mode : String(Math.round(st.scale * 100)); }
  function save() { try { sessionStorage.setItem(KEY, token()); } catch (e) { /* storage blocked */ } }
  (function restore() {
    var fromUrl = parseToken(new URLSearchParams(location.search).get('zoom'));
    var stored = null;
    try { stored = parseToken(sessionStorage.getItem(KEY)); } catch (e) { /* storage blocked */ }
    var s = fromUrl || stored;
    if (s) { st.mode = s.mode; if (s.scale) st.scale = s.scale; }
    if (fromUrl) save();
  })();

  var $ = function (id) { return document.getElementById(id); };
  var desktop = function () { return window.matchMedia(DESKTOP).matches; };
  var clamp = function (s) { return Math.min(MAX, Math.max(MIN, s)); };
  var round2 = function (s) { return Math.round(s * 100) / 100; };

  function parts() {
    var reader = $('reader'), sizer = $('sizer');
    return reader && sizer ? { reader: reader, sizer: sizer, spread: sizer.querySelector('.spread'), bar: $('reader-bar') } : null;
  }

  function widthScale(p) {
    var cs = getComputedStyle(p.reader);
    var w = p.reader.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return clamp(Math.floor(Math.min(1, w / NATURAL_WIDTH) * 100) / 100);
  }

  function fitScale(p) {
    var cs = getComputedStyle(p.reader);
    var w = p.reader.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = p.reader.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var natH = p.spread.offsetHeight;          /* layout height is not affected by transform */
    if (!natH) return 1;
    return clamp(Math.floor(Math.min(w / NATURAL_WIDTH, h / natH) * 100) / 100);
  }

  function apply(keepCenter) {
    var p = parts();
    if (!p) return;
    if (!desktop()) {
      p.spread.style.transform = '';
      p.spread.style.width = '';
      p.sizer.style.width = '';
      p.sizer.style.height = '';
      return;
    }
    var r = p.reader;
    var cx = r.scrollWidth > r.clientWidth ? (r.scrollLeft + r.clientWidth / 2) / r.scrollWidth : 0.5;
    var cy = r.scrollHeight > r.clientHeight ? (r.scrollTop + r.clientHeight / 2) / r.scrollHeight : 0;

    p.spread.style.width = NATURAL_WIDTH + 'px';
    var s = st.mode === 'fit' ? fitScale(p) : st.mode === 'width' ? widthScale(p) : st.scale;
    st.current = s;
    p.spread.style.transform = 'scale(' + s + ')';
    p.sizer.style.width = Math.round(NATURAL_WIDTH * s) + 'px';
    p.sizer.style.height = Math.round(p.spread.offsetHeight * s) + 'px';

    if (keepCenter) {
      r.scrollLeft = Math.max(0, cx * r.scrollWidth - r.clientWidth / 2);
      r.scrollTop = Math.max(0, cy * r.scrollHeight - (cy ? r.clientHeight / 2 : 0));
    }
    paintBar(p);
  }

  function paintBar(p) {
    if (!p.bar) return;
    var pct = Math.round(st.current * 100);
    var out = p.bar.querySelector('[data-zoom-value]');
    if (out) out.textContent = pct + '%';
    p.reader.dataset.zoom = String(pct);
    p.reader.dataset.zoomMode = st.mode;
    var set = function (sel, disabled, pressed) {
      var b = p.bar.querySelector(sel);
      if (!b) return;
      b.disabled = !!disabled;
      if (pressed !== undefined) b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    };
    set('[data-zoom="out"]', st.current <= MIN + 1e-9);
    set('[data-zoom="in"]', st.current >= MAX - 1e-9);
    set('[data-zoom="fit"]', false, st.mode === 'fit');
    set('[data-zoom="width"]', false, st.mode === 'width');
    set('[data-zoom="reset"]', false, st.mode === 'manual' && Math.abs(st.current - 1) < 1e-9);
  }

  function zoom(kind) {
    var cur = st.current;
    if (kind === 'width') { st.mode = 'width'; }
    else if (kind === 'fit') { st.mode = 'fit'; }
    else if (kind === 'reset') { st.mode = 'manual'; st.scale = 1; }
    else if (kind === 'in') { st.mode = 'manual'; st.scale = clamp(round2(Math.floor(cur * 10 + 1e-6) / 10 + STEP)); }
    else if (kind === 'out') { st.mode = 'manual'; st.scale = clamp(round2(Math.ceil(cur * 10 - 1e-6) / 10 - STEP)); }
    save();
    apply(true);
    syncLinks();
  }

  function onKey(e) {
    if (!desktop() || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var map = { '+': 'in', '=': 'in', '-': 'out', '_': 'out', '0': 'reset', 'f': 'fit', 'F': 'fit', 'w': 'width', 'W': 'width' };
    if (map[e.key]) { e.preventDefault(); zoom(map[e.key]); }
  }

  /* Rewrite ?zoom= on in-site links and in the address bar after a change. */
  function syncLinks() {
    var t = token();
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!/^(index|schedule|review|match)\.html/.test(h)) return;
      var parts = h.split('?'); var q = new URLSearchParams(parts[1] || '');
      q.set('zoom', t); a.setAttribute('href', parts[0] + '?' + q.toString());
    });
    try { var u = new URLSearchParams(location.search); u.set('zoom', t); history.replaceState(null, '', location.pathname + '?' + u.toString() + location.hash); } catch (e) { /* file: */ }
  }

  /* Called after every page render (language/theme changes re-render the page). */
  function mount() {
    var p = parts();
    if (!p) return;
    p.reader.addEventListener('keydown', onKey);
    if (ro) ro.disconnect();
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { window.requestAnimationFrame(function () { apply(false); }); });
      ro.observe(p.reader);
      ro.observe(p.spread);
    }
    if (!bound) {
      bound = true;
      window.addEventListener('resize', function () { apply(false); });
      document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-zoom]');
        if (b && !b.disabled) zoom(b.dataset.zoom);
      });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { apply(false); });
    }
    apply(false);
  }

  window.MOSPORT_READER = {
    mount: mount, zoom: zoom, state: st, token: token,
    limits: { min: MIN, max: MAX, step: STEP, naturalWidth: NATURAL_WIDTH }
  };
})();
