/* =====================================================================
   Monde : entités, pathfinding A*, déplacement du joueur, IA des PNJ.
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const T = DFIN.T;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  DFIN.rnd = rnd; DFIN.pick = pick;

  class World {
    constructor(map) {
      this.map = map;
      this.player = null;
      this.npcs = [];
      this.time = 0;
      this.occupied = {}; // tuile -> entité (réservation légère pour éviter les empilements)
      this._build();
    }

    _build() {
      const P = DFIN.PLAYER;
      this.player = { id: 'player', name: P.name, role: P.role, skin: P.skin, hair: P.hair, shirt: P.shirt,
        x: (this.map.spawn.x + 0.5) * T, y: (this.map.spawn.y + 0.5) * T, face: 'n', walk: null, speed: 118, path: null, player: true, moving: false };
      const seatCounters = {};
      for (const p of DFIN.PEOPLE) {
        const seats = this.map.seats[p.unit] || [];
        const s = seats[p.seat] || seats[(seatCounters[p.unit] = (seatCounters[p.unit] || 0) + 1) % seats.length];
        this.npcs.push({
          id: p.id, data: p, name: p.name, role: p.role, unit: p.unit, skin: p.skin, hair: p.hair, shirt: p.shirt,
          seat: s, x: (s.x + 0.5) * T, y: (s.y + 0.5) * T, face: s.face, walk: null, speed: 70 + Math.random() * 20,
          state: 'seated', timer: rnd(15, 70), path: null, bubble: null, bubbleT: 0, chatT: rnd(6, 30), typing: Math.random() * 10,
          talking: false, poi: null,
        });
      }
    }

    /* ------------------------------------------------ Grille -------- */
    walkable(tx, ty, ent) {
      if (tx < 0 || ty < 0 || tx >= this.map.W || ty >= this.map.H) return false;
      if (!this.map.solid[ty][tx]) return true;
      if (ent && ent.seat && ent.seat.x === tx && ent.seat.y === ty) return true; // son propre siège
      return false;
    }

    findPath(sx, sy, gx, gy, ent) {
      if (sx === gx && sy === gy) return [];
      if (!this.walkable(gx, gy, ent)) return null;
      const W = this.map.W, H = this.map.H;
      const key = (x, y) => y * W + x;
      const open = new Map(); const closed = new Set();
      const g = new Map(); const came = new Map();
      const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
      const start = key(sx, sy); g.set(start, 0); open.set(start, h(sx, sy));
      let iter = 0;
      while (open.size && iter++ < 6000) {
        let best = null, bf = Infinity; for (const [k, f] of open) if (f < bf) { bf = f; best = k; }
        const cx = best % W, cy = (best - cx) / W;
        if (cx === gx && cy === gy) {
          const path = []; let k = best; while (k !== start) { path.push({ x: k % W, y: Math.floor(k / W) }); k = came.get(k); }
          return path.reverse();
        }
        open.delete(best); closed.add(best);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!this.walkable(nx, ny, ent)) continue;
          if (dx && dy && (!this.walkable(cx + dx, cy, ent) || !this.walkable(cx, cy + dy, ent))) continue; // pas de coupe de coin
          const nk = key(nx, ny); if (closed.has(nk)) continue;
          const ng = g.get(best) + ((dx && dy) ? 1.414 : 1);
          if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); came.set(nk, best); open.set(nk, ng + h(nx, ny)); }
        }
      }
      return null;
    }

    tileOf(e) { return { x: Math.floor(e.x / T), y: Math.floor(e.y / T) }; }

    // trouve une tuile praticable adjacente à (tx,ty), la plus proche de l'entité
    adjacentFree(tx, ty, from) {
      let best = null, bd = Infinity;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = tx + dx, ny = ty + dy;
        if (!this.walkable(nx, ny)) continue;
        const d = Math.hypot((nx + 0.5) * T - from.x, (ny + 0.5) * T - from.y) + ((dx && dy) ? 8 : 0);
        if (d < bd) { bd = d; best = { x: nx, y: ny }; }
      }
      return best;
    }

    /* ------------------------------------------------ Mouvement ----- */
    setPath(ent, path) { ent.path = path && path.length ? path : null; }
    goTo(ent, tx, ty) { const t = this.tileOf(ent); const p = this.findPath(t.x, t.y, tx, ty, ent); this.setPath(ent, p); return !!p; }

    followPath(ent, dt) {
      if (!ent.path || !ent.path.length) { ent.path = null; return false; }
      const n = ent.path[0]; const tx = (n.x + 0.5) * T, ty = (n.y + 0.5) * T;
      const dx = tx - ent.x, dy = ty - ent.y; const d = Math.hypot(dx, dy);
      const step = ent.speed * dt;
      if (d <= step) { ent.x = tx; ent.y = ty; ent.path.shift(); if (!ent.path.length) { ent.path = null; return false; } }
      else { ent.x += dx / d * step; ent.y += dy / d * step; }
      if (Math.abs(dx) > Math.abs(dy)) ent.face = dx > 0 ? 'e' : 'w'; else ent.face = dy > 0 ? 's' : 'n';
      return true;
    }

    // déplacement libre du joueur (clavier) avec collision cercle/grille
    movePlayer(vx, vy, dt) {
      const p = this.player; const r = 9;
      const tryMove = (nx, ny) => {
        for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, -r], [0, r], [-r, 0], [r, 0]]) {
          const tx = Math.floor((nx + ox) / T), ty = Math.floor((ny + oy) / T);
          if (!this.walkable(tx, ty)) return false;
        }
        return true;
      };
      const len = Math.hypot(vx, vy); if (len === 0) return false;
      vx /= len; vy /= len;
      const nx = p.x + vx * p.speed * dt, ny = p.y + vy * p.speed * dt;
      let moved = false;
      if (tryMove(nx, p.y)) { p.x = nx; moved = true; }
      if (tryMove(p.x, ny)) { p.y = ny; moved = true; }
      if (Math.abs(vx) > Math.abs(vy)) p.face = vx > 0 ? 'e' : 'w'; else p.face = vy > 0 ? 's' : 'n';
      p.path = null;
      return moved;
    }

    /* ------------------------------------------------ PNJ ----------- */
    npcBubble(n, text, dur) { n.bubble = text; n.bubbleT = dur || 3.2; }

    randomPoi(n) {
      const P = this.map.poi; const list = [];
      list.push(P.coffee, P.coffee, P.copier, n.unit === 'pil' ? P.corridor : P.board);
      if (n.x < 26 * T) list.push(P.water1); else list.push(P.water2);
      // visite d'un autre pod
      const pods = Object.keys(this.map.pods).filter(k => k !== n.unit && k !== 'caf');
      const [ox, oy] = this.map.pods[pick(pods)]; list.push({ x: ox + 4, y: oy + 5 });
      if (n.unit !== 'pil' && Math.random() < 0.25) list.push(P.cockpit);
      return pick(list);
    }

    updateNpc(n, dt) {
      if (n.bubbleT > 0) { n.bubbleT -= dt; if (n.bubbleT <= 0) n.bubble = null; }
      if (n.talking) { n.walk = null; return; }
      n.chatT -= dt;
      if (n.chatT <= 0) { n.chatT = rnd(14, 45); if (Math.random() < 0.7) this.npcBubble(n, pick(DFIN.CHATTER[n.unit] || DFIN.CHATTER.caf)); }
      switch (n.state) {
        case 'seated':
          n.typing += dt; n.walk = null; n.face = n.seat.face; n.timer -= dt;
          if (n.timer <= 0) {
            const poi = this.randomPoi(n); n.poi = poi;
            if (this.goTo(n, poi.x, poi.y)) { n.state = 'walking'; } else n.timer = rnd(10, 30);
          }
          break;
        case 'walking': {
          const moving = this.followPath(n, dt);
          n.walk = moving ? ((n.walk || 0) + dt * 2.2) % 1 : null;
          if (!moving) { n.state = 'idle'; n.timer = rnd(4, 14); n.walk = null; if (n.poi === this.map.poi.coffee) n.face = 'e'; else if (n.poi === this.map.poi.board) n.face = 'n'; else if (n.poi === this.map.poi.copier) n.face = 's'; }
          break;
        }
        case 'idle':
          n.timer -= dt; n.walk = null;
          if (n.timer <= 0) { if (this.goTo(n, n.seat.x, n.seat.y)) n.state = 'returning'; else n.timer = 3; }
          break;
        case 'returning': {
          const moving = this.followPath(n, dt);
          n.walk = moving ? ((n.walk || 0) + dt * 2.2) % 1 : null;
          if (!moving) { n.x = (n.seat.x + 0.5) * T; n.y = (n.seat.y + 0.5) * T; n.state = 'seated'; n.face = n.seat.face; n.timer = rnd(25, 110); }
          break;
        }
      }
    }

    isSeated(n) { return n.state === 'seated' || (n.talking && n._wasSeated); }

    startTalk(n) { n.talking = true; n._wasSeated = n.state === 'seated'; n.path = null; const p = this.player; const dx = p.x - n.x, dy = p.y - n.y; n.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n'); p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'w' : 'e') : (dy > 0 ? 'n' : 's'); n.bubble = null; }
    endTalk(n) { n.talking = false; if (n._wasSeated) { n.state = 'seated'; n.face = n.seat.face; n.timer = Math.max(n.timer, 12); } else if (n.state === 'seated') { n.state = 'idle'; n.timer = 2; } }

    update(dt) {
      this.time += dt;
      for (const n of this.npcs) this.updateNpc(n, dt);
    }

    /* ------------------------------------------------ Proximité ----- */
    nearestNpc(maxDist) {
      const p = this.player; let best = null, bd = maxDist * T;
      for (const n of this.npcs) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = n; } }
      return best;
    }
    nearestObject(maxDist) {
      const p = this.player; let best = null, bd = maxDist * T;
      for (const o of this.map.objects) {
        if (!o.id) continue;
        const cx = (o.x + o.w / 2) * T, cy = (o.y + o.h / 2) * T;
        const ddx = Math.max(o.x * T - p.x, 0, p.x - (o.x + o.w) * T), ddy = Math.max(o.y * T - p.y, 0, p.y - (o.y + o.h) * T);
        const d = Math.hypot(ddx, ddy); if (d < bd) { bd = d; best = o; } void cx; void cy;
      }
      return best;
    }
  }

  DFIN.World = World;
})();
