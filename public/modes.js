/* Game modes: settings, rules, screens and Murder Mystery roles (the bomb's logic lives in app.js).
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
    murderer: { team: 'evil' }, innocent: { team: 'good' }, medic: { team: 'good' }, bounty: { team: 'own' }, copycat: { team: 'draw' },
    amok: { team: 'own' }, twin: { team: 'good' }, detective: { team: 'good' }, informant: { team: 'good' }, bodyguard: { team: 'good' },
    double: { team: 'good' }, avenger: { team: 'good' }, joker: { team: 'own' }, scientist: { team: 'good' }, spy: { team: 'good' }
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

  /* ---------- Mode list: deck cards (numeral), lobby setting cards [key, label, sub] ---------- */
  const LIST = [
    { id: 'bomb', num: 'I', keys: [['roundTime', 'bomb.roundTime', 'bomb.roundTimeSub'], ['bombTime', 'bomb.bombTime', 'bomb.bombTimeSub'], ['plantTime', 'bomb.plant', 'bomb.plantSub'], ['defuseTime', 'bomb.defuse', 'bomb.defuseSub']], toggles: [['half', 'bomb.half', 'bomb.halfDesc']] },
    { id: 'vip', num: 'II', keys: [['vipTime', 'vip.time', 'vip.timeSub'], ['vipLives', 'vip.lives', 'vip.livesSub'], ['vipTargets', 'vip.targets', 'vip.targetsSub']] },
    { id: 'snd', num: 'III', keys: [['sndTime', 'snd.time', 'snd.timeSub'], ['sndObjs', 'snd.objs', 'snd.objsSub'], ['sndNeed', 'snd.need', 'snd.needSub'], ['sndHold', 'snd.hold', 'snd.holdSub']] },
    { id: 'br', num: 'IV', keys: [['brTeams', 'br.teams', 'br.teamsSub'], ['brTime', 'br.time', 'br.timeSub'], ['brZone', 'br.zone', 'br.zoneSub'], ['brDrop', 'br.drop', 'br.dropSub'], ['brPts', 'br.pts', 'br.ptsSub']] },
    { id: 'hostage', num: 'V', keys: [['hosTime', 'hos.time', 'hos.timeSub'], ['hosFree', 'hos.free', 'hos.freeSub'], ['hosEvac', 'hos.evac', 'hos.evacSub']] },
    { id: 'inf', num: 'VI', keys: [['infPlayers', 'inf.players', 'inf.playersSub'], ['infStart', 'inf.start', 'inf.startSub'], ['infDelay', 'inf.delay', 'inf.delaySub'], ['infTime', 'inf.time', 'inf.timeSub']] },
    { id: 'murder', num: 'VII', keys: [['muMurderers', 'mu.murderers', 'mu.murderersSub'], ['muTime', 'mu.time', 'mu.timeSub']] }
  ];
  const BY_ID = {};
  LIST.forEach((m) => { BY_ID[m.id] = m; });

  /* Pictures: the AI images or the hand-built vector versions (setting "Bilder"). */
  let artStyle = 'ai';
  function artHTML(id) {
    if (artStyle === 'vector' && window.ART) {
      const s = id === 'logo' ? window.ART.logo() : window.ART.mode(id);
      return s.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
    }
    return '<img src="' + (id === 'logo' ? 'img/logo.webp' : 'img/modes/' + id + '.webp') + '" alt="" draggable="false">';
  }
  const cardBackHTML = () => (artStyle === 'vector' && window.ART ? '<span class="fv">' + window.ART.cardFrame() + window.ART.cardBack() + '</span>' : '<img src="img/card-back.webp" alt="" draggable="false">');
  const cardFrameHTML = () => (artStyle === 'vector' && window.ART ? window.ART.cardFrame() : '<img src="img/card-frame.webp" alt="" draggable="false">');
  function fillArt(root) { (root || document).querySelectorAll('.aslot[data-art]').forEach((el) => { el.innerHTML = artHTML(el.dataset.art); }); }
  /* Role symbol: hand-drawn neon glyph (never an emoji). */
  const sym = (role, cls) => (window.ART ? window.ART.role(role, cls) : '');

  /* ---------- Runtime ---------- */
  function create(ctx) {
    const UI = window.UI, ic = UI.ic;
    const $ = (id) => document.getElementById(id);
    const S = () => ctx.S();
    const G = () => ctx.G();

    /* Small persistent store for secrets that live only on this phone.
       Cards from an older app version (text instead of role keys) are dropped. */
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
    const remote = () => ctx.isRemote();

    /* Hold pads. The controlling phone publishes { start, base, dur } so the other phones can mirror
       the progress; a paused hold (finger slipped) has start null. */
    const padAttrs = (attrs) => attrs + (remote() ? ' disabled' : '');
    const holdP = (h, t) => (h ? (h.start ? Math.min(1, (h.base || 0) + (t - h.start) / h.dur) : (h.base || 0)) : 0);
    function mirror(el, h, t) { if (el) UI.padShow(el, holdP(h, t), !!(h && h.start)); }

    /* ---------- VIP ---------- */
    const heart = (cls) => '<svg class="heart ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
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
      status: (g) => tr('vip.lifeStatus', { n: g.lives, m: g.cfg.lives }),
      body(g) {
        let h = '<div class="hearts" id="vHearts" role="img"></div>';
        if (remote()) return h + '<p class="fine center">' + tr('vip.remote') + '</p>';
        h += g.cfg.targets > 1 ? '<button class="btn ghost wide" data-act="vipShow" type="button">' + ic('viewer') + '<span>' + tr('vip.show') + '</span></button><div id="vipTarget"></div>' : '<p class="fine center">' + tr('vip.oneTarget') + '</p>';
        return h + '<div class="vip-acts"><button class="btn hit" data-act="vipHit" type="button">' + ic('burst') + '<span>' + tr('vip.hit') + '</span></button>' +
          '<div class="pads one">' + UI.padHTML('data-hold="vipGoal"', tr('vip.goal'), tr('vip.goalHint'), 'goal') + '</div>' +
          '<button class="btn ghost small wide" data-act="vipUndo" type="button">' + ic('undo') + '<span>' + tr('vip.undo') + '</span></button></div>';
      },
      bind(root) {
        const el = root.querySelector('[data-hold="vipGoal"]');
        if (el) ctx.makeHold(el, { duration: () => 3, onDone: () => {
          ctx.setG(finish(G(), ctx.now(), { why: 'goal', side: 'def', kicker: 'vip.rGoalK', title: 'vip.rEscort', sub: 'vip.rGoalSub', say: ['vip_extracted', 'escort_win'], sig: 'jingle' }));
        } });
      },
      update(root, g) {
        const box = $('vHearts'); if (!box) return;
        if (box._l === g.lives) return;
        const prev = box._l; box._l = g.lives;
        box.innerHTML = Array.from({ length: g.cfg.lives }, (_, i) => heart((i < g.lives ? '' : 'lost') + (prev != null && prev > g.lives && i === g.lives ? ' break' : prev != null && prev < g.lives && i === g.lives - 1 ? ' gain' : ''))).join('');
        box.setAttribute('aria-label', tr('vip.hearts', { n: g.lives, m: g.cfg.lives }));
      },
      act(name) {
        const g = G();
        if (name === 'vipShow') {
          const box = $('vipTarget'), sec = ctx.secret(g.id) || {};
          if (box.innerHTML) { box.innerHTML = ''; return; }
          box.innerHTML = '<div class="secret"><small>' + tr('vip.only') + '</small><b>' + tr('vip.target', { p: LETTERS[sec.target || 0] }) + '</b><small>' + tr('vip.hide5') + '</small><i></i></div>';
          clearTimeout(vip._t); vip._t = setTimeout(() => { if (box) box.innerHTML = ''; }, 5000);
        } else if (name === 'vipHit') {
          const lives = g.lives - 1;
          if (lives <= 0) ctx.setG(finish(Object.assign({}, g, { lives: 0 }), ctx.now(), { why: 'down', side: 'att', kicker: 'vip.rDownK', title: 'vip.rHunters', sub: 'vip.rDownSub', say: ['vip_down', 'hunter_win'], sig: 'low' }));
          else commit({ lives }, ev(['vip_hit'], 'hit'));
        } else if (name === 'vipUndo') {
          if (g.lives < g.cfg.lives) commit({ lives: g.lives + 1 });
        }
      },
      icon: (r) => (r.why === 'goal' ? 'crown' : r.why === 'down' ? 'skull' : 'hour')
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
      body(g) {
        const a = g.attacker;
        let h = '<div class="score-mini"><span class="' + (a === 1 ? 'att' : '') + '">Team 1</span><b>' + g.score[1] + '</b><span>:</span><b>' + g.score[2] + '</b><span class="' + (a === 2 ? 'att' : '') + '">Team 2</span></div>' +
          '<div class="pips" id="sPips">' + Array(g.cfg.need).fill('<i></i>').join('') + '</div><div class="objgrid">';
        g.objs.forEach((d, i) => { h += UI.padHTML(padAttrs('data-hold="obj" data-i="' + i + '"'), LETTERS[i], remote() ? tr('snd.objLabel', { o: LETTERS[i] }) : tr('snd.holdHint', { n: g.cfg.hold }), 'obj'); });
        h += '</div>';
        if (!remote()) h += '<button class="btn ghost danger wide" data-act="sndElim" data-confirm="1" type="button">' + ic('skull') + '<span>' + tr('snd.elim') + '</span></button><p class="fine center">' + tr('snd.carry') + '</p>';
        return h;
      },
      bind(root) {
        root.querySelectorAll('[data-hold="obj"]').forEach((el) => {
          const i = +el.dataset.i;
          const dur = () => G().cfg.hold;
          ctx.makeHold(el, {
            duration: dur,
            enabled: () => !G().objs[i],
            onStart: (p) => commit({ hold: { i, base: p, start: ctx.now(), dur: dur() * 1000 } }),
            onPause: (p) => commit({ hold: { i, base: p, start: null, dur: dur() * 1000 } }),
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
        const d = g.objs.filter(Boolean).length;
        root.querySelectorAll('#sPips i').forEach((p, i) => p.classList.toggle('on', i < d));
        root.querySelectorAll('[data-hold="obj"]').forEach((el) => {
          const i = +el.dataset.i, done = !!g.objs[i];
          if (done && !el.classList.contains('done')) {
            el.classList.add('done'); el.disabled = true; el.style.setProperty('--p', 1);
            el.querySelector('.hold-sub').textContent = tr('snd.done'); el.dataset.sub = tr('snd.done');
          }
          if (!done && remote()) mirror(el, g.hold && g.hold.i === i ? g.hold : null, t);
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
      again: () => tr('snd.again'), againIcon: 'swap',
      icon: (r) => (r.why === 'objs' ? 'burst' : r.why === 'elim' ? 'shield' : 'hour'),
      fx: () => 'win'
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
          return finish(g, g.endAt, { why: 'timeout', side: a.length === 1 ? 'def' : 'none', kicker: 'br.rTimeK', title: a.length === 1 ? 'br.rTeamWins' : 'br.rDraw', sub: 'br.rStill', v: { t: a[0] + 1, list: a.map(teamName).join(', ') }, say: ['timeout', 'draw'], sig: 'low' });
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
      status: (g) => tr('br.teamsLeft', { n: br.alive(g).length }),
      body(g) {
        const cd = (id, cls, icon, lab, small, off) => '<div class="cd ' + cls + (off ? ' offc' : '') + '" id="' + id + '"><svg class="cr" viewBox="0 0 52 52" aria-hidden="true"><circle class="cr-t" cx="26" cy="26" r="22"/><circle class="cr-p" cx="26" cy="26" r="22" pathLength="100" style="stroke-dashoffset:' + (off ? 100 : 0) + '"/></svg><span class="cd-ic">' + ic(icon) + '</span><div><span>' + lab + '</span><b class="roll">' + (off ? tr('u.off') : '') + '</b><small>' + small + '</small></div></div>';
        let h = '<div class="cds">' + cd('cdZone', '', 'zone', tr('br.zone'), g.cfg.zone ? tr('br.zoneEvery', { n: g.cfg.zone }) : tr('br.inLobby'), !g.cfg.zone) +
          cd('cdDrop', 'drop', 'drop', tr('br.drop'), g.cfg.drop ? tr('br.dropPts', { n: g.cfg.pts }) : tr('br.inLobby'), !g.cfg.drop) + '</div><div class="teams">';
        g.out.forEach((o, i) => {
          h += '<button class="team" type="button" data-act="brTeam" data-i="' + i + '" style="--tc:' + TEAM_HEX[i] + ';animation-delay:' + (i * 60 + 150) + 'ms"' + (remote() ? ' disabled' : '') + '><i></i><span>' + teamName(i) + '<small>' + tr('color.' + i) + '</small></span><em></em></button>';
        });
        return h + '</div>' + (remote() ? '' : '<p class="fine">' + tr('br.help') + '</p>');
      },
      update(root, g, t) {
        root.querySelectorAll('.team').forEach((el) => {
          const i = +el.dataset.i, o = !!g.out[i];
          el.classList.toggle('out', o);
          if (!el.classList.contains('armed')) { const tx = tr(o ? 'br.out' : 'br.in'), em = el.querySelector('em'); if (em.textContent !== tx) em.textContent = tx; }
        });
        const upd = (id, next, per) => {
          const el = $(id); if (!el || !per) return;
          if (next == null) { UI.roll(el.querySelector('b'), '—'); el.querySelector('.cr-p').style.strokeDashoffset = 100; return; }
          const rem = next - t;
          UI.roll(el.querySelector('b'), ctx.fmt(rem), -1);
          el.querySelector('.cr-p').style.strokeDashoffset = (100 * (1 - UI.clamp(rem / per, 0, 1))).toFixed(1);
        };
        upd('cdZone', br.next(g, t, g.cfg.zone), g.cfg.zone * 60000);
        upd('cdDrop', br.next(g, t, g.cfg.drop, 5000), g.cfg.drop * 60000);
      },
      act(name, el) {
        if (name !== 'brTeam') return;
        const i = +el.dataset.i;
        if (!el.classList.contains('armed')) {
          root().querySelectorAll('.team.armed').forEach((x) => x.classList.remove('armed'));
          el.classList.add('armed'); el.querySelector('em').textContent = tr(G().out[i] ? 'br.backQ' : 'br.outQ'); ctx.buzz(25);
          clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove('armed'); }, 3000);
          return;
        }
        clearTimeout(el._t); el.classList.remove('armed');
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
        return '<ol class="rank">' + order.map((x, n) => '<li style="--i:' + n + '"><i style="--tc:' + TEAM_HEX[x.i] + '"></i>' + teamName(x.i) + ' <small>' + tr('color.' + x.i) + '</small><span>' + (x.o ? tr('br.outAfter', { t: ctx.fmt(x.o - g.startedAt) }) : tr(n === 0 ? 'br.winner' : 'br.stillIn')) + '</span></li>').join('') + '</ol>';
      },
      icon: (r) => (r.why === 'win' ? 'crown' : 'hour'),
      fx: (r) => (r.why === 'win' ? 'win' : 'neutral')
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
      status: () => '',
      body(g) {
        const held = g.stage === 'held';
        const hint = remote() ? tr(held ? 'hos.remoteFree' : 'hos.remoteEvac') : tr(held ? 'bomb.padHint' : 'hos.evacHint', { n: held ? g.cfg.free : g.cfg.evac });
        return '<div class="phases"><div class="ph ' + (held ? 'on' : 'done') + '"><b>' + (held ? '1' : ic('check')) + '</b>' + tr('hos.phase1') + '</div><div class="ph-line ' + (held ? '' : 'on') + '"><i></i></div><div class="ph ' + (held ? '' : 'on') + '"><b>2</b>' + tr('hos.phase2') + '</div></div>' +
          '<div class="mid"><span class="pill ' + (held ? 'red' : 'green') + '"><i class="sd"></i>' + tr(held ? 'hos.held' : 'hos.freed') + '</span></div>' +
          '<div class="pads one">' + UI.padHTML(padAttrs('data-hold="hos"'), tr(held ? 'hos.free' : 'hos.evacBig'), hint, held ? 'free' : 'goal') + '</div>' +
          (remote() ? '' : '<button class="btn ghost danger wide" data-act="hosElim" data-confirm="1" type="button">' + ic('skull') + '<span>' + tr('hos.elim') + '</span></button><p class="fine center">' + tr('hos.carry') + '</p>');
      },
      bind(root) {
        const el = root.querySelector('[data-hold="hos"]');
        const dur = () => (G().stage === 'held' ? G().cfg.free : G().cfg.evac);
        ctx.makeHold(el, {
          duration: dur,
          onStart: (p) => commit({ hold: { base: p, start: ctx.now(), dur: dur() * 1000 } }),
          onPause: (p) => commit({ hold: { base: p, start: null, dur: dur() * 1000 } }),
          onCancel: () => commit({ hold: null }),
          onDone: () => {
            const g = G(), t = ctx.now();
            if (g.stage === 'held') commit({ stage: 'freed', freedAt: t, hold: null }, ev(['hos_freed'], 'alert'));
            else ctx.setG(finish(g, t, { why: 'evac', side: 'def', kicker: 'hos.rEvacK', title: 'hos.rRescuers', sub: 'hos.rEvacSub', say: ['hos_evac', 'rescuers_win'], sig: 'jingle' }));
          }
        });
      },
      update(root, g, t) {
        if (remote()) mirror(root.querySelector('[data-hold="hos"]'), g.hold, t);
      },
      act(name) {
        if (name === 'hosElim') ctx.setG(finish(G(), ctx.now(), { why: 'elim', side: 'att', kicker: 'hos.rElimK', title: 'hos.rKidnappers', sub: 'hos.rElimSub', say: ['res_elim', 'kidnappers_win'], sig: 'low' }));
      },
      icon: (r) => (r.why === 'evac' ? 'evac' : r.why === 'elim' ? 'skull' : 'hour')
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
      status: () => '',
      body() {
        return '<div class="counters"><div class="cnt surv" id="cS"><b class="roll" id="infSurv"></b><span>' + tr('inf.surv') + '</span></div><div class="cnt infd" id="cI"><b class="roll" id="infInf"></b><span>' + tr('inf.inf') + '</span></div></div>' +
          '<div class="pend" id="iPend" aria-live="polite"></div>' +
          (remote() ? '' : '<button class="btn hit" data-act="infHit" type="button">' + ic('virus') + '<span>' + tr('inf.hit') + '</span></button><button class="btn ghost small wide" data-act="infUndo" type="button">' + ic('undo') + '<span>' + tr('inf.undo') + '</span></button>');
      },
      update(root, g, t) {
        const n = inf.infected(g, t), box = $('iPend');
        const surv = $('infSurv'), infd = $('infInf');
        if (infd._n != null && n > infd._n && !UI.RM) { const c = $('cI'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
        infd._n = n;
        UI.roll(infd, String(n)); UI.roll(surv, String(g.cfg.players - n), -1);
        const pend = g.hits.filter((h) => h > t), key = pend.join(',');
        if (box._k !== key) { box._k = key; box.innerHTML = pend.length ? pend.map((h) => '<div class="pnd" data-h="' + h + '"><span>' + tr('inf.turning') + '</span><b></b><i></i></div>').join('') : '<p class="none">' + tr('inf.none') + '</p>'; }
        box.querySelectorAll('.pnd').forEach((el) => {
          const rem = +el.dataset.h - t, txt = ctx.fmt(rem), b = el.querySelector('b');
          if (b.textContent !== txt) b.textContent = txt;
          el.querySelector('i').style.transform = 'scaleX(' + UI.clamp(rem / (g.cfg.delay * 1000 || 1), 0, 1).toFixed(3) + ')';
        });
      },
      act(name) {
        const g = G(), t = ctx.now();
        if (name === 'infHit') {
          if (g.cfg.start + g.hits.length >= g.cfg.players) return ctx.toast(tr('inf.allHit'));
          commit({ hits: g.hits.concat(t + g.cfg.delay * 1000) }, g.cfg.delay ? ev([], 'hit') : null);
        } else if (name === 'infUndo') {
          if (g.hits.length) commit({ hits: g.hits.slice(0, -1) });
        }
      },
      icon: (r) => (r.why === 'all' ? 'virus' : 'shield')
    };

    /* ---------- Murder Mystery ---------- */
    /* The game master phone keeps all roles in MU (and localStorage); other phones only ever get their own card. */
    let MU = store.get('abt-mu');
    function sessionPlayers() { return ctx.members().filter((m) => m.role === 'player'); }
    function manualNames() { return (S().muNames || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40); }
    const murder = {
      review: false, showRoles: false,
      start(s) {
        const players = sessionPlayers().map((m) => ({ name: m.name || tr('role.player'), mid: m.id })).concat(manualNames().map((n) => ({ name: n, mid: null })));
        const seen = {};
        players.forEach((p) => { const base = p.name; let n = 2; while (seen[p.name]) p.name = base + ' ' + n++; seen[p.name] = 1; });
        const res = assignRoles(players, s);
        if (res.error) return { error: tr(res.error[0], res.error[1]) };
        const id = ctx.rid();
        MU = { id, players: res.players.map((p) => ({ name: p.name, mid: p.mid, role: p.role, drawn: p.drawn, card: p.card, seen: false })) };
        store.set('abt-mu', MU);
        murder.review = false; murder.showRoles = false;
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
      body(g) {
        if (remote()) {
          const mine = store.get('abt-card');
          const h = mine && mine.game === g.rid ? '<button class="btn primary big" data-act="myRole" type="button">' + ic('cards') + '<span>' + tr('mu.myRole') + '</span></button>' : (ctx.role() === 'player' ? '<p class="fine center">' + tr('mu.noRole') + '</p>' : '');
          return h + '<div class="plist" id="muList"></div>';
        }
        return '<button class="btn ghost wide" data-act="muRoles" type="button" aria-pressed="' + murder.showRoles + '">' + ic(murder.showRoles ? 'eyeoff' : 'viewer') + '<span>' + tr(murder.showRoles ? 'mu.hideRoles' : 'mu.showRoles') + '</span></button>' +
          '<div class="plist" id="muList"></div><p class="fine">' + tr('mu.toggleHelp') + '</p>' +
          '<div class="gm-acts">' + (MU && MU.players.some((p) => p.mid) ? '<button class="btn ghost" data-act="muMsg" type="button">' + ic('msg') + '<span>' + tr('mu.msg') + '</span></button>' : '') +
          (MU && MU.players.some((p) => !p.mid) ? '<button class="btn ghost" data-act="muCards" type="button">' + ic('cards') + '<span>' + tr('mu.cardsBtn') + '</span></button>' : '') + '</div>' +
          '<button class="btn primary big" data-act="muEnd" type="button">' + ic('flag') + '<span>' + tr('mu.endBtn') + '</span></button>';
      },
      update(root, g) {
        const list = $('muList'); if (!list) return;
        const showRoles = !remote() && murder.showRoles && MU;
        const html = g.players.map((p, i) => {
          const r = showRoles ? MU.players.find((q) => q.name === p.name) : null;
          return '<button class="pl' + (p.out ? ' out' : '') + '" type="button" data-act="muToggle" data-i="' + i + '"' + (remote() ? ' disabled' : '') + '><span class="mid2"><span class="nm">' + esc(p.name) + '</span>' +
            (p.phone ? '<span class="ph2" title="' + esc(tr('mu.withPhone')) + '">' + ic('phone') + '</span>' : '') +
            (r ? '<span class="rl2" style="animation-delay:' + i * 40 + 'ms">' + sym(realRole(r), 'mini') + esc(roleLabel(r)) + '</span>' : '') + '</span><em>' + tr(p.out ? 'mu.out' : 'mu.in') + '</em></button>';
        }).join('');
        if (list._html !== html && !list.querySelector('.armed')) { list.innerHTML = html; list._html = html; }
      },
      act(name, el) {
        const g = G();
        if (name === 'myRole') return openMyCard();
        if (name === 'muCards') { murder.review = true; ctx.refresh(); return; }
        if (name === 'muPlay') {
          const t = ctx.now();
          return commit({ stage: 'play', playAt: t, startedAt: t, endAt: g.cfg.time ? t + g.cfg.time * 60000 : null }, ev(['mu_start'], 'start', 'start'));
        }
        if (name === 'muRoles') {
          murder.showRoles = !murder.showRoles;
          el.setAttribute('aria-pressed', String(murder.showRoles));
          el.innerHTML = ic(murder.showRoles ? 'eyeoff' : 'viewer') + '<span>' + tr(murder.showRoles ? 'mu.hideRoles' : 'mu.showRoles') + '</span>';
          $('muList')._html = ''; return;
        }
        if (name === 'muToggle') {
          if (!el.classList.contains('armed')) {
            $('muList').querySelectorAll('.pl.armed').forEach((x) => x.classList.remove('armed'));
            el.classList.add('armed'); el.querySelector('em').textContent = tr(g.players[+el.dataset.i].out ? 'mu.backQ' : 'mu.outQ'); ctx.buzz(25);
            clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove('armed'); $('muList')._html = ''; }, 3000);
            return;
          }
          clearTimeout(el._t);
          const players = g.players.map((p, i) => (i === +el.dataset.i ? Object.assign({}, p, { out: p.out ? 0 : ctx.now() }) : p));
          el.classList.remove('armed'); $('muList')._html = '';
          return commit({ players });
        }
        if (name === 'muMsg') return openMsg();
        if (name === 'muEnd') return openWinner();
      },
      finish(w) {
        const g = G();
        if (!g || g.mode !== 'murder' || g.phase !== 'round') return;
        ctx.setG(finish(g, ctx.now(), Object.assign(murder.reveal(), { why: 'gm', winner: w, side: w === 'evil' || w === 'amok' ? 'att' : w === 'good' ? 'def' : 'none', kicker: 'mu.rK', title: 'mu.wt.' + w, sub: 'mu.rSub', say: ['mu_end'], sig: w === 'good' ? 'jingle' : 'low' })));
      },
      endExtra(g) {
        const r = (g.result && g.result.reveal) || [];
        const out = {}; (g.players || []).forEach((p) => { out[p.name] = p.out; });
        return r.length ? '<ul class="reveal-list">' + r.map((p, i) => '<li style="--i:' + i + '"><span class="ri">' + sym(realRole(p)) + '</span><b>' + esc(p.name) + (out[p.name] ? ' <small class="fine">' + tr('mu.outShort') + '</small>' : '') + '</b><span>' + esc(roleLabel(p)) + '</span></li>').join('') + '</ul>' : '';
      },
      again: () => tr('mu.again'), againIcon: 'cards',
      sym: (r) => ({ good: 'innocent', evil: 'murderer', amok: 'amok', bounty: 'bounty', joker: 'joker' }[r.winner] || null),
      icon: () => 'flag',
      fx: (r) => (r.winner === 'good' ? 'win' : r.winner === 'evil' || r.winner === 'amok' ? 'lose' : 'neutral'),
      stats: (g) => [[tr('mu.stat.out'), String((g.players || []).filter((p) => p.out).length)]]
    };
    function openMsg() {
      const phones = MU.players.filter((p) => p.mid);
      if (!phones.length) return;
      let to = phones[0].name;
      const body = UI.sheet.generic(UI.sheet.head(tr('mu.msgTitle'), tr('mu.msgDesc'), tr('sheet.close')) +
        '<div class="field"><span class="lbl">' + tr('mu.to') + '</span><div class="pickrow" id="msgTo">' + phones.map((p) => '<button type="button" data-n="' + esc(p.name) + '" aria-pressed="' + (p.name === to) + '">' + esc(p.name) + '</button>').join('') + '</div></div>' +
        '<div class="field"><label class="lbl" for="msgTxt">' + tr('mu.msgPh') + '</label><textarea class="inp" id="msgTxt" rows="3" maxlength="200"></textarea></div>' +
        '<button class="btn primary big" type="button" id="msgSend">' + ic('msg') + '<span>' + tr('mu.send') + '</span></button>');
      body.querySelector('#msgTo').onclick = (e) => { const b = e.target.closest('[data-n]'); if (!b) return; to = b.dataset.n; body.querySelectorAll('#msgTo button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); };
      body.querySelector('#msgSend').onclick = () => {
        const t = $('msgTxt'), msg = t.value.trim();
        const p = MU.players.find((q) => q.name === to);
        if (!msg || !p) { t.focus(); return; }
        p.card.notes = (p.card.notes || []).concat(msg);
        store.set('abt-mu', MU);
        ctx.sendPrivate(p.mid, { game: MU.id, card: p.card, ping: true });
        UI.sheet.close(); ctx.toast(tr('mu.msgSent', { n: to }));
      };
    }
    function openWinner() {
      const W = [['good', 'innocent'], ['evil', 'murderer'], ['amok', 'amok'], ['bounty', 'bounty'], ['joker', 'joker'], ['none', null]];
      const body = UI.sheet.generic(UI.sheet.head(tr('mu.whoWon'), tr('mu.whoWonDesc'), tr('sheet.close')) +
        '<div class="wingrid">' + W.map((w, i) => '<button type="button" data-w="' + w[0] + '" style="animation-delay:' + (i * 50 + 120) + 'ms">' + (w[1] ? sym(w[1]) : ic('flag')) + '<span>' + tr('mu.w.' + w[0]) + '</span></button>').join('') + '</div>');
      body.querySelector('.wingrid').onclick = (e) => { const b = e.target.closest('[data-w]'); if (!b) return; UI.sheet.close(); setTimeout(() => murder.finish(b.dataset.w), 250); };
    }

    /* Pass the phone: players without a phone look at their card here, one after another. */
    function renderPass() {
      const root = $('s-pass');
      if (!MU) { root.innerHTML = ''; return; }
      const list = MU.players.map((p, i) => ({ p, i })).filter((x) => !x.p.mid), phones = MU.players.filter((p) => p.mid);
      const seen = list.filter((x) => x.p.seen).length;
      root.innerHTML = '<div class="intro center" data-st><h1>' + tr('pass.title') + '</h1><p>' + tr('mu.passHint') + '</p></div>' +
        (list.length ? '<div class="pp-prog" data-st><span>' + tr('pass.progress', { s: seen, n: list.length }) + '</span><span class="pp-bar"><i id="ppBar"></i></span></div>' +
        '<div class="pgrid" data-st>' + list.map((x, k) => '<button class="pcard ' + (x.p.seen ? 'seen' : '') + '" type="button" data-p="' + x.i + '" style="--i:' + k + '" aria-label="' + esc(tr('pass.view', { n: x.p.name })) + '"><span class="pc-img">' + cardBackHTML() + '<span class="seal">' + ic('check') + '</span></span><span class="pc-n">' + esc(x.p.name) + '</span><span class="pc-s">' + tr(x.p.seen ? 'pass.seen' : 'pass.open') + '</span></button>').join('') + '</div>' : '') +
        (phones.length ? '<div class="hintc" data-st>' + ic('phone') + '<div>' + tr(phones.length === 1 ? 'pass.phones1' : 'pass.phonesN', { n: '<b>' + phones.map((p) => esc(p.name)).join(', ') + '</b>' }) + '</div></div>' : '') +
        '<div class="cta"><button class="btn primary big" type="button" data-pass="' + (murder.review ? 'back' : 'play') + '">' + ic(murder.review ? 'back' : 'play') + '<span>' + tr(murder.review ? 'pass.back' : 'mu.play') + '</span></button></div>';
      requestAnimationFrame(() => { const b = $('ppBar'); if (b) b.style.transform = 'scaleX(' + (list.length ? seen / list.length : 1) + ')'; });
    }
    $('s-pass').addEventListener('click', (e) => {
      const c = e.target.closest('[data-p]');
      if (c && MU) {
        const idx = +c.dataset.p, p = MU.players[idx];
        openCard(p.card, () => {
          const first = !p.seen; p.seen = true; store.set('abt-mu', MU); renderPass();
          if (first && !UI.RM) { const nc = document.querySelector('[data-p="' + idx + '"]'); if (nc) nc.classList.add('stamp'); }
        }, () => store.set('abt-mu', MU));
        return;
      }
      const a = e.target.closest('[data-pass]'); if (!a) return;
      if (a.dataset.pass === 'play') murder.act('muPlay');
      else { murder.review = false; ctx.refresh(); }
    });

    const MODES = { vip, snd, br, hostage, inf, murder };

    /* ---------- Role card overlay: the back floats, a tap turns it over ---------- */
    let CV = null, cvCloseT = 0;
    function cardFront() {
      const c = CV.card, drawn = c.act && c.act.type === 'draw' && c.act.used ? c.act.drawn : null;
      const role = drawn || c.role, team = ROLES[role].team;
      let h = sym(role, 'big') + '<span class="cv-role">' + esc(tr('r.' + role)) + '</span>' + (team !== 'draw' ? '<span class="cv-team ' + team + '">' + esc(tr('team.' + team)) + '</span>' : '') + '<span class="cv-line"></span>' +
        (drawn ? '<span class="cv-drawn">' + esc(tr('card.drawn')) + '</span>' : '') + '<span class="cv-text">' + esc(tr('rt.' + role)) + '</span>';
      h += (c.info || []).map((x) => '<span class="cv-pill">' + esc(trv(x)) + '</span>').join('');
      if (c.act && c.act.type === 'check' && c.act.used) h += '<span class="cv-pill">' + esc(trv(c.act.answer)) + '</span>';
      h += (c.notes || []).map((x) => '<span class="cv-pill note">' + esc(tr('mu.gm', { m: x })) + '</span>').join('');
      $('cvContent').innerHTML = h;
      const a = c.act; let acts = '';
      if (a && !a.used) {
        if (a.type === 'draw') acts = '<button class="btn primary" type="button" data-cv="draw">' + ic('cards') + '<span>' + tr('card.draw') + '</span></button>';
        else acts = '<select class="inp" id="cvSel">' + Object.keys(a.options).map((n) => '<option>' + esc(n) + '</option>').join('') + '</select><button class="btn primary" type="button" data-cv="check">' + ic('viewer') + '<span>' + tr('card.once', { a: tr(a.label) }) + '</span></button>';
      }
      $('cvActs').innerHTML = acts;
    }
    function openCard(card, onDone, onChange) {
      clearTimeout(cvCloseT);
      CV = { card, onDone, onChange, revealed: false, busy: false };
      $('cvWho').textContent = card.name ? tr('card.for', { n: card.name }) : tr('card.yours');
      $('cvBack').innerHTML = cardBackHTML(); $('cvFrame').innerHTML = cardFrameHTML();
      cardFront();
      const f = $('cvFlip'); f.getAnimations().forEach((x) => x.cancel()); f.style.transform = '';
      const ov = $('cardov'); ov.classList.remove('revealed', 'out', 'in'); ov.hidden = false; void ov.offsetWidth; ov.classList.add('in');
      if (!UI.RM) document.querySelector('.cv-float').animate([{ transform: 'translateY(60px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: UI.SPRING });
      setTimeout(() => $('cvCard').focus({ preventScroll: true }), 50);
    }
    function revealCard() {
      if (!CV || CV.revealed || CV.busy) return;
      CV.busy = true; const f = $('cvFlip'), st = CV;
      const done = () => { st.busy = false; st.revealed = true; $('cardov').classList.add('revealed'); };
      ctx.buzz([30, 30, 60]);
      if (UI.RM) { f.style.transform = 'rotateY(180deg)'; return done(); }
      f.animate([{ transform: 'translateY(0) rotateY(0deg) scale(1)' }, { transform: 'translateY(-30px) rotateY(0deg) scale(1.06)', offset: 0.22 }, { transform: 'translateY(-30px) rotateY(196deg) scale(1.09)', offset: 0.72 }, { transform: 'translateY(-6px) rotateY(180deg) scale(1.02)' }], { duration: 1300, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
      setTimeout(() => { UI.sparksAt($('cvSparks'), 20, 150); $('cardov').classList.add('revealed'); }, 760);
      setTimeout(() => { const g = $('cvGlint'); g.classList.remove('go'); void g.offsetWidth; g.classList.add('go'); }, 1000);
      setTimeout(done, 1300);
    }
    function closeCard(withFlip) {
      if (!CV || CV.busy) return;
      const st = CV; st.busy = true;
      const ov = $('cardov'), f = $('cvFlip');
      const fin = () => {
        ov.classList.add('out');
        if (st.onDone && st.revealed) st.onDone();
        cvCloseT = setTimeout(() => { if (CV !== st) return; ov.hidden = true; ov.classList.remove('out', 'revealed'); CV = null; }, UI.RM ? 0 : 330);
      };
      if (UI.RM || !withFlip || !st.revealed) return fin();
      ov.classList.remove('revealed');
      f.getAnimations().forEach((x) => x.cancel());
      f.animate([{ transform: 'translateY(-6px) rotateY(180deg) scale(1.02)' }, { transform: 'translateY(-24px) rotateY(90deg) scale(1.05)', offset: 0.5 }, { transform: 'translateY(0) rotateY(0deg) scale(1)' }], { duration: 650, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' }).onfinish = () => setTimeout(fin, 120);
    }
    $('cvCard').addEventListener('click', revealCard);
    $('cvDone').addEventListener('click', () => closeCard(true));
    $('cvClose').addEventListener('click', () => closeCard(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && CV) closeCard(false); });
    $('cvActs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cv]'); if (!b || !CV) return;
      const a = CV.card.act;
      if (b.dataset.cv === 'draw') {
        a.used = true; $('cvActs').innerHTML = '';
        if (CV.onChange) CV.onChange();
        if (UI.RM) return cardFront();
        const f = $('cvFlip'); f.getAnimations().forEach((x) => x.cancel());
        f.animate([{ transform: 'translateY(-6px) rotateY(180deg) scale(1.02)' }, { transform: 'translateY(-26px) rotateY(270deg) scale(1.08)', offset: 0.45 }, { transform: 'translateY(-6px) rotateY(540deg) scale(1.02)' }], { duration: 1000, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
        setTimeout(() => { cardFront(); UI.sparksAt($('cvSparks'), 20, 150); }, 450);
      } else {
        a.used = true; a.answer = a.options[$('cvSel').value];
        if (CV.onChange) CV.onChange();
        cardFront();
        const pills = $('cvContent').querySelectorAll('.cv-pill'), last = pills[pills.length - 1];
        if (last && !UI.RM) last.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: UI.SPRING });
      }
    });
    function openMyCard() {
      const mine = store.get('abt-card');
      if (!mine) return ctx.toast(tr('mu.noCard'));
      openCard(mine.card, null, () => store.set('abt-card', mine));
    }

    /* ---------- Murder lobby extras: special roles, names without phone, live count ---------- */
    function lobbyMurderHTML() {
      const R = S().muRoles;
      return '<div class="group" data-st><div class="row stack"><div class="txt"><div class="lbl">' + tr('mu.special') + '</div><div class="desc">' + tr('mu.specialDesc') + '</div></div><div class="rolepick" id="muRolePick">' +
        MU_EXTRA.map((k) => '<button type="button" data-role="' + k + '" aria-pressed="' + !!R[k] + '">' + sym(k, 'mini') + '<span>' + esc(tr(k === 'twins' ? 'r.twins' : 'r.' + k)) + '</span></button>').join('') + '</div></div></div>' +
        '<div class="group" data-st><div class="row stack"><div class="txt"><label class="lbl" for="muNames">' + tr('mu.names') + '</label><div class="desc">' + tr('mu.namesDesc') + '</div></div>' +
        '<textarea class="inp" id="muNames" rows="4" placeholder="' + esc(tr('mu.namesPh')) + '">' + esc(S().muNames || '') + '</textarea><div class="pchips" id="pChips"></div><div class="count" id="muCount"></div></div></div>' +
        '<div class="hintc" data-st>' + ic('phone') + '<div>' + tr('mu.phoneHint') + '</div></div>';
    }
    function paintMuSetup() {
      const c = $('muCount'); if (!c) return;
      const R = S().muRoles, sp = sessionPlayers(), mn = manualNames();
      const roles = S().muMurderers + Object.keys(R).filter((k) => R[k]).reduce((n, k) => n + (k === 'twins' ? 2 : 1), 0);
      const n = sp.length + mn.length, bad = roles > n;
      const pc = $('pChips');
      const html = sp.map((p) => '<span class="pchip phone"><b>' + esc((p.name || '?')[0].toUpperCase()) + '</b>' + esc(p.name || tr('role.player')) + ic('phone') + '</span>').join('') + mn.map((x) => '<span class="pchip"><b>' + esc(x[0].toUpperCase()) + '</b>' + esc(x) + '</span>').join('');
      if (pc._h !== html) { pc._h = html; pc.innerHTML = html; }
      c.classList.toggle('bad', bad);
      c.innerHTML = tr('mu.count', { sp: '<b>' + sp.length + '</b>', mn: '<b>' + mn.length + '</b>', n: '<b>' + n + '</b>', r: '<b>' + roles + '</b>' }) + (bad ? '<b class="err">' + tr('mu.tooFew') + '</b>' : '');
      document.querySelectorAll('#muRolePick button').forEach((b) => b.setAttribute('aria-pressed', String(!!R[b.dataset.role])));
    }
    function bindMurderLobby(root) {
      root.querySelector('#muRolePick').addEventListener('click', (e) => {
        const b = e.target.closest('[data-role]'); if (!b) return;
        const k = b.dataset.role; S().muRoles[k] = !S().muRoles[k]; ctx.save(); paintMuSetup();
        if (!UI.RM) b.animate([{ transform: 'scale(.85)' }, { transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 420, easing: UI.SPRING });
      });
      root.querySelector('#muNames').addEventListener('input', (e) => { S().muNames = e.target.value; ctx.save(); paintMuSetup(); });
      paintMuSetup();
    }

    /* ---------- Screen plumbing for app.js ---------- */
    const root = () => $('mBody');
    let built = null;
    $('gWrap').addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const g = G(); if (!g || !MODES[g.mode]) return;
      /* Game-ending buttons need a second tap. */
      if (el.dataset.confirm && !el.classList.contains('armed')) {
        el._orig = el.innerHTML; el.classList.add('armed'); el.textContent = tr('game.confirm'); ctx.buzz(30);
        el._t = setTimeout(() => { el.classList.remove('armed'); el.innerHTML = el._orig; }, 3000);
        return;
      }
      if (el.classList.contains('armed') && el.dataset.confirm) { clearTimeout(el._t); el.classList.remove('armed'); el.innerHTML = el._orig; }
      const m = MODES[g.mode];
      if (m.act && (!remote() || el.dataset.act === 'myRole')) m.act(el.dataset.act, el);
    });

    return {
      list: LIST,
      info: (id) => BY_ID[id],
      has: (id) => !!MODES[id],
      artHTML, fillArt, cardBackHTML,
      setArt(style) { artStyle = style === 'vector' ? 'vector' : 'ai'; fillArt(); if (document.getElementById('s-pass').childElementCount) renderPass(); },
      lobbyExtra: (mode) => (mode === 'murder' ? lobbyMurderHTML() : ''),
      bindLobby(mode, el) { if (mode === 'murder') bindMurderLobby(el); },
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
        if (g.mode === 'murder' && remote()) return g;
        return g.phase === 'round' && MODES[g.mode] ? MODES[g.mode].derive(g, t) : g;
      },
      timeline(g) { const m = MODES[g.mode]; return m && m.timeline ? m.timeline(g) : []; },
      /* Which screen the game is on: the murder game master hands the phone around first. */
      screen(g) { return g.mode === 'murder' && !remote() && g.phase === 'round' && (g.stage === 'cards' || murder.review) ? 'pass' : 'game'; },
      renderPass,
      layoutKey(g) { const m = MODES[g.mode]; return g.id + ':' + (m && m.layout ? m.layout(g) : '') + ':' + (remote() ? 'r' : 'h'); },
      build(g) {
        const m = MODES[g.mode];
        $('gWrap').innerHTML = '<div class="clockwrap"><div class="label" id="cLab"></div><div class="clock" id="cClock"></div></div><p class="mstatus" id="cSt"></p><div class="mbody" id="mBody">' + m.body(g) + '</div>';
        if (!remote() && m.bind) m.bind(root(), g);
        built = this.layoutKey(g);
      },
      render(g, t) {
        const m = MODES[g.mode];
        if (built !== this.layoutKey(g) || !$('mBody')) this.build(g);
        const c = m.clock(g, t);
        const lab = $('cLab'); if (lab.textContent !== c.label) lab.textContent = c.label;
        UI.roll($('cClock'), c.text, -1);
        const st = m.status(g, t), se = $('cSt');
        if (se._h !== st) { se._h = st; se.innerHTML = st; se.hidden = !st; }
        if (m.update) m.update(root(), g, t);
      },
      invalidate() { built = null; },
      /* Result in this phone's language: values that are text keys get translated too. */
      resultText(r) {
        const v = {};
        Object.keys(r.v || {}).forEach((k) => { const s = r.v[k]; v[k] = typeof s === 'string' && /^color\./.test(s) ? tr(s) : s; });
        return { kicker: tr(r.kicker || 'game.over', v), title: r.title ? tr(r.title, v) : '', sub: r.sub ? tr(r.sub, v) : '' };
      },
      endInfo(g) {
        const m = MODES[g.mode] || {}, r = g.result || {};
        return {
          icon: m.icon ? m.icon(r) : 'flag',
          sym: m.sym ? m.sym(r) : null,
          fx: m.fx ? m.fx(r) : r.sig === 'jingle' ? 'win' : r.sig === 'low' ? 'lose' : 'neutral',
          stats: m.stats ? m.stats(g) : [],
          extra: m.endExtra ? m.endExtra(g) : '',
          again: m.again ? m.again(g) : tr('game.again'),
          againIcon: m.againIcon || 'refresh'
        };
      },
      onPrivate(data) {
        if (data && data.card) {
          const prev = store.get('abt-card');
          /* Keep used abilities when the game master re-sends the card with a new message. */
          if (prev && prev.game === data.game && prev.card.act && data.card.act) { data.card.act.used = prev.card.act.used; data.card.act.answer = prev.card.act.answer; }
          store.set('abt-card', { game: data.game, card: data.card });
          ctx.toast(tr(data.ping ? 'mu.newMsg' : 'mu.roleArrives'));
          ctx.buzz([80, 40, 80]);
        } else store.set('abt-card', null);
        built = null;
      },
      hasCard: () => !!store.get('abt-card'),
      openMyCard,
      refreshSetup: paintMuSetup,
      endReview() { murder.review = false; }
    };
  }

  window.MODES = { DEF, TIME, create, list: LIST };
})();
