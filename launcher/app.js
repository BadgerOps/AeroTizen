(function () {
  'use strict';

  var tz = window.tizen;
  var STORE = 'declutter.home.v5';
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
    { match: 'netflix', bg: '#161616', logo: 'netflix', fill: '#e50914', text: null },
    { match: 'prime video', bg: 'linear-gradient(135deg,#1a98ff,#0f4c81)', logo: 'primevideo', fill: '#ffffff', text: null },
    { match: 'spotify', bg: '#121212', logo: 'spotify', fill: '#1ed760', text: 'Spotify', ink: '#ffffff' },
    { match: 'stremio', bg: 'linear-gradient(135deg,#7b5bf5,#2b1d68)', logo: 'stremio', fill: '#ffffff', text: 'Stremio', ink: '#ffffff' },
    { match: 'max', bg: '#002be7', logo: 'max', fill: '#ffffff', text: null },
    { match: 'hulu', bg: '#1ce783', logo: 'hulu', fill: '#0b0c0f', text: null },
    { match: 'apple tv', bg: '#1c1c1e', logo: 'appletv', fill: '#ffffff', text: null },
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
  var FIRE = '__fire';
  var rows = [], row = 1, col = [0, 0, 0, 0];
  var editing = false, editIndex = 0;

  // ---- storage -------------------------------------------------------------
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE)) || {};
      favorites = s.favorites || []; appOrder = s.order || []; background = s.background || 'black';
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ favorites: favorites, order: appOrder, background: background })); } catch (e) {}
  }

  // ---- backgrounds: a small curated set, all pure CSS (no images to load) ---------
  var BACKGROUNDS = [
    { id: 'black', name: 'Black', css: '#000' },
    { id: 'midnight', name: 'Midnight', css: 'radial-gradient(1500px 900px at 15% -10%, #1d2a52 0%, rgba(29,42,82,0) 60%), #04060c' },
    { id: 'aurora', name: 'Aurora', css: 'radial-gradient(1100px 700px at 85% 0%, rgba(42,157,143,.45) 0%, rgba(42,157,143,0) 60%), radial-gradient(1000px 800px at 0% 100%, rgba(106,76,200,.40) 0%, rgba(106,76,200,0) 60%), #05060b' },
    { id: 'ember', name: 'Ember', css: 'radial-gradient(1400px 800px at 85% 115%, #4a1a08 0%, rgba(74,26,8,0) 60%), #0a0605' },
    { id: 'forest', name: 'Forest', css: 'radial-gradient(1400px 900px at 10% 110%, #0f3324 0%, rgba(15,51,36,0) 60%), #040907' },
    { id: 'dusk', name: 'Dusk', css: 'linear-gradient(160deg, #2a1838 0%, #12101c 45%, #07070b 100%)' },
    { id: 'graphite', name: 'Graphite', css: 'linear-gradient(180deg, #202126 0%, #0c0c0e 100%)' }
  ];
  function applyBackground() {
    var b = BACKGROUNDS.filter(function (x) { return x.id === background; })[0] || BACKGROUNDS[0];
    document.documentElement.style.background = b.css;
    document.body.style.background = b.css;
  }

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
    el.className = 'tile' + (extraClass ? ' ' + extraClass : '') + (b.text ? '' : ' logo-only');
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

    var apps = $('apps'); apps.textContent = '';
    otherApps().forEach(function (a) { var t = banner(a); t.dataset.id = a.id; apps.appendChild(t); });
    apps.parentNode.hidden = !apps.children.length;
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
      var label = s.editName || sourceName(s);
      var el = card(label, inputIcon(s), function () { switchInput(s); });
      if (s.editName && s.type !== 'TV') {
        var sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = sourceName(s);
        el.querySelector('.name').appendChild(sub);
      }
      if (!s.connected) { el.classList.add('off'); }
      box.appendChild(el);
    });
    $('source').textContent = current ? (current.editName || sourceName(current)) : 'Connected';
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
  // Samsung doesn't let third-party apps register as Home, so the launcher reclaims the
  // screen itself: if it's hidden without having opened anything (Home pressed here), or the
  // app it opened stops being visible (Home pressed inside that app), it relaunches itself.
  // App state comes from the TV's local API on port 8001.
  var watched = null, seenVisible = false, leaving = false;
  // Small ring buffer of home-takeover decisions, readable from the web inspector.
  var homeLog = window.__homeLog = (function () { try { return JSON.parse(localStorage.getItem('declutter.log')) || []; } catch (e) { return []; } })();
  function note(msg) {
    homeLog.push(new Date().toTimeString().slice(0, 8) + ' ' + msg);
    if (homeLog.length > 60) { homeLog.shift(); }
    try { localStorage.setItem('declutter.log', JSON.stringify(homeLog)); } catch (e) {}
  }
  note('page loaded');

  function watch(appId) {
    watched = appId; seenVisible = false; note('watch ' + watched);
    tellService('/watch?id=' + encodeURIComponent(PRELOADED[appId] || appId));
  }

  function comeBack() {
    if (leaving || !tz || !document.hidden) { return; }
    note('come back (watched=' + watched + ')');
    watched = null;
    tz.application.launch(SELF, null, function (e) { note('relaunch failed ' + (e && e.message)); });
  }

  function status(id, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', 'http://127.0.0.1:8001/api/v2/applications/' + encodeURIComponent(PRELOADED[id] || id));
    x.timeout = 800;
    x.onload = function () { var s = null; try { s = JSON.parse(x.responseText); } catch (e) {} cb(s && s.running !== undefined ? s : null); };
    x.onerror = x.ontimeout = function () { cb(null); };
    x.send();
  }

  // Which of the user's apps are running right now: { id: running }.
  function snapshot(cb) {
    var out = {}, left = allApps.length;
    if (!left) { return cb(out); }
    allApps.forEach(function (a) {
      status(a.id, function (s) { out[a.id] = !!(s && s.running); if (--left === 0) { cb(out); } });
    });
  }
  var lastRunning = {};
  function refreshSnapshot() { if (tz && !document.hidden) { snapshot(function (r) { lastRunning = r; }); } }
  setInterval(refreshSnapshot, 8000);

  // Home pressed inside an app we opened: only trust a visible -> hidden transition
  // (YouTube always reports visible=false, so for it this simply never fires).
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

  // Home pressed on the launcher itself: we were hidden without opening anything.
  // Before reclaiming the screen, make sure nothing else just started (a cast from a phone,
  // a notification): if an app that wasn't running a moment ago is running now, stand aside.
  document.addEventListener('visibilitychange', function () {
    note('visibility hidden=' + document.hidden + ' watched=' + watched);
    if (!document.hidden) { watched = null; refreshSnapshot(); tellService('/home'); return; }
    if (watched || leaving || !tz) { return; }
    setTimeout(function () {
      if (watched || !document.hidden) { return; }
      snapshot(function (now) {
        for (var id in now) {
          if (now[id] && !lastRunning[id]) { note('stand aside: ' + id + ' started'); watch(id); return; }
        }
        comeBack();
      });
    }, 350);
  });

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
          document.documentElement.style.background = document.body.style.background = 'transparent';
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

  // ---- focus ---------------------------------------------------------------
  function buildRows() {
    rows = [[$('gear')], $('favorites').children, $('apps').children, $('inputs').children];
    focus();
  }

  function clearFocus() {
    var prev = document.querySelectorAll('.focused');
    for (var p = 0; p < prev.length; p++) { prev[p].classList.remove('focused'); }
  }

  function focus() {
    clearFocus();
    if (editing) { return focusEditor(); }
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
    }
  }

  // ---- hold OK to move a tile ----------------------------------------------
  // A short press opens the tile; holding OK lifts it, Left/Right moves it, OK or Back drops it.
  var moving = null, pressTimer = null, pressHandled = false;

  function startMove() {
    if (row !== 1 && row !== 2) { return false; }
    moving = rows[row][col[row]];
    moving.classList.add('moving');
    toast('Move with ◀ ▶, press OK to drop');
    return true;
  }
  function stepMove(dir) {
    var strip = moving.parentNode, kids = [].slice.call(strip.children), i = kids.indexOf(moving), j = i + dir;
    if (j < 0 || j >= kids.length) { return; }
    if (dir > 0) { strip.insertBefore(kids[j], moving); } else { strip.insertBefore(moving, kids[j]); }
    col[row] = j; buildRows(); moving.classList.add('moving');
  }
  function endMove() {
    var ids = [].slice.call(moving.parentNode.children).map(function (t) { return t.dataset.id; });
    if (moving.parentNode === $('favorites')) { favorites = ids; } else { appOrder = ids; }
    moving.classList.remove('moving'); moving = null; save();
    $('toast').hidden = true;
  }

  // ---- settings sheet: background, favorites, and the tucked-away escape ------
  var eRow = 0, eCol = [0, 0, 0];
  function openEditor() { editing = true; $('editor').hidden = false; eRow = 0; eCol = [0, 0, 0]; renderEditor(); }
  function closeEditor() { editing = false; $('editor').hidden = true; save(); renderRows(); }

  function renderEditor() {
    var bgs = $('backgrounds'); bgs.textContent = '';
    BACKGROUNDS.forEach(function (b) {
      var sw = document.createElement('div'); sw.className = 'swatch' + (b.id === background ? ' on' : '');
      sw.style.background = b.css; sw.innerHTML = '<span></span>'; sw.firstChild.textContent = b.name;
      sw.onclick = function () { background = b.id; applyBackground(); save(); renderEditor(); };
      bgs.appendChild(sw);
    });
    var box = $('all-apps'); box.textContent = '';
    allApps.forEach(function (app) {
      var t = banner(app, favorites.indexOf(app.id) >= 0 ? 'on' : '');
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
    var apps = [].slice.call($('all-apps').children), grid = [];
    for (var i = 0; i < apps.length; i += 5) { grid.push(apps.slice(i, i + 5)); }
    return [[].slice.call($('backgrounds').children)].concat(grid, [[$('escape')]]);
  }
  function focusEditor() {
    clearFocus();
    var r = editorRows();
    eRow = Math.max(0, Math.min(eRow, r.length - 1));
    var c = Math.max(0, Math.min(eCol[eRow] || 0, r[eRow].length - 1));
    eCol[eRow] = c;
    r[eRow][c].classList.add('focused');
    var sheet = $('editor'), el = r[eRow][c];
    sheet.scrollTop = Math.max(0, el.offsetTop - 640);
  }
  function editorKey(k) {
    var r = editorRows();
    if (k === KEY.LEFT) { eCol[eRow] = (eCol[eRow] || 0) - 1; }
    else if (k === KEY.RIGHT) { eCol[eRow] = (eCol[eRow] || 0) + 1; }
    else if (k === KEY.UP) { var c = eCol[eRow] || 0; eRow--; eCol[eRow] = c; }
    else if (k === KEY.DOWN) { var c2 = eCol[eRow] || 0; eRow = Math.min(r.length - 1, eRow + 1); eCol[eRow] = c2; }
    else if (k === KEY.ENTER) { var el = r[eRow][eCol[eRow] || 0]; if (el === $('escape')) { useSamsungHome(); } else if (el.onclick) { el.onclick(); } }
    focusEditor();
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
    if (watchingTv) {
      if (k === KEY.BACK || k === KEY.ESC || k === KEY.ENTER) { e.preventDefault(); leaveTv(); }
      return;
    }
    if (editing) {
      if (k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); closeEditor(); return; }
      editorKey(k); return;
    }
    if (moving) {
      if (k === KEY.LEFT) { stepMove(-1); }
      else if (k === KEY.RIGHT) { stepMove(1); }
      else if (k === KEY.ENTER || k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); pressHandled = true; endMove(); }
      return;
    }
    if (k === KEY.ENTER) {
      // Held keys auto-repeat; only the first keydown starts the long-press timer.
      if (pressTimer || pressHandled) { return; }
      pressTimer = setTimeout(function () { pressTimer = null; pressHandled = startMove(); }, 600);
      return;
    }
    if (k === KEY.LEFT) { col[row]--; }
    else if (k === KEY.RIGHT) { col[row]++; }
    else if (k === KEY.UP) { do { row--; } while (row > 0 && !rows[row].length); row = Math.max(0, row); }
    else if (k === KEY.DOWN) { var r = row; do { r++; } while (r < rows.length && !rows[r].length); if (r < rows.length) { row = r; } }
    else if (k === KEY.BACK) { e.preventDefault(); return; }
    focus();
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
  load(); applyBackground(); tick(); setInterval(tick, 10000);
  loadApps(function () {
    if (!favorites.length) { favorites = [FIRE].concat(pickDefaults()); save(); }
    renderRows(); loadSources(); refreshSnapshot(); startService();
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); loadSources(); } });
})();
