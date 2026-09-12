/* =====================================================================
   Rendu : couche statique (sol, murs, mobilier), couche dynamique
   (personnages, bulles, surbrillance), mur d'écrans vivant, minimap.
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const T = DFIN.T;
  const A = DFIN.art;

  class Renderer {
    constructor(canvas, map, world) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.map = map; this.world = world;
      this.cam = { x: world.player.x, y: world.player.y, zoom: 1.7 };
      this.targetZoom = this.cam.zoom;
      this.static = document.createElement('canvas'); this.static.width = map.W * T; this.static.height = map.H * T;
      this._renderStatic();
      this.screens = {}; // id -> canvas
      for (const o of map.objects) if (o.type === 'screen') { const c = document.createElement('canvas'); c.width = o.w * T * 3; c.height = 3 * T * 3; this.screens[o.id] = { canvas: c, obj: o }; }
      this.screenT = 0; this.tick = 0;
      this.highlight = null; // {x,y,w,h} en tuiles
      this.minimap = null;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(window.innerWidth * dpr); this.canvas.height = Math.floor(window.innerHeight * dpr);
      this.dpr = dpr;
      if (window.innerWidth < 700) this.targetZoom = Math.min(this.targetZoom, 1.4);
    }

    _renderStatic() {
      const ctx = this.static.getContext('2d'); const m = this.map;
      for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
        const t = m.tiles[y][x];
        if (t.t === 'floor') A.drawFloor(ctx, t, x, y); else if (t.t === 'door') A.drawDoor(ctx, x, y);
      }
      // ombres portées sous les murs (côté sud)
      for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) { const t = m.tiles[y][x]; if ((t.t === 'wall' || t.t === 'glass') && y + 1 < m.H && m.tiles[y + 1][x].t !== 'wall') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x * T, (y + 1) * T, T, 6); } }
      // sols : tapis / objets non solides d'abord
      for (const o of m.objects) if (o.type === 'rug' || o.type === 'sign') A.drawObject(ctx, o);
      for (const o of m.objects) if (o.type !== 'rug' && o.type !== 'sign' && o.type !== 'screen') A.drawObject(ctx, o);
      for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) { const t = m.tiles[y][x]; if (t.t === 'wall' || t.t === 'glass') A.drawWall(ctx, m, x, y); }
      for (const o of m.objects) if (o.type === 'screen') A.drawObject(ctx, o);
      // halo sous le mur d'écrans
      const g = ctx.createLinearGradient(0, 3 * T, 0, 7 * T); g.addColorStop(0, 'rgba(79,179,217,0.30)'); g.addColorStop(1, 'rgba(79,179,217,0)');
      ctx.fillStyle = g; ctx.fillRect(12 * T, 3 * T, 28 * T, 4 * T);
    }

    /* -------------------------------------------- Mur d'écrans ----- */
    renderScreens(game) {
      const now = performance.now() / 1000; this.screenT = now;
      const fmtClock = game.clockString();
      for (const id in this.screens) {
        const { canvas, obj } = this.screens[id]; const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#0b1420'; ctx.fillRect(0, 0, w, h);
        // scanlines
        ctx.fillStyle = 'rgba(255,255,255,0.025)'; for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
        ctx.textBaseline = 'top';
        if (obj.panel === 'main') this._mainScreen(ctx, w, h, now, fmtClock, game);
        else if (obj.panel === 'left') this._leftScreen(ctx, w, h, now, game);
        else this._rightScreen(ctx, w, h, now, game);
        // reflet
        const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    }
    _mainScreen(ctx, w, h, now, clock, game) {
      ctx.fillStyle = '#4fb3d9'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText('SGP · DIRECTION FINANCIÈRE — COCKPIT DE PILOTAGE', 18, 12);
      ctx.fillStyle = '#c9a34a'; ctx.font = 'bold 26px "Courier New", monospace'; ctx.textAlign = 'right'; ctx.fillText(clock, w - 18, 10); ctx.textAlign = 'left';
      ctx.fillStyle = '#9aa7b5'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText('12 SEPT. 2026 · PLATEAU F · DONNÉES FICTIVES (DÉMO)', 18, 40);
      const kp = DFIN.REPORTS.pil.kpis; const tw = (w - 36) / kp.length;
      kp.forEach((k, i) => {
        const x = 18 + i * tw; ctx.fillStyle = 'rgba(255,255,255,0.06)'; DFIN.rr(ctx, x, 62, tw - 10, 62, 6); ctx.fill();
        ctx.fillStyle = k.t === 'warn' ? '#e0a63f' : k.t === 'bad' ? '#e05a5a' : '#6fd07a'; ctx.fillRect(x, 62, 4, 62);
        ctx.fillStyle = '#9aa7b5'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText(k.l.toUpperCase(), x + 12, 68, tw - 24);
        ctx.fillStyle = '#f2f5f8'; ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillText(k.v, x + 12, 84);
        if (k.s) { ctx.fillStyle = '#9aa7b5'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(k.s, x + 12, 112, tw - 24); }
      });
      // courbe trésorerie
      const s = DFIN.REPORTS.tre.chart; const d = s.series[0].data; const cx0 = 18, cy0 = 136, cw = w * 0.62, ch = h - cy0 - 34;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(cx0, cy0, cw, ch);
      ctx.fillStyle = '#9aa7b5'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('TRÉSORERIE FIN DE MOIS (M€) — RÉEL ET PRÉVISION', cx0 + 8, cy0 + 4);
      const mn = 1200, mx = 3400; const px = i => cx0 + 10 + i * (cw - 20) / (d.length - 1), py = v => cy0 + ch - 8 - (v - mn) / (mx - mn) * (ch - 28);
      ctx.strokeStyle = 'rgba(224,90,90,0.7)'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cx0 + 10, py(1500)); ctx.lineTo(cx0 + cw - 10, py(1500)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#3aa76d'; ctx.lineWidth = 3; ctx.beginPath(); d.forEach((v, i) => i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))); ctx.stroke(); ctx.lineWidth = 1;
      d.forEach((v, i) => { ctx.fillStyle = i >= 6 ? '#0b1420' : '#3aa76d'; ctx.strokeStyle = '#3aa76d'; ctx.beginPath(); ctx.arc(px(i), py(v), 4, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9aa7b5'; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(s.labels[i], px(i), cy0 + ch - 12); ctx.textAlign = 'left'; });
      const blink = Math.floor(now * 2) % 2; ctx.fillStyle = blink ? '#e05a5a' : 'rgba(224,90,90,0.4)'; ctx.font = 'bold 11px system-ui'; ctx.fillText('● SEUIL 1 500', cx0 + cw - 90, py(1500) - 14);
      // panneau droit : missions / échéance
      const rx = cx0 + cw + 14, rw = w - rx - 18;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(rx, cy0, rw, ch);
      ctx.fillStyle = '#9aa7b5'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('PROCHAINE ÉCHÉANCE', rx + 8, cy0 + 4);
      const ev = DFIN.CALENDAR[0]; ctx.fillStyle = '#f2f5f8'; ctx.font = 'bold 16px system-ui'; ctx.fillText('COMEX — 11:00', rx + 8, cy0 + 22);
      ctx.fillStyle = '#c9a34a'; ctx.font = 'bold 30px "Courier New", monospace'; ctx.fillText(game.countdownTo(11, 0), rx + 8, cy0 + 44);
      ctx.fillStyle = '#9aa7b5'; ctx.font = '12px system-ui'; ctx.fillText('Puis : ' + ev.d.slice(8) + '/' + ev.d.slice(5, 7) + ' · ' + ev.n, rx + 8, cy0 + 84, rw - 16);
      const m = game.mission; if (m) { ctx.fillStyle = '#4fb3d9'; ctx.font = 'bold 12px system-ui'; ctx.fillText('MISSION : ' + m.def.title.toUpperCase(), rx + 8, cy0 + 104, rw - 16); m.def.items.forEach((it, i) => { const done = m.done[it.id]; ctx.fillStyle = done ? '#6fd07a' : '#9aa7b5'; ctx.fillText((done ? '✔ ' : '○ ') + it.label, rx + 8, cy0 + 122 + i * 16, rw - 16); }); }
      // bandeau défilant
      ctx.fillStyle = '#122033'; ctx.fillRect(0, h - 28, w, 28);
      ctx.fillStyle = '#c9a34a'; ctx.font = 'bold 16px "Courier New", monospace';
      const txt = DFIN.TICKER.join('     ◆     ') + '     ◆     '; const tw2 = ctx.measureText(txt).width; const off = (now * 60) % tw2;
      ctx.fillText(txt, -off, h - 22); ctx.fillText(txt, -off + tw2, h - 22);
    }
    _leftScreen(ctx, w, h, now, game) {
      ctx.fillStyle = '#e07a3f'; ctx.font = 'bold 18px system-ui'; ctx.fillText('CALENDRIER DE GESTION', 14, 10);
      ctx.fillStyle = '#9aa7b5'; ctx.font = '12px system-ui'; ctx.fillText('PROCHAINES ÉCHÉANCES', 14, 34);
      const today = DFIN.COMPANY.today; const list = DFIN.CALENDAR.slice(0, 7);
      list.forEach((e, i) => {
        const y = 56 + i * 18; const dd = new Date(e.d); const days = Math.round((dd - today) / 864e5);
        const c = DFIN.CAL_TYPES[e.t].c; ctx.fillStyle = c; ctx.fillRect(14, y + 3, 6, 10);
        ctx.fillStyle = days <= 3 ? '#e0a63f' : '#f2f5f8'; ctx.font = 'bold 12px "Courier New", monospace'; ctx.fillText('J' + (days >= 0 ? '+' : '') + days, 28, y);
        ctx.fillStyle = '#9aa7b5'; ctx.font = '12px system-ui'; ctx.fillText(e.d.slice(8) + '/' + e.d.slice(5, 7), 70, y);
        ctx.fillStyle = '#d5dbe2'; ctx.fillText(e.n, 114, y, w - 128);
      });
      ctx.fillStyle = '#122033'; ctx.fillRect(0, h - 26, w, 26); ctx.fillStyle = '#9aa7b5'; ctx.font = '12px system-ui'; ctx.fillText('MAJ ' + game.clockString() + ' · FLUX SAP OK · ' + (Math.floor(now) % 2 ? '●' : '○') + ' LIVE', 14, h - 20);
    }
    _rightScreen(ctx, w, h, now, game) {
      ctx.fillStyle = '#e05a5a'; ctx.font = 'bold 18px system-ui'; ctx.fillText('ALERTES & VIGILANCE', 14, 10);
      const alerts = [].concat(DFIN.REPORTS.inv.alerts[0], DFIN.REPORTS.tre.alerts[0], DFIN.REPORTS.sif.alerts[1], DFIN.REPORTS.cpt.alerts[0], DFIN.REPORTS.cir.alerts[0], DFIN.REPORTS.fis.alerts[0]);
      alerts.forEach((a, i) => {
        const y = 40 + i * 20; const c = a.t === 'bad' ? '#e05a5a' : a.t === 'warn' ? '#e0a63f' : '#6fd07a';
        const blink = a.t === 'bad' && Math.floor(now * 3) % 2; ctx.fillStyle = blink ? '#ffffff' : c; ctx.beginPath(); ctx.arc(20, y + 7, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#d5dbe2'; ctx.font = '12px system-ui'; ctx.fillText(a.m, 34, y, w - 48);
      });
      // mini barres CAT par ligne
      const ch = DFIN.REPORTS.inv.chart; const bx = 14, by = 168, bw = w - 28, bh = h - by - 30;
      ctx.fillStyle = '#9aa7b5'; ctx.font = '11px system-ui'; ctx.fillText('CAT PAR LIGNE (Md€) — OBJECTIF / ESTIMÉ', bx, by - 14);
      const n = ch.labels.length; const gw = bw / n; const mx = 8;
      for (let i = 0; i < n; i++) {
        const o = ch.series[0].data[i], e = ch.series[1].data[i];
        ctx.fillStyle = '#4a5563'; ctx.fillRect(bx + i * gw + 4, by + bh - o / mx * bh, gw / 2 - 5, o / mx * bh);
        ctx.fillStyle = e > o ? '#e05a5a' : '#6fd07a'; ctx.fillRect(bx + i * gw + gw / 2, by + bh - e / mx * bh, gw / 2 - 5, e / mx * bh);
        ctx.fillStyle = '#9aa7b5'; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(ch.labels[i], bx + i * gw + gw / 2, by + bh + 4); ctx.textAlign = 'left';
      }
    }

    /* -------------------------------------------- Caméra ----------- */
    updateCamera(dt) {
      const p = this.world.player; const k = 1 - Math.pow(0.002, dt);
      this.cam.x += (p.x - this.cam.x) * k; this.cam.y += (p.y - this.cam.y) * k;
      this.cam.zoom += (this.targetZoom - this.cam.zoom) * (1 - Math.pow(0.001, dt));
      const vw = this.canvas.width / this.dpr / this.cam.zoom, vh = this.canvas.height / this.dpr / this.cam.zoom;
      const maxX = this.map.W * T - vw / 2, maxY = this.map.H * T - vh / 2;
      if (vw < this.map.W * T) this.cam.x = Math.max(vw / 2, Math.min(maxX, this.cam.x)); else this.cam.x = this.map.W * T / 2;
      const padTop = 60 / this.cam.zoom;
      if (vh < this.map.H * T + padTop) this.cam.y = Math.max(vh / 2 - padTop, Math.min(maxY, this.cam.y)); else this.cam.y = this.map.H * T / 2;
    }
    screenToWorld(sx, sy) { const z = this.cam.zoom; const vw = this.canvas.width / this.dpr, vh = this.canvas.height / this.dpr; return { x: (sx - vw / 2) / z + this.cam.x, y: (sy - vh / 2) / z + this.cam.y }; }
    worldToScreen(wx, wy) { const z = this.cam.zoom; const vw = this.canvas.width / this.dpr, vh = this.canvas.height / this.dpr; return { x: (wx - this.cam.x) * z + vw / 2, y: (wy - this.cam.y) * z + vh / 2 }; }

    /* -------------------------------------------- Frame ------------ */
    draw(game, dt) {
      const ctx = this.ctx; const c = this.canvas; const z = this.cam.zoom * this.dpr;
      this.tick += dt;
      if (performance.now() / 1000 - this.screenT > 0.2) this.renderScreens(game);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1a1d23'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(z, 0, 0, z, Math.round(c.width / 2 - this.cam.x * z), Math.round(c.height / 2 - this.cam.y * z));
      ctx.drawImage(this.static, 0, 0);
      // contenu des écrans
      ctx.imageSmoothingEnabled = true;
      for (const id in this.screens) { const { canvas, obj } = this.screens[id]; ctx.drawImage(canvas, obj.x * T, (obj.y - 1) * T, obj.w * T, 3 * T); }
      // petits voyants animés (imprimantes, serveurs, machine à café)
      const bl = Math.floor(this.tick * 2) % 2;
      for (const o of this.map.objects) { if (o.type === 'printer' && bl) { ctx.fillStyle = '#6fd07a'; ctx.fillRect(o.x * T + 22, o.y * T + 18, 3, 3); } if (o.type === 'server') { ctx.fillStyle = (Math.floor(this.tick * 6 + o.y) % 2) ? '#4fb3d9' : '#0b1420'; ctx.fillRect(o.x * T + 21, o.y * T + 9, 2, 1); } }
      // surbrillance de l'interactable
      if (this.highlight) { const hl = this.highlight; const a = 0.5 + Math.sin(this.tick * 5) * 0.25; ctx.strokeStyle = `rgba(255,220,120,${a})`; ctx.lineWidth = 2; DFIN.rr(ctx, hl.x * T + 2, hl.y * T + 2 - (hl.tall ? T : 0), hl.w * T - 4, hl.h * T - 4 + (hl.tall ? T : 0), 4); ctx.stroke(); ctx.lineWidth = 1; }
      // chemin du joueur (clic)
      const p = this.world.player;
      if (p.path && p.path.length) { const last = p.path[p.path.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc((last.x + 0.5) * T, (last.y + 0.5) * T, 6 + Math.sin(this.tick * 6) * 2, 0, 7); ctx.stroke(); }
      // personnages triés par y
      const ents = this.world.npcs.concat([p]).sort((a, b) => a.y - b.y);
      for (const e of ents) {
        const seated = e.player ? false : this.world.isSeated(e);
        A.drawPerson(ctx, e.x, e.y, e, { face: e.face, walk: e.walk, sitting: seated, typing: seated && !e.talking ? e.typing : null, player: !!e.player });
      }
      // marqueurs de mission au-dessus des têtes
      for (const n of this.world.npcs) { const mk = game.markerFor(n); if (mk) { const bob = Math.sin(this.tick * 4) * 2; ctx.fillStyle = mk === '!' ? '#c9a34a' : '#4fb3d9'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(mk, n.x, n.y - 20 + bob); } }
      // bulles
      for (const n of this.world.npcs) if (n.bubble) this._bubble(ctx, n.x, n.y - 24, n.bubble);
      // étiquettes de nom (proches)
      const near = this.world.nearestNpc(2.2);
      for (const n of this.world.npcs) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < 3.2 * T) { ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = n === near ? '#ffe9a8' : 'rgba(255,255,255,0.75)'; ctx.fillText(n.name.split(' ')[0], n.x, n.y + 20); } }
      // assombrissement du cockpit hors halo + vignette légère
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this._drawMinimap(game);
    }

    _bubble(ctx, x, y, text) {
      ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(text).width + 12, h = 16;
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; DFIN.rr(ctx, x - w / 2, y - h, w, h, 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.fill();
      ctx.fillStyle = '#1a1d23'; ctx.fillText(text, x, y - h / 2 + 0.5);
    }

    _drawMinimap(game) {
      const mm = document.getElementById('minimap'); if (!mm) return;
      const s = 3; if (mm.width !== this.map.W * s) { mm.width = this.map.W * s; mm.height = this.map.H * s; }
      const ctx = mm.getContext('2d'); const m = this.map;
      if (!this._mmBase) {
        const b = document.createElement('canvas'); b.width = mm.width; b.height = mm.height; const bc = b.getContext('2d');
        for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
          const t = m.tiles[y][x]; let col = '#262a32';
          if (t.t === 'floor' || t.t === 'door') { col = '#5a6472'; if (t.unit) { const u = DFIN.UNITS.find(u => u.id === t.unit); col = DFIN.mix('#5a6472', u.color, 0.55); } if (t.f === 'tile') col = '#8a8f99'; if (t.f === 'carpet2') col = '#7a4b52'; }
          else if (t.t === 'glass') col = '#7fb8d8';
          bc.fillStyle = col; bc.fillRect(x * s, y * s, s, s);
        }
        for (const o of m.objects) if (o.solid && o.type !== 'plant') { bc.fillStyle = 'rgba(0,0,0,0.25)'; bc.fillRect(o.x * s, o.y * s, o.w * s, o.h * s); }
        this._mmBase = b;
      }
      ctx.drawImage(this._mmBase, 0, 0);
      for (const n of this.world.npcs) { const mk = game.markerFor(n); ctx.fillStyle = mk === '!' ? '#c9a34a' : mk === '?' ? '#4fb3d9' : '#e8e2d4'; ctx.fillRect(Math.floor(n.x / T) * s, Math.floor(n.y / T) * s, s, s); }
      const p = this.world.player; ctx.fillStyle = '#fff'; ctx.fillRect(Math.floor(p.x / T) * s - 1, Math.floor(p.y / T) * s - 1, s + 2, s + 2);
      // cadre de la vue
      const vw = this.canvas.width / this.dpr / this.cam.zoom, vh = this.canvas.height / this.dpr / this.cam.zoom;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect((this.cam.x - vw / 2) / T * s, (this.cam.y - vh / 2) / T * s, vw / T * s, vh / T * s);
    }
  }

  DFIN.Renderer = Renderer;
})();
