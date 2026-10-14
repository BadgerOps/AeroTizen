'use strict';
// Background watcher that makes the launcher behave like the TV's home screen.
//
// Hidden web apps are frozen on retail Samsung TVs, so this runs as a Tizen web service
// (Node.js runtime) instead. The launcher tells it which app it just opened; when that app
// is sent to the background by the Home button, the service relaunches the launcher.
// The TV's local API (port 8001) reports each app's `visible` flag. Samsung's stock YouTube
// (Cobalt) always reports visible=false and its DIAL endpoint refuses on-device clients, so
// it can't be watched; Back still returns to the launcher, and TizenTube works normally.
// The launcher talks to this service over http://127.0.0.1:47790.

var http = require('http');

var SELF = 'DclHome001.Home';
var PORT = 47790;
var state = { watched: null, seen: false, leaving: false, last: null };

function get(port, path, cb) {
  var host = '127.0.0.1';
  var req = http.get({ host: host, port: port, path: path, timeout: 1500 }, function (res) {
    var body = '';
    res.on('data', function (c) { body += c; });
    res.on('end', function () { state.last = host + ':' + port + ' ' + res.statusCode + ' ' + body.slice(0, 80); cb(res.statusCode === 200 ? body : null); });
  });
  req.on('error', function (e) { state.last = port + ' error ' + e.message; cb(null); });
  req.on('timeout', function () { req.destroy(); });
}

function launchSelf() {
  // The TV's local API ignores launch requests coming from the TV itself, so use the
  // Tizen application API that services also get.
  try {
    tizen.application.launch(SELF, function () { state.last = 'relaunched'; },
                             function (e) { state.last = 'relaunch failed ' + (e && e.message); });
  } catch (e) {
    state.last = 'relaunch threw ' + e.message;
  }
}

function poll() {
  if (state.leaving || !state.watched) { return; }
  var id = state.watched;
  get(8001, '/api/v2/applications/' + encodeURIComponent(id), function (body) {
    var s; try { s = JSON.parse(body); } catch (e) { return; }
    if (!s || s.visible === undefined || id !== state.watched) { return; }
    if (s.visible) { state.seen = true; }
    else if (state.seen) { state.watched = null; launchSelf(); }
  });
}

module.exports.onStart = function () {
  http.createServer(function (req, res) {
    var url = require('url').parse(req.url, true);
    if (url.pathname === '/watch') {
      state.watched = url.query.id || null;
      state.seen = false;
      state.leaving = false;
    } else if (url.pathname === '/leave') {
      state.leaving = true;
      state.watched = null;
    } else if (url.pathname === '/home') {
      state.leaving = false;
      state.watched = null;
    }
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
  }).listen(PORT, '127.0.0.1');
  setInterval(poll, 1200);
  // Started at boot (on-boot="true"): open the launcher so the TV comes up on it.
  // When the launcher itself started the service, it's already in front and this is a no-op.
  setTimeout(launchSelf, 4000);
};

module.exports.onRequest = function () {};
module.exports.onExit = function () {};
