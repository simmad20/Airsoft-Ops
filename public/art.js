/* Hand-built vector art in the style of the mode pictures (neon arcane: navy, violet, magenta, amber).
   ART.mode(id), ART.logo(), ART.role(key), ART.cardFrame(), ART.cardBack() return SVG markup.
   Shared gradients and glow filters live once in a hidden <svg> (see defs below). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  /* Small deterministic random so every drawing looks the same on every phone. */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const f = (n) => Math.round(n * 10) / 10;
  const pt = (cx, cy, r, a) => [f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a))];

  const DEFS = `
  <linearGradient id="aFire" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff3d9a"/><stop offset=".5" stop-color="#ff7a2e"/><stop offset="1" stop-color="#ffd23f"/></linearGradient>
  <linearGradient id="aFireV" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d9a"/><stop offset=".55" stop-color="#ff7a2e"/><stop offset="1" stop-color="#ffe066"/></linearGradient>
  <linearGradient id="aGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".45" stop-color="#ffb22e"/><stop offset="1" stop-color="#e0661a"/></linearGradient>
  <linearGradient id="aViolet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b5cff"/><stop offset=".6" stop-color="#4a2fd0"/><stop offset="1" stop-color="#26137a"/></linearGradient>
  <linearGradient id="aCrystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f6bff"/><stop offset=".5" stop-color="#9b4dff"/><stop offset="1" stop-color="#ff4fd8"/></linearGradient>
  <linearGradient id="aToxic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4ff57"/><stop offset="1" stop-color="#39c96a"/></linearGradient>
  <linearGradient id="aGood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ff0ff"/><stop offset="1" stop-color="#8b5cff"/></linearGradient>
  <linearGradient id="aEvil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4a5e"/><stop offset="1" stop-color="#ff3dc8"/></linearGradient>
  <linearGradient id="aOwn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#ff7a2e"/></linearGradient>
  <linearGradient id="aDraw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b06bff"/><stop offset="1" stop-color="#ff3d9a"/></linearGradient>
  <linearGradient id="rGood" gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="56" y2="56"><stop offset="0" stop-color="#6ff0ff"/><stop offset="1" stop-color="#8b5cff"/></linearGradient>
  <linearGradient id="rEvil" gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="56" y2="56"><stop offset="0" stop-color="#ff4a5e"/><stop offset="1" stop-color="#ff3dc8"/></linearGradient>
  <linearGradient id="rOwn" gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="56" y2="56"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#ff7a2e"/></linearGradient>
  <linearGradient id="rDraw" gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="56" y2="56"><stop offset="0" stop-color="#b06bff"/><stop offset="1" stop-color="#ff3d9a"/></linearGradient>
  <radialGradient id="aBg" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#1a1460"/><stop offset=".7" stop-color="#070d33"/><stop offset="1" stop-color="#040a28"/></radialGradient>
  <radialGradient id="aOrb" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#7d5cff"/><stop offset=".6" stop-color="#3a1fae"/><stop offset="1" stop-color="#180c5a"/></radialGradient>
  <radialGradient id="aPinkCore" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb3e6"/><stop offset=".4" stop-color="#ff3d9a"/><stop offset="1" stop-color="#7a1fd0" stop-opacity="0"/></radialGradient>
  <radialGradient id="aSkull" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#c57bff"/><stop offset=".7" stop-color="#7b2fd8"/><stop offset="1" stop-color="#4a178f"/></radialGradient>
  <radialGradient id="aIris" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe066"/><stop offset=".45" stop-color="#ff3d9a"/><stop offset="1" stop-color="#5a2fd0"/></radialGradient>
  <filter id="aGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="aGlowBig" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="aBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>`;

  function injectDefs() {
    if (document.getElementById('artDefs')) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('id', 'artDefs'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute';
    svg.innerHTML = '<defs>' + DEFS + '</defs>';
    document.body.insertBefore(svg, document.body.firstChild);
  }

  /* ---------- Shared pieces ---------- */
  function runeRing(cx, cy, r, seed, color) {
    const R = rng(seed), c = color || '#3b3fa0';
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="1.2" opacity=".75"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 7) + '" fill="none" stroke="' + c + '" stroke-width=".8" stroke-dasharray="2 4" opacity=".6"/>';
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + R() * 0.1, rr = r - 3.5;
      const [x, y] = pt(cx, cy, rr, a), [x2, y2] = pt(cx, cy, rr, a + 0.07);
      const k = R();
      s += k < 0.5
        ? '<path d="M' + x + ' ' + y + ' L' + x2 + ' ' + y2 + '" stroke="' + c + '" stroke-width="1.2" opacity=".7"/>'
        : '<circle cx="' + x + '" cy="' + y + '" r="1" fill="' + c + '" opacity=".7"/>';
    }
    return s;
  }
  function sparks(seed, n, area) {
    const R = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const x = f(area[0] + R() * (area[2] - area[0])), y = f(area[1] + R() * (area[3] - area[1]));
      const c = ['#ff7a2e', '#ff3d9a', '#ffd23f', '#b06bff'][Math.floor(R() * 4)];
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + f(0.8 + R() * 1.8) + '" fill="' + c + '"/>';
    }
    return '<g filter="url(#aGlow)">' + s + '</g>';
  }
  /* Spiky flame burst around a centre. */
  function burst(cx, cy, r1, r2, n, seed, fill) {
    const R = rng(seed); let d = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const [x1, y1] = pt(cx, cy, r1, a - Math.PI / n);
      const [x2, y2] = pt(cx, cy, r2 * (0.65 + R() * 0.5), a);
      d += (i ? 'L' : 'M') + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + ' ';
    }
    return '<path d="' + d + 'Z" fill="' + fill + '"/>';
  }
  function star(cx, cy, r, n) {
    let d = '';
    for (let i = 0; i < n * 2; i++) { const [x, y] = pt(cx, cy, i % 2 ? r * 0.28 : r, (i / (n * 2)) * Math.PI * 2 - Math.PI / 2); d += (i ? 'L' : 'M') + x + ' ' + y; }
    return d + 'Z';
  }
  const frame = (inner, label) => '<svg class="vart" viewBox="0 0 200 200" role="img" aria-label="' + (label || '') + '"><rect width="200" height="200" fill="url(#aBg)"/>' + inner + '</svg>';

  /* ---------- Mode pictures ---------- */
  const MODES = {
    bomb() {
      return frame(runeRing(100, 112, 74, 1) +
        '<g filter="url(#aGlowBig)" opacity=".95">' + burst(100, 116, 46, 92, 22, 3, '#ff3d9a') + burst(100, 116, 44, 74, 18, 5, '#ff7a2e') + '</g>' +
        '<ellipse cx="100" cy="174" rx="64" ry="6" fill="#ff3d9a" opacity=".55" filter="url(#aGlow)"/>' +
        '<path d="M44 172h112M56 180h88" stroke="#ff7a2e" stroke-width="2" opacity=".6"/>' +
        '<circle cx="100" cy="118" r="50" fill="url(#aOrb)" stroke="#1a0f55" stroke-width="5"/>' +
        '<circle cx="100" cy="118" r="50" fill="none" stroke="#ff5ad0" stroke-width="1.6" opacity=".8"/>' +
        '<path d="M68 96l14 10-6 14 14 6M132 92l-12 14 8 12-10 10M76 146l14-8 10 10M126 148l-8-12 12-8" fill="none" stroke="#1a0f55" stroke-width="2.4" opacity=".7"/>' +
        '<path d="M86 96h28l-10 22 10 22H86l10-22z" fill="url(#aFireV)" filter="url(#aGlow)"/>' +
        '<path d="M96 118l-18-10M104 118l20-12M100 140l-6 16M104 136l18 12" stroke="#ffb22e" stroke-width="2.2" filter="url(#aGlow)"/>' +
        '<rect x="86" y="62" width="28" height="12" rx="3" fill="#3a2a9a" stroke="#8a6bff" stroke-width="1.5"/>' +
        '<path d="M100 62c2-14 12-22 26-26" fill="none" stroke="#6a55e0" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M100 62c2-14 12-22 26-26" fill="none" stroke="#a48bff" stroke-width="2" stroke-dasharray="3 3"/>' +
        '<g filter="url(#aGlowBig)"><path d="' + star(128, 34, 16, 8) + '" fill="#ffd23f"/><circle cx="128" cy="34" r="4" fill="#fff"/></g>' +
        sparks(7, 16, [20, 20, 180, 190]), 'Bomb');
    },
    vip() {
      return frame(runeRing(100, 112, 70, 11) +
        '<circle cx="100" cy="114" r="46" fill="url(#aOrb)" stroke="#2b1f8f" stroke-width="7"/>' +
        '<circle cx="100" cy="114" r="46" fill="none" stroke="#ff7a2e" stroke-width="2" stroke-dasharray="4 5" filter="url(#aGlow)"/>' +
        '<circle cx="100" cy="114" r="30" fill="url(#aPinkCore)" opacity=".9"/>' +
        '<path d="' + star(100, 114, 24, 6) + '" fill="url(#aFire)" filter="url(#aGlow)"/>' +
        '<ellipse cx="100" cy="116" rx="80" ry="24" fill="none" stroke="url(#aFire)" stroke-width="6" stroke-dasharray="190 70" transform="rotate(-14 100 116)" filter="url(#aGlow)" stroke-linecap="round"/>' +
        '<path d="M100 164l-8 14h16z" fill="#ff7a2e" filter="url(#aGlow)"/>' +
        '<path d="M60 70 L66 30 L82 50 L100 22 L118 50 L134 30 L140 70 Z" fill="url(#aGold)" stroke="#c4501a" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<rect x="58" y="66" width="84" height="10" rx="4" fill="url(#aGold)" stroke="#c4501a" stroke-width="2"/>' +
        '<circle cx="100" cy="50" r="4.5" fill="#ff3d9a" filter="url(#aGlow)"/><circle cx="76" cy="58" r="3" fill="#ff3d9a"/><circle cx="124" cy="58" r="3" fill="#ff3d9a"/>' +
        sparks(13, 14, [20, 20, 180, 190]), 'VIP');
    },
    snd() {
      return frame(runeRing(100, 104, 78, 21, '#5a3cff') +
        '<circle cx="100" cy="104" r="60" fill="none" stroke="#ff3d9a" stroke-width="10" opacity=".25"/>' +
        '<circle cx="100" cy="104" r="60" fill="none" stroke="#2b1f8f" stroke-width="12"/>' +
        '<circle cx="100" cy="104" r="60" fill="none" stroke="#ffb22e" stroke-width="3" stroke-dasharray="6 9" filter="url(#aGlow)"/>' +
        '<path d="M30 150 C60 175 150 170 170 110" fill="none" stroke="url(#aFire)" stroke-width="7" stroke-linecap="round" filter="url(#aGlow)"/>' +
        '<path d="M40 60 C70 30 150 20 168 70" fill="none" stroke="url(#aFire)" stroke-width="5" stroke-linecap="round" filter="url(#aGlow)" opacity=".85"/>' +
        '<path d="M106 34 L124 70 L104 92 L88 66 Z" fill="url(#aCrystal)" stroke="#1a0f55" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M106 34 L104 92 M88 66 L124 70" stroke="#c9b8ff" stroke-width="1" opacity=".7"/>' +
        '<path d="M98 114 L116 116 L104 168 L86 132 Z" fill="url(#aCrystal)" stroke="#1a0f55" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M98 114 L104 168 M86 132 L116 116" stroke="#c9b8ff" stroke-width="1" opacity=".7"/>' +
        '<g filter="url(#aGlowBig)"><path d="' + star(102, 102, 26, 10) + '" fill="#ffb22e"/><circle cx="102" cy="102" r="6" fill="#fff4c2"/></g>' +
        '<path d="M150 30 L60 170" stroke="#ffd23f" stroke-width="3" filter="url(#aGlow)" opacity=".8"/>' +
        sparks(23, 14, [20, 20, 180, 190]), 'Search & Destroy');
    },
    br() {
      return frame(runeRing(100, 110, 76, 31) +
        '<g filter="url(#aGlowBig)" opacity=".9"><path d="M40 150 C30 110 60 100 70 130 C76 100 120 96 126 132 C140 104 172 118 160 154 C130 186 70 186 40 150Z" fill="#7b2fd8"/></g>' +
        '<path d="M50 154 C66 120 86 140 92 128 M150 150 C140 124 120 136 112 124" stroke="url(#aFire)" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#aGlow)"/>' +
        burst(100, 136, 18, 46, 14, 33, 'url(#aFire)') +
        '<path d="M44 74 C44 30 156 30 156 74 C148 66 140 66 132 74 C124 66 112 66 100 74 C88 66 76 66 68 74 C60 66 52 66 44 74Z" fill="url(#aViolet)" stroke="#ff3d9a" stroke-width="2"/>' +
        '<path d="M60 56 C74 40 98 36 120 40" stroke="#9ec7ff" stroke-width="3" fill="none" opacity=".6"/>' +
        '<path d="M46 74 L86 120 M68 74 L90 120 M100 74 L100 120 M132 74 L110 120 M154 74 L114 120" stroke="url(#aGold)" stroke-width="1.8" filter="url(#aGlow)"/>' +
        '<rect x="78" y="118" width="44" height="32" rx="4" fill="#4a1f9a" stroke="#1a0f55" stroke-width="3"/>' +
        '<path d="M78 118 C78 104 122 104 122 118Z" fill="#6a2fbf" stroke="#1a0f55" stroke-width="3"/>' +
        '<path d="M78 128h44M92 106v44M108 106v44" stroke="url(#aGold)" stroke-width="3"/>' +
        '<rect x="96" y="124" width="8" height="10" rx="2" fill="#ffd23f" filter="url(#aGlow)"/>' +
        sparks(37, 16, [20, 20, 180, 190]), 'Battle Royale');
    },
    hostage() {
      let links = '';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.05 + 0.9 * (i / 6)), [x, y] = pt(100, 96, 70, a);
        const rot = f((a * 180) / Math.PI + 90);
        if (i === 3) continue; /* the broken link */
        links += '<ellipse cx="' + x + '" cy="' + y + '" rx="13" ry="8" transform="rotate(' + rot + ' ' + x + ' ' + y + ')" fill="none" stroke="#1a0f55" stroke-width="9"/>' +
          '<ellipse cx="' + x + '" cy="' + y + '" rx="13" ry="8" transform="rotate(' + rot + ' ' + x + ' ' + y + ')" fill="none" stroke="#3d4bd6" stroke-width="5"/>';
      }
      const feather = (rot, len, w) => '<path d="M100 100 C' + f(100 - w) + ' ' + f(100 - len * 0.5) + ' ' + f(100 - w * 0.4) + ' ' + f(100 - len * 0.9) + ' 100 ' + f(100 - len) + ' C' + f(100 + w * 0.4) + ' ' + f(100 - len * 0.9) + ' ' + f(100 + w) + ' ' + f(100 - len * 0.5) + ' 100 100Z" transform="rotate(' + rot + ' 100 100)" fill="url(#aFireV)"/>';
      let wings = '';
      [-96, -82, -68, -54, -40, -26].forEach((r, i) => { wings += feather(r, 84 - i * 6, 13); wings += feather(-r, 84 - i * 6, 13); });
      [168, 180, 192].forEach((r, i) => { wings += feather(r, 62 - Math.abs(i - 1) * 10, 9); });
      return frame(runeRing(100, 104, 78, 41) + '<g filter="url(#aGlowBig)" opacity=".85">' + wings + '</g>' + '<g filter="url(#aGlow)">' + wings + '</g>' +
        '<path d="M100 126 C80 104 84 70 100 54 C116 70 120 104 100 126Z" fill="url(#aCrystal)" stroke="#ff3d9a" stroke-width="1.5"/>' +
        '<path d="M100 120 C92 104 94 82 100 70 C106 82 108 104 100 120Z" fill="#ffb3e6" opacity=".35"/>' +
        '<path d="M100 56 C96 46 100 38 108 36 C104 42 106 48 112 50 L104 56Z" fill="#ff7a2e" filter="url(#aGlow)"/>' +
        '<circle cx="103" cy="47" r="1.6" fill="#fff"/>' +
        links +
        '<g filter="url(#aGlowBig)"><path d="' + star(100, 168, 14, 8) + '" fill="#ffd23f"/></g>' +
        sparks(43, 18, [20, 20, 180, 190]), 'Hostage');
    },
    inf() {
      const R = rng(51); let smoke = '';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + R() * 0.3, [x, y] = pt(100, 104, 62 + R() * 12, a);
        smoke += '<circle cx="' + x + '" cy="' + y + '" r="' + f(10 + R() * 9) + '" fill="url(#aToxic)" opacity="' + f(0.6 + R() * 0.35) + '"/>';
      }
      let thorns = '';
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, [x1, y1] = pt(100, 112, 56, a), [x2, y2] = pt(100, 112, 64, a + 0.08); thorns += 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2; }
      return frame(runeRing(100, 104, 80, 53) + '<g filter="url(#aGlow)">' + smoke + '</g>' +
        '<circle cx="100" cy="112" r="56" fill="none" stroke="#5a2fa0" stroke-width="7"/>' +
        '<g filter="url(#aGlow)"><circle cx="100" cy="112" r="56" fill="none" stroke="url(#aFire)" stroke-width="2.2" stroke-dasharray="14 6"/><path d="' + thorns + '" stroke="#ff7a2e" stroke-width="2"/></g>' +
        '<path d="M64 92 C64 56 136 56 136 92 C136 108 128 116 124 122 L122 138 L78 138 L76 122 C72 116 64 108 64 92Z" fill="url(#aSkull)" stroke="#2a0f5a" stroke-width="3"/>' +
        '<path d="M80 138 v12 h40 v-12" fill="url(#aSkull)" stroke="#2a0f5a" stroke-width="3"/>' +
        '<path d="M88 138v12M96 138v12M104 138v12M112 138v12" stroke="#2a0f5a" stroke-width="2"/>' +
        '<path d="M76 104 C76 92 94 90 96 104 C96 114 80 116 76 104Z M104 104 C106 90 124 92 124 104 C120 116 104 114 104 104Z" fill="#120730"/>' +
        '<path d="M100 114 l-6 12 h12z" fill="#120730"/>' +
        '<g filter="url(#aGlow)"><path d="M100 64 l-6 8 6 10 6-10z M92 82 h16" stroke="#ffd23f" stroke-width="2.4" fill="none"/></g>' +
        '<path d="M66 84 C86 74 112 78 134 70" stroke="#ff7a2e" stroke-width="2.4" fill="none" filter="url(#aGlow)"/>' +
        sparks(57, 14, [20, 20, 180, 190]), 'Infection');
    },
    murder() {
      let runes = '';
      [[52, 54], [150, 48], [40, 132], [162, 138]].forEach(([x, y], i) => {
        runes += '<text x="' + x + '" y="' + y + '" font-family="Georgia, serif" font-size="' + (20 + (i % 2) * 6) + '" font-weight="700" fill="url(#aFire)" text-anchor="middle" transform="rotate(' + (i % 2 ? 14 : -12) + ' ' + x + ' ' + y + ')">?</text>';
      });
      return frame(runeRing(100, 104, 80, 61) +
        '<g filter="url(#aBlur)" opacity=".8"><path d="M44 70 C20 100 40 140 62 150 M156 70 C180 100 160 140 138 150" stroke="#7b2fd8" stroke-width="18" fill="none"/></g>' +
        '<rect x="62" y="34" width="76" height="132" rx="8" fill="#14093f" stroke="#2b3aa8" stroke-width="5"/>' +
        '<rect x="62" y="34" width="76" height="132" rx="8" fill="url(#aPinkCore)" opacity=".45"/>' +
        '<rect x="69" y="41" width="62" height="118" rx="5" fill="none" stroke="#8b5cff" stroke-width="1.5" opacity=".9"/>' +
        '<path d="M80 66 C90 54 110 54 120 66 C110 78 90 78 80 66Z" fill="#f3e9ff" stroke="#2b1f8f" stroke-width="2"/>' +
        '<circle cx="100" cy="66" r="8" fill="url(#aIris)"/><circle cx="100" cy="66" r="3" fill="#120730"/>' +
        '<g filter="url(#aGlowBig)">' +
        '<path d="M100 88 C114 88 120 100 112 110 C106 116 104 118 104 126 L96 126 C96 116 100 112 106 106 C110 101 106 96 100 96 C94 96 92 100 92 104 L84 104 C84 94 90 88 100 88Z" fill="url(#aFire)"/>' +
        '<circle cx="100" cy="136" r="5.5" fill="#ffd23f"/></g>' +
        '<path d="M80 150 h40 M86 156 h28" stroke="#ff7a2e" stroke-width="2" opacity=".8" filter="url(#aGlow)"/>' +
        '<g filter="url(#aGlow)">' + runes + '</g>' +
        sparks(67, 14, [20, 20, 180, 190]), 'Murder Mystery');
    }
  };

  /* App logo: enchanted pocket watch with lightning hands. */
  function logo() {
    return '<svg class="vart" viewBox="0 0 200 200" role="img" aria-label="Airsoft Ops"><rect width="200" height="200" fill="url(#aBg)"/>' + runeRing(100, 108, 78, 71) +
      '<g filter="url(#aGlow)" opacity=".85"><path d="M96 4v40M104 20v30M100 160v36M92 170v20M108 168v26" stroke="#ff3d9a" stroke-width="5"/></g>' +
      '<circle cx="100" cy="112" r="56" fill="url(#aOrb)"/>' +
      '<path d="M66 96 C84 84 116 140 134 120 M70 136 C90 120 112 150 126 140" stroke="#8a5cff" stroke-width="7" fill="none" opacity=".7"/>' +
      '<circle cx="100" cy="112" r="56" fill="none" stroke="#6b2a10" stroke-width="13"/>' +
      '<circle cx="100" cy="112" r="56" fill="none" stroke="url(#aGold)" stroke-width="9"/>' +
      '<path d="M48 120 C40 160 150 176 158 110" stroke="url(#aFire)" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#aGlow)"/>' +
      '<rect x="92" y="46" width="16" height="12" rx="3" fill="url(#aGold)" stroke="#6b2a10" stroke-width="2"/>' +
      '<circle cx="100" cy="36" r="11" fill="none" stroke="url(#aGold)" stroke-width="5"/>' +
      '<g filter="url(#aGlow)"><path d="M100 112 L84 78 L94 84 L82 62 L104 104Z" fill="url(#aGold)"/><path d="M100 112 L136 90 L126 100 L150 92 L104 116Z" fill="url(#aGold)"/></g>' +
      '<circle cx="100" cy="112" r="5" fill="#ffe9a0"/>' +
      '<g filter="url(#aGlowBig)"><path d="' + star(148, 90, 12, 8) + '" fill="#ffd23f"/></g>' +
      sparks(73, 12, [20, 20, 180, 190]) + '</svg>';
  }

  /* ---------- Murder Mystery role symbols (no emoji, no weapons) ---------- */
  const TEAM_GRAD = { good: 'rGood', evil: 'rEvil', own: 'rOwn', draw: 'rDraw' };
  const ROLE_PATHS = {
    /* hollow mask with slit eyes and a blood drop */
    murderer: '<path d="M16 18 C24 12 40 12 48 18 C50 34 44 46 32 52 C20 46 14 34 16 18Z"/><path d="M22 28 l8 3 M42 28 l-8 3"/><path d="M32 40 c-3 4 -3 7 0 8 c3 -1 3 -4 0 -8Z"/>',
    innocent: '<ellipse cx="32" cy="14" rx="13" ry="4"/><path d="M32 54 C18 44 14 34 20 28 C25 23 30 26 32 30 C34 26 39 23 44 28 C50 34 46 44 32 54Z"/>',
    medic: '<path d="M26 10 h12 v16 h16 v12 h-16 v16 h-12 v-16 h-16 v-12 h16Z"/><path d="M22 32 h6 l2 -4 4 8 2 -4 h6" stroke-width="2.4"/>',
    bounty: '<circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="6"/><path d="M32 6 v12 M32 46 v12 M6 32 h12 M46 32 h12"/>',
    copycat: '<path d="M32 8 L54 20 L54 44 L32 56 L10 44 L10 20Z M10 20 L32 32 L54 20 M32 32 V56"/><circle cx="32" cy="20" r="2.4"/><circle cx="20" cy="36" r="2.4"/><circle cx="44" cy="40" r="2.4"/><circle cx="40" cy="32" r="2.4"/>',
    amok: '<path d="M16 28 C16 12 48 12 48 28 C48 38 42 42 42 46 V52 H22 V46 C22 42 16 38 16 28Z"/><path d="M34 12 L28 26 L36 28 L30 42" /><circle cx="25" cy="30" r="3"/><circle cx="40" cy="30" r="3"/>',
    twin: '<circle cx="24" cy="32" r="14"/><circle cx="40" cy="32" r="14"/><path d="M32 22 v20"/>',
    detective: '<circle cx="27" cy="27" r="15"/><path d="M38 38 L54 54" stroke-width="6"/><path d="M20 24 c2 -4 6 -6 10 -6" opacity=".7"/>',
    informant: '<path d="M8 32 C16 18 48 18 56 32 C48 46 16 46 8 32Z"/><circle cx="32" cy="32" r="7"/><path d="M14 12 l6 6 M50 12 l-6 6 M32 6 v8"/>',
    bodyguard: '<path d="M32 8 L52 16 V30 C52 44 42 52 32 56 C22 52 12 44 12 30 V16Z"/><path d="M32 18 V46 M22 28 H42"/>',
    double: '<circle cx="32" cy="32" r="22"/><path d="M32 10 V54"/><path d="M20 28 h6 M38 28 h6"/><path d="M20 42 c4 4 8 4 12 0 M32 42 c4 -4 8 -4 12 0"/>',
    avenger: '<path d="M32 56 C18 50 14 38 22 26 C24 34 28 34 28 28 C28 18 34 12 38 8 C38 18 50 24 48 38 C46 50 40 54 32 56Z"/><circle cx="28" cy="40" r="2.6"/><circle cx="37" cy="40" r="2.6"/>',
    joker: '<path d="M12 46 C12 30 18 22 24 18 L20 10 L32 18 L44 10 L40 18 C46 22 52 30 52 46Z"/><circle cx="20" cy="10" r="3"/><circle cx="44" cy="10" r="3"/><path d="M22 46 c4 6 16 6 20 0"/><path d="M24 34 l4 2 M40 34 l-4 2"/>',
    scientist: '<path d="M26 8 h12 M28 8 V24 L14 50 C12 54 14 56 18 56 H46 C50 56 52 54 50 50 L36 24 V8"/><path d="M20 42 H44"/><circle cx="28" cy="48" r="2"/><circle cx="36" cy="46" r="1.6"/>',
    spy: '<path d="M32 36 V56 M24 56 H40"/><circle cx="32" cy="30" r="5"/><path d="M22 20 C16 26 16 34 22 40 M42 20 C48 26 48 34 42 40 M14 12 C4 22 4 38 14 48 M50 12 C60 22 60 38 50 48"/>'
  };
  const ROLE_TEAM = { murderer: 'evil', innocent: 'good', medic: 'good', bounty: 'own', copycat: 'draw', amok: 'own', twin: 'good', twins: 'good', detective: 'good', informant: 'good', bodyguard: 'good', double: 'good', avenger: 'good', joker: 'own', scientist: 'good', spy: 'good' };
  function role(key, cls) {
    const k = key === 'twins' ? 'twin' : key;
    const g = TEAM_GRAD[ROLE_TEAM[key] || 'good'];
    return '<svg class="rsym ' + (cls || '') + '" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="url(#' + g + ')" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" filter="url(#aGlow)">' + (ROLE_PATHS[k] || ROLE_PATHS.innocent) + '</g></svg>';
  }

  /* ---------- Role card frame and back ---------- */
  function cardFrame() {
    return '<svg class="cardframe" viewBox="0 0 300 420" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect x="4" y="4" width="292" height="412" rx="22" fill="url(#aBg)" stroke="#2b3aa8" stroke-width="5"/>' +
      '<rect x="16" y="16" width="268" height="388" rx="14" fill="none" stroke="#8b5cff" stroke-width="1.6" opacity=".9"/>' +
      '<rect x="22" y="22" width="256" height="376" rx="10" fill="none" stroke="#ff3d9a" stroke-width=".8" stroke-dasharray="3 6" opacity=".6"/>' +
      '<g fill="url(#aFire)" filter="url(#aGlow)"><path d="M16 50 L30 36 L16 22Z"/><path d="M284 50 L270 36 L284 22Z"/><path d="M16 370 L30 384 L16 398Z"/><path d="M284 370 L270 384 L284 398Z"/></g>' +
      '<g class="fring" opacity=".14" transform="translate(50 110)">' + runeRing(100, 100, 96, 81, '#8b5cff') + '</g>' +
      '</svg>';
  }
  // Only the centre motif: the stretched cardFrame underneath draws border and corners.
  function cardBack() {
    return '<svg class="cardback" viewBox="30 60 240 300" aria-hidden="true">' +
      '<circle cx="150" cy="210" r="110" fill="url(#aPinkCore)" opacity=".28"/>' +
      '<g transform="translate(50 110)">' + runeRing(100, 100, 96, 91, '#5a3cff') + '</g>' +
      '<path d="M90 210 C120 170 180 170 210 210 C180 250 120 250 90 210Z" fill="#f3e9ff" stroke="#2b1f8f" stroke-width="4"/>' +
      '<circle cx="150" cy="210" r="24" fill="url(#aIris)"/><circle cx="150" cy="210" r="9" fill="#120730"/>' +
      '<g filter="url(#aGlowBig)" fill="url(#aFire)"><path d="M150 112 l10 18 -10 18 -10 -18z"/><path d="M150 272 l10 18 -10 18 -10 -18z"/></g>' +
      sparks(93, 18, [40, 70, 260, 350]) + '</svg>';
  }

  window.ART = {
    mode: (id) => (MODES[id] ? MODES[id]() : ''),
    logo, role, cardFrame, cardBack, injectDefs, defs: () => DEFS
  };
  if (document.body) injectDefs(); else document.addEventListener('DOMContentLoaded', injectDefs);
})();
