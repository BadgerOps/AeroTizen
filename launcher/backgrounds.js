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
    { id: 'sakura', name: 'Sakura', anim: 'blobs', base: '#0b0609',
      blobs: ['rgba(240,120,170,.38)', 'rgba(255,180,200,.25)', 'rgba(180,80,150,.35)', 'rgba(255,140,120,.22)'] },
    { id: 'deepsea', name: 'Deep Sea', anim: 'blobs', base: '#020810', slow: true,
      blobs: ['rgba(0,110,160,.45)', 'rgba(0,160,170,.30)', 'rgba(20,60,140,.45)', 'rgba(0,90,120,.35)'] },
    { id: 'golden', name: 'Golden Hour', anim: 'blobs', base: '#0b0704',
      blobs: ['rgba(255,170,60,.40)', 'rgba(230,100,80,.32)', 'rgba(255,210,120,.22)', 'rgba(170,70,100,.30)'] },
    { id: 'synthwave', name: 'Synthwave', anim: 'blobs', base: 'linear-gradient(180deg,#0a0418 0%,#170626 60%,#2a0830 100%)',
      blobs: ['rgba(255,40,160,.38)', 'rgba(90,40,255,.40)', 'rgba(255,120,40,.25)', 'rgba(0,200,255,.22)'] },
    { id: 'arctic', name: 'Arctic', anim: 'blobs', base: '#050a10', slow: true,
      blobs: ['rgba(140,200,255,.30)', 'rgba(200,230,255,.18)', 'rgba(90,150,220,.32)', 'rgba(160,220,240,.20)'] },
    { id: 'mint', name: 'Mint', anim: 'blobs', base: '#040a08',
      blobs: ['rgba(60,220,170,.32)', 'rgba(40,160,200,.28)', 'rgba(120,230,150,.22)', 'rgba(30,120,110,.35)'] },
    { id: 'starfield', name: 'Starfield', anim: 'stars', base: '#02030a' },
    { id: 'snow', name: 'Snowfall', anim: 'particles', kind: 'snow', base: 'linear-gradient(180deg,#0a1220 0%,#121c2c 100%)' },
    { id: 'fireflies', name: 'Fireflies', anim: 'particles', kind: 'fireflies', base: 'radial-gradient(1400px 900px at 50% 120%, #0d2216 0%, rgba(13,34,22,0) 60%), #030806' },
    { id: 'rain', name: 'Rain', anim: 'particles', kind: 'rain', base: 'linear-gradient(180deg,#070b12 0%,#0e1520 100%)' },
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
    { id: 'navy', name: 'Navy', base: 'linear-gradient(170deg, #0d1b3a 0%, #060c1c 60%, #03060e 100%)' },
    { id: 'plum', name: 'Plum', base: 'radial-gradient(1500px 900px at 20% -10%, #3a1846 0%, rgba(58,24,70,0) 60%), #0a050d' },
    { id: 'mocha', name: 'Mocha', base: 'linear-gradient(165deg, #2e2018 0%, #17100c 55%, #0a0706 100%)' },
    { id: 'slate', name: 'Slate', base: 'linear-gradient(165deg, #2a3240 0%, #151a22 55%, #0a0d11 100%)' },
    { id: 'tealnight', name: 'Teal Night', base: 'radial-gradient(1400px 900px at 85% 110%, #0b3a3a 0%, rgba(11,58,58,0) 60%), #030a0b' },
    { id: 'wine', name: 'Wine', base: 'linear-gradient(165deg, #3a0f1c 0%, #1c070d 55%, #0b0306 100%)' },
    { id: 'rose', name: 'Rose', base: 'radial-gradient(1400px 900px at 80% -10%, #4a1430 0%, rgba(74,20,48,0) 60%), #0b0508' }
  ];

  var layer = null, canvasTimer = null, speed = 1, current = null;
  var BLOB_SECONDS = [11, 14, 16, 12], SLOW_SECONDS = 22, WAVE_SECONDS = [28, 18];

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
    if (b.anim === 'particles') {
      var dot = b.kind === 'fireflies' ? '#d9ff7a' : b.kind === 'rain' ? 'rgba(170,200,255,.8)' : '#fff';
      return 'radial-gradient(2px 2px at 25% 30%, ' + dot + ', transparent), radial-gradient(2px 2px at 65% 55%, ' + dot + ', transparent),' +
             'radial-gradient(2px 2px at 45% 75%, ' + dot + ', transparent), radial-gradient(2px 2px at 85% 25%, ' + dot + ', transparent), ' + b.base;
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
      d.className = 'bg-blob bg-drift' + (i % 4);
      d.style.animationDuration = ((b.slow ? SLOW_SECONDS : BLOB_SECONDS[i % 4]) / speed) + 's';
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
                   v: Math.random() * 1.1 + 0.35, p: Math.random() * 6.28 });
    }
    var t = 0;
    canvasTimer = setInterval(function () {
      if (document.hidden) { return; }
      t += 0.05 * speed; ctx.clearRect(0, 0, 960, 540);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x -= s.v * speed; if (s.x < 0) { s.x = 960; s.y = Math.random() * 540; }
        ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t + s.p));
        ctx.fillStyle = '#e8eeff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
    }, 50);
  }

  // Snow drifts down, rain streaks, fireflies wander and pulse. Small canvas, ~20 fps.
  function addParticles(kind) {
    var W = 960, H = 540, c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'bg-canvas';
    layer.appendChild(c);
    var ctx = c.getContext('2d'), ps = [], n = kind === 'rain' ? 160 : kind === 'snow' ? 140 : 60;
    function spawn(p, top) {
      p.x = Math.random() * W; p.y = top ? -10 : Math.random() * H;
      p.r = kind === 'snow' ? Math.random() * 2 + 0.6 : kind === 'rain' ? Math.random() * 0.6 + 0.4 : Math.random() * 1.6 + 1;
      p.vy = kind === 'snow' ? Math.random() * 1.0 + 0.6 : kind === 'rain' ? Math.random() * 6 + 7 : (Math.random() - 0.5) * 0.4;
      p.vx = kind === 'snow' ? (Math.random() - 0.5) * 0.4 : kind === 'rain' ? -1.2 : (Math.random() - 0.5) * 0.4;
      p.ph = Math.random() * 6.28; return p;
    }
    for (var i = 0; i < n; i++) { ps.push(spawn({}, false)); }
    var t = 0;
    canvasTimer = setInterval(function () {
      if (document.hidden) { return; }
      t += 0.05 * speed; ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (kind === 'fireflies') { p.vx += (Math.random() - 0.5) * 0.12; p.vy += (Math.random() - 0.5) * 0.12; p.vx *= 0.97; p.vy *= 0.97; }
        p.x += (p.vx + (kind === 'snow' ? Math.sin(t + p.ph) * 0.3 : 0)) * speed; p.y += p.vy * speed;
        if (p.y > H + 10 || p.x < -20 || p.x > W + 20 || (kind === 'fireflies' && p.y < -10)) { spawn(p, kind !== 'fireflies'); }
        if (kind === 'rain') {
          ctx.strokeStyle = 'rgba(170,200,255,.35)'; ctx.lineWidth = p.r;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2); ctx.stroke();
        } else {
          var a = kind === 'fireflies' ? 0.25 + 0.75 * Math.abs(Math.sin(t * 0.8 + p.ph)) : 0.8;
          ctx.globalAlpha = a; ctx.fillStyle = kind === 'fireflies' ? '#d9ff7a' : '#ffffff';
          if (kind === 'fireflies') { ctx.shadowBlur = 8; ctx.shadowColor = '#c8ff50'; }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
      }
    }, 50);
  }

  function addWaves() {
    var paths = ['M0 60 Q 240 20 480 60 T 960 60 T 1440 60 T 1920 60 V 200 H 0 Z',
                 'M0 80 Q 240 40 480 80 T 960 80 T 1440 80 T 1920 80 V 200 H 0 Z'];
    [['rgba(30,130,190,.28)', 'bg-wave1'], ['rgba(20,90,150,.38)', 'bg-wave2']].forEach(function (w, i) {
      var d = document.createElement('div'); d.className = 'bg-wave ' + w[1];
      d.style.animationDuration = (WAVE_SECONDS[i] / speed) + 's';
      d.innerHTML = '<svg viewBox="0 0 1920 200" preserveAspectRatio="none"><path fill="' + w[0] + '" d="' + paths[i] + '"/>' +
                    '<path fill="' + w[0] + '" transform="translate(1920 0)" d="' + paths[i] + '"/></svg>';
      layer.appendChild(d);
    });
  }

  function apply(id) {
    var b = LIST.filter(function (x) { return x.id === id; })[0] || LIST[0];
    current = b.id;
    layer = layer || document.getElementById('bg');
    clear();
    // Only the root gets a background: a body background would paint over the animated layer.
    document.documentElement.style.background = b.base; document.body.style.background = 'transparent';
    if (b.anim === 'blobs') { addBlobs(b); if (b.stars) { addStars(false); } }
    else if (b.anim === 'stars') { addStars(true); }
    else if (b.anim === 'waves') { addWaves(); }
    else if (b.anim === 'particles') { addParticles(b.kind); }
    layer.hidden = false;
  }

  function hide() { if (layer) { layer.hidden = true; } }

  // One multiplier for every animated background (0.5 = half speed, 2 = double).
  function setSpeed(m) { speed = m || 1; if (current) { apply(current); } }

  return { list: LIST, preview: preview, apply: apply, hide: hide, setSpeed: setSpeed };
})();
