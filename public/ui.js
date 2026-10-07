/* Shared UI building blocks of the neon arcane design (no game logic):
   rolling digits, toasts, event banner, two-tap confirm, tap ripple, bottom sheets with the value editor,
   the screen router with its transitions, the tarot deck in front of the rune portal (with the card-to-lobby
   picture morph), glove-friendly hold pads and the end screen effects.
   app.js and modes.js use it through window.UI. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2, EO = 'cubic-bezier(.16,1,.3,1)', SPRING = 'cubic-bezier(.34,1.56,.64,1)';
  const app = $('#app');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, cls) => '<svg class="i ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>';
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let vibrate = () => {};
  /* Classic design: no transitions, effects or particles. */
  let plain = false;
  const buzz = (p) => vibrate(p);

  /* ---------- Rolling digits: changed characters slide in, the old ones slide out ---------- */
  function roll(el, str, dir) {
    if (!el) return;
    dir = dir || 1; str = String(str);
    if (el._s === str) return;
    const prev = el._s; el._s = str;
    if (prev == null || RM || prev.length !== str.length) {
      el.innerHTML = [...str].map((c) => '<span class="sl"><span>' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span></span>').join('');
      if (prev != null && !RM) el.animate([{ opacity: 0.3, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EO });
      return;
    }
    [...str].forEach((c, i) => {
      if (c === prev[i]) return;
      const slot = el.children[i]; if (!slot) return;
      $$('.old', slot).forEach((o) => o.remove());
      const old = slot.lastElementChild, nu = document.createElement('span');
      nu.textContent = c; slot.appendChild(nu);
      if (old) {
        old.classList.add('old');
        old.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(' + dir * 28 + '%)', opacity: 0, offset: 0.7 }, { transform: 'translateY(' + dir * 34 + '%)', opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = () => old.remove();
      }
      nu.animate([{ transform: 'translateY(' + -dir * 30 + '%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,1,.35,1)' });
    });
  }

  /* ---------- Toast and event banner ---------- */
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }
  let evtT = 0;
  function evt(text, kind, icon) {
    const e = $('#evt'); e.className = 'evt ' + (kind || '');
    e.querySelector('use').setAttribute('href', '#i-' + (icon || 'flag'));
    e.querySelector('span').textContent = text;
    void e.offsetWidth; e.classList.add('on');
    clearTimeout(evtT); evtT = setTimeout(() => e.classList.remove('on'), 2800);
  }
  function evtOff() { clearTimeout(evtT); $('#evt').classList.remove('on'); }

  /* ---------- Two-tap confirm for anything that ends something ---------- */
  function twoTap(btn, armedLabel, action) {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('armed')) { disarm(btn); action(); return; }
      btn._orig = btn.innerHTML; btn.classList.add('armed');
      btn.textContent = typeof armedLabel === 'function' ? armedLabel() : armedLabel; buzz(30);
      btn._t = setTimeout(() => disarm(btn), 3000);
    });
  }
  function disarm(btn) {
    if (!btn.classList.contains('armed')) return;
    clearTimeout(btn._t); btn.classList.remove('armed'); btn.innerHTML = btn._orig;
  }

  /* ---------- Tap ripple ---------- */
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.btn, .tc, .team, .pl, .banner, .backbtn, .wingrid button, .pickrow button, .rolepick button, .sh-presets button, .nav-b, .iconbtn, .gb-end');
    if (!t || RM || plain || t.disabled) return;
    const r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
    t.style.overflow = 'hidden';
    const s = document.createElement('span'); s.className = 'ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    t.appendChild(s);
    s.animate([{ transform: 'scale(0)', opacity: 0.9 }, { transform: 'scale(1)', opacity: 0 }], { duration: 700, easing: EO }).onfinish = () => s.remove();
  }, { passive: true });

  /* ---------- Runes for the portal ring and the lobby picture ---------- */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const BRANCH = [[[0, -1], [0.6, -0.4]], [[0, -0.1], [0.6, 0.5]], [[0, -1], [-0.6, -0.4]], [[0, 0], [-0.6, 0.6]], [[0, -0.6], [0.55, -0.1], [0, 0.4]], [[-0.55, -1], [0, -0.45], [0.55, -1]], [[-0.5, 0.3], [0.5, -0.3]], [[0, 0.2], [0.5, 0.7]]];
  function runes(r, count, size, seed) {
    const R = rng(seed); let d = '';
    for (let i = 0; i < count; i++) {
      const th = i / count * TAU, cx = r * Math.sin(th), cy = -r * Math.cos(th);
      const tx = Math.cos(th), ty = Math.sin(th), nx = Math.sin(th), ny = -Math.cos(th);
      const P = (p) => (cx + p[0] * size * 0.75 * tx - p[1] * size * nx).toFixed(1) + ' ' + (cy + p[0] * size * 0.75 * ty - p[1] * size * ny).toFixed(1);
      const lines = [];
      if (R() < 0.16) lines.push([[0, -0.32], [0.32, 0], [0, 0.32], [-0.32, 0], [0, -0.32]]);
      else { lines.push([[0, -1], [0, 1]]); const nb = 1 + (R() < 0.5 ? 1 : 0); for (let b = 0; b < nb; b++) lines.push(BRANCH[Math.floor(R() * BRANCH.length)]); }
      lines.forEach((l) => { d += 'M' + l.map(P).join('L'); });
    }
    return d;
  }
  function ticks(r1, r2, n) {
    let d = '';
    for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a), c = Math.cos(a), rr = i % 5 === 0 ? r1 - 4 : r1; d += 'M' + (rr * s).toFixed(1) + ' ' + (-rr * c).toFixed(1) + 'L' + (r2 * s).toFixed(1) + ' ' + (-r2 * c).toFixed(1); }
    return d;
  }
  const RO = runes(180, 40, 7, 7), RI = runes(104, 26, 4.6, 3), RH = runes(176, 30, 9, 11);
  $('#runeO').innerHTML = '<circle r="194" class="rl faint"/><circle r="167" class="rl dash"/><path class="tick" d="' + ticks(196, 200, 120) + '"/><path class="rg glowpath" d="' + RO + '"/><path class="rg" d="' + RO + '"/>';
  $('#runeI').innerHTML = '<circle r="94" class="rl dash"/><path class="rg glowpath" d="' + RI + '"/><path class="rg" d="' + RI + '" style="stroke-width:1.3"/>';
  const heroRunes = () => '<svg class="hr-runes" viewBox="-200 -200 400 400" aria-hidden="true"><path class="rg" d="' + RH + '"/></svg>';

  /* ---------- Particle vortex behind the deck (one canvas, runs only on the home screen) ---------- */
  const V = (function () {
    const cv = $('#vortex'), ctx = cv.getContext('2d');
    const COLS = ['186, 150, 255', '255, 112, 200', '255, 210, 130'];
    let W = 0, H = 0, Rmax = 0, parts = [], running = false, last = 0;
    const c = { x: 0, y: 0 }, cT = { x: 0, y: 0 };
    function spawn(p, outer) {
      p.a = Math.random() * TAU; p.r = outer ? Rmax * (0.7 + Math.random() * 0.35) : 20 + Math.random() * Rmax;
      p.w = 0.18 + Math.random() * 0.38; p.vr = 8 + Math.random() * 18;
      const q = Math.random(); p.c = q < 0.6 ? 0 : q < 0.84 ? 1 : 2; p.tw = Math.random() * TAU;
    }
    function resize() {
      const r = app.getBoundingClientRect(), dpr = Math.min(1.5, devicePixelRatio || 1);
      W = r.width; H = r.height; Rmax = Math.hypot(W, H) * 0.62;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!parts.length) for (let i = 0; i < 95; i++) { const p = {}; spawn(p, false); parts.push(p); }
      if (!c.x) { c.x = cT.x = W / 2; c.y = cT.y = H * 0.45; }
      draw(0, performance.now());
    }
    function draw(dt, now) {
      c.x += (cT.x - c.x) * Math.min(1, dt * 2.6); c.y += (cT.y - c.y) * Math.min(1, dt * 2.6);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 190);
      g.addColorStop(0, 'rgba(' + COLS[0] + ',.2)'); g.addColorStop(1, 'rgba(' + COLS[0] + ',0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const buckets = []; for (let k = 0; k < 9; k++) buckets.push(new Path2D());
      for (const p of parts) {
        const px = c.x + Math.cos(p.a) * p.r, py = c.y + Math.sin(p.a) * p.r;
        p.a += p.w * (1 + 70 / (p.r + 30)) * dt;
        p.r += -p.vr * (1 + 50 / (p.r + 20)) * dt;
        if (p.r < 8) { spawn(p, true); continue; }
        const x = c.x + Math.cos(p.a) * p.r, y = c.y + Math.sin(p.a) * p.r;
        const al = Math.min(1, p.r / 70) * (0.55 + 0.45 * Math.sin(now / 600 + p.tw));
        const b = p.c * 3 + (al > 0.66 ? 2 : al > 0.33 ? 1 : 0);
        buckets[b].moveTo(x - (x - px) * 3, y - (y - py) * 3); buckets[b].lineTo(x + 0.01, y);
      }
      ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) { ctx.strokeStyle = 'rgba(' + COLS[(k / 3) | 0] + ',' + [0.25, 0.55, 0.9][k % 3] + ')'; ctx.lineWidth = 1.6; ctx.stroke(buckets[k]); }
      ctx.globalCompositeOperation = 'source-over';
    }
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = (now - last) / 1000; if (dt < 0.03) return; /* about 30 fps is plenty */
      last = now; draw(Math.min(dt, 0.05), now);
    }
    function start() { if (running || RM || plain || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (router.cur === 'home') start(); });
    return { resize, start, stop, center(x, y, snap) { cT.x = x; cT.y = y; if (snap) { c.x = x; c.y = y; } } };
  })();

  /* ---------- Bottom sheets ---------- */
  let sheetOpen = null, sheetReturn = null;
  const sheet = {
    open(sel) {
      if (sheetOpen) sheet.close(true);
      sheetReturn = document.activeElement;
      sheetOpen = $(sel); $('#backdrop').classList.add('open'); sheetOpen.classList.add('open');
      setTimeout(() => { const f = sheetOpen && sheetOpen.querySelector('[data-focus], .btn.primary, button'); if (f) f.focus({ preventScroll: true }); }, 380);
    },
    close(quiet) {
      if (!sheetOpen) return;
      $('#backdrop').classList.remove('open'); sheetOpen.classList.remove('open'); sheetOpen = null;
      if (!quiet && sheetReturn && sheetReturn.isConnected) sheetReturn.focus({ preventScroll: true });
    },
    get isOpen() { return !!sheetOpen; },
    /* Generic sheet with free content (messages, winner picker). */
    generic(html) { $('#gsBody').innerHTML = html; sheet.open('#gsheet'); return $('#gsBody'); },
    head(title, desc, closeLabel) {
      return '<div class="sh-head"><div><h2 id="gsT">' + esc(title) + '</h2>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</div><button class="iconbtn" type="button" data-close aria-label="' + esc(closeLabel || '') + '">' + ic('close') + '</button></div>';
    }
  };
  $('#backdrop').addEventListener('click', () => sheet.close());
  $('#gsBody').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) sheet.close(); });

  /* Value editor: big value, slider, -/+ with hold-to-repeat that speeds up, quick picks, apply. */
  const VS = { T: null, idx: 0, onOk: null };
  const vsR = $('#vsRange');
  function valueSheet(T, value, onOk) {
    VS.T = T; VS.onOk = onOk;
    VS.idx = T.values.reduce((bi, x, i) => (Math.abs(x - value) < Math.abs(T.values[bi] - value) ? i : bi), 0);
    $('#vsT').textContent = T.title; $('#vsD').textContent = T.desc;
    vsR.min = 0; vsR.max = T.values.length - 1; vsR.step = 1;
    $('#vsNum')._s = null;
    $('#vsMin').textContent = T.chip(T.values[0]); $('#vsMax').textContent = T.chip(T.values[T.values.length - 1]);
    $('#vsPre').innerHTML = T.presets.map((v) => '<button type="button" data-q="' + v + '" aria-pressed="false">' + esc(T.chip(v)) + '</button>').join('');
    paintVS(1); sheet.open('#vsheet');
  }
  function paintVS(dir) {
    const T = VS.T, v = T.values[VS.idx], pr = T.parts(v);
    roll($('#vsNum'), pr[0], dir); $('#vsUnit').textContent = pr[1]; $('#vsOut').classList.toggle('off', pr[1] === '');
    vsR.value = VS.idx; vsR.style.setProperty('--p', (VS.idx / Math.max(1, T.values.length - 1)) * 100 + '%');
    $$('#vsPre button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.q === v)));
  }
  function setIdx(i) {
    i = clamp(i, 0, VS.T.values.length - 1);
    if (i === VS.idx) return false;
    const d = i > VS.idx ? 1 : -1; VS.idx = i; paintVS(d); buzz(4); return true;
  }
  vsR.addEventListener('input', () => setIdx(+vsR.value));
  $('#vsPre').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) setIdx(VS.T.values.indexOf(+b.dataset.q)); });
  [['#vsMinus', -1], ['#vsPlus', 1]].forEach((x) => {
    const b = $(x[0]), d = x[1]; let t = 0, delay = 0;
    const stop = () => { clearTimeout(t); b.classList.remove('rep'); };
    const rep = () => { if (!setIdx(VS.idx + d)) return stop(); b.classList.add('rep'); delay = Math.max(45, delay * 0.84); t = setTimeout(rep, delay); };
    b.addEventListener('pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); setIdx(VS.idx + d); delay = 170; t = setTimeout(rep, 420); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', (e) => { if (e.detail === 0) setIdx(VS.idx + d); });
  });
  $('#vsClose').addEventListener('click', () => sheet.close());
  $('#vsOk').addEventListener('click', () => { const v = VS.T.values[VS.idx], f = VS.onOk; sheet.close(); if (f) setTimeout(() => f(v), 160); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen) sheet.close(); });

  /* ---------- Screen router with direction-aware transitions ---------- */
  const SCR = (id) => $('#s-' + id);
  const TAB_OF = { home: 0, lobby: 0, pass: 0, game: 0, end: 0, session: 1, remote: 1, settings: 2 };
  const INGAME = new Set(['pass', 'game', 'end']);
  const KF = {
    push: { in: [{ transform: 'translate3d(34%,0,0) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], out: [{ transform: 'none', opacity: 1 }, { transform: 'translate3d(-16%,0,0) scale(.95)', opacity: 0 }], d: 540 },
    pop: { in: [{ transform: 'translate3d(-16%,0,0) scale(.95)', opacity: 0 }, { transform: 'none', opacity: 1 }], out: [{ transform: 'none', opacity: 1 }, { transform: 'translate3d(34%,0,0) scale(.96)', opacity: 0 }], d: 500 },
    tabR: { in: [{ transform: 'translate3d(22%,0,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], out: [{ transform: 'none', opacity: 1 }, { transform: 'translate3d(-12%,0,0)', opacity: 0 }], d: 460 },
    tabL: { in: [{ transform: 'translate3d(-22%,0,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], out: [{ transform: 'none', opacity: 1 }, { transform: 'translate3d(12%,0,0)', opacity: 0 }], d: 460 },
    rise: { in: [{ transform: 'translate3d(0,40px,0) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], out: [{ transform: 'none', opacity: 1 }, { transform: 'scale(1.06)', opacity: 0 }], d: 560 },
    sink: { in: [{ transform: 'scale(1.08)', opacity: 0 }, { transform: 'none', opacity: 1 }], out: [{ transform: 'none', opacity: 1 }, { transform: 'translate3d(0,40px,0) scale(.94)', opacity: 0 }], d: 520 },
    morphIn: { in: [{ opacity: 0 }, { opacity: 1 }], out: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,30px,0) scale(.97)' }], d: 420, outD: 280, delay: 230 },
    morphOut: { in: [{ opacity: 0 }, { opacity: 1 }], out: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,24px,0)' }], d: 460, outD: 340, delay: 120 },
    fade: { in: [{ opacity: 0 }, { opacity: 1 }], out: [{ opacity: 1 }, { opacity: 0 }], d: 300 }
  };
  function stagger(el) {
    $$('[data-st]', el).forEach((s, i) => s.style.setProperty('--i', i));
    el.classList.remove('st-in'); void el.offsetWidth; el.classList.add('st-in');
  }
  function placeTabInd() {
    const b = $('.tab[aria-current="page"]'), ind = $('#tabInd');
    if (!b || !b.offsetWidth) return;
    ind.style.width = b.offsetWidth + 'px'; ind.style.transform = 'translateX(' + b.offsetLeft + 'px)';
  }
  function setChrome(id) {
    const ingame = INGAME.has(id);
    app.classList.toggle('ingame', ingame); app.classList.toggle('notabs', ingame);
    $('#tabbar').classList.toggle('hide', ingame);
    const ti = TAB_OF[id];
    $$('.tab').forEach((t) => { if (+t.dataset.i === ti) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    placeTabInd();
  }
  const router = {
    cur: 'home', busy: false, queued: null, hooks: {},
    go(id, kind) {
      if (id === router.cur) return false;
      if (router.busy) { router.queued = [id, kind]; return false; }
      const from = SCR(router.cur), to = SCR(id), prev = router.cur;
      router.busy = true; router.cur = id;
      if (router.hooks.enter) router.hooks.enter(id, prev);
      to.hidden = false; if (kind !== 'keep') to.scrollTop = 0;
      if (plain) {
        from.hidden = true; setChrome(id); router.busy = false;
        V.stop(); $('#vortex').classList.add('off');
        if (router.hooks.after) router.hooks.after(id, prev);
        return true;
      }
      from.style.zIndex = 1; to.style.zIndex = 2;
      stagger(to); setChrome(id);
      if (id === 'home') { $('#vortex').classList.remove('off'); V.start(); }
      if (RM || !kind || kind === 'keep') kind = 'fade';
      const k = KF[kind] || KF.fade, anims = [];
      anims.push(from.animate(k.out, { duration: k.outD || k.d * 0.8, easing: 'cubic-bezier(.45,0,.7,.4)', fill: 'forwards' }));
      anims.push(to.animate(k.in, { duration: k.d, delay: k.delay != null ? k.delay : k.d * 0.12, easing: EO, fill: 'backwards' }));
      let fin = false;
      const done = () => {
        if (fin) return; fin = true;
        from.hidden = true; anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
        from.style.zIndex = to.style.zIndex = '';
        router.busy = false;
        if (id !== 'home') { V.stop(); $('#vortex').classList.add('off'); }
        if (router.hooks.after) router.hooks.after(id, prev);
        if (router.queued) { const q = router.queued; router.queued = null; router.go(q[0], q[1]); }
      };
      Promise.all(anims.map((a) => a.finished)).then(done, done);
      setTimeout(done, 2000);
      return true;
    },
    /* Jump without animation (boot). */
    show(id) {
      $$('.screen').forEach((s) => { s.hidden = s.id !== 's-' + id; });
      router.cur = id; setChrome(id); stagger(SCR(id));
      if (id === 'home' && !plain) { $('#vortex').classList.remove('off'); V.start(); } else { V.stop(); $('#vortex').classList.add('off'); }
    }
  };
  addEventListener('resize', () => { placeTabInd(); V.resize(); if (router.cur === 'home') deck.size(); });

  /* ---------- Tarot deck in front of the portal ---------- */
  const corner = (c) => '<svg class="cn ' + c + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#corner"/></svg>';
  const deckEl = $('#deck');
  const D = { pos: 0, v: 0, target: 0, spread: 1, raf: 0, lt: 0, active: -1, sp: 130, items: [], cards: [], onChoose: null, onActive: null };
  const wrapO = (o) => { const N = D.items.length; o = ((o % N) + N) % N; return o > N / 2 ? o - N : o; };
  const mod = (i) => { const N = D.items.length; return ((i % N) + N) % N; };
  let tagFlip = false, drag = null, suppress = false, choosing = false;
  const deck = {
    /* items: [{ id, num, name, tag }] */
    init(items, onChoose, onActive) {
      D.items = items; D.onChoose = onChoose; D.onActive = onActive;
      deckEl.insertAdjacentHTML('beforeend', items.map((m, i) => '<button class="dk" type="button" data-i="' + i + '" tabindex="-1" role="option"><span class="dk-face">' + corner('tl') + corner('tr') + corner('bl') + corner('br') + '<span class="dk-num">' + m.num + '</span><span class="dk-win aslot" data-art="' + m.id + '"></span><span class="dk-name"></span><span class="dk-sheen"></span></span><span class="dk-dim"></span></button>').join(''));
      D.cards = $$('.dk', deckEl);
      $('#runes').innerHTML = items.map(() => '<i></i>').join('');
      D.cards.forEach((c, i) => c.addEventListener('click', () => {
        if (suppress) return;
        if (i === D.active && Math.abs(D.pos - Math.round(D.pos)) < 0.2) deck.choose(); else springTo(Math.round(D.pos) + wrapO(i - D.pos));
      }));
      deck.relabel(items);
    },
    relabel(items) {
      D.items = items;
      D.cards.forEach((c, i) => { c.querySelector('.dk-name').textContent = items[i].name; c.setAttribute('aria-label', items[i].num + ': ' + items[i].name); });
      const a = D.active; D.active = -1; if (a >= 0) setActive(a);
    },
    size() {
      const w = deckEl.clientWidth, h = deckEl.clientHeight; if (!w || !h) return;
      const cw = Math.max(130, Math.min(w * 0.62, (h - 18) / 1.6, 262));
      deckEl.style.setProperty('--cw', cw + 'px'); deckEl.style.setProperty('--ch', cw * 1.6 + 'px');
      $('#portal').style.setProperty('--ring', Math.round(Math.min(cw * 1.6 * 1.2, w * 1.18)) + 'px');
      D.sp = cw * 0.66; layout();
      const pr = $('#portal').getBoundingClientRect(), ar = app.getBoundingClientRect();
      if (pr.width) V.center(pr.left + pr.width / 2 - ar.left, pr.top + pr.height / 2 - ar.top);
    },
    deal(from) {
      from = from == null ? 0.08 : from;
      if (RM) { D.spread = 1; layout(); return; }
      D.spread = from; layout();
      const t0 = performance.now(), dur = 1000;
      const e = (x) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
      (function f(t) { const k = Math.min(1, (t - t0) / dur); D.spread = from + (1 - from) * e(k); layout(); if (k < 1) requestAnimationFrame(f); })(t0);
    },
    setIndex(i) { D.pos = D.target = i; D.v = 0; layout(); },
    get active() { return D.active; },
    get choosing() { return choosing; },
    choose() {
      if (choosing || router.busy || router.cur !== 'home') return;
      if (Math.abs(D.pos - Math.round(D.pos)) > 0.05) { D.pos = D.target = Math.round(D.pos); D.v = 0; layout(); }
      if (D.onChoose) D.onChoose(D.active);
    },
    /* The chosen card lifts, the deck falls away and the card's picture flies to the lobby picture.
       go() must show the lobby (already rendered with a .hero-art). */
    morphIn(go) {
      const i = D.active, card = D.cards[i];
      if (RM) { go('fade'); return; }
      choosing = true; buzz(15);
      const win = card.querySelector('.dk-win'), from = relRect(win), face = card.querySelector('.dk-face');
      face.animate([{ transform: 'none' }, { transform: 'translateY(-12px) scale(1.05)' }], { duration: 220, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' });
      setTimeout(() => {
        const ghost = ghostOf(win.dataset.art, relRect(win), WIN_R);
        win.style.visibility = 'hidden';
        go('morphIn');
        const hero = $('#s-lobby .hero'), art = hero && hero.querySelector('.hero-art');
        const reset = () => { win.style.visibility = ''; face.getAnimations().forEach((a) => a.cancel()); choosing = false; };
        if (!art) { ghost.remove(); reset(); return; }
        const to = relRect(art);
        art.style.opacity = 0;
        const mid = { left: (from.left + to.left) / 2, top: Math.min(from.top, to.top) - 10, width: (from.width + to.width) / 2 * 1.08, height: (from.height + to.height) / 2 * 1.08 };
        ghost.animate([
          Object.assign(px(from), { borderRadius: WIN_R, boxShadow: '0 0 0 rgba(139,92,255,0)' }),
          Object.assign(px(mid), { borderRadius: '46%', boxShadow: '0 0 60px rgba(139,92,255,.7)', offset: 0.45 }),
          Object.assign(px(to), { borderRadius: '50%', boxShadow: '0 0 40px rgba(255,61,154,.35)' })
        ], { duration: 760, easing: 'cubic-bezier(.55,0,.2,1)', fill: 'forwards' }).onfinish = () => {
          art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' }).onfinish = () => { art.style.opacity = ''; art.getAnimations().forEach((a) => a.cancel()); };
          ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).onfinish = () => ghost.remove();
          landWave(to); buzz(10); reset();
        };
        const rr = hero.querySelector('.hr-runes');
        if (rr) rr.animate([{ transform: 'scale(1.7) rotate(-50deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, delay: 260, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'backwards' });
      }, 200);
    },
    /* Back: the lobby picture flies back into its card while the deck slides in again. */
    morphOut(go) {
      const hero = $('#s-lobby .hero-art'), card = D.cards[D.active];
      if (RM || !hero || !card || choosing) { go('fade'); return; }
      const from = relRect(hero), ghost = ghostOf(card.querySelector('.dk-win').dataset.art, from, '50%');
      hero.style.opacity = 0;
      if (!go('morphOut')) { ghost.remove(); hero.style.opacity = ''; return; }
      choosing = true;
      D.spread = 1; deck.size(); layout();
      const win = card.querySelector('.dk-win');
      win.style.visibility = 'hidden';
      D.cards.forEach((c) => { if (c !== card) c.animate([{ opacity: 0, translate: '0 26px' }, { translate: '0 0' }], { duration: 520, delay: 260, easing: EO, fill: 'backwards' }); });
      card.animate([{ opacity: 0, scale: '.94' }, { scale: '1' }], { duration: 420, delay: 120, easing: EO, fill: 'backwards' });
      const to = relRect(win);
      ghost.animate([Object.assign(px(from), { borderRadius: '50%' }), Object.assign(px(to), { borderRadius: WIN_R })], { duration: 640, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }).onfinish = () => {
        win.style.visibility = '';
        ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = () => ghost.remove();
        hero.style.opacity = ''; choosing = false;
      };
    }
  };
  function layout() {
    const s = D.spread;
    D.cards.forEach((el, i) => {
      const o = wrapO(i - D.pos), a = Math.abs(o);
      const x = o * D.sp * s, y = Math.min(a, 2.5) * 16 * s, z = -Math.min(a, 2.5) * 150 * s, ry = -clamp(o * 34, -58, 58) * s, rz = o * 3 * s + (1 - s) * (i - 3) * 4, sc = 1 - Math.min(a, 1.6) * 0.12;
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      el.style.opacity = a > 2.6 ? 0 : a > 1.9 ? ((2.6 - a) / 0.7).toFixed(3) : 1;
      el.style.zIndex = 100 - Math.round(a * 10);
      el.lastElementChild.style.opacity = (Math.min(a, 1.5) * 0.42).toFixed(3);
      el.classList.toggle('center', a < 0.5);
    });
    if (!D.items.length) return;
    const act = mod(Math.round(D.pos)); if (act !== D.active) setActive(act);
  }
  function setActive(i) {
    D.active = i;
    $$('#runes i').forEach((r, k) => r.classList.toggle('on', k === i));
    const a = $('#tagA'), b = $('#tagB'), on = tagFlip ? b : a, off = tagFlip ? a : b;
    if (on.textContent === '') on.textContent = D.items[i].tag;
    else { off.textContent = D.items[i].tag; off.classList.add('on'); on.classList.remove('on'); tagFlip = !tagFlip; }
    D.cards.forEach((c, k) => c.setAttribute('aria-selected', String(k === i)));
    if (D.onActive) D.onActive(i);
  }
  function step(now) {
    const dt = Math.min(0.032, (now - D.lt) / 1000 || 0.016); D.lt = now;
    const f = -170 * (D.pos - D.target) - 23 * D.v; D.v += f * dt; D.pos += D.v * dt; layout();
    if (Math.abs(D.v) < 0.003 && Math.abs(D.pos - D.target) < 0.002) { D.pos = D.target; D.v = 0; layout(); D.raf = 0; return; }
    D.raf = requestAnimationFrame(step);
  }
  function springTo(t) {
    D.target = t;
    if (RM) { D.pos = t; D.v = 0; layout(); return; }
    if (!D.raf) { D.lt = performance.now(); D.raf = requestAnimationFrame(step); }
  }
  const goDeck = (d) => springTo(Math.round(D.target) + d);
  $('#prevB').addEventListener('click', () => goDeck(-1));
  $('#nextB').addEventListener('click', () => goDeck(1));
  $('#chooseB').addEventListener('click', () => deck.choose());
  deckEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goDeck(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goDeck(1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deck.choose(); }
  });
  deckEl.addEventListener('pointerdown', (e) => { if (e.button || choosing) return; cancelAnimationFrame(D.raf); D.raf = 0; drag = { x: e.clientX, p0: D.pos, lx: e.clientX, lt: performance.now(), moved: false, id: e.pointerId }; });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) drag.moved = true;
    if (!drag.moved) return;
    const now = performance.now(), dt = Math.max(1, now - drag.lt);
    D.v = 0.75 * (-((e.clientX - drag.lx) / D.sp) / (dt / 1000)) + 0.25 * D.v; drag.lx = e.clientX; drag.lt = now;
    D.pos = drag.p0 - dx / D.sp; layout();
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (d.moved) {
      suppress = true; setTimeout(() => { suppress = false; }, 60);
      if (performance.now() - d.lt > 90) D.v *= 0.2;
      let t = Math.round(D.pos + D.v * 0.22); t = clamp(t, Math.round(d.p0) - 3, Math.round(d.p0) + 3);
      D.target = t; D.lt = performance.now(); if (!D.raf) D.raf = requestAnimationFrame(step);
    } else if (Math.abs(D.pos - Math.round(D.pos)) > 0.01) springTo(Math.round(D.pos));
  }
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);

  /* Morph helpers */
  const WIN_R = '50% 50% 8px 8px / 34% 34% 8px 8px';
  function relRect(el) { const r = el.getBoundingClientRect(), A = app.getBoundingClientRect(); return { left: r.left - A.left, top: r.top - A.top, width: r.width, height: r.height }; }
  const px = (r) => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  let artHTML = () => '';
  function ghostOf(id, r, radius) {
    const g = document.createElement('div'); g.className = 'mghost';
    g.innerHTML = artHTML(id); Object.assign(g.style, px(r), { borderRadius: radius });
    app.appendChild(g); return g;
  }
  function landWave(r) {
    const w = document.createElement('div'); w.className = 'mwave';
    Object.assign(w.style, px(r)); app.appendChild(w);
    w.animate([{ transform: 'scale(.9)', opacity: 0.9 }, { transform: 'scale(1.55)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => w.remove();
  }

  /* ---------- Hold pads: the whole area is the target, made for gloves and nerves ----------
     Several fingers count, and a lift of up to GRACE ms pauses instead of resetting.
     o: { duration() seconds, enabled(), checkpoint() 0..1, onStart(p), onPause(p), onCancel(p), onDone(), onStep(n) } */
  const GRACE = 450;
  const padHTML = (attrs, big, sub, cls, mark) => '<button class="hold pad ' + (cls || '') + '" type="button" ' + attrs + '><span class="pad-fill"></span><span class="pad-edge"></span>' + (mark ? '<span class="pad-mark"></span>' : '') + '<span class="pad-in"><span class="hold-big">' + big + '</span><span class="hold-sub">' + sub + '</span><span class="pad-pct">0 %</span></span></button>';
  function makePad(el, o) {
    const h = { p: 0, on: false, grace: false, ptrs: new Set(), graceT: 0, raf: 0, t0: 0, base: 0, step: -1, dead: false };
    const sub = el.querySelector('.hold-sub'), pct = el.querySelector('.pad-pct');
    const baseText = () => el.dataset.sub || sub.textContent;
    el.dataset.sub = sub.textContent;
    const paint = () => {
      el.style.setProperty('--p', h.p.toFixed(3));
      if (pct) pct.textContent = Math.floor(h.p * 100) + ' %';
      const left = (1 - h.p) * o.duration();
      const txt = h.on ? (o.left ? o.left(left) : left.toFixed(1)) : h.grace && o.keepText ? o.keepText() : null;
      sub.textContent = txt != null ? txt : baseText();
    };
    function frame(t) {
      if (!h.on) return;
      h.p = Math.min(1, h.base + (t - h.t0) / (o.duration() * 1000));
      const n = Math.floor(h.p * 8);
      if (n !== h.step) { h.step = n; if (o.onStep) o.onStep(n); }
      paint();
      if (h.p >= 1) {
        h.on = false; h.dead = true; el.classList.remove('holding');
        if (!RM) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
        buzz([40, 30, 40]); o.onDone(); return;
      }
      h.raf = requestAnimationFrame(frame);
    }
    function start() {
      clearTimeout(h.graceT);
      if (h.on) return;
      const resumed = h.grace;
      h.grace = false; el.classList.remove('grace');
      h.on = true; h.base = h.p; h.t0 = performance.now(); h.step = -1;
      el.classList.add('holding');
      if (!resumed) buzz(15);
      if (o.onStart) o.onStart(h.p);
      h.raf = requestAnimationFrame(frame);
    }
    function release() {
      if (!h.on) return;
      h.on = false; cancelAnimationFrame(h.raf);
      h.grace = true; el.classList.remove('holding'); el.classList.add('grace'); paint();
      if (o.onPause) o.onPause(h.p);
      h.graceT = setTimeout(() => {
        h.grace = false; el.classList.remove('grace');
        const cp = o.checkpoint ? o.checkpoint() : 0;
        const target = cp && h.p >= cp ? cp : 0, from = h.p;
        if (o.onCancel) o.onCancel(target);
        if (RM || from === target) { h.p = target; paint(); return; }
        const t0 = performance.now();
        (function drain(t) { if (h.on) return; const k = Math.min(1, (t - t0) / 320); h.p = from + (target - from) * k; paint(); if (k < 1) requestAnimationFrame(drain); })(t0);
      }, GRACE);
    }
    el.addEventListener('pointerdown', (e) => {
      if (h.dead || el.disabled || (o.enabled && !o.enabled()) || e.button > 0) return;
      e.preventDefault(); h.ptrs.add(e.pointerId);
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      start();
    });
    const up = (e) => { if (e && e.pointerId != null) { h.ptrs.delete(e.pointerId); if (h.ptrs.size) return; } release(); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => el.addEventListener(t, up));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); if (!h.dead && (!o.enabled || o.enabled())) start(); } });
    el.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
    el.addEventListener('click', (e) => e.preventDefault());
    h.reset = () => { clearTimeout(h.graceT); cancelAnimationFrame(h.raf); h.on = h.grace = h.dead = false; h.ptrs.clear(); h.p = 0; el.classList.remove('holding', 'grace', 'pulse'); paint(); };
    paint();
    return h;
  }
  /* Read-only pad on the other phones: shows the progress the controlling phone publishes. */
  function padShow(el, p, active) {
    if (!el) return;
    el.style.setProperty('--p', p.toFixed(3));
    el.classList.toggle('holding', !!active);
    const pct = el.querySelector('.pad-pct'); if (pct) pct.textContent = Math.floor(p * 100) + ' %';
  }

  /* ---------- End screen effects ---------- */
  function fxBurst(x, y, n, colors, dist) {
    const box = $('#fx');
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'); s.className = 'spark'; const c = pick(colors);
      s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + c + ';box-shadow:0 0 10px ' + c; box.appendChild(s);
      const a = i / n * TAU + Math.random() * 0.3, d = dist * (0.6 + Math.random() * 0.7);
      s.animate([{ transform: 'rotate(45deg) translate(0,0) scale(.4)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) rotate(225deg) scale(' + (0.5 + Math.random()) + ')', opacity: 0 }], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'both' }).onfinish = () => s.remove();
    }
  }
  function endFx(kind, anchor) {
    if (RM || plain || !kind) return;
    const box = $('#fx'), A = app.getBoundingClientRect(), er = anchor.getBoundingClientRect();
    const x = er.left - A.left + er.width / 2, y = er.top - A.top + er.height / 2, H = A.height;
    if (kind === 'win') {
      fxBurst(x, y, 28, ['#ffd23f', '#ff3d9a', '#8b5cff', '#3fe0a0', '#ffb22e'], 170);
      for (let i = 0; i < 34; i++) {
        const f = document.createElement('i'); f.className = 'conf'; const c = pick(['#ffd23f', '#ff3d9a', '#8b5cff', '#3fe0a0', '#ff7a2e', '#5aa9ff']);
        f.style.cssText = 'left:' + Math.random() * 100 + '%;background:' + c; box.appendChild(f);
        const dx = (Math.random() - 0.5) * 120;
        f.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.08 }, { transform: 'translate(' + dx + 'px,' + (H + 40) + 'px) rotate(' + (400 + Math.random() * 500) + 'deg)', opacity: 0.9 }], { duration: 2600 + Math.random() * 2200, delay: Math.random() * 1400, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' }).onfinish = () => f.remove();
      }
    } else if (kind === 'lose' || kind === 'boom') {
      if (kind === 'boom') fxBurst(x, y, 22, ['#ff7a2e', '#ff4a5e', '#ffd23f'], 200);
      for (let i = 0; i < 26; i++) {
        const f = document.createElement('i'); f.className = 'spark'; const c = pick(['#ff7a2e', '#ff4a5e', '#ff3d9a']);
        f.style.cssText = 'left:' + Math.random() * 100 + '%;top:' + (H + 10) + 'px;background:' + c + ';box-shadow:0 0 8px ' + c + ';width:6px;height:6px'; box.appendChild(f);
        f.animate([{ transform: 'translate(0,0) rotate(45deg)', opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { transform: 'translate(' + (Math.random() - 0.5) * 90 + 'px,' + -H * (0.5 + Math.random() * 0.4) + 'px) rotate(400deg)', opacity: 0 }], { duration: 2800 + Math.random() * 2000, delay: Math.random() * 1600, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' }).onfinish = () => f.remove();
      }
    } else fxBurst(x, y, 20, ['#c3a6ff', '#8b5cff', '#ff9ad6'], 150);
  }
  function boomFx() {
    if (RM || plain) return;
    const box = $('#fx');
    const fl = document.createElement('div'); fl.className = 'flash'; box.appendChild(fl);
    fl.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.85, offset: 0.35 }, { opacity: 0 }], { duration: 1300, easing: 'ease-out' }).onfinish = () => fl.remove();
    for (let i = 0; i < 3; i++) {
      const r = document.createElement('div'); r.className = 'boom-ring'; box.appendChild(r);
      r.animate([{ opacity: 1, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(7)' }], { duration: 900 + i * 200, delay: i * 120, easing: 'cubic-bezier(.1,.7,.2,1)' }).onfinish = () => r.remove();
    }
    const s = $('#screens'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); setTimeout(() => s.classList.remove('shake'), 700);
  }
  /* Short spark burst in the middle of an element (e.g. a role card turning over). */
  function sparksAt(box, n, dist) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'); box.appendChild(s);
      const a = i / n * TAU, d = dist + Math.random() * 90;
      s.animate([{ transform: 'rotate(45deg) scale(.3)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d * 1.2 + 'px) rotate(225deg) scale(' + (0.6 + Math.random() * 0.8) + ')', opacity: 0 }], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' }).onfinish = () => s.remove();
    }
  }

  /* The shell never scrolls as a whole; only the screens scroll inside. */
  app.addEventListener('scroll', () => { if (app.scrollTop || app.scrollLeft) { app.scrollTop = 0; app.scrollLeft = 0; } });
  addEventListener('scroll', () => { if (scrollY || scrollX) scrollTo(0, 0); });

  window.UI = {
    $, $$, RM, EO, SPRING, TAU, esc, ic, clamp, pick,
    roll, toast, evt, evtOff, twoTap, disarm, stagger, placeTabInd, heroRunes,
    sheet, valueSheet, router, deck, V, makePad, padHTML, padShow, fxBurst, endFx, boomFx, sparksAt,
    setArt(fn) { artHTML = fn; },
    setPlain(v) { plain = !!v; if (plain) { V.stop(); $('#vortex').classList.add('off'); } },
    get plain() { return plain; },
    setVibrate(fn) { vibrate = fn; }
  };
})();
