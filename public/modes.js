/* Game modes besides the bomb: settings, rules, screens and Murder Mystery roles.
   app.js owns the game loop, sessions and sound. It merges DEF/TIME from here into its settings
   and calls MODES.create(ctx) once its helpers exist.

   Shared state contract (G, published to every phone in a session):
     { mode, id, phase: 'round' | 'end', cfg, startedAt, endAt, ev: [...], result }
   ev entries are one-shot announcements: { id, at, say: [lineKeys], sig, cat }.
   Timed announcements come from timeline(g) so every phone plays them on the shared clock.
   Secrets (VIP target, Murder roles) never go into G: they stay on the game master's phone or
   travel as private messages to a single player. */
(function () {
  const range = (a, b, step) => { const r = []; for (let v = a; v <= b; v += step) r.push(v); return r; };
  const mmss = (v) => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const LETTERS = 'ABCDEF';
  const TEAM_COLORS = [['Rot', '#ff5a4e'], ['Blau', '#5aa9ff'], ['Grün', '#3fd98a'], ['Gelb', '#ffd23f'], ['Lila', '#c38bff'], ['Orange', '#ff9f40'], ['Weiß', '#e8ebe6'], ['Grau', '#8e979e']];

  /* ---------- Settings (merged into app.js) ---------- */
  const mins = { parts: (v) => [String(v), 'min'], chip: (v) => v + ' min' };
  const minsOff = { parts: (v) => (v === 0 ? ['Aus', ''] : [String(v), 'min']), chip: (v) => (v === 0 ? 'Aus' : v + ' min') };
  const secs = { parts: (v) => [String(v), 's'], chip: (v) => v + ' s' };
  const count = (one, many) => ({ parts: (v) => [String(v), v === 1 ? one : many], chip: (v) => String(v) });
  const T = (title, desc, values, presets, fmt) => Object.assign({ title, desc, values, presets }, fmt);

  const TIME = {
    vipTime: T('Rundenzeit', 'So lange hat die Eskorte Zeit, den VIP ins Ziel zu bringen.', range(1, 60, 1), [5, 8, 10, 12, 15, 20, 30, 45], mins),
    vipLives: T('VIP-Leben', 'So viele Treffer verträgt der VIP, bevor er ausgeschaltet ist.', range(1, 5, 1), [1, 2, 3, 4, 5], count('Leben', 'Leben')),
    vipTargets: T('Zielpunkte', 'Anzahl möglicher Ziele. Die App lost eins aus, das nur die Eskorte sieht.', range(1, 4, 1), [1, 2, 3, 4], count('Ziel', 'Ziele')),
    sndTime: T('Rundenzeit', 'So lange haben die Angreifer Zeit.', range(1, 30, 1), [3, 5, 8, 10, 12, 15, 20, 30], mins),
    sndObjs: T('Ziele', 'Wie viele Ziele es auf der Karte gibt (A, B, C …).', range(2, 5, 1), [2, 3, 4, 5], count('Ziel', 'Ziele')),
    sndNeed: T('Nötig zum Sieg', 'So viele Ziele müssen die Angreifer zerstören.', range(1, 5, 1), [1, 2, 3, 4, 5], count('Ziel', 'Ziele')),
    sndHold: T('Aktivieren', 'So lange muss ein Ziel gedrückt werden, bis es zerstört ist.', range(1, 20, 1), [2, 3, 4, 5, 6, 8, 10, 15], secs),
    brTeams: T('Teams', 'Anzahl Teams. Ein Team kann auch ein einzelner Spieler sein.', range(2, 8, 1), [2, 3, 4, 5, 6, 8], count('Team', 'Teams')),
    brTime: T('Spielzeit', 'Maximale Spielzeit. Aus = bis nur noch ein Team übrig ist.', range(0, 90, 5), [0, 10, 15, 20, 30, 45, 60, 90], minsOff),
    brZone: T('Zone schrumpft', 'Alle wie viele Minuten die Zone kleiner wird. Eine Minute vorher kommt eine Warnung.', range(0, 20, 1), [0, 2, 3, 4, 5, 8, 10, 15], minsOff),
    brDrop: T('Versorgungsabwurf', 'Alle wie viele Minuten ein Abwurf an einem zufälligen Punkt angesagt wird.', range(0, 20, 1), [0, 3, 4, 5, 6, 8, 10, 15], minsOff),
    brPts: T('Abwurfpunkte', 'Wie viele nummerierte Abwurfpunkte auf dem Feld markiert sind.', range(1, 6, 1), [2, 3, 4, 5, 6], count('Punkt', 'Punkte')),
    hosTime: T('Rundenzeit', 'So lange haben die Retter Zeit.', range(1, 60, 1), [5, 8, 10, 12, 15, 20, 30, 45], mins),
    hosFree: T('Befreien', 'So lange müssen die Retter „Befreien“ drücken.', range(1, 30, 1), [3, 5, 8, 10, 15, 20], secs),
    hosEvac: T('Evakuieren', 'So lange muss am Evakuierungspunkt gedrückt werden.', range(1, 15, 1), [1, 2, 3, 5, 8, 10], secs),
    infPlayers: T('Spieler', 'Alle Spieler zusammen, inklusive der Start-Infizierten.', range(2, 40, 1), [6, 8, 10, 12, 15, 20, 25, 30], count('Spieler', 'Spieler')),
    infStart: T('Start-Infizierte', 'So viele Spieler starten als Infizierte.', range(1, 5, 1), [1, 2, 3, 4, 5], count('Infizierter', 'Infizierte')),
    infDelay: T('Verwandlung', 'So lange dauert es nach einem Treffer, bis der Spieler die Seite wechselt.', range(0, 60, 5), [0, 5, 10, 15, 20, 30, 45, 60], { parts: (v) => (v === 0 ? ['Sofort', ''] : [String(v), 's']), chip: (v) => (v === 0 ? 'Sofort' : v + ' s') }),
    infTime: T('Spielzeit', 'Überleben die Überlebenden so lange, gewinnen sie.', range(1, 60, 1), [5, 8, 10, 12, 15, 20, 30, 45], mins),
    muTime: T('Spielzeit', 'Optionaler Timer. Aus = der Spielleiter beendet das Spiel.', range(0, 90, 5), [0, 10, 15, 20, 30, 45, 60, 90], minsOff),
    muMurderers: T('Mörder', 'So viele Mörder gibt es. Sie kennen sich gegenseitig.', range(1, 3, 1), [1, 2, 3], count('Mörder', 'Mörder'))
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
  const ROLES = {
    murderer: { icon: '🔪', name: 'Mörder', team: 'evil', text: 'Schalte möglichst viele Spieler aus. Ihr gewinnt, wenn alle anderen Rollen ausgeschaltet sind.' },
    innocent: { icon: '😇', name: 'Unschuldiger', team: 'good', text: 'Keine besonderen Fähigkeiten. Überlebe und finde heraus, wer die Mörder sind.' },
    medic: { icon: '💉', name: 'Medic', team: 'good', text: 'Du kannst einen ausgeschalteten Spieler wieder ins Spiel bringen. Wie genau, legt der Spielleiter fest. Du kennst die anderen Rollen nicht.' },
    bounty: { icon: '🎯', name: 'Kopfgeldjäger', team: 'own', text: 'Du hast ein Ziel und sollst genau diese Person ausschalten. Welche Rolle sie hat, weißt du nicht.' },
    copycat: { icon: '🎲', name: 'Trittbrettfahrer', team: 'draw', text: 'Du kennst deine Rolle noch nicht. Ziehe deine neue Rolle, sie gilt ab sofort.' },
    amok: { icon: '⚠️', name: 'Amok-Mörder', team: 'own', text: 'Du arbeitest NICHT mit den Mördern zusammen. Dein Ziel: möglichst alle anderen Spieler ausschalten.' },
    twin: { icon: '👯', name: 'Zwilling', team: 'good', text: 'Ihr zwei wisst voneinander. Überlebt gemeinsam! Die anderen wissen nicht, dass es Zwillinge gibt.' },
    detective: { icon: '🔎', name: 'Detektiv', team: 'good', text: 'Einmal im Spiel darfst du eine Person überprüfen und erfährst, auf welcher Seite sie steht.' },
    informant: { icon: '🕵️', name: 'Informant', team: 'good', text: 'Du hast zu Beginn einen Hinweis bekommen.' },
    bodyguard: { icon: '🛡️', name: 'Bodyguard', team: 'good', text: 'Wähle eine Person, die du beschützt, und sag sie heimlich dem Spielleiter. Wird sie angegriffen, kannst du den Angriff abfangen.' },
    double: { icon: '🎭', name: 'Doppelagent', team: 'good', text: 'Offiziell gehörst du zu den Unschuldigen. Du hast aber ein geheimes eigenes Ziel.' },
    avenger: { icon: '💀', name: 'Rächer', team: 'good', text: 'Wirst du ausgeschaltet, darfst du eine letzte Aktion ausführen: eine Person markieren oder einen letzten Schuss abgeben.' },
    joker: { icon: '🃏', name: 'Joker', team: 'own', text: 'Du hast ein komplett eigenes Ziel: Bring die anderen dazu, dich für einen Mörder zu halten.' },
    scientist: { icon: '🧪', name: 'Wissenschaftler', team: 'good', text: 'Einmal im Spiel darfst du eine Person untersuchen. Du erfährst zwei mögliche Rollen, eine davon stimmt.' },
    spy: { icon: '📡', name: 'Spion', team: 'good', text: 'Einmal im Spiel kannst du eine Nachricht vom Spielleiter bekommen. Frag ihn im richtigen Moment.' }
  };
  const ROLE_LABEL = { medic: 'Medic', bounty: 'Kopfgeldjäger', copycat: 'Trittbrettfahrer', twins: '2× Zwillinge', detective: 'Detektiv', informant: 'Informant', bodyguard: 'Bodyguard', double: 'Doppelagent', avenger: 'Rächer', joker: 'Joker', scientist: 'Wissenschaftler', spy: 'Spion' };
  const TEAM_LABEL = { good: 'Gut (Unschuldige)', evil: 'Böse (Mörder)', own: 'Eigenes Ziel' };
  const DOUBLE_GOALS = [
    'Sorge dafür, dass ein Unschuldiger fälschlich als Mörder beschuldigt wird.',
    'Überlebe bis zum Schluss, egal welche Seite gewinnt.',
    'Lenke den Verdacht von mindestens einem Mörder ab.',
    'Sorge dafür, dass der Detektiv oder der Medic ausgeschaltet wird.'
  ];
  const COPYCAT_DRAW = ['innocent', 'medic', 'amok'];
  const roleTeam = (p) => (p.role === 'copycat' ? ROLES[p.drawn].team : ROLES[p.role].team);
  const roleName = (p) => (p.role === 'copycat' ? ROLES.copycat.name + ' → ' + ROLES[p.drawn].name : ROLES[p.role].name);
  const roleIcon = (p) => (p.role === 'copycat' ? ROLES[p.drawn].icon : ROLES[p.role].icon);

  /* players: [{ name, mid }] → same objects with role and a private card each, or { error }. */
  function assignRoles(players, S) {
    const R = S.muRoles || {};
    const pool = [];
    for (let i = 0; i < S.muMurderers; i++) pool.push('murderer');
    MU_EXTRA.forEach((r) => { if (R[r]) { if (r === 'twins') pool.push('twin', 'twin'); else pool.push(r); } });
    if (players.length < 3) return { error: 'Mindestens 3 Spieler nötig.' };
    if (pool.length > players.length) return { error: 'Zu wenige Spieler: ' + pool.length + ' Rollen gewählt, aber nur ' + players.length + ' Spieler. Rollen abwählen oder Spieler hinzufügen.' };
    while (pool.length < players.length) pool.push('innocent');
    shuffle(pool);
    const ps = players.map((p, i) => Object.assign({}, p, { role: pool[i] }));
    ps.forEach((p) => { if (p.role === 'copycat') p.drawn = pick(COPYCAT_DRAW); });
    const names = (list) => list.map((p) => p.name);
    const others = (p) => ps.filter((q) => q !== p);
    const allRoleNames = [...new Set(ps.map((p) => ROLES[p.role === 'copycat' ? p.drawn : p.role].name))];
    ps.forEach((p) => {
      const r = ROLES[p.role];
      const card = { name: p.name, icon: r.icon, role: r.name, team: r.team === 'draw' ? '' : TEAM_LABEL[r.team], text: r.text, info: [], act: null, notes: [] };
      if (p.role === 'murderer') {
        const mates = names(ps.filter((q) => q.role === 'murderer' && q !== p));
        card.info.push(mates.length ? (mates.length === 1 ? 'Dein Komplize: ' : 'Deine Komplizen: ') + mates.join(', ') : 'Du bist der einzige Mörder.');
      } else if (p.role === 'twin') {
        const twin = ps.find((q) => q.role === 'twin' && q !== p);
        card.info.push('Dein Zwilling: ' + (twin ? twin.name : '?'));
      } else if (p.role === 'bounty') {
        card.info.push('Dein Ziel: ' + pick(others(p)).name);
      } else if (p.role === 'informant') {
        const m = shuffle(ps.filter((q) => q.role === 'murderer'))[0];
        const rest = shuffle(ps.filter((q) => q !== p && q.role !== 'murderer')).slice(0, 2);
        const hint = shuffle([m].concat(rest).filter(Boolean));
        card.info.push('Eine dieser Personen ist ein Mörder: ' + names(hint).join(', '));
      } else if (p.role === 'double') {
        card.info.push('Dein geheimes Ziel: ' + pick(DOUBLE_GOALS));
      } else if (p.role === 'copycat') {
        const d = ROLES[p.drawn];
        card.act = { type: 'draw', used: false, result: { icon: d.icon, role: d.name, team: TEAM_LABEL[d.team], text: d.text } };
      } else if (p.role === 'detective') {
        const opts = {};
        others(p).forEach((q) => { opts[q.name] = q.name + ' gehört zur Seite: ' + TEAM_LABEL[roleTeam(q)]; });
        card.act = { type: 'check', label: 'Überprüfen', used: false, options: opts };
      } else if (p.role === 'scientist') {
        const opts = {};
        others(p).forEach((q) => {
          const real = ROLES[q.role === 'copycat' ? q.drawn : q.role].name;
          const fakes = (allRoleNames.length > 1 ? allRoleNames : Object.values(ROLES).map((x) => x.name)).filter((n) => n !== real);
          opts[q.name] = q.name + ' ist ' + shuffle([real, pick(fakes)]).join(' oder ') + '.';
        });
        card.act = { type: 'check', label: 'Untersuchen', used: false, options: opts };
      }
      p.card = card;
    });
    return { players: ps };
  }

  /* ---------- Mode list & setup panels ---------- */
  const tcard = (key, label, sub) => '<button class="tcard" type="button" data-key="' + key + '"><span class="tl">' + label + '</span><span class="tv"></span><span class="td">' + sub + '</span></button>';
  const LIST = [
    { id: 'bomb', icon: '💣', name: 'Bombe', desc: 'Angreifer planten die Bombe an A oder B, Verteidiger entschärfen sie.' },
    { id: 'vip', icon: '👑', name: 'VIP-Eskorte', desc: 'Die Eskorte bringt den VIP ins Ziel, die Jäger wollen ihn ausschalten. Der VIP trägt das Handy.',
      setup: '<div class="tgrid">' + tcard('vipTime', 'Rundenzeit', 'Bis der VIP ankommt') + tcard('vipLives', 'VIP', 'Verträgt Treffer') + tcard('vipTargets', 'Zielpunkte', 'Eins wird ausgelost') + '</div>' +
        '<p class="fine">Der VIP trägt das Handy. Wird er getroffen: „Treffer“ tippen. Am Ziel „Ziel erreicht“ gedrückt halten. Bei mehreren Zielpunkten tippt die Eskorte auf „Ziel anzeigen“, die Jäger dürfen nicht hinschauen.</p>' },
    { id: 'snd', icon: '🎯', name: 'Search & Destroy', desc: 'Angreifer zerstören Ziele, Verteidiger halten sie. Kein Respawn, nach jeder Runde Seitenwechsel.',
      setup: '<div class="tgrid">' + tcard('sndTime', 'Rundenzeit', 'Pro Runde') + tcard('sndObjs', 'Ziele', 'A, B, C …') + tcard('sndNeed', 'Nötig', 'Zum Sieg der Angreifer') + tcard('sndHold', 'Aktivieren', 'Gedrückt halten') + '</div>' +
        '<p class="fine">Die Angreifer tragen das Handy und halten am jeweiligen Ziel dessen Feld gedrückt. Verteidiger gewinnen bei Zeitablauf oder wenn alle Angreifer ausgeschaltet sind. Die App zählt die Punkte über mehrere Runden.</p>' },
    { id: 'br', icon: '🪂', name: 'Battle Royale', desc: 'Mehrere Teams, kein Respawn. Die Zone schrumpft, Versorgung wird abgeworfen. Das letzte Team gewinnt.',
      setup: '<div class="tgrid">' + tcard('brTeams', 'Teams', 'Auch Einzelspieler') + tcard('brTime', 'Spielzeit', 'Maximal') + tcard('brZone', 'Zone', 'Schrumpft alle') + tcard('brDrop', 'Abwurf', 'Versorgung alle') + tcard('brPts', 'Abwurfpunkte', 'Nummeriert auf dem Feld') + '</div>' +
        '<p class="fine">Die Spielleitung tippt ein Team an, wenn es ausgeschieden ist. Die Zone legt ihr vorher fest, z. B. mit Absperrband, und verkleinert sie bei jeder Ansage.</p>' },
    { id: 'hostage', icon: '🆘', name: 'Geiselbefreiung', desc: 'Retter befreien die Geisel und bringen sie zum Evakuierungspunkt. Die Geisel trägt das Handy.',
      setup: '<div class="tgrid">' + tcard('hosTime', 'Rundenzeit', 'Für die Retter') + tcard('hosFree', 'Befreien', 'Gedrückt halten') + tcard('hosEvac', 'Evakuieren', 'Am Evakuierungspunkt') + '</div>' +
        '<p class="fine">Die Geisel trägt das Handy. Die Retter halten „Geisel befreien“ gedrückt und am Evakuierungspunkt „Evakuiert“. Die Geiselnehmer gewinnen bei Zeitablauf oder wenn alle Retter ausgeschaltet sind.</p>' },
    { id: 'inf', icon: '🧟', name: 'Infection', desc: 'Getroffene Spieler wechseln nach kurzer Zeit zu den Infizierten. Überleben bis zum Ende oder alle anstecken.',
      setup: '<div class="tgrid">' + tcard('infPlayers', 'Spieler', 'Insgesamt') + tcard('infStart', 'Infizierte', 'Zum Start') + tcard('infDelay', 'Verwandlung', 'Nach Treffer') + tcard('infTime', 'Spielzeit', 'Überleben bis') + '</div>' +
        '<p class="fine">Wird ein Überlebender getroffen, tippt die Spielleitung „Treffer“. Nach der Verwandlungszeit wechselt der Spieler offiziell die Seite und es kommt eine Ansage.</p>' },
    { id: 'murder', icon: '🔪', name: 'Murder Mystery', desc: 'Geheime Rollen: Mörder, Unschuldige, Medic, Zwillinge und mehr. Wem kannst du trauen?',
      setup: '<div class="tgrid">' + tcard('muMurderers', 'Mörder', 'Kennen sich') + tcard('muTime', 'Spielzeit', 'Optional') + '</div>' +
        '<div class="group"><div class="row stack"><div class="txt"><div class="lbl">Sonderrollen</div><div class="desc">Alle übrigen Spieler werden Unschuldige.</div></div><div class="rolepick" id="muRolePick"></div></div></div>' +
        '<div class="group"><div class="row stack"><div class="txt"><div class="lbl">Spieler ohne eigenes Handy</div><div class="desc">Ein Name pro Zeile. Sie schauen ihre Rolle später an diesem Handy an. Spieler mit Handy treten der Session als „Spieler“ bei.</div></div>' +
        '<textarea class="names" id="muNames" rows="5" placeholder="Anna&#10;Ben&#10;Chris"></textarea><div class="desc" id="muCount"></div></div></div>' +
        '<p class="fine">Dieses Handy ist der Spielleiter und sieht alle Rollen. Der Spielleiter spielt selbst nicht mit.</p>' }
  ];
  const BY_ID = {};
  LIST.forEach((m) => { BY_ID[m.id] = m; });

  /* Setup markup goes in before app.js runs, so its time-card code picks up these cards too. */
  (function buildSetup() {
    const host = document.getElementById('modeSets');
    LIST.forEach((m) => {
      if (!m.setup) return;
      const d = document.createElement('div');
      d.className = 'modeset'; d.dataset.mode = m.id; d.hidden = true;
      d.innerHTML = m.setup;
      host.appendChild(d);
    });
    const pickEl = document.getElementById('modePick');
    LIST.forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'modebtn'; b.dataset.mode = m.id;
      b.setAttribute('role', 'radio');
      b.innerHTML = '<span class="mi">' + m.icon + '</span><span class="mn">' + esc(m.name) + '</span>';
      pickEl.appendChild(b);
    });
  })();

  /* ---------- Runtime ---------- */
  function create(ctx) {
    const $ = (id) => document.getElementById(id);
    const S = () => ctx.S();
    const G = () => ctx.G();

    /* Small persistent store for secrets that live only on this phone. */
    const store = {
      get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
      set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    };

    /* Host helpers: change G, add an announcement, publish. */
    function ev(say, sig, cat) { return { id: ctx.rid(), at: ctx.now(), say, sig, cat: cat || 'events' }; }
    function commit(patch, event) {
      const g = Object.assign({}, G(), patch);
      if (event) g.ev = (g.ev || []).concat(event).slice(-30);
      ctx.setG(g);
    }
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
        return { cfg, endAt: t + cfg.time * 60000, lives: cfg.lives, hits: 0, ev: [ev(['vip_start'], 'start', 'start')], secret: { target: Math.floor(Math.random() * cfg.targets) } };
      },
      derive(g, t) {
        if (g.endAt && t >= g.endAt) return finish(g, g.endAt, { why: 'timeout', side: 'att', kicker: 'Zeit abgelaufen', title: 'Jäger gewinnen', sub: 'Der VIP hat das Ziel nicht rechtzeitig erreicht.', say: ['timeout', 'hunter_win'], sig: 'low' });
        return g;
      },
      timeline: warnings,
      clock: (g, t) => ({ label: 'Restzeit', text: ctx.fmt(left(g, t)) }),
      status(g) {
        let h = '';
        for (let i = 0; i < g.cfg.lives; i++) h += i < g.lives ? '❤️' : '🖤';
        return 'VIP ' + h;
      },
      body(g, remote) {
        if (remote) return '<p class="mnote">Der VIP trägt das Bomben-Handy. Treffer und Zielankunft werden dort eingegeben.</p>';
        return (g.cfg.targets > 1 ? '<button class="btn ghost" data-act="vipShow" type="button">Ziel anzeigen (nur Eskorte)</button><div class="secret" id="vipTarget" hidden></div>' : '') +
          '<button class="btn big hitbtn" data-act="vipHit" type="button">💥 VIP getroffen</button>' +
          holdHtml('data-hold="vipGoal"', 'ZIEL ERREICHT', '3 s gedrückt halten', 'goal') +
          '<button class="btn ghost small" data-act="vipUndo" type="button">Letzten Treffer zurücknehmen</button>';
      },
      bind(root) {
        const el = root.querySelector('[data-hold="vipGoal"]');
        if (el) ctx.makeHold(el, { duration: () => 3, onDone: () => {
          const t = ctx.now();
          ctx.setG(finish(G(), t, { why: 'goal', side: 'def', kicker: 'Ziel erreicht', title: 'Eskorte gewinnt', sub: 'Der VIP ist sicher angekommen.', say: ['vip_extracted', 'escort_win'], sig: 'jingle' }));
        } });
      },
      act(name) {
        const g = G();
        if (name === 'vipShow') {
          const box = $('vipTarget'), sec = ctx.secret(g.id) || {};
          if (box.hidden) { box.textContent = 'Ziel: Punkt ' + LETTERS[sec.target || 0]; box.hidden = false; setTimeout(() => { box.hidden = true; }, 5000); } else box.hidden = true;
        } else if (name === 'vipHit') {
          const lives = g.lives - 1;
          if (lives <= 0) {
            ctx.setG(finish(Object.assign({}, g, { lives: 0 }), ctx.now(), { why: 'down', side: 'att', kicker: 'VIP ausgeschaltet', title: 'Jäger gewinnen', sub: 'Der VIP wurde ausgeschaltet.', say: ['vip_down', 'hunter_win'], sig: 'low' }));
          } else commit({ lives }, ev(['vip_hit'], 'hit'));
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
        return finish(Object.assign({}, g, { score }), t, Object.assign({ team }, r));
      },
      derive(g, t) {
        if (g.endAt && t >= g.endAt) {
          const def = g.attacker === 1 ? 2 : 1;
          return snd.win(g, def, g.endAt, { why: 'timeout', side: 'def', kicker: 'Zeit abgelaufen', title: 'Team ' + def + ' gewinnt die Runde', sub: 'Die Verteidiger haben die Ziele gehalten.', say: ['timeout', 'def_win'], sig: 'low' });
        }
        return g;
      },
      timeline: warnings,
      clock: (g, t) => ({ label: 'Runde ' + g.roundNo + ' · Team ' + g.attacker + ' greift an', text: ctx.fmt(left(g, t)) }),
      status(g) {
        const done = g.objs.filter(Boolean).length;
        return 'Zerstört: <b>' + done + '</b> von ' + g.cfg.need + ' nötig';
      },
      body(g, remote) {
        let h = '<div class="objgrid">';
        g.objs.forEach((d, i) => { h += holdHtml('data-hold="obj" data-i="' + i + '"', LETTERS[i], remote ? 'Ziel ' + LETTERS[i] : g.cfg.hold + ' s halten', 'obj'); });
        h += '</div>';
        if (!remote) h += '<button class="btn ghost danger" data-act="sndElim" data-confirm="1" type="button">Alle Angreifer ausgeschaltet</button>';
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
                ctx.setG(snd.win(Object.assign({}, g, { objs }), g.attacker, t, { why: 'objs', side: 'att', kicker: 'Ziele zerstört', title: 'Team ' + g.attacker + ' gewinnt die Runde', sub: 'Die Angreifer haben ' + g.cfg.need + ' Ziel' + (g.cfg.need > 1 ? 'e' : '') + ' zerstört.', say: ['obj_down', 'att_win'], sig: 'boom' }));
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
          if (done) { el.style.setProperty('--p', 1); el.querySelector('.hint').textContent = 'Zerstört'; } else if (ctx.isRemote()) holdProgress(el, g.hold && g.hold.i === i ? g.hold : null, t);
        });
      },
      act(name) {
        const g = G();
        if (name === 'sndElim') {
          const def = g.attacker === 1 ? 2 : 1;
          ctx.setG(snd.win(g, def, ctx.now(), { why: 'elim', side: 'def', kicker: 'Angreifer ausgeschaltet', title: 'Team ' + def + ' gewinnt die Runde', sub: 'Alle Angreifer wurden ausgeschaltet.', say: ['att_elim', 'def_win'], sig: 'low' }));
        }
      },
      endExtra(g) {
        const next = g.attacker === 1 ? 2 : 1;
        return '<div class="score"><div><span>Team 1</span><b>' + g.score[1] + '</b></div><i>:</i><div><span>Team 2</span><b>' + g.score[2] + '</b></div></div>' +
          '<p class="fine center">Nach Runde ' + g.roundNo + '. Nächste Runde: Seitenwechsel, Team ' + next + ' greift an. „Einstellungen“ setzt den Spielstand zurück.</p>';
      },
      again: () => 'Nächste Runde'
    };

    /* ---------- Battle Royale ---------- */
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
          return finish(g, g.endAt, { why: 'timeout', side: 'none', kicker: 'Zeit abgelaufen', title: a.length === 1 ? 'Team ' + (a[0] + 1) + ' gewinnt' : 'Unentschieden', sub: 'Noch im Spiel: ' + a.map((i) => 'Team ' + (i + 1)).join(', '), say: ['timeout', 'draw'], sig: 'low' });
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
      clock: (g, t) => (g.endAt ? { label: 'Restzeit', text: ctx.fmt(left(g, t)) } : { label: 'Spielzeit', text: ctx.fmt(t - g.startedAt) }),
      status(g, t) {
        const parts = ['Noch <b>' + br.alive(g).length + '</b> Teams'];
        const z = br.next(g, t, g.cfg.zone), d = br.next(g, t, g.cfg.drop, 5000);
        if (z) parts.push('Zone in ' + ctx.fmt(z - t));
        if (d) parts.push('Abwurf in ' + ctx.fmt(d - t));
        return parts.join(' · ');
      },
      body(g, remote) {
        let h = '<div class="teams">';
        g.out.forEach((o, i) => {
          const [cname, hex] = TEAM_COLORS[i];
          h += '<button class="team" type="button" data-act="brTeam" data-i="' + i + '" style="--tc:' + hex + '"' + (remote ? ' disabled' : '') + '><i></i><span>Team ' + (i + 1) + '<small>' + cname + '</small></span><em></em></button>';
        });
        return h + '</div>' + (remote ? '' : '<p class="fine">Tippen und nochmal tippen: Team ausgeschieden. Bei einem Fehler ebenso wieder zurückholen.</p>');
      },
      update(root, g) {
        root.querySelectorAll('.team').forEach((el) => {
          const i = +el.dataset.i, o = !!g.out[i];
          el.classList.toggle('out', o);
          if (!el.classList.contains('armed')) el.querySelector('em').textContent = o ? 'Ausgeschieden' : 'Im Spiel';
        });
      },
      act(name, el) {
        if (name !== 'brTeam') return;
        const i = +el.dataset.i;
        if (!el.classList.contains('armed')) {
          root().querySelectorAll('.team.armed').forEach((x) => x.classList.remove('armed'));
          el.classList.add('armed'); el.querySelector('em').textContent = G().out[i] ? 'Zurückholen?' : 'Ausgeschieden?';
          clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove('armed'); }, 3000);
          return;
        }
        el.classList.remove('armed');
        const g = G(), out = g.out.slice(), t = ctx.now();
        out[i] = out[i] ? 0 : t;
        const gg = Object.assign({}, g, { out });
        const a = br.alive(gg);
        if (out[i] && a.length === 1) {
          ctx.setG(finish(gg, t, { why: 'win', side: 'def', kicker: 'Letztes Team', title: 'Team ' + (a[0] + 1) + ' gewinnt', sub: 'Team ' + (a[0] + 1) + ' (' + TEAM_COLORS[a[0]][0] + ') ist als letztes übrig.', say: ['team_out_' + (i + 1), 'team_win_' + (a[0] + 1)], sig: 'jingle' }));
        } else commit({ out }, out[i] ? ev(['team_out_' + (i + 1)], 'low') : null);
      },
      endExtra(g) {
        const order = g.out.map((o, i) => ({ i, o })).sort((a, b) => (b.o || Infinity) - (a.o || Infinity));
        return '<ol class="rank">' + order.map((x, n) => '<li><i style="--tc:' + TEAM_COLORS[x.i][1] + '"></i>Team ' + (x.i + 1) + ' <small>' + TEAM_COLORS[x.i][0] + '</small><span>' + (x.o ? 'ausgeschieden nach ' + ctx.fmt(x.o - g.startedAt) : (n === 0 ? 'Sieger' : 'im Spiel')) + '</span></li>').join('') + '</ol>';
      }
    };

    /* ---------- Hostage rescue ---------- */
    const hostage = {
      start(s, t) {
        const cfg = { time: s.hosTime, free: s.hosFree, evac: s.hosEvac };
        return { cfg, endAt: t + cfg.time * 60000, stage: 'held', hold: null, ev: [ev(['hos_start'], 'start', 'start')] };
      },
      derive(g, t) {
        if (g.endAt && t >= g.endAt) return finish(g, g.endAt, { why: 'timeout', side: 'att', kicker: 'Zeit abgelaufen', title: 'Geiselnehmer gewinnen', sub: g.stage === 'freed' ? 'Die Geisel war frei, hat den Evakuierungspunkt aber nicht erreicht.' : 'Die Geisel wurde nicht befreit.', say: ['timeout', 'kidnappers_win'], sig: 'low' });
        return g;
      },
      timeline: warnings,
      layout: (g) => g.stage,
      clock: (g, t) => ({ label: 'Restzeit', text: ctx.fmt(left(g, t)) }),
      status: (g) => (g.stage === 'held' ? 'Geisel wird festgehalten' : '<b>Geisel befreit</b> · zum Evakuierungspunkt!'),
      body(g, remote) {
        const big = g.stage === 'held' ? 'BEFREIEN' : 'EVAKUIERT';
        const hint = remote ? (g.stage === 'held' ? 'Wird an der Geisel gedrückt' : 'Am Evakuierungspunkt') : (g.stage === 'held' ? g.cfg.free + ' s gedrückt halten' : g.cfg.evac + ' s am Evakuierungspunkt halten');
        return holdHtml('data-hold="hos"', big, hint, g.stage === 'held' ? 'free' : 'goal') +
          (remote ? '' : '<button class="btn ghost danger" data-act="hosElim" data-confirm="1" type="button">Alle Retter ausgeschaltet</button>');
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
            else ctx.setG(finish(g, t, { why: 'evac', side: 'def', kicker: 'Geisel evakuiert', title: 'Retter gewinnen', sub: 'Die Geisel ist in Sicherheit.', say: ['hos_evac', 'rescuers_win'], sig: 'jingle' }));
          }
        });
      },
      update(root, g, t) {
        if (ctx.isRemote()) holdProgress(root.querySelector('[data-hold="hos"]'), g.hold, t);
      },
      act(name) {
        if (name === 'hosElim') ctx.setG(finish(G(), ctx.now(), { why: 'elim', side: 'att', kicker: 'Retter ausgeschaltet', title: 'Geiselnehmer gewinnen', sub: 'Alle Retter wurden ausgeschaltet.', say: ['res_elim', 'kidnappers_win'], sig: 'low' }));
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
          if (t >= last) return finish(g, last, { why: 'all', side: 'att', kicker: 'Alle infiziert', title: 'Infizierte gewinnen', sub: 'Es gibt keine Überlebenden mehr.', say: ['inf_win'], sig: 'low' });
        }
        if (g.endAt && t >= g.endAt) {
          const surv = g.cfg.players - inf.infected(g, g.endAt);
          return finish(g, g.endAt, { why: 'timeout', side: 'def', kicker: 'Zeit abgelaufen', title: 'Überlebende gewinnen', sub: surv + ' Überlebende' + (surv === 1 ? 'r hat' : ' haben') + ' durchgehalten.', say: ['timeout', 'surv_win'], sig: 'jingle' });
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
      clock: (g, t) => ({ label: 'Restzeit', text: ctx.fmt(left(g, t)) }),
      status(g, t) {
        const pend = g.hits.filter((h) => h > t).sort((a, b) => a - b);
        return pend.length ? 'Verwandlung läuft: ' + pend.map((h) => ctx.fmt(h - t)).join(', ') : 'Keine Verwandlung offen';
      },
      body(g, remote) {
        return '<div class="counters"><div class="cnt surv"><b id="infSurv"></b><span>Überlebende</span></div><div class="cnt infd"><b id="infInf"></b><span>Infizierte</span></div></div>' +
          (remote ? '' : '<button class="btn big hitbtn" data-act="infHit" type="button">🧟 Überlebender getroffen</button><button class="btn ghost small" data-act="infUndo" type="button">Letzten Treffer zurücknehmen</button>');
      },
      update(root, g, t) {
        const i = inf.infected(g, t);
        $('infInf').textContent = i;
        $('infSurv').textContent = g.cfg.players - i;
      },
      act(name) {
        const g = G(), t = ctx.now();
        if (name === 'infHit') {
          if (g.cfg.start + g.hits.length >= g.cfg.players) return ctx.toast('Alle Überlebenden sind schon getroffen.');
          const at = t + g.cfg.delay * 1000;
          commit({ hits: g.hits.concat(at) }, g.cfg.delay ? ev([], 'hit') : null);
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
        Object.keys(ROLE_LABEL).forEach((k) => {
          const b = document.createElement('button');
          b.type = 'button'; b.dataset.role = k;
          b.innerHTML = (k === 'twins' ? ROLES.twin.icon : ROLES[k].icon) + ' ' + ROLE_LABEL[k];
          b.addEventListener('click', () => { S().muRoles[k] = !S().muRoles[k]; ctx.save(); paintMuSetup(); });
          pickEl.appendChild(b);
        });
        const ta = $('muNames');
        ta.value = S().muNames || '';
        ta.addEventListener('input', () => { S().muNames = ta.value; ctx.save(); paintMuSetup(); });
      }
      pickEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(!!R[b.dataset.role])));
      const sp = sessionPlayers().length, mn = manualNames().length;
      const roles = S().muMurderers + Object.keys(R).filter((k) => R[k]).reduce((n, k) => n + (k === 'twins' ? 2 : 1), 0);
      $('muCount').textContent = (sp ? sp + ' mit Handy (Session) + ' : '') + mn + ' ohne Handy = ' + (sp + mn) + ' Spieler · ' + roles + ' Rollen festgelegt' + (roles > sp + mn ? ' · zu wenige Spieler!' : '');
    }
    const murder = {
      start(s, t) {
        const players = sessionPlayers().map((m) => ({ name: m.name || 'Spieler', mid: m.id })).concat(manualNames().map((n) => ({ name: n, mid: null })));
        const seen = {};
        players.forEach((p) => { const base = p.name; let n = 2; while (seen[p.name]) p.name = base + ' ' + n++; seen[p.name] = 1; });
        const res = assignRoles(players, s);
        if (res.error) return { error: res.error };
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
        if (g.endAt && t >= g.endAt) return finish(g, g.endAt, Object.assign(murder.reveal(), { why: 'timeout', side: 'none', kicker: 'Zeit abgelaufen', title: 'Spiel vorbei', sub: 'Die Zeit ist um. Hier sind alle Rollen.', say: ['timeout', 'mu_end'], sig: 'low' }));
        return g;
      },
      reveal() {
        return { reveal: MU ? MU.players.map((p) => ({ name: p.name, icon: roleIcon(p), role: roleName(p) })) : [] };
      },
      timeline: warnings,
      layout: (g) => g.stage,
      clock: (g, t) => (g.endAt ? { label: 'Restzeit', text: ctx.fmt(left(g, t)) } : { label: g.stage === 'cards' ? 'Rollen verteilt' : 'Spielzeit', text: g.stage === 'cards' ? '—' : ctx.fmt(t - (g.playAt || g.startedAt)) }),
      status(g) {
        const alive = g.players.filter((p) => !p.out).length;
        return g.stage === 'cards' ? 'Alle schauen sich ihre Rolle geheim an.' : 'Noch <b>' + alive + '</b> von ' + g.players.length + ' im Spiel';
      },
      body(g, remote) {
        const mine = remote && store.get('abt-card');
        let h = '';
        if (remote) {
          h += mine && mine.game === g.rid ? '<button class="btn primary big" data-act="myRole" type="button">🎭 Meine Rolle ansehen</button>' : (ctx.role() === 'player' ? '<p class="mnote">Du hast in diesem Spiel keine Rolle bekommen.</p>' : '');
          return h + '<div class="plist" id="muList"></div>';
        }
        if (g.stage === 'cards') {
          const manual = MU ? MU.players.filter((p) => !p.mid) : [];
          h += manual.length ? '<p class="mnote">Spieler ohne Handy: Namen antippen, Rolle geheim ansehen, verdecken, weitergeben.</p><div class="passlist">' +
            manual.map((p) => '<button class="pass" type="button" data-act="muCard" data-name="' + esc(p.name) + '"><span>' + esc(p.name) + '</span><em></em></button>').join('') + '</div>' : '';
          h += (MU && MU.players.some((p) => p.mid) ? '<p class="mnote">Spieler mit Handy sehen ihre Rolle auf dem eigenen Handy.</p>' : '');
          return h + '<button class="btn primary big" data-act="muPlay" type="button">Spiel starten</button>';
        }
        h += '<div class="plist" id="muList"></div><p class="fine">Spieler antippen und nochmal tippen: ausgeschaltet oder zurück im Spiel.</p>';
        h += '<button class="btn ghost" data-act="muRoles" type="button">Rollen anzeigen (nur Spielleiter)</button>';
        if (MU && MU.players.some((p) => p.mid)) {
          h += '<div class="group msg-gm"><div class="row stack"><div class="txt"><div class="lbl">Nachricht an einen Spieler</div><div class="desc">Z. B. der Hinweis für den Spion. Erscheint nur auf dessen Handy.</div></div>' +
            '<select id="muTo">' + MU.players.filter((p) => p.mid).map((p) => '<option value="' + esc(p.name) + '">' + esc(p.name) + '</option>').join('') + '</select>' +
            '<input class="namein wide" id="muMsg" maxlength="200" placeholder="Nachricht"><button class="btn small" data-act="muSend" type="button">Senden</button></div></div>';
        }
        if (MU && MU.players.some((p) => !p.mid)) h += '<button class="btn ghost" data-act="muCards" type="button">Rollenkarten (Spieler ohne Handy)</button><div class="passlist" id="muPass" hidden></div>';
        return h + '<div class="winpick" id="muWin" hidden><div class="lbl">Wer hat gewonnen?</div>' +
          [['Mörder', 'evil'], ['Unschuldige', 'good'], ['Amok-Mörder', 'amok'], ['Kopfgeldjäger', 'bounty'], ['Joker', 'joker'], ['Niemand', 'none']].map((w) => '<button class="btn small" data-act="muWinner" data-w="' + w[1] + '" type="button">' + w[0] + '</button>').join('') +
          '</div><button class="btn" data-act="muEnd" type="button">Spiel beenden &amp; Rollen aufdecken</button>';
      },
      update(root, g) {
        const list = $('muList');
        if (list) {
          const showRoles = !ctx.isRemote() && murder.showRoles && MU;
          const html = g.players.map((p, i) => {
            const r = showRoles ? MU.players.find((q) => q.name === p.name) : null;
            return '<button class="pl' + (p.out ? ' out' : '') + '" type="button" data-act="muToggle" data-i="' + i + '"' + (ctx.isRemote() ? ' disabled' : '') + '><span>' + esc(p.name) + (r ? ' <small>' + roleIcon(r) + ' ' + esc(roleName(r)) + '</small>' : '') + '</span><em>' + (p.out ? 'Ausgeschaltet' : 'Im Spiel') + '</em></button>';
          }).join('');
          if (list._html !== html && !list.querySelector('.armed')) { list.innerHTML = html; list._html = html; }
        }
        root.querySelectorAll('.pass').forEach((b) => {
          const p = MU && MU.players.find((q) => q.name === b.dataset.name);
          b.querySelector('em').textContent = p && p.seen ? '✓ angesehen' : '';
        });
      },
      act(name, el) {
        const g = G();
        if (name === 'myRole') return openMyCard();
        if (name === 'muCard') {
          const p = MU.players.find((q) => q.name === el.dataset.name);
          return openCard(p.card, () => { p.seen = true; store.set('abt-mu', MU); }, () => store.set('abt-mu', MU));
        }
        if (name === 'muCards') { const box = $('muPass'); box.hidden = !box.hidden; if (!box.hidden) box.innerHTML = MU.players.filter((p) => !p.mid).map((p) => '<button class="pass" type="button" data-act="muCard" data-name="' + esc(p.name) + '"><span>' + esc(p.name) + '</span><em></em></button>').join(''); return; }
        if (name === 'muPlay') {
          const t = ctx.now();
          return commit({ stage: 'play', playAt: t, endAt: g.cfg.time ? t + g.cfg.time * 60000 : null, startedAt: t }, ev(['mu_start'], 'start', 'start'));
        }
        if (name === 'muRoles') { murder.showRoles = !murder.showRoles; el.textContent = murder.showRoles ? 'Rollen verbergen' : 'Rollen anzeigen (nur Spielleiter)'; $('muList')._html = ''; return; }
        if (name === 'muToggle') {
          if (!el.classList.contains('armed')) {
            el.classList.add('armed'); el.querySelector('em').textContent = g.players[+el.dataset.i].out ? 'Zurückholen?' : 'Ausgeschaltet?';
            setTimeout(() => { el.classList.remove('armed'); $('muList')._html = ''; }, 3000);
            return;
          }
          const players = g.players.map((p, i) => (i === +el.dataset.i ? Object.assign({}, p, { out: p.out ? 0 : ctx.now() }) : p));
          el.classList.remove('armed'); $('muList')._html = '';
          return commit({ players }, null);
        }
        if (name === 'muSend') {
          const to = $('muTo').value, msg = $('muMsg').value.trim();
          const p = MU.players.find((q) => q.name === to);
          if (!p || !msg) return;
          p.card.notes = (p.card.notes || []).concat('Spielleiter: ' + msg);
          store.set('abt-mu', MU);
          ctx.sendPrivate(p.mid, { game: MU.id, card: p.card, ping: true });
          $('muMsg').value = '';
          return ctx.toast('Nachricht an ' + to + ' gesendet');
        }
        if (name === 'muEnd') { $('muWin').hidden = !$('muWin').hidden; return; }
        if (name === 'muWinner') {
          const W = { evil: 'Die Mörder gewinnen', good: 'Die Unschuldigen gewinnen', amok: 'Der Amok-Mörder gewinnt', bounty: 'Der Kopfgeldjäger gewinnt', joker: 'Der Joker gewinnt', none: 'Spiel beendet' };
          const w = el.dataset.w;
          ctx.setG(finish(g, ctx.now(), Object.assign(murder.reveal(), { why: 'gm', side: w === 'evil' || w === 'amok' ? 'att' : w === 'good' ? 'def' : 'none', kicker: 'Spiel vorbei', title: W[w], sub: 'Alle Rollen im Überblick:', say: ['mu_end'], sig: w === 'good' ? 'jingle' : 'low' })));
        }
      },
      endExtra(g) {
        const r = (g.result && g.result.reveal) || [];
        return r.length ? '<ul class="reveal-list">' + r.map((p) => '<li><span class="ri">' + p.icon + '</span><b>' + esc(p.name) + '</b><span>' + esc(p.role) + '</span></li>').join('') + '</ul>' : '';
      },
      again: () => 'Neue Rollen verteilen'
    };

    const MODES = { vip, snd, br, hostage, inf, murder };

    /* ---------- Role card overlay ---------- */
    let cardState = null;
    function paintCard() {
      const c = cardState.card, open = $('cardReveal').classList.contains('open');
      $('cardWho').textContent = c.name ? 'Rolle für ' + c.name : 'Deine Rolle';
      const drawn = c.act && c.act.type === 'draw' && c.act.used ? c.act.result : null;
      const shown = drawn || c;
      $('cardBody').innerHTML = '<span class="ci">' + shown.icon + '</span><span class="cr">' + esc(shown.role) + '</span>' +
        (shown.team ? '<span class="ct">' + esc(shown.team) + '</span>' : '') +
        (drawn ? '<span class="cx">Gezogen als Trittbrettfahrer</span>' : '') +
        '<span class="cx">' + esc(shown.text) + '</span>' + (c.info || []).map((x) => '<span class="cinfo">' + esc(x) + '</span>').join('') +
        (c.act && c.act.type === 'check' && c.act.used ? '<span class="cinfo">' + esc(c.act.answer) + '</span>' : '') +
        (c.notes || []).map((x) => '<span class="cnote">' + esc(x) + '</span>').join('');
      let acts = '';
      if (open && c.act && !c.act.used) {
        if (c.act.type === 'draw') acts = '<button class="btn primary" data-card="draw" type="button">🎲 Rolle ziehen</button>';
        else acts = '<select id="cardTarget">' + Object.keys(c.act.options).map((n) => '<option>' + esc(n) + '</option>').join('') + '</select><button class="btn primary" data-card="check" type="button">' + esc(c.act.label) + ' (einmalig)</button>';
      }
      $('cardActs').innerHTML = acts;
    }
    function openCard(card, onDone, onChange) {
      cardState = { card, onDone, onChange };
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
      if (b.dataset.card === 'check') { const n = $('cardTarget').value; a.used = true; a.answer = a.options[n]; }
      if (cardState.onChange) cardState.onChange();
      paintCard();
    });
    function openMyCard() {
      const mine = store.get('abt-card');
      if (!mine) return ctx.toast('Noch keine Rolle erhalten.');
      openCard(mine.card, null, () => store.set('abt-card', mine));
    }
    $('btnMyRole').addEventListener('click', openMyCard);
    function paintMyRoleBtn() {
      const mine = store.get('abt-card');
      $('btnMyRole').hidden = !(ctx.role() === 'player' && mine);
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
        el.classList.add('armed'); el.textContent = 'Nochmal tippen zum Bestätigen';
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
      paintSetup(mode) {
        document.querySelectorAll('#modePick .modebtn').forEach((b) => { b.setAttribute('aria-checked', String(b.dataset.mode === mode)); });
        document.querySelectorAll('.modeset').forEach((d) => { d.hidden = d.dataset.mode !== mode; });
        $('modeDesc').textContent = BY_ID[mode].desc;
        $('btnStart').textContent = mode === 'murder' ? 'Rollen verteilen' : mode === 'bomb' ? 'Runde starten' : 'Spiel starten';
        if (mode === 'murder') paintMuSetup();
      },
      start(mode, s, t, prev) {
        const m = MODES[mode];
        const r = m.start(s, t, prev);
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
        const m = MODES[g.mode], info = BY_ID[g.mode];
        $('mIcon').textContent = info.icon;
        $('mName').textContent = info.name;
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
      chip: () => 'Spiel läuft',
      endExtra(g) { const m = MODES[g.mode]; built = null; return m && m.endExtra ? m.endExtra(g) : ''; },
      again(g) { const m = MODES[g.mode]; return m && m.again ? m.again(g) : 'Neue Runde'; },
      onPrivate(data) {
        if (data && data.card) {
          const prev = store.get('abt-card');
          /* Keep used abilities when the game master re-sends the card with a new message. */
          if (prev && prev.game === data.game && prev.card.act && data.card.act) { data.card.act.used = prev.card.act.used; data.card.act.answer = prev.card.act.answer; }
          store.set('abt-card', { game: data.game, card: data.card });
          ctx.toast(data.ping ? 'Neue Nachricht vom Spielleiter' : 'Deine Rolle ist da. Geheim ansehen!');
          ctx.buzz([80, 40, 80]);
        } else store.set('abt-card', null);
        paintMyRoleBtn();
        built = null;
      },
      paintRemote: paintMyRoleBtn,
      refreshSetup: paintMuSetup
    };
  }

  window.MODES = { DEF, TIME, create, list: LIST };
})();
