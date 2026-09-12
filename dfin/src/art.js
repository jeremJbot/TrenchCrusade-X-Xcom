/* =====================================================================
   Graphismes générés par code (Canvas 2D) — style vue de dessus "Prison
   Architect" : formes plates, contours sombres, petites variations.
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const T = 32;
  DFIN.T = T;

  const FLOORS = {
    carpet: { base: '#6d7a8c', alt: '#68758a', line: '#5f6c7e' },
    tile: { base: '#c8c4bc', alt: '#c1bdb4', line: '#aaa59b' },
    wood: { base: '#a8794c', alt: '#9f7147', line: '#7e5834' },
    dark: { base: '#30363f', alt: '#2c323a', line: '#252a31' },
    carpet2: { base: '#7a4b52', alt: '#74474e', line: '#653d43' },
    cafe: { base: '#b9865c', alt: '#b07f56', line: '#96683f' },
    raised: { base: '#3a4048', alt: '#353b43', line: '#2a2f36' },
  };

  function hexToRgb(h) { if (h[0] !== '#') { const m = h.match(/\d+/g); return [+m[0], +m[1], +m[2]]; } const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); const c = [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.round(A[i] + (B[i] - A[i]) * t)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
  function shade(h, t) { return t < 0 ? mix(h, '#000000', -t) : mix(h, '#ffffff', t); }
  DFIN.shade = shade; DFIN.mix = mix;

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  DFIN.rr = rr;

  /* ---------------------------------------------------- Sol & murs -- */
  function drawFloor(ctx, tile, x, y) {
    const f = FLOORS[tile.f] || FLOORS.carpet;
    const px = x * T, py = y * T;
    let base = f.base;
    if (tile.unit && tile.f === 'carpet') { const u = DFIN.UNITS.find(u => u.id === tile.unit); base = mix(f.base, u.color, 0.16); }
    ctx.fillStyle = (tile.seed % 3 === 0) ? shade(base, -0.03) : base;
    ctx.fillRect(px, py, T, T);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
    if (tile.f === 'wood') { ctx.beginPath(); ctx.moveTo(px, py + 8.5); ctx.lineTo(px + T, py + 8.5); ctx.moveTo(px, py + 24.5); ctx.lineTo(px + T, py + 24.5); ctx.stroke(); if (tile.seed % 2) { ctx.beginPath(); ctx.moveTo(px + 16.5, py + 8); ctx.lineTo(px + 16.5, py + 24); ctx.stroke(); } }
    else if (tile.f === 'tile' || tile.f === 'cafe') { ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); }
    else if (tile.f === 'dark') { ctx.fillStyle = 'rgba(255,255,255,0.025)'; if ((x + y) % 2) ctx.fillRect(px, py, T, T); ctx.strokeStyle = 'rgba(79,179,217,0.06)'; ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); }
    else if (tile.f === 'raised') { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); if (tile.seed % 4 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) ctx.fillRect(px + 6, py + 6 + i * 4, 20, 2); } }
    else { // moquette tissée
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 8 + ((x % 2) ? 4 : 0), T, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.035)'; for (let i = 0; i < 8; i++) { const sx = (tile.seed * (i + 3) * 7) % T, sy = (tile.seed * (i + 5) * 11) % T; ctx.fillRect(px + sx, py + sy, 2, 1); }
    }
  }

  function drawWall(ctx, map, x, y) {
    const t = map.tiles[y][x];
    const px = x * T, py = y * T;
    const floorS = y + 1 < map.H && map.tiles[y + 1][x].t !== 'wall' && map.tiles[y + 1][x].t !== 'glass';
    if (t.t === 'glass') {
      const horizontal = (x > 0 && map.tiles[y][x - 1].t === 'glass') || (x + 1 < map.W && map.tiles[y][x + 1].t === 'glass');
      // sol dessous (verre = on voit le sol du couloir/pièce)
      ctx.fillStyle = '#3a4048'; ctx.fillRect(px, py, T, T);
      ctx.fillStyle = 'rgba(160,220,240,0.35)';
      if (horizontal) { ctx.fillRect(px, py + 11, T, 10); ctx.fillStyle = '#2a2f36'; ctx.fillRect(px, py + 10, T, 2); ctx.fillRect(px, py + 20, T, 2); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 4, py + 13, 10, 2); }
      else { ctx.fillRect(px + 11, py, 10, T); ctx.fillStyle = '#2a2f36'; ctx.fillRect(px + 10, py, 2, T); ctx.fillRect(px + 20, py, 2, T); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 13, py + 4, 2, 10); }
      return;
    }
    // mur plein : face supérieure claire + arête inférieure sombre si sol en dessous
    ctx.fillStyle = '#4a4e58'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#9a9ea8'; ctx.fillRect(px, py, T, floorS ? T - 9 : T);
    ctx.fillStyle = '#b4b8c0'; ctx.fillRect(px + 1, py + 1, T - 2, floorS ? T - 12 : T - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.05)'; if ((x + y) % 2) ctx.fillRect(px + 1, py + 1, T - 2, floorS ? T - 12 : T - 2);
    if (floorS) { ctx.fillStyle = '#6a6e78'; ctx.fillRect(px, py + T - 9, T, 9); ctx.fillStyle = '#e8e2d4'; ctx.fillRect(px, py + T - 3, T, 3); }
    if (t.win) { ctx.fillStyle = '#7fb8d8'; if (x === 0 || x === map.W - 1) ctx.fillRect(px + 10, py + 2, 12, T - 4); else ctx.fillRect(px + 2, py + 10, T - 4, 12); ctx.fillStyle = 'rgba(255,255,255,0.5)'; if (x === 0 || x === map.W - 1) ctx.fillRect(px + 12, py + 4, 3, T - 8); else ctx.fillRect(px + 4, py + 12, T - 8, 3); }
  }

  function drawDoor(ctx, x, y) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#c8c4bc'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#6b4a2e'; ctx.fillRect(px, py + 12, 3, 8); ctx.fillRect(px + T - 3, py + 12, 3, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px + 3, py + 14, T - 6, 4);
  }

  /* ---------------------------------------------------- Mobilier ---- */
  const OBJ = {};
  OBJ.desk = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    const top = o.console ? '#3d4552' : (o.curved ? '#e8e4dc' : '#c9a577'), edge = o.console ? '#262c35' : (o.curved ? '#9a968e' : '#8a6a44');
    ctx.fillStyle = edge; rr(ctx, px + 1, py + 1, w - 2, T - 2, 3); ctx.fill();
    ctx.fillStyle = top; rr(ctx, px + 2, py + 2, w - 4, T - 6, 3); ctx.fill();
    // écran côté opposé à la chaise
    const monY = o.dir === 'n' ? py + T - 12 : py + 3; // dir = côté de la chaise
    const mons = o.dual ? [[4, 12], [17, 12]] : o.curved ? [[5, 22]] : [[5, 16]];
    for (const [mx, mw] of mons) {
      ctx.fillStyle = '#1c1f26'; rr(ctx, px + mx, monY, mw, 9, 2); ctx.fill();
      ctx.fillStyle = o.console ? '#4fb3d9' : o.curved ? '#c95bd6' : '#7fc3e6'; ctx.fillRect(px + mx + 1, monY + 1, mw - 2, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(px + mx + 2, monY + 2, 4, 1); ctx.fillRect(px + mx + 2, monY + 4, mw - 6, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(px + mx + 2 + i * 3, monY + 6 - i, 2, i + 1);
    }
    // clavier côté chaise
    const kbY = o.dir === 'n' ? py + 5 : py + T - 12;
    ctx.fillStyle = '#2a2d33'; ctx.fillRect(px + 6, kbY, 12, 5); ctx.fillStyle = '#4a4e57'; for (let i = 0; i < 5; i++) ctx.fillRect(px + 7 + i * 2, kbY + 1, 1, 3);
    ctx.fillStyle = '#2a2d33'; ctx.fillRect(px + 20, kbY + 1, 3, 4);
    // papiers, mug, téléphone selon le seed
    if (o.seed % 3 === 0) { ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + w - 22, py + 6, 10, 13); ctx.fillStyle = '#c9c4b8'; ctx.fillRect(px + w - 20, py + 9, 6, 1); ctx.fillRect(px + w - 20, py + 12, 6, 1); }
    if (o.seed % 2 === 0) { ctx.fillStyle = '#d94f6a'; ctx.beginPath(); ctx.arc(px + w - 8, py + 9, 3.5, 0, 7); ctx.fill(); ctx.fillStyle = '#4a2a20'; ctx.beginPath(); ctx.arc(px + w - 8, py + 9, 2, 0, 7); ctx.fill(); }
    if (o.seed % 5 === 1) { ctx.fillStyle = '#222'; ctx.fillRect(px + w - 12, py + T - 12, 9, 6); ctx.fillStyle = '#6cf'; ctx.fillRect(px + w - 11, py + T - 11, 3, 2); }
  };
  OBJ.bigdesk = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#4e3220'; rr(ctx, px + 1, py + 1, w - 2, T - 2, 4); ctx.fill();
    ctx.fillStyle = '#7a4f2c'; rr(ctx, px + 3, py + 3, w - 6, T - 8, 3); ctx.fill();
    ctx.fillStyle = '#1c1f26'; rr(ctx, px + 40, py + 16, 18, 10, 2); ctx.fill(); ctx.fillStyle = '#9fd3ee'; ctx.fillRect(px + 41, py + 17, 16, 8);
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + 8, py + 8, 14, 16); ctx.fillStyle = '#c9c4b8'; for (let i = 0; i < 4; i++) ctx.fillRect(px + 10, py + 11 + i * 3, 10, 1);
    ctx.fillStyle = '#2a2d33'; ctx.fillRect(px + 70, py + 8, 14, 8); ctx.fillStyle = '#6cf'; ctx.fillRect(px + 72, py + 10, 4, 2);
    ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 44, py + 6, 10, 3);
  };
  OBJ.chair = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    const u = o.unit ? DFIN.UNITS.find(u => u.id === o.unit) : null;
    const col = o.exec ? '#3a2a22' : (u ? mix('#3a4a68', u.color, 0.45) : '#3a4a68'), back = o.exec ? '#241a14' : shade(col, -0.35);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 17, 10, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = col; rr(ctx, px + 8, py + 8, 16, 16, 4); ctx.fill();
    ctx.fillStyle = back;
    if (o.dir === 'n') ctx.fillRect(px + 7, py + 21, 18, 4);       // dossier au sud (personne regarde le nord)
    else if (o.dir === 's') ctx.fillRect(px + 7, py + 7, 18, 4);
    else if (o.dir === 'e') ctx.fillRect(px + 7, py + 7, 4, 18);
    else ctx.fillRect(px + 21, py + 7, 4, 18);
  };
  OBJ.cabinet = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + 6, py + 28, 24, 4);
    ctx.fillStyle = o.locked ? '#4a4038' : '#5a5f6a'; rr(ctx, px + 4, py + 2, 24, 28, 2); ctx.fill();
    ctx.fillStyle = o.locked ? '#6a5a4a' : '#7d838f'; ctx.fillRect(px + 6, py + 4, 20, 11); ctx.fillRect(px + 6, py + 17, 20, 11);
    ctx.fillStyle = '#d8dbe0'; ctx.fillRect(px + 13, py + 8, 6, 2); ctx.fillRect(px + 13, py + 21, 6, 2);
    if (o.locked) { ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 22, py + 14, 4, 5); }
    if (o.tall) { ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + 8, py + 5, 6, 3); ctx.fillRect(px + 8, py + 18, 6, 3); }
  };
  OBJ.bookshelf = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#4e3220'; ctx.fillRect(px + 2, py + 2, 28, 28);
    const cols = ['#c9a34a', '#7a2e3a', '#2f6f8f', '#3aa76d', '#e07a3f', '#7c6bd1', '#d8d3c8'];
    let bx = px + 4;
    for (let i = 0; bx < px + 27; i++) { const w = 3 + (o.seed * (i + 1)) % 3; ctx.fillStyle = cols[(o.seed + i) % cols.length]; ctx.fillRect(bx, py + 4 + (i % 2), w, 24 - (i % 2)); bx += w + 1; }
  };
  OBJ.printer = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#d8d3c8'; rr(ctx, px + 4, py + 6, 24, 22, 3); ctx.fill();
    ctx.fillStyle = '#b9b3a6'; ctx.fillRect(px + 6, py + 8, 20, 6); ctx.fillStyle = '#f5f2ea'; ctx.fillRect(px + 8, py + 2, 16, 6);
    ctx.fillStyle = '#3aa76d'; ctx.fillRect(px + 22, py + 18, 3, 3);
  };
  OBJ.copier = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#c9c4b8'; rr(ctx, px + 3, py + 3, w - 6, T - 6, 4); ctx.fill();
    ctx.fillStyle = '#8a8f99'; ctx.fillRect(px + 6, py + 6, w - 12, 8); ctx.fillStyle = '#f5f2ea'; ctx.fillRect(px + 10, py + 18, 20, 9); ctx.fillRect(px + w - 30, py + 18, 20, 9);
    ctx.fillStyle = '#4fb3d9'; ctx.fillRect(px + w - 12, py + 8, 6, 4);
  };
  OBJ.plant = (ctx, o) => {
    const px = o.x * T, py = o.y * T; const k = o.big ? 1.35 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px + 17, py + 21, 9 * k, 5 * k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(px + 16, py + 19, 8 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.arc(px + 16, py + 19, 6.5 * k, 0, 7); ctx.fill();
    const greens = ['#3f8f4a', '#4fa858', '#2f7a3c', '#5cb865', '#2b6b36'];
    for (let i = 0; i < (o.big ? 9 : 6); i++) { const a = i * 0.9 + o.seed; ctx.fillStyle = greens[i % 5]; ctx.beginPath(); ctx.ellipse(px + 16 + Math.cos(a) * 7 * k, py + 15 + Math.sin(a) * 5 * k, 8 * k, 4 * k, a, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7fe08a'; ctx.beginPath(); ctx.arc(px + 15, py + 13, 3.5 * k, 0, 7); ctx.fill();
  };
  OBJ.roundtable = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.arc(px + 17, py + 18, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8e2d4'; ctx.beginPath(); ctx.arc(px + 16, py + 16, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b0aa9c'; ctx.lineWidth = 1.5; ctx.stroke();
    if (o.seed % 2) { ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + 9, py + 10, 10, 12); ctx.fillStyle = '#aaa'; ctx.fillRect(px + 11, py + 13, 6, 1); ctx.fillRect(px + 11, py + 16, 6, 1); }
  };
  OBJ.table2 = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T, h = o.h * T;
    ctx.fillStyle = '#6a4a2c'; rr(ctx, px + 3, py + 3, w - 6, h - 6, 5); ctx.fill();
    ctx.fillStyle = '#a97d52'; rr(ctx, px + 5, py + 5, w - 10, h - 12, 4); ctx.fill();
    ctx.fillStyle = '#f5f2ea'; ctx.beginPath(); ctx.arc(px + 20, py + 18, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#4a2a20'; ctx.beginPath(); ctx.arc(px + 20, py + 18, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#3aa76d'; ctx.fillRect(px + w - 22, py + h - 24, 8, 8);
  };
  OBJ.bigtable = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T, h = o.h * T;
    ctx.fillStyle = '#3a2a1c'; rr(ctx, px + 4, py + 4, w - 8, h - 8, 10); ctx.fill();
    ctx.fillStyle = '#6a4a2c'; rr(ctx, px + 7, py + 7, w - 14, h - 16, 8); ctx.fill();
    ctx.fillStyle = '#5c3e24'; rr(ctx, px + 30, py + 26, w - 60, h - 56, 6); ctx.fill();
    // documents et micros
    ctx.fillStyle = '#f2efe6'; for (let i = 0; i < 5; i++) ctx.fillRect(px + 20 + i * 34, py + 12, 12, 9);
    for (let i = 0; i < 4; i++) ctx.fillRect(px + 36 + i * 34, py + h - 26, 12, 9);
    ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + w / 2 - 14, py + h / 2 - 6, 28, 4);
  };
  OBJ.sofa = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#7a3b4a'; rr(ctx, px + 2, py + 4, w - 4, T - 8, 5); ctx.fill();
    ctx.fillStyle = '#a04e60'; rr(ctx, px + 6, py + 10, w / 2 - 8, T - 16, 3); ctx.fill(); rr(ctx, px + w / 2 + 2, py + 10, w / 2 - 8, T - 16, 3); ctx.fill();
  };
  OBJ.counter = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#5a5f6a'; rr(ctx, px + 1, py + 2, w - 2, T - 4, 3); ctx.fill();
    ctx.fillStyle = '#d8dbe0'; rr(ctx, px + 3, py + 4, w - 6, T - 10, 3); ctx.fill();
    ctx.fillStyle = '#9aa0aa'; ctx.beginPath(); ctx.arc(px + 20, py + 16, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(px + 19, py + 6, 2, 8);
    ctx.fillStyle = '#e07a3f'; ctx.fillRect(px + w - 26, py + 8, 10, 10); ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + w - 14, py + 8, 8, 12);
  };
  OBJ.coffee = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#2a2d33'; rr(ctx, px + 5, py + 3, 22, 26, 3); ctx.fill();
    ctx.fillStyle = '#4a4e57'; ctx.fillRect(px + 7, py + 5, 18, 8); ctx.fillStyle = '#e07a3f'; ctx.fillRect(px + 9, py + 7, 6, 4);
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + 12, py + 19, 8, 6); ctx.fillStyle = '#3aa76d'; ctx.fillRect(px + 21, py + 7, 2, 2);
  };
  OBJ.vending = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#b83a52'; rr(ctx, px + 4, py + 2, 24, 28, 2); ctx.fill();
    ctx.fillStyle = '#1c1f26'; ctx.fillRect(px + 6, py + 5, 14, 20);
    const c = ['#4fb3d9', '#e07a3f', '#c9a34a', '#3aa76d', '#7c6bd1', '#f2efe6'];
    for (let i = 0; i < 6; i++) { ctx.fillStyle = c[i]; ctx.fillRect(px + 7 + (i % 2) * 7, py + 6 + Math.floor(i / 2) * 6, 5, 4); }
    ctx.fillStyle = '#d8dbe0'; ctx.fillRect(px + 22, py + 6, 4, 8);
  };
  OBJ.fridge = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#d8dbe0'; rr(ctx, px + 5, py + 2, 22, 28, 2); ctx.fill(); ctx.fillStyle = '#b6bbc4'; ctx.fillRect(px + 7, py + 12, 18, 1); ctx.fillRect(px + 22, py + 5, 2, 5); ctx.fillRect(px + 22, py + 15, 2, 10);
  };
  OBJ.whiteboard = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#8a8f99'; ctx.fillRect(px + 6, py + 12, w - 12, 12); ctx.fillStyle = '#f7f7f4'; ctx.fillRect(px + 8, py + 13, w - 16, 10);
    const u = DFIN.UNITS.find(u => u.id === o.unit); ctx.fillStyle = u ? u.color : '#d94f6a';
    ctx.fillRect(px + 12, py + 15, 10, 2); ctx.fillRect(px + 12, py + 19, 18, 2); ctx.fillStyle = '#2f6fb8'; ctx.fillRect(px + 34, py + 15, 14, 2);
    ctx.fillStyle = '#5a5f6a'; ctx.fillRect(px + 8, py + 24, 2, 5); ctx.fillRect(px + w - 10, py + 24, 2, 5);
  };
  OBJ.board = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + 4, py + 26, w - 8, 6);
    ctx.fillStyle = '#3a2a1c'; rr(ctx, px + 2, py + 6, w - 4, 22, 3); ctx.fill();
    ctx.fillStyle = '#f5f2ea'; ctx.fillRect(px + 5, py + 9, w - 10, 16);
    ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 8, py + 11, 26, 3);
    const cols = ['#7c6bd1', '#e07a3f', '#3aa76d', '#c9a34a', '#8a9bab', '#3f8fd9'];
    for (let i = 0; i < 12; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(px + 8 + (i % 6) * 19, py + 16 + Math.floor(i / 6) * 4, 12 + (i % 3) * 2, 2); }
    ctx.fillStyle = '#5a5f6a'; ctx.fillRect(px + 10, py + 28, 3, 4); ctx.fillRect(px + w - 13, py + 28, 3, 4);
  };
  OBJ.console = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#1e232b'; rr(ctx, px + 2, py + 4, w - 4, T - 6, 4); ctx.fill();
    ctx.fillStyle = '#2f3742'; rr(ctx, px + 5, py + 7, w - 10, 14, 3); ctx.fill();
    ctx.fillStyle = '#4fb3d9'; ctx.fillRect(px + 8, py + 9, 20, 10); ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 32, py + 9, 8, 10); ctx.fillStyle = '#d94f6a'; ctx.fillRect(px + 44, py + 9, 12, 10);
    ctx.fillStyle = '#4a4e57'; for (let i = 0; i < 8; i++) ctx.fillRect(px + 8 + i * 6, py + 24, 4, 3);
  };
  OBJ.server = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#1e232b'; rr(ctx, px + 6, py + 2, 20, 28, 2); ctx.fill();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#2f3742'; ctx.fillRect(px + 8, py + 4 + i * 4, 16, 3); ctx.fillStyle = i % 2 ? '#3aa76d' : '#4fb3d9'; ctx.fillRect(px + 21, py + 5 + i * 4, 2, 1); }
  };
  OBJ.tv = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#1c1f26'; rr(ctx, px + 4, py + 4, w - 8, 20, 2); ctx.fill(); ctx.fillStyle = '#2f6f8f'; ctx.fillRect(px + 6, py + 6, w - 12, 16);
    ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 10, py + 9, 20, 3); ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + 10, py + 14, 30, 2); ctx.fillRect(px + 10, py + 18, 24, 2);
  };
  OBJ.watercooler = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#d8dbe0'; rr(ctx, px + 10, py + 14, 12, 16, 2); ctx.fill();
    ctx.fillStyle = '#7fb8d8'; ctx.beginPath(); ctx.arc(px + 16, py + 11, 8, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(px + 13, py + 9, 3, 0, 7); ctx.fill();
  };
  OBJ.bin = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#4a4e57'; ctx.beginPath(); ctx.arc(px + 24, py + 24, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#6a6f7a'; ctx.beginPath(); ctx.arc(px + 24, py + 24, 3, 0, 7); ctx.fill();
  };
  OBJ.rug = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T, h = o.h * T;
    const col = o.color || '#7a2e3a';
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, px + 4, py + 5, w - 8, h - 8, 10); ctx.fill();
    ctx.fillStyle = o.fancy ? col : mix('#6d7a8c', col, 0.42); rr(ctx, px + 3, py + 3, w - 6, h - 6, 10); ctx.fill();
    ctx.strokeStyle = o.fancy ? '#c9a34a' : 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2; rr(ctx, px + 9, py + 9, w - 18, h - 18, 6); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let yy = py + 12; yy < py + h - 12; yy += 6) ctx.fillRect(px + 12, yy, w - 24, 1);
  };
  OBJ.sign = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, px + 4, py + 6, w - 8, 20, 4); ctx.fill();
    ctx.fillStyle = o.color; rr(ctx, px + 6, py + 8, 6, 16, 2); ctx.fill();
    const u = DFIN.UNITS.find(u => u.id === o.unit);
    ctx.fillStyle = '#f5f2ea'; ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(u ? u.name.toUpperCase() : o.text, px + 16, py + 16, w - 24);
  };
  OBJ.screen = (ctx, o) => { // cadre du mur d'écrans (le contenu est dessiné dynamiquement)
    const px = o.x * T, py = (o.y - 1) * T, w = o.w * T, h = 3 * T;
    ctx.fillStyle = '#12151b'; ctx.fillRect(px - 3, py, w + 6, h);
    ctx.fillStyle = '#2a2f38'; ctx.fillRect(px - 3, py + h - 6, w + 6, 6);
    ctx.fillStyle = '#4a5160'; for (let i = 0; i < o.w; i += 2) ctx.fillRect(px + i * T + T - 2, py + h - 5, 4, 4);
  };


  OBJ.lamp = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px + 17, py + 27, 7, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(px + 16, py + 26, 5, 0, 7); ctx.fill(); ctx.fillRect(px + 15, py + 12, 2, 14);
    ctx.fillStyle = o.green ? '#2f6b4a' : '#f0d9a8'; ctx.beginPath(); ctx.moveTo(px + 6, py + 16); ctx.lineTo(px + 26, py + 16); ctx.lineTo(px + 22, py + 4); ctx.lineTo(px + 10, py + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.green ? 'rgba(255,240,180,0.9)' : 'rgba(255,255,255,0.7)'; ctx.fillRect(px + 8, py + 14, 16, 2);
  };
  OBJ.neon = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(px + 14, py + 8, 4, 22); ctx.fillRect(px + 9, py + 28, 14, 3);
    ctx.fillStyle = '#e28cff'; ctx.fillRect(px + 8, py + 4, 16, 4); ctx.fillStyle = 'rgba(226,140,255,0.5)'; ctx.fillRect(px + 6, py + 2, 20, 8);
  };
  OBJ.ledstrip = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = 'rgba(201,91,214,0.45)'; ctx.fillRect(px + 4, py + 26, w - 8, 3); ctx.fillStyle = '#ff9df5'; for (let i = 0; i < w / 8; i++) ctx.fillRect(px + 6 + i * 8, py + 27, 2, 1);
  };
  OBJ.garland = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.strokeStyle = '#6a4a2c'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= w; x += 4) { const y = py + 22 + Math.sin(x / 14) * 4; x ? ctx.lineTo(px + x, y) : ctx.moveTo(px + x, y); } ctx.stroke();
    const cols = ['#ffd27a', '#ffb347', '#fff3c4']; for (let x = 6; x < w; x += 12) { ctx.fillStyle = cols[(x / 12) % 3 | 0]; ctx.beginPath(); ctx.arc(px + x, py + 25 + Math.sin(x / 14) * 4, 2.2, 0, 7); ctx.fill(); }
  };
  OBJ.plantwall = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#2b4a33'; rr(ctx, px + 2, py + 4, w - 4, 26, 3); ctx.fill();
    const g = ['#3f8f4a', '#4fa858', '#2f7a3c', '#6fd07a', '#8fbf5a'];
    for (let i = 0; i < 26; i++) { ctx.fillStyle = g[(i * 7 + o.seed) % 5]; ctx.beginPath(); ctx.arc(px + 6 + (i % 9) * 6.5 + ((i / 9 | 0) % 2) * 3, py + 8 + (i / 9 | 0) * 8, 3.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#f2efe6'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('GREEN BOND', px + w / 2, py + 30);
  };
  OBJ.tickerscreen = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#1c1f26'; rr(ctx, px + 4, py + 6, w - 8, 18, 2); ctx.fill(); ctx.fillStyle = '#0b1420'; ctx.fillRect(px + 6, py + 8, w - 12, 14);
    ctx.fillStyle = '#3aa76d'; ctx.beginPath(); for (let i = 0; i < 12; i++) { const x = px + 8 + i * (w - 16) / 11, y = py + 20 - ((i * 37 + o.seed) % 9); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.lineTo(px + w - 8, py + 21); ctx.lineTo(px + 8, py + 21); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 8, py + 10, 10, 2); ctx.fillStyle = '#2a2d33'; ctx.fillRect(px + w / 2 - 4, py + 24, 8, 5);
  };
  OBJ.worldmap = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#e8e2d4'; rr(ctx, px + 6, py + 6, w - 12, 20, 2); ctx.fill(); ctx.strokeStyle = '#6a4a2c'; ctx.strokeRect(px + 6.5, py + 6.5, w - 13, 19);
    ctx.fillStyle = '#9cbf8a'; for (const [cx, cy, rw, rh] of [[12, 10, 14, 8], [30, 9, 10, 6], [44, 8, 26, 9], [22, 18, 8, 6], [54, 18, 12, 5], [70, 20, 8, 4]]) { ctx.beginPath(); ctx.ellipse(px + cx, py + cy, rw / 2, rh / 2, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#d94f6a'; for (const [cx, cy] of [[40, 9], [46, 8], [52, 10], [34, 8]]) ctx.fillRect(px + cx, py + cy, 2, 2);
  };
  OBJ.binders = (ctx, o) => {
    const px = o.x * T, py = o.y * T; const cols = ['#e07a3f', '#7c6bd1', '#3aa76d', '#c9a34a', '#3f8fd9'];
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px + 6, py + 26, 22, 4);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[(i + o.seed) % 5]; ctx.fillRect(px + 5 + i * 6, py + 6 + (i % 2) * 2, 5, 22 - (i % 2) * 2); ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + 6 + i * 6, py + 10, 3, 5); }
  };
  OBJ.worktable = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T, h = o.h * T;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; rr(ctx, px + 5, py + 6, w - 8, h - 8, 4); ctx.fill();
    ctx.fillStyle = '#4e3220'; rr(ctx, px + 3, py + 3, w - 6, h - 6, 4); ctx.fill(); ctx.fillStyle = '#8a5f3a'; rr(ctx, px + 5, py + 5, w - 10, h - 12, 3); ctx.fill();
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(px + 10, py + 10, 16, 20); ctx.fillRect(px + 30, py + 14, 16, 20); ctx.fillStyle = '#c9c4b8'; for (let i = 0; i < 4; i++) { ctx.fillRect(px + 12, py + 13 + i * 4, 12, 1); ctx.fillRect(px + 32, py + 17 + i * 4, 12, 1); }
    ctx.fillStyle = '#7c6bd1'; ctx.fillRect(px + 12, py + 34, 30, 10); ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 48, py + 38, 8, 8);
  };
  OBJ.wallcal = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#3a2a1c'; rr(ctx, px + 4, py + 4, w - 8, 24, 2); ctx.fill(); ctx.fillStyle = '#f7f4ea'; ctx.fillRect(px + 6, py + 6, w - 12, 20);
    ctx.fillStyle = '#7c6bd1'; ctx.fillRect(px + 6, py + 6, w - 12, 4);
    const cols = ['#7c6bd1', '#e07a3f', '#3aa76d', '#c9a34a']; for (let i = 0; i < 24; i++) { ctx.fillStyle = (i * 7 + o.seed) % 5 === 0 ? cols[i % 4] : '#d8d3c8'; ctx.fillRect(px + 8 + (i % 8) * 6, py + 13 + (i / 8 | 0) * 4, 4, 2); }
  };
  OBJ.lawshelf = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#3a2412'; ctx.fillRect(px + 2, py + 2, 28, 28); ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px + 4, py + 4, 24, 11); ctx.fillRect(px + 4, py + 17, 24, 11);
    const cols = ['#7a2e3a', '#2f4f7f', '#3a5a3a', '#8a6a2a'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[(i + r + o.seed) % 4]; ctx.fillRect(px + 5 + i * 4, py + 5 + r * 13, 3, 10); ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 5 + i * 4, py + 8 + r * 13, 3, 1); }
  };
  OBJ.armchair = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px + 17, py + 20, 12, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; rr(ctx, px + 4, py + 6, 24, 22, 7); ctx.fill(); ctx.fillStyle = '#7a4f3a'; rr(ctx, px + 9, py + 11, 14, 14, 4); ctx.fill();
    ctx.fillStyle = '#3e2a1e'; if (o.dir === 'w') ctx.fillRect(px + 24, py + 6, 5, 22); else if (o.dir === 'e') ctx.fillRect(px + 3, py + 6, 5, 22); else if (o.dir === 's') ctx.fillRect(px + 4, py + 5, 24, 5); else ctx.fillRect(px + 4, py + 23, 24, 5);
  };
  OBJ.sidetable = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(px + 17, py + 19, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#4e3220'; ctx.beginPath(); ctx.arc(px + 16, py + 17, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#8a5f3a'; ctx.beginPath(); ctx.arc(px + 16, py + 17, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.arc(px + 14, py + 16, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#4a2a20'; ctx.beginPath(); ctx.arc(px + 14, py + 16, 1.8, 0, 7); ctx.fill();
  };
  OBJ.safe = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + 6, py + 28, 24, 4);
    ctx.fillStyle = '#2f3542'; rr(ctx, px + 5, py + 4, 22, 26, 3); ctx.fill(); ctx.fillStyle = '#48505f'; rr(ctx, px + 8, py + 7, 16, 20, 2); ctx.fill();
    ctx.strokeStyle = '#c9a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + 16, py + 17, 4, 0, 7); ctx.stroke(); ctx.lineWidth = 1; ctx.fillStyle = '#c9a34a'; ctx.fillRect(px + 21, py + 12, 2, 10);
  };
  OBJ.umbrellas = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#4a4e57'; rr(ctx, px + 10, py + 16, 12, 14, 3); ctx.fill();
    const cols = ['#5b7fa6', '#d94f6a', '#1a1a1a']; for (let i = 0; i < 3; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(px + 12 + i * 3, py + 4 + i * 2, 2, 14); ctx.beginPath(); ctx.arc(px + 13 + i * 3, py + 5 + i * 2, 2.5, Math.PI, 0); ctx.fill(); }
  };
  OBJ.checklist = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#8a8f99'; ctx.fillRect(px + 6, py + 6, w - 12, 20); ctx.fillStyle = '#f7f7f4'; ctx.fillRect(px + 8, py + 8, w - 16, 16);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i < 3 ? '#3aa76d' : '#e0a63f'; ctx.fillRect(px + 11, py + 10 + i * 3.5, 2.5, 2.5); ctx.fillStyle = '#5a5f6a'; ctx.fillRect(px + 16, py + 11 + i * 3.5, 20 + (i * 7) % 12, 1); }
    ctx.fillStyle = '#5a5f6a'; ctx.fillRect(px + 8, py + 26, 2, 4); ctx.fillRect(px + w - 10, py + 26, 2, 4);
  };
  OBJ.beanbag = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px + 17, py + 20, 12, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(o.color || '#c95bd6', -0.2); ctx.beginPath(); ctx.ellipse(px + 16, py + 17, 12, 10, 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = o.color || '#c95bd6'; ctx.beginPath(); ctx.ellipse(px + 15, py + 15, 8, 6, 0.2, 0, 7); ctx.fill();
  };
  OBJ.minirack = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#1e232b'; rr(ctx, px + 7, py + 4, 18, 26, 2); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#2f3742'; ctx.fillRect(px + 9, py + 6 + i * 4.5, 14, 3); ctx.fillStyle = i % 2 ? '#c95bd6' : '#4fb3d9'; ctx.fillRect(px + 20, py + 7 + i * 4.5, 2, 1); }
  };
  OBJ.robot = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 27, 8, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8dbe0'; rr(ctx, px + 9, py + 12, 14, 14, 4); ctx.fill(); rr(ctx, px + 10, py + 4, 12, 9, 3); ctx.fill();
    ctx.fillStyle = '#4fb3d9'; ctx.fillRect(px + 12, py + 7, 3, 3); ctx.fillRect(px + 17, py + 7, 3, 3); ctx.fillStyle = '#c95bd6'; ctx.fillRect(px + 14, py + 16, 4, 4); ctx.fillStyle = '#8a8f99'; ctx.fillRect(px + 15, py + 1, 2, 3);
  };
  OBJ.rack = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px + 4, py + 28, 26, 4);
    ctx.fillStyle = '#12151b'; rr(ctx, px + 3, py + 1, 26, 30, 2); ctx.fill(); ctx.fillStyle = '#1e232b'; ctx.fillRect(px + 5, py + 3, 22, 26);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = '#2a3140'; ctx.fillRect(px + 6, py + 4 + i * 3.2, 20, 2.4); ctx.fillStyle = ((i + o.seed) % 3) ? '#3aa76d' : '#4fb3d9'; ctx.fillRect(px + 23, py + 5 + i * 3.2, 1.5, 1); }
    ctx.strokeStyle = '#3a4250'; ctx.strokeRect(px + 3.5, py + 1.5, 25, 29);
  };
  OBJ.ac = (ctx, o) => {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = '#d8dbe0'; rr(ctx, px + 3, py + 6, 26, 20, 3); ctx.fill(); ctx.fillStyle = '#9aa0aa'; for (let i = 0; i < 5; i++) ctx.fillRect(px + 6, py + 9 + i * 3, 20, 1); ctx.fillStyle = '#4fb3d9'; ctx.fillRect(px + 24, py + 22, 3, 2);
  };
  OBJ.cabletray = (ctx, o) => {
    const px = o.x * T, py = o.y * T, w = o.w * T;
    ctx.fillStyle = '#2a2f36'; ctx.fillRect(px, py + 10, w, 6); const cols = ['#4fb3d9', '#e07a3f', '#c9a34a', '#3aa76d']; for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(px, py + 11 + i, w, 1); }
  };

  function drawObject(ctx, o) { const fn = OBJ[o.type]; if (fn) fn(ctx, o); }

  /* ---------------------------------------------------- Personnages - */
  // vue de dessus 3/4 : ombre, pieds, corps, bras, tête, cheveux, yeux
  function drawPerson(ctx, px, py, p, st) {
    // px,py : centre de la tuile. st : {face:'n'|'s'|'e'|'w', walk:0..1|null, sitting, typing:phase, talking}
    const face = st.face || 's';
    const walk = st.walk == null ? 0 : Math.sin(st.walk * Math.PI * 2);
    ctx.save(); ctx.translate(px, py);
    if (!st.sitting) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 8, 10, 5, 0, 0, 7); ctx.fill(); }
    const shirt = p.shirt, dark = shade(shirt, -0.35), skin = p.skin, hair = p.hair;
    // pieds
    if (!st.sitting) {
      ctx.fillStyle = '#2a2420';
      if (face === 'n' || face === 's') { ctx.fillRect(-6, 4 + walk * 3, 5, 5); ctx.fillRect(1, 4 - walk * 3, 5, 5); }
      else { const d = face === 'e' ? 1 : -1; ctx.fillRect(-3 + d * walk * 4, 6, 6, 4); ctx.fillRect(-3 - d * walk * 4, 3, 6, 4); }
    }
    // corps (épaules)
    ctx.fillStyle = dark; rr(ctx, -9, -4, 18, 14, 6); ctx.fill();
    ctx.fillStyle = shirt; rr(ctx, -8, -3, 16, 12, 5); ctx.fill();
    // bras
    const swing = st.sitting ? (st.typing != null ? Math.sin(st.typing * 20) * 1.2 : 0) : walk * 3;
    ctx.fillStyle = skin;
    if (face === 'n' || face === 's') { ctx.beginPath(); ctx.arc(-9, 2 + swing, 3, 0, 7); ctx.arc(9, 2 - swing, 3, 0, 7); ctx.fill(); }
    else { const d = face === 'e' ? 1 : -1; ctx.beginPath(); ctx.arc(d * 3 + swing * d, 3, 3, 0, 7); ctx.fill(); }
    if (st.sitting && (face === 'n' || face === 's')) { ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(-4, face === 'n' ? -6 : 8, 2.5, 0, 7); ctx.arc(4, face === 'n' ? -6 : 8, 2.5, 0, 7); ctx.fill(); }
    // tête
    ctx.fillStyle = shade(skin, -0.3); ctx.beginPath(); ctx.arc(0, -4, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -4, 6.5, 0, 7); ctx.fill();
    // cheveux selon l'orientation
    ctx.fillStyle = hair; ctx.beginPath();
    if (face === 's') ctx.arc(0, -4, 6.5, Math.PI * 1.05, Math.PI * 1.95);
    else if (face === 'n') ctx.arc(0, -4, 6.5, 0, 7);
    else if (face === 'e') ctx.arc(0, -4, 6.5, Math.PI * 0.6, Math.PI * 1.9);
    else ctx.arc(0, -4, 6.5, Math.PI * 1.1, Math.PI * 2.4);
    ctx.fill();
    if (face === 's') { ctx.fillRect(-6.5, -6, 2, 4); ctx.fillRect(4.5, -6, 2, 4); if (p.long) { ctx.fillRect(-7, -6, 2.5, 9); ctx.fillRect(4.5, -6, 2.5, 9); } }
    if (p.glasses && face === 's') { ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.strokeRect(-4.5, -3.5, 3.5, 3); ctx.strokeRect(1, -3.5, 3.5, 3); }
    if (p.badge && (face === 's' || face === 'e' || face === 'w')) { ctx.fillStyle = '#f2efe6'; ctx.fillRect(-2, 3, 3, 4); ctx.fillStyle = '#c9a34a'; ctx.fillRect(-2, 3, 3, 1); }
    // yeux
    ctx.fillStyle = '#1a1512';
    if (face === 's') { ctx.fillRect(-3, -3, 2, 2); ctx.fillRect(1, -3, 2, 2); }
    else if (face === 'e') ctx.fillRect(3, -4, 2, 2);
    else if (face === 'w') ctx.fillRect(-5, -4, 2, 2);
    // marqueur joueur
    if (st.player) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 1, 13, 0, 7); ctx.stroke(); }
    ctx.restore();
  }

  function drawPortrait(canvas, p, mood) {
    const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const u = DFIN.UNITS.find(u => u.id === p.unit);
    ctx.fillStyle = u ? mix('#1c2028', u.color, 0.35) : '#2a2f38'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 6; i++) ctx.fillRect(0, i * 14, w, 6);
    const cx = w / 2, cy = h * 0.6;
    ctx.fillStyle = shade(p.shirt, -0.35); rr(ctx, cx - 26, cy + 14, 52, 40, 12); ctx.fill();
    ctx.fillStyle = p.shirt; rr(ctx, cx - 24, cy + 16, 48, 40, 10); ctx.fill();
    ctx.fillStyle = p.skin; ctx.fillRect(cx - 6, cy + 8, 12, 12);
    ctx.fillStyle = shade(p.skin, -0.3); ctx.beginPath(); ctx.arc(cx, cy - 6, 21, 0, 7); ctx.fill();
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(cx, cy - 6, 19, 0, 7); ctx.fill();
    ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(cx, cy - 8, 19.5, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.fillRect(cx - 19, cy - 12, 6, 12); ctx.fillRect(cx + 13, cy - 12, 6, 12);
    ctx.fillStyle = '#1a1512'; ctx.fillRect(cx - 8, cy - 6, 4, 4); ctx.fillRect(cx + 4, cy - 6, 4, 4);
    ctx.strokeStyle = '#1a1512'; ctx.lineWidth = 2; ctx.beginPath();
    const m = (mood || '').toLowerCase();
    if (/inqui|press|débord|stoï|vigil/.test(m)) { ctx.moveTo(cx - 5, cy + 6); ctx.lineTo(cx + 5, cy + 6); }
    else if (/enjou|enthou|malic|geek|affab|curieu/.test(m)) { ctx.arc(cx, cy + 3, 6, 0.2, Math.PI - 0.2); }
    else { ctx.moveTo(cx - 5, cy + 5); ctx.quadraticCurveTo(cx, cy + 8, cx + 5, cy + 5); }
    ctx.stroke();
  }

  DFIN.art = { drawFloor, drawWall, drawDoor, drawObject, drawPerson, drawPortrait, FLOORS };
})();
