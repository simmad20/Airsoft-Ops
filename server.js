// Bomb Timer server: serves the app from public/ and runs live sessions over WebSocket (/ws).
// The bomb phone owns the game and publishes its state; the server stores the latest state per
// session and relays it to speaker and viewer phones. All timestamps are in server time, which every
// client learns through ping/pong, so each phone can play the beeps and the explosion at the same moment.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('ok');
  }

  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.join(ROOT, path.normalize(pathname));
  if (!file.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      // Always revalidate so a new deploy reaches phones immediately; the service worker handles offline.
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

/* ---------- Sessions ---------- */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const ROLES = new Set(['bomb', 'speaker', 'viewer']);
const sessions = new Map(); // code -> { code, hostKey, state, members: Map<ws, member>, touched }

function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!sessions.has(c)) return c;
  }
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function roster(s) {
  return [...s.members.values()].map((m) => ({ id: m.id, role: m.role, name: m.name }));
}

function broadcast(s, msg, except) {
  const data = JSON.stringify(msg);
  for (const ws of s.members.keys()) if (ws !== except && ws.readyState === ws.OPEN) ws.send(data);
}

function leave(ws) {
  const s = ws.session;
  if (!s) return;
  s.members.delete(ws);
  ws.session = null;
  s.touched = Date.now();
  broadcast(s, { t: 'members', list: roster(s) });
}

function join(ws, s, role, name, id) {
  leave(ws);
  // A reconnecting phone replaces its own stale connection instead of showing up twice.
  for (const [other, m] of s.members) if (m.id === id) { s.members.delete(other); other.session = null; try { other.close(); } catch (e) {} }
  s.members.set(ws, { id, role, name });
  ws.session = s;
  ws.role = role;
  s.touched = Date.now();
  send(ws, { t: 'joined', code: s.code, role, state: s.state, now: Date.now() });
  broadcast(s, { t: 'members', list: roster(s) });
}

const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, '').slice(0, max);

function handle(ws, msg) {
  switch (msg.t) {
    case 'ping':
      return send(ws, { t: 'pong', c: msg.c, s: Date.now() });

    case 'create': {
      const s = { code: newCode(), hostKey: crypto.randomBytes(16).toString('hex'), state: null, members: new Map(), touched: Date.now() };
      sessions.set(s.code, s);
      send(ws, { t: 'created', code: s.code, hostKey: s.hostKey });
      return join(ws, s, 'bomb', clean(msg.name, 24), clean(msg.id, 40));
    }

    case 'join': {
      const s = sessions.get(clean(msg.code, 8).toUpperCase());
      if (!s) return send(ws, { t: 'error', code: 'nosession', msg: 'Session nicht gefunden. Code prüfen.' });
      let role = ROLES.has(msg.role) ? msg.role : 'viewer';
      if (role === 'bomb' && msg.hostKey !== s.hostKey) role = 'viewer';
      return join(ws, s, role, clean(msg.name, 24), clean(msg.id, 40));
    }

    case 'state': {
      const s = ws.session;
      if (!s || ws.role !== 'bomb' || !msg.state || typeof msg.state !== 'object') return;
      s.state = msg.state;
      s.touched = Date.now();
      return broadcast(s, { t: 'state', state: s.state }, ws);
    }

    case 'leave':
      return leave(ws);

    case 'end': {
      const s = ws.session;
      if (!s || ws.role !== 'bomb') return;
      broadcast(s, { t: 'ended' }, ws);
      for (const other of s.members.keys()) other.session = null;
      sessions.delete(s.code);
      return;
    }
  }
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    if (msg && typeof msg.t === 'string') handle(ws, msg);
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
});

// Drop dead connections and forget sessions nobody has used for a while.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
  const now = Date.now();
  for (const [code, s] of sessions) {
    const idle = now - s.touched;
    if ((s.members.size === 0 && idle > 3 * 3600e3) || idle > 24 * 3600e3) sessions.delete(code);
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`Bomb Timer läuft auf http://localhost:${PORT}`);
});
