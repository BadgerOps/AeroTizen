(function () {
  'use strict';

  var tz = window.tizen;
  var STORE = 'hearth.home.v1';
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27 };
  var SELF = 'DclHome001.Home';
  var DEFAULT_FAVORITES = ['youtube', 'netflix', 'prime video', 'stremio', 'spotify'];
  // Only real user apps: Samsung-store packages (10-char ids) plus the preinstalled streamers.
  // Everything else getAppsInfo returns (~460 entries) is firmware plumbing.
  var STORE_PKG = /^[A-Za-z0-9]{10}$/;
  var PRELOADED = { 'org.tizen.netflix-app': '3201907018807', 'org.tizen.primevideo': '3201910019365' };
  var JUNK = /service|emanual|companion|dummy|widget|tizenbrew|DclHome001/i;
  var FIRE_VIDEO = 'WuHSBSLK3_A';

  // Android-TV-style banners: brand background, official logo (from logos.js), optional wordmark.
  // match: lower-case name prefix; logo: Simple Icons slug; text: wordmark beside the logo (null = logo only).
  var BRANDS = [
    { match: 'youtube', bg: '#ffffff', logo: 'youtube', fill: '#ff0000', text: 'YouTube', ink: '#0f0f0f' },
    { match: 'netflix', bg: 'linear-gradient(135deg,#e50914,#8a0610)', logo: 'netflix', fill: '#ffffff', text: null },
    { match: 'prime video', bg: 'linear-gradient(135deg,#1a98ff,#0f4c81)', logo: 'primevideo', fill: '#ffffff', text: null, big: true },
    { match: 'spotify', bg: 'linear-gradient(135deg,#1ed760,#0f8a3c)', logo: 'spotify', fill: '#000000', text: 'Spotify', ink: '#000000' },
    { match: 'stremio', bg: 'linear-gradient(135deg,#7b5bf5,#2b1d68)', logo: 'stremio', fill: '#ffffff', text: 'Stremio', ink: '#ffffff' },
    { match: 'max', bg: '#002be7', logo: 'max', fill: '#ffffff', text: null },
    { match: 'hulu', bg: '#1ce783', logo: 'hulu', fill: '#0b0c0f', text: null },
    { match: 'apple tv', bg: 'linear-gradient(135deg,#4a4a4f,#1c1c1e)', logo: 'appletv', fill: '#ffffff', text: null },
    { match: 'plex', bg: '#1f1f1f', logo: 'plex', fill: '#ebaf00', text: null },
    { match: 'twitch', bg: '#9146ff', logo: 'twitch', fill: '#ffffff', text: 'Twitch', ink: '#ffffff' },
    { match: 'crunchyroll', bg: '#f47521', logo: 'crunchyroll', fill: '#ffffff', text: 'Crunchyroll', ink: '#ffffff' },
    { match: 'paramount', bg: '#0064ff', logo: 'paramountplus', fill: '#ffffff', text: null },
    { match: 'tubi', bg: '#7408ff', logo: 'tubi', fill: '#ffffff', text: null },
    { match: 'jellyfin', bg: 'linear-gradient(135deg,#aa5cc3,#00a4dc)', logo: 'jellyfin', fill: '#ffffff', text: 'Jellyfin', ink: '#ffffff' },
    { match: 'disney', bg: 'linear-gradient(135deg,#1a3fa3,#06102e)', logo: null, text: 'Disney+', ink: '#ffffff' },
    { match: 'tizenbrew', bg: 'linear-gradient(135deg,#ff9e1b,#7a2c00)', logo: null, text: 'TizenBrew', ink: '#ffffff', useIcon: true }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var allApps = [], favorites = [], appOrder = [], sources = [], background = 'black';
  var FIRE = '__fire', realAppIds = [], tempUnit = 'auto', bgSpeed = 1, previewing = false, inputNames = {};
  var rows = [], row = 1, col = [];
  var editing = false, editIndex = 0;

  // ---- storage -------------------------------------------------------------
  function load() {
    try {
      // One-time migration from the project's earlier name.
      if (!localStorage.getItem(STORE) && localStorage.getItem('declutter.home.v5')) {
        localStorage.setItem(STORE, localStorage.getItem('declutter.home.v5'));
      }
      var s = JSON.parse(localStorage.getItem(STORE)) || {};
      favorites = s.favorites || []; appOrder = s.order || []; background = s.background || 'aurora'; tempUnit = s.tempUnit || 'auto'; bgSpeed = s.speed || 1; inputNames = s.inputNames || {};
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ favorites: favorites, order: appOrder, background: background, tempUnit: tempUnit, speed: bgSpeed, inputNames: inputNames })); } catch (e) {}
  }

  function applyBackground() { window.Backgrounds.setSpeed(bgSpeed); window.Backgrounds.apply(background); }

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
      // Every real app (including ones hidden from the grid, like TizenBrew), so the service
      // recognises it when it's opened from elsewhere and doesn't cover it.
      realAppIds = list.filter(function (a) {
        return a.show !== false && !/service|DclHome001/i.test(a.id) &&
          (STORE_PKG.test(a.packageId || '') || PRELOADED.hasOwnProperty(a.id));
      }).map(function (a) { return PRELOADED[a.id] || a.id; });
      allApps = list.filter(function (a) {
        return a.show !== false && a.name && !JUNK.test(a.id) && !JUNK.test(a.name) &&
          (STORE_PKG.test(a.packageId || '') || PRELOADED.hasOwnProperty(a.id));
      })
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
    return picked;
  }

  function byId(id) { for (var i = 0; i < allApps.length; i++) { if (allApps[i].id === id) { return allApps[i]; } } return null; }
  function shortName(name) { return name.replace(/ - .*/, '').replace(/NextGeneration$/, ''); }

  function brand(name) {
    var n = name.toLowerCase();
    for (var i = 0; i < BRANDS.length; i++) { if (n.indexOf(BRANDS[i].match) === 0) { return BRANDS[i]; } }
    var h = 0; for (var j = 0; j < n.length; j++) { h = (h * 31 + n.charCodeAt(j)) % 360; }
    return { bg: 'linear-gradient(135deg,hsl(' + h + ',55%,42%),hsl(' + ((h + 40) % 360) + ',65%,14%))',
             logo: null, text: shortName(name), ink: '#ffffff', useIcon: true };
  }

  function logoSvg(slug, fill) {
    var d = window.LOGOS && window.LOGOS[slug];
    return d ? '<svg class="logo" viewBox="0 0 24 24"><path fill="' + fill + '" d="' + d + '"/></svg>' : '';
  }

  // ---- tiles ---------------------------------------------------------------
  function banner(app, extraClass) {
    var el = document.createElement('div'), b = brand(app.name);
    el.className = 'tile' + (extraClass ? ' ' + extraClass : '') + (b.text ? '' : ' logo-only') + (b.big ? ' logo-big' : '');
    el.style.background = b.bg;
    if (b.logo) { el.innerHTML = logoSvg(b.logo, b.fill); }
    else if (b.useIcon && app.icon) {
      var img = new Image(); img.className = 'logo'; img.alt = '';
      img.onerror = function () { el.removeChild(img); };
      img.src = app.icon; el.appendChild(img);
    }
    if (b.text) {
      var name = document.createElement('div'); name.className = 'name';
      name.textContent = b.text; name.style.color = b.ink; el.appendChild(name);
    }
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
    favorites = favorites.filter(function (id) { return id === FIRE || byId(id); });
    if (favorites.indexOf(FIRE) < 0) { favorites.unshift(FIRE); }
    favorites.forEach(function (id) {
      var t;
      if (id === FIRE) {
        t = document.createElement('div'); t.className = 'tile fire';
        t.innerHTML = FLAME + '<div class="name">Fireplace</div>'; t.onclick = playFireplace;
      } else { t = banner(byId(id)); }
      t.dataset.id = id; fav.appendChild(t);
    });

    // Home is just the favorites grid; every other app can be added from Settings.
    buildRows();
  }

  // Non-favorite apps, in the order the user arranged them (new apps go last, alphabetically).
  function otherApps() {
    var rest = allApps.filter(function (a) { return favorites.indexOf(a.id) < 0; });
    function rank(a) { var i = appOrder.indexOf(a.id); return i < 0 ? 1e6 : i; }
    return rest.sort(function (a, b) { return rank(a) - rank(b) || a.name.localeCompare(b.name); });
  }

  function sourceName(s) { return s.type === 'TV' ? 'Live TV' : s.type + ' ' + s.number; }

  var GAME = '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#2c2c30"/><path fill="#fff" d="M7.5 8h9a3.5 3.5 0 0 1 3.4 4.3l-.8 3.2a2 2 0 0 1-3.4.9L14.3 15H9.7l-1.4 1.4a2 2 0 0 1-3.4-.9l-.8-3.2A3.5 3.5 0 0 1 7.5 8zM8 10v1H7v1h1v1h1v-1h1v-1H9v-1zm7.5.3a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6zm-1.6 1.6a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z"/></svg>';
  var PC = '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#2c2c30"/><path fill="none" stroke="#fff" stroke-width="1.6" d="M5 6.5h14v9H5zM9 19h6M12 15.5V19"/></svg>';
  var BOX = '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#2c2c30"/><path fill="none" stroke="#fff" stroke-width="1.6" d="M4.5 10h15v5h-15z"/><circle cx="16.5" cy="12.5" r="1" fill="#fff"/></svg>';

  function inputIcon(s) {
    if (s.type === 'TV') { return TV; }
    var n = (s.editName || '').toLowerCase();
    if (/xbox|playstation|ps\d|switch|nintendo|game|console/.test(n)) { return GAME; }
    if (/pc|computer|mac|laptop/.test(n)) { return PC; }
    if (/cable|box|roku|fire|apple|shield|chromecast|blu|dvd|satellite/.test(n)) { return BOX; }
    return HDMI;
  }

  function renderInputs() {
    var box = $('inputs'); box.textContent = '';
    var current = null;
    try { current = tz && tz.tvwindow ? tz.tvwindow.getSource('MAIN') : null; } catch (e) {}
    sources.forEach(function (s) {
      var custom = inputNames[sourceName(s)];
      var label = custom || s.editName || sourceName(s);
      var el = card(label, inputIcon({ type: s.type, editName: label }), function () { switchInput(s); });
      if (label !== sourceName(s) && s.type !== 'TV') {
        var sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = sourceName(s);
        el.querySelector('.name').appendChild(sub);
      }
      if (!s.connected) { el.classList.add('off'); }
      box.appendChild(el);
    });
    buildRows();
  }

  // Every port the TV has, like its own Source list: connected first (named by the TV,
  // e.g. "Xbox"), then empty ports dimmed. Refreshes live when something is plugged in.
  function loadSources() {
    if (!tz || !tz.systeminfo) {
      sources = [{ type: 'HDMI', number: 1, editName: 'Xbox', connected: true }, { type: 'HDMI', number: 2, connected: false },
                 { type: 'HDMI', number: 3, editName: 'PC', connected: false }, { type: 'TV', number: 1, connected: true }];
      return renderInputs();
    }
    try {
      tz.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        function tag(list, on) { return (list || []).filter(function (s) { return s.type !== 'MEDIA'; }).map(function (s) {
          return { type: s.type, number: s.number, editName: s.editName, connected: on, raw: s }; }); }
        var all = tag(info.connected, true).concat(tag(info.disconnected, false));
        all.sort(function (a, b) {
          return (a.type === 'TV') - (b.type === 'TV') || (b.connected - a.connected) || a.number - b.number;
        });
        sources = all; renderInputs();
      }, renderInputs);
    } catch (e) { renderInputs(); }
  }
  if (tz && tz.systeminfo) {
    try { tz.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', function () { loadSources(); }); } catch (e) {}
  }

  // ---- actions -------------------------------------------------------------
  function toast(text) {
    var t = $('toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.hidden = true; }, 2500);
  }

  function launch(app) {
    if (!tz || !tz.application) { return toast('Would open ' + shortName(app.name)); }
    watch(app.id);
    tz.application.launch(app.id, null, function () { watched = null; toast('Could not open ' + shortName(app.name)); });
  }

  // ---- be the home screen --------------------------------------------------
  // Samsung doesn't let third-party apps register as Home. The background service
  // (service/index.js) reclaims the screen; the launcher tells it what it opens.
  var watched = null, seenVisible = false, leaving = false;
  // Small ring buffer of home-takeover decisions, readable from the web inspector.
  var homeLog = window.__homeLog = (function () { try { return JSON.parse(localStorage.getItem('hearth.log')) || []; } catch (e) { return []; } })();
  function note(msg) {
    homeLog.push(new Date().toTimeString().slice(0, 8) + ' ' + msg);
    if (homeLog.length > 60) { homeLog.shift(); }
    try { localStorage.setItem('hearth.log', JSON.stringify(homeLog)); } catch (e) {}
  }
  note('page loaded');

  function watch(appId) {
    watched = appId; seenVisible = false; note('watch ' + watched);
    tellService('/watch?id=' + encodeURIComponent(PRELOADED[appId] || appId));
  }

  // Watching apps after they open is done by the background service (service/index.js):
  // hidden web apps are frozen on retail TVs, services aren't.
  var SERVICE = 'http://127.0.0.1:47790';
  function tellService(path) {
    if (!tz) { return; }
    var x = new XMLHttpRequest(); x.open('GET', SERVICE + path); x.timeout = 1500;
    x.onerror = x.ontimeout = function () { note('service unreachable for ' + path); startService(); };
    x.send();
  }
  function startService() {
    try {
      tz.application.launchAppControl(new tz.ApplicationControl('http://tizen.org/appcontrol/operation/service'),
        'DclHome001.Watcher', function () { note('service started'); }, function (e) { note('service start failed ' + (e && e.message)); });
    } catch (e) { note('service start threw ' + e.message); }
  }

  // The service decides when to reclaim the screen; the launcher just reports what it's doing.
  document.addEventListener('visibilitychange', function () {
    note('visibility hidden=' + document.hidden + ' watched=' + watched);
    if (!document.hidden) { watched = null; tellService('/home'); }
  });

  function reportApps() {
    tellService('/apps?ids=' + realAppIds.map(encodeURIComponent).join(','));
  }

  function startPreview() {
    previewing = true; document.body.classList.add('previewing'); clearFocus();
    toast('Previewing. Press any key to return');
  }
  function endPreview() { previewing = false; document.body.classList.remove('previewing'); $('toast').hidden = true; focusEditor(); }

  function openStore() {
    if (!tz || !tz.application) { return toast('Would open the Samsung app store'); }
    watch('org.volt.apps');
    tz.application.launch('org.volt.apps', null, function () {
      tz.application.launch('com.samsung.tv.store', null, function () { watched = null; toast('Could not open the app store'); });
    });
  }

  function useSamsungHome() {
    leaving = true; tellService('/leave');
    try { tz.application.getCurrentApplication().exit(); } catch (e) { toast('Press Home to open Samsung Home'); }
  }

  // ---- inputs: shown full screen inside the launcher, Back returns to the menu ----
  var watchingTv = false;
  function switchInput(s) {
    if (!tz || !tz.tvwindow) { return toast('Would switch to ' + sourceName(s)); }
    try {
      tz.tvwindow.setSource(s.raw || s, function () {
        tz.tvwindow.show(function () {
          watchingTv = true; document.body.classList.add('tv');
          document.documentElement.style.background = document.body.style.background = 'transparent'; window.Backgrounds.hide();
        }, function () { toast('Could not show ' + sourceName(s)); }, ['0px', '0px', '1920px', '1080px'], 'MAIN');
        renderInputs();
      }, function () { toast('Could not switch input'); }, 'MAIN');
    } catch (e) { toast('Could not switch input'); }
  }
  function leaveTv() {
    watchingTv = false; document.body.classList.remove('tv'); applyBackground();
    try { tz.tvwindow.hide(function () {}, function () {}, 'MAIN'); } catch (e) {}
  }

  // Fireplace plays a YouTube fireplace video; falls back to the built-in fire.
  function playFireplace() {
    var yt = null;
    allApps.forEach(function (a) { if (!yt && /^youtube$/i.test(a.name)) { yt = a; } });
    if (yt) { watch(yt.id); }
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
    x.onerror = x.ontimeout = function () { watched = null; window.Fireplace.open(); };
    x.send('v=' + FIRE_VIDEO);
  }

  // ---- focus: gear, then the app grid (3 per row), then inputs ----------------
  var PER_ROW = 3, scrollY = 0;
  function gridTiles() { return [].slice.call($('favorites').children); }

  function buildRows() {
    var tiles = gridTiles(), grid = [];
    for (var i = 0; i < tiles.length; i += PER_ROW) { grid.push(tiles.slice(i, i + PER_ROW)); }
    rows = [[$('gear')]].concat(grid, [[].slice.call($('inputs').children)]);
    for (var r = 0; r < rows.length; r++) { if (col[r] === undefined) { col[r] = 0; } }
    focus();
  }

  function clearFocus() {
    var prev = document.querySelectorAll('.focused');
    for (var p = 0; p < prev.length; p++) { prev[p].classList.remove('focused'); }
  }

  function focus() {
    clearFocus();
    if (editing) { return focusEditor(); }
    row = Math.max(0, Math.min(row, rows.length - 1));
    while (row > 0 && !rows[row].length) { row--; }
    var list = rows[row];
    col[row] = Math.max(0, Math.min(col[row] || 0, list.length - 1));
    var el = list[col[row]];
    el.classList.add('focused');
    // Keep the focused row on screen (only matters with more than 6 apps); transform only.
    // Measure on screen (offsetTop is relative to the nearest positioned parent, e.g. the
    // Inputs row, which made the page jump when focusing an input).
    var rect = el.getBoundingClientRect(), top = rect.top, bottom = rect.bottom;
    if (row <= 1) { scrollY = 0; }
    else if (bottom > 1040) { scrollY += bottom - 1040; }
    else if (top < 140) { scrollY -= 140 - top; }
    $('rows').style.transform = 'translate3d(0,' + (-scrollY) + 'px,0)';
  }

  function moveFocus(dr) {
    var c = col[row] || 0, r = row + dr;
    while (r > 0 && r < rows.length && !rows[r].length) { r += dr; }
    if (r < 0 || r >= rows.length) { return; }
    row = r; col[row] = c; focus();
  }

  // ---- hold OK to move a tile ----------------------------------------------
  // A short press opens the tile; holding OK lifts it, the arrows move it, OK or Back drops it.
  var moving = null, pressTimer = null, pressHandled = false;

  var CHEVRON = { left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', up: 'M5 15l7-7 7 7', down: 'M5 9l7 7 7-7' };
  // Arrows on the lifted tile, only for directions it can actually move.
  function showArrows() {
    var old = document.querySelectorAll('.move-arrow');
    for (var o = 0; o < old.length; o++) { old[o].parentNode.removeChild(old[o]); }
    if (!moving) { return; }
    var tiles = gridTiles(), i = tiles.indexOf(moving), n = tiles.length;
    var can = { left: i > 0, right: i < n - 1, up: i - PER_ROW >= 0, down: i + PER_ROW < n };
    Object.keys(can).forEach(function (dir) {
      if (!can[dir]) { return; }
      var a = document.createElement('div'); a.className = 'move-arrow ' + dir;
      a.innerHTML = '<svg viewBox="0 0 24 24"><path fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="' + CHEVRON[dir] + '"/></svg>';
      moving.appendChild(a);
    });
  }

  function startMove() {
    var el = rows[row][col[row]];
    if (!el || el.parentNode !== $('favorites')) { return false; }
    moving = el; moving.classList.add('moving'); showArrows();
    toast('Use the arrows to move it, OK to drop');
    return true;
  }
  function stepMove(delta) {
    var tiles = gridTiles(), i = tiles.indexOf(moving), j = Math.max(0, Math.min(tiles.length - 1, i + delta));
    if (j === i) { return; }
    var grid = $('favorites');
    grid.removeChild(moving);
    grid.insertBefore(moving, gridTiles()[j] || null);
    row = 1 + Math.floor(j / PER_ROW); col[row] = j % PER_ROW;
    buildRows(); moving.classList.add('moving'); showArrows();
  }
  function endMove() {
    favorites = gridTiles().map(function (t) { return t.dataset.id; });
    moving.classList.remove('moving'); moving = null; showArrows(); save();
    $('toast').hidden = true;
  }

  // ---- settings sheet: background, favorites, and the tucked-away escape ------
  var eRow = 0, eCol = [0, 0, 0];
  var SPEED_MIN = 0.25, SPEED_MAX = 3, SPEED_STEP = 0.25;
  function openEditor() { editing = true; document.body.classList.add('editing'); $('editor').hidden = false; eRow = 0; eCol = [0, 0, 0]; eKey = 'bg:' + background; renderEditor(); }
  function closeEditor() { editing = false; document.body.classList.remove('editing'); $('editor').hidden = true; save(); renderRows(); }

  function renderEditor() {
    // Animated and still themes in separate sections; the speed slider only exists for
    // animated ones and sits right under them.
    var anim = $('bg-anim'), still = $('bg-still'); anim.textContent = ''; still.textContent = '';
    var current = null;
    window.Backgrounds.list.forEach(function (b) {
      var sw = document.createElement('div'); sw.className = 'swatch' + (b.id === background ? ' on' : '');
      sw.style.background = window.Backgrounds.preview(b);
      sw.innerHTML = '<span></span>'; sw.firstChild.textContent = b.name;
      sw.dataset.key = 'bg:' + b.id;
      sw.onclick = function () { background = b.id; applyBackground(); save(); renderEditor(); };
      (b.anim ? anim : still).appendChild(sw);
      if (b.id === background) { current = b; }
    });

    var row = $('speed-row'), animated = !!(current && current.anim);
    row.hidden = !animated; row.textContent = '';
    if (animated) {
      var pct = (bgSpeed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN) * 100;
      var slider = document.createElement('div'); slider.className = 'slider'; slider.dataset.key = 'speed';
      slider.innerHTML = '<span class="slider-label">Speed</span><div class="track"><div class="fill"></div><div class="thumb"></div></div>' +
                         '<span class="slider-value"></span><span class="slider-hint">◀ ▶</span>';
      slider.querySelector('.fill').style.width = pct + '%';
      slider.querySelector('.thumb').style.left = pct + '%';
      slider.querySelector('.slider-value').textContent = bgSpeed.toFixed(2).replace(/0$/, '').replace(/\.0$/, '') + '×';
      slider.adjust = function (dir) {
        bgSpeed = Math.round(Math.max(SPEED_MIN, Math.min(SPEED_MAX, bgSpeed + dir * SPEED_STEP)) * 100) / 100;
        window.Backgrounds.setSpeed(bgSpeed); save(); renderEditor();
      };
      row.appendChild(slider);
      var pv = document.createElement('div'); pv.className = 'pill unit preview-btn'; pv.dataset.key = 'preview';
      pv.textContent = '▶  Preview'; pv.onclick = startPreview; row.appendChild(pv);
    }

    var units = $('units'); units.textContent = '';
    [['auto', 'Automatic'], ['F', '°F  Fahrenheit'], ['C', '°C  Celsius']].forEach(function (u) {
      var b = document.createElement('div'); b.className = 'pill unit' + (tempUnit === u[0] ? ' on' : ''); b.dataset.key = 'unit:' + u[0];
      b.textContent = u[1];
      b.onclick = function () { tempUnit = u[0]; save(); window.Weather.refresh(); renderEditor(); };
      units.appendChild(b);
    });
    // Input names: OK opens the TV's on-screen keyboard; empty resets to the TV's own name.
    var names = $('input-names'); names.textContent = '';
    sources.filter(function (src) { return src.type !== 'TV'; }).forEach(function (src) {
      var port = sourceName(src), pill = document.createElement('div');
      pill.className = 'pill unit name-pill'; pill.dataset.key = 'name:' + port;
      pill.innerHTML = '<span class="port"></span><input type="text" maxlength="24">';
      pill.querySelector('.port').textContent = port;
      var field = pill.querySelector('input');
      field.value = inputNames[port] || ''; field.placeholder = src.editName || 'Add a name';
      field.onchange = field.onblur = function () {
        var v = field.value.trim();
        if (v) { inputNames[port] = v; } else { delete inputNames[port]; }
        save(); renderInputs();
      };
      pill.onclick = function () { field.focus(); };
      names.appendChild(pill);
    });

    var box = $('all-apps'); box.textContent = '';
    // "Add apps" opens Samsung's app store; new apps then appear here to add to the home grid.
    var add = document.createElement('div'); add.className = 'tile addapps'; add.dataset.key = 'add';
    add.innerHTML = '<svg class="logo" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg><div class="name">Add apps<div class="sub">Samsung app store</div></div>';
    add.onclick = openStore;
    box.appendChild(add);
    allApps.forEach(function (app) {
      var t = banner(app, favorites.indexOf(app.id) >= 0 ? 'on' : '');
      t.dataset.key = 'app:' + app.id;
      t.onclick = function () {
        var i = favorites.indexOf(app.id);
        if (i >= 0) { favorites.splice(i, 1); } else { favorites.push(app.id); }
        t.classList.toggle('on', i < 0);
      };
      box.appendChild(t);
    });
    focusEditor();
  }

  function editorRows() {
    function chunk(list, n) { var out = []; for (var i = 0; i < list.length; i += n) { out.push(list.slice(i, i + n)); } return out; }
    function kids(id) { return [].slice.call($(id).children); }
    var rowsOut = chunk(kids('bg-anim'), 8);
    if (!$('speed-row').hidden) { rowsOut.push(kids('speed-row')); }
    return rowsOut.concat(chunk(kids('bg-still'), 8), [kids('units')], [kids('input-names')], chunk(kids('all-apps'), 5), [[$('escape')]]);
  }
  var eKey = null;  // focus follows the item, so re-rendering (e.g. the slider appearing) doesn't jump
  function focusEditor() {
    clearFocus();
    var r = editorRows();
    if (eKey) {
      for (var i = 0; i < r.length; i++) {
        for (var j = 0; j < r[i].length; j++) { if (r[i][j].dataset.key === eKey) { eRow = i; eCol[i] = j; } }
      }
    }
    eRow = Math.max(0, Math.min(eRow, r.length - 1));
    var c = Math.max(0, Math.min(eCol[eRow] || 0, r[eRow].length - 1));
    eCol[eRow] = c;
    var el = r[eRow][c];
    el.classList.add('focused'); eKey = el.dataset.key || null;
    $('editor').scrollTop = Math.max(0, el.offsetTop - 640);
  }
  function editorKey(k) {
    var r = editorRows(), cur = r[eRow] && r[eRow][eCol[eRow] || 0];
    if (cur && cur.adjust && (k === KEY.LEFT || k === KEY.RIGHT)) { cur.adjust(k === KEY.LEFT ? -1 : 1); return; }
    eKey = null;
    if (k === KEY.LEFT) { eCol[eRow] = (eCol[eRow] || 0) - 1; }
    else if (k === KEY.RIGHT) { eCol[eRow] = (eCol[eRow] || 0) + 1; }
    else if (k === KEY.UP) { var c = eCol[eRow] || 0; eRow--; eCol[eRow] = c; }
    else if (k === KEY.DOWN) { var c2 = eCol[eRow] || 0; eRow = Math.min(r.length - 1, eRow + 1); eCol[eRow] = c2; }
    else if (k === KEY.ENTER) { eKey = cur && cur.dataset.key; if (cur === $('escape')) { useSamsungHome(); } else if (cur && cur.onclick) { cur.onclick(); } return; }
    focusEditor();
  }

  // ---- keys ----------------------------------------------------------------
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    // Typing an input name: let the on-screen keyboard have the keys; OK/Done/Back finish.
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      if (k === KEY.ENTER || k === KEY.BACK || k === 65376 || k === 65385) { e.preventDefault(); document.activeElement.blur(); focusEditor(); }
      return;
    }
    if (window.Fireplace.isOpen()) {
      if (k === KEY.UP) { window.Fireplace.volumeUp(); }
      else if (k === KEY.DOWN) { window.Fireplace.volumeDown(); }
      else if (k === KEY.BACK || k === KEY.ESC || k === KEY.ENTER) { e.preventDefault(); window.Fireplace.close(); }
      return;
    }
    if (watchingTv) {
      if (k === KEY.BACK || k === KEY.ESC || k === KEY.ENTER) { e.preventDefault(); leaveTv(); }
      return;
    }
    if (previewing) { e.preventDefault(); endPreview(); return; }
    if (editing) {
      if (k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); closeEditor(); return; }
      editorKey(k); return;
    }
    if (moving) {
      if (k === KEY.LEFT) { stepMove(-1); }
      else if (k === KEY.RIGHT) { stepMove(1); }
      else if (k === KEY.UP) { stepMove(-PER_ROW); }
      else if (k === KEY.DOWN) { stepMove(PER_ROW); }
      else if (k === KEY.ENTER || k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); pressHandled = true; endMove(); }
      return;
    }
    if (k === KEY.ENTER) {
      // Held keys auto-repeat; only the first keydown starts the long-press timer.
      if (pressTimer || pressHandled) { return; }
      pressTimer = setTimeout(function () { pressTimer = null; pressHandled = startMove(); }, 600);
      return;
    }
    if (k === KEY.LEFT) { col[row]--; focus(); }
    else if (k === KEY.RIGHT) { col[row]++; focus(); }
    else if (k === KEY.UP) { moveFocus(-1); }
    else if (k === KEY.DOWN) { moveFocus(1); }
    else if (k === KEY.BACK) { e.preventDefault(); }
  });

  document.addEventListener('keyup', function (e) {
    if (e.keyCode !== KEY.ENTER || editing || watchingTv || window.Fireplace.isOpen()) { pressHandled = false; return; }
    if (pressTimer) {
      // Short press: open the focused tile.
      clearTimeout(pressTimer); pressTimer = null;
      var el = rows[row][col[row]];
      if (el === $('gear')) { openEditor(); } else if (el && el.onclick) { el.onclick(); }
    }
    pressHandled = false;
  });

  // ---- boot ----------------------------------------------------------------
  load(); applyBackground(); tick(); setInterval(tick, 10000); window.Weather.start(function () { return tempUnit; });
  loadApps(function () {
    if (!favorites.length) { favorites = [FIRE].concat(pickDefaults()); save(); }
    renderRows(); loadSources(); startService(); setTimeout(reportApps, 1500);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); loadSources(); } });
})();
