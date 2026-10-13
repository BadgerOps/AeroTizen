(function () {
  'use strict';

  var tz = window.tizen;
  var STORE = 'declutter.home.v3';
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27 };
  var DEFAULT_FAVORITES = ['youtube', 'netflix', 'stremio', 'prime video', 'tizenbrew', 'disney', 'max', 'hulu', 'apple tv', 'plex'];
  var HIDDEN = /^(org\.tizen|com\.samsung)\.|service|widget|lowmem|DclHome001/i;
  var FIRE_VIDEO = 'WuHSBSLK3_A';

  // Banner gradients per brand; anything else gets a stable colour derived from its name.
  var BRANDS = [
    ['youtube', '#e62117', '#7a0b06'], ['netflix', '#3a0306', '#000000'], ['prime video', '#1a98ff', '#0a2a6b'],
    ['disney', '#1a3fa3', '#06102e'], ['max', '#3b2bff', '#0b0752'], ['hulu', '#1ce783', '#0a6e3c'],
    ['apple tv', '#3a3a3c', '#000000'], ['plex', '#3a2a06', '#0d0d0d'], ['spotify', '#1db954', '#0b3d1d'],
    ['stremio', '#7b5bf5', '#1a1240'], ['tizenbrew', '#ff9e1b', '#7a2c00'], ['jellyfin', '#aa5cc3', '#00a4dc'],
    ['paramount', '#0064ff', '#001a4d'], ['peacock', '#2a2a2a', '#000000'], ['tubi', '#7408ff', '#2a0066'],
    ['twitch', '#9146ff', '#2b0f66'], ['crunchyroll', '#f47521', '#7a3108']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var allApps = [], favorites = [], sources = [];
  var rows = [], row = 1, col = [0, 0, 0, 0];
  var editing = false, editIndex = 0;

  // ---- storage -------------------------------------------------------------
  function load() { try { var s = JSON.parse(localStorage.getItem(STORE)); if (s && s.favorites) { favorites = s.favorites; } } catch (e) {} }
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ favorites: favorites })); } catch (e) {} }

  // ---- clock ---------------------------------------------------------------
  function tick() {
    var d = new Date();
    $('date').textContent = d.toLocaleDateString([], { weekday: 'long' }) + ' ' + d.getDate();
    $('time').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }

  // ---- data ----------------------------------------------------------------
  function loadApps(done) {
    if (!tz || !tz.application) {
      allApps = ['YouTube', 'Netflix', 'Stremio', 'Prime Video', 'TizenBrew', 'Spotify - Music and Podcasts', 'Disney+', 'Plex']
        .map(function (n, i) { return { id: 'demo' + i, name: n, icon: '' }; });
      return done();
    }
    tz.application.getAppsInfo(function (list) {
      allApps = list.filter(function (a) { return a.show !== false && !HIDDEN.test(a.id) && a.name; })
        .map(function (a) { return { id: a.id, name: a.name, icon: a.iconPath || '' }; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      done();
    }, function () { allApps = []; done(); });
  }

  function pickDefaults() {
    var picked = [];
    DEFAULT_FAVORITES.forEach(function (want) {
      allApps.forEach(function (a) { if (picked.indexOf(a.id) < 0 && a.name.toLowerCase().indexOf(want) === 0) { picked.push(a.id); } });
    });
    return picked.slice(0, 6);
  }

  function byId(id) { for (var i = 0; i < allApps.length; i++) { if (allApps[i].id === id) { return allApps[i]; } } return null; }
  function shortName(name) { return name.replace(/ - .*/, '').replace(/NextGeneration$/, ''); }

  function brand(name) {
    var n = name.toLowerCase();
    for (var i = 0; i < BRANDS.length; i++) { if (n.indexOf(BRANDS[i][0]) === 0) { return BRANDS[i]; } }
    var h = 0; for (var j = 0; j < n.length; j++) { h = (h * 31 + n.charCodeAt(j)) % 360; }
    return [n, 'hsl(' + h + ',62%,46%)', 'hsl(' + ((h + 40) % 360) + ',70%,16%)'];
  }

  // ---- tiles ---------------------------------------------------------------
  function banner(app, extraClass) {
    var el = document.createElement('div'), b = brand(app.name);
    el.className = 'tile' + (extraClass ? ' ' + extraClass : '');
    el.style.background = 'linear-gradient(135deg,' + b[1] + ' 0%,' + b[2] + ' 100%)';
    el.innerHTML = '<div class="swoosh s1"></div><div class="swoosh s2"></div>';
    var name = document.createElement('div'); name.className = 'name'; name.textContent = shortName(app.name);
    if (app.icon) {
      var img = new Image(); img.className = 'logo'; img.alt = '';
      img.onerror = function () { el.removeChild(img); el.classList.add('nologo'); };
      img.src = app.icon; el.appendChild(img);
    } else { el.classList.add('nologo'); }
    el.appendChild(name);
    el.onclick = function () { launch(app); };
    return el;
  }

  function card(label, iconSvg, onclick) {
    var el = document.createElement('div'); el.className = 'tile';
    el.innerHTML = iconSvg + '<div class="name"></div>';
    el.querySelector('.name').textContent = label; el.onclick = onclick;
    return el;
  }

  var FLAME = '<svg class="flame" viewBox="0 0 24 24"><path fill="#ffd27a" d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.5 0 2.2-1.2 2-3 2.3 1.9 3.7 4.3 3.7 7A6.5 6.5 0 0 1 12 22.5 6.5 6.5 0 0 1 5.5 16c0-4.6 3.6-7.4 4.8-10.4C11 4.2 11.6 3 12 2z"/></svg>';
  var HDMI = '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#2c2c30"/><path fill="#fff" d="M5 9h14v3l-2 3H7l-2-3zM8 11v1h1v-1zm3 0v1h2v-1zm4 0v1h1v-1z"/></svg>';
  var TV = '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#2c2c30"/><path fill="none" stroke="#fff" stroke-width="1.6" d="M5 8h14v9H5zM9 5l3 3 3-3"/></svg>';

  function renderRows() {
    var fav = $('favorites'); fav.textContent = '';
    var fire = document.createElement('div'); fire.className = 'tile fire';
    fire.innerHTML = FLAME + '<div class="name">Fireplace</div>'; fire.onclick = playFireplace;
    fav.appendChild(fire);
    favorites = favorites.filter(byId);
    favorites.forEach(function (id) { fav.appendChild(banner(byId(id))); });

    var apps = $('apps'); apps.textContent = '';
    allApps.forEach(function (a) { if (favorites.indexOf(a.id) < 0) { apps.appendChild(banner(a)); } });
    buildRows();
  }

  function sourceName(s) { return s.type === 'TV' ? 'Live TV' : s.type + ' ' + s.number; }

  function renderInputs() {
    var box = $('inputs'); box.textContent = '';
    var current = null;
    try { current = tz && tz.tvwindow ? tz.tvwindow.getSource('MAIN') : null; } catch (e) {}
    sources.forEach(function (s) { box.appendChild(card(sourceName(s), s.type === 'TV' ? TV : HDMI, function () { switchInput(s); })); });
    $('source').textContent = current ? sourceName(current) : 'Connected';
    buildRows();
  }

  function loadSources() {
    if (!tz || !tz.systeminfo) { sources = [{ type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }, { type: 'TV', number: 0 }]; return renderInputs(); }
    try {
      tz.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        sources = (info.connected || []).filter(function (s) { return s.type !== 'MEDIA'; });
        renderInputs();
      }, renderInputs);
    } catch (e) { renderInputs(); }
  }

  // ---- actions -------------------------------------------------------------
  function toast(text) {
    var t = $('toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.hidden = true; }, 2500);
  }

  function launch(app) {
    if (!tz || !tz.application) { return toast('Would open ' + shortName(app.name)); }
    tz.application.launch(app.id, null, function () { toast('Could not open ' + shortName(app.name)); });
  }

  function switchInput(s) {
    if (!tz || !tz.tvwindow) { return toast('Would switch to ' + sourceName(s)); }
    try {
      tz.tvwindow.setSource(s, function () {
        tz.tvwindow.show(function () {}, function () {}, ['0', '0', '100%', '100%'], 'MAIN');
        renderInputs();
      }, function () { toast('Could not switch input'); }, 'MAIN');
    } catch (e) { toast('Could not switch input'); }
  }

  // Fireplace plays a YouTube fireplace video; falls back to the built-in fire.
  function playFireplace() {
    var yt = null;
    allApps.forEach(function (a) { if (!yt && /^youtube$/i.test(a.name)) { yt = a; } });
    if (tz && tz.application && tz.ApplicationControl && yt) {
      try {
        var data = [new tz.ApplicationControlData('PAYLOAD', [JSON.stringify({ values: 'v=' + FIRE_VIDEO })])];
        tz.application.launchAppControl(new tz.ApplicationControl('http://tizen.org/appcontrol/operation/view', null, null, null, data), yt.id, null, dial);
        return;
      } catch (e) { /* fall through */ }
    }
    dial();
  }
  function dial() {
    if (!tz) { return window.Fireplace.open(); }
    var x = new XMLHttpRequest();
    x.open('POST', 'http://127.0.0.1:8080/ws/apps/YouTube');
    x.setRequestHeader('Content-Type', 'text/plain; charset=utf-8');
    x.timeout = 4000;
    x.onload = function () { if (x.status >= 300) { window.Fireplace.open(); } };
    x.onerror = x.ontimeout = function () { window.Fireplace.open(); };
    x.send('v=' + FIRE_VIDEO);
  }

  // ---- focus ---------------------------------------------------------------
  function buildRows() {
    rows = [[$('gear')], $('favorites').children, $('apps').children, $('inputs').children];
    focus();
  }

  function focus() {
    var prev = document.querySelectorAll('.focused');
    for (var p = 0; p < prev.length; p++) { prev[p].classList.remove('focused'); }
    if (editing) {
      var items = $('all-apps').children;
      editIndex = Math.max(0, Math.min(editIndex, items.length - 1));
      if (items[editIndex]) { items[editIndex].classList.add('focused'); }
      return;
    }
    while (row > 0 && (!rows[row] || !rows[row].length)) { row--; }
    var list = rows[row];
    col[row] = Math.max(0, Math.min(col[row], list.length - 1));
    var el = list[col[row]];
    el.classList.add('focused');
    if (row > 0) {
      // Slide the row so the focused tile stays on screen; transforms only, cheap on TV GPUs.
      var strip = el.parentNode, visible = 1920 - 64 - 40;
      var shift = Math.max(0, el.offsetLeft + el.offsetWidth - visible);
      strip.style.transform = 'translate3d(' + (-shift) + 'px,0,0)';
      // Scroll the page vertically so the focused row is visible.
      var main = $('rows'), top = strip.parentNode.offsetTop;
      main.style.transform = 'translate3d(0,' + (row >= 3 ? -Math.max(0, top - 520) : 0) + 'px,0)';
    }
  }

  // ---- favorites editor ----------------------------------------------------
  function openEditor() { editing = true; $('editor').hidden = false; editIndex = 0; renderEditor(); }
  function closeEditor() { editing = false; $('editor').hidden = true; save(); renderRows(); }
  function renderEditor() {
    var box = $('all-apps'); box.textContent = '';
    allApps.forEach(function (app) {
      var t = banner(app, favorites.indexOf(app.id) >= 0 ? 'on' : '');
      t.onclick = null; box.appendChild(t);
    });
    focus();
  }
  function toggleFavorite() {
    var app = allApps[editIndex], i = favorites.indexOf(app.id);
    if (i >= 0) { favorites.splice(i, 1); } else { favorites.push(app.id); }
    $('all-apps').children[editIndex].classList.toggle('on', i < 0);
  }

  // ---- keys ----------------------------------------------------------------
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (window.Fireplace.isOpen()) {
      if (k === KEY.UP) { window.Fireplace.volumeUp(); }
      else if (k === KEY.DOWN) { window.Fireplace.volumeDown(); }
      else if (k === KEY.BACK || k === KEY.ESC || k === KEY.ENTER) { e.preventDefault(); window.Fireplace.close(); }
      return;
    }
    if (editing) {
      var perRow = 5, n = allApps.length;
      if (k === KEY.LEFT) { editIndex = Math.max(0, editIndex - 1); }
      else if (k === KEY.RIGHT) { editIndex = Math.min(n - 1, editIndex + 1); }
      else if (k === KEY.UP) { editIndex = Math.max(0, editIndex - perRow); }
      else if (k === KEY.DOWN) { editIndex = Math.min(n - 1, editIndex + perRow); }
      else if (k === KEY.ENTER) { toggleFavorite(); return; }
      else if (k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); closeEditor(); return; }
      focus(); return;
    }
    if (k === KEY.LEFT) { col[row]--; }
    else if (k === KEY.RIGHT) { col[row]++; }
    else if (k === KEY.UP) { do { row--; } while (row > 0 && !rows[row].length); row = Math.max(0, row); }
    else if (k === KEY.DOWN) { var r = row; do { r++; } while (r < rows.length && !rows[r].length); if (r < rows.length) { row = r; } }
    else if (k === KEY.ENTER) { var el = rows[row][col[row]]; if (el === $('gear')) { openEditor(); } else if (el && el.onclick) { el.onclick(); } return; }
    else if (k === KEY.BACK) { e.preventDefault(); return; }
    focus();
  });

  // ---- boot ----------------------------------------------------------------
  load(); tick(); setInterval(tick, 10000);
  loadApps(function () {
    if (!favorites.length) { favorites = pickDefaults(); save(); }
    renderRows(); loadSources();
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); loadSources(); } });
})();
