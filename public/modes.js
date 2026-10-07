/* Game modes besides the bomb: settings, rules, screens and Murder Mystery roles.
   app.js owns the game loop, sessions and sound. It merges DEF/TIME from here into its settings
   and calls MODES.create(ctx) once its helpers exist. All text goes through T() (i18n.js).

   Shared state contract (G, published to every phone in a session):
     { mode, id, phase: 'round' | 'end', cfg, startedAt, endAt, ev: [...], result }
   ev entries are one-shot announcements: { id, at, say: [lineKeys], sig, cat }.
   Results are text keys plus values ({ kicker, title, sub, v }) so every phone shows them in its own language.
   Timed announcements come from timeline(g) so every phone plays them on the shared clock.
   Secrets (VIP target, Murder roles) never go into G: they stay on the game master's phone or
   travel as private messages to a single player. */
(function () {
  const tr = (k, v) => window.T(k, v);
  const range = (a, b, step) => { const r = []; for (let v = a; v <= b; v += step) r.push(v); return r; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const LETTERS = 'ABCDEF';
  const TEAM_HEX = ['#ff5a4e', '#5aa9ff', '#3fd98a', '#ffd23f', '#c38bff', '#ff9f40', '#e8ebe6', '#8e979e'];

  /* ---------- Settings (merged into app.js) ---------- */
  const mins = { parts: (v) => [String(v), tr('u.min')], chip: (v) => v + ' ' + tr('u.min') };
  const minsOff = { parts: (v) => (v === 0 ? [tr('u.off'), ''] : [String(v), tr('u.min')]), chip: (v) => (v === 0 ? tr('u.off') : v + ' ' + tr('u.min')) };
  const secs = { parts: (v) => [String(v), tr('u.s')], chip: (v) => v + ' ' + tr('u.s') };
  const count = (one, many) => ({ parts: (v) => [String(v), tr(v === 1 ? one : many)], chip: (v) => String(v) });
  const C = (title, desc, values, presets, fmt) => Object.assign({ title, desc, values, presets }, fmt);

  const TIME = {
    vipTime: C('vip.time', 'vip.timeDesc', range(1, 60, 1), [5, 8, 10, 12, 15, 20, 30, 45], mins),
    vipLives: C('vip.livesTitle', 'vip.livesDesc', range(1, 5, 1), [1, 2, 3, 4, 5], count('u.life', 'u.lives')),
    vipTargets: C('vip.targets', 'vip.targetsDesc', range(1, 4, 1), [1, 2, 3, 4], count('u.target', 'u.targets')),
    sndTime: C('snd.time', 'snd.timeDesc', range(1, 30, 1), [3, 5, 8, 10, 12, 15, 20, 30], mins),
    sndObjs: C('snd.objs', 'snd.objsDesc', range(2, 5, 1), [2, 3, 4, 5], count('u.target', 'u.targets')),
    sndNeed: C('snd.needTitle', 'snd.needDesc', range(1, 5, 1), [1, 2, 3, 4, 5], count('u.target', 'u.targets')),
    sndHold: C('snd.hold', 'snd.holdDesc', range(1, 20, 1), [2, 3, 4, 5, 6, 8, 10, 15], secs),
    brTeams: C('br.teams', 'br.teamsDesc', range(2, 8, 1), [2, 3, 4, 5, 6, 8], count('u.team', 'u.teams')),
    brTime: C('br.time', 'br.timeDesc', range(0, 90, 5), [0, 10, 15, 20, 30, 45, 60, 90], minsOff),
    brZone: C('br.zoneTitle', 'br.zoneDesc', range(0, 20, 1), [0, 2, 3, 4, 5, 8, 10, 15], minsOff),
    brDrop: C('br.dropTitle', 'br.dropDesc', range(0, 20, 1), [0, 3, 4, 5, 6, 8, 10, 15], minsOff),
    brPts: C('br.pts', 'br.ptsDesc', range(1, 6, 1), [2, 3, 4, 5, 6], count('u.point', 'u.points')),
    hosTime: C('hos.time', 'hos.timeDesc', range(1, 60, 1), [5, 8, 10, 12, 15, 20, 30, 45], mins),
    hosFree: C('hos.free', 'hos.freeDesc', range(1, 30, 1), [3, 5, 8, 10, 15, 20], secs),
    hosEvac: C('hos.evac', 'hos.evacDesc', range(1, 15, 1), [1, 2, 3, 5, 8, 10], secs),
    infPlayers: C('inf.players', 'inf.playersDesc', range(2, 40, 1), [6, 8, 10, 12, 15, 20, 25, 30], count('u.player', 'u.players')),
    infStart: C('inf.startTitle', 'inf.startDesc', range(1, 5, 1), [1, 2, 3, 4, 5], count('u.infected1', 'u.infected')),
    infDelay: C('inf.delay', 'inf.delayDesc', range(0, 60, 5), [0, 5, 10, 15, 20, 30, 45, 60], { parts: (v) => (v === 0 ? [tr('u.now'), ''] : [String(v), tr('u.s')]), chip: (v) => (v === 0 ? tr('u.now') : v + ' ' + tr('u.s')) }),
    infTime: C('inf.time', 'inf.timeDesc', range(1, 60, 1), [5, 8, 10, 12, 15, 20, 30, 45], mins),
    muTime: C('mu.time', 'mu.timeDesc', range(0, 90, 5), [0, 10, 15, 20, 30, 45, 60, 90], minsOff),
    muMurderers: C('mu.murderers', 'mu.murderersDesc', range(1, 3, 1), [1, 2, 3], count('u.murderer', 'u.murderers'))
  };

  const MU_EXTRA = ['medic', 'bounty', 'copycat', 'twins', 'detective', 'informant', 'bodyguard', 'double', 'avenger', 'joker', 'scientist', 'spy'];
  const DEF = {
    mode: 'bomb',
    vipTime: 15, vipLives: 1, vipTargets: 2,
    sndTime: 8, sndObjs: 3, sndNeed: 2, sndHold: 5,
    brTeams: 4, brTime: 20, brZone: 5, brDrop: 0, brPts: 4,
    hosTime: 10, hosFree: 10, hosEvac: 3,
    infPlayers: 12, infStart: 1, infDelay: 10, infTime: 10,
    muTime: 0, muMurderers: 2, muNames: '',
    muRoles: { medic: true, bounty: true, copycat: true, twins: true, detective: false, informant: false, bodyguard: false, double: false, avenger: false, joker: false, scientist: false, spy: false }
  };

  /* ---------- Murder Mystery roles ---------- */
  /* Cards are data (role keys, names); the text is rendered on the phone that shows them. */
  const ROLES = {
    murderer: { icon: '🔪', team: 'evil' }, innocent: { icon: '😇', team: 'good' }, medic: { icon: '💉', team: 'good' },
    bounty: { icon: '🎯', team: 'own' }, copycat: { icon: '🎲', team: 'draw' }, amok: { icon: '⚠️', team: 'own' },
    twin: { icon: '👯', team: 'good' }, detective: { icon: '🔎', team: 'good' }, informant: { icon: '🕵️', team: 'good' },
    bodyguard: { icon: '🛡️', team: 'good' }, double: { icon: '🎭', team: 'good' }, avenger: { icon: '💀', team: 'good' },
    joker: { icon: '🃏', team: 'own' }, scientist: { icon: '🧪', team: 'good' }, spy: { icon: '📡', team: 'good' }
  };
  const COPYCAT_DRAW = ['innocent', 'medic', 'amok'];
  const realRole = (p) => (p.role === 'copycat' ? p.drawn : p.role);
  const roleLabel = (p) => (p.role === 'copycat' ? tr('r.copycat') + ' → ' + tr('r.' + p.drawn) : tr('r.' + p.role));

  /* players: [{ name, mid }] → same objects with role and a private card each, or { error }. */
  function assignRoles(players, S) {
    const R = S.muRoles || {};
    const pool = [];
    for (let i = 0; i < S.muMurderers; i++) pool.push('murderer');
    MU_EXTRA.forEach((r) => { if (R[r]) { if (r === 'twins') pool.push('twin', 'twin'); else pool.push(r); } });
    if (players.length < 3) return { error: ['mu.errFew'] };
    if (pool.length > players.length) return { error: ['mu.errRoles', { r: pool.length, n: players.length }] };
    while (pool.length < players.length) pool.push('innocent');
    shuffle(pool);
    const ps = players.map((p, i) => Object.assign({}, p, { role: pool[i] }));
    ps.forEach((p) => { if (p.role === 'copycat') p.drawn = pick(COPYCAT_DRAW); });
    const names = (list) => list.map((p) => p.name).join(', ');
    const others = (p) => ps.filter((q) => q !== p);
    const usedRoles = [...new Set(ps.map(realRole))];
    ps.forEach((p) => {
      const card = { name: p.name, role: p.role, info: [], act: null, notes: [] };
      if (p.role === 'murderer') {
        const mates = ps.filter((q) => q.role === 'murderer' && q !== p);
        card.info.push(mates.length ? [mates.length === 1 ? 'ri.mate' : 'ri.mates', { n: names(mates) }] : ['ri.alone']);
      } else if (p.role === 'twin') {
        const twin = ps.find((q) => q.role === 'twin' && q !== p);
        card.info.push(['ri.twin', { n: twin ? twin.name : '?' }]);
      } else if (p.role === 'bounty') {
        card.info.push(['ri.bounty', { n: pick(others(p)).name }]);
      } else if (p.role === 'informant') {
        const m = shuffle(ps.filter((q) => q.role === 'murderer'))[0];
        const rest = shuffle(ps.filter((q) => q !== p && q.role !== 'murderer')).slice(0, 2);
        card.info.push(['ri.informant', { n: names(shuffle([m].concat(rest).filter(Boolean))) }]);
      } else if (p.role === 'double') {
        card.info.push(['ri.double', { g: 'dg.' + Math.floor(Math.random() * 4) }]);
      } else if (p.role === 'copycat') {
        card.act = { type: 'draw', used: false, drawn: p.drawn };
      } else if (p.role === 'detective') {
        const opts = {};
        others(p).forEach((q) => { opts[q.name] = ['ri.check', { n: q.name, t: 'team.' + ROLES[realRole(q)].team }]; });
        card.act = { type: 'check', label: 'card.check', used: false, options: opts };
      } else if (p.role === 'scientist') {
        const opts = {};
        others(p).forEach((q) => {
          const real = realRole(q);
          const fakes = (usedRoles.length > 1 ? usedRoles : Object.keys(ROLES)).filter((r) => r !== real && r !== 'copycat');
          const pair = shuffle([real, pick(fakes)]);
          opts[q.name] = ['ri.study', { n: q.name, a: 'r.' + pair[0], b: 'r.' + pair[1] }];
        });
        card.act = { type: 'check', label: 'card.study', used: false, options: opts };
      }
      p.card = card;
    });
    return { players: ps };
  }
  /* Values that are themselves text keys (e.g. 'team.good') are translated too. */
  function trv(entry) {
    const k = entry[0], v = entry[1] || {}, out = {};
    Object.keys(v).forEach((x) => { const s = v[x]; out[x] = typeof s === 'string' && /^(team|r|dg)\./.test(s) ? tr(s) : s; });
    return tr(k, out);
  }

  /* ---------- Mode list, home cards and lobby settings ---------- */
  const tcard = (key, label, sub) => '<button class="tcard" type="button" data-key="' + key + '"><span class="tl" data-i18n="' + label + '"></span><span class="tv"></span><span class="td" data-i18n="' + sub + '"></span></button>';
  const LIST = [
    { id: 'bomb', icon: '💣', img: 'img/modes/bomb.webp' },
    { id: 'vip', icon: '👑', img: 'img/modes/vip.webp',
      setup: '<div class="tgrid">' + tcard('vipTime', 'vip.time', 'vip.timeSub') + tcard('vipLives', 'vip.lives', 'vip.livesSub') + tcard('vipTargets', 'vip.targets', 'vip.targetsSub') + '</div>' },
    { id: 'snd', icon: '🎯', img: 'img/modes/snd.webp',
      setup: '<div class="tgrid">' + tcard('sndTime', 'snd.time', 'snd.timeSub') + tcard('sndObjs', 'snd.objs', 'snd.objsSub') + tcard('sndNeed', 'snd.need', 'snd.needSub') + tcard('sndHold', 'snd.hold', 'snd.holdSub') + '</div>' },
    { id: 'br', icon: '🪂', img: 'img/modes/br.webp',
      setup: '<div class="tgrid">' + tcard('brTeams', 'br.teams', 'br.teamsSub') + tcard('brTime', 'br.time', 'br.timeSub') + tcard('brZone', 'br.zone', 'br.zoneSub') + tcard('brDrop', 'br.drop', 'br.dropSub') + tcard('brPts', 'br.pts', 'br.ptsSub') + '</div>' },
    { id: 'hostage', icon: '🆘', img: 'img/modes/hostage.webp',
      setup: '<div class="tgrid">' + tcard('hosTime', 'hos.time', 'hos.timeSub') + tcard('hosFree', 'hos.free', 'hos.freeSub') + tcard('hosEvac', 'hos.evac', 'hos.evacSub') + '</div>' },
    { id: 'inf', icon: '🧟', img: 'img/modes/inf.webp',
      setup: '<div class="tgrid">' + tcard('infPlayers', 'inf.players', 'inf.playersSub') + tcard('infStart', 'inf.start', 'inf.startSub') + tcard('infDelay', 'inf.delay', 'inf.delaySub') + tcard('infTime', 'inf.time', 'inf.timeSub') + '</div>' },
    { id: 'murder', icon: '🔪', img: 'img/modes/murder.webp',
      setup: '<div class="tgrid">' + tcard('muMurderers', 'mu.murderers', 'mu.murderersSub') + tcard('muTime', 'mu.time', 'mu.timeSub') + '</div>' +
        '<div class="group"><div class="row stack"><div class="txt"><div class="lbl" data-i18n="mu.special"></div><div class="desc" data-i18n="mu.specialDesc"></div></div><div class="rolepick" id="muRolePick"></div></div></div>' +
        '<div class="group"><div class="row stack"><div class="txt"><div class="lbl" data-i18n="mu.names"></div><div class="desc" data-i18n="mu.namesDesc"></div></div>' +
        '<textarea class="names" id="muNames" rows="5"></textarea><div class="desc" id="muCount"></div></div></div>' }
  ];
  const BY_ID = {};
  LIST.forEach((m) => { BY_ID[m.id] = m; });

  /* Mode art: the AI picture, or the hand-built vector version (setting "Bilder", body[data-art]).
     Slots (.artslot[data-art]) are refilled when the setting changes. */
  const artStyle = () => document.body.dataset.art || 'ai';
  function art(id, cls) {
    const m = BY_ID[id];
    const inner = artStyle() === 'vector' && window.ART ? window.ART.mode(id)
      : '<span class="art-emoji">' + m.icon + '</span>' + (m.img ? '<img src="' + m.img + '" alt="" onerror="this.remove()">' : '');
    return '<span class="art ' + (cls || '') + '">' + inner + '</span>';
  }
  const slot = (id, cls) => '<span class="artslot" data-art="' + id + '" data-cls="' + (cls || '') + '">' + art(id, cls) + '</span>';
  function fillArt() {
    document.querySelectorAll('.artslot').forEach((el) => { el.innerHTML = art(el.dataset.art, el.dataset.cls); });
    const logo = document.getElementById('logoSlot');
    if (logo) logo.innerHTML = artStyle() === 'vector' && window.ART ? window.ART.logo() : '<img src="img/logo.webp" alt="">';
  }
  /* Role symbol: hand-drawn neon glyph (never an emoji). */
  const sym = (role, cls) => (window.ART ? window.ART.role(role, cls) : '');

  /* Home cards and lobby setup markup go in before app.js runs, so its time-card code picks up these cards too. */
  (function buildSetup() {
    const host = document.getElementById('modeSets');
    LIST.forEach((m) => {
      if (!m.setup) return;
      const d = document.createElement('div');
      d.className = 'modeset'; d.dataset.mode = m.id; d.hidden = true;
      d.innerHTML = m.setup;
      host.appendChild(d);
    });
    const grid = document.getElementById('modeGrid');
    LIST.forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'modecard'; b.dataset.mode = m.id;
      b.innerHTML = slot(m.id) + '<span class="mc-name" data-i18n="m.' + m.id + '.name"></span><span class="mc-tag" data-i18n="m.' + m.id + '.tag"></span>';
      grid.appendChild(b);
    });
  })();

  /* ---------- Runtime ---------- */
  function create(ctx) {
    const $ = (id) => document.getElementById(id);
    const S = () => ctx.S();
    const G = () => ctx.G();

    /* Small persistent store for secrets that live only on this phone. */
    /* Cards from an older app version (text instead of role keys) are dropped. */
    const valid = (k, v) => {
      if (!v) return null;
      if (k === 'abt-card') return v.card && ROLES[v.card.role] ? v : null;
      if (k === 'abt-mu') return v.players && v.players.every((p) => ROLES[p.role] && p.card && ROLES[p.card.role]) ? v : null;
      return v;
    };
    const store = {
      get(k) { try { return valid(k, JSON.parse(localStorage.getItem(k) || 'null')); } catch (e) { return null; } },
      set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    };

    /* Host helpers: change G, add an announcement, publish. */
    function ev(say, sig, cat) { return { id: ctx.rid(), at: ctx.now(), say, sig, cat: cat || 'events' }; }
    function commit(patch, event) {
      const g = Object.assign({}, G(), patch);
      if (event) g.ev = (g.ev || []).concat(event).slice(-30);
      ctx.setG(g);
    }
    /* r: { why, side, kicker, title, sub, v, say, sig } with text keys. */
    function finish(g, t, r) {
      return Object.assign({}, g, { phase: 'end', hold: null, result: Object.assign({ at: t }, r) });
    }
    const left = (g, t) => (g.endAt ? g.endAt - t : null);
    function warnings(g) {
      if (!g.endAt) return [];
      const dur = g.endAt - g.startedAt, out = [];
      if (dur > 90000) out.push({ k: 'min1', at: g.endAt - 60000, say: ['min1'], cat: 'min1' });
      if (dur > 40000) out.push({ k: 's30', at: g.endAt - 30000, say: ['s30'], cat: 'events' });
      if (dur > 20000) out.push({ k: 's10', at: g.endAt - 10000, say: ['s10'], cat: 'events' });
      return out;
    }

    /* Generic hold button markup + wiring (host only). */
    const holdHtml = (attrs, big, hint, cls) => '<button class="hold mhold ' + (cls || '') + '" type="button" ' + attrs + '><span class="fill"></span><span class="letter">' + big + '</span><span class="hint">' + hint + '</span></button>';
    function holdProgress(el, h, t) {
      const p = h && h.start ? Math.min(1, Math.max(0, (t - h.start) / h.dur)) : 0;
      el.style.setProperty('--p', p);
      el.classList.toggle('holding', p > 0);
    }

    /* ---------- VIP ---------- */
    const vip = {
      start(s, t) {
        const cfg = { time: s.vipTime, lives: s.vipLives, targets: s.vipTargets };
        return { cfg, endAt: t + cfg.time * 60000, lives: cfg.lives, ev: [ev(['vip_start'], 'start', 'start')], secret: { target: Math.floor(Math.random() * cfg.targets) } };
      },
      derive(g, t) {
        if (g.endAt && t >= g.endAt) return finish(g, g.endAt, { why: 'timeout', side: 'att', kicker: 'vip.rTimeK', title: 'vip.rHunters', sub: 'vip.rTimeSub', say: ['timeout', 'hunter_win'], sig: 'low' });
        return g;
      },
      timeline: warnings,
      clock: (g, t) => ({ label: tr('game.left'), text: ctx.fmt(left(g, t)) }),
      status(g) {
        let h = '';
        for (let i = 0; i < g.cfg.lives; i++) h += i < g.lives ? '❤️' : '🖤';
        return tr('vip.status', { hearts: h });
      },
      body(g, remote) {
        if (remote) return '<p class="mnote">' + tr('vip.remote') + '</p>';
        return (g.cfg.targets > 1 ? '<button class="btn ghost" data-act="vipShow" type="button">' + tr('vip.show') + '</button><div class="secret" id="vipTarget" hidden></div>' : '') +
          '<button class="btn big hitbtn" data-act="vipHit" type="button">' + tr('vip.hit') + '</button>' +
          holdHtml('data-hold="vipGoal"', tr('vip.goal'), tr('vip.goalHint'), 'goal') +
          '<button class="btn ghost small" data-act="vipUndo" type="button">' + tr('vip.undo') + '</button>';
      },
      bind(root) {
        const el = root.querySelector('[data-hold="vipGoal"]');
        if (el) ctx.makeHold(el, { duration: () => 3, onDone: () => {
          ctx.setG(finish(G(), ctx.now(), { why: 'goal', side: 'def', kicker: 'vip.rGoalK', title: 'vip.rEscort', sub: 'vip.rGoalSub', say: ['vip_extracted', 'escort_win'], sig: 'jingle' }));
        } });
      },
      act(name) {
        const g = G();
        if (name === 'vipShow') {
          const box = $('vipTarget'), sec = ctx.secret(g.id) || {};
          if (box.hidden) { box.textContent = tr('vip.target', { p: LETTERS[sec.target || 0] }); box.hidden = false; setTimeout(() => { box.hidden = true; }, 5000); } else box.hidden = true;
        } else if (name === 'vipHit') {
          const lives = g.lives - 1;
          if (lives <= 0) ctx.setG(finish(Object.assign({}, g, { lives: 0 }), ctx.now(), { why: 'down', side: 'att', kicker: 'vip.rDownK', title: 'vip.rHunters', sub: 'vip.rDownSub', say: ['vip_down', 'hunter_win'], sig: 'low' }));
          else commit({ lives }, ev(['vip_hit'], 'hit'));
        } else if (name === 'vipUndo') {
          if (g.lives < g.cfg.lives) commit({ lives: g.lives + 1 });
        }
      }
    };

    /* ---------- Search & Destroy ---------- */
    const snd = {
      start(s, t, prev) {
        const cont = prev && prev.mode === 'snd' && prev.phase === 'end';
        const cfg = { time: s.sndTime, objs: s.sndObjs, need: Math.min(s.sndNeed, s.sndObjs), hold: s.sndHold };
        const roundNo = cont ? prev.roundNo + 1 : 1;
        const attacker = cont ? (prev.attacker === 1 ? 2 : 1) : 1;
        return {
          cfg, endAt: t + cfg.time * 60000, roundNo, attacker, score: cont ? prev.score : { 1: 0, 2: 0 },
          objs: Array.from({ length: cfg.objs }, () => 0), hold: null,
          ev: [ev(roundNo > 1 ? ['side_swap', 'snd_start'] : ['snd_start'], 'start', 'start')]
        };
      },
      win(g, team, t, r) {
        const score = Object.assign({}, g.score); score[team]++;
        return finish(Object.assign({}, g, { score }), t, Object.assign({}, r, { team, v: Object.assign({ t: team }, r.v) }));
      },
      derive(g, t) {
        if (g.endAt && t >= g.endAt) {
          const def = g.attacker === 1 ? 2 : 1;
          return snd.win(g, def, g.endAt, { why: 'timeout', side: 'def', kicker: 'snd.rTimeK', title: 'snd.rTeamWins', sub: 'snd.rTimeSub', say: ['timeout', 'def_win'], sig: 'low' });
        }
        return g;
      },
      timeline: warnings,
      clock: (g, t) => ({ label: tr('snd.clock', { r: g.roundNo, a: g.attacker }), text: ctx.fmt(left(g, t)) }),
      status: (g) => tr('snd.status', { d: g.objs.filter(Boolean).length, n: g.cfg.need }),
      body(g, remote) {
        let h = '<div class="objgrid">';
        g.objs.forEach((d, i) => { h += holdHtml('data-hold="obj" data-i="' + i + '"', LETTERS[i], remote ? tr('snd.objLabel', { o: LETTERS[i] }) : tr('snd.holdHint', { n: g.cfg.hold }), 'obj'); });
        h += '</div>';
        if (!remote) h += '<button class="btn ghost danger" data-act="sndElim" data-confirm="1" type="button">' + tr('snd.elim') + '</button>';
        return h;
      },
      bind(root) {
        root.querySelectorAll('[data-hold="obj"]').forEach((el) => {
          const i = +el.dataset.i;
          ctx.makeHold(el, {
            duration: () => G().cfg.hold,
            onStart: () => { if (!G().objs[i]) commit({ hold: { i, start: ctx.now(), dur: G().cfg.hold * 1000 } }); },
            onCancel: () => commit({ hold: null }),
            onDone: () => {
              const g = G(); if (g.phase !== 'round' || g.objs[i]) return;
              const t = ctx.now(), objs = g.objs.slice(); objs[i] = t;
              if (objs.filter(Boolean).length >= g.cfg.need) {
                ctx.setG(snd.win(Object.assign({}, g, { objs }), g.attacker, t, { why: 'objs', side: 'att', kicker: 'snd.rObjsK', title: 'snd.rTeamWins', sub: 'snd.rObjsSub', v: { n: g.cfg.need }, say: ['obj_down', 'att_win'], sig: 'boom' }));
              } else commit({ objs, hold: null }, ev(['obj_down'], 'alert'));
            }
          });
        });
      },
      update(root, g, t) {
        root.querySelectorAll('[data-hold="obj"]').forEach((el) => {
          const i = +el.dataset.i, done = !!g.objs[i];
          el.classList.toggle('done', done);
          el.disabled = done;
          if (done) { el.style.setProperty('--p', 1); el.querySelector('.hint').textContent = tr('snd.done'); } else if (ctx.isRemote()) holdProgress(el, g.hold && g.hold.i === i ? g.hold : null, t);
        });
      },
      act(name) {
        const g = G();
        if (name === 'sndElim') {
          const def = g.attacker === 1 ? 2 : 1;
          ctx.setG(snd.win(g, def, ctx.now(), { why: 'elim', side: 'def', kicker: 'snd.rElimK', title: 'snd.rTeamWins', sub: 'snd.rElimSub', say: ['att_elim', 'def_win'], sig: 'low' }));
        }
      },
      endExtra(g) {
        const next = g.attacker === 1 ? 2 : 1;
        return '<div class="score"><div><span>Team 1</span><b>' + g.score[1] + '</b></div><i>:</i><div><span>Team 2</span><b>' + g.score[2] + '</b></div></div>' +
          '<p class="fine center">' + tr('snd.after', { r: g.roundNo, t: next }) + '</p>';
      },
      again: () => tr('snd.again')
    };

    /* ---------- Battle Royale ---------- */
    const teamName = (i) => 'Team ' + (i + 1);
    const br = {
      start(s, t) {
        const cfg = { teams: s.brTeams, time: s.brTime, zone: s.brZone, drop: s.brDrop, pts: s.brPts };
        const drops = Array.from({ length: 40 }, () => 1 + Math.floor(Math.random() * cfg.pts));
        return { cfg, endAt: cfg.time ? t + cfg.time * 60000 : null, out: Array.from({ length: cfg.teams }, () => 0), drops, ev: [ev(['br_start'], 'start', 'start')] };
      },
      alive: (g) => g.out.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0),
      derive(g, t) {
        if (g.endAt && t >= g.endAt) {
          const a = br.alive(g);
          return finish(g, g.endAt, { why: 'timeout', side: 'none', kicker: 'br.rTimeK', title: a.length === 1 ? 'br.rTeamWins' : 'br.rDraw', sub: 'br.rStill', v: { t: a[0] + 1, list: a.map(teamName).join(', ') }, say: ['timeout', 'draw'], sig: 'low' });
        }
        return g;
      },
      timeline(g) {
        const out = warnings(g), end = g.endAt || g.startedAt + 3 * 3600e3;
        if (g.cfg.zone) for (let k = 1; g.startedAt + k * g.cfg.zone * 60000 < end; k++) {
          const at = g.startedAt + k * g.cfg.zone * 60000;
          if (g.cfg.zone >= 2) out.push({ k: 'zw' + k, at: at - 60000, say: ['zone_warn'], sig: 'alert' });
          out.push({ k: 'zn' + k, at, say: ['zone_now'], sig: 'alert' });
        }
        if (g.cfg.drop) for (let k = 1; g.startedAt + k * g.cfg.drop * 60000 < end && k <= g.drops.length; k++) {
          out.push({ k: 'dr' + k, at: g.startedAt + k * g.cfg.drop * 60000 + 5000, say: ['drop_' + g.drops[k - 1]], sig: 'alert' });
        }
        return out;
      },
      next(g, t, every, extra) {
        if (!every) return null;
        const p = every * 60000, k = Math.floor((t - g.startedAt - (extra || 0)) / p) + 1;
        const at = g.startedAt + k * p + (extra || 0);
        return g.endAt && at >= g.endAt ? null : at;
      },
      clock: (g, t) => (g.endAt ? { label: tr('game.left'), text: ctx.fmt(left(g, t)) } : { label: tr('game.elapsed'), text: ctx.fmt(t - g.startedAt) }),
      status(g, t) {
        const parts = [tr('br.alive', { n: br.alive(g).length })];
        const z = br.next(g, t, g.cfg.zone), d = br.next(g, t, g.cfg.drop, 5000);
        if (z) parts.push(tr('br.zoneIn', { t: ctx.fmt(z - t) }));
        if (d) parts.push(tr('br.dropIn', { t: ctx.fmt(d - t) }));
        return parts.join(' · ');
      },
      body(g, remote) {
        let h = '<div class="teams">';
        g.out.forEach((o, i) => {
          h += '<button class="team" type="button" data-act="brTeam" data-i="' + i + '" style="--tc:' + TEAM_HEX[i] + '"' + (remote ? ' disabled' : '') + '><i></i><span>' + teamName(i) + '<small>' + tr('color.' + i) + '</small></span><em></em></button>';
        });
        return h + '</div>' + (remote ? '' : '<p class="fine">' + tr('br.help') + '</p>');
      },
      update(root, g) {
        root.querySelectorAll('.team').forEach((el) => {
          const i = +el.dataset.i, o = !!g.out[i];
          el.classList.toggle('out', o);
          if (!el.classList.contains('armed')) el.querySelector('em').textContent = tr(o ? 'br.out' : 'br.in');
        });
      },
      act(name, el) {
        if (name !== 'brTeam') return;
        const i = +el.dataset.i;
        if (!el.classList.contains('armed')) {
          root().querySelectorAll('.team.armed').forEach((x) => x.classList.remove('armed'));
          el.classList.add('armed'); el.querySelector('em').textContent = tr(G().out[i] ? 'br.backQ' : 'br.outQ');
          clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove('armed'); }, 3000);
          return;
        }
        el.classList.remove('armed');
        const g = G(), out = g.out.slice(), t = ctx.now();
        out[i] = out[i] ? 0 : t;
        const gg = Object.assign({}, g, { out });
        const a = br.alive(gg);
        if (out[i] && a.length === 1) {
          ctx.setG(finish(gg, t, { why: 'win', side: 'def', kicker: 'br.rWinK', title: 'br.rTeamWins', sub: 'br.rWinSub', v: { t: a[0] + 1, c: 'color.' + a[0] }, say: ['team_out_' + (i + 1), 'team_win_' + (a[0] + 1)], sig: 'jingle' }));
        } else commit({ out }, out[i] ? ev(['team_out_' + (i + 1)], 'low') : null);
      },
      endExtra(g) {
        const order = g.out.map((o, i) => ({ i, o })).sort((a, b) => (b.o || Infinity) - (a.o || Infinity));
        return '<ol class="rank">' + order.map((x, n) => '<li><i style="--tc:' + TEAM_HEX[x.i] + '"></i>' + teamName(x.i) + ' <small>' + tr('color.' + x.i) + '</small><span>' + (x.o ? tr('br.outAfter', { t: ctx.fmt(x.o - g.startedAt) }) : tr(n === 0 ? 'br.winner' : 'br.stillIn')) + '</span></li>').join('') + '</ol>';
      }
    };

    /* ---------- Hostage rescue ---------- */
    const hostage = {
      start(s, t) {
        const cfg = { time: s.hosTime, free: s.hosFree, evac: s.hosEvac };
        return { cfg, endAt: t + cfg.time * 60000, stage: 'held', hold: null, ev: [ev(['hos_start'], 'start', 'start')] };
      },
      derive(g, t) {
        if (g.endAt && t >= g.endAt) return finish(g, g.endAt, { why: 'timeout', side: 'att', kicker: 'hos.rTimeK', title: 'hos.rKidnappers', sub: g.stage === 'freed' ? 'hos.rTimeFreed' : 'hos.rTimeHeld', say: ['timeout', 'kidnappers_win'], sig: 'low' });
        return g;
      },
      timeline: warnings,
      layout: (g) => g.stage,
      clock: (g, t) => ({ label: tr('game.left'), text: ctx.fmt(left(g, t)) }),
      status: (g) => tr(g.stage === 'held' ? 'hos.held' : 'hos.freed'),
      body(g, remote) {
        const held = g.stage === 'held';
        const hint = remote ? tr(held ? 'hos.remoteFree' : 'hos.remoteEvac') : tr(held ? 'hos.freeHint' : 'hos.evacHint', { n: held ? g.cfg.free : g.cfg.evac });
        return holdHtml('data-hold="hos"', tr(held ? 'hos.free' : 'hos.evacBig'), hint, held ? 'free' : 'goal') +
          (remote ? '' : '<button class="btn ghost danger" data-act="hosElim" data-confirm="1" type="button">' + tr('hos.elim') + '</button>');
      },
      bind(root) {
        const el = root.querySelector('[data-hold="hos"]');
        const dur = () => (G().stage === 'held' ? G().cfg.free : G().cfg.evac);
        ctx.makeHold(el, {
          duration: dur,
          onStart: () => commit({ hold: { start: ctx.now(), dur: dur() * 1000 } }),
          onCancel: () => commit({ hold: null }),
          onDone: () => {
            const g = G(), t = ctx.now();
            if (g.stage === 'held') commit({ stage: 'freed', freedAt: t, hold: null }, ev(['hos_freed'], 'alert'));
            else ctx.setG(finish(g, t, { why: 'evac', side: 'def', kicker: 'hos.rEvacK', title: 'hos.rRescuers', sub: 'hos.rEvacSub', say: ['hos_evac', 'rescuers_win'], sig: 'jingle' }));
          }
        });
      },
      update(root, g, t) {
        if (ctx.isRemote()) holdProgress(root.querySelector('[data-hold="hos"]'), g.hold, t);
      },
      act(name) {
        if (name === 'hosElim') ctx.setG(finish(G(), ctx.now(), { why: 'elim', side: 'att', kicker: 'hos.rElimK', title: 'hos.rKidnappers', sub: 'hos.rElimSub', say: ['res_elim', 'kidnappers_win'], sig: 'low' }));
      }
    };

    /* ---------- Infection ---------- */
    const inf = {
      start(s, t) {
        const cfg = { players: s.infPlayers, start: Math.min(s.infStart, s.infPlayers - 1), delay: s.infDelay, time: s.infTime };
        return { cfg, endAt: t + cfg.time * 60000, hits: [], ev: [ev(['inf_start'], 'start', 'start')] };
      },
      infected: (g, t) => g.cfg.start + g.hits.filter((h) => h <= t).length,
      derive(g, t) {
        const all = g.cfg.players - g.cfg.start;
        if (g.hits.length >= all) {
          const last = g.hits.slice().sort((a, b) => a - b)[all - 1];
          if (t >= last) return finish(g, last, { why: 'all', side: 'att', kicker: 'inf.rAllK', title: 'inf.rInfWin', sub: 'inf.rAllSub', say: ['inf_win'], sig: 'low' });
        }
        if (g.endAt && t >= g.endAt) {
          return finish(g, g.endAt, { why: 'timeout', side: 'def', kicker: 'inf.rTimeK', title: 'inf.rSurvWin', sub: 'inf.rTimeSub', v: { n: g.cfg.players - inf.infected(g, g.endAt) }, say: ['timeout', 'surv_win'], sig: 'jingle' });
        }
        return g;
      },
      timeline(g) {
        const out = warnings(g), sorted = g.hits.slice().sort((a, b) => a - b), all = g.cfg.players - g.cfg.start;
        sorted.forEach((h, n) => {
          if (n + 1 >= all) return; /* the last one is announced as the result */
          const surv = g.cfg.players - g.cfg.start - (n + 1);
          out.push({ k: 'h' + h, at: h, say: [surv === 1 ? 'inf_last' : 'inf_turned'], sig: 'hit' });
        });
        return out;
      },
      clock: (g, t) => ({ label: tr('game.left'), text: ctx.fmt(left(g, t)) }),
      status(g, t) {
        const pend = g.hits.filter((h) => h > t).sort((a, b) => a - b);
        return pend.length ? tr('inf.pending', { list: pend.map((h) => ctx.fmt(h - t)).join(', ') }) : tr('inf.none');
      },
      body(g, remote) {
        return '<div class="counters"><div class="cnt surv"><b id="infSurv"></b><span>' + tr('inf.surv') + '</span></div><div class="cnt infd"><b id="infInf"></b><span>' + tr('inf.inf') + '</span></div></div>' +
          (remote ? '' : '<button class="btn big hitbtn" data-act="infHit" type="button">' + tr('inf.hit') + '</button><button class="btn ghost small" data-act="infUndo" type="button">' + tr('inf.undo') + '</button>');
      },
      update(root, g, t) {
        const i = inf.infected(g, t);
        $('infInf').textContent = i;
        $('infSurv').textContent = g.cfg.players - i;
      },
      act(name) {
        const g = G(), t = ctx.now();
        if (name === 'infHit') {
          if (g.cfg.start + g.hits.length >= g.cfg.players) return ctx.toast(tr('inf.allHit'));
          commit({ hits: g.hits.concat(t + g.cfg.delay * 1000) }, g.cfg.delay ? ev([], 'hit') : null);
        } else if (name === 'infUndo') {
          if (g.hits.length) commit({ hits: g.hits.slice(0, -1) });
        }
      }
    };

    /* ---------- Murder Mystery ---------- */
    /* The game master phone keeps all roles in MU (and localStorage); other phones only ever get their own card. */
    let MU = store.get('abt-mu');
    function sessionPlayers() { return ctx.members().filter((m) => m.role === 'player'); }
    function manualNames() { return (S().muNames || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40); }
    function paintMuSetup() {
      const pickEl = $('muRolePick'); if (!pickEl) return;
      const R = S().muRoles;
      if (!pickEl.childElementCount) {
        MU_EXTRA.forEach((k) => {
          const b = document.createElement('button');
          b.type = 'button'; b.dataset.role = k;
          b.addEventListener('click', () => { S().muRoles[k] = !S().muRoles[k]; ctx.save(); paintMuSetup(); });
          pickEl.appendChild(b);
        });
        const ta = $('muNames');
        ta.value = S().muNames || '';
        ta.addEventListener('input', () => { S().muNames = ta.value; ctx.save(); paintMuSetup(); });
      }
      $('muNames').placeholder = tr('mu.namesPh');
      pickEl.querySelectorAll('button').forEach((b) => {
        const k = b.dataset.role;
        b.innerHTML = sym(k, 'mini') + '<span>' + esc(tr(k === 'twins' ? 'r.twins' : 'r.' + k)) + '</span>';
        b.setAttribute('aria-pressed', String(!!R[k]));
      });
      const sp = sessionPlayers().length, mn = manualNames().length;
      const roles = S().muMurderers + Object.keys(R).filter((k) => R[k]).reduce((n, k) => n + (k === 'twins' ? 2 : 1), 0);
      $('muCount').textContent = tr('mu.count', { sp, mn, n: sp + mn, r: roles }) + (roles > sp + mn ? tr('mu.tooFew') : '');
    }
    const passList = () => MU.players.filter((p) => !p.mid).map((p) => '<button class="pass" type="button" data-act="muCard" data-name="' + esc(p.name) + '"><span>' + esc(p.name) + '</span><em></em></button>').join('');
    const murder = {
      start(s) {
        const players = sessionPlayers().map((m) => ({ name: m.name || tr('role.player'), mid: m.id })).concat(manualNames().map((n) => ({ name: n, mid: null })));
        const seen = {};
        players.forEach((p) => { const base = p.name; let n = 2; while (seen[p.name]) p.name = base + ' ' + n++; seen[p.name] = 1; });
        const res = assignRoles(players, s);
        if (res.error) return { error: tr(res.error[0], res.error[1]) };
        const id = ctx.rid();
        MU = { id, players: res.players.map((p) => ({ name: p.name, mid: p.mid, role: p.role, drawn: p.drawn, card: p.card, seen: false })) };
        store.set('abt-mu', MU);
        /* Every session player gets their card, or an empty one if they sat this game out. */
        const given = {};
        MU.players.forEach((p) => { if (p.mid) { given[p.mid] = 1; ctx.sendPrivate(p.mid, { game: id, card: p.card }); } });
        sessionPlayers().forEach((m) => { if (!given[m.id]) ctx.sendPrivate(m.id, null); });
        return {
          rid: id, cfg: { time: s.muTime }, endAt: null, stage: 'cards',
          players: MU.players.map((p) => ({ name: p.name, phone: !!p.mid, out: 0 })),
          ev: [ev(['mu_roles'], 'start', 'start')]
        };
      },
      derive(g, t) {
        if (g.endAt && t >= g.endAt) return finish(g, g.endAt, Object.assign(murder.reveal(), { why: 'timeout', side: 'none', kicker: 'mu.rTimeK', title: 'game.over', sub: 'mu.rTimeSub', say: ['timeout', 'mu_end'], sig: 'low' }));
        return g;
      },
      /* At the end the roles become public: as data, so each phone labels them in its own language. */
      reveal() {
        return { reveal: MU ? MU.players.map((p) => ({ name: p.name, role: p.role, drawn: p.drawn })) : [] };
      },
      timeline: warnings,
      layout: (g) => g.stage,
      clock: (g, t) => (g.endAt ? { label: tr('game.left'), text: ctx.fmt(left(g, t)) } : { label: tr(g.stage === 'cards' ? 'mu.cardsLabel' : 'game.elapsed'), text: g.stage === 'cards' ? '—' : ctx.fmt(t - (g.playAt || g.startedAt)) }),
      status(g) {
        return g.stage === 'cards' ? tr('mu.cardsStatus') : tr('mu.alive', { n: g.players.filter((p) => !p.out).length, t: g.players.length });
      },
      body(g, remote) {
        let h = '';
        if (remote) {
          const mine = store.get('abt-card');
          h += mine && mine.game === g.rid ? '<button class="btn primary big" data-act="myRole" type="button">' + tr('mu.myRole') + '</button>' : (ctx.role() === 'player' ? '<p class="mnote">' + tr('mu.noRole') + '</p>' : '');
          return h + '<div class="plist" id="muList"></div>';
        }
        if (g.stage === 'cards') {
          const manual = MU ? MU.players.filter((p) => !p.mid) : [];
          if (manual.length) h += '<p class="mnote">' + tr('mu.passHint') + '</p><div class="passlist">' + passList() + '</div>';
          if (MU && MU.players.some((p) => p.mid)) h += '<p class="mnote">' + tr('mu.phoneHint') + '</p>';
          return h + '<button class="btn primary big" data-act="muPlay" type="button">' + tr('mu.play') + '</button>';
        }
        h += '<div class="plist" id="muList"></div><p class="fine">' + tr('mu.toggleHelp') + '</p>';
        h += '<button class="btn ghost" data-act="muRoles" type="button">' + tr(murder.showRoles ? 'mu.hideRoles' : 'mu.showRoles') + '</button>';
        if (MU && MU.players.some((p) => p.mid)) {
          h += '<div class="group msg-gm"><div class="row stack"><div class="txt"><div class="lbl">' + tr('mu.msgTitle') + '</div><div class="desc">' + tr('mu.msgDesc') + '</div></div>' +
            '<select id="muTo">' + MU.players.filter((p) => p.mid).map((p) => '<option value="' + esc(p.name) + '">' + esc(p.name) + '</option>').join('') + '</select>' +
            '<input class="namein wide" id="muMsg" maxlength="200" placeholder="' + esc(tr('mu.msgPh')) + '"><button class="btn small" data-act="muSend" type="button">' + tr('mu.send') + '</button></div></div>';
        }
        if (MU && MU.players.some((p) => !p.mid)) h += '<button class="btn ghost" data-act="muCards" type="button">' + tr('mu.cards') + '</button><div class="passlist" id="muPass" hidden></div>';
        return h + '<div class="winpick" id="muWin" hidden><div class="lbl">' + tr('mu.whoWon') + '</div>' +
          ['evil', 'good', 'amok', 'bounty', 'joker', 'none'].map((w) => '<button class="btn small" data-act="muWinner" data-w="' + w + '" type="button">' + tr('mu.w.' + w) + '</button>').join('') +
          '</div><button class="btn" data-act="muEnd" type="button">' + tr('mu.end') + '</button>';
      },
      update(root, g) {
        const list = $('muList');
        if (list) {
          const showRoles = !ctx.isRemote() && murder.showRoles && MU;
          const html = g.players.map((p, i) => {
            const r = showRoles ? MU.players.find((q) => q.name === p.name) : null;
            return '<button class="pl' + (p.out ? ' out' : '') + '" type="button" data-act="muToggle" data-i="' + i + '"' + (ctx.isRemote() ? ' disabled' : '') + '><span>' + esc(p.name) + (r ? ' <small>' + sym(realRole(r), 'mini') + esc(roleLabel(r)) + '</small>' : '') + '</span><em>' + tr(p.out ? 'mu.out' : 'mu.in') + '</em></button>';
          }).join('');
          if (list._html !== html && !list.querySelector('.armed')) { list.innerHTML = html; list._html = html; }
        }
        root.querySelectorAll('.pass').forEach((b) => {
          const p = MU && MU.players.find((q) => q.name === b.dataset.name);
          b.querySelector('em').textContent = p && p.seen ? tr('mu.seen') : '';
        });
      },
      act(name, el) {
        const g = G();
        if (name === 'myRole') return openMyCard();
        if (name === 'muCard') {
          const p = MU.players.find((q) => q.name === el.dataset.name);
          return openCard(p.card, () => { p.seen = true; store.set('abt-mu', MU); }, () => store.set('abt-mu', MU));
        }
        if (name === 'muCards') { const box = $('muPass'); box.hidden = !box.hidden; if (!box.hidden) box.innerHTML = passList(); return; }
        if (name === 'muPlay') {
          const t = ctx.now();
          return commit({ stage: 'play', playAt: t, startedAt: t, endAt: g.cfg.time ? t + g.cfg.time * 60000 : null }, ev(['mu_start'], 'start', 'start'));
        }
        if (name === 'muRoles') { murder.showRoles = !murder.showRoles; el.textContent = tr(murder.showRoles ? 'mu.hideRoles' : 'mu.showRoles'); $('muList')._html = ''; return; }
        if (name === 'muToggle') {
          if (!el.classList.contains('armed')) {
            el.classList.add('armed'); el.querySelector('em').textContent = tr(g.players[+el.dataset.i].out ? 'mu.backQ' : 'mu.outQ');
            setTimeout(() => { el.classList.remove('armed'); $('muList')._html = ''; }, 3000);
            return;
          }
          const players = g.players.map((p, i) => (i === +el.dataset.i ? Object.assign({}, p, { out: p.out ? 0 : ctx.now() }) : p));
          el.classList.remove('armed'); $('muList')._html = '';
          return commit({ players });
        }
        if (name === 'muSend') {
          const to = $('muTo').value, msg = $('muMsg').value.trim();
          const p = MU.players.find((q) => q.name === to);
          if (!p || !msg) return;
          p.card.notes = (p.card.notes || []).concat(msg);
          store.set('abt-mu', MU);
          ctx.sendPrivate(p.mid, { game: MU.id, card: p.card, ping: true });
          $('muMsg').value = '';
          return ctx.toast(tr('mu.msgSent', { n: to }));
        }
        if (name === 'muEnd') { $('muWin').hidden = !$('muWin').hidden; return; }
        if (name === 'muWinner') {
          const w = el.dataset.w;
          ctx.setG(finish(g, ctx.now(), Object.assign(murder.reveal(), { why: 'gm', side: w === 'evil' || w === 'amok' ? 'att' : w === 'good' ? 'def' : 'none', kicker: 'mu.rK', title: 'mu.wt.' + w, sub: 'mu.rSub', say: ['mu_end'], sig: w === 'good' ? 'jingle' : 'low' })));
        }
      },
      endExtra(g) {
        const r = (g.result && g.result.reveal) || [];
        return r.length ? '<ul class="reveal-list">' + r.map((p) => '<li><span class="ri">' + sym(realRole(p)) + '</span><b>' + esc(p.name) + '</b><span>' + esc(roleLabel(p)) + '</span></li>').join('') + '</ul>' : '';
      },
      again: () => tr('mu.again')
    };

    const MODES = { vip, snd, br, hostage, inf, murder };

    /* ---------- Role card overlay ---------- */
    let cardState = null;
    function paintCard() {
      const c = cardState.card, open = $('cardReveal').classList.contains('open');
      $('cardWho').textContent = c.name ? tr('card.for', { n: c.name }) : tr('card.yours');
      const drawn = c.act && c.act.type === 'draw' && c.act.used ? c.act.drawn : null;
      const role = drawn || c.role, team = ROLES[role].team;
      $('cardBody').innerHTML = '<span class="ci">' + sym(role, 'big') + '</span><span class="cr">' + esc(tr('r.' + role)) + '</span>' +
        (team !== 'draw' ? '<span class="ct">' + esc(tr('team.' + team)) + '</span>' : '') +
        (drawn ? '<span class="cx">' + esc(tr('card.drawn')) + '</span>' : '') +
        '<span class="cx">' + esc(tr('rt.' + role)) + '</span>' + (c.info || []).map((x) => '<span class="cinfo">' + esc(trv(x)) + '</span>').join('') +
        (c.act && c.act.type === 'check' && c.act.used ? '<span class="cinfo">' + esc(trv(c.act.answer)) + '</span>' : '') +
        (c.notes || []).map((x) => '<span class="cnote">' + esc(tr('mu.gm', { m: x })) + '</span>').join('');
      let acts = '';
      if (open && c.act && !c.act.used) {
        if (c.act.type === 'draw') acts = '<button class="btn primary" data-card="draw" type="button">' + tr('card.draw') + '</button>';
        else acts = '<select id="cardTarget">' + Object.keys(c.act.options).map((n) => '<option>' + esc(n) + '</option>').join('') + '</select><button class="btn primary" data-card="check" type="button">' + tr('card.once', { a: tr(c.act.label) }) + '</button>';
      }
      $('cardActs').innerHTML = acts;
    }
    function openCard(card, onDone, onChange) {
      cardState = { card, onDone, onChange };
      if (window.ART) { $('cardFrame').innerHTML = window.ART.cardFrame(); $('cardBack').innerHTML = window.ART.cardBack(); }
      $('cardReveal').classList.remove('open');
      paintCard();
      $('cardBg').hidden = false;
    }
    function closeCard() {
      $('cardReveal').classList.remove('open');
      $('cardBg').hidden = true;
      if (cardState && cardState.onDone) cardState.onDone();
      cardState = null;
    }
    $('cardReveal').addEventListener('click', () => { $('cardReveal').classList.toggle('open'); paintCard(); });
    $('cardDone').addEventListener('click', closeCard);
    $('cardClose').addEventListener('click', closeCard);
    $('cardActs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-card]'); if (!b || !cardState) return;
      const a = cardState.card.act;
      if (b.dataset.card === 'draw') a.used = true;
      if (b.dataset.card === 'check') { a.used = true; a.answer = a.options[$('cardTarget').value]; }
      if (cardState.onChange) cardState.onChange();
      paintCard();
    });
    function openMyCard() {
      const mine = store.get('abt-card');
      if (!mine) return ctx.toast(tr('mu.noCard'));
      openCard(mine.card, null, () => store.set('abt-card', mine));
    }
    $('btnMyRole').addEventListener('click', openMyCard);
    function paintMyRoleBtn() {
      $('btnMyRole').hidden = !(ctx.role() === 'player' && store.get('abt-card'));
    }

    /* ---------- Screen plumbing for app.js ---------- */
    const root = () => $('mBody');
    let built = null;
    root().addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      /* Game-ending buttons need a second tap. */
      if (el.dataset.confirm && !el.classList.contains('armed')) {
        const label = el.textContent;
        el.classList.add('armed'); el.textContent = tr('game.confirm');
        setTimeout(() => { el.classList.remove('armed'); el.textContent = label; }, 3000);
        return;
      }
      const m = MODES[G().mode];
      if (m && m.act && (!ctx.isRemote() || el.dataset.act === 'myRole')) m.act(el.dataset.act, el);
    });

    return {
      list: LIST,
      info: (id) => BY_ID[id],
      has: (id) => !!MODES[id],
      art,
      /* Lobby for one mode: picture, text, rules, its settings and the start button label. */
      paintSetup(mode) {
        $('lobbyArt').innerHTML = slot(mode, 'big');
        $('lobbyName').textContent = tr('m.' + mode + '.name');
        $('lobbyDesc').textContent = tr('m.' + mode + '.desc');
        $('lobbyHow').innerHTML = tr('m.' + mode + '.how').split('|').map((x) => '<li>' + esc(x) + '</li>').join('');
        document.querySelectorAll('.modeset').forEach((d) => { d.hidden = d.dataset.mode !== mode; });
        $('btnStart').textContent = tr(mode === 'murder' ? 'lobby.startMurder' : mode === 'bomb' ? 'lobby.startBomb' : 'lobby.start');
        if (mode === 'murder') paintMuSetup();
      },
      start(mode, s, t, prev) {
        const r = MODES[mode].start(s, t, prev);
        if (r.error) return r;
        const secret = r.secret; delete r.secret;
        const id = ctx.rid();
        if (secret) ctx.secret(id, secret);
        return Object.assign({ mode, id, phase: 'round', startedAt: t }, r);
      },
      derive(g, t) {
        /* Murder results carry the role reveal, which only the game master knows. */
        if (g.mode === 'murder' && ctx.isRemote()) return g;
        return g.phase === 'round' && MODES[g.mode] ? MODES[g.mode].derive(g, t) : g;
      },
      timeline(g) { const m = MODES[g.mode]; return m && m.timeline ? m.timeline(g) : []; },
      layoutKey(g) { const m = MODES[g.mode]; return g.id + ':' + (m && m.layout ? m.layout(g) : ''); },
      build(g) {
        const m = MODES[g.mode];
        $('mIcon').innerHTML = slot(g.mode, 'tiny');
        $('mName').textContent = tr('m.' + g.mode + '.name');
        root().innerHTML = m.body(g, ctx.isRemote());
        if (!ctx.isRemote() && m.bind) m.bind(root(), g);
        built = this.layoutKey(g);
      },
      render(g, t) {
        const m = MODES[g.mode];
        if (built !== this.layoutKey(g)) this.build(g);
        const c = m.clock(g, t);
        $('mClockLabel').textContent = c.label;
        $('mClock').textContent = c.text;
        $('mStatus').innerHTML = m.status(g, t);
        if (m.update) m.update(root(), g, t);
      },
      /* Result text in this phone's language: values that are text keys get translated too. */
      resultText(r) {
        const v = {};
        Object.keys(r.v || {}).forEach((k) => { const s = r.v[k]; v[k] = typeof s === 'string' && /^color\./.test(s) ? tr(s) : s; });
        return { kicker: tr(r.kicker || 'game.over', v), title: r.title ? tr(r.title, v) : '', sub: r.sub ? tr(r.sub, v) : '' };
      },
      endExtra(g) { const m = MODES[g.mode]; built = null; return m && m.endExtra ? m.endExtra(g) : ''; },
      again(g) { const m = MODES[g.mode]; return m && m.again ? m.again(g) : tr('game.again'); },
      onPrivate(data) {
        if (data && data.card) {
          const prev = store.get('abt-card');
          /* Keep used abilities when the game master re-sends the card with a new message. */
          if (prev && prev.game === data.game && prev.card.act && data.card.act) { data.card.act.used = prev.card.act.used; data.card.act.answer = prev.card.act.answer; }
          store.set('abt-card', { game: data.game, card: data.card });
          ctx.toast(tr(data.ping ? 'mu.newMsg' : 'mu.roleArrives'));
          ctx.buzz([80, 40, 80]);
        } else store.set('abt-card', null);
        paintMyRoleBtn();
        built = null;
      },
      paintRemote: paintMyRoleBtn,
      refreshSetup: paintMuSetup,
      /* Language switch: things built with T() at paint time. */
      relabel() { built = null; paintMuSetup(); },
      fillArt
    };
  }

  window.MODES = { DEF, TIME, create, list: LIST };
})();
