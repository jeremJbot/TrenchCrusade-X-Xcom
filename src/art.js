/* Trench Crusade × XCOM — procedural art (Canvas 2D → Phaser textures) */
window.TC = window.TC || {};
(function () {
  const TW = 64, TH = 32, HW = 32, HH = 16;
  const Art = { TW, TH, HW, HH, TRENCH_DEPTH: 10, OBJ_H: 96 };
  TC.Art = Art;

  // seeded rng for deterministic textures
  function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); return { c, ctx }; }
  function diamond(ctx, cx, cy, hw, hh) { ctx.beginPath(); ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath(); }
  function poly(ctx, pts, fill, stroke, lw) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function ell(ctx, x, y, rx, ry, fill, stroke, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f))); return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'); }
  Art.shade = shade;
  const OUT = '#0a0806';

  // ---------- ground tiles (64x32) ----------
  function groundBase(ctx, seed, base, dark, opts) {
    opts = opts || {}; const r = rng(seed);
    const g = ctx.createLinearGradient(0, 0, 64, 32); g.addColorStop(0, shade(base, 1.08)); g.addColorStop(1, shade(base, 0.9));
    diamond(ctx, 32, 16, 32, 16); ctx.fillStyle = g; ctx.fill();
    ctx.save(); diamond(ctx, 32, 16, 32, 16); ctx.clip();
    for (let i = 0; i < 90; i++) { const x = r() * 64, y = r() * 32; const s = 0.6 + r() * 1.6; ctx.fillStyle = r() < 0.5 ? shade(base, 0.75 + r() * 0.2) : shade(base, 1.1 + r() * 0.2); ctx.globalAlpha = 0.5; ctx.fillRect(x, y, s, s * 0.6); }
    ctx.globalAlpha = 1;
    // streaks
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = shade(dark, 1); ctx.globalAlpha = 0.25; ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); const x = r() * 64, y = r() * 32; ctx.moveTo(x, y); ctx.lineTo(x + (r() - .5) * 30, y + (r() - .5) * 8); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (opts.puddle) { const px = 18 + r() * 28, py = 9 + r() * 14; ell(ctx, px, py, 7 + r() * 7, 3 + r() * 2.5, 'rgba(18,26,28,0.75)', null, (r() - .5) * .6); ell(ctx, px - 2, py - 1, 3 + r() * 3, 1 + r(), 'rgba(90,110,110,0.25)'); }
    if (opts.crater) { ell(ctx, 32, 16, 16, 8, 'rgba(0,0,0,0.35)'); ell(ctx, 32, 16, 11, 5.5, shade(dark, 0.8)); ctx.strokeStyle = shade(base, 1.25); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(32, 15, 15, 7.5, 0, Math.PI, Math.PI * 2); ctx.stroke(); }
    if (opts.debris) { for (let i = 0; i < 5; i++) { const x = 12 + r() * 40, y = 6 + r() * 20; ctx.fillStyle = r() < .5 ? '#bfb39a' : '#8a7d68'; ctx.fillRect(x, y, 2 + r() * 4, 1 + r() * 1.5); } if (r() < .7) { ell(ctx, 24 + r() * 16, 10 + r() * 10, 4, 2.5, '#4f5044', 'rgba(0,0,0,.5)'); } }
    if (opts.blood) { ell(ctx, 22 + r() * 20, 10 + r() * 12, 5 + r() * 4, 2.5 + r() * 2, 'rgba(90,10,10,0.45)'); }
    ctx.restore();
    // edge darkening
    diamond(ctx, 32, 16, 32, 16); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
  function tileMud(seed) { const { c, ctx } = mk(64, 32); const v = seed % 10; groundBase(ctx, seed, v === 4 ? '#3a3024' : '#3d3226', '#241c14', { puddle: v === 0 || v === 5, crater: v === 8, debris: v === 2 || v === 7, blood: v === 3 }); return c; }
  function tileRubble(seed) { const { c, ctx } = mk(64, 32); groundBase(ctx, seed, '#4a4238', '#2a241d'); const r = rng(seed + 7); ctx.save(); diamond(ctx, 32, 16, 32, 16); ctx.clip(); for (let i = 0; i < 9; i++) { const x = 10 + r() * 44, y = 6 + r() * 20, s = 2 + r() * 4; poly(ctx, [[x, y], [x + s, y - s * .3], [x + s * 1.3, y + s * .5], [x + s * .3, y + s * .7]], shade('#8a8072', 0.8 + r() * .4), 'rgba(0,0,0,.4)'); } ctx.restore(); return c; }
  function tileFlag(seed) {
    const { c, ctx } = mk(64, 32); const r = rng(seed); diamond(ctx, 32, 16, 32, 16); ctx.fillStyle = '#4c4a4f'; ctx.fill();
    ctx.save(); diamond(ctx, 32, 16, 32, 16); ctx.clip();
    // 4 sub-stones
    const subs = [[32, 8], [48, 16], [32, 24], [16, 16]]; subs.forEach((s, i) => { diamond(ctx, s[0], s[1], 15, 7.5); ctx.fillStyle = shade('#55535a', 0.85 + r() * .3); ctx.fill(); ctx.strokeStyle = '#2b292c'; ctx.lineWidth = 1.5; ctx.stroke(); });
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(r() * 64, r() * 32, 1, 1); }
    if (r() < 0.6) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20 + r() * 20, 5 + r() * 10); ctx.lineTo(28 + r() * 20, 14 + r() * 12); ctx.stroke(); }
    // blood stain
    if (seed % 4 === 1) { ell(ctx, 30 + r() * 10, 12 + r() * 8, 6, 3, 'rgba(90,10,10,0.55)'); }
    ctx.restore(); diamond(ctx, 32, 16, 32, 16); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke(); return c;
  }
  function tileWater(seed) {
    const { c, ctx } = mk(64, 32); groundBase(ctx, seed, '#35291f', '#1e1712'); ctx.save(); diamond(ctx, 32, 16, 32, 16); ctx.clip();
    ell(ctx, 32, 17, 24, 12, '#2b2419'); ell(ctx, 32, 17, 20, 10, '#1a2326'); const g = ctx.createRadialGradient(28, 14, 2, 32, 17, 20); g.addColorStop(0, 'rgba(90,110,110,0.45)'); g.addColorStop(1, 'rgba(10,20,25,0.0)'); ell(ctx, 32, 17, 20, 10, g);
    ctx.strokeStyle = 'rgba(160,180,180,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(32, 17, 13, 5, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); ctx.restore(); return c;
  }
  function tileWire(seed) {
    const { c, ctx } = mk(64, 48); ctx.translate(0, 16); groundBase(ctx, seed, '#3d3226', '#241c14'); const r = rng(seed);
    // posts
    const posts = [[14, 8], [32, 18], [50, 8]];
    posts.forEach(p => { poly(ctx, [[p[0] - 1.5, p[1] - 18], [p[0] + 1.5, p[1] - 18], [p[0] + 1.5, p[1] + 2], [p[0] - 1.5, p[1] + 2]], '#3a2a1c', OUT); });
    ctx.strokeStyle = '#8b8b84'; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(14, 8 - 16 + k * 6); ctx.bezierCurveTo(24, 2 - 16 + k * 6 + r() * 4, 40, 10 - 16 + k * 6 + r() * 4, 50, 8 - 16 + k * 6); ctx.stroke(); }
    ctx.strokeStyle = '#a8a89e'; for (let i = 0; i < 18; i++) { const x = 14 + r() * 36, y = -10 + r() * 14; ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2); ctx.stroke(); }
    return c;
  }
  function tileExtract(seed) {
    const { c, ctx } = mk(64, 32); groundBase(ctx, seed, '#3a3128', '#241c14'); ctx.save(); diamond(ctx, 32, 16, 32, 16); ctx.clip();
    ctx.globalAlpha = .55; ctx.fillStyle = '#e8dcc0'; ctx.fillRect(29, 6, 6, 20); ctx.fillRect(22, 11, 20, 6); ctx.globalAlpha = 1;
    diamond(ctx, 32, 16, 26, 13); ctx.strokeStyle = 'rgba(232,220,192,0.5)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); ctx.restore(); return c;
  }
  function tileTrench(seed, duck) {
    const { c, ctx } = mk(64, 32); groundBase(ctx, seed, '#2a2118', '#150f0a', { puddle: true });
    if (duck) { ctx.save(); diamond(ctx, 32, 16, 32, 16); ctx.clip(); const r = rng(seed); for (let i = -3; i < 4; i++) { const y = 16 + i * 5; ctx.beginPath(); ctx.moveTo(4, y + 6); ctx.lineTo(60, y - 6); ctx.strokeStyle = shade('#6b4e2e', 0.85 + r() * .3); ctx.lineWidth = 3.2; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = .6; ctx.stroke(); } ctx.restore(); }
    return c;
  }
  // trench side faces: back-left edge (neighbour x-1) and back-right edge (neighbour y-1), depth D
  function trenchSide(which) {
    const D = Art.TRENCH_DEPTH; const { c, ctx } = mk(64, 32 + D);
    if (which === 'l') { poly(ctx, [[0, 16], [32, 0], [32, D], [0, 16 + D]], '#3b2e21', null); const g = ctx.createLinearGradient(0, 0, 0, D + 16); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); poly(ctx, [[0, 16], [32, 0], [32, D], [0, 16 + D]], g, 'rgba(0,0,0,.5)'); }
    else { poly(ctx, [[32, 0], [64, 16], [64, 16 + D], [32, D]], '#2f2419', null); const g = ctx.createLinearGradient(0, 0, 0, D + 16); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); poly(ctx, [[32, 0], [64, 16], [64, 16 + D], [32, D]], g, 'rgba(0,0,0,.5)'); }
    return c;
  }

  // ---------- objects (64 x OBJ_H, ground diamond centre at (32, OBJ_H-16)) ----------
  const OH = Art.OBJ_H, GY = OH - 16; // ground centre y
  function isoBlock(ctx, cx, gy, hw, hh, h, colTop, colL, colR, seed) {
    const r = rng(seed || 1);
    // left face
    poly(ctx, [[cx - hw, gy], [cx, gy + hh], [cx, gy + hh - h], [cx - hw, gy - h]], colL, OUT);
    poly(ctx, [[cx, gy + hh], [cx + hw, gy], [cx + hw, gy - h], [cx, gy + hh - h]], colR, OUT);
    poly(ctx, [[cx - hw, gy - h], [cx, gy - hh - h], [cx + hw, gy - h], [cx, gy + hh - h]], colTop, OUT);
  }
  function bricks(ctx, pts, col, seed, rows, dir) {
    const r = rng(seed); ctx.save(); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
    const [x0, y0] = pts[0], [x1, y1] = pts[1]; const top = Math.min(pts[2][1], pts[3][1]);
    for (let k = 1; k < rows; k++) { const t = k / rows; ctx.beginPath(); const yy0 = pts[3][1] + (pts[0][1] - pts[3][1]) * t, yy1 = pts[2][1] + (pts[1][1] - pts[2][1]) * t; ctx.moveTo(pts[3][0], yy0); ctx.lineTo(pts[2][0], yy1); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const x = Math.min(x0, x1) + r() * Math.abs(x1 - x0), y = top + r() * (Math.max(y0, y1) - top); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 4); ctx.stroke(); }
    for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(Math.min(x0, x1) + r() * Math.abs(x1 - x0), top + r() * (Math.max(y0, y1) - top), 3, 2); }
    ctx.restore();
  }
  function objWall(seed, full, glass) {
    const { c, ctx } = mk(64, OH); const r = rng(seed); const h = full ? 40 : 15; const base = full ? '#5a4f46' : '#4f463e';
    isoBlock(ctx, 32, GY, 28, 14, h, shade(base, 1.15), shade(base, 0.9), shade(base, 0.65), seed);
    bricks(ctx, [[4, GY], [32, GY + 14], [32, GY + 14 - h], [4, GY - h]], null, seed, full ? 6 : 2);
    bricks(ctx, [[32, GY + 14], [60, GY], [60, GY - h], [32, GY + 14 - h]], null, seed + 3, full ? 6 : 2);
    // crumbled top: bite chunks out of the top edge
    for (let i = 0; i < (full ? 4 : 2); i++) { const x = 8 + r() * 46; const y = GY - h - 14 + Math.abs(x - 32) * .5; const w = 3 + r() * 6; ctx.fillStyle = shade(base, 0.55); ctx.beginPath(); ctx.moveTo(x - w, y + 1); ctx.lineTo(x, y - 2 - r() * 4); ctx.lineTo(x + w, y + 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = OUT; ctx.fillRect(x - w, y + 1, w * 2, 1); }
    // cracks, bullet holes, grime
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; for (let i = 0; i < (full ? 3 : 1); i++) { let x = 6 + r() * 52, y = GY - h + 4 + r() * (h - 10); ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - .5) * 8; y += 3 + r() * 5; ctx.lineTo(x, y); } ctx.stroke(); }
    for (let i = 0; i < (full ? 5 : 2); i++) { const x = 6 + r() * 52, y = GY - h + 6 + r() * (h - 8); ell(ctx, x, y, 1.2 + r(), 1 + r() * .8, 'rgba(0,0,0,.7)'); }
    const gr = ctx.createLinearGradient(0, GY - 6, 0, GY + 14); gr.addColorStop(0, 'rgba(30,20,10,0)'); gr.addColorStop(1, 'rgba(30,20,10,.55)'); ctx.fillStyle = gr; ctx.fillRect(2, GY - 6, 60, 20);
    if (r() < .3) { const bg = ctx.createRadialGradient(20 + r() * 24, GY - 10, 1, 32, GY - 10, 18); bg.addColorStop(0, 'rgba(90,10,10,.3)'); bg.addColorStop(1, 'rgba(90,10,10,0)'); ctx.fillStyle = bg; ctx.fillRect(4, GY - h, 56, h + 14); }
    if (glass) {
      // pointed arch on right face
      const g = ctx.createLinearGradient(0, GY - 34, 0, GY); g.addColorStop(0, '#5a84d0'); g.addColorStop(.5, '#b23a3a'); g.addColorStop(1, '#d9b04a');
      ctx.save(); ctx.beginPath(); ctx.moveTo(38, GY - 6); ctx.lineTo(38, GY - 24); ctx.quadraticCurveTo(46, GY - 40, 54, GY - 30); ctx.lineTo(54, GY - 14); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(38, GY - 8 - i * 6); ctx.lineTo(54, GY - 16 - i * 6); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(46, GY - 40); ctx.lineTo(46, GY); ctx.stroke(); ctx.restore();
    }
    return c;
  }
  function objSandbag(seed) {
    const { c, ctx } = mk(64, OH); const r = rng(seed); const col = '#7a6b48';
    const rows = [[[10, GY + 4], [22, GY + 9], [34, GY + 12], [46, GY + 8], [56, GY + 2]], [[16, GY - 2], [28, GY + 3], [40, GY + 5], [50, GY - 1]], [[24, GY - 8], [36, GY - 6], [46, GY - 9]]];
    rows.forEach((row, ri) => row.forEach(p => { ell(ctx, p[0], p[1], 8.5, 5, shade(col, 0.85 + ri * 0.12 + r() * .1), OUT, (r() - .5) * .5); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(p[0] - 1, p[1] - 1.5, 5, 2, 0, Math.PI, Math.PI * 2); ctx.stroke(); }));
    return c;
  }
  function objCrate(seed) { const { c, ctx } = mk(64, OH); isoBlock(ctx, 32, GY, 15, 8, 20, '#7d5b33', '#5e4326', '#3f2d1a', seed); const r = rng(seed); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(17, GY - i * 5); ctx.lineTo(32, GY + 8 - i * 5); ctx.lineTo(47, GY - i * 5); ctx.stroke(); } ctx.strokeStyle = '#c9a060'; ctx.beginPath(); ctx.moveTo(17, GY - 10); ctx.lineTo(32, GY - 2); ctx.moveTo(32, GY - 2); ctx.lineTo(47, GY - 10); ctx.stroke(); return c; }
  function objBarrel(seed) { const { c, ctx } = mk(64, OH); const g = ctx.createLinearGradient(20, 0, 44, 0); g.addColorStop(0, '#5a2a1e'); g.addColorStop(.45, '#8c3d2a'); g.addColorStop(1, '#3b1c14'); poly(ctx, [[20, GY - 22], [44, GY - 22], [44, GY + 2], [20, GY + 2]], g, OUT); ell(ctx, 32, GY + 2, 12, 5, '#4a2318', OUT); ell(ctx, 32, GY - 22, 12, 5, '#a04a33', OUT); ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2; [GY - 14, GY - 5].forEach(y => { ctx.beginPath(); ctx.ellipse(32, y, 12, 5, 0, 0, Math.PI); ctx.stroke(); }); ctx.fillStyle = '#e8a04a'; ctx.beginPath(); ctx.moveTo(30, GY - 18); ctx.lineTo(36, GY - 18); ctx.lineTo(33, GY - 10); ctx.closePath(); ctx.fill(); return c; }
  function objTree(seed) {
    const { c, ctx } = mk(64, OH); const r = rng(seed); ctx.strokeStyle = '#1b140f'; ctx.lineCap = 'round';
    const branch = (x, y, len, ang, w, d) => { if (d > 4 || len < 3) return; const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke(); branch(nx, ny, len * (0.6 + r() * .2), ang - 0.4 - r() * .5, w * .65, d + 1); branch(nx, ny, len * (0.6 + r() * .2), ang + 0.4 + r() * .5, w * .65, d + 1); };
    ctx.strokeStyle = '#231a12'; branch(32, GY + 2, 30, -Math.PI / 2 + (r() - .5) * .3, 7, 0); ctx.strokeStyle = 'rgba(120,100,80,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(29, GY); ctx.lineTo(30, GY - 24); ctx.stroke();
    return c;
  }
  function objShrine(seed, lit) {
    const { c, ctx } = mk(64, OH); const base = '#6a6a70';
    isoBlock(ctx, 32, GY, 14, 7, 10, shade(base, 1.1), shade(base, .85), shade(base, .65), seed);
    // niche
    poly(ctx, [[22, GY - 10], [42, GY - 10], [42, GY - 34], [32, GY - 42], [22, GY - 34]], shade(base, .9), OUT);
    ctx.fillStyle = '#1a1512'; ctx.beginPath(); ctx.moveTo(26, GY - 12); ctx.lineTo(38, GY - 12); ctx.lineTo(38, GY - 30); ctx.quadraticCurveTo(32, GY - 38, 26, GY - 30); ctx.closePath(); ctx.fill();
    // cross on top
    ctx.fillStyle = '#d8b45a'; ctx.fillRect(31, GY - 50, 2, 9); ctx.fillRect(28.5, GY - 47, 7, 2);
    if (lit) { const g = ctx.createRadialGradient(32, GY - 20, 1, 32, GY - 20, 12); g.addColorStop(0, 'rgba(255,220,140,.95)'); g.addColorStop(.3, 'rgba(255,170,60,.5)'); g.addColorStop(1, 'rgba(255,120,20,0)'); ctx.fillStyle = g; ctx.fillRect(18, GY - 34, 28, 24); ctx.fillStyle = '#f0e0c0'; ctx.fillRect(31, GY - 22, 2, 8); ell(ctx, 32, GY - 24, 1.5, 3, '#ffe9a0'); }
    else { ctx.fillStyle = '#c9c0b0'; ctx.fillRect(31, GY - 20, 2, 6); ctx.fillStyle = 'rgba(180,180,180,.5)'; ctx.fillRect(31, GY - 26, 1, 4); }
    return c;
  }
  function objPost(seed) { const { c, ctx } = mk(64, OH); poly(ctx, [[30, GY + 2], [34, GY + 2], [34, GY - 40], [30, GY - 40]], '#3a2a1c', OUT); poly(ctx, [[27, GY - 40], [37, GY - 40], [36, GY - 30], [28, GY - 30]], '#4a4a44', OUT); const g = ctx.createRadialGradient(32, GY - 35, 1, 32, GY - 35, 9); g.addColorStop(0, 'rgba(255,220,140,.9)'); g.addColorStop(1, 'rgba(255,150,40,0)'); ctx.fillStyle = g; ctx.fillRect(20, GY - 46, 24, 22); return c; }
  function objGrave(seed) { const { c, ctx } = mk(64, OH); const r = rng(seed); ctx.save(); ctx.translate(32, GY); ctx.rotate((r() - .5) * .25); poly(ctx, [[-2.5, 2], [2.5, 2], [2.5, -30], [-2.5, -30]], '#4a3a2a', OUT); poly(ctx, [[-9, -22], [9, -22], [9, -17], [-9, -17]], '#4a3a2a', OUT); ctx.restore(); ell(ctx, 32, GY + 2, 12, 5, 'rgba(30,22,16,.6)'); return c; }
  function objAltar(seed, withRelic) {
    const { c, ctx } = mk(64, OH); const base = '#5b5a62';
    isoBlock(ctx, 32, GY, 20, 10, 18, shade(base, 1.15), shade(base, .85), shade(base, .65), seed);
    // cloth
    poly(ctx, [[14, GY - 20], [32, GY - 11], [32, GY - 4], [14, GY - 13]], '#6e1f1f', OUT); poly(ctx, [[32, GY - 11], [50, GY - 20], [50, GY - 13], [32, GY - 4]], '#4d1515', OUT);
    if (withRelic) Art.drawReliquary(ctx, 32, GY - 24, 1);
    return c;
  }
  Art.drawReliquary = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = ctx.createRadialGradient(0, -6, 1, 0, -6, 22); g.addColorStop(0, 'rgba(255,225,140,.75)'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(-24, -30, 48, 40);
    isoBlock(ctx, 0, 0, 9, 4.5, 8, '#f3d78a', '#c99a3a', '#8a6420', 5);
    poly(ctx, [[-9, -8], [0, -12.5], [9, -8], [0, -16]], '#b8892e', OUT);
    ctx.fillStyle = '#fff2c0'; ctx.fillRect(-1, -22, 2, 8); ctx.fillRect(-3.5, -19.5, 7, 2);
    ctx.restore();
  };
  function relicGround() { const { c, ctx } = mk(64, OH); Art.drawReliquary(ctx, 32, GY - 4, 1); return c; }
  function relicIcon() { const { c, ctx } = mk(32, 40); Art.drawReliquary(ctx, 16, 30, 0.8); return c; }

  // ---------- units (64 x 96, feet at (32, 86)) ----------
  const U = {};
  function limb(ctx, x1, y1, x2, y2, w, col) { ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.lineWidth = w + 2.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function shadeBody(ctx, x, y, w, h) { const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,255,255,.08)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  function drawRifle(ctx, x, y, long, thick) { // pointing right-down slightly
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.15); const L = long ? 34 : 24, t = thick ? 5 : 3.5;
    poly(ctx, [[-10, -1], [-4, -2], [-4, 2], [-10, 4]], '#4a3320', OUT); // stock
    poly(ctx, [[-4, -t / 2], [L, -t / 2 + 1], [L, t / 2 - 1], [-4, t / 2]], '#2c2a2a', OUT);
    ctx.fillStyle = '#5a5654'; ctx.fillRect(4, -t / 2 - 1, 10, 1.5); if (thick) { poly(ctx, [[6, 2], [14, 2], [14, 9], [6, 9]], '#3a3a3a', OUT); }
    ctx.restore();
  }
  function drawPistol(ctx, x, y) { ctx.save(); ctx.translate(x, y); poly(ctx, [[-3, -2], [10, -2], [10, 1], [-3, 1]], '#2c2a2a', OUT); poly(ctx, [[-3, 1], [1, 1], [0, 7], [-4, 7]], '#4a3320', OUT); ctx.restore(); }
  function drawHead(ctx, x, y, kind, col) {
    // kind: 'helmNA','mask','hood','spike','heavy','priestHat','hpriest'
    if (kind === 'helmNA') { ell(ctx, x, y + 3, 6.5, 6.5, '#6b6a5f', OUT); poly(ctx, [[x - 9, y + 2], [x + 9, y + 2], [x + 7, y - 4], [x, y - 9], [x - 7, y - 4]], '#4f5044', OUT); ctx.strokeStyle = '#3a3a34'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 9, y + 2); ctx.lineTo(x + 9, y + 2); ctx.stroke(); ctx.fillStyle = '#d8b45a'; ctx.fillRect(x - 1, y - 7, 2, 6); ctx.fillRect(x - 3, y - 5, 6, 1.5); maskEyes(ctx, x, y + 4, '#2a2f24'); }
    else if (kind === 'mask') { ell(ctx, x, y + 2, 6.5, 7.5, '#2a2f24', OUT); poly(ctx, [[x - 8, y + 1], [x + 8, y + 1], [x + 6, y - 5], [x, y - 8], [x - 6, y - 5]], '#3d3d36', OUT); maskEyes(ctx, x, y + 3, '#15181a'); ell(ctx, x, y + 8, 3, 2.5, '#1a1a1a', OUT); }
    else if (kind === 'spike') { ell(ctx, x, y + 2, 6.5, 7, '#23201f', OUT); poly(ctx, [[x - 8, y + 1], [x + 8, y + 1], [x + 6, y - 5], [x, y - 8], [x - 6, y - 5]], '#3a2a2a', OUT); poly(ctx, [[x - 1.5, y - 8], [x + 1.5, y - 8], [x, y - 16]], '#6a6a6a', OUT); maskEyes(ctx, x, y + 3, '#c33'); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 3, y + 7); ctx.quadraticCurveTo(x + 9, y + 10, x + 8, y + 16); ctx.stroke(); }
    else if (kind === 'hood') { poly(ctx, [[x - 9, y + 8], [x + 9, y + 8], [x + 7, y - 6], [x, y - 12], [x - 7, y - 6]], col || '#3a1a1a', OUT); ell(ctx, x, y + 3, 5, 5.5, '#0d0a0a'); maskEyes(ctx, x, y + 2, '#e04a3a'); }
    else if (kind === 'heavy') { poly(ctx, [[x - 9, y + 8], [x + 9, y + 8], [x + 9, y - 6], [x, y - 11], [x - 9, y - 6]], '#4a3a3a', OUT); ctx.fillStyle = '#1a1414'; ctx.fillRect(x - 6, y - 1, 12, 3); ctx.fillStyle = '#e04a3a'; ctx.fillRect(x - 5, y, 3, 1.5); ctx.fillRect(x + 2, y, 3, 1.5); ctx.strokeStyle = '#777'; ctx.lineWidth = 1.5; [x - 7, x, x + 7].forEach(xx => { ctx.beginPath(); ctx.moveTo(xx, y - 6); ctx.lineTo(xx, y - 12); ctx.stroke(); }); }
    else if (kind === 'priestHat') { ell(ctx, x, y + 3, 6, 6.5, '#c8a888', OUT); ctx.fillStyle = '#6b5a4a'; ctx.fillRect(x - 6, y + 4, 12, 2); poly(ctx, [[x - 7, y - 2], [x + 7, y - 2], [x + 5, y - 20], [x, y - 24], [x - 5, y - 20]], '#e8dcc0', OUT); ctx.fillStyle = '#d8b45a'; ctx.fillRect(x - 1, y - 18, 2, 12); ctx.fillRect(x - 4, y - 14, 8, 2); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 3, y + 1, 2, 2); ctx.fillRect(x + 1, y + 1, 2, 2); }
    else if (kind === 'hpriest') { poly(ctx, [[x - 9, y + 8], [x + 9, y + 8], [x + 8, y - 8], [x, y - 22], [x - 8, y - 8]], '#5a1616', OUT); ell(ctx, x, y + 3, 5, 5.5, '#d8cfc0', OUT); ctx.fillStyle = '#1a0a0a'; ctx.fillRect(x - 4, y + 1, 3, 2); ctx.fillRect(x + 1, y + 1, 3, 2); ctx.fillRect(x - 1, y + 5, 2, 1); ctx.strokeStyle = '#e0463f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 8); ctx.stroke(); }
    else if (kind === 'captain') { ell(ctx, x, y + 3, 6.5, 6.5, '#c9a98a', OUT); poly(ctx, [[x - 9, y + 1], [x + 9, y + 1], [x + 8, y - 5], [x, y - 10], [x - 8, y - 5]], '#3f4438', OUT); ctx.fillStyle = '#d8b45a'; ctx.fillRect(x - 1, y - 9, 2, 8); ctx.fillRect(x - 4, y - 6, 8, 1.5); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 4, y + 2, 3, 2); ctx.fillRect(x + 1, y + 2, 3, 2); ctx.fillStyle = '#7a5a40'; ctx.fillRect(x - 4, y + 7, 8, 2); }
  }
  function maskEyes(ctx, x, y, col) { ell(ctx, x - 3, y, 2.4, 2.4, '#000'); ell(ctx, x + 3, y, 2.4, 2.4, '#000'); ell(ctx, x - 3, y, 1.6, 1.6, col); ell(ctx, x + 3, y, 1.6, 1.6, col); }
  function humanoid(ctx, p) {
    // p: coat, trim, legs, head, weapon, extras
    const cx = 32, fy = 86; // feet
    // legs
    limb(ctx, cx - 4, fy - 22, cx - 6, fy - 2, 5, p.legs); limb(ctx, cx + 4, fy - 22, cx + 7, fy - 2, 5, p.legs);
    poly(ctx, [[cx - 10, fy], [cx - 2, fy], [cx - 2, fy - 4], [cx - 9, fy - 4]], '#1e1712', OUT); poly(ctx, [[cx + 3, fy], [cx + 11, fy], [cx + 11, fy - 4], [cx + 4, fy - 4]], '#1e1712', OUT);
    if (p.cape) { poly(ctx, [[cx - 8, fy - 46], [cx - 16, fy - 10], [cx - 4, fy - 14], [cx + 2, fy - 44]], p.cape, OUT); }
    // coat body
    poly(ctx, [[cx - 9, fy - 46], [cx + 9, fy - 46], [cx + 12, fy - 20], [cx + 10, fy - 12], [cx - 10, fy - 12], [cx - 12, fy - 20]], p.coat, OUT);
    shadeBody(ctx, cx - 12, fy - 46, 24, 34);
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 1, fy - 44); ctx.lineTo(cx + 1, fy - 13); ctx.stroke();
    // belt
    poly(ctx, [[cx - 11, fy - 27], [cx + 11, fy - 27], [cx + 11, fy - 24], [cx - 11, fy - 24]], '#2a1e14', OUT); ctx.fillStyle = p.trim; ctx.fillRect(cx - 2, fy - 27.5, 4, 4);
    if (p.bandolier) { limb(ctx, cx - 9, fy - 44, cx + 10, fy - 26, 3, '#4a3a28'); }
    if (p.tank) { poly(ctx, [[cx - 20, fy - 46], [cx - 12, fy - 46], [cx - 12, fy - 22], [cx - 20, fy - 22]], '#6b3a2a', OUT); ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 16, fy - 22); ctx.quadraticCurveTo(cx - 16, fy - 10, cx + 4, fy - 30); ctx.stroke(); }
    // insignia
    if (p.sigil === 'cross') { ctx.fillStyle = p.trim; ctx.fillRect(cx - 5, fy - 42, 2, 8); ctx.fillRect(cx - 7, fy - 39, 6, 2); }
    if (p.sigil === 'heretic') { ctx.strokeStyle = '#e0463f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 4, fy - 42); ctx.lineTo(cx - 4, fy - 34); ctx.moveTo(cx - 7, fy - 36); ctx.lineTo(cx - 1, fy - 36); ctx.stroke(); }
    if (p.plates) { poly(ctx, [[cx - 12, fy - 46], [cx - 2, fy - 46], [cx - 3, fy - 30], [cx - 13, fy - 30]], '#4a3c3c', OUT); poly(ctx, [[cx + 1, fy - 46], [cx + 11, fy - 46], [cx + 13, fy - 30], [cx + 2, fy - 30]], '#4a3c3c', OUT); ctx.fillStyle = '#777'; [[cx - 8, fy - 42], [cx + 6, fy - 42], [cx - 8, fy - 34], [cx + 7, fy - 34]].forEach(q => ctx.fillRect(q[0], q[1], 2, 2)); }
    if (p.bare) { poly(ctx, [[cx - 9, fy - 46], [cx + 9, fy - 46], [cx + 12, fy - 26], [cx - 12, fy - 26]], '#a88a70', OUT); ctx.strokeStyle = '#7a1a1a'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 8 + i * 4, fy - 44 + i * 2); ctx.lineTo(cx - 4 + i * 4, fy - 30 + i); ctx.stroke(); } }
    // shoulders / collar
    poly(ctx, [[cx - 12, fy - 47], [cx - 4, fy - 51], [cx + 4, fy - 51], [cx + 12, fy - 47], [cx + 9, fy - 44], [cx - 9, fy - 44]], shade(p.coat, .8), OUT);
    // back arm
    limb(ctx, cx - 8, fy - 43, cx - 6, fy - 28, 5, shade(p.coat, .75));
    // weapon + front arm
    if (p.weapon === 'rifle' || p.weapon === 'carbine') { limb(ctx, cx + 8, fy - 43, cx + 14, fy - 32, 5, p.coat); drawRifle(ctx, cx + 4, fy - 33, p.weapon === 'rifle', false); limb(ctx, cx - 6, fy - 30, cx + 8, fy - 36, 4, shade(p.coat, .85)); }
    else if (p.weapon === 'hmg') { limb(ctx, cx + 8, fy - 43, cx + 13, fy - 31, 6, p.coat); drawRifle(ctx, cx + 2, fy - 31, true, true); limb(ctx, cx - 6, fy - 29, cx + 10, fy - 34, 5, shade(p.coat, .85)); }
    else if (p.weapon === 'pistol') { limb(ctx, cx + 8, fy - 43, cx + 16, fy - 36, 5, p.coat); drawPistol(ctx, cx + 15, fy - 39); }
    else if (p.weapon === 'sword') { limb(ctx, cx + 8, fy - 43, cx + 15, fy - 33, 5, p.coat); ctx.save(); ctx.translate(cx + 16, fy - 33); ctx.rotate(-0.9); poly(ctx, [[-1.5, 0], [1.5, 0], [1.5, -30], [0, -34], [-1.5, -30]], '#d9dde0', OUT); poly(ctx, [[-6, 0], [6, 0], [6, 2], [-6, 2]], '#d8b45a', OUT); poly(ctx, [[-1.5, 2], [1.5, 2], [1.5, 9], [-1.5, 9]], '#3a2a1a', OUT); ctx.restore(); }
    else if (p.weapon === 'whip') { limb(ctx, cx + 8, fy - 43, cx + 16, fy - 34, 5, p.bare ? '#a88a70' : p.coat); ctx.strokeStyle = OUT; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx + 16, fy - 34); ctx.bezierCurveTo(cx + 30, fy - 20, cx + 12, fy - 8, cx + 26, fy + 2); ctx.stroke(); ctx.strokeStyle = '#6a4a30'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const t = i / 6; const x = cx + 16 + Math.sin(t * 6) * 6 + t * 10, y = fy - 34 + t * 36; ctx.beginPath(); ctx.moveTo(x - 1.5, y - 1.5); ctx.lineTo(x + 1.5, y + 1.5); ctx.stroke(); } }
    else if (p.weapon === 'staff') { limb(ctx, cx + 8, fy - 43, cx + 14, fy - 30, 5, p.coat); limb(ctx, cx + 15, fy - 2, cx + 15, fy - 60, 3, '#3a2a1a'); ell(ctx, cx + 15, fy - 63, 4, 4.5, '#d8cfc0', OUT); ctx.fillStyle = '#000'; ctx.fillRect(cx + 12.5, fy - 64, 2, 2); ctx.fillRect(cx + 15.5, fy - 64, 2, 2); }
    else if (p.weapon === 'flamethrower') { limb(ctx, cx + 8, fy - 43, cx + 14, fy - 33, 5, p.coat); poly(ctx, [[cx + 2, fy - 36], [cx + 30, fy - 34], [cx + 30, fy - 29], [cx + 2, fy - 31]], '#4a4a48', OUT); poly(ctx, [[cx + 26, fy - 37], [cx + 32, fy - 37], [cx + 32, fy - 26], [cx + 26, fy - 26]], '#6b3a2a', OUT); limb(ctx, cx - 6, fy - 30, cx + 8, fy - 34, 4, shade(p.coat, .85)); }
    else if (p.weapon === 'mace') { limb(ctx, cx + 8, fy - 43, cx + 15, fy - 33, 5, p.coat); limb(ctx, cx + 15, fy - 33, cx + 22, fy - 54, 3, '#3a2a1a'); ell(ctx, cx + 23, fy - 57, 5, 5, '#8a8a8a', OUT); ctx.fillStyle = '#d8b45a'; ctx.fillRect(cx + 22, fy - 60, 2, 6); ctx.fillRect(cx + 20, fy - 58, 6, 2); }
    // head
    drawHead(ctx, cx, fy - 58, p.head, p.hood);
    if (p.book) { poly(ctx, [[cx - 14, fy - 32], [cx - 4, fy - 34], [cx - 4, fy - 26], [cx - 14, fy - 24]], '#5a2a1a', OUT); ctx.fillStyle = '#d8b45a'; ctx.fillRect(cx - 10, fy - 31, 2, 5); }
  }
  function wolf(ctx) {
    const cx = 32, fy = 84;
    // legs back
    limb(ctx, cx - 12, fy - 14, cx - 16, fy - 1, 4, '#2a2220'); limb(ctx, cx + 6, fy - 14, cx + 4, fy - 1, 4, '#2a2220');
    // body
    ell(ctx, cx - 2, fy - 18, 18, 9, '#3a2f2c', OUT); shadeBody(ctx, cx - 20, fy - 27, 36, 18);
    // spikes / bone plates on the spine
    ctx.fillStyle = '#8a8078'; for (let i = 0; i < 5; i++) { const x = cx - 14 + i * 6; poly(ctx, [[x, fy - 26], [x + 3, fy - 33 + (i % 2) * 2], [x + 6, fy - 26]], '#8a8078', OUT); }
    // tail
    ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 19, fy - 20); ctx.quadraticCurveTo(cx - 30, fy - 30, cx - 26, fy - 38); ctx.stroke(); ctx.strokeStyle = '#3a2f2c'; ctx.lineWidth = 3; ctx.stroke();
    // legs front
    limb(ctx, cx - 8, fy - 14, cx - 9, fy - 1, 4.5, '#3a2f2c'); limb(ctx, cx + 12, fy - 14, cx + 14, fy - 1, 4.5, '#3a2f2c');
    // neck + head
    poly(ctx, [[cx + 10, fy - 26], [cx + 22, fy - 34], [cx + 26, fy - 26], [cx + 16, fy - 16]], '#3a2f2c', OUT);
    poly(ctx, [[cx + 18, fy - 36], [cx + 34, fy - 30], [cx + 36, fy - 24], [cx + 24, fy - 22], [cx + 16, fy - 28]], '#4a3a36', OUT);
    poly(ctx, [[cx + 20, fy - 37], [cx + 23, fy - 44], [cx + 26, fy - 36]], '#4a3a36', OUT);
    ell(ctx, cx + 27, fy - 31, 2, 2, '#e0463f'); ctx.fillStyle = '#eee'; for (let i = 0; i < 4; i++) ctx.fillRect(cx + 26 + i * 2.5, fy - 25, 1.5, 3);
    // muzzle strap
    ctx.strokeStyle = '#7a1a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx + 28, fy - 30); ctx.lineTo(cx + 33, fy - 24); ctx.stroke();
  }
  const UNIT_PARAMS = {
    captain:     { coat: '#5a5f4a', trim: '#d8b45a', legs: '#3d4033', head: 'captain', weapon: 'sword', cape: '#7a1f1f', sigil: 'cross' },
    priest:      { coat: '#e2d6bd', trim: '#d8b45a', legs: '#4a4238', head: 'priestHat', weapon: 'mace', book: true, sigil: 'cross' },
    yeoman:      { coat: '#5c614c', trim: '#d8b45a', legs: '#3d4033', head: 'helmNA', weapon: 'rifle', sigil: 'cross' },
    grenadier:   { coat: '#4f5443', trim: '#d8b45a', legs: '#3d4033', head: 'mask', weapon: 'carbine', bandolier: true, sigil: 'cross' },
    flamer:      { coat: '#4a4a44', trim: '#d8b45a', legs: '#3d4033', head: 'mask', weapon: 'flamethrower', tank: true, sigil: 'cross' },
    hpriest:     { coat: '#3a1414', trim: '#e0463f', legs: '#241010', head: 'hpriest', weapon: 'staff', sigil: 'heretic' },
    executioner: { coat: '#2a1a1a', trim: '#e0463f', legs: '#241010', head: 'hood', hood: '#1a0d0d', weapon: 'whip', bare: true },
    legionnaire: { coat: '#3a2a2a', trim: '#e0463f', legs: '#241a1a', head: 'spike', weapon: 'rifle', sigil: 'heretic' },
    heavy:       { coat: '#3a2f2f', trim: '#e0463f', legs: '#241a1a', head: 'heavy', weapon: 'hmg', plates: true, sigil: 'heretic' },
  };
  Art.unitCanvas = function (type) {
    if (U[type]) return U[type]; const { c, ctx } = mk(64, 96);
    if (type === 'wolf') wolf(ctx); else humanoid(ctx, UNIT_PARAMS[type]);
    U[type] = c; return c;
  };

  // ---------- fx ----------
  function softCircle(size, inner, outer) { const { c, ctx } = mk(size, size); const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); g.addColorStop(0, inner); g.addColorStop(1, outer); ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); return c; }
  function smokeBlob() { const { c, ctx } = mk(64, 64); const r = rng(9); for (let i = 0; i < 6; i++) { const g = ctx.createRadialGradient(20 + r() * 24, 20 + r() * 24, 0, 32, 32, 26); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); } return c; }
  function bloodSplat(seed) { const { c, ctx } = mk(48, 32); const r = rng(seed); ctx.save(); for (let i = 0; i < 9; i++) { ell(ctx, 24 + (r() - .5) * 30, 16 + (r() - .5) * 14, 2 + r() * 7, 1 + r() * 3.5, 'rgba(110,12,12,' + (0.5 + r() * .4) + ')'); } ctx.restore(); return c; }
  function scorch() { const { c, ctx } = mk(64, 32); const g = ctx.createRadialGradient(32, 16, 2, 32, 16, 28); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(.6, 'rgba(10,5,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.scale(1, .5); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return c; }
  function fogTex() { const { c, ctx } = mk(256, 256); const r = rng(77); for (let i = 0; i < 60; i++) { const g = ctx.createRadialGradient(r() * 256, r() * 256, 0, 128, 128, 60 + r() * 100); const x = r() * 256, y = r() * 256, rad = 40 + r() * 70; const gg = ctx.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, 'rgba(200,190,170,.08)'); gg.addColorStop(1, 'rgba(200,190,170,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, 256, 256); } return c; }
  function noiseTex() { const { c, ctx } = mk(128, 128); const r = rng(5); const img = ctx.createImageData(128, 128); for (let i = 0; i < img.data.length; i += 4) { const v = 200 + r() * 55; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 18; } ctx.putImageData(img, 0, 0); return c; }

  Art.build = function (scene) {
    const add = (k, c) => { if (!scene.textures.exists(k)) scene.textures.addCanvas(k, c); };
    for (let i = 0; i < 10; i++) add('mud' + i, tileMud(100 + i));
    for (let i = 0; i < 3; i++) add('rubble' + i, tileRubble(200 + i));
    for (let i = 0; i < 3; i++) add('flag' + i, tileFlag(300 + i));
    add('water', tileWater(400)); add('wire', tileWire(500)); add('extract', tileExtract(600));
    for (let i = 0; i < 3; i++) add('trench' + i, tileTrench(700 + i, false)); add('trenchD', tileTrench(710, true));
    add('trenchL', trenchSide('l')); add('trenchR', trenchSide('r'));
    add('wall', objWall(800, true, false)); add('wall2', objWall(801, true, false)); add('glass', objWall(802, true, true)); add('lowwall', objWall(803, false, false)); add('lowwall2', objWall(804, false, false));
    add('sandbag', objSandbag(900)); add('crate', objCrate(901)); add('barrel', objBarrel(902)); add('tree', objTree(903)); add('tree2', objTree(904));
    add('shrine_lit', objShrine(905, true)); add('shrine_out', objShrine(905, false)); add('post', objPost(906)); add('grave', objGrave(907)); add('altar', objAltar(908, true)); add('altar_empty', objAltar(908, false));
    add('relic_ground', relicGround()); add('relic_icon', relicIcon());
    Object.keys(UNIT_PARAMS).concat(['wolf']).forEach(t => add('unit_' + t, Art.unitCanvas(t)));
    add('particle', softCircle(16, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)')); add('glow', softCircle(128, 'rgba(255,255,255,.9)', 'rgba(255,255,255,0)')); add('smoke', smokeBlob());
    add('spark', softCircle(8, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
    for (let i = 0; i < 3; i++) add('blood' + i, bloodSplat(1000 + i)); add('scorch', scorch()); add('fog', fogTex()); add('noise', noiseTex());
  };
  Art.groundKey = function (cell, seedX, seedY) {
    const t = cell.terr.id, n = (seedX * 7 + seedY * 13) % 6, n10 = (seedX * 11 + seedY * 17 + (seedX * seedY)) % 10;
    switch (t) { case 'mud': return 'mud' + n10; case 'rubble': return 'rubble' + (n % 3); case 'flag': return 'flag' + (n % 3); case 'water': return 'water'; case 'wire': return 'wire'; case 'extract': return 'extract'; case 'trench': return cell.terr.duck ? 'trenchD' : 'trench' + (n % 3); default: return 'mud' + n; }
  };
  Art.objectKey = function (cell, seedX, seedY) {
    const t = cell.terr.id, n = (seedX * 3 + seedY * 5) % 2;
    switch (t) { case 'wall': return n ? 'wall' : 'wall2'; case 'glass': return 'glass'; case 'lowwall': return n ? 'lowwall' : 'lowwall2'; case 'sandbag': return 'sandbag'; case 'crate': return 'crate'; case 'barrel': return 'barrel'; case 'tree': return n ? 'tree' : 'tree2'; case 'shrine': return cell.prayed ? 'shrine_out' : 'shrine_lit'; case 'post': return 'post'; case 'grave': return 'grave'; case 'altar': return 'altar'; default: return null; }
  };
})();
