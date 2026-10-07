/* Airsoft Ops: game loop, bomb mode, sessions (WebSocket + shared clock), sound and announcer,
   and the screens: tarot deck, lobby, game, result, session and settings.
   ui.js provides the design building blocks, modes.js the other game modes. */
(function () {
  const UI = window.UI;
  const $ = (id) => document.getElementById(id);
  const $$ = UI.$$, esc = UI.esc, ic = UI.ic;
  const tr = (k, v) => window.T(k, v);

  /* ---------- Settings ---------- */
  const DEF = {
    roundTime: 10, bombTime: 45, plantTime: 4, defuseTime: 7, half: true,
    lang: window.I18N.guess(), voiceLang: 'auto', art: 'ai', design: 'classic', voice: 'male', radio: false, voiceVol: 100, vol: 80, vibrate: true, fs: true, lat: 0, local: true
  };
  /* Settings and time cards of the other game modes live in modes.js. */
  const MD = window.MODES || { DEF: {}, TIME: {} };
  Object.keys(MD.DEF).forEach((k) => { if (!(k in DEF)) DEF[k] = MD.DEF[k]; });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let S = clone(DEF);
  try {
    const saved = JSON.parse(localStorage.getItem('abt-settings') || '{}');
    delete saved.say; delete saved.snd; /* removed settings: everything is announced and played */
    delete saved.theme; /* replaced by 'design' (Classic is the default) */
    S = Object.assign(clone(DEF), saved, { muRoles: Object.assign({}, DEF.muRoles, saved.muRoles) });
  } catch (e) {}
  function save() { try { localStorage.setItem('abt-settings', JSON.stringify(S)); } catch (e) {} }
  window.I18N.set(S.lang);

  /* Time settings: big readout cards in the lobby; a tap opens the value sheet. */
  const range = (a, b, step) => { const r = []; for (let v = a; v <= b; v += step) r.push(v); return r; };
  const mmss = (v) => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
  const TIME = {
    roundTime: {
      title: 'bomb.roundTime', desc: 'bomb.roundTimeDesc',
      values: range(0, 60, 1), presets: [0, 3, 5, 8, 10, 15, 20, 30],
      parts: (v) => (v === 0 ? [tr('u.off'), ''] : [String(v), tr('u.min')]), chip: (v) => (v === 0 ? tr('u.off') : v + ' ' + tr('u.min'))
    },
    bombTime: {
      title: 'bomb.bombTimeTitle', desc: 'bomb.bombTimeDesc',
      values: range(10, 60, 5).concat(range(75, 300, 15), range(330, 600, 30)), presets: [30, 40, 45, 60, 90, 120, 180, 300],
      parts: (v) => (v < 60 ? [String(v), tr('u.s')] : [mmss(v), tr('u.min')]), chip: (v) => (v < 60 ? v + ' ' + tr('u.s') : mmss(v))
    },
    plantTime: {
      title: 'bomb.plant', desc: 'bomb.plantDesc',
      values: range(1, 20, 1), presets: [2, 3, 4, 5, 6, 8, 10, 15],
      parts: (v) => [String(v), tr('u.s')], chip: (v) => v + ' ' + tr('u.s')
    },
    defuseTime: {
      title: 'bomb.defuse', desc: 'bomb.defuseDesc',
      values: range(1, 30, 1), presets: [3, 5, 7, 8, 10, 12, 15, 20],
      parts: (v) => [String(v), tr('u.s')], chip: (v) => v + ' ' + tr('u.s')
    }
  };
  Object.assign(TIME, MD.TIME);
  const nearest = (T, v) => T.values.reduce((bi, x, i) => (Math.abs(x - v) < Math.abs(T.values[bi] - v) ? i : bi), 0);
  Object.keys(TIME).forEach((k) => { S[k] = TIME[k].values[nearest(TIME[k], S[k])]; });

  /* ---------- Announcer ---------- */
  /* Pre-rendered male voice (public/audio, made by tools/generate_voice.py). The phone's own
     speech engine is the fallback and the "Handy" option. */
  const LINES = {
    de: {
      start: 'Runde gestartet. Angreifer, platziert die Bombe!',
      planted_a: 'Bombe platziert auf Punkt A!', planted_b: 'Bombe platziert auf Punkt B!',
      min1: 'Noch eine Minute.', s30: 'Noch dreißig Sekunden!', s10: 'Noch zehn Sekunden!',
      defused: 'Bombe entschärft.', def_win: 'Verteidiger gewinnen!', att_win: 'Angreifer gewinnen!',
      timeout: 'Zeit abgelaufen.', test: 'Lautsprechertest. Punkt A. Punkt B.'
    },
    en: {
      start: 'Round start. Attackers, plant the bomb!',
      planted_a: 'Bomb planted on site A!', planted_b: 'Bomb planted on site B!',
      min1: 'One minute remaining.', s30: 'Thirty seconds!', s10: 'Ten seconds!',
      defused: 'Bomb defused.', def_win: 'Defenders win!', att_win: 'Attackers win!',
      timeout: 'Time is up.', test: 'Speaker check. Site A. Site B.'
    }
  };
  /* Announcer language: its own setting, or the app language. */
  const lang = () => { const l = S.voiceLang && S.voiceLang !== 'auto' ? S.voiceLang : S.lang; return LINES[l] ? l : 'de'; };
  const buffers = {};   /* "de/start" -> AudioBuffer */
  const loading = {};
  function loadLines() {
    const a = ctx(); if (!a) return;
    const l = lang();
    Object.keys(LINES[l]).forEach((k) => {
      const id = l + '/' + k;
      if (buffers[id] || loading[id]) return;
      loading[id] = fetch('audio/' + id + '.mp3')
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((ab) => new Promise((res, rej) => a.decodeAudioData(ab, res, rej)))
        .then((buf) => { buffers[id] = buf; })
        .catch(() => { delete loading[id]; });
    });
  }

  const hasTTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let ttsVoices = [];
  function loadTtsVoices() { try { ttsVoices = speechSynthesis.getVoices() || []; } catch (e) {} }
  if (hasTTS) { loadTtsVoices(); try { speechSynthesis.onvoiceschanged = loadTtsVoices; } catch (e) {} }
  function pickTtsVoice(l) {
    const list = ttsVoices.filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(l));
    return list.find((v) => /male|männ|daniel|markus|yannick|stefan|thomas|alex|fred|david|guy|ryan/i.test(v.name) && !/female/i.test(v.name))
      || list.find((v) => /google|enhanced|premium|neural/i.test(v.name)) || list.find((v) => v.localService) || list[0] || null;
  }

  let voiceSrcs = [];
  function stopVoice() {
    voiceSrcs.forEach((s) => { try { s.stop(); } catch (e) {} });
    voiceSrcs = [];
    try { hasTTS && speechSynthesis.cancel(); } catch (e) {}
  }
  /* Plays one line or several back to back, e.g. speak(['defused', 'def_win']). */
  function speak(keys) {
    keys = Array.isArray(keys) ? keys : [keys];
    stopVoice();
    const l = lang();
    const bufs = keys.map((k) => buffers[l + '/' + k]);
    if (S.voice === 'male' && bufs.every(Boolean) && ctx()) return playBuffers(bufs);
    if (!hasTTS) return;
    keys.forEach((k, i) => {
      try {
        speechSynthesis.resume();
        const u = new SpeechSynthesisUtterance(LINES[l][k]);
        u.lang = l === 'de' ? 'de-DE' : 'en-US';
        const v = pickTtsVoice(l); if (v) u.voice = v;
        u.rate = i === keys.length - 1 && keys.length > 1 ? 0.92 : 1;
        u.pitch = 0.85; u.volume = S.voiceVol / 100;
        speechSynthesis.speak(u);
      } catch (e) {}
    });
  }
  function playBuffers(bufs) {
    const a = ctx();
    let t = a.currentTime + 0.03;
    if (S.radio) { squelch(t); t += 0.12; }
    bufs.forEach((buf) => {
      const s = a.createBufferSource(); s.buffer = buf;
      s.connect(S.radio ? radioIn : voiceGain);
      s.start(t); voiceSrcs.push(s);
      t += buf.duration + 0.18;
    });
    if (S.radio) squelch(t - 0.12);
  }

  /* ---------- Audio graph ---------- */
  let ac = null, master = null, voiceGain = null, radioIn = null, keep = null;
  function ctx() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} /* iPhone: play even on silent */
      ac = new C();
      master = ac.createGain(); master.connect(ac.destination);
      voiceGain = ac.createGain(); voiceGain.connect(ac.destination);
      /* Walkie-talkie: narrow band-pass plus a little drive. */
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 450;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800;
      const drive = ac.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.6 * x) / Math.tanh(2.6); }
      drive.curve = curve;
      const post = ac.createGain(); post.gain.value = 1.15;
      hp.connect(drive); drive.connect(lp); lp.connect(post); post.connect(voiceGain);
      radioIn = hp;
      applyGains();
    }
    return ac;
  }
  function audio() {
    const a = ctx(); if (!a) return null;
    if (a.state === 'suspended') a.resume();
    return a;
  }
  function applyGains() {
    if (!ac) return;
    master.gain.value = S.vol / 100;
    voiceGain.gain.value = S.voiceVol / 100;
  }
  function squelch(t) {
    const a = ctx(), len = 0.1;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.35 * (1 - i / d.length);
    const n = a.createBufferSource(); n.buffer = buf; n.connect(radioIn); n.start(t); voiceSrcs.push(n);
  }
  function tone(freq, dur, type, vol, when) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function explosion(when) {
    const a = audio(); if (!a) return null;
    const t = a.currentTime + (when || 0), len = 3.2;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const n = a.createBufferSource(); n.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(120, t + 2.6);
    const g = a.createGain(); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(f); f.connect(g); g.connect(master); n.start(t);
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.3);
    const og = a.createGain(); og.gain.setValueAtTime(1, t); og.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 1.7);
    return [n, o];
  }
  function winJingle() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.13, 'triangle', 0.4, i * 0.13));
  }
  /* A near-silent tone keeps Bluetooth boxes from dozing off and clipping the first beep. */
  function keepAlive(on) {
    const a = audio(); if (!a) return;
    if (on && !keep) {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = 40; g.gain.value = 0.002;
      o.connect(g); g.connect(a.destination); o.start(); keep = o;
    } else if (!on && keep) { try { keep.stop(); } catch (e) {} keep = null; }
  }
  /* The clock flashes with every bomb beep. */
  function flash() {
    const c = $('cClock'), led = $('led');
    led.classList.add('on'); if (c) c.classList.add('blink');
    setTimeout(() => { led.classList.remove('on'); if (c) c.classList.remove('blink'); }, 90);
  }
  function buzz(p) { if (!S.vibrate) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
  UI.setVibrate(buzz);

  /* ---------- Screen wake lock ---------- */
  let wl = null;
  async function wake() { try { if ('wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; } }
  function unwake() { try { wl && wl.release(); } catch (e) {} wl = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (inGame() || isRemote())) wake();
  });

  /* ---------- Fullscreen & app mode ---------- */
  const root = document.documentElement;
  const canFs = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isApp = () => matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function enterFs() {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!canFs || fsEl() || !req) return;
    try {
      const p = req.call(root, { navigationUI: 'hide' });
      const lock = () => { try { screen.orientation.lock('portrait').catch(() => {}); } catch (e) {} };
      p && p.then ? p.then(lock, () => {}) : lock();
    } catch (e) {}
  }
  function exitFs() {
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (fsEl() && ex) { try { const p = ex.call(document); p && p.catch && p.catch(() => {}); } catch (e) {} }
  }
  function paintFs() {
    const on = !!fsEl();
    $('icoFs').querySelector('use').setAttribute('href', on ? '#i-fsoff' : '#i-fs');
    $('btnFs').dataset.i18nAria = on ? 'fs.off' : 'fs.on';
    $('btnFs').setAttribute('aria-label', tr($('btnFs').dataset.i18nAria));
  }
  if (canFs && !isApp()) {
    $('btnFs').hidden = false;
    $('rowFs').hidden = false;
    $('btnFs').addEventListener('click', () => { fsEl() ? exitFs() : enterFs(); });
    document.addEventListener('fullscreenchange', paintFs);
    document.addEventListener('webkitfullscreenchange', paintFs);
  }

  /* No install banner: keeps Chrome's own "Add to Home screen" bar from popping up over the game. */
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); });

  /* ---------- Guard against leaving mid-round ---------- */
  function inGame() { return G.phase === 'round' || G.phase === 'planted'; }
  const toast = UI.toast;
  /* Asks "Leave page?" on reload, closing the tab or typing a new address. */
  window.addEventListener('beforeunload', (e) => { if (inGame()) { e.preventDefault(); e.returnValue = ''; } });
  /* The back button / back swipe lands on an extra history entry instead of leaving the page. */
  function armBack() { if (!(history.state && history.state.abt)) { try { history.pushState({ abt: 1 }, ''); } catch (e) {} } }
  window.addEventListener('popstate', () => {
    if (inGame()) { armBack(); toast(tr(isRemote() ? 'rem.keepOpen' : 'game.keepOpen')); }
  });

  /* ---------- Session: clock sync & connection ---------- */
  /* Every timestamp in the game state is server time. now() is this phone's estimate of it. */
  let offset = 0;
  const now = () => Date.now() + offset;
  const NET = { ws: null, role: 'solo', code: null, hostKey: null, name: '', pending: null, online: false, members: [], retry: 0, retryT: 0, samples: [], fresh: false };
  const isRemote = () => NET.role === 'speaker' || NET.role === 'viewer' || NET.role === 'player';
  const isHost = () => NET.role === 'bomb';
  const inSession = () => NET.role !== 'solo';
  const myId = (() => {
    try {
      let id = localStorage.getItem('abt-id');
      if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('abt-id', id); }
      return id;
    } catch (e) { return Math.random().toString(36).slice(2); }
  })();
  function saveSess() {
    try {
      if (inSession() && NET.code) localStorage.setItem('abt-session', JSON.stringify({ role: NET.role, code: NET.code, hostKey: NET.hostKey, name: NET.name }));
      else localStorage.removeItem('abt-session');
    } catch (e) {}
  }
  function wsSend(m) { if (NET.ws && NET.ws.readyState === 1) { NET.ws.send(JSON.stringify(m)); return true; } return false; }

  function connect() {
    if (NET.ws) return;
    let ws;
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch (e) { return retry(); }
    NET.ws = ws;
    ws.onopen = () => {
      NET.retry = 0; NET.samples = [];
      for (let i = 0; i < 6; i++) setTimeout(ping, i * 200);
      if (NET.pending === 'create') wsSend({ t: 'create', id: myId, name: NET.name });
      else if (NET.code) wsSend({ t: 'join', code: NET.code, role: NET.role, hostKey: NET.hostKey, id: myId, name: NET.name });
    };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } onMsg(m); };
    ws.onclose = () => {
      if (NET.ws === ws) NET.ws = null;
      setOnline(false);
      if (NET.code || NET.pending) retry();
    };
    ws.onerror = () => {};
  }
  function retry() {
    clearTimeout(NET.retryT);
    NET.retryT = setTimeout(connect, Math.min(8000, 400 * Math.pow(2, NET.retry++)));
  }
  function disconnect() {
    clearTimeout(NET.retryT);
    const ws = NET.ws; NET.ws = null;
    if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }
    setOnline(false);
  }
  function ping() { wsSend({ t: 'ping', c: Date.now() }); }
  setInterval(() => { if (NET.online) ping(); }, 3000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !inSession()) return;
    if (!NET.ws) { NET.retry = 0; connect(); } else for (let i = 0; i < 3; i++) setTimeout(ping, i * 200);
  });

  /* NTP-style: the sample with the shortest round trip gives the best offset estimate. */
  function onPong(m) {
    const t1 = Date.now(), rtt = t1 - m.c;
    if (rtt < 0 || rtt > 5000) return;
    NET.samples.push({ rtt, est: m.s + rtt / 2 - t1 });
    if (NET.samples.length > 12) NET.samples.shift();
    const best = NET.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    offset = NET.samples.length < 3 ? best.est : offset + (best.est - offset) * 0.5;
    NET.rtt = best.rtt;
  }

  function onMsg(m) {
    switch (m.t) {
      case 'pong': return onPong(m);
      case 'created':
        NET.pending = null; NET.code = m.code; NET.hostKey = m.hostKey; NET.role = 'bomb';
        saveSess(); paintSession();
        return;
      case 'joined': {
        NET.role = m.role; NET.code = m.code;
        if (m.role !== 'bomb') NET.hostKey = null;
        saveSess(); setOnline(true);
        if (isRemote()) {
          enterRemote();
          applyRemote(m.state);
        } else if (m.state && m.state.phase !== 'setup' && G.phase === 'setup') {
          G = m.state; /* bomb phone reloaded mid-round: pick the game back up */
          if (inGame()) { keepAlive(true); wake(); armBack(); }
        } else publish();
        paintSession(); render();
        return;
      }
      case 'state': if (isRemote()) applyRemote(m.state); return;
      case 'members': NET.members = m.list || []; paintMembers(); return;
      case 'private': if (M) { M.onPrivate(m.data); paintRemote(); } return;
      case 'ended':
        toast(tr('sess.ended'));
        return leaveSession();
      case 'error':
        if (m.code === 'nosession') {
          const joining = NET.fresh;
          leaveSession();
          if (joining) { UIS.tab = 'session'; $('joinMsg').textContent = tr('sess.notFound'); render(); }
          else toast(tr('sess.gone'));
        }
        return;
    }
  }
  function setOnline(on) {
    NET.online = on;
    if (on) NET.fresh = false;
    paintSession();
  }

  function startHost() {
    audio(); loadLines();
    NET.role = 'bomb'; NET.pending = 'create'; NET.code = null; NET.fresh = true;
    $('hostMsg').textContent = tr('sess.connecting');
    connect();
    paintSession();
  }
  function joinSession(code, role, name) {
    audio(); loadLines();
    disconnect();
    NET.role = role; NET.code = code; NET.name = name; NET.hostKey = null; NET.pending = null; NET.fresh = true;
    $('joinMsg').textContent = '';
    G = { phase: 'setup' };
    UIS.tab = 'session';
    enterRemote();
    connect();
    paintSession();
  }
  function leaveSession() {
    if (isHost()) wsSend({ t: 'end' }); else wsSend({ t: 'leave' });
    const wasRemote = isRemote();
    disconnect();
    NET.role = 'solo'; NET.code = null; NET.hostKey = null; NET.pending = null; NET.members = []; NET.fresh = false;
    offset = 0;
    saveSess();
    if (wasRemote) { exitRemote(); G = { phase: 'setup' }; stopVoice(); keepAlive(false); unwake(); UIS.tab = 'session'; }
    paintSession(); render();
  }

  /* ---------- Session screens ---------- */
  const ROLE_NAME = (r) => tr('role.' + r);
  function joinUrl() { return location.origin + location.pathname + '?s=' + NET.code; }
  let qrFor = null, codeFor = null;
  function paintSession() {
    const host = isHost(), on = inSession();
    $('net').hidden = !on;
    $('net').classList.toggle('on', NET.online);
    $('netCode').textContent = NET.code || '…';
    $('app').classList.toggle('insession', on);
    $('navDot').hidden = !on;
    const was = $('sessHost').hidden;
    $('sessIdle').hidden = host;
    $('sessHost').hidden = !host;
    if (host && was && !UI.RM && UI.router.cur === 'session') $('sessHost').animate([{ opacity: 0, transform: 'translate3d(0,8px,0)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.3,1)' });
    $('rowLocal').hidden = !host;
    $('syncNote').hidden = on;
    $$('#syncGroup .sx').forEach((r) => r.classList.toggle('off', !on));
    document.querySelector('.tab[data-tab="home"]').hidden = isRemote();
    UI.placeTabInd();
    $('homeBanner').hidden = !host;
    if (host) {
      $('hostMsg').textContent = '';
      if (codeFor !== (NET.code || '')) {
        codeFor = NET.code || '';
        $('hostCode').innerHTML = [...(NET.code || '····')].map((ch, i) => '<span style="--i:' + i + '">' + esc(ch) + '</span>').join('');
        $('hostCode').setAttribute('aria-label', tr('sess.code') + ' ' + (NET.code || '').split('').join(' '));
      }
      $('hostLink').textContent = NET.code ? joinUrl().replace(/^https?:\/\//, '') : '…';
      if (NET.code && qrFor !== NET.code && window.qrcode) {
        try {
          const q = qrcode(0, 'M'); q.addData(joinUrl()); q.make();
          $('hostQr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) + '<span class="gl"></span>';
          qrFor = NET.code;
        } catch (e) {}
      }
      paintMembers();
    }
    paintLobbySess();
    paintRemote();
    render();
  }
  function paintMembers() {
    const others = NET.members.filter((m) => m.role !== 'bomb');
    const n = (r) => others.filter((m) => m.role === r).length;
    $('mSum').innerHTML = others.length
      ? tr('sess.members', { s: '<b>' + n('speaker') + '</b>', p: '<b>' + n('player') + '</b>', v: '<b>' + n('viewer') + '</b>' })
      : esc(tr(NET.online ? 'sess.nobody' : 'sess.toServer')) + '<span class="waitdots"><i></i><i></i><i></i></span>';
    const ul = $('devs'), have = new Set();
    others.forEach((m) => {
      const key = m.id + ':' + m.role + ':' + (m.name || ''); have.add(key);
      if (ul.querySelector('[data-k="' + CSS.escape(key) + '"]')) return;
      const li = document.createElement('li'); li.dataset.k = key;
      li.innerHTML = '<span class="av ' + m.role + '">' + ic(m.role) + '</span><span class="nm">' + esc(m.name || ROLE_NAME(m.role)) + '<small>' + tr('sess.devOn') + '</small></span><span class="badge">' + esc(ROLE_NAME(m.role)) + '</span>';
      ul.appendChild(li);
    });
    [...ul.children].forEach((li) => { if (!have.has(li.dataset.k)) li.remove(); });
    $('homeBannerT').textContent = tr('home.sess', { code: NET.code || '…', n: NET.members.length });
    paintLobbySess();
    if (M) M.refreshSetup();
  }

  /* Speaker/player/viewer phones mirror the game screens read-only. */
  function enterRemote() { $('app').classList.add('remote'); wake(); keepAlive(soundOn()); }
  function exitRemote() { $('app').classList.remove('remote'); }
  function applyRemote(state) {
    G = state && typeof state === 'object' ? state : { phase: 'setup' };
    render();
  }
  function paintRemote() {
    if (!isRemote()) return;
    const r = NET.role, ok = NET.online;
    $('remConn').classList.toggle('wait', !ok);
    $('remConnT').textContent = ok ? tr('rem.connectedTo', { c: NET.code || '' }) : tr('rem.connecting');
    $('remIco').className = 'rem-ico ' + r;
    $('remIcoUse').setAttribute('href', '#i-' + r);
    $('remRole').textContent = ROLE_NAME(r);
    $('remName').textContent = NET.name ? tr('rem.as', { n: NET.name }) : tr('rem.noName');
    $('remStatus').textContent = tr(ok ? (G.phase && G.phase !== 'setup' ? 'rem.running' : 'rem.wait') : 'rem.connecting');
    $('remHint').textContent = tr({ speaker: 'rem.hintSpeaker', player: 'rem.hintPlayer' }[r] || 'rem.hintViewer');
    $('btnMyRole').hidden = !(r === 'player' && M && M.hasCard());
    $('chipT').textContent = tr(ok ? 'chip.connected' : 'chip.offline');
  }

  let joinRole = 'speaker';
  function paintSeg(seg, v) {
    const bs = $$('button', seg);
    bs.forEach((b, i) => { const on = b.dataset.v === v; b.setAttribute('aria-pressed', String(on)); if (on) seg.style.setProperty('--k', i); });
  }
  function paintRole() { paintSeg($('joinRole'), joinRole); $('roleDesc').textContent = tr('role.' + joinRole + 'Desc'); }
  $('joinRole').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    joinRole = b.dataset.v; paintRole();
    if (!UI.RM) $('roleDesc').animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: UI.EO });
  });
  $('joinCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    $('joinMsg').textContent = '';
  });
  $('joinF').addEventListener('submit', (e) => {
    e.preventDefault();
    const c = $('joinCode'), code = c.value.trim().toUpperCase();
    if (code.length !== 4) {
      c.classList.remove('bad'); void c.offsetWidth; c.classList.add('bad');
      $('joinMsg').textContent = tr('sess.codeMissing'); buzz([50, 30, 50]); c.focus(); return;
    }
    joinSession(code, joinRole, $('joinName').value.trim());
  });
  $('btnHost').addEventListener('click', startHost);
  $('btnShare').addEventListener('click', async () => {
    const url = joinUrl();
    try {
      if (navigator.share) { await navigator.share({ title: tr('sess.shareTitle', { code: NET.code }), url }); return; }
      await navigator.clipboard.writeText(url); toast(tr('sess.copied'));
    } catch (e) {}
  });
  UI.twoTap($('btnEndSession'), () => tr('sess.endConfirm'), leaveSession);
  UI.twoTap($('btnLeave'), () => tr('sess.endConfirm'), leaveSession);
  $('btnMyRole').addEventListener('click', () => M && M.openMyCard());
  $('homeBanner').addEventListener('click', () => { UIS.tab = 'session'; render(); });

  /* ---------- Hold pads: tones while holding ---------- */
  function holdTone(n) { if (soundOn()) tone(600 + n * 90, 0.05, 'sine', 0.22); }
  const holdLeft = (s) => tr('hold.left', { s: s.toFixed(1).replace('.', S.lang === 'de' ? ',' : '.') });
  function makeHold(el, o) {
    audio();
    return UI.makePad(el, Object.assign({ onStep: holdTone, left: holdLeft, keepText: () => tr('hold.keep') }, o));
  }

  /* ---------- Game state (owned by the bomb phone, or this phone alone) ---------- */
  /* G.phase: setup | round | planted | end. Times are server time (see now()). */
  let G = { phase: 'setup' };
  const rid = () => Math.random().toString(36).slice(2, 10);
  const M = window.MODES ? window.MODES.create({
    S: () => S, G: () => G, setG: (g) => { G = g; publish(); }, save, now, rid, fmt, makeHold, toast, buzz,
    isRemote, role: () => NET.role, members: () => NET.members,
    sendPrivate: (to, data) => wsSend({ t: 'private', to, data }),
    refresh: () => render(),
    abort: () => toSetup(),
    /* Secrets of the current round (e.g. the VIP target) stay on this phone only. */
    secret(id, v) {
      try {
        if (v === undefined) return (JSON.parse(localStorage.getItem('abt-secret') || '{}'))[id];
        localStorage.setItem('abt-secret', JSON.stringify({ [id]: v }));
      } catch (e) {}
      return undefined;
    }
  }) : null;
  UI.setArt((id) => M.artHTML(id));
  const isMode = (g) => !!(g && g.mode && g.mode !== 'bomb' && M && M.has(g.mode));
  function publish() {
    G.rev = (G.rev || 0) + 1;
    if (isHost()) wsSend({ t: 'state', state: G });
    render();
  }

  function startRound() {
    if (isRemote()) return;
    const err = (msg) => {
      const e = $('lbErr'), b = $('btnStart');
      if (e && view === 'lobby') e.textContent = msg; else toast(msg);
      if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
      buzz([60, 40, 60]);
    };
    if (M && M.has(S.mode)) {
      const g = M.start(S.mode, S, now(), G);
      if (g.error) return err(g.error);
      if ($('lbErr')) $('lbErr').textContent = '';
      audio(); keepAlive(true); wake();
      if (S.fs) enterFs();
      armBack();
      G = g;
      publish();
      return;
    }
    audio(); keepAlive(true); wake();
    if (S.fs) enterFs();
    armBack();
    const t = now();
    const cfg = { roundTime: S.roundTime, bombTime: S.bombTime, plantTime: S.plantTime, defuseTime: S.defuseTime, half: S.half };
    G = { mode: 'bomb', phase: 'round', id: rid(), cfg, startedAt: t, roundEnd: cfg.roundTime > 0 ? t + cfg.roundTime * 60000 : null, hold: null };
    publish();
  }
  function plant(site) {
    if (G.phase !== 'round') return;
    const t = now();
    G = Object.assign({}, G, { phase: 'planted', site, plantedAt: t, bombEnd: t + G.cfg.bombTime * 1000, hold: null, def: { base: 0, start: null } });
    publish();
  }
  function defused() {
    if (G.phase !== 'planted') return;
    const t = now();
    if (t >= G.bombEnd) return;
    G = Object.assign({}, G, { phase: 'end', def: null, result: { why: 'defused', at: t, rem: G.bombEnd - t } });
    publish();
  }
  function toSetup() {
    G = { phase: 'setup' };
    if (M) M.endReview();
    publish();
  }
  /* Explosion and timeout follow from the clock alone, so every phone reaches them at the same moment
     even if the bomb phone is out of reach. The bomb phone then records the result. */
  function derive(g, t) {
    if (isMode(g)) return M.derive(g, t);
    if (g.phase === 'planted' && t >= g.bombEnd) return Object.assign({}, g, { phase: 'end', def: null, result: { why: 'boom', at: g.bombEnd } });
    if (g.phase === 'round' && g.roundEnd && t >= g.roundEnd) return Object.assign({}, g, { phase: 'end', hold: null, result: { why: 'timeout', at: g.roundEnd } });
    return g;
  }
  function fmt(ms, tenths) {
    ms = Math.max(0, ms);
    if (tenths && ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1);
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  const holdP = (h, t) => (h ? (h.start ? Math.min(1, (h.base || 0) + (t - h.start) / h.dur) : (h.base || 0)) : 0);

  /* ---------- Navigation: tab bar, deck -> lobby, game screens ---------- */
  const UIS = { tab: 'home', lobby: false, kind: null };
  const TAB_IDX = { home: 0, lobby: 0, pass: 0, game: 0, end: 0, session: 1, remote: 1, settings: 2 };
  const INGAME = new Set(['pass', 'game', 'end']);
  function desiredScreen(g) {
    const phase = g.phase || 'setup';
    if (phase === 'setup') {
      if (isRemote()) return UIS.tab === 'settings' ? 'settings' : 'remote';
      if (UIS.tab === 'session') return 'session';
      if (UIS.tab === 'settings') return 'settings';
      return UIS.lobby || classic() ? 'lobby' : 'home';
    }
    if (phase === 'end') return 'end';
    return isMode(g) ? M.screen(g) : 'game';
  }
  function kindFor(from, to) {
    if (UIS.kind) { const k = UIS.kind; UIS.kind = null; return k; }
    if (to === 'end') return 'fade';
    if (from === 'end' && INGAME.has(to)) return 'fade';
    if (from === 'pass' && to === 'game') return 'push';
    if (from === 'game' && to === 'pass') return 'push';
    if (INGAME.has(to) && !INGAME.has(from)) return 'rise';
    if (INGAME.has(from) && !INGAME.has(to)) return 'sink';
    const a = TAB_IDX[from], b = TAB_IDX[to];
    if (a !== b) return b > a ? 'tabR' : 'tabL';
    if (from === 'home' && to === 'lobby') return 'push';
    if (from === 'lobby' && to === 'home') return 'pop';
    return 'fade';
  }
  let view = null;
  function setScreen(id) {
    if (view === id) return;
    const from = view; view = id;
    if (from == null) UI.router.show(id); else UI.router.go(id, kindFor(from, id));
  }
  let pendingFx = null;
  UI.router.hooks.enter = (id) => {
    if (id === 'home') requestAnimationFrame(() => UI.deck.size());
    if (id === 'pass' && M) M.renderPass();
    if (id === 'lobby' && !$('s-lobby').childElementCount) renderLobby(false);
  };
  UI.router.hooks.after = (id) => {
    if (id === 'home') UI.deck.size();
    if (id === 'end' && pendingFx) { const k = pendingFx; pendingFx = null; UI.endFx(k, $('eEm')); }
  };
  $$('.tab').forEach((b) => b.addEventListener('click', () => {
    const tab = b.dataset.tab;
    if (tab === 'home' && UIS.tab === 'home' && UIS.lobby && view === 'lobby' && !classic()) return backToDeck();
    UIS.tab = tab; render();
  }));
  function backToDeck() {
    if (UI.router.busy || UI.deck.choosing) return;
    UI.deck.morphOut((kind) => { UIS.lobby = false; UIS.kind = kind; render(); return true; });
  }

  /* ---------- Tarot deck ---------- */
  const deckItems = () => M.list.map((m) => ({ id: m.id, num: m.num, name: tr('m.' + m.id + '.name'), tag: tr('m.' + m.id + '.tag') }));
  UI.deck.init(deckItems(), (i) => {
    if (isRemote() || G.phase !== 'setup') return;
    S.mode = M.list[i].id; save();
    renderLobby(true);
    /* Switch to the lobby only inside morphIn: a render() in between would slide it in from the side
       and the picture would fly to the wrong place. */
    UI.deck.morphIn((kind) => { UIS.lobby = true; UIS.kind = kind; render(); return true; });
  });
  UI.deck.setIndex(Math.max(0, M.list.findIndex((m) => m.id === S.mode)));

  /* ---------- Lobby of one mode ---------- */
  const tcHTML = (k) => '<button class="tc" type="button" data-k="' + k[0] + '"><span class="tl">' + esc(tr(k[1])) + '</span><span class="tv" data-tv="' + k[0] + '"><span class="roll" data-v="' + k[0] + '"></span><small data-u="' + k[0] + '"></small></span><span class="td">' + esc(tr(k[2])) + '</span><span class="gl"></span></button>';
  function paintTC(k, dir, glint) {
    const el = document.querySelector('[data-v="' + k + '"]'); if (!el) return;
    const pr = TIME[k].parts(S[k]);
    UI.roll(el, pr[0], dir || 1);
    document.querySelector('[data-u="' + k + '"]').textContent = pr[1];
    document.querySelector('[data-tv="' + k + '"]').classList.toggle('off', pr[1] === '');
    if (glint) { const c = el.closest('.tc'); c.classList.remove('glint'); void c.offsetWidth; c.classList.add('glint'); setTimeout(() => c.classList.remove('glint'), 1400); }
  }
  function renderLobby(morph) {
    if (classic()) return renderClassic();
    const id = S.mode, m = M.info(id) || M.info('bomb');
    let h = '<div class="lb-top" data-st><button class="backbtn press" type="button" data-act="back">' + ic('back') + '<span>' + esc(tr('lobby.back')) + '</span></button><span class="lb-num">' + esc(tr('lobby.arcanum', { n: m.num })) + '</span></div>' +
      '<div class="hero ' + (morph ? '' : 'pop') + '">' + UI.heroRunes() + '<span class="hero-art aslot" data-art="' + m.id + '"></span></div>' +
      '<h1 class="hero-name" data-st>' + esc(tr('m.' + m.id + '.name')) + '</h1><p class="hero-tag" data-st>' + esc(tr('m.' + m.id + '.tag')) + '</p>' +
      '<button class="banner press" type="button" data-act="sess" id="lobbySess" hidden data-st><i></i><span></span><b></b></button>' +
      '<h3 class="sec" data-st>' + esc(tr('lobby.settings')) + '</h3><div class="tgrid" data-st>' + m.keys.map(tcHTML).join('') + '</div>';
    if (m.toggles) h += '<div class="group" data-st>' + m.toggles.map((x) => '<label class="row"><div class="txt"><div class="lbl">' + esc(tr(x[1])) + '</div><div class="desc">' + esc(tr(x[2])) + '</div></div><span class="switch"><input type="checkbox" role="switch" data-lopt="' + x[0] + '"' + (S[x[0]] ? ' checked' : '') + ' aria-label="' + esc(tr(x[1])) + '"><span></span></span></label>').join('') + '</div>';
    h += M.lobbyExtra(m.id);
    h += '<div class="how" data-st><button class="how-h" type="button" data-act="how" aria-expanded="false"><span>' + esc(tr('lobby.how')) + '</span>' + ic('down') + '</button><div class="how-b"><div><p class="how-desc">' + esc(tr('m.' + m.id + '.desc')) + '</p><ol>' +
      tr('m.' + m.id + '.how').split('|').map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol></div></div></div>';
    h += '<p class="fine" data-st id="lobbyFine"></p>';
    h += '<div class="cta"><p class="errmsg" id="lbErr" role="alert"></p><button class="btn primary big" type="button" id="btnStart" data-act="start">' + ic(m.id === 'murder' ? 'cards' : 'play') + '<span>' + esc(tr(m.id === 'murder' ? 'lobby.startMurder' : m.id === 'bomb' ? 'lobby.startBomb' : 'lobby.start')) + '</span></button></div>';
    const el = $('s-lobby');
    el.innerHTML = h;
    M.fillArt(el);
    m.keys.forEach((k) => paintTC(k[0]));
    M.bindLobby(m.id, el);
    paintLobbySess();
  }
  /* Classic design: one setup screen like the original bomb timer. Mode tiles (name and a short line),
     the settings of the chosen mode and start. Session and settings are tabs. */
  /* Classic: after picking another mode, its settings fade in softly below the mode buttons. */
  function classicSwap() {
    if (UI.RM) return;
    const el = $('s-lobby'), sel = el.querySelector('.cmode[aria-checked="true"]');
    if (sel) sel.animate([{ borderColor: '#2e363e', backgroundColor: '#1a1f24', boxShadow: 'inset 0 0 0 1px transparent' }, {}], { duration: 200, easing: 'ease-out' });
    let after = false;
    [...el.children].forEach((c) => {
      if (after && !c.hidden) c.animate([{ opacity: 0, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' });
      if (c.classList.contains('cmodes')) after = true;
    });
  }
  function renderClassic() {
    const id = M.info(S.mode) ? S.mode : 'bomb', m = M.info(id);
    let h = '<div class="intro"><h1>' + esc(tr('cl.title')) + '</h1></div>' +
      '<div class="cmodes" role="radiogroup" aria-label="' + esc(tr('cl.modes')) + '">' + M.list.map((x) => '<button class="cmode" type="button" role="radio" data-cmode="' + x.id + '" aria-checked="' + (x.id === id) + '"><b>' + esc(tr('m.' + x.id + '.name')) + '</b><span>' + esc(tr('m.' + x.id + '.tag')) + '</span></button>').join('') + '</div>' +
      '<h3 class="sec">' + esc(tr('lobby.settings')) + '</h3><div class="tgrid">' + m.keys.map(tcHTML).join('') + '</div>';
    if (m.toggles) h += '<div class="group">' + m.toggles.map((x) => '<label class="row"><div class="txt"><div class="lbl">' + esc(tr(x[1])) + '</div><div class="desc">' + esc(tr(x[2])) + '</div></div><span class="switch"><input type="checkbox" role="switch" data-lopt="' + x[0] + '"' + (S[x[0]] ? ' checked' : '') + ' aria-label="' + esc(tr(x[1])) + '"><span></span></span></label>').join('') + '</div>';
    h += M.lobbyExtra(id) +
      '<p class="errmsg" id="lbErr" role="alert"></p><button class="btn primary big" type="button" id="btnStart" data-act="start">' + esc(tr(id === 'murder' ? 'lobby.startMurder' : id === 'bomb' ? 'lobby.startBomb' : 'lobby.start')) + '</button>';
    const el = $('s-lobby'), y = el.scrollTop;
    el.innerHTML = h;
    m.keys.forEach((k) => paintTC(k[0]));
    M.bindLobby(id, el);
    el.scrollTop = y;
    paintLobbySess();
  }
  const classic = () => S.design === 'classic';
  function applyTheme() {
    $('app').classList.toggle('classic', classic());
    UI.setPlain(classic());
    renderLobby(false);
    view = null;
    render();
    requestAnimationFrame(() => { UI.placeTabInd(); if (view === 'home') UI.deck.size(); });
  }
  function paintLobbySess() {
    const b = $('lobbySess'), f = $('lobbyFine');
    if (b) {
      b.hidden = !isHost();
      b.querySelector('span').textContent = tr('lobby.sessOn', { code: NET.code || '…' });
      b.querySelector('b').textContent = NET.members.length + ' ' + tr('u.players');
    }
    if (f) f.textContent = ('wakeLock' in navigator ? tr('lobby.wake') : tr('lobby.wakeNo')) + (isHost() ? '' : ' ' + tr('lobby.sessHint'));
  }
  $('s-lobby').addEventListener('click', (e) => {
    const cm = e.target.closest('[data-cmode]');
    if (cm) { if (S.mode !== cm.dataset.cmode) { S.mode = cm.dataset.cmode; save(); renderLobby(false); classicSwap(); } return; }
    if (e.target.closest('#setBody, #sessBody')) return;
    const t = e.target.closest('[data-act],[data-k]'); if (!t) return;
    if (t.dataset.k) {
      const k = t.dataset.k, T = TIME[k];
      UI.valueSheet({ title: tr(T.title), desc: tr(T.desc), values: T.values, presets: T.presets, parts: T.parts, chip: T.chip }, S[k], (v) => {
        const old = S[k]; S[k] = v; save();
        paintTC(k, v >= old ? 1 : -1, v !== old);
        if (k === 'muMurderers') M.refreshSetup();
      });
      return;
    }
    const a = t.dataset.act;
    if (a === 'test') testSound(t, $('clTestMsg'));
    else if (a === 'back') backToDeck();
    else if (a === 'sess') { UIS.tab = 'session'; render(); }
    else if (a === 'how') { const how = t.closest('.how'); how.classList.toggle('open'); t.setAttribute('aria-expanded', String(how.classList.contains('open'))); }
    else if (a === 'start') startRound();
  });
  $('s-lobby').addEventListener('change', (e) => { if (e.target.closest('#setBody, #sessBody')) return; const k = e.target.dataset.lopt; if (k) { S[k] = e.target.checked; save(); } });

  /* ---------- Bomb screens ---------- */
  let bombBuilt = null, holds = {};
  const clockHTML = (lab, cls) => '<div class="clockwrap"><div class="label" id="cLab">' + esc(lab) + '</div><div class="clock ' + (cls || '') + '" id="cClock"></div></div>';
  function buildBomb(g) {
    const rem = isRemote(), dis = rem ? ' disabled' : '';
    let h;
    if (g.phase === 'round') {
      const hint = rem ? tr('bomb.remotePlant') : tr('bomb.padHint', { n: g.cfg.plantTime });
      h = clockHTML(g.roundEnd ? tr('bomb.roundTime') : tr('game.elapsed'), 'compact') +
        '<div class="pads">' + UI.padHTML('id="holdA" aria-label="' + esc(tr('bomb.plantA')) + '"' + dis, 'A', hint, 'site a') + UI.padHTML('id="holdB" aria-label="' + esc(tr('bomb.plantB')) + '"' + dis, 'B', hint, 'site b') + '</div>' +
        (rem ? '' : '<p class="fine center">' + esc(tr('bomb.gloves')) + '</p>');
    } else {
      h = clockHTML(tr('bomb.timer'), 'red compact') +
        '<div class="planted-head"><span class="sitebadge' + (g.site === 'B' ? ' b' : '') + '">' + esc(g.site) + '</span>' + esc(tr('bomb.planted')) + '</div>' +
        '<div class="bar"><span id="bombBar"></span></div><p class="mstatus" id="bSub"></p>' +
        '<div class="pads one">' + UI.padHTML('id="holdDef" aria-label="' + esc(tr('bomb.defuseAria')) + '"' + dis, esc(tr('bomb.defuseBig')), rem ? tr('bomb.remoteDefuse') : tr('bomb.padHint', { n: g.cfg.defuseTime }), 'defuse', g.cfg.half) + '</div>' +
        '<p class="fine center">' + esc(tr(g.cfg.half ? 'bomb.halfNote' : 'bomb.resetNote')) + '</p>';
    }
    $('gWrap').innerHTML = '<div id="bombBody" class="mbody">' + h + '</div>';
    if (M) M.invalidate();
    holds = {};
    if (!rem && g.phase === 'round') {
      const pad = (site, other) => makeHold($('hold' + site), {
        duration: () => G.cfg.plantTime,
        enabled: () => G.phase === 'round' && !(G.hold && G.hold.site && G.hold.site !== site),
        onStart: (p) => { $(other).classList.add('off'); setHold({ site, base: p, start: now(), dur: G.cfg.plantTime * 1000 }); },
        onPause: (p) => setHold({ site, base: p, start: null, dur: G.cfg.plantTime * 1000 }),
        onCancel: () => { $(other).classList.remove('off'); setHold(null); },
        onDone: () => plant(site)
      });
      holds.A = pad('A', 'holdB'); holds.B = pad('B', 'holdA');
    } else if (!rem) {
      holds.def = makeHold($('holdDef'), {
        duration: () => G.cfg.defuseTime,
        enabled: () => G.phase === 'planted',
        checkpoint: () => (G.cfg.half ? 0.5 : 0),
        onStart: (p) => { if (G.phase === 'planted') { G.def = { base: p, start: now(), dur: G.cfg.defuseTime * 1000 }; publish(); } },
        onPause: (p) => { if (G.phase === 'planted') { G.def = { base: p, start: null, dur: G.cfg.defuseTime * 1000 }; publish(); } },
        onCancel: (p) => { if (G.phase === 'planted') { G.def = { base: p, start: null, dur: G.cfg.defuseTime * 1000 }; publish(); } },
        onDone: () => defused()
      });
    }
    bombBuilt = g.id + ':' + g.phase + ':' + (rem ? 'r' : 'h');
  }
  function setHold(h) { if (G.phase === 'round') { G.hold = h; publish(); } }
  function renderBomb(g, t) {
    if (bombBuilt !== g.id + ':' + g.phase + ':' + (isRemote() ? 'r' : 'h') || !$('bombBody')) buildBomb(g);
    const gs = $('s-game');
    if (g.phase === 'round') {
      gs.classList.remove('danger', 'crit');
      UI.roll($('cClock'), g.roundEnd ? fmt(g.roundEnd - t) : fmt(t - g.startedAt), -1);
      if (isRemote()) {
        const h = g.hold, p = holdP(h, t);
        UI.padShow($('holdA'), h && h.site === 'A' ? p : 0, !!(h && h.site === 'A' && h.start));
        UI.padShow($('holdB'), h && h.site === 'B' ? p : 0, !!(h && h.site === 'B' && h.start));
      }
    } else if (g.phase === 'planted') {
      const total = g.bombEnd - g.plantedAt, rem = g.bombEnd - t;
      gs.classList.add('danger'); gs.classList.toggle('crit', rem < 10000);
      UI.roll($('cClock'), fmt(rem, true), -1);
      $('bombBar').style.transform = 'scaleX(' + Math.max(0, rem / total) + ')';
      const sub = g.roundEnd ? tr('bomb.paused', { t: fmt(g.roundEnd - g.plantedAt) }) : tr('bomb.noRound');
      if ($('bSub').textContent !== sub) $('bSub').textContent = sub;
      if (isRemote() && g.def) UI.padShow($('holdDef'), holdP(g.def, t), !!g.def.start);
    }
  }

  /* ---------- Game bar in the header ---------- */
  let barFor = null;
  function paintChrome(g, phase) {
    const mc = $('chip');
    if (phase === 'setup') {
      if (mc.className !== 'chip') mc.className = 'chip';
      if (!isRemote()) $('chipT').textContent = tr('chip.ready');
      return;
    }
    const mode = g.mode && M.info(g.mode) ? g.mode : 'bomb';
    if (barFor !== mode) {
      barFor = mode;
      const a = $('gbArt'); a.dataset.art = mode; a.innerHTML = M.artHTML(mode);
    }
    $('gbName').textContent = tr('m.' + mode + '.name');
    const chip = phase === 'end' ? ['chip.end', 'over'] : phase === 'planted' ? ['chip.planted', 'hot'] : [mode === 'bomb' ? 'chip.round' : 'chip.game', 'live'];
    const c = $('gbChip'); if (c.className !== 'chip ' + chip[1]) c.className = 'chip ' + chip[1];
    const txt = tr(chip[0]); if ($('gbChipT').textContent !== txt) $('gbChipT').textContent = txt;
    if (mc.className !== 'chip ' + chip[1]) mc.className = 'chip ' + chip[1];
    if ($('chipT').textContent !== txt) $('chipT').textContent = txt;
    $('btnQuit').hidden = isRemote();
  }
  /* "Beenden" in the game bar: two taps end the round; on the result screen one tap goes back. */
  $('btnQuit').addEventListener('click', () => {
    const b = $('btnQuit');
    if (G.phase === 'end') { toSetup(); return; }
    if (b.classList.contains('armed')) { clearTimeout(b._t); b.classList.remove('armed'); b.textContent = tr('game.end'); $('gbChip').classList.remove('armedhide'); toSetup(); return; }
    b.classList.add('armed'); b.textContent = tr('game.endConfirm'); $('gbChip').classList.add('armedhide'); buzz(30);
    b._t = setTimeout(() => { b.classList.remove('armed'); b.textContent = tr('game.end'); $('gbChip').classList.remove('armedhide'); }, 3000);
  });

  /* ---------- Rendering ---------- */
  let lastKey = null;
  function render() {
    const t = now();
    const g = derive(G, t);
    const phase = g.phase || 'setup';
    const key = (g.id || '-') + ':' + phase;
    if (key !== lastKey) { lastKey = key; enter(g, t); }
    setScreen(desiredScreen(g));
    paintChrome(g, phase);
    if (phase === 'setup') { if (isRemote()) paintRemote(); return; }
    if (phase === 'end') return;
    if (isMode(g)) { if (view === 'game') M.render(g, t); return; }
    renderBomb(g, t);
  }

  /* Event banner and the line texts of the announcer (in the app language). */
  const SAY_ICON = [[/^zone/, 'zone'], [/^drop/, 'drop'], [/^team_out/, 'skull'], [/^vip_hit|^obj_down/, 'burst'], [/^hos_freed/, 'unlock'], [/^inf/, 'virus'], [/^mu_/, 'cards'], [/^(min1|s30|s10)$/, 'hour'], [/start$|^side_swap/, 'play'], [/^planted/, 'bomb']];
  function banner(item) {
    if (item.cat === 'result') return;
    const say = item.say || [], k = say[say.length - 1];
    const L = LINES[S.lang] || LINES.de;
    const text = k ? L[k] || (LINES.de[k]) : item.sig === 'hit' ? tr('inf.turning') : '';
    if (!text) return;
    const icon = (SAY_ICON.find((x) => k && x[0].test(k)) || [0, item.sig === 'hit' ? 'virus' : 'flag'])[1];
    const kind = item.sig === 'start' || item.sig === 'jingle' ? 'green' : item.sig === 'alert' || item.sig === 'hit' || item.sig === 'low' ? 'red' : '';
    UI.evt(text, kind, icon);
  }

  /* Runs once per phase change on every phone: screen setup plus the one-shot sounds. */
  function enter(g, t) {
    const phase = g.phase || 'setup';
    const fresh = (at) => t - at < 4000;   /* late joiners skip stale announcements */
    const snd = soundOn();
    $('btnQuit').classList.remove('armed'); $('btnQuit').textContent = tr('game.end'); $('gbChip').classList.remove('armedhide');
    if (phase !== 'end') pendingFx = null;
    if (isMode(g)) return enterMode(g, t, phase);
    if (phase === 'setup') {
      stopVoice(); cancelBoom(); UI.evtOff();
      $('s-game').classList.remove('danger', 'crit');
      if (!isRemote()) { keepAlive(false); unwake(); }
      return;
    }
    keepAlive(snd || !inSession()); wake();
    if (phase === 'round') {
      P.said = {};
      if (fresh(g.startedAt)) {
        UI.evt(LINES[S.lang] ? LINES[S.lang].start : LINES.de.start, 'green', 'play');
        if (snd) { tone(880, 0.12, 'square', 0.3); tone(1320, 0.18, 'square', 0.3, 0.14); speak('start'); }
      }
    } else if (phase === 'planted') {
      if (fresh(g.plantedAt)) {
        buzz([120, 60, 120]);
        UI.evt((LINES[S.lang] || LINES.de)[g.site === 'B' ? 'planted_b' : 'planted_a'], 'red', 'bomb');
        if (snd) { tone(1500, 0.1, 'square', 0.35); tone(1500, 0.1, 'square', 0.35, 0.15); speak(g.site === 'B' ? 'planted_b' : 'planted_a'); }
      }
    } else if (phase === 'end') {
      const r = g.result || { why: 'timeout', at: t };
      const isFresh = fresh(r.at);
      UI.evtOff();
      showEndFor(g);
      if (r.why === 'defused') {
        cancelBoom();
        if (isFresh) {
          pendingFx = 'win'; buzz(200);
          if (snd) { winJingle(); setTimeout(() => { if (G.phase === 'end') speak(['defused', 'def_win']); }, 700); }
        }
      } else if (r.why === 'boom') {
        if (isFresh) {
          pendingFx = 'boom';
          if (snd && P.boomId !== g.id && t - r.at < 1500) { P.boomId = g.id; explosion(0); }
          buzz([400, 100, 400]);
          if (t - r.at < 1500) UI.boomFx();
          if (snd) setTimeout(() => { if (G.phase !== 'setup') speak('att_win'); }, Math.max(300, r.at + 2200 - now()));
        }
      } else if (isFresh) {
        pendingFx = 'win';
        if (snd) { tone(440, 0.4, 'square', 0.3); tone(330, 0.6, 'square', 0.3, 0.45); speak(['timeout', 'def_win']); }
      }
      if (!isRemote()) { unwake(); setTimeout(() => { if (G.phase === 'end') keepAlive(false); }, 6000); }
    }
  }
  /* Other game modes: their screen is built by modes.js, sounds come from G.ev and the timeline. */
  function enterMode(g, t, phase) {
    keepAlive(soundOn() || !inSession()); wake();
    $('s-game').classList.remove('danger', 'crit');
    if (phase !== 'end') return;
    UI.evtOff();
    const r = g.result || {};
    showEndFor(g);
    if (t - (r.at || t) < 4000) {
      pendingFx = M.endInfo(g).fx;
      if (r.sig === 'boom') UI.boomFx();
      announce({ say: r.say, sig: r.sig, cat: 'result' }); buzz([300, 100, 300]);
    }
    if (!isRemote()) { unwake(); setTimeout(() => { if (G.phase === 'end') keepAlive(false); }, 6000); }
  }
  /* Result screen: emblem, texts in this phone's language, stats, extra lists, buttons. */
  function showEndFor(g) {
    const r = g.result || {};
    let side, kicker, title, sub, icon, sym = null, stats = [], extra = '', again = tr('game.again'), againIcon = 'refresh';
    const playTime = Math.max(0, (r.at || now()) - (g.playAt || g.startedAt || now()));
    if (isMode(g)) {
      const txt = M.resultText(r), info = M.endInfo(g);
      side = r.side || 'none'; kicker = txt.kicker; title = txt.title; sub = txt.sub;
      icon = info.icon; sym = info.sym; stats = info.stats; extra = info.extra; again = info.again; againIcon = info.againIcon;
    } else if (r.why === 'defused') {
      side = 'def'; kicker = tr('bomb.rDefusedK'); title = tr('bomb.rDefWin'); sub = tr('bomb.rDefusedSub', { site: g.site, s: (Math.max(0, r.rem) / 1000).toFixed(1) }); icon = 'shield';
      stats = [[tr('stat.left'), fmt(r.rem)], [tr('stat.site'), g.site]];
    } else if (r.why === 'boom') {
      side = 'att'; kicker = tr('bomb.rBoomK'); title = tr('bomb.rAttWin'); sub = tr('bomb.rBoomSub', { site: g.site }); icon = 'burst';
      stats = [[tr('stat.site'), g.site]];
    } else {
      side = 'def'; kicker = tr('bomb.rTimeK'); title = tr('bomb.rDefWin'); sub = tr('bomb.rTimeSub'); icon = 'hour';
    }
    stats = stats.concat([[tr('stat.time'), fmt(playTime)]]);
    $('result').className = 'result ' + side;
    $('eK').textContent = kicker; $('eT').textContent = title; $('eS').textContent = sub || '';
    $('eIc').innerHTML = sym && window.ART ? window.ART.role(sym) : ic(icon || 'flag');
    $('eStats').innerHTML = stats.map((s) => '<div class="stat"><b>' + esc(s[1]) + '</b><span>' + esc(s[0]) + '</span></div>').join('');
    $('eX').innerHTML = extra;
    $('btnAgain').innerHTML = ic(againIcon) + '<span>' + esc(again) + '</span>';
    document.querySelector('#s-end .endbtns').hidden = isRemote();
    const em = $('eEm'); em.classList.remove('pop'); void em.offsetWidth; em.classList.add('pop');
  }
  const SIG_PAUSE = { jingle: 700, boom: 2200, low: 900, start: 350, alert: 300, hit: 300 };
  function playSig(sig) {
    if (sig === 'start') { tone(880, 0.12, 'square', 0.3); tone(1320, 0.18, 'square', 0.3, 0.14); }
    else if (sig === 'alert') { tone(1500, 0.1, 'square', 0.35); tone(1500, 0.1, 'square', 0.35, 0.15); }
    else if (sig === 'hit') { tone(990, 0.08, 'square', 0.35); tone(660, 0.16, 'square', 0.35, 0.1); }
    else if (sig === 'low') { tone(440, 0.4, 'square', 0.3); tone(330, 0.6, 'square', 0.3, 0.45); }
    else if (sig === 'jingle') winJingle();
    else if (sig === 'boom') explosion(0);
  }
  /* One announcement: { say: [lineKeys], sig, cat }. Everything is announced and played. */
  function announce(item) {
    if (item.sig === 'alert' || item.sig === 'hit') buzz([120, 60, 120]);
    banner(item);
    if (!soundOn()) return;
    playSig(item.sig);
    if (item.say && item.say.length) setTimeout(() => speak(item.say), item.sig ? (SIG_PAUSE[item.sig] || 300) : 0);
  }
  const seenEv = new Set();
  let tlId = null, tlDone = new Set();
  function scheduleMode(t) {
    (G.ev || []).forEach((e) => { if (seenEv.has(e.id)) return; seenEv.add(e.id); if (t - e.at < 4000) announce(e); });
    if (G.phase !== 'round') return;
    if (tlId !== G.id) { tlId = G.id; tlDone = new Set(); }
    const L = lat();
    M.timeline(G).forEach((it) => {
      if (tlDone.has(it.k) || t < it.at - L) return;
      tlDone.add(it.k);
      if (t - it.at < 3000) announce(it);
    });
  }

  /* ---------- Sound scheduling ---------- */
  /* Beeps and the explosion are placed on the shared clock ahead of time (look-ahead), shifted by this
     phone's box delay, so several boxes sound together. The beep pattern only depends on plant time
     and bomb time, so every phone computes the same sequence. */
  const P = { said: {}, beepId: null, beepT: 0, boomId: null, boomNodes: null, syncT: 0 };
  const LOOK = 160;
  function soundOn() { return NET.role === 'speaker' || NET.role === 'solo' || (NET.role === 'bomb' && S.local); }
  function lat() { return inSession() ? S.lat : 0; }
  function cancelBoom() {
    if (P.boomNodes) P.boomNodes.forEach((n) => { try { n.stop(); } catch (e) {} });
    P.boomNodes = null;
  }
  function schedule(t) {
    const L = lat(), snd = soundOn();
    if (isMode(G)) scheduleMode(t);
    else if (G.phase === 'planted' && t < G.bombEnd + 100) {
      const total = G.bombEnd - G.plantedAt;
      if (P.beepId !== G.id) { P.beepId = G.id; P.beepT = G.plantedAt + 900; }
      while (P.beepT < G.bombEnd && P.beepT - L <= t + LOOK) {
        const bt = P.beepT, rem = G.bombEnd - bt, r = Math.max(0, rem / total);
        const d = bt - L - t;
        if (d > -60) {
          if (snd) tone(2000 + 900 * (1 - r), 0.07, 'square', 0.35, Math.max(0, d) / 1000);
          setTimeout(flash, Math.max(0, bt - t));
        }
        P.beepT = bt + (rem < 2000 ? 90 : 110 + 890 * Math.pow(r, 0.8));
      }
      if (snd && P.boomId !== G.id && G.bombEnd - L <= t + LOOK) {
        P.boomId = G.id;
        const d = G.bombEnd - L - t;
        if (d > -1500) P.boomNodes = explosion(Math.max(0, d) / 1000);
      }
      const remL = G.bombEnd - (t + L);
      if (snd && !P.said.s30 && remL <= 30500 && G.cfg.bombTime >= 40) { P.said.s30 = 1; if (remL > 27000) speak('s30'); }
      if (snd && !P.said.s10 && remL <= 10500 && G.cfg.bombTime >= 20) { P.said.s10 = 1; if (remL > 8000) speak('s10'); }
    }
    if (!isMode(G) && G.phase === 'round' && G.roundEnd) {
      const remL = G.roundEnd - (t + L);
      if (snd && !P.said.min1 && remL <= 60000 && G.cfg.roundTime > 1) { P.said.min1 = 1; if (remL > 55000) { speak('min1'); UI.evt((LINES[S.lang] || LINES.de).min1, '', 'hour'); } }
    }
    /* Calibration: one beep on every full second of server time. */
    if ($('optSyncBeep').checked && inSession()) {
      if (P.syncT < t - 1000) P.syncT = Math.ceil((t + L) / 1000) * 1000;
      while (P.syncT - L <= t + LOOK) {
        const d = P.syncT - L - t;
        if (d > -30) {
          if (snd) tone(1760, 0.06, 'square', 0.4, Math.max(0, d) / 1000);
          setTimeout(() => { const b = $('beep'); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 160); }, Math.max(0, d));
        }
        P.syncT += 1000;
      }
    }
  }

  function tick() {
    const t = now();
    if (!isRemote()) {
      const d = derive(G, t);
      if (d !== G) { G = d; publish(); return; }
    }
    schedule(t);
    render();
  }
  setInterval(tick, 40);

  $('btnAgain').addEventListener('click', startRound);
  UI.twoTap($('btnAbort'), () => tr('game.abortConfirm'), toSetup);
  $('btnBackMode').addEventListener('click', toSetup);

  /* ---------- Settings ---------- */
  function testSound(btn, msg) {
    audio(); keepAlive(true);
    tone(2400, 0.08, 'square', 0.35); tone(2400, 0.08, 'square', 0.35, 0.25);
    loadLines();
    speak('test');
    if (msg) { msg.hidden = false; msg.textContent = tr('set.testMsg'); }
  }
  $('btnTest').addEventListener('click', () => testSound($('btnTest'), $('testMsg')));
  $('btnRemTest').addEventListener('click', () => testSound($('btnRemTest'), null));
  $('btnVoiceTest').addEventListener('click', () => { audio(); loadLines(); speak('planted_a'); });
  $('optSyncBeep').addEventListener('change', () => { audio(); P.syncT = 0; });
  $('btnToSess').addEventListener('click', () => { UIS.tab = 'session'; render(); });

  function paintRange(r) {
    const p = (r.value - r.min) / (r.max - r.min) * 100;
    r.style.setProperty('--p', p + '%');
    const o = document.querySelector('[data-out="' + r.dataset.range + '"]'); if (o) o.textContent = r.value + ' ' + o.dataset.unit;
  }
  function paintSettings() {
    $$('#setBody [data-seg]').forEach((seg) => paintSeg(seg, S[seg.dataset.seg]));
    $$('#setBody [data-opt]').forEach((el) => { el.checked = !!S[el.dataset.opt]; });
    $$('#setBody [data-range]').forEach((el) => { el.value = S[el.dataset.range]; paintRange(el); });
    $('rowArt').hidden = classic();
    $('voiceDesc').textContent = tr(S.voice === 'male' ? 'set.voiceMaleDesc' : 'set.voiceDeviceDesc');
  }
  $('setBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg] button'); if (!b) return;
    const key = b.parentElement.dataset.seg, v = b.dataset.v;
    if (S[key] === v) return;
    S[key] = v; save(); paintSettings();
    if (key === 'lang') { applyLang(); loadLines(); }
    if (key === 'voiceLang') loadLines();
    if (key === 'art') { applyArt(true); toast(tr(v === 'ai' ? 'art.ai' : 'art.vec')); }
    if (key === 'design') applyTheme();
  });
  $('setBody').addEventListener('change', (e) => { const k = e.target.dataset.opt; if (k) { S[k] = e.target.checked; save(); } });
  $('setBody').addEventListener('input', (e) => {
    const k = e.target.dataset.range; if (!k) return;
    S[k] = +e.target.value; paintRange(e.target); applyGains(); save();
  });
  UI.twoTap($('btnReset'), () => tr('set.sure'), () => {
    S = clone(DEF); save(); applyArt(true); applyTheme(); applyLang(); applyGains(); loadLines();
    toast(tr('set.resetDesc'));
  });

  /* Picture style: AI pictures or the hand-built vector art (art.js). */
  function applyArt(anim) {
    M.setArt(S.art);
    if (anim && !UI.RM) $$('.aslot').forEach((el) => { if (el.offsetParent) el.animate([{ opacity: 0, filter: 'brightness(2)' }, { opacity: 1, filter: 'none' }], { duration: 600, easing: UI.EO }); });
  }

  /* Language switch: static text via data-i18n, everything built from code gets rebuilt. */
  function applyLang() {
    window.I18N.set(S.lang);
    window.I18N.apply();
    $('btnLang').textContent = S.lang.toUpperCase();
    UI.deck.relabel(deckItems());
    paintRole(); paintSettings();
    if ($('s-lobby').childElementCount || classic()) renderLobby(false);
    if (M) M.invalidate();
    bombBuilt = null; barFor = null;
    paintSession(); paintMembers();
    const g = derive(G, now());
    if (g.phase === 'end') showEndFor(g);
    if (view === 'pass' && M) M.renderPass();
    paintChrome(g, g.phase || 'setup');
    requestAnimationFrame(UI.placeTabInd);
  }
  $('btnLang').addEventListener('click', () => {
    if (inGame()) return;
    S.lang = S.lang === 'de' ? 'en' : 'de'; save();
    applyLang(); loadLines();
  });

  applyArt(false);
  $('app').classList.toggle('classic', classic()); UI.setPlain(classic());
  applyLang();
  loadLines();
  /* Announcer texts of all modes (also the phone-voice fallback) come from audio/lines.json. */
  fetch('audio/lines.json').then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j) return;
    Object.keys(j).forEach((l) => { LINES[l] = Object.assign({}, j[l], LINES[l]); });
    loadLines();
  }).catch(() => {});

  /* Resume a saved session (page reload) or open the join screen from a shared link (?s=CODE). */
  (function boot() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('abt-session') || 'null'); } catch (e) {}
    const linkCode = (new URLSearchParams(location.search).get('s') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (linkCode) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
    if (saved && saved.code && (!linkCode || linkCode === saved.code)) {
      NET.role = saved.role; NET.code = saved.code; NET.hostKey = saved.hostKey || null; NET.name = saved.name || '';
      if (isRemote()) { enterRemote(); UIS.tab = 'session'; }
      connect();
    } else if (linkCode) {
      if (saved) saveSess();
      $('joinCode').value = linkCode;
      UIS.tab = 'session';
    }
    UI.V.resize();
    paintSession();
    render();
    requestAnimationFrame(() => {
      UI.deck.size(); UI.placeTabInd(); if (view === 'home') UI.deck.deal();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => UI.placeTabInd());
  })();

  /* ---------- Offline support (PWA) ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
