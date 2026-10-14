// Backgrounds: a curated set, static and animated. Everything is CSS or a tiny canvas;
// animated ones move soft radial-gradient "blobs" with transforms only (no blur filters),
// which TV GPUs composite cheaply. All stay dark so tiles remain readable.
window.Backgrounds = (function () {
  'use strict';

  function blob(color) { return 'radial-gradient(closest-side, ' + color + ', rgba(0,0,0,0))'; }

  var LIST = [
    // animated
    { id: 'aurora', name: 'Aurora', anim: 'blobs', base: '#04060b',
      blobs: ['rgba(32,178,150,.55)', 'rgba(110,80,220,.50)', 'rgba(40,120,220,.45)', 'rgba(60,220,140,.30)'] },
    { id: 'lava', name: 'Lava', anim: 'blobs', base: '#0a0405',
      blobs: ['rgba(230,80,20,.50)', 'rgba(200,30,80,.45)', 'rgba(255,150,40,.35)', 'rgba(140,20,120,.40)'] },
    { id: 'nebula', name: 'Nebula', anim: 'blobs', base: '#05040c', stars: true,
      blobs: ['rgba(140,60,220,.45)', 'rgba(220,70,160,.35)', 'rgba(50,90,220,.40)', 'rgba(80,40,160,.40)'] },
    { id: 'neon', name: 'Neon', anim: 'blobs', base: '#04040a',
      blobs: ['rgba(0,220,255,.40)', 'rgba(255,0,170,.38)', 'rgba(120,60,255,.40)', 'rgba(0,140,255,.30)'] },
    { id: 'calm', name: 'Calm', anim: 'blobs', base: '#07090d', slow: true,
      blobs: ['rgba(90,120,170,.35)', 'rgba(120,110,150,.30)', 'rgba(70,110,130,.30)', 'rgba(100,100,120,.25)'] },
    { id: 'starfield', name: 'Starfield', anim: 'stars', base: '#02030a' },
    { id: 'waves', name: 'Ocean Waves', anim: 'waves', base: 'linear-gradient(180deg,#03101c 0%,#05243a 100%)' },
    // static
    { id: 'black', name: 'Black', base: '#000' },
    { id: 'midnight', name: 'Midnight', base: 'radial-gradient(1500px 900px at 15% -10%, #1d2a52 0%, rgba(29,42,82,0) 60%), #04060c' },
    { id: 'graphite', name: 'Graphite', base: 'linear-gradient(180deg, #202126 0%, #0c0c0e 100%)' },
    { id: 'dusk', name: 'Dusk', base: 'linear-gradient(160deg, #2a1838 0%, #12101c 45%, #07070b 100%)' },
    { id: 'forest', name: 'Forest', base: 'radial-gradient(1400px 900px at 10% 110%, #0f3324 0%, rgba(15,51,36,0) 60%), #040907' },
    { id: 'ember', name: 'Ember', base: 'radial-gradient(1400px 800px at 85% 115%, #4a1a08 0%, rgba(74,26,8,0) 60%), #0a0605' },
    { id: 'ocean', name: 'Ocean', base: 'linear-gradient(170deg, #062a3a 0%, #04131d 55%, #02080d 100%)' },
    { id: 'sunset', name: 'Sunset', base: 'linear-gradient(170deg, #3b1440 0%, #2a0f22 40%, #3d1a0c 80%, #120806 100%)' },
    { id: 'rose', name: 'Rose', base: 'radial-gradient(1400px 900px at 80% -10%, #4a1430 0%, rgba(74,20,48,0) 60%), #0b0508' }
  ];

  var layer = null, canvasTimer = null;

  // Small static rendering used for the Settings swatches.
  function preview(b) {
    if (b.anim === 'blobs') {
      return blob(b.blobs[0]) + ' 10% 20%/70% 90% no-repeat,' + blob(b.blobs[1]) + ' 90% 80%/70% 90% no-repeat,' +
             blob(b.blobs[2]) + ' 60% 10%/60% 80% no-repeat,' + b.base;
    }
    if (b.anim === 'stars') {
      return 'radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent),' +
             'radial-gradient(1.5px 1.5px at 40% 80%, #cfe0ff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent),' +
             'radial-gradient(1px 1px at 55% 40%, #fff, transparent), ' + b.base;
    }
    if (b.anim === 'waves') { return 'linear-gradient(180deg, transparent 60%, rgba(40,140,200,.35) 60%, rgba(10,60,100,.6) 100%),' + b.base; }
    return b.base;
  }

  function clear() {
    if (canvasTimer) { clearInterval(canvasTimer); canvasTimer = null; }
    if (layer) { layer.textContent = ''; }
  }

  function addBlobs(b) {
    var spots = [[-10, -20, 1100], [55, 35, 1200], [20, 55, 1000], [70, -15, 900]];
    b.blobs.forEach(function (c, i) {
      var d = document.createElement('div');
      d.className = 'bg-blob bg-drift' + (i % 4) + (b.slow ? ' bg-slow' : '');
      d.style.left = spots[i][0] + '%'; d.style.top = spots[i][1] + '%';
      d.style.width = d.style.height = spots[i][2] + 'px';
      d.style.background = blob(c);
      layer.appendChild(d);
    });
  }

  function addStars(dense) {
    var c = document.createElement('canvas'); c.width = 960; c.height = 540; c.className = 'bg-canvas';
    layer.appendChild(c);
    var ctx = c.getContext('2d'), stars = [], n = dense ? 260 : 120;
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * 960, y: Math.random() * 540, r: Math.random() * 1.2 + 0.3,
                   v: Math.random() * 0.25 + 0.05, p: Math.random() * 6.28 });
    }
    var t = 0;
    canvasTimer = setInterval(function () {
      if (document.hidden) { return; }
      t += 0.05; ctx.clearRect(0, 0, 960, 540);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x -= s.v; if (s.x < 0) { s.x = 960; s.y = Math.random() * 540; }
        ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t + s.p));
        ctx.fillStyle = '#e8eeff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
    }, 50);
  }

  function addWaves() {
    var paths = ['M0 60 Q 240 20 480 60 T 960 60 T 1440 60 T 1920 60 V 200 H 0 Z',
                 'M0 80 Q 240 40 480 80 T 960 80 T 1440 80 T 1920 80 V 200 H 0 Z'];
    [['rgba(30,130,190,.28)', 'bg-wave1'], ['rgba(20,90,150,.38)', 'bg-wave2']].forEach(function (w, i) {
      var d = document.createElement('div'); d.className = 'bg-wave ' + w[1];
      d.innerHTML = '<svg viewBox="0 0 1920 200" preserveAspectRatio="none"><path fill="' + w[0] + '" d="' + paths[i] + '"/>' +
                    '<path fill="' + w[0] + '" transform="translate(1920 0)" d="' + paths[i] + '"/></svg>';
      layer.appendChild(d);
    });
  }

  function apply(id) {
    var b = LIST.filter(function (x) { return x.id === id; })[0] || LIST[0];
    layer = layer || document.getElementById('bg');
    clear();
    // Only the root gets a background: a body background would paint over the animated layer.
    document.documentElement.style.background = b.base; document.body.style.background = 'transparent';
    if (b.anim === 'blobs') { addBlobs(b); if (b.stars) { addStars(false); } }
    else if (b.anim === 'stars') { addStars(true); }
    else if (b.anim === 'waves') { addWaves(); }
    layer.hidden = false;
  }

  function hide() { if (layer) { layer.hidden = true; } }

  return { list: LIST, preview: preview, apply: apply, hide: hide };
})();
