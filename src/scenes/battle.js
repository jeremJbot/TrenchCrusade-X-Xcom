/* Trench Crusade × XCOM — Battle scene */
window.TC = window.TC || {};
TC.sceneFactories = TC.sceneFactories || [];
TC.sceneFactories.push(function () {
(function () {
  const A = TC.Art, R = TC.Rules, HUD = TC.HUD, AB = TC.ABILITIES;
  const T = (k, p) => TC.T(k, p);
  const COL = { blue: 0x4f8fe8, yellow: 0xe8c14f, red: 0xe0463f, gold: 0xd8b45a, white: 0xffffff, green: 0x8fd07a, purple: 0xc56bff, orange: 0xff8a2a, holy: 0x9ec5ff };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  TC.BattleScene = class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }
    init(data) { this.seed = (data && data.seed) || 1; }

    // ---------- setup ----------
    create() {
      this.st = R.newState(this.seed); this.busy = false; this.selected = null; this.mode = 'idle'; this.pending = null; this.hoverTile = null;
      this.ox = this.st.grid.h * A.HW + 64; this.oy = 120;
      this.cameras.main.setBackgroundColor('#0b0907');
      this.buildBackdrop(); this.buildMap(); this.buildUnits(); this.buildLayers(); this.buildAtmosphere(); this.setupCamera(); this.setupInput();
      HUD.init(this); HUD.refreshTop(this.st);
      this.scale.on('resize', () => this.onResize());
      this.events.once('shutdown', () => { HUD.show(false); HUD.closeModal(); });
      this.time.delayedCall(100, () => this.startPlayerTurn(true));
      this.time.delayedCall(2200, () => HUD.log(T('tutorial')));
    }
    tileToWorld(x, y) { const c = R.cell(this.st, x, y); return { x: this.ox + (x - y) * A.HW, y: this.oy + (x + y) * A.HH + (c && c.terr.trench ? A.TRENCH_DEPTH : 0) }; }
    worldToTile(wx, wy) { const fx = (wx - this.ox) / A.HW, fy = (wy - this.oy) / A.HH; return { x: Math.floor((fx + fy) / 2 + 0.5), y: Math.floor((fy - fx) / 2 + 0.5) }; }
    diamondPts(x, y, inset) { const w = this.tileToWorld(x, y); const hw = A.HW - (inset || 0), hh = A.HH - (inset || 0) / 2; return [{ x: w.x, y: w.y - hh }, { x: w.x + hw, y: w.y }, { x: w.x, y: w.y + hh }, { x: w.x - hw, y: w.y }]; }

    buildBackdrop() {
      const g = this.add.graphics().setDepth(-10); const W = this.st.grid.w, H = this.st.grid.h;
      const c = [this.tileToWorld(0, 0), this.tileToWorld(W - 1, 0), this.tileToWorld(W - 1, H - 1), this.tileToWorld(0, H - 1)];
      g.fillStyle(0x161109, 1); g.fillPoints([{ x: c[0].x, y: c[0].y - 60 }, { x: c[1].x + 110, y: c[1].y }, { x: c[2].x, y: c[2].y + 70 }, { x: c[3].x - 110, y: c[3].y }], true);
      g.fillStyle(0x100c09, 1); g.fillPoints([{ x: c[0].x, y: c[0].y - 150 }, { x: c[1].x + 260, y: c[1].y - 20 }, { x: c[2].x, y: c[2].y + 160 }, { x: c[3].x - 260, y: c[3].y - 20 }], true).setDepth(-11);
      // distant crosses / stakes on the horizon
      const r = () => this.st.rng();
      for (let i = 0; i < 26; i++) { const t = i / 26; const x = c[3].x - 120 + (c[1].x + 120 - c[3].x + 120) * t; const y = c[0].y - 30 + Math.abs(t - 0.5) * 2 * 240 - 40 + r() * 30; const h = 8 + r() * 16; const s = this.add.graphics().setDepth(-9); s.fillStyle(0x0d0a08, 1); s.fillRect(x - 1, y - h, 2, h); if (r() < 0.6) s.fillRect(x - 4, y - h + 4, 8, 2); }
    }
    buildMap() {
      const st = this.st; this.groundViews = {}; this.objViews = {}; this.glowViews = {};
      for (let y = 0; y < st.grid.h; y++) for (let x = 0; x < st.grid.w; x++) {
        const c = st.grid.cells[y][x]; const w = this.tileToWorld(x, y); const k = x + ',' + y;
        const img = this.add.image(w.x, w.y, A.groundKey(c, x, y)).setDepth((x + y) * 0.01); this.groundViews[k] = img;
        const hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0; const edge = Math.max(0, (Math.hypot(x - st.grid.w / 2 + 0.5, y - st.grid.h / 2 + 0.5) - 6) / 6); const gv = Math.round(Math.max(120, 235 - (hsh % 40) - edge * 70)); img.setTint((gv << 16) | (gv << 8) | gv);
        if (c.terr.trench) { const base = this.oy + (x + y) * A.HH; const nl = R.cell(st, x - 1, y), nr = R.cell(st, x, y - 1); if (!(nl && nl.terr.trench)) this.add.image(w.x, base, 'trenchL').setOrigin(0.5, 16 / (32 + A.TRENCH_DEPTH)).setDepth((x + y) * 0.01 + 0.002); if (!(nr && nr.terr.trench)) this.add.image(w.x, base, 'trenchR').setOrigin(0.5, 16 / (32 + A.TRENCH_DEPTH)).setDepth((x + y) * 0.01 + 0.002); }
        this.buildObject(c);
      }
      // relic on ground view
      this.relicGround = this.add.image(0, 0, 'relic_ground').setOrigin(0.5, 1).setVisible(false).setDepth(0);
    }
    buildObject(c) {
      const k = c.x + ',' + c.y; if (this.objViews[k]) { if (this.objViews[k].ao) this.objViews[k].ao.destroy(); this.objViews[k].destroy(); delete this.objViews[k]; } if (this.glowViews[k]) { this.glowViews[k].destroy(); delete this.glowViews[k]; }
      const key = A.objectKey(c, c.x, c.y); if (!key) return; const w = this.tileToWorld(c.x, c.y);
      const img = this.add.image(w.x, w.y + 16, key).setOrigin(0.5, 1).setDepth(c.x + c.y + 1); this.objViews[k] = img;
      if (c.terr.cover) { const ao = this.add.ellipse(w.x, w.y + 3, c.terr.cover === 2 ? 60 : 44, c.terr.cover === 2 ? 26 : 18, 0x000000, 0.35).setDepth(c.x + c.y + 0.3); img.ao = ao; }
      if ((c.terr.shrine && !c.prayed) || c.terr.id === 'post' || (c.terr.altar && this.st.relic.state === 'altar')) {
        const gl = this.add.image(w.x, w.y - (c.terr.altar ? 26 : 22), 'glow').setTint(c.terr.altar ? 0xffd070 : 0xff9a3a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setScale(c.terr.altar ? 0.9 : 0.6).setDepth(c.x + c.y + 1.1); this.glowViews[k] = gl;
        this.tweens.add({ targets: gl, alpha: { from: 0.22, to: 0.42 }, scale: { from: gl.scale * 0.9, to: gl.scale * 1.1 }, duration: 700 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    buildUnits() { this.st.units.forEach(u => this.makeUnitView(u)); this.refreshVisibility(); }
    makeUnitView(u) {
      const w = this.tileToWorld(u.x, u.y); const c = this.add.container(w.x, w.y);
      const shadow = this.add.ellipse(0, 2, 36, 14, 0x000000, 0.45);
      const spr = this.add.image(0, 8, 'unit_' + u.type).setOrigin(0.5, 1); spr.setFlipX(u.facing === -1);
      const ring = this.add.graphics(); ring.lineStyle(2, u.faction === 'na' ? COL.gold : COL.red, 0.9); ring.strokeEllipse(0, 2, 30, 12); ring.setAlpha(0.55);
      const hp = this.add.graphics(); const status = this.add.text(0, -84, '', { fontSize: '11px', fontFamily: 'sans-serif' }).setOrigin(0.5, 1);
      const relic = this.add.image(-14, -74, 'relic_icon').setOrigin(0.5, 1).setVisible(false).setScale(0.8);
      const relicGlow = this.add.image(-14, -84, 'glow').setTint(0xffd070).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(0.35).setVisible(false);
      const fire = this.add.particles(0, -20, 'particle', { speedY: { min: -40, max: -80 }, speedX: { min: -10, max: 10 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: 500, tint: [0xffd040, 0xff7a20, 0xff3a10], frequency: 60, blendMode: 'ADD', x: { min: -8, max: 8 }, emitting: false });
      c.add([shadow, ring, spr, relicGlow, relic, fire, hp, status]); c.setDepth(u.x + u.y + 1.5);
      u.view = { c, spr, shadow, ring, hp, status, relic, relicGlow, fire }; this.refreshUnitView(u);
    }
    refreshUnitView(u) {
      const v = u.view; if (!v) return; const g = v.hp; g.clear();
      const segs = u.maxHp; const totalW = Math.min(36, segs * 3.6); const segW = totalW / segs; const x0 = -totalW / 2, y0 = -68;
      g.fillStyle(0x000000, 0.75); g.fillRect(x0 - 1, y0 - 1, totalW + 2, 5);
      for (let i = 0; i < segs; i++) { const alive = i < u.hp; const col = u.faction === 'na' ? (u.hp <= u.maxHp * 0.4 ? 0xe0463f : 0x7fbf6a) : 0xd03a34; g.fillStyle(alive ? col : 0x2a2a2a, 1); g.fillRect(x0 + i * segW + 0.5, y0, segW - 1, 3); }
      let s = ''; if (u.statuses.burning) s += '🔥'; if (u.statuses.bleeding) s += '🩸'; if (u.statuses.blessed) s += '✨'; if (u.statuses.cursed) s += '☠'; if (u.statuses.mutated) s += '🧬'; if (u.statuses.suppressed) s += '💥'; if (u.hunkered) s += '🛡'; if (u.overwatch) s += '👁';
      v.status.setText(s); v.relic.setVisible(u.hasRelic); v.relicGlow.setVisible(u.hasRelic);
      if (u.statuses.burning && u.alive) { v.fire.start(); } else v.fire.stop();
      v.spr.setFlipX(u.facing === -1);
      if (!u.alive) { v.hp.setVisible(false); v.status.setVisible(false); v.ring.setVisible(false); }
    }
    refreshVisibility() {
      const st = this.st; for (const u of st.units) { if (!u.view) continue; if (!u.alive) continue; const vis = u.faction === 'na' || R.visibleTo(st, 'na', u); u.visible = vis; u.view.c.setVisible(vis); }
      for (const k in this.objViews) this.objViews[k].setAlpha(1);
      for (const u of st.units) { if (!u.alive || !u.visible) continue; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) { const c = R.cell(st, u.x + dx, u.y + dy); if (!c || c.terr.cover !== 2) continue; const o = this.objViews[c.x + ',' + c.y]; if (o) o.setAlpha(0.4); } }
      this.relicGround.setVisible(st.relic.state === 'ground'); if (st.relic.state === 'ground') { const w = this.tileToWorld(st.relic.x, st.relic.y); this.relicGround.setPosition(w.x, w.y + 16).setDepth(st.relic.x + st.relic.y + 1.2); }
      const altar = st.grid.cells[st.relic.y] && R.cell(st, 7, 7); for (let y = 0; y < st.grid.h; y++) for (let x = 0; x < st.grid.w; x++) { const c = st.grid.cells[y][x]; if (c.terr.altar) { const k = x + ',' + y; const want = st.relic.state === 'altar' ? 'altar' : 'altar_empty'; if (this.objViews[k] && this.objViews[k].texture.key !== want) { this.objViews[k].setTexture(want); if (this.glowViews[k]) { this.glowViews[k].destroy(); delete this.glowViews[k]; } } } }
    }
    buildLayers() {
      this.hl = this.add.graphics().setDepth(0.5); this.pathG = this.add.graphics().setDepth(0.6); this.selG = this.add.graphics().setDepth(0.55);
      this.labels = []; this.coverIcons = [];
      this.decals = this.add.group();
      this.fxBlood = this.add.particles(0, 0, 'particle', { speed: { min: 40, max: 160 }, angle: { min: 200, max: 340 }, scale: { start: 0.5, end: 0.1 }, alpha: { start: 1, end: 0.2 }, lifespan: { min: 250, max: 500 }, gravityY: 400, tint: [0x8a1010, 0xc01818, 0x5a0808], emitting: false }).setDepth(900);
      this.fxSpark = this.add.particles(0, 0, 'spark', { speed: { min: 60, max: 220 }, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: { min: 150, max: 350 }, tint: [0xffe9a0, 0xffb040, 0xffffff], blendMode: 'ADD', emitting: false }).setDepth(900);
      this.fxDust = this.add.particles(0, 0, 'smoke', { speed: { min: 10, max: 50 }, angle: { min: 220, max: 320 }, scale: { start: 0.3, end: 0.8 }, alpha: { start: 0.5, end: 0 }, lifespan: { min: 400, max: 800 }, tint: [0x6b5a48, 0x8a7a66], emitting: false }).setDepth(890);
      this.fxFire = this.add.particles(0, 0, 'particle', { speed: { min: 20, max: 90 }, angle: { min: 230, max: 310 }, scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: { min: 300, max: 700 }, tint: [0xffe060, 0xff8a20, 0xff3a10, 0xffffff], blendMode: 'ADD', emitting: false }).setDepth(905);
      this.fxSmoke = this.add.particles(0, 0, 'smoke', { speed: { min: 10, max: 40 }, angle: { min: 240, max: 300 }, scale: { start: 0.5, end: 1.6 }, alpha: { start: 0.55, end: 0 }, lifespan: { min: 900, max: 1800 }, tint: [0x222222, 0x444444], emitting: false }).setDepth(895);
      this.fxHoly = this.add.particles(0, 0, 'particle', { speedY: { min: -60, max: -160 }, speedX: { min: -20, max: 20 }, scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: { min: 500, max: 1000 }, tint: [0xffffff, 0x9ec5ff, 0xfff0c0], blendMode: 'ADD', emitting: false }).setDepth(905);
      this.fxDark = this.add.particles(0, 0, 'particle', { speedY: { min: -30, max: -90 }, speedX: { min: -25, max: 25 }, scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: { min: 500, max: 1000 }, tint: [0xc56bff, 0x7a1a1a, 0x330a0a], blendMode: 'ADD', emitting: false }).setDepth(905);
      this.fxDebris = this.add.particles(0, 0, 'spark', { speed: { min: 80, max: 260 }, angle: { min: 200, max: 340 }, scale: { start: 0.7, end: 0.2 }, alpha: { start: 1, end: 0 }, lifespan: { min: 300, max: 700 }, gravityY: 500, tint: [0x6b5f52, 0x3a3128, 0x8a8072], emitting: false }).setDepth(900);
    }
    buildAtmosphere() {
      const b = this.mapBounds(); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, bw = b.x1 - b.x0 + 800, bh = b.y1 - b.y0 + 800;
      this.fog1 = this.add.tileSprite(cx, cy, bw, bh, 'fog').setAlpha(0.3).setDepth(700).setTileScale(2, 2); this.fog2 = this.add.tileSprite(cx, cy, bw, bh, 'fog').setAlpha(0.22).setDepth(701).setTileScale(3.2, 3.2);
      this.add.particles(0, 0, 'particle', { x: { min: b.x0 - 200, max: b.x1 + 200 }, y: { min: b.y0 - 200, max: b.y1 + 200 }, lifespan: 5000, speedY: { min: -8, max: -20 }, speedX: { min: -12, max: 12 }, scale: { start: 0.18, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: [0xc8b898, 0xffa040, 0x999999], frequency: 90, blendMode: 'ADD' }).setDepth(710);
      const nz = this.add.tileSprite(cx, cy, bw, bh, 'noise').setAlpha(0.14).setDepth(702); this.noise = nz;
    }
    mapBounds() { const W = this.st.grid.w, H = this.st.grid.h; const a = this.tileToWorld(0, 0), b = this.tileToWorld(W - 1, 0), c = this.tileToWorld(W - 1, H - 1), d = this.tileToWorld(0, H - 1); return { x0: d.x - A.HW, x1: b.x + A.HW, y0: a.y - 80, y1: c.y + 40 }; }

    // ---------- camera ----------
    setupCamera() {
      const cam = this.cameras.main; const b = this.mapBounds(); cam.setBounds(b.x0 - 400, b.y0 - 500, b.x1 - b.x0 + 800, b.y1 - b.y0 + 1000);
      this.minZoom = Math.max(0.35, Math.min(this.scale.width / (b.x1 - b.x0 + 60), 0.9)); this.maxZoom = 2.2;
      cam.setZoom(Math.min(1.3, Math.max(this.minZoom, this.scale.width / 400)));
      const na = R.alive(this.st, 'na'); const w = this.tileToWorld(na[0].x, na[0].y); cam.centerOn(w.x, w.y - 40); this.centerOffsetFix(true);
      this.time.delayedCall(300, () => { cam.pan(w.x, w.y + this.visOffset() - 20, 900, 'Sine.easeInOut'); });
    }
    visOffset() { // world-space vertical shift so the focus point lands in the visible band between top bar and bottom panel
      const top = document.getElementById('topbar'), bot = document.getElementById('bottom'); const th = top ? top.offsetHeight : 40, bh = Math.max(bot ? bot.offsetHeight : 0, 300); return ((bh - th) / 2) / this.cameras.main.zoom;
    }
    centerOffsetFix() { }
    focusUnit(u, instant) { const w = this.tileToWorld(u.x, u.y); const cam = this.cameras.main; if (instant) cam.centerOn(w.x, w.y + this.visOffset() - 20); else cam.pan(w.x, w.y + this.visOffset() - 20, 450, 'Sine.easeInOut'); }
    focusPoint(x, y, dur) { const cam = this.cameras.main; cam.pan(x, y + this.visOffset() - 10, dur || 400, 'Sine.easeInOut'); }
    onResize() { const b = this.mapBounds(); this.minZoom = Math.max(0.35, Math.min(this.scale.width / (b.x1 - b.x0 + 60), 0.9)); }
    overview() { const b = this.mapBounds(); const cam = this.cameras.main; const z = Math.min(this.maxZoom, this.minZoom * 1.25); cam.zoomTo(z, 500); cam.pan((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2 + this.visOffset() * (cam.zoom / z) * 0.6, 500); }

    setupInput() {
      const inp = this.input; this.drag = { active: false, moved: false, sx: 0, sy: 0, cx: 0, cy: 0, pinch: null };
      inp.on('pointerdown', (p) => {
        TC.Audio.init(); const p1 = inp.pointer1, p2 = inp.pointer2;
        if (p1.isDown && p2.isDown) { this.drag.pinch = { d: Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y), z: this.cameras.main.zoom }; this.drag.active = false; this.drag.moved = true; return; }
        this.drag.active = true; this.drag.moved = false; this.drag.sx = p.x; this.drag.sy = p.y; this.drag.cx = this.cameras.main.scrollX; this.drag.cy = this.cameras.main.scrollY;
      });
      inp.on('pointermove', (p) => {
        const p1 = inp.pointer1, p2 = inp.pointer2; const cam = this.cameras.main;
        if (p1.isDown && p2.isDown) { const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y); if (!this.drag.pinch) this.drag.pinch = { d, z: cam.zoom }; const z = Phaser.Math.Clamp(this.drag.pinch.z * (d / this.drag.pinch.d), this.minZoom, this.maxZoom); cam.setZoom(z); this.drag.moved = true; return; }
        if (!this.drag.active || !p.isDown) return; const dx = p.x - this.drag.sx, dy = p.y - this.drag.sy;
        if (!this.drag.moved && Math.hypot(dx, dy) > 10) this.drag.moved = true;
        if (this.drag.moved) { cam.scrollX = this.drag.cx - dx / cam.zoom; cam.scrollY = this.drag.cy - dy / cam.zoom; }
      });
      inp.on('pointerup', (p) => {
        const wasPinch = !!this.drag.pinch; if (!inp.pointer1.isDown && !inp.pointer2.isDown) this.drag.pinch = null;
        if (wasPinch) { this.drag.active = false; return; }
        if (this.drag.active && !this.drag.moved) this.onTap(p); this.drag.active = false;
      });
      inp.on('wheel', (p, go, dx, dy) => { const cam = this.cameras.main; cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), this.minZoom, this.maxZoom)); });
    }

    // ---------- selection & tap handling ----------
    unitAtScreen(p) {
      const wp = this.cameras.main.getWorldPoint(p.x, p.y); let best = null, bd = -1;
      for (const u of this.st.units) { if (!u.alive || !u.visible) continue; const w = this.tileToWorld(u.x, u.y); if (Math.abs(wp.x - w.x) <= 22 && wp.y >= w.y - 74 && wp.y <= w.y + 14) { const d = u.x + u.y; if (d > bd) { bd = d; best = u; } } }
      return best;
    }
    onTap(p) {
      if (this.busy || this.st.over) return; const st = this.st; if (st.phase !== 'na') return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y); const tu = this.unitAtScreen(p); const t = this.worldToTile(wp.x, wp.y); const cell = R.cell(st, t.x, t.y);
      const sel = this.selected;
      // targeting modes
      if (this.mode !== 'idle' && sel) {
        const ab = AB[this.mode];
        if (ab.target === 'enemy') { if (tu && tu.faction === 'h') { this.previewAttack(sel, tu, this.mode); return; } }
        else if (ab.target === 'ally') { if (tu && tu.faction === 'na') { this.previewSupport(sel, tu, this.mode); return; } }
        else if (ab.target === 'tile' || ab.target === 'cone') { if (cell) { this.previewArea(sel, t.x, t.y, this.mode); return; } }
        this.cancelMode(); return;
      }
      if (tu) {
        if (tu.faction === 'na') { this.selectUnit(tu); return; }
        if (sel && sel.ap > 0) { this.previewAttack(sel, tu, 'auto'); return; }
        HUD.unitCard(tu, st); HUD.actions(null); this.clearPreview(); this.selectedEnemy = tu; return;
      }
      if (!sel || !cell) { this.clearPreview(); return; }
      // move preview / confirm
      if (this.pending && this.pending.kind === 'move' && this.pending.x === t.x && this.pending.y === t.y) { this.confirmPreview(); return; }
      if (sel.ap > 0 && this.reach && this.reach.has(t.x + ',' + t.y) && !this.reach.get(t.x + ',' + t.y).blocked && !(t.x === sel.x && t.y === sel.y)) { this.previewMove(sel, t.x, t.y); return; }
      this.clearPreview();
    }
    selectUnit(u) {
      if (!u || !u.alive) return; this.selected = u; this.selectedEnemy = null; this.mode = 'idle'; this.pending = null; TC.Audio.play('select');
      this.computeReach(); this.drawHighlights(); HUD.unitCard(u, this.st); HUD.actions(u, this.st, this.mode); HUD.preview(null); HUD.cancelVisible(false); this.focusUnit(u); this.drawEnemyLabels();
    }
    cycleUnit(dir) {
      const list = R.alive(this.st, 'na'); if (!list.length) return; let i = this.selected ? list.indexOf(this.selected) : -1;
      for (let k = 0; k < list.length; k++) { i = (i + dir + list.length) % list.length; if (list[i].ap > 0) break; }
      this.selectUnit(list[i]);
    }
    computeReach() { const u = this.selected; if (!u || u.ap <= 0) { this.reach = null; return; } this.reach = R.reachable(this.st, u, R.moveBudget(u, u.ap)); }
    drawHighlights() {
      const g = this.hl; g.clear(); this.selG.clear(); const u = this.selected; if (!u) return;
      const mob = R.effMob(u);
      if (this.reach) for (const [k, v] of this.reach) { if (v.blocked) continue; const [x, y] = k.split(',').map(Number); if (x === u.x && y === u.y) continue; const dash = v.cost > mob + 1e-6; g.fillStyle(dash ? COL.yellow : COL.blue, dash ? 0.22 : 0.28); g.fillPoints(this.diamondPts(x, y, 3), true); g.lineStyle(1, dash ? COL.yellow : COL.blue, 0.35); g.strokePoints(this.diamondPts(x, y, 3), true); }
      const s = this.selG; s.lineStyle(2.5, COL.gold, 0.95); s.strokePoints(this.diamondPts(u.x, u.y, 1), true); s.fillStyle(COL.gold, 0.12); s.fillPoints(this.diamondPts(u.x, u.y, 1), true);
    }
    drawEnemyLabels() {
      this.labels.forEach(l => l.destroy()); this.labels = []; const u = this.selected; if (!u || u.ap <= 0) return; const w = R.rangedWeapon(u) || R.meleeWeapon(u); if (!w) return;
      for (const e of R.alive(this.st, 'h')) { if (!e.visible) continue; const pv = R.attackPreview(this.st, u, e, w, {}); const wp = this.tileToWorld(e.x, e.y); const txt = pv.ok ? pv.hit + '%' : '—'; const col = !pv.ok ? '#888' : (pv.hit >= 70 ? '#8fd07a' : (pv.hit >= 40 ? '#f0b34a' : '#e0463f'));
        const l = this.add.text(wp.x, wp.y - 92, txt, { fontFamily: 'Cinzel, serif', fontSize: '13px', fontStyle: 'bold', color: col, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(950); this.labels.push(l);
        if (pv.ok && pv.flanked) { const f = this.add.text(wp.x, wp.y - 106, '⚑', { fontSize: '11px', color: '#e0463f', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(950); this.labels.push(f); } }
    }
    clearPreview() { this.pending = null; this.pathG.clear(); HUD.preview(null); this.coverIcons.forEach(i => i.destroy()); this.coverIcons = []; if (this.areaG) { this.areaG.clear(); } }
    cancelMode() { this.mode = 'idle'; this.clearPreview(); HUD.cancelVisible(false); if (this.selected) { HUD.actions(this.selected, this.st, this.mode); this.computeReach(); this.drawHighlights(); this.drawEnemyLabels(); } }
    drawCoverIcons(x, y) {
      this.coverIcons.forEach(i => i.destroy()); this.coverIcons = []; const st = this.st; const w = this.tileToWorld(x, y);
      const dirs = [[1, 0, A.HW / 2, A.HH / 2], [-1, 0, -A.HW / 2, -A.HH / 2], [0, 1, -A.HW / 2, A.HH / 2], [0, -1, A.HW / 2, -A.HH / 2]];
      for (const [dx, dy, ox, oy] of dirs) { const c = R.cell(st, x + dx, y + dy); if (!c || !c.terr.cover) continue; const full = c.terr.cover === 2; const t = this.add.text(w.x + ox, w.y + oy - 6, full ? '⬢' : '⬡', { fontSize: '13px', color: full ? '#f3d78a' : '#e8dcc0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(960); this.coverIcons.push(t); }
      const own = R.cell(st, x, y); if (own && own.terr.trench) { const t = this.add.text(w.x, w.y - 8, '⬡', { fontSize: '13px', color: '#e8dcc0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(960); this.coverIcons.push(t); }
    }
    previewMove(u, x, y) {
      const path = R.pathFrom(this.reach, x, y); if (!path) return; const cost = this.reach.get(x + ',' + y).cost; const ap = R.apForCost(u, cost);
      this.pending = { kind: 'move', x, y, path, ap }; const g = this.pathG; g.clear(); g.lineStyle(3, ap === 1 ? COL.blue : COL.yellow, 0.9);
      let prev = this.tileToWorld(u.x, u.y); g.beginPath(); g.moveTo(prev.x, prev.y); for (const p of path) { const w = this.tileToWorld(p.x, p.y); g.lineTo(w.x, w.y); } g.strokePath();
      g.lineStyle(2.5, COL.white, 0.9); g.strokePoints(this.diamondPts(x, y, 2), true);
      const ow = R.anyOverwatchThreat(this.st, u, x, y) || path.some(p => R.anyOverwatchThreat(this.st, u, p.x, p.y));
      this.drawCoverIcons(x, y);
      const fake = Object.assign({}, u, { x, y }); let covMax = 0; for (const e of R.alive(this.st, 'h')) { if (!e.visible) continue; covMax = Math.max(covMax, R.coverAgainst(this.st, fake, e.x, e.y)); }
      const hasAdj = R.DIRS8.some(([dx, dy]) => { const c = R.cell(this.st, x + dx, y + dy); return c && c.terr.cover; }) || (R.cell(this.st, x, y).terr.trench);
      HUD.preview({ kind: 'move', ap, ow, coverTxt: hasAdj ? (covMax === 2 ? T('pvFull') : (covMax === 1 ? T('pvHalf') : T('pvHalf') + '/' + T('pvFull'))) : T('pvNone') });
      TC.Audio.play('ui');
    }
    previewAttack(u, t, mode) {
      let abId = mode, w; if (mode === 'auto') { const rw = R.rangedWeapon(u), mw = R.meleeWeapon(u); const adj = R.cheb(u.x, u.y, t.x, t.y) <= 1; if (rw && (!adj || !mw) && R.canUse(this.st, u, 'shoot').ok) { abId = 'shoot'; w = rw; } else if (mw && adj) { abId = 'melee'; w = mw; } else if (rw) { abId = 'shoot'; w = rw; } else { abId = 'melee'; w = mw; } }
      else if (abId === 'melee') w = R.meleeWeapon(u); else if (abId === 'holyfire') w = null; else w = R.rangedWeapon(u);
      const can = R.canUse(this.st, u, abId); if (!can.ok) { HUD.log(can.reason === 'ammo' ? T('noAmmo') : (can.reason === 'faith' ? T('noFaith') : T('noTarget'))); return; }
      let pv; if (abId === 'holyfire') { const ok = R.dist(u.x, u.y, t.x, t.y) <= AB.holyfire.range + 0.5 && R.hasLOS(this.st, u.x, u.y, t.x, t.y); pv = { ok, hit: 100, crit: 0, dmg: [TC.RULES.holyFireDmg, TC.RULES.holyFireDmg], cover: 1, dist: R.dist(u.x, u.y, t.x, t.y), auto: true }; }
      else pv = R.attackPreview(this.st, u, t, w, { aimBonus: AB[abId].aimBonus || 0, critBonus: AB[abId].critBonus || 0 });
      if (!pv.ok) { HUD.log(T('noTarget')); this.pending = null; return; }
      this.pending = { kind: 'attack', ab: abId, t, pv }; const g = this.pathG; g.clear(); g.lineStyle(2, COL.red, 0.8); const a = this.tileToWorld(u.x, u.y), b = this.tileToWorld(t.x, t.y); g.lineBetween(a.x, a.y - 30, b.x, b.y - 30); g.lineStyle(2.5, COL.red, 0.95); g.strokePoints(this.diamondPts(t.x, t.y, 2), true);
      const names = { shoot: 'actShoot', melee: 'actMelee', aimed: 'actAimed', holyfire: 'actHolyFire', suppress: 'actSuppress' };
      HUD.preview({ kind: 'attack', name: T(names[abId]), targetName: R.unitName(t), hit: pv.hit, crit: pv.crit, dmg: pv.dmg, cover: pv.cover, dist: pv.dist, auto: !!pv.auto, holy: abId === 'holyfire' });
      HUD.unitCard(u, this.st); TC.Audio.play('ui');
    }
    previewSupport(u, t, abId) {
      const ab = AB[abId]; if (t === u && !ab.selfOk) { HUD.log(T('noTarget')); return; } if (R.dist(u.x, u.y, t.x, t.y) > ab.range + 0.5) { HUD.log(T('noTarget')); return; }
      if (abId === 'rally' && t.ap >= 2) { return; }
      this.pending = { kind: 'support', ab: abId, t }; const g = this.pathG; g.clear(); g.lineStyle(2.5, COL.holy, 0.95); g.strokePoints(this.diamondPts(t.x, t.y, 2), true);
      const names = { rally: 'actRally', bless: 'actBless', light: 'actLight' }; const descs = { rally: 'dActRally', bless: 'dActBless', light: 'dActLight' };
      HUD.preview({ kind: 'support', ico: ab.ico, name: T(names[abId]), targetName: R.unitName(t), desc: T(descs[abId]) }); TC.Audio.play('ui');
    }
    previewArea(u, x, y, abId) {
      const st = this.st; if (!this.areaG) this.areaG = this.add.graphics().setDepth(0.7); const g = this.areaG; g.clear(); this.pathG.clear();
      let cells, hits, dmg, name;
      if (abId === 'grenade') { if (R.dist(u.x, u.y, x, y) > AB.grenade.range + 0.5) { HUD.log(T('noTarget')); return; } cells = R.blastCells(st, x, y, 1); dmg = AB.grenade.dmg; name = T('actGrenade'); }
      else { const w = R.flameWeapon(u); if (R.dist(u.x, u.y, x, y) > w.range + 0.5 || (x === u.x && y === u.y)) { HUD.log(T('noTarget')); return; } cells = R.coneCells(st, u, x, y, w.range); dmg = w.dmg[0]; name = T('actFlame'); if (!cells.length) return; }
      hits = cells.map(c => R.unitAt(st, c.x, c.y)).filter(t => t && t !== u);
      for (const c of cells) { g.fillStyle(COL.orange, 0.35); g.fillPoints(this.diamondPts(c.x, c.y, 2), true); g.lineStyle(1, COL.orange, 0.7); g.strokePoints(this.diamondPts(c.x, c.y, 2), true); }
      this.pending = { kind: 'area', ab: abId, x, y };
      HUD.preview({ kind: 'area', name, count: hits.length, targets: hits.map(t => (t.faction === 'na' ? '⚠ ' : '') + R.unitName(t)).join(', '), dmg }); TC.Audio.play('ui');
    }
    onAction(id) {
      if (this.busy || !this.selected || this.st.over) return; const u = this.selected; const can = R.canUse(this.st, u, id); if (!can.ok) { if (can.reason === 'ammo') HUD.log(T('noAmmo')); if (can.reason === 'faith') HUD.log(T('noFaith')); return; }
      TC.Audio.play('ui'); const ab = AB[id];
      if (ab.target === 'self') { this.execute(id, {}); return; }
      // enter targeting mode
      this.mode = id; this.clearPreview(); this.hl.clear(); this.selG.clear(); this.labels.forEach(l => l.destroy()); this.labels = []; HUD.actions(u, this.st, id); HUD.cancelVisible(true);
      const g = this.hl; if (ab.target === 'enemy') { for (const e of R.alive(this.st, 'h')) { if (!e.visible) continue; g.lineStyle(2, COL.red, 0.8); g.strokePoints(this.diamondPts(e.x, e.y, 2), true); } if (id === 'shoot' || id === 'aimed' || id === 'suppress') this.drawEnemyLabels(); }
      if (ab.target === 'ally') { for (const e of R.alive(this.st, 'na')) { if (e === u && !ab.selfOk) continue; if (R.dist(u.x, u.y, e.x, e.y) > ab.range + 0.5) continue; g.lineStyle(2, COL.holy, 0.8); g.strokePoints(this.diamondPts(e.x, e.y, 2), true); } }
      if (ab.target === 'tile' || ab.target === 'cone') { const range = ab.range; for (let y = u.y - range; y <= u.y + range; y++) for (let x = u.x - range; x <= u.x + range; x++) { const c = R.cell(this.st, x, y); if (!c) continue; if (R.dist(u.x, u.y, x, y) > range + 0.5) continue; if (x === u.x && y === u.y) continue; g.fillStyle(COL.orange, 0.12); g.fillPoints(this.diamondPts(x, y, 3), true); } }
      this.selG.lineStyle(2.5, COL.gold, 0.95); this.selG.strokePoints(this.diamondPts(u.x, u.y, 1), true);
      // auto-preview the single sensible target
      if (ab.target === 'enemy') { const vis = R.alive(this.st, 'h').filter(e => e.visible); if (vis.length === 1) this.previewAttack(u, vis[0], id); }
    }
    confirmPreview() {
      if (this.busy || !this.pending || !this.selected) return; const p = this.pending; const u = this.selected;
      if (p.kind === 'move') this.execute('move', { path: p.path, ap: p.ap });
      else if (p.kind === 'attack') this.execute(p.ab, { t: p.t });
      else if (p.kind === 'support') this.execute(p.ab, { t: p.t });
      else if (p.kind === 'area') this.execute(p.ab, { x: p.x, y: p.y });
    }

    // ---------- execution ----------
    async execute(id, o) {
      const st = this.st, u = this.selected; this.busy = true; this.clearPreview(); this.hl.clear(); this.selG.clear(); this.labels.forEach(l => l.destroy()); this.labels = []; HUD.actions(null); HUD.cancelVisible(false); HUD.refreshTop(st);
      try {
        let evs = null;
        if (id === 'move') { R.spendAP(u, o.ap); await this.animateMove(u, o.path); }
        else if (id === 'shoot' || id === 'aimed' || id === 'suppress') evs = R.doShoot(st, u, o.t, { ability: id });
        else if (id === 'melee') evs = R.doMelee(st, u, o.t);
        else if (id === 'overwatch') { evs = R.doOverwatch(st, u); TC.Audio.play('overwatch'); HUD.log(T('logOverwatchSet', { a: R.unitName(u) })); }
        else if (id === 'hunker') { evs = R.doHunker(st, u); TC.Audio.play('hunker'); HUD.log(T('logHunker', { a: R.unitName(u) })); }
        else if (id === 'reload') { evs = R.doReload(st, u); TC.Audio.play('reload'); HUD.log(T('logReload', { a: R.unitName(u) })); }
        else if (id === 'grenade') evs = R.doGrenade(st, u, o.x, o.y);
        else if (id === 'flame') evs = R.doFlame(st, u, o.x, o.y);
        else if (id === 'rally') evs = R.doRally(st, u, o.t);
        else if (id === 'bless') evs = R.doBless(st, u, o.t);
        else if (id === 'light') evs = R.doLight(st, u, o.t);
        else if (id === 'holyfire') evs = R.doHolyFire(st, u, o.t);
        else if (id === 'pray') evs = R.doPray(st, u);
        else if (id === 'relic') evs = R.doTakeRelic(st, u);
        else if (id === 'droprelic') evs = R.doDropRelic(st, u);
        if (evs) await this.playEvents(evs);
      } catch (e) { console.error(e); }
      this.mode = 'idle'; this.busy = false; this.refreshAll();
      if (R.checkOver(st)) { this.gameOver(); return; }
      if (u.alive && u.ap > 0) this.selectUnit(u); else { this.selected = u.alive ? u : null; HUD.unitCard(u, st); HUD.actions(u, st, 'idle'); this.drawHighlights(); const next = R.alive(st, 'na').find(x => x.ap > 0); if (next) this.time.delayedCall(350, () => { if (!this.busy && st.phase === 'na') this.selectUnit(next); }); }
      HUD.refreshTop(st);
    }
    refreshAll() { this.st.units.forEach(u => this.refreshUnitView(u)); this.refreshVisibility(); for (let y = 0; y < this.st.grid.h; y++) for (let x = 0; x < this.st.grid.w; x++) { const c = this.st.grid.cells[y][x]; if (c.dirty) { c.dirty = false; this.buildObject(c); this.groundViews[x + ',' + y].setTexture(A.groundKey(c, x, y)); } } HUD.refreshTop(this.st); if (this.selected) HUD.unitCard(this.selected, this.st); }

    // ---------- animation helpers ----------
    tweenP(cfg) { return new Promise(res => { cfg.onComplete = res; this.tweens.add(cfg); }); }
    floatText(wx, wy, txt, color, size) { const t = this.add.text(wx, wy, txt, { fontFamily: 'Cinzel, serif', fontSize: (size || 18) + 'px', fontStyle: 'bold', color: color || '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(980); this.tweens.add({ targets: t, y: wy - 40, alpha: { from: 1, to: 0 }, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() }); }
    setUnitPos(u) { const w = this.tileToWorld(u.x, u.y); u.view.c.setPosition(w.x, w.y); u.view.c.setDepth(u.x + u.y + 1.5); }
    async animateMove(u, path) {
      const st = this.st; HUD.log(T('logMove', { a: R.unitName(u) }), u.faction === 'h' ? 'enemy' : ''); let idx = 0; const dur = 150;
      for (const p of path) {
        idx++; const w = this.tileToWorld(p.x, p.y); R.face(u, p.x, p.y); u.view.spr.setFlipX(u.facing === -1); u.view.c.setDepth(Math.max(u.x + u.y, p.x + p.y) + 1.5);
        this.tweens.add({ targets: u.view.spr, y: { from: 8, to: 3 }, duration: dur / 2, yoyo: true });
        await this.tweenP({ targets: u.view.c, x: w.x, y: w.y, duration: dur, ease: 'Linear' }); TC.Audio.play('step'); this.fxDust.explode(2, w.x, w.y + 4);
        R.applyStep(st, u, p.x, p.y); u.view.c.setDepth(u.x + u.y + 1.5); this.refreshVisibility();
        if (u.faction === 'h' && !u.visible && idx === 1) { /* hidden mover: no cinematic */ }
        if (u.faction === 'h' && u.visible) { const cam = this.cameras.main; const vp = cam.worldView; if (!vp.contains(w.x, w.y)) this.focusPoint(w.x, w.y, 250); }
        const ow = R.overwatchers(st, u);
        for (const e of ow) { const w2 = R.rangedWeapon(e); const ev = R.resolveAttack(st, e, u, w2, { overwatch: true }); e.overwatch = false; this.refreshUnitView(e); if (ev) { ev.overwatch = true; HUD.log(T('logOverwatch', { a: R.unitName(e), t: R.unitName(u) }), e.faction === 'h' ? 'enemy' : 'good'); await this.playShot(ev); } if (!u.alive) break; }
        if (!u.alive) break;
        if (R.checkExtraction(st, u)) break;
      }
      this.refreshUnitView(u); if (u.alive) this.setUnitPos(u);
    }
    async cinematic(ax, ay, bx, by) { const cam = this.cameras.main; const mx = (ax + bx) / 2, my = (ay + by) / 2; this.prevZoom = cam.zoom; const z = Math.min(this.maxZoom, Math.max(cam.zoom, 1.35)); cam.zoomTo(z, 350, 'Sine.easeInOut'); cam.pan(mx, my - 20 + this.visOffset() * (cam.zoom / z), 350, 'Sine.easeInOut'); await wait(360); }
    async uncinematic() { const cam = this.cameras.main; if (this.prevZoom) { cam.zoomTo(this.prevZoom, 400, 'Sine.easeInOut'); } await wait(150); }
    muzzle(wx, wy, dir) { const m = this.add.image(wx + dir * 16, wy - 34, 'glow').setTint(0xffd080).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35).setDepth(950); this.tweens.add({ targets: m, alpha: 0, scale: 0.6, duration: 120, onComplete: () => m.destroy() }); this.fxSpark.explode(5, wx + dir * 18, wy - 34); }
    tracer(a, b, col) { return new Promise(res => { const g = this.add.graphics().setDepth(940); const o = { t: 0 }; this.tweens.add({ targets: o, t: 1, duration: 110, onUpdate: () => { g.clear(); const x = a.x + (b.x - a.x) * o.t, y = a.y + (b.y - a.y) * o.t; const x0 = a.x + (b.x - a.x) * Math.max(0, o.t - 0.25), y0 = a.y + (b.y - a.y) * Math.max(0, o.t - 0.25); g.lineStyle(2, col || 0xffe0a0, 0.9); g.lineBetween(x0, y0, x, y); }, onComplete: () => { g.destroy(); res(); } }); }); }
    bloodDecal(x, y) { const w = this.tileToWorld(x, y); const d = this.add.image(w.x + (Math.random() - .5) * 12, w.y + (Math.random() - .5) * 6, 'blood' + Math.floor(Math.random() * 3)).setDepth(x + y + 0.2).setAlpha(0.85).setAngle(Math.random() * 360).setScale(0.8 + Math.random() * 0.5); this.decals.add(d); }
    async deathAnim(u) {
      const v = u.view; TC.Audio.play('death'); const w = this.tileToWorld(u.x, u.y); this.fxBlood.explode(18, w.x, w.y - 30); this.bloodDecal(u.x, u.y);
      v.hp.setVisible(false); v.status.setVisible(false); v.ring.setVisible(false); v.relic.setVisible(false); v.relicGlow.setVisible(false); v.fire.stop();
      await this.tweenP({ targets: v.spr, angle: u.facing === 1 ? 80 : -80, y: 14, duration: 350, ease: 'Cubic.easeIn' }); v.spr.setTint(0x444444); v.c.setDepth(u.x + u.y + 1.3); v.shadow.setAlpha(0.2);
      if (this.st.relic.state === 'ground') this.refreshVisibility();
    }
    async applyHit(ev, t) {
      const w = this.tileToWorld(t.x, t.y);
      if (ev.hit === false) { TC.Audio.play('miss'); this.floatText(w.x, w.y - 70, T('logMiss').toUpperCase(), '#bbb', 15); this.fxDust.explode(4, w.x + (Math.random() - .5) * 30, w.y - 10 + (Math.random() - .5) * 20); return; }
      TC.Audio.play(ev.crit ? 'crit' : 'hit'); this.fxBlood.explode(ev.crit ? 14 : 8, w.x, w.y - 32); this.floatText(w.x, w.y - 74, (ev.crit ? '✦ ' : '') + '-' + ev.dmg, ev.crit ? '#f3d78a' : '#ff6b6b', ev.crit ? 24 : 19);
      if (!ev.killed) { this.tweens.add({ targets: t.view.spr, x: { from: -6 * t.facing, to: 0 }, duration: 120, ease: 'Bounce.easeOut' }); t.view.spr.setTintFill(0xffffff); this.time.delayedCall(70, () => t.view.spr.clearTint()); if (ev.crit) this.cameras.main.shake(120, 0.004); }
      this.refreshUnitView(t); if (ev.killed) { await this.deathAnim(t); HUD.log(T('logKill', { t: R.unitName(t) }), t.faction === 'h' ? 'good' : 'enemy'); }
    }
    async playShot(ev) {
      const a = ev.a, t = ev.t; const wa = this.tileToWorld(a.x, a.y), wt = this.tileToWorld(t.x, t.y); const wasVisible = a.visible !== false;
      if (!a.visible && a.faction === 'h') { a.view.c.setVisible(true); }
      await this.cinematic(wa.x, wa.y, wt.x, wt.y);
      const res = ev.hit ? (ev.crit ? T('logCrit', { d: ev.dmg }) : T('logHit', { d: ev.dmg })) : T('logMiss'); HUD.log(T(ev.type === 'melee' ? 'logMelee' : 'logShot', { a: R.unitName(a), t: R.unitName(t), r: res }), a.faction === 'h' ? 'enemy' : '');
      a.view.spr.setFlipX(a.facing === -1); this.refreshUnitView(a);
      if (ev.type === 'melee') { TC.Audio.play(ev.weapon.sfx); const dx = (wt.x - wa.x) * 0.45, dy = (wt.y - wa.y) * 0.45; await this.tweenP({ targets: a.view.c, x: wa.x + dx, y: wa.y + dy, duration: 120, ease: 'Quad.easeIn' }); this.fxSpark.explode(6, wt.x, wt.y - 30); await this.applyHit(ev, t); this.tweens.add({ targets: a.view.c, x: wa.x, y: wa.y, duration: 180, ease: 'Quad.easeOut' }); }
      else { TC.Audio.play(ev.weapon.sfx); const shots = ev.weapon.id === 'hmg' ? 3 : 1; for (let i = 0; i < shots; i++) { this.muzzle(wa.x, wa.y, a.facing); await this.tracer({ x: wa.x + a.facing * 18, y: wa.y - 34 }, { x: wt.x + (ev.hit ? 0 : (Math.random() - .5) * 40), y: wt.y - 30 + (ev.hit ? 0 : (Math.random() - .5) * 30) }); if (i < shots - 1) await wait(70); } await this.applyHit(ev, t); if (ev.relicDropped) HUD.log(T('logRelicDrop')); }
      await wait(ev.killed ? 500 : 350); await this.uncinematic(); this.refreshVisibility();
    }
    async playExplosion(ev) {
      const w = this.tileToWorld(ev.x, ev.y); const cam = this.cameras.main;
      if (ev.a && !ev.barrel) { const wa = this.tileToWorld(ev.a.x, ev.a.y); await this.cinematic(wa.x, wa.y, w.x, w.y); HUD.log(T('logGrenade', { a: R.unitName(ev.a) })); TC.Audio.play('throw_');
        const g = this.add.ellipse(wa.x, wa.y - 40, 8, 8, 0x222222).setDepth(950); const o = { t: 0 }; await new Promise(res => this.tweens.add({ targets: o, t: 1, duration: 520, ease: 'Linear', onUpdate: () => { const x = wa.x + (w.x - wa.x) * o.t; const y = wa.y - 40 + (w.y - 10 - (wa.y - 40)) * o.t - Math.sin(o.t * Math.PI) * 90; g.setPosition(x, y); }, onComplete: () => { g.destroy(); res(); } })); }
      TC.Audio.play('explosion'); cam.shake(260, 0.012); cam.flash(120, 255, 200, 120, false);
      const fl = this.add.image(w.x, w.y - 10, 'glow').setTint(0xffc060).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setDepth(950); this.tweens.add({ targets: fl, scale: 2.4, alpha: 0, duration: 380, onComplete: () => fl.destroy() });
      this.fxFire.explode(40, w.x, w.y - 8); this.fxSmoke.explode(14, w.x, w.y - 10); this.fxDebris.explode(24, w.x, w.y - 6);
      const sc = this.add.image(w.x, w.y, 'scorch').setDepth(ev.x + ev.y + 0.15).setAlpha(0.8).setScale(1.3); this.decals.add(sc);
      for (const d of ev.destroyed) { const c = R.cell(this.st, d.x, d.y); c.dirty = false; this.buildObject(c); this.groundViews[d.x + ',' + d.y].setTexture(A.groundKey(c, d.x, d.y)); const wd = this.tileToWorld(d.x, d.y); this.fxDebris.explode(10, wd.x, wd.y - 10); }
      if (ev.destroyed.length) HUD.log(T('logCoverDestroyed'));
      await wait(200);
      for (const h of ev.hits) { await this.applyHit({ hit: true, crit: false, dmg: h.dmg, killed: h.killed }, h.t); if (h.relicDropped) HUD.log(T('logRelicDrop')); }
      await wait(400); if (ev.a && !ev.barrel) await this.uncinematic();
    }
    async playFlame(ev) {
      const a = ev.a; const wa = this.tileToWorld(a.x, a.y); const cells = ev.cells.slice().sort((p, q) => R.dist(a.x, a.y, p.x, p.y) - R.dist(a.x, a.y, q.x, q.y)); const far = cells[cells.length - 1]; const wf = this.tileToWorld(far.x, far.y);
      await this.cinematic(wa.x, wa.y, wf.x, wf.y); HUD.log(T('logFlame', { a: R.unitName(a) })); TC.Audio.play('flame'); a.view.spr.setFlipX(a.facing === -1);
      for (const c of cells) { const w = this.tileToWorld(c.x, c.y); this.fxFire.explode(18, w.x, w.y - 6); this.fxSmoke.explode(3, w.x, w.y - 10); const sc = this.add.image(w.x, w.y, 'scorch').setDepth(c.x + c.y + 0.15).setAlpha(0.6); this.decals.add(sc); await wait(70); }
      for (const d of ev.destroyed) { const c = R.cell(this.st, d.x, d.y); c.dirty = false; this.buildObject(c); }
      await wait(150); for (const h of ev.hits) { await this.applyHit({ hit: true, crit: false, dmg: h.dmg, killed: h.killed }, h.t); if (h.relicDropped) HUD.log(T('logRelicDrop')); }
      this.st.units.forEach(u => this.refreshUnitView(u)); await wait(400); await this.uncinematic();
    }
    async playHolyFire(ev) {
      const a = ev.a, t = ev.t; const wa = this.tileToWorld(a.x, a.y), wt = this.tileToWorld(t.x, t.y); await this.cinematic(wa.x, wa.y, wt.x, wt.y); HUD.log(T('logHolyFire', { a: R.unitName(a), t: R.unitName(t) }), 'good'); TC.Audio.play('holy');
      const col = this.add.image(wt.x, wt.y - 40, 'glow').setTint(0xbfe0ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3, 3).setAlpha(0).setDepth(950); this.tweens.add({ targets: col, alpha: { from: 0, to: 1 }, scaleX: { from: 0.2, to: 0.9 }, duration: 300, yoyo: true, hold: 200, onComplete: () => col.destroy() });
      this.fxHoly.explode(40, wt.x, wt.y - 10); this.cameras.main.flash(200, 200, 220, 255, false); await wait(450); this.fxFire.explode(20, wt.x, wt.y - 8);
      await this.applyHit({ hit: true, crit: false, dmg: ev.dmg, killed: ev.killed }, t); if (ev.relicDropped) HUD.log(T('logRelicDrop')); await wait(400); await this.uncinematic();
    }
    async playBuff(ev) {
      const t = ev.t; const w = this.tileToWorld(t.x, t.y); const dark = ev.dark; TC.Audio.play(dark ? 'dark' : (ev.status === 'rally' ? 'overwatch' : 'holy'));
      const names = { blessed: 'logBless', rally: 'logRally', cursed: 'logCurse', mutated: 'logMutate' }; HUD.log(T(names[ev.status], { a: R.unitName(ev.a), t: R.unitName(t) }), dark ? 'enemy' : 'good');
      const ring = this.add.graphics().setDepth(t.x + t.y + 1.4); ring.lineStyle(3, dark ? COL.purple : COL.holy, 1); ring.strokeEllipse(w.x, w.y + 2, 34, 14); this.tweens.add({ targets: ring, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 600, onComplete: () => ring.destroy() }); ring.setPosition(0, 0);
      (dark ? this.fxDark : this.fxHoly).explode(20, w.x, w.y - 20); this.refreshUnitView(t); await wait(500);
    }
    async playEvents(evs) {
      for (const ev of evs) {
        if (ev.type === 'shot' || ev.type === 'melee') await this.playShot(ev);
        else if (ev.type === 'explosion') await this.playExplosion(ev);
        else if (ev.type === 'throw') { }
        else if (ev.type === 'flame') await this.playFlame(ev);
        else if (ev.type === 'holyfire') await this.playHolyFire(ev);
        else if (ev.type === 'buff') await this.playBuff(ev);
        else if (ev.type === 'heal') { const w = this.tileToWorld(ev.t.x, ev.t.y); TC.Audio.play('heal'); HUD.log(T('logLight', { a: R.unitName(ev.a), t: R.unitName(ev.t), d: ev.amount }), 'good'); this.fxHoly.explode(24, w.x, w.y - 20); this.floatText(w.x, w.y - 70, '+' + ev.amount, '#8fd07a'); this.refreshUnitView(ev.t); await wait(450); }
        else if (ev.type === 'pray') { const w = this.tileToWorld(ev.a.x, ev.a.y); TC.Audio.play('bell'); HUD.log(T('logPray', { a: R.unitName(ev.a) }), 'good'); this.fxHoly.explode(20, w.x, w.y - 20); this.floatText(w.x, w.y - 70, '+2 ✚', '#9ec5ff'); HUD.bump('faith'); this.buildObject(ev.cell); await wait(500); }
        else if (ev.type === 'relicTaken') { const w = this.tileToWorld(ev.a.x, ev.a.y); TC.Audio.play('bellDeep'); HUD.log(T('logRelicTaken', { a: R.unitName(ev.a) }), 'good'); this.fxHoly.explode(30, w.x, w.y - 30); this.refreshUnitView(ev.a); this.refreshVisibility(); if (ev.first) { HUD.banner(T('bannerReinf'), T('bannerReinfSub'), 'heretic', 2200); this.time.delayedCall(700, () => TC.Audio.play('bellDeep')); this.time.delayedCall(1400, () => TC.Audio.play('bellDeep')); await wait(1200); } else await wait(400); }
        else if (ev.type === 'relicDrop') { HUD.log(T('logRelicDrop')); this.refreshUnitView(ev.a); this.refreshVisibility(); await wait(300); }
        else if (ev.type === 'sacrifice') { const w = this.tileToWorld(ev.t.x, ev.t.y); TC.Audio.play('dark'); HUD.log(T('logSacrifice', { a: R.unitName(ev.a), t: R.unitName(ev.t) }), 'enemy'); this.fxDark.explode(30, w.x, w.y - 20); await this.deathAnim(ev.t); this.refreshUnitView(ev.a); HUD.bump('blood'); await wait(400); }
        else if (ev.type === 'tick') { const t = ev.t; const w = this.tileToWorld(t.x, t.y); if (t.visible) { this.focusPoint(w.x, w.y, 250); await wait(260); TC.Audio.play(ev.status === 'burning' ? 'burn' : 'hit'); this.floatText(w.x, w.y - 70, '-' + ev.dmg + (ev.status === 'burning' ? ' 🔥' : ' 🩸'), ev.status === 'burning' ? '#ffa54a' : '#ff6b6b'); HUD.log(T(ev.status === 'burning' ? 'logBurn' : 'logBleed', { t: R.unitName(t), d: ev.dmg }), t.faction === 'h' ? 'enemy' : ''); if (ev.status === 'burning') this.fxFire.explode(10, w.x, w.y - 20); this.refreshUnitView(t); if (ev.killed) { await this.deathAnim(t); HUD.log(T('logKill', { t: R.unitName(t) }), t.faction === 'h' ? 'good' : 'enemy'); } await wait(350); } else { this.refreshUnitView(t); } }
        else if (ev.type === 'resource') { HUD.refreshTop(this.st); HUD.bump(ev.faith ? 'faith' : 'blood'); }
        else if (ev.type === 'reinforcements') { HUD.banner(ev.reason === 'bells' ? T('bannerReinf') : T('bannerReinf2'), ev.reason === 'bells' ? T('bannerReinfSub') : T('bannerReinf2Sub'), 'heretic', 2000); TC.Audio.play('alarm'); HUD.log(T('logReinf', { n: ev.units.length }), 'enemy'); for (const u of ev.units) { this.makeUnitView(u); u.view.c.setAlpha(0); } this.refreshVisibility(); const f = ev.units[0]; if (f) { const w = this.tileToWorld(f.x, f.y); this.focusPoint(w.x, w.y, 500); } await wait(500); for (const u of ev.units) { const w = this.tileToWorld(u.x, u.y); this.fxSmoke.explode(6, w.x, w.y - 10); this.tweens.add({ targets: u.view.c, alpha: 1, duration: 600 }); } await wait(1200); }
        else if (ev.type === 'status' || ev.type === 'reload') { this.refreshUnitView(ev.t); await wait(200); }
        if (this.st.blood !== this._lastBlood) { this._lastBlood = this.st.blood; HUD.refreshTop(this.st); }
      }
      HUD.refreshTop(this.st);
    }

    // ---------- turn flow ----------
    async startPlayerTurn(first) {
      const st = this.st; this.busy = true; HUD.refreshTop(st);
      const evs = R.startTurn(st, 'na'); HUD.banner(T('bannerNA'), T('bannerNAsub'), '', 1500); TC.Audio.play('bell');
      await this.playEvents(evs.filter(e => e.type !== 'resource')); this.refreshAll();
      if (R.checkOver(st)) { this.busy = false; this.gameOver(); return; }
      this.busy = false; const u = R.alive(st, 'na').find(x => x.ap > 0); if (u) this.selectUnit(u); HUD.refreshTop(st);
    }
    onEndTurnPressed() {
      if (this.busy || this.st.phase !== 'na' || this.st.over) return; const left = R.alive(this.st, 'na').filter(u => u.ap > 0).length;
      if (left > 0) { HUD.modal(`<p style="text-align:center">${T('endTurnConfirm')}</p><p class="sub">${T('unitsLeft', { n: left })}</p>`, [{ label: T('yes'), fn: () => { HUD.closeModal(); this.enemyTurn(); } }, { label: T('no'), secondary: true, fn: () => HUD.closeModal() }]); return; }
      this.enemyTurn();
    }
    async enemyTurn() {
      const st = this.st; this.busy = true; this.selected = null; this.mode = 'idle'; this.clearPreview(); this.hl.clear(); this.selG.clear(); this.labels.forEach(l => l.destroy()); this.labels = []; HUD.actions(null); HUD.unitCard(null); HUD.cancelVisible(false);
      for (const u of R.alive(st, 'na')) { if (u.ap > 0 && !u.overwatch && !u.hunkered) { /* unused AP: nothing */ } }
      HUD.refreshTop(st); HUD.banner(T('bannerH'), T('bannerHsub'), 'heretic', 1500); TC.Audio.play('bellDeep'); await wait(900);
      const evs = R.startTurn(st, 'h'); await this.playEvents(evs); this.refreshAll(); if (R.checkOver(st)) { this.gameOver(); return; }
      const rf = R.spawnReinforcements(st); if (rf.length) { await this.playEvents(rf); this.refreshAll(); }
      const order = ['wolf', 'executioner', 'legionnaire', 'heavy', 'hpriest']; const units = R.alive(st, 'h').sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
      for (const u of units) {
        if (!u.alive || st.over) continue;
        // priest spells
        for (const sp of TC.AI.priestSpells(st, u)) { if (u.ap <= 0) break; let ev = null; if (sp.kind === 'curse') ev = R.doCurse(st, u, sp.t); else if (sp.kind === 'mutate') ev = R.doMutate(st, u, sp.t); else if (sp.kind === 'sacrifice') ev = R.doSacrifice(st, u, sp.t); if (ev) { if (!u.visible) { u.view.c.setVisible(true); } await this.playEvents(ev); this.refreshAll(); } }
        let guard = 0;
        while (u.alive && u.ap > 0 && !st.over && guard++ < 5) {
          const act = TC.AI.decide(st, u); if (!act || act.kind === 'end') break;
          if (act.kind === 'move') { const reach = R.reachable(st, u, R.moveBudget(u, u.ap)); const path = R.pathFrom(reach, act.x, act.y); if (!path || !path.length) { R.spendAP(u, 1); continue; } const cost = reach.get(act.x + ',' + act.y).cost; R.spendAP(u, R.apForCost(u, cost)); if (u.visible) { const w = this.tileToWorld(u.x, u.y); this.focusPoint(w.x, w.y, 300); await wait(250); } await this.animateMove(u, path); this.refreshAll(); if (!u.alive) break;
            if (act.then === 'shoot' && u.ap > 0) { const nxt = TC.AI.decide(st, u); if (nxt.kind === 'shoot' || nxt.kind === 'suppress') { const ev = R.doShoot(st, u, nxt.t, { ability: nxt.kind }); if (ev) await this.playEvents(ev); } else if (nxt.kind === 'melee') { const ev = R.doMelee(st, u, nxt.t); if (ev) await this.playEvents(ev); } else if (nxt.kind === 'overwatch') { R.doOverwatch(st, u); this.refreshUnitView(u); } else if (nxt.kind === 'hunker') { R.doHunker(st, u); this.refreshUnitView(u); } else if (nxt.kind === 'reload') { R.doReload(st, u); } continue; }
            if (act.then === 'melee' && u.ap > 0) { const nxt = TC.AI.decide(st, u); if (nxt.kind === 'melee') { const ev = R.doMelee(st, u, nxt.t); if (ev) await this.playEvents(ev); } else if (nxt.kind === 'hunker') { R.doHunker(st, u); this.refreshUnitView(u); } continue; }
          }
          else if (act.kind === 'shoot' || act.kind === 'suppress') { const ev = R.doShoot(st, u, act.t, { ability: act.kind }); if (!ev) { R.spendAP(u, 1); continue; } if (act.kind === 'suppress') HUD.log(T('logSuppress', { a: R.unitName(u), t: R.unitName(act.t) }), 'enemy'); await this.playEvents(ev); }
          else if (act.kind === 'melee') { const ev = R.doMelee(st, u, act.t); if (!ev) { R.spendAP(u, 1); continue; } await this.playEvents(ev); }
          else if (act.kind === 'overwatch') { R.doOverwatch(st, u); this.refreshUnitView(u); if (u.visible) { HUD.log(T('logOverwatchSet', { a: R.unitName(u) }), 'enemy'); TC.Audio.play('overwatch'); await wait(250); } }
          else if (act.kind === 'hunker') { R.doHunker(st, u); this.refreshUnitView(u); if (u.visible) { HUD.log(T('logHunker', { a: R.unitName(u) }), 'enemy'); await wait(200); } }
          else if (act.kind === 'reload') { R.doReload(st, u); if (u.visible) { TC.Audio.play('reload'); await wait(200); } }
          else break;
          this.refreshAll(); if (R.checkOver(st)) break;
        }
        if (R.checkOver(st)) break;
      }
      this.refreshAll(); if (R.checkOver(st)) { this.gameOver(); return; }
      st.turn++; if (R.checkTimeOut(st)) { this.gameOver(); return; }
      // turn-5 reinforcements if relic still on altar
      if (st.turn === TC.RULES.reinfTurn && !st.turn5Reinf) { st.turn5Reinf = true; st.pendingReinf.push({ units: TC.REINF_TURN5, reason: 'turn5' }); }
      await wait(300); this.startPlayerTurn(false);
    }
    gameOver() {
      const st = this.st; const o = st.over; this.busy = true; HUD.actions(null); HUD.preview(null); HUD.refreshTop(st);
      HUD.banner(o.win ? T('bannerWin') : T('bannerLose'), '', o.win ? '' : 'heretic', 2500); TC.Audio.play(o.win ? 'win' : 'lose');
      const txt = o.win ? (o.reason === 'extract' ? T('winExtract') : T('winWipe')) : (o.reason === 'wipe' ? T('loseWipe') : T('loseTime'));
      this.time.delayedCall(2200, () => {
        HUD.modal(`<h2 class="${o.win ? '' : 'lose'}">${o.win ? T('bannerWin') : T('bannerLose')}</h2><div class="sub">${T('subtitle')}</div><p>${txt}</p><div class="stats"><span>${T('statTurns')}</span><span>${Math.min(st.turn, TC.RULES.turnLimit)}</span><span>${T('statKills')}</span><span>${st.stats.kills}</span><span>${T('statLost')}</span><span>${st.stats.lost}</span><span>${T('statFaith')}</span><span>${st.stats.faithSpent}</span><span>${T('statShrines')}</span><span>${st.stats.shrines} / 3</span></div>`,
          [{ label: T('again'), fn: () => { HUD.closeModal(); this.scene.restart({ seed: (Date.now() & 0xffffff) }); } }, { label: T('menu'), secondary: true, fn: () => { HUD.closeModal(); HUD.show(false); this.scene.start('Menu'); } }]);
      });
    }
    openPauseMenu() {
      const html = `<h2>${T('menuTitle')}</h2><div class="row"><span>${T('language')}</span><div class="toggle" id="lang-toggle"><button data-l="fr" class="${TC.getLang() === 'fr' ? 'on' : ''}">FR</button><button data-l="en" class="${TC.getLang() === 'en' ? 'on' : ''}">EN</button></div></div><div class="row"><span>${T('sound')}</span><div class="toggle" id="snd-toggle"><button data-s="1" class="${!TC.Audio.muted ? 'on' : ''}">${T('on')}</button><button data-s="0" class="${TC.Audio.muted ? 'on' : ''}">${T('off')}</button></div></div>`;
      const m = HUD.modal(html, [
        { label: T('resume'), fn: () => HUD.closeModal() }, { label: T('overview'), secondary: true, fn: () => { HUD.closeModal(); this.overview(); } },
        { label: T('howto'), secondary: true, fn: () => { HUD.modal(HUD.helpHtml(), [{ label: T('back'), fn: () => this.openPauseMenu() }]); } },
        { label: T('restart'), secondary: true, fn: () => { HUD.closeModal(); this.scene.restart({ seed: (Date.now() & 0xffffff) }); } },
        { label: T('quit'), secondary: true, fn: () => { HUD.closeModal(); HUD.show(false); this.scene.start('Menu'); } },
      ]);
      m.querySelectorAll('#lang-toggle button').forEach(b => b.onclick = () => { TC.setLang(b.dataset.l); HUD.refreshStatic(); HUD.refreshTop(this.st); if (this.selected) { HUD.unitCard(this.selected, this.st); HUD.actions(this.selected, this.st, this.mode); } this.openPauseMenu(); });
      m.querySelectorAll('#snd-toggle button').forEach(b => b.onclick = () => { TC.Audio.init(); TC.Audio.setMuted(b.dataset.s === '0'); this.openPauseMenu(); });
    }
    update(t, dt) { if (this.fog1) { this.fog1.tilePositionX += dt * 0.012; this.fog1.tilePositionY += dt * 0.004; this.fog2.tilePositionX -= dt * 0.007; this.noise.tilePositionX = Math.random() * 128; this.noise.tilePositionY = Math.random() * 128; } }
  };
})();
});
