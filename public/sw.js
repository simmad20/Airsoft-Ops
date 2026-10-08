/* Offline support: the app shell is cached on first visit so the timer still opens on a field without signal.
   Own files are fetched network-first (a new deploy shows up right away), fonts cache-first. */
const CACHE = 'airsoft-ops-v20';
const SHELL = ['./', 'index.html', 'style.css', 'classic.css', 'app.js', 'ui.js', 'modes.js', 'i18n.js', 'art.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'vendor/qrcode.js', 'audio/lines.json',
  'img/modes/bomb.webp', 'img/modes/vip.webp', 'img/modes/snd.webp', 'img/modes/br.webp', 'img/modes/hostage.webp', 'img/modes/inf.webp', 'img/modes/murder.webp', 'img/logo.webp', 'img/card-frame.webp', 'img/card-back.webp'];

/* The announcer files are listed in audio/lines.json (written by tools/generate_voice.py). */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(SHELL);
    try {
      const lines = await (await c.match('audio/lines.json')).json();
      await c.addAll(Object.keys(lines).flatMap((l) => Object.keys(lines[l]).map((k) => 'audio/' + l + '/' + k + '.mp3')));
    } catch (err) { /* voice files are also cached on first use */ }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
  }
});
