(function () {
  const $ = (id) => document.getElementById(id);
  const tr = (k, v) => window.T(k, v);

  /* ---------- Settings ---------- */
  const DEF = {
    roundTime: 10, bombTime: 45, plantTime: 4, defuseTime: 7, half: true,
    lang: window.I18N.guess(), voiceLang: 'auto', art: 'ai', voice: 'male', radio: false, voiceVol: 100, vol: 80, vibrate: true, fs: true, lat: 0, local: true,
    say: { start: true, planted: true, min1: true, bomb: true, result: true },
    snd: { tick: true, hold: true, signal: true, boom: true, jingle: true }
  };
  /* Settings and time cards of the other game modes live in modes.js. */
  const MD = window.MODES || { DEF: {}, TIME: {} };
  Object.keys(MD.DEF).forEach((k) => { if (!(k in DEF)) DEF[k] = MD.DEF[k]; });
  DEF.say.events = true;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let S = clone(DEF);
  try {
    const saved = JSON.parse(localStorage.getItem('abt-settings') || '{}');
    S = Object.assign(clone(DEF), saved, {
      say: Object.assign({}, DEF.say, saved.say),
      snd: Object.assign({}, DEF.snd, saved.snd),
      muRoles: Object.assign({}, DEF.muRoles, saved.muRoles)
    });
  } catch (e) {}
  function save() { try { localStorage.setItem('abt-settings', JSON.stringify(S)); } catch (e) {} }
  window.I18N.set(S.lang);

  /* Time settings: big readout cards; tapping one opens a bottom sheet with slider, +/- (hold to repeat) and presets. */
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
  function readout(el, T, v) {
    const [num, unit] = T.parts(v);
    el.textContent = num;
    if (unit) { const u = document.createElement('small'); u.textContent = unit; el.appendChild(u); }
    el.classList.toggle('off', unit === '');
  }

  const painters = [];
  document.querySelectorAll('.tcard').forEach((card) => {
    const key = card.dataset.key, T = TIME[key];
    S[key] = T.values[nearest(T, S[key])];
    painters.push(() => readout(card.querySelector('.tv'), T, S[key]));
    card.addEventListener('click', () => openSheet(key));
  });

  let shKey = null, shLast = null;
  const shRange = $('shRange');
  function shPaint() {
    const T = TIME[shKey], i = T.values.indexOf(S[shKey]);
    readout($('shOut'), T, S[shKey]);
    shRange.value = i;
    shRange.style.setProperty('--p', (i / (T.values.length - 1)) * 100 + '%');
    $('shPresets').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === S[shKey])));
  }
  function shSet(i) {
    const T = TIME[shKey];
    i = Math.max(0, Math.min(T.values.length - 1, i));
    if (T.values[i] === S[shKey]) return;
    S[shKey] = T.values[i];
    save(); shPaint(); painters.forEach((p) => p()); updateHints();
    try { navigator.vibrate && S.vibrate && navigator.vibrate(4); } catch (e) {}
  }
  function openSheet(key) {
    shKey = key; shLast = document.activeElement;
    const T = TIME[key];
    $('shTitle').textContent = tr(T.title);
    $('shDesc').textContent = tr(T.desc);
    shRange.max = T.values.length - 1;
    $('shMin').textContent = T.chip(T.values[0]);
    $('shMax').textContent = T.chip(T.values[T.values.length - 1]);
    const pre = $('shPresets'); pre.textContent = '';
    T.presets.forEach((v) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.v = v; b.textContent = T.chip(v);
      b.addEventListener('click', () => shSet(T.values.indexOf(v)));
      pre.appendChild(b);
    });
    shPaint();
    $('sheetBg').hidden = false;
    $('shDone').focus({ preventScroll: true });
  }
  function closeSheet() {
    $('sheetBg').hidden = true;
    if (shLast && shLast.focus) shLast.focus({ preventScroll: true });
  }
  shRange.addEventListener('input', () => shSet(+shRange.value));
  $('shDone').addEventListener('click', closeSheet);
  $('shClose').addEventListener('click', closeSheet);
  $('sheetBg').addEventListener('click', (e) => { if (e.target === $('sheetBg')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheetBg').hidden) closeSheet(); });
  document.querySelectorAll('.rbtn').forEach((b) => {
    const d = +b.dataset.d;
    const bump = () => shSet(TIME[shKey].values.indexOf(S[shKey]) + d);
    let t = 0, n = 0;
    const stop = () => { clearTimeout(t); t = 0; };
    const loop = () => { bump(); n++; t = setTimeout(loop, n > 8 ? 70 : 140); };
    b.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault(); stop(); n = 0; bump();
      t = setTimeout(loop, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', (e) => { if (e.detail === 0) bump(); }); /* keyboard */
  });

  /* Generic bindings for switches, segmented buttons and sliders. */
  function bindAll() {
    document.querySelectorAll('[data-opt]').forEach((el) => { el.checked = !!S[el.dataset.opt]; });
    document.querySelectorAll('[data-say]').forEach((el) => { el.checked = !!S.say[el.dataset.say]; });
    document.querySelectorAll('[data-snd]').forEach((el) => { el.checked = !!S.snd[el.dataset.snd]; });
    document.querySelectorAll('[data-range]').forEach((el) => { el.value = S[el.dataset.range]; });
    document.querySelectorAll('[data-seg]').forEach((seg) => {
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S[seg.dataset.seg])));
    });
    painters.forEach((p) => p());
    updateHints();
    if (M) M.paintSetup(M.info(S.mode) ? S.mode : 'bomb');
    $('latVal').textContent = S.lat + ' ms';
    $('voiceDesc').textContent = tr(S.voice === 'male' ? 'set.voiceMaleDesc' : 'set.voiceDeviceDesc');
  }
  document.querySelectorAll('[data-opt]').forEach((el) => el.addEventListener('change', () => { S[el.dataset.opt] = el.checked; save(); updateHints(); }));
  document.querySelectorAll('[data-say]').forEach((el) => el.addEventListener('change', () => { S.say[el.dataset.say] = el.checked; save(); }));
  document.querySelectorAll('[data-snd]').forEach((el) => el.addEventListener('change', () => { S.snd[el.dataset.snd] = el.checked; save(); }));
  document.querySelectorAll('[data-range]').forEach((el) => el.addEventListener('input', () => { S[el.dataset.range] = +el.value; applyGains(); save(); $('latVal').textContent = S.lat + ' ms'; }));
  document.querySelectorAll('[data-seg]').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    S[seg.dataset.seg] = b.dataset.v; save();
    if (seg.dataset.seg === 'lang') applyLang(); else bindAll();
    if (seg.dataset.seg === 'art') applyArt();
    if (seg.dataset.seg === 'lang' || seg.dataset.seg === 'voiceLang') loadLines();
  })));

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
  function flash() {
    const led = $('led'); led.classList.add('on'); document.body.classList.add('pulse');
    setTimeout(() => { led.classList.remove('on'); document.body.classList.remove('pulse'); }, 80);
  }
  function buzz(p) { if (!S.vibrate) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

  /* ---------- Screen wake lock ---------- */
  let wl = null;
  async function wake() { try { if ('wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; } }
  function unwake() { try { wl && wl.release(); } catch (e) {} wl = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (inGame() || isRemote())) wake();
  });
  if (!('wakeLock' in navigator)) $('wakeNote').dataset.i18n = 'lobby.wakeNo';

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
    $('icoFsOn').hidden = on; $('icoFsOff').hidden = !on;
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
  let toastT = 0;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3500);
  }
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
      case 'private': if (M) M.onPrivate(m.data); return;
      case 'ended':
        toast(tr('sess.ended'));
        return leaveSession();
      case 'error':
        if (m.code === 'nosession') {
          const joining = NET.fresh;
          leaveSession();
          if (joining) { UI.tab = 'session'; $('joinMsg').textContent = tr('sess.notFound'); render(); }
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
    UI.tab = 'session';
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
    if (wasRemote) { exitRemote(); G = { phase: 'setup' }; stopVoice(); keepAlive(false); unwake(); UI.tab = 'session'; }
    paintSession(); render();
  }

  /* ---------- Session UI ---------- */
  const ROLE_NAME = (r) => tr('role.' + r);
  function joinUrl() { return location.origin + location.pathname + '?s=' + NET.code; }
  let qrFor = null;
  function paintSession() {
    const host = isHost();
    $('net').hidden = !inSession();
    document.body.classList.toggle('insession', inSession());
    $('net').classList.toggle('on', NET.online);
    $('netCode').textContent = NET.code || '…';
    $('sessIdle').hidden = host;
    $('sessHost').hidden = !host;
    $('navDot').hidden = !inSession();
    $('navDot').classList.toggle('on', NET.online);
    $('syncHead').hidden = $('syncGroup').hidden = !inSession();
    $('rowLocal').hidden = !host;
    const n = NET.members.length;
    $('sessBanner').hidden = !host;
    $('sessBannerText').textContent = tr('home.sess', { code: NET.code || '…', n });
    $('lobbySess').textContent = host ? tr('lobby.sessOn', { code: NET.code || '…' }) : tr('lobby.sessHint');
    if (host) {
      $('hostCode').textContent = NET.code || '····';
      $('hostMsg').textContent = '';
      if (NET.code && qrFor !== NET.code && window.qrcode) {
        try {
          const q = qrcode(0, 'M'); q.addData(joinUrl()); q.make();
          $('hostQr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
          qrFor = NET.code;
        } catch (e) {}
      }
      paintMembers();
    }
    if (isRemote()) {
      $('remRole').textContent = ROLE_NAME(NET.role);
      $('remCode').textContent = NET.code || '····';
      $('remHint').textContent = tr({ speaker: 'rem.hintSpeaker', player: 'rem.hintPlayer' }[NET.role] || 'rem.hintViewer');
      if (M) M.paintRemote();
    }
    render();
  }
  function paintMembers() {
    const others = NET.members.filter((m) => m.role !== 'bomb');
    const box = $('members'); box.textContent = '';
    const n = (r) => others.filter((m) => m.role === r).length;
    const head = document.createElement('div');
    head.className = 'mhead';
    head.textContent = others.length
      ? tr('sess.members', { s: n('speaker'), p: n('player'), v: n('viewer') })
      : tr(NET.online ? 'sess.nobody' : 'sess.toServer');
    box.appendChild(head);
    others.forEach((m) => {
      const c = document.createElement('span');
      c.className = 'mchip ' + m.role;
      c.textContent = ({ speaker: '🔊 ', player: '🎭 ' }[m.role] || '👁 ') + (m.name || ROLE_NAME(m.role));
      box.appendChild(c);
    });
    $('sessBannerText').textContent = tr('home.sess', { code: NET.code || '…', n: NET.members.length });
    if (M) M.refreshSetup();
  }

  /* Speaker/player/viewer phones mirror the game screens read-only. */
  function enterRemote() {
    document.body.classList.add('remote');
    wake(); keepAlive(soundOn());
  }
  function exitRemote() {
    document.body.classList.remove('remote');
  }
  function applyRemote(state) {
    G = state && typeof state === 'object' ? state : { phase: 'setup' };
    render();
  }

  let joinRole = 'speaker';
  function paintRole() {
    $('joinRole').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === joinRole)));
    $('roleDesc').textContent = tr('role.' + joinRole + 'Desc');
  }
  $('joinRole').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { joinRole = b.dataset.v; paintRole(); }));
  paintRole();
  $('joinCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    $('joinMsg').textContent = '';
  });
  $('btnJoin').addEventListener('click', () => {
    const code = $('joinCode').value.trim().toUpperCase();
    if (code.length !== 4) { $('joinMsg').textContent = tr('sess.codeMissing'); return; }
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
  $('btnLeave').addEventListener('click', leaveSession);

  /* ---------- Hold-to-act buttons ---------- */
  function makeHold(el, o) {
    let raf = 0, startT = 0, base = 0, active = false, lastStep = -1;
    const h = { progress: 0 };
    const paint = () => el.style.setProperty('--p', h.progress);
    function frame(t) {
      if (!active) return;
      h.progress = Math.min(1, base + (t - startT) / (o.duration() * 1000));
      paint();
      const stepN = Math.floor(h.progress * 8);
      if (stepN !== lastStep) { lastStep = stepN; if (S.snd.hold && soundOn()) tone(600 + stepN * 90, 0.05, 'sine', 0.22); }
      if (h.progress >= 1) { active = false; el.classList.remove('holding'); o.onDone(); return; }
      raf = requestAnimationFrame(frame);
    }
    function down(e) {
      if (el.disabled || active || isRemote()) return;
      if (e.cancelable) e.preventDefault();
      if (e.pointerId != null) { try { el.setPointerCapture(e.pointerId); } catch (_) {} }
      audio();
      active = true; base = h.progress; startT = performance.now(); lastStep = -1;
      el.classList.add('holding');
      o.onStart && o.onStart(h.progress);
      raf = requestAnimationFrame(frame);
    }
    function up() {
      if (!active) return;
      active = false; cancelAnimationFrame(raf); el.classList.remove('holding');
      const cp = o.checkpoint ? o.checkpoint() : 0;
      h.progress = (cp && h.progress >= cp) ? cp : 0;
      paint();
      o.onCancel && o.onCancel(h.progress);
    }
    h.reset = () => { active = false; cancelAnimationFrame(raf); el.classList.remove('holding'); h.progress = 0; paint(); };
    el.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => el.addEventListener(ev, up));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down(e); });
    el.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    return h;
  }

  const holdA = makeHold($('holdA'), {
    duration: () => G.cfg.plantTime,
    onStart: () => { $('holdB').disabled = true; setHold({ site: 'A', start: now(), dur: G.cfg.plantTime * 1000 }); },
    onCancel: () => { $('holdB').disabled = false; setHold(null); },
    onDone: () => plant('A')
  });
  const holdB = makeHold($('holdB'), {
    duration: () => G.cfg.plantTime,
    onStart: () => { $('holdA').disabled = true; setHold({ site: 'B', start: now(), dur: G.cfg.plantTime * 1000 }); },
    onCancel: () => { $('holdA').disabled = false; setHold(null); },
    onDone: () => plant('B')
  });
  const holdDef = makeHold($('holdDefuse'), {
    duration: () => G.cfg.defuseTime,
    checkpoint: () => (G.cfg.half ? 0.5 : 0),
    onStart: (p) => { if (G.phase === 'planted') { G.def = { base: p, start: now(), dur: G.cfg.defuseTime * 1000 }; publish(); } },
    onCancel: (p) => { if (G.phase === 'planted') { G.def = { base: p, start: null }; publish(); } },
    onDone: () => defused()
  });
  function setHold(h) { if (G.phase === 'round') { G.hold = h; publish(); } }

  /* ---------- Game state (owned by the bomb phone, or this phone alone) ---------- */
  /* G.phase: setup | round | planted | end. Times are server time (see now()). */
  let G = { phase: 'setup' };
  const rid = () => Math.random().toString(36).slice(2, 10);
  const M = window.MODES ? window.MODES.create({
    S: () => S, G: () => G, setG: (g) => { G = g; publish(); }, save, now, rid, fmt, makeHold, toast, buzz,
    isRemote, role: () => NET.role, members: () => NET.members,
    sendPrivate: (to, data) => wsSend({ t: 'private', to, data }),
    /* Secrets of the current round (e.g. the VIP target) stay on this phone only. */
    secret(id, v) {
      try {
        if (v === undefined) return (JSON.parse(localStorage.getItem('abt-secret') || '{}'))[id];
        localStorage.setItem('abt-secret', JSON.stringify({ [id]: v }));
      } catch (e) {}
      return undefined;
    }
  }) : null;
  const isMode = (g) => !!(g && g.mode && g.mode !== 'bomb' && M && M.has(g.mode));
  /* Home: tap a mode card to open its lobby. */
  document.querySelectorAll('#modeGrid .modecard').forEach((b) => b.addEventListener('click', () => {
    S.mode = b.dataset.mode; save(); M.paintSetup(S.mode); updateHints();
    UI.lobby = true; render();
  }));
  function publish() {
    G.rev = (G.rev || 0) + 1;
    if (isHost()) wsSend({ t: 'state', state: G });
    render();
  }

  function startRound() {
    if (isRemote()) return;
    if (M && M.has(S.mode)) {
      const g = M.start(S.mode, S, now(), G);
      if (g.error) { toast(g.error); return; }
      audio(); keepAlive(true); wake();
      if (S.fs) enterFs();
      armBack();
      holdA.reset(); holdB.reset(); holdDef.reset();
      G = g;
      publish();
      return;
    }
    audio(); keepAlive(true); wake();
    if (S.fs) enterFs();
    armBack();
    const t = now();
    const cfg = { roundTime: S.roundTime, bombTime: S.bombTime, plantTime: S.plantTime, defuseTime: S.defuseTime, half: S.half };
    holdA.reset(); holdB.reset(); holdDef.reset();
    $('holdA').disabled = false; $('holdB').disabled = false;
    G = { phase: 'round', id: rid(), cfg, startedAt: t, roundEnd: cfg.roundTime > 0 ? t + cfg.roundTime * 60000 : null, hold: null };
    publish();
  }
  function plant(site) {
    if (G.phase !== 'round') return;
    const t = now();
    holdDef.reset();
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
    holdA.reset(); holdB.reset(); holdDef.reset();
    G = { phase: 'setup' };
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

  /* ---------- Rendering ---------- */
  const CHIP = { setup: 'chip.ready', round: 'chip.round', planted: 'chip.planted', end: 'chip.end' };
  const SCREEN = { round: 'scrRound', planted: 'scrPlanted', end: 'scrEnd' };
  const SCREENS = ['scrHome', 'scrLobby', 'scrSession', 'scrSettings', 'scrRemote', 'scrRound', 'scrPlanted', 'scrMode', 'scrEnd'];
  let view = null;
  function setScreen(id) {
    if (view === id) return;
    view = id;
    SCREENS.forEach((s) => { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  /* Navigation between games: tab bar (modes / session / settings), the lobby is a sub-page of modes.
     Speaker, player and viewer phones only have the session and settings tabs. */
  const UI = { tab: 'home', lobby: false };
  function setupScreen() {
    if (isRemote()) return UI.tab === 'settings' ? 'scrSettings' : 'scrRemote';
    if (UI.tab === 'session') return 'scrSession';
    if (UI.tab === 'settings') return 'scrSettings';
    return UI.lobby ? 'scrLobby' : 'scrHome';
  }
  function paintNav() {
    document.querySelectorAll('#nav button').forEach((b) => {
      const tab = b.dataset.tab;
      b.hidden = tab === 'home' && isRemote();
      b.setAttribute('aria-current', String(tab === UI.tab || (tab === 'session' && isRemote() && UI.tab !== 'settings')));
    });
  }
  document.querySelectorAll('#nav button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.tab === 'home' && UI.tab === 'home') UI.lobby = false;
    UI.tab = b.dataset.tab;
    render();
  }));
  $('btnBack').addEventListener('click', () => { UI.lobby = false; render(); });
  $('sessBanner').addEventListener('click', () => { UI.tab = 'session'; render(); });
  function fmt(ms, tenths) {
    ms = Math.max(0, ms);
    if (tenths && ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1);
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function updateHints() {
    const c = (!isMode(G) && G.cfg) || S;
    const half = c.half ? tr('bomb.halfSaved') : '';
    if (isRemote()) {
      $('hintA').textContent = $('hintB').textContent = tr('bomb.remotePlant');
      $('defuseHint').textContent = tr('bomb.remoteDefuse') + half;
      return;
    }
    $('hintA').textContent = $('hintB').textContent = tr('bomb.holdPlant', { n: c.plantTime });
    $('defuseHint').textContent = tr('bomb.holdDefuse', { n: c.defuseTime }) + half;
  }

  let lastKey = null;
  function render() {
    const t = now();
    const g = derive(G, t);
    const phase = g.phase || 'setup';
    const key = (g.id || '-') + ':' + phase;
    if (key !== lastKey) { lastKey = key; enter(g, t); }

    document.body.classList.toggle('ingame', phase !== 'setup');
    if (phase === 'setup') {
      setScreen(setupScreen());
      paintNav();
      $('chip').textContent = tr(isRemote() ? (NET.online ? 'chip.connected' : 'chip.offline') : CHIP.setup);
      if (isRemote()) $('remStatus').textContent = tr(NET.online ? 'rem.wait' : 'rem.connecting');
      return;
    }
    if (isMode(g)) {
      if (phase === 'end') { setScreen('scrEnd'); $('chip').textContent = tr(CHIP.end); return; }
      setScreen('scrMode');
      $('chip').textContent = tr('chip.game');
      M.render(g, t);
      return;
    }
    setScreen(SCREEN[phase]);
    $('chip').textContent = tr(CHIP[phase]);

    if (phase === 'round') {
      $('roundLabel').textContent = tr(g.roundEnd ? 'bomb.roundTime' : 'bomb.noLimit');
      $('roundClock').textContent = g.roundEnd ? fmt(g.roundEnd - t) : '--:--';
      if (isRemote()) {
        const h = g.hold, p = h && h.start ? Math.min(1, Math.max(0, (t - h.start) / h.dur)) : 0;
        $('holdA').style.setProperty('--p', h && h.site === 'A' ? p : 0);
        $('holdB').style.setProperty('--p', h && h.site === 'B' ? p : 0);
      }
    } else if (phase === 'planted') {
      const total = g.bombEnd - g.plantedAt, rem = g.bombEnd - t;
      $('bombClock').textContent = fmt(rem, true);
      $('bombBar').style.transform = 'scaleX(' + Math.max(0, rem / total) + ')';
      if (isRemote() && g.def) {
        const p = g.def.start ? Math.min(1, g.def.base + (t - g.def.start) / g.def.dur) : g.def.base;
        $('holdDefuse').style.setProperty('--p', p);
        $('holdDefuse').classList.toggle('holding', !!g.def.start);
      }
    }
  }

  /* Runs once per phase change on every phone: screen setup plus the one-shot sounds. */
  function enter(g, t) {
    const phase = g.phase || 'setup';
    ['setup', 'round', 'planted', 'end'].forEach((p) => document.body.classList.toggle(p, p === phase));
    updateHints();
    const fresh = (at) => t - at < 4000;   /* late joiners skip stale announcements */
    const snd = soundOn();
    if (isMode(g)) return enterMode(g, t, phase);
    if (phase === 'setup') {
      stopVoice();
      cancelBoom();
      if (!isRemote()) { keepAlive(false); unwake(); }
      return;
    }
    keepAlive(snd || !inSession()); wake();
    if (phase === 'round') {
      P.said = {};
      if (isRemote()) { $('holdA').disabled = $('holdB').disabled = false; }
      if (snd && fresh(g.startedAt)) {
        if (S.snd.signal) { tone(880, 0.12, 'square', 0.3); tone(1320, 0.18, 'square', 0.3, 0.14); }
        if (S.say.start) speak('start');
      }
    } else if (phase === 'planted') {
      const badge = $('plantSite'); badge.textContent = g.site; badge.classList.toggle('b', g.site === 'B');
      $('halfMark').hidden = !g.cfg.half;
      if (isRemote()) $('holdDefuse').style.setProperty('--p', 0);
      if (fresh(g.plantedAt)) {
        buzz([120, 60, 120]);
        if (snd && S.snd.signal) { tone(1500, 0.1, 'square', 0.35); tone(1500, 0.1, 'square', 0.35, 0.15); }
        if (snd && S.say.planted) speak(g.site === 'B' ? 'planted_b' : 'planted_a');
      }
    } else if (phase === 'end') {
      $('endExtra').innerHTML = '';
      $('btnAgain').textContent = tr('game.again');
      const r = g.result || { why: 'timeout', at: t };
      const isFresh = fresh(r.at);
      if (r.why === 'defused') {
        cancelBoom();
        showResult('def', tr('bomb.rDefusedK'), tr('bomb.rDefWin'), tr('bomb.rDefusedSub', { site: g.site, s: (Math.max(0, r.rem) / 1000).toFixed(1) }));
        if (isFresh) {
          buzz(200);
          if (snd && S.snd.jingle) winJingle();
          if (snd && S.say.result) setTimeout(() => { if (G.phase === 'end') speak(['defused', 'def_win']); }, S.snd.jingle ? 700 : 150);
        }
      } else if (r.why === 'boom') {
        holdDef.reset();
        showResult('att', tr('bomb.rBoomK'), tr('bomb.rAttWin'), tr('bomb.rBoomSub', { site: g.site }));
        if (isFresh) {
          if (snd && S.snd.boom && P.boomId !== g.id && t - r.at < 1500) { P.boomId = g.id; explosion(0); }
          buzz([400, 100, 400]);
          let n = 0; const iv = setInterval(() => { flash(); if (++n > 8) clearInterval(iv); }, 140);
          if (snd && S.say.result) setTimeout(() => { if (G.phase !== 'setup') speak('att_win'); }, Math.max(300, r.at + (S.snd.boom ? 2200 : 300) - now()));
        }
      } else {
        holdA.reset(); holdB.reset();
        showResult('def', tr('bomb.rTimeK'), tr('bomb.rDefWin'), tr('bomb.rTimeSub'));
        if (isFresh && snd) {
          if (S.snd.signal) { tone(440, 0.4, 'square', 0.3); tone(330, 0.6, 'square', 0.3, 0.45); }
          if (S.say.result) speak(['timeout', 'def_win']);
        }
      }
      if (!isRemote()) { unwake(); setTimeout(() => { if (G.phase === 'end') keepAlive(false); }, 6000); }
    }
  }
  /* Other game modes: their screen is built by modes.js, sounds come from G.ev and the timeline. */
  function enterMode(g, t, phase) {
    keepAlive(soundOn() || !inSession()); wake();
    if (phase !== 'end') return;
    const r = g.result || {};
    const txt = M.resultText(r);
    showResult(r.side === 'none' ? '' : (r.side || ''), txt.kicker, txt.title, txt.sub);
    $('endExtra').innerHTML = M.endExtra(g);
    $('btnAgain').textContent = M.again(g);
    if (t - (r.at || t) < 4000) { announce({ say: r.say, sig: r.sig, cat: 'result' }); buzz([300, 100, 300]); }
    if (!isRemote()) { unwake(); setTimeout(() => { if (G.phase === 'end') keepAlive(false); }, 6000); }
  }
  const SIG_PAUSE = { jingle: 700, boom: 2200, low: 900, start: 350, alert: 300, hit: 300 };
  function playSig(sig) {
    if (sig === 'start' && S.snd.signal) { tone(880, 0.12, 'square', 0.3); tone(1320, 0.18, 'square', 0.3, 0.14); }
    else if (sig === 'alert' && S.snd.signal) { tone(1500, 0.1, 'square', 0.35); tone(1500, 0.1, 'square', 0.35, 0.15); }
    else if (sig === 'hit' && S.snd.signal) { tone(990, 0.08, 'square', 0.35); tone(660, 0.16, 'square', 0.35, 0.1); }
    else if (sig === 'low' && S.snd.signal) { tone(440, 0.4, 'square', 0.3); tone(330, 0.6, 'square', 0.3, 0.45); }
    else if (sig === 'jingle' && S.snd.jingle) winJingle();
    else if (sig === 'boom' && S.snd.boom) explosion(0);
  }
  /* One announcement: { say: [lineKeys], sig, cat } where cat picks the "Was angesagt wird" switch. */
  function announce(item) {
    if (item.sig === 'alert' || item.sig === 'hit') buzz([120, 60, 120]);
    if (!soundOn()) return;
    playSig(item.sig);
    const on = { start: S.say.start, result: S.say.result, min1: S.say.min1, events: S.say.events }[item.cat || 'events'];
    if (item.say && item.say.length && on) setTimeout(() => speak(item.say), item.sig ? (SIG_PAUSE[item.sig] || 300) : 0);
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

  function showResult(side, kicker, title, sub) {
    $('result').className = 'result ' + side;
    $('resKicker').textContent = kicker;
    $('resTitle').textContent = title;
    $('resSub').textContent = sub;
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
          if (snd && S.snd.tick) tone(2000 + 900 * (1 - r), 0.07, 'square', 0.35, Math.max(0, d) / 1000);
          setTimeout(flash, Math.max(0, bt - t));
        }
        P.beepT = bt + (rem < 2000 ? 90 : 110 + 890 * Math.pow(r, 0.8));
      }
      if (snd && S.snd.boom && P.boomId !== G.id && G.bombEnd - L <= t + LOOK) {
        P.boomId = G.id;
        const d = G.bombEnd - L - t;
        if (d > -1500) P.boomNodes = explosion(Math.max(0, d) / 1000);
      }
      const remL = G.bombEnd - (t + L);
      if (snd && S.say.bomb && !P.said.s30 && remL <= 30500 && G.cfg.bombTime >= 40) { P.said.s30 = 1; if (remL > 27000) speak('s30'); }
      if (snd && S.say.bomb && !P.said.s10 && remL <= 10500 && G.cfg.bombTime >= 20) { P.said.s10 = 1; if (remL > 8000) speak('s10'); }
    }
    if (!isMode(G) && G.phase === 'round' && G.roundEnd) {
      const remL = G.roundEnd - (t + L);
      if (snd && S.say.min1 && !P.said.min1 && remL <= 60000 && G.cfg.roundTime > 1) { P.said.min1 = 1; if (remL > 55000) speak('min1'); }
    }
    /* Calibration: one beep on every full second of server time. */
    if ($('optSyncBeep').checked && snd) {
      if (P.syncT < t - 1000) P.syncT = Math.ceil((t + L) / 1000) * 1000;
      while (P.syncT - L <= t + LOOK) {
        const d = P.syncT - L - t;
        if (d > -30) tone(1760, 0.06, 'square', 0.4, Math.max(0, d) / 1000);
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

  /* Two-tap confirm instead of a dialog */
  function armConfirm(btn, action, prompt) {
    let t = 0;
    const label = () => (btn.dataset.i18n ? tr(btn.dataset.i18n) : btn.textContent);
    btn.addEventListener('click', () => {
      if (btn.classList.contains('armed')) { clearTimeout(t); btn.classList.remove('armed'); btn.textContent = label(); action(); return; }
      btn.classList.add('armed'); btn.textContent = tr(prompt || 'game.abortConfirm');
      t = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = label(); }, 3000);
    });
  }
  armConfirm($('abortRound'), toSetup);
  armConfirm($('abortPlanted'), toSetup);
  armConfirm($('abortMode'), toSetup);
  armConfirm($('btnEndSession'), leaveSession, 'sess.endConfirm');

  $('btnStart').addEventListener('click', startRound);
  $('btnAgain').addEventListener('click', startRound);
  $('btnSetup').addEventListener('click', toSetup);

  function testSound() {
    audio(); keepAlive(true);
    tone(2400, 0.08, 'square', 0.35); tone(2400, 0.08, 'square', 0.35, 0.25);
    loadLines();
    speak('test');
  }
  $('btnTest').addEventListener('click', () => {
    testSound();
    $('testMsg').textContent = tr('set.testMsg');
  });
  $('btnRemTest').addEventListener('click', testSound);
  $('btnVoiceTest').addEventListener('click', () => { audio(); loadLines(); speak('planted_a'); });
  $('optSyncBeep').addEventListener('change', () => { audio(); P.syncT = 0; });

  let resetT = 0;
  $('btnReset').addEventListener('click', () => {
    const b = $('btnReset');
    if (!b.classList.contains('armed')) {
      b.classList.add('armed'); b.textContent = tr('set.sure');
      resetT = setTimeout(() => { b.classList.remove('armed'); b.textContent = tr('set.resetBtn'); }, 3000);
      return;
    }
    clearTimeout(resetT); b.classList.remove('armed'); b.textContent = tr('set.resetBtn');
    S = clone(DEF); save(); applyArt(); applyLang(); applyGains(); loadLines();
  });

  /* Picture style: AI pictures or the hand-built vector art (art.js). */
  function applyArt() {
    document.body.dataset.art = S.art === 'vector' ? 'vector' : 'ai';
    if (M) M.fillArt();
  }

  /* Language switch: static text via data-i18n, everything painted from code gets repainted. */
  function applyLang() {
    window.I18N.set(S.lang);
    window.I18N.apply();
    $('langLabel').textContent = S.lang.toUpperCase();
    paintRole();
    if (M) M.relabel();
    bindAll();
    paintSession();
    paintMembers();
    lastKey = null;
    render();
  }
  $('btnLang').addEventListener('click', () => {
    if (inGame()) return;
    S.lang = S.lang === 'de' ? 'en' : 'de'; save();
    applyLang(); loadLines();
  });

  applyArt();
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
      if (isRemote()) { enterRemote(); UI.tab = 'session'; }
      connect();
    } else if (linkCode) {
      if (saved) saveSess();
      $('joinCode').value = linkCode;
      UI.tab = 'session';
    }
    paintSession();
    render();
  })();

  /* ---------- Offline support (PWA) ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
