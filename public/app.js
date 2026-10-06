(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------- Settings ---------- */
  const DEF = { roundTime: 10, bombTime: 45, plantTime: 4, defuseTime: 7, half: true, lang: 'en', vol: 80, fs: true };
  const S = Object.assign({}, DEF);
  try { Object.assign(S, JSON.parse(localStorage.getItem('abt-settings') || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem('abt-settings', JSON.stringify(S)); } catch (e) {} }

  document.querySelectorAll('.step').forEach((box) => {
    const key = box.dataset.key, min = +box.dataset.min, max = +box.dataset.max, step = +box.dataset.step, unit = box.dataset.unit;
    const out = box.querySelector('output');
    const paint = () => { out.textContent = (key === 'roundTime' && S[key] === 0) ? 'aus' : S[key] + ' ' + unit; };
    box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      S[key] = Math.min(max, Math.max(min, S[key] + step * +b.dataset.d));
      paint(); save(); updateHints();
    }));
    paint();
  });
  $('optHalf').checked = !!S.half;
  $('optHalf').addEventListener('change', (e) => { S.half = e.target.checked; save(); });
  const langBtns = document.querySelectorAll('#optLang button');
  function paintLang() { langBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang))); }
  langBtns.forEach((b) => b.addEventListener('click', () => { S.lang = b.dataset.lang; paintLang(); save(); }));
  paintLang();
  $('optVol').value = S.vol;
  $('optVol').addEventListener('input', (e) => { S.vol = +e.target.value; if (master) master.gain.value = S.vol / 100; save(); });

  function updateHints() {
    $('hintA').textContent = $('hintB').textContent = S.plantTime + ' s halten zum Planten';
    $('defuseHint').textContent = S.defuseTime + ' s gedrückt halten' + (S.half ? ' · ab 50 % gesichert' : '');
  }
  updateHints();

  /* ---------- Announcements ---------- */
  const LINES = {
    en: {
      start: 'Round start. Attackers, plant the bomb.',
      planted: (s) => 'Bomb planted on Site ' + s + '.',
      s30: 'Thirty seconds.', s10: 'Ten seconds.',
      min1: 'One minute remaining.',
      defused: 'Bomb defused.',
      defWin: 'Defenders win!',
      boom: 'Attackers win!',
      timeout: 'Time is up.',
      test: 'Speaker check. Site A. Site B.'
    },
    de: {
      start: 'Runde gestartet. Angreifer, platziert die Bombe.',
      planted: (s) => 'Bombe platziert auf Punkt ' + s + '.',
      s30: 'Noch dreißig Sekunden.', s10: 'Noch zehn Sekunden.',
      min1: 'Noch eine Minute.',
      defused: 'Bombe entschärft.',
      defWin: 'Verteidiger gewinnen!',
      boom: 'Angreifer gewinnen!',
      timeout: 'Zeit abgelaufen.',
      test: 'Lautsprechertest. Punkt A. Punkt B.'
    }
  };
  const L = () => LINES[S.lang] || LINES.en;

  const hasTTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) {} }
  if (hasTTS) { loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {} }
  function pickVoice(lang) {
    const list = voices.filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(lang));
    return list.find((v) => /google|enhanced|premium|neural/i.test(v.name)) || list.find((v) => v.localService) || list[0] || null;
  }
  /* Speaks one line, or a list of lines one after another (e.g. "Bomb defused." then "Defenders win!"). */
  function speak(text) {
    if (!hasTTS) return;
    const lines = Array.isArray(text) ? text : [text];
    try { speechSynthesis.cancel(); } catch (e) {}
    lines.forEach((line, i) => say(line, i === lines.length - 1 && lines.length > 1));
  }
  function say(text, emphasis) {
    try {
      speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(text);
      const lang = S.lang === 'de' ? 'de' : 'en';
      u.lang = lang === 'de' ? 'de-DE' : 'en-US';
      const v = pickVoice(lang); if (v) u.voice = v;
      u.rate = emphasis ? 0.92 : 1; u.pitch = 1; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------- Sound ---------- */
  let ac = null, master = null, keep = null;
  function audio() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C(); master = ac.createGain(); master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    master.gain.value = S.vol / 100;
    return ac;
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
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

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
  $('optFs').checked = !!S.fs;
  $('optFs').addEventListener('change', (e) => { S.fs = e.target.checked; save(); });

  /* Install hint: Android offers a real install prompt, iPhone needs "Add to Home Screen" (no fullscreen API there). */
  let installEvt = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isApp()) {
    if (isIOS) {
      $('installDesc').textContent = 'Für Vollbild ohne Safari-Leiste: unten auf Teilen tippen und „Zum Home-Bildschirm“ wählen. Dann die App über das neue Symbol starten.';
      $('installBox').hidden = false;
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); installEvt = e;
      $('btnInstall').hidden = false; $('installBox').hidden = false;
    });
    $('btnInstall').addEventListener('click', async () => {
      if (!installEvt) return;
      installEvt.prompt();
      try { await installEvt.userChoice; } catch (e) {}
      installEvt = null; $('installBox').hidden = true;
    });
    window.addEventListener('appinstalled', () => { $('installBox').hidden = true; });
  }

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
      if (stepN !== lastStep) { lastStep = stepN; tone(600 + stepN * 90, 0.05, 'sine', 0.22); }
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
    tone(880, 0.12, 'square', 0.3); tone(1320, 0.18, 'square', 0.3, 0.14);
    speak(L().start);
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
    tone(1500, 0.1, 'square', 0.35); tone(1500, 0.1, 'square', 0.35, 0.15);
    speak(L().planted(site));
  }

  function defused() {
    if (st.phase !== 'planted') return;
    const rem = st.bombEnd - performance.now();
    finish('def', 'Bombe entschärft', 'Verteidiger gewinnen',
      'Auf Punkt ' + st.site + ' entschärft, ' + (Math.max(0, rem) / 1000).toFixed(1) + ' s vor der Explosion.');
    winJingle();
    buzz(200);
    setTimeout(() => { if (st.phase === 'end') speak([L().defused, L().defWin]); }, 700);
  }

  function boom() {
    const site = st.site;
    holdDef.reset();
    finish('att', 'Explosion', 'Angreifer gewinnen', 'Die Bombe auf Punkt ' + site + ' ist hochgegangen.');
    explosion(); buzz([400, 100, 400]);
    let n = 0; const iv = setInterval(() => { flash(); if (++n > 8) clearInterval(iv); }, 140);
    setTimeout(() => { if (st.phase === 'end') speak(L().boom); }, 2200);
  }

  function timeout() {
    holdA.reset(); holdB.reset();
    finish('def', 'Zeit abgelaufen', 'Verteidiger gewinnen', 'Die Angreifer haben nicht rechtzeitig geplantet.');
    tone(440, 0.4, 'square', 0.3); tone(330, 0.6, 'square', 0.3, 0.45);
    speak([L().timeout, L().defWin]);
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
    try { hasTTS && speechSynthesis.cancel(); } catch (e) {}
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
      if (rem <= 60000 && !st.said.min1 && S.roundTime > 1) { st.said.min1 = true; speak(L().min1); }
      if (rem <= 0) timeout();
    } else if (st.phase === 'planted') {
      const total = S.bombTime * 1000;
      const rem = st.bombEnd - now;
      $('bombClock').textContent = fmt(rem, true);
      $('bombBar').style.transform = 'scaleX(' + Math.max(0, rem / total) + ')';
      if (rem <= 0) { boom(); return; }
      if (now >= st.nextBeep) {
        const r = Math.max(0, rem / total);
        tone(2000 + 900 * (1 - r), 0.07, 'square', 0.35);
        flash();
        st.nextBeep = now + (rem < 2000 ? 90 : 110 + 890 * Math.pow(r, 0.8));
      }
      if (rem <= 30500 && !st.said.s30 && S.bombTime >= 40) { st.said.s30 = true; speak(L().s30); }
      if (rem <= 10500 && !st.said.s10 && S.bombTime >= 20) { st.said.s10 = true; speak(L().s10); }
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
    speak(L().test);
    $('testMsg').textContent = hasTTS
      ? 'Du solltest zwei Pieptöne und eine Ansage aus der Box hören.'
      : 'Dieser Browser hat keine Sprachausgabe. Pieptöne und Explosion funktionieren trotzdem.';
  });

  /* ---------- Offline support (PWA) ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
