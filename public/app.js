(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------- Settings ---------- */
  const DEF = {
    roundTime: 10, bombTime: 45, plantTime: 4, defuseTime: 7, half: true,
    lang: 'de', voice: 'male', radio: false, voiceVol: 100, vol: 80, vibrate: true, fs: true,
    say: { start: true, planted: true, min1: true, bomb: true, result: true },
    snd: { tick: true, hold: true, signal: true, boom: true, jingle: true }
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let S = clone(DEF);
  try {
    const saved = JSON.parse(localStorage.getItem('abt-settings') || '{}');
    S = Object.assign(clone(DEF), saved, {
      say: Object.assign({}, DEF.say, saved.say),
      snd: Object.assign({}, DEF.snd, saved.snd)
    });
  } catch (e) {}
  function save() { try { localStorage.setItem('abt-settings', JSON.stringify(S)); } catch (e) {} }

  /* Time settings: big readout cards; tapping one opens a bottom sheet with slider, +/- (hold to repeat) and presets. */
  const range = (a, b, step) => { const r = []; for (let v = a; v <= b; v += step) r.push(v); return r; };
  const mmss = (v) => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
  const TIME = {
    roundTime: {
      title: 'Rundenzeit', desc: 'So lange haben die Angreifer zum Planten.',
      values: range(0, 60, 1), presets: [0, 3, 5, 8, 10, 15, 20, 30],
      parts: (v) => (v === 0 ? ['Aus', ''] : [String(v), 'min']), chip: (v) => (v === 0 ? 'Aus' : v + ' min')
    },
    bombTime: {
      title: 'Bomben-Timer', desc: 'Zeit von der Platzierung bis zur Explosion.',
      values: range(10, 60, 5).concat(range(75, 300, 15), range(330, 600, 30)), presets: [30, 40, 45, 60, 90, 120, 180, 300],
      parts: (v) => (v < 60 ? [String(v), 's'] : [mmss(v), 'min']), chip: (v) => (v < 60 ? v + ' s' : mmss(v))
    },
    plantTime: {
      title: 'Planten', desc: 'So lange muss A oder B gedrückt werden.',
      values: range(1, 20, 1), presets: [2, 3, 4, 5, 6, 8, 10, 15],
      parts: (v) => [String(v), 's'], chip: (v) => v + ' s'
    },
    defuseTime: {
      title: 'Entschärfen', desc: 'So lange muss „Entschärfen“ gedrückt werden.',
      values: range(1, 30, 1), presets: [3, 5, 7, 8, 10, 12, 15, 20],
      parts: (v) => [String(v), 's'], chip: (v) => v + ' s'
    }
  };
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
    $('shTitle').textContent = T.title;
    $('shDesc').textContent = T.desc;
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
    $('voiceDesc').textContent = S.voice === 'male'
      ? 'Männliche Ansager-Stimme, funktioniert offline'
      : 'Sprachausgabe des Handys, klingt je nach Gerät anders';
  }
  document.querySelectorAll('[data-opt]').forEach((el) => el.addEventListener('change', () => { S[el.dataset.opt] = el.checked; save(); updateHints(); }));
  document.querySelectorAll('[data-say]').forEach((el) => el.addEventListener('change', () => { S.say[el.dataset.say] = el.checked; save(); }));
  document.querySelectorAll('[data-snd]').forEach((el) => el.addEventListener('change', () => { S.snd[el.dataset.snd] = el.checked; save(); }));
  document.querySelectorAll('[data-range]').forEach((el) => el.addEventListener('input', () => { S[el.dataset.range] = +el.value; applyGains(); save(); }));
  document.querySelectorAll('[data-seg]').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    S[seg.dataset.seg] = b.dataset.v; save(); bindAll();
    if (seg.dataset.seg === 'lang') loadLines();
  })));

  function updateHints() {
    $('hintA').textContent = $('hintB').textContent = S.plantTime + ' s halten zum Planten';
    $('defuseHint').textContent = S.defuseTime + ' s gedrückt halten' + (S.half ? ' · ab 50 % gesichert' : '');
  }

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
  const lang = () => (LINES[S.lang] ? S.lang : 'de');
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
  function explosion() {
    const a = audio(); if (!a) return;
    const t = a.currentTime, len = 3.2;
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
    if (document.visibilityState === 'visible' && inGame()) wake();
  });
  if (!('wakeLock' in navigator)) {
    $('wakeNote').textContent = 'Achtung: Dieser Browser kann das Display nicht wach halten. Automatische Sperre am Handy für die Runde hochstellen oder Browser aktualisieren.';
  }

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
    $('btnFs').setAttribute('aria-label', on ? 'Vollbild beenden' : 'Vollbild');
    $('btnFs').title = on ? 'Vollbild beenden' : 'Vollbild';
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
  function inGame() { return st.phase === 'round' || st.phase === 'planted'; }
  let toastT = 0;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3000);
  }
  /* Asks "Leave page?" on reload, closing the tab or typing a new address. */
  window.addEventListener('beforeunload', (e) => { if (inGame()) { e.preventDefault(); e.returnValue = ''; } });
  /* The back button / back swipe lands on an extra history entry instead of leaving the page. */
  function armBack() { if (!(history.state && history.state.abt)) { try { history.pushState({ abt: 1 }, ''); } catch (e) {} } }
  window.addEventListener('popstate', () => {
    if (inGame()) { armBack(); toast('Runde läuft. Zum Beenden „Runde abbrechen“ nutzen.'); }
  });

  /* ---------- Hold-to-act buttons ---------- */
  function makeHold(el, o) {
    let raf = 0, startT = 0, base = 0, active = false, lastStep = -1;
    const h = { progress: 0 };
    const paint = () => el.style.setProperty('--p', h.progress);
    function frame(now) {
      if (!active) return;
      h.progress = Math.min(1, base + (now - startT) / (o.duration() * 1000));
      paint();
      const stepN = Math.floor(h.progress * 8);
      if (stepN !== lastStep) { lastStep = stepN; if (S.snd.hold) tone(600 + stepN * 90, 0.05, 'sine', 0.22); }
      if (h.progress >= 1) { active = false; el.classList.remove('holding'); o.onDone(); return; }
      raf = requestAnimationFrame(frame);
    }
    function down(e) {
      if (el.disabled || active) return;
      if (e.cancelable) e.preventDefault();
      if (e.pointerId != null) { try { el.setPointerCapture(e.pointerId); } catch (_) {} }
      audio();
      active = true; base = h.progress; startT = performance.now(); lastStep = -1;
      el.classList.add('holding');
      o.onStart && o.onStart();
      raf = requestAnimationFrame(frame);
    }
    function up() {
      if (!active) return;
      active = false; cancelAnimationFrame(raf); el.classList.remove('holding');
      const cp = o.checkpoint ? o.checkpoint() : 0;
      h.progress = (cp && h.progress >= cp) ? cp : 0;
      paint();
      o.onCancel && o.onCancel();
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
    duration: () => S.plantTime,
    onStart: () => { $('holdB').disabled = true; },
    onCancel: () => { $('holdB').disabled = false; },
    onDone: () => plant('A')
  });
  const holdB = makeHold($('holdB'), {
    duration: () => S.plantTime,
    onStart: () => { $('holdA').disabled = true; },
    onCancel: () => { $('holdA').disabled = false; },
    onDone: () => plant('B')
  });
  const holdDef = makeHold($('holdDefuse'), {
    duration: () => S.defuseTime,
    checkpoint: () => (S.half ? 0.5 : 0),
    onDone: () => defused()
  });

  /* ---------- Game flow ---------- */
  let st = { phase: 'setup' };
  const CHIP = { setup: 'Bereit', round: 'Runde läuft', planted: 'Bombe aktiv', end: 'Runde vorbei' };
  function setPhase(p, screen) {
    st.phase = p;
    document.body.className = p;
    $('chip').textContent = CHIP[p];
    ['scrSetup', 'scrRound', 'scrPlanted', 'scrEnd'].forEach((id) => { $(id).hidden = id !== screen; });
    window.scrollTo(0, 0);
  }

  function fmt(ms, tenths) {
    ms = Math.max(0, ms);
    if (tenths && ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1);
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function startRound() {
    audio(); keepAlive(true); wake();
    if (S.fs) enterFs();
    armBack();
    const now = performance.now();
    st = { phase: 'round', roundEnd: S.roundTime > 0 ? now + S.roundTime * 60000 : null, said: {} };
    holdA.reset(); holdB.reset(); $('holdA').disabled = false; $('holdB').disabled = false;
    $('roundLabel').textContent = S.roundTime > 0 ? 'Rundenzeit' : 'Ohne Zeitlimit';
    $('roundClock').textContent = S.roundTime > 0 ? fmt(S.roundTime * 60000) : '--:--';
    updateHints();
    setPhase('round', 'scrRound');
    if (S.snd.signal) { tone(880, 0.12, 'square', 0.3); tone(1320, 0.18, 'square', 0.3, 0.14); }
    if (S.say.start) speak('start');
  }

  function plant(site) {
    if (st.phase !== 'round') return;
    const now = performance.now();
    st = { phase: 'planted', site, plantedAt: now, bombEnd: now + S.bombTime * 1000, nextBeep: now + 900, said: {} };
    holdDef.reset();
    const badge = $('plantSite'); badge.textContent = site; badge.classList.toggle('b', site === 'B');
    $('halfMark').hidden = !S.half;
    updateHints();
    setPhase('planted', 'scrPlanted');
    buzz([120, 60, 120]);
    if (S.snd.signal) { tone(1500, 0.1, 'square', 0.35); tone(1500, 0.1, 'square', 0.35, 0.15); }
    if (S.say.planted) speak(site === 'B' ? 'planted_b' : 'planted_a');
  }

  function defused() {
    if (st.phase !== 'planted') return;
    const rem = st.bombEnd - performance.now();
    finish('def', 'Bombe entschärft', 'Verteidiger gewinnen',
      'Auf Punkt ' + st.site + ' entschärft, ' + (Math.max(0, rem) / 1000).toFixed(1) + ' s vor der Explosion.');
    if (S.snd.jingle) winJingle();
    buzz(200);
    if (S.say.result) setTimeout(() => { if (st.phase === 'end') speak(['defused', 'def_win']); }, S.snd.jingle ? 700 : 150);
  }

  function boom() {
    const site = st.site;
    holdDef.reset();
    finish('att', 'Explosion', 'Angreifer gewinnen', 'Die Bombe auf Punkt ' + site + ' ist hochgegangen.');
    if (S.snd.boom) explosion();
    buzz([400, 100, 400]);
    let n = 0; const iv = setInterval(() => { flash(); if (++n > 8) clearInterval(iv); }, 140);
    if (S.say.result) setTimeout(() => { if (st.phase === 'end') speak('att_win'); }, S.snd.boom ? 2200 : 300);
  }

  function timeout() {
    holdA.reset(); holdB.reset();
    finish('def', 'Zeit abgelaufen', 'Verteidiger gewinnen', 'Die Angreifer haben nicht rechtzeitig geplantet.');
    if (S.snd.signal) { tone(440, 0.4, 'square', 0.3); tone(330, 0.6, 'square', 0.3, 0.45); }
    if (S.say.result) speak(['timeout', 'def_win']);
  }

  function finish(side, kicker, title, sub) {
    st.phase = 'end';
    $('result').className = 'result ' + side;
    $('resKicker').textContent = kicker;
    $('resTitle').textContent = title;
    $('resSub').textContent = sub;
    setPhase('end', 'scrEnd');
    unwake();
    setTimeout(() => { if (st.phase === 'end') keepAlive(false); }, 6000);
  }

  function toSetup() {
    stopVoice();
    holdA.reset(); holdB.reset(); holdDef.reset();
    keepAlive(false); unwake();
    st = { phase: 'setup' };
    setPhase('setup', 'scrSetup');
  }

  function tick() {
    const now = performance.now();
    if (st.phase === 'round' && st.roundEnd) {
      const rem = st.roundEnd - now;
      $('roundClock').textContent = fmt(rem);
      if (rem <= 60000 && !st.said.min1 && S.roundTime > 1) { st.said.min1 = true; if (S.say.min1) speak('min1'); }
      if (rem <= 0) timeout();
    } else if (st.phase === 'planted') {
      const total = S.bombTime * 1000;
      const rem = st.bombEnd - now;
      $('bombClock').textContent = fmt(rem, true);
      $('bombBar').style.transform = 'scaleX(' + Math.max(0, rem / total) + ')';
      if (rem <= 0) { boom(); return; }
      if (now >= st.nextBeep) {
        const r = Math.max(0, rem / total);
        if (S.snd.tick) tone(2000 + 900 * (1 - r), 0.07, 'square', 0.35);
        flash();
        st.nextBeep = now + (rem < 2000 ? 90 : 110 + 890 * Math.pow(r, 0.8));
      }
      if (rem <= 30500 && !st.said.s30 && S.bombTime >= 40) { st.said.s30 = true; if (S.say.bomb) speak('s30'); }
      if (rem <= 10500 && !st.said.s10 && S.bombTime >= 20) { st.said.s10 = true; if (S.say.bomb) speak('s10'); }
    }
  }
  setInterval(tick, 40);

  /* Two-tap confirm instead of a dialog */
  function armConfirm(btn, action) {
    const label = btn.textContent; let t = 0;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('armed')) { clearTimeout(t); btn.classList.remove('armed'); btn.textContent = label; action(); return; }
      btn.classList.add('armed'); btn.textContent = 'Nochmal tippen zum Abbrechen';
      t = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = label; }, 3000);
    });
  }
  armConfirm($('abortRound'), toSetup);
  armConfirm($('abortPlanted'), toSetup);

  $('btnStart').addEventListener('click', startRound);
  $('btnAgain').addEventListener('click', startRound);
  $('btnSetup').addEventListener('click', toSetup);

  $('btnTest').addEventListener('click', () => {
    audio();
    tone(2400, 0.08, 'square', 0.35); tone(2400, 0.08, 'square', 0.35, 0.25);
    loadLines();
    speak('test');
    $('testMsg').textContent = 'Du solltest zwei Pieptöne und eine Ansage aus der Box hören.';
  });
  $('btnVoiceTest').addEventListener('click', () => { audio(); loadLines(); speak('planted_a'); });

  let resetT = 0;
  $('btnReset').addEventListener('click', () => {
    const b = $('btnReset');
    if (!b.classList.contains('armed')) {
      b.classList.add('armed'); b.textContent = 'Sicher?';
      resetT = setTimeout(() => { b.classList.remove('armed'); b.textContent = 'Zurücksetzen'; }, 3000);
      return;
    }
    clearTimeout(resetT); b.classList.remove('armed'); b.textContent = 'Zurücksetzen';
    S = clone(DEF); save(); bindAll(); applyGains(); loadLines();
  });

  bindAll();
  loadLines();

  /* ---------- Offline support (PWA) ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
