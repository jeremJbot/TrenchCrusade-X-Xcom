/* Trench Crusade × XCOM — pure game rules (no rendering) */
window.TC = window.TC || {};
(function () {
  const R = TC.RULES, W = TC.WEAPONS, A = TC.ABILITIES, UT = TC.UNIT_TYPES;

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const Rules = {};
  TC.Rules = Rules;

  // ---------- state ----------
  Rules.newState = function (seed) {
    const rng = mulberry32(seed || (Date.now() & 0xffffffff));
    const rows = TC.MAP_ROWS, h = rows.length, w = rows[0].length;
    const cells = [];
    for (let y = 0; y < h; y++) { cells[y] = []; for (let x = 0; x < w; x++) { const ch = rows[y][x]; cells[y][x] = { x, y, ch, terr: TC.TERRAIN[ch], prayed: false, dirty: false }; } }
    const st = {
      grid: { w, h, cells }, units: [], turn: 1, phase: 'na', faith: R.faithStart, blood: 0,
      relic: { state: 'altar', x: 0, y: 0, bearer: null }, pendingReinf: [], bellsRung: false, turn5Reinf: false, over: null,
      stats: { kills: 0, lost: 0, faithSpent: 0, shrines: 0 }, rng, nextId: 1, log: [],
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cells[y][x].terr.altar) { st.relic.x = x; st.relic.y = y; }
    // deploy
    const naCells = [], hCells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = cells[y][x].terr.deploy; if (d === 'na') naCells.push(cells[y][x]); if (d === 'h') hCells.push(cells[y][x]); }
    naCells.sort((a, b) => (b.x + b.y) - (a.x + a.y)); hCells.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const pick = (arr) => arr.find(c => !Rules.unitAt(st, c.x, c.y)) || arr[0];
    TC.ROSTER_NA.forEach((r) => Rules.spawnUnit(st, r.type, r.name, pick(naCells)));
    TC.ROSTER_H.forEach((r) => Rules.spawnUnit(st, r.type, null, pick(hCells)));
    return st;
  };

  Rules.spawnUnit = function (st, type, nameKey, cell) {
    const d = UT[type];
    const u = {
      id: st.nextId++, type, def: d, faction: d.faction, nameKey: nameKey || null, x: cell.x, y: cell.y, hp: d.hp, maxHp: d.hp, ap: R.apPerTurn,
      ammo: {}, grenades: d.grenades || 0, statuses: {}, cooldowns: {}, facing: d.faction === 'na' ? -1 : 1, alive: true, overwatch: false, hunkered: false, hasRelic: false, acted: false,
    };
    d.weapons.forEach(wid => { const w = W[wid]; if (w.ammo) u.ammo[wid] = w.ammo; });
    st.units.push(u); return u;
  };

  Rules.unitName = function (u) { if (u.nameKey) { const n = TC.TN(u.nameKey); if (n) return n; } return TC.TU(u.type); };
  Rules.inb = (st, x, y) => x >= 0 && y >= 0 && x < st.grid.w && y < st.grid.h;
  Rules.cell = (st, x, y) => (Rules.inb(st, x, y) ? st.grid.cells[y][x] : null);
  Rules.unitAt = (st, x, y) => st.units.find(u => u.alive && u.x === x && u.y === y) || null;
  Rules.alive = (st, f) => st.units.filter(u => u.alive && (!f || u.faction === f));
  Rules.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  Rules.cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  Rules.rand = (st) => st.rng();
  Rules.randInt = (st, a, b) => a + Math.floor(st.rng() * (b - a + 1));

  const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  Rules.DIRS8 = DIRS8;

  Rules.effMob = function (u) { let m = u.def.mob; if (u.statuses.mutated) m += R.mutateMob; if (u.hasRelic) m -= R.relicMobPenalty; return Math.max(1, m); };
  Rules.effAim = function (u) { let a = u.def.aim; if (u.statuses.blessed) a += R.blessAim; if (u.statuses.cursed) a -= R.curseAim; if (u.statuses.suppressed) a -= R.suppressAim; return a; };
  Rules.effDef = function (u) { let d = u.def.def; if (u.statuses.blessed) d += R.blessDef; return d; };
  Rules.weapon = (u, i) => W[u.def.weapons[i || 0]];
  Rules.rangedWeapon = (u) => { const id = u.def.weapons.find(w => W[w].type === 'ranged'); return id ? W[id] : null; };
  Rules.meleeWeapon = (u) => { const id = u.def.weapons.find(w => W[w].type === 'melee'); return id ? W[id] : null; };
  Rules.flameWeapon = (u) => { const id = u.def.weapons.find(w => W[w].type === 'flame'); return id ? W[id] : null; };

  // ---------- movement ----------
  Rules.walkable = function (st, x, y, mover) {
    const c = Rules.cell(st, x, y); if (!c || !c.terr.walk) return false;
    if (st.relic.state === 'ground' && st.relic.x === x && st.relic.y === y) return true;
    return true;
  };
  // Dijkstra reachable set. Returns Map "x,y" -> {cost, px, py}
  Rules.reachable = function (st, u, budget) {
    const out = new Map(); const key = (x, y) => x + ',' + y;
    const open = [{ x: u.x, y: u.y, cost: 0 }]; out.set(key(u.x, u.y), { cost: 0, px: -1, py: -1 });
    while (open.length) {
      open.sort((a, b) => a.cost - b.cost); const cur = open.shift();
      const rec = out.get(key(cur.x, cur.y)); if (rec.cost < cur.cost) continue;
      for (const [dx, dy] of DIRS8) {
        const nx = cur.x + dx, ny = cur.y + dy; if (!Rules.walkable(st, nx, ny, u)) continue;
        if (dx && dy) { if (!Rules.walkable(st, cur.x + dx, cur.y) || !Rules.walkable(st, cur.x, cur.y + dy)) continue; }
        const occ = Rules.unitAt(st, nx, ny); if (occ && occ.faction !== u.faction) continue;
        const c = Rules.cell(st, nx, ny); const step = c.terr.cost * ((dx && dy) ? 1.45 : 1);
        const nc = cur.cost + step; if (nc > budget + 1e-6) continue;
        const k = key(nx, ny); const prev = out.get(k);
        if (!prev || nc < prev.cost - 1e-9) { out.set(k, { cost: nc, px: cur.x, py: cur.y }); open.push({ x: nx, y: ny, cost: nc }); }
      }
    }
    // cannot end on an occupied tile (except own)
    for (const [k, v] of out) { const [x, y] = k.split(',').map(Number); const occ = Rules.unitAt(st, x, y); if (occ && occ !== u) v.blocked = true; }
    return out;
  };
  Rules.moveBudget = function (u, ap) { const m = Rules.effMob(u); return ap >= 2 ? m * R.dashMult : (ap >= 1 ? m : 0); };
  Rules.pathFrom = function (reach, x, y) {
    const path = []; let k = x + ',' + y; let r = reach.get(k); if (!r) return null;
    while (r && r.px >= 0) { path.unshift({ x, y }); x = r.px; y = r.py; r = reach.get(x + ',' + y); }
    return path;
  };
  Rules.apForCost = function (u, cost) { const m = Rules.effMob(u); return cost <= m + 1e-6 ? 1 : 2; };

  // ---------- vision ----------
  function lineCells(x0, y0, x1, y1) { // supercover-ish Bresenham
    const cells = []; const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0); const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy; let x = x0, y = y0;
    while (true) { cells.push([x, y]); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
    return cells;
  }
  Rules.rawLOS = function (st, x0, y0, x1, y1) {
    const cells = lineCells(x0, y0, x1, y1);
    for (let i = 1; i < cells.length - 1; i++) { const c = Rules.cell(st, cells[i][0], cells[i][1]); if (!c || c.terr.los) return false; }
    // also check the mirrored line (symmetry)
    const cells2 = lineCells(x1, y1, x0, y0);
    for (let i = 1; i < cells2.length - 1; i++) { const c = Rules.cell(st, cells2[i][0], cells2[i][1]); if (!c || c.terr.los) return false; }
    return true;
  };
  // LOS with peeking: from origin or its walkable orthogonal neighbours
  Rules.hasLOS = function (st, x0, y0, x1, y1) {
    if (Rules.rawLOS(st, x0, y0, x1, y1)) return true;
    for (const [dx, dy] of DIRS4) { const nx = x0 + dx, ny = y0 + dy; const c = Rules.cell(st, nx, ny); if (c && c.terr.walk && Rules.rawLOS(st, nx, ny, x1, y1)) return true; }
    return false;
  };
  Rules.canSee = function (st, u, t) { return Rules.dist(u.x, u.y, t.x, t.y) <= u.def.sight && Rules.hasLOS(st, u.x, u.y, t.x, t.y); };
  Rules.visibleTo = function (st, faction, t) { if (t.faction === faction) return true; return Rules.alive(st, faction).some(u => Rules.canSee(st, u, t)); };
  Rules.visibleEnemies = function (st, u) { return Rules.alive(st, u.faction === 'na' ? 'h' : 'na').filter(t => Rules.canSee(st, u, t)); };

  // ---------- cover ----------
  Rules.coverAgainst = function (st, t, ax, ay) {
    const dx = Math.sign(ax - t.x), dy = Math.sign(ay - t.y); let cov = 0;
    const chk = (x, y) => { const c = Rules.cell(st, x, y); if (c && c.terr.cover > cov) cov = c.terr.cover; };
    if (dx) chk(t.x + dx, t.y); if (dy) chk(t.x, t.y + dy);
    const own = Rules.cell(st, t.x, t.y); if (own && own.terr.trench && cov < 1) { const ac = Rules.cell(st, ax, ay); if (!(ac && ac.terr.trench)) cov = 1; }
    if (t.hunkered && cov > 0) cov = Math.min(2, cov + 1);
    return cov;
  };
  Rules.coverValue = (cov, hunkered) => cov === 0 ? 0 : (cov === 1 ? R.coverHalf : R.coverFull) + (hunkered ? 20 : 0);

  // ---------- attack maths ----------
  Rules.attackPreview = function (st, a, t, w, opts) {
    opts = opts || {}; const dist = Rules.dist(a.x, a.y, t.x, t.y); const res = { ok: true, reason: null, dist, weapon: w };
    if (w.type === 'melee') {
      if (Rules.cheb(a.x, a.y, t.x, t.y) > 1) return { ok: false, reason: 'range' };
      let hit = w.acc + Rules.effAim(a) + 10 - Rules.effDef(t); hit = Math.max(5, Math.min(95, hit));
      let crit = w.crit; if (t.hunkered) crit = 0;
      return Object.assign(res, { hit, crit, cover: 0, flanked: false, dmg: [Math.max(1, w.dmg[0] + (a.statuses.mutated ? R.mutateDmg : 0) - t.def.armor), Math.max(1, w.dmg[1] + (a.statuses.mutated ? R.mutateDmg : 0) - t.def.armor)] });
    }
    if (dist > w.maxRange + 1e-9) return { ok: false, reason: 'range' };
    if (!opts.ignoreLOS && !Rules.hasLOS(st, a.x, a.y, t.x, t.y)) return { ok: false, reason: 'los' };
    if (!opts.noAmmo && a.ammo[w.id] !== undefined && a.ammo[w.id] <= 0) return { ok: false, reason: 'ammo' };
    const cov = opts.ignoreCover ? 0 : Rules.coverAgainst(st, t, a.x, a.y);
    let hit = w.acc + Rules.effAim(a) - Rules.effDef(t) - Rules.coverValue(cov, t.hunkered);
    if (dist > w.range) hit -= Math.ceil(dist - w.range) * R.rangePenalty;
    if (w.close && dist <= 3) hit += R.closeBonus;
    if (opts.aimBonus) hit += opts.aimBonus; if (opts.overwatch) hit -= R.overwatchPenalty;
    hit = Math.max(5, Math.min(95, Math.round(hit)));
    const flanked = cov === 0; let crit = w.crit + (flanked ? R.flankCrit : 0) + (opts.critBonus || 0); if (t.hunkered) crit = 0; crit = Math.max(0, Math.min(100, crit));
    const bonus = a.statuses.mutated ? R.mutateDmg : 0;
    return Object.assign(res, { hit, crit, cover: cov, flanked, dmg: [Math.max(1, w.dmg[0] + bonus - t.def.armor), Math.max(1, w.dmg[1] + bonus - t.def.armor)] });
  };

  Rules.damage = function (st, t, dmg, src) {
    const before = t.hp; t.hp = Math.max(0, t.hp - dmg); const ev = { type: 'damage', t, dmg, killed: false, src: src || null };
    if (t.hp <= 0 && t.alive) { ev.killed = true; Rules.kill(st, t, ev); }
    return ev;
  };
  Rules.kill = function (st, t, ev) {
    t.alive = false; t.overwatch = false; t.statuses = {};
    if (t.faction === 'h') st.stats.kills++; else st.stats.lost++;
    st.blood += R.bloodPerDeath; ev.blood = true;
    if (t.hasRelic) { t.hasRelic = false; st.relic.state = 'ground'; st.relic.x = t.x; st.relic.y = t.y; st.relic.bearer = null; ev.relicDropped = true; }
  };
  Rules.useAmmo = function (u, w) { if (u.ammo[w.id] !== undefined) u.ammo[w.id] = Math.max(0, u.ammo[w.id] - 1); };
  Rules.spendAP = function (u, n) { u.ap = Math.max(0, u.ap - n); };
  Rules.endsTurn = function (u) { u.ap = 0; };
  Rules.face = function (u, x, y) { const d = x - u.x; if (d !== 0) u.facing = d > 0 ? 1 : -1; else { const dy = y - u.y; if (dy !== 0) u.facing = dy > 0 ? -1 : 1; } };

  Rules.resolveAttack = function (st, a, t, w, opts) {
    opts = opts || {}; const pv = Rules.attackPreview(st, a, t, w, opts); if (!pv.ok) return null;
    Rules.face(a, t.x, t.y);
    if (w.type !== 'melee') Rules.useAmmo(a, w);
    const roll = st.rng() * 100; const hit = roll < pv.hit; const ev = { type: w.type === 'melee' ? 'melee' : 'shot', a, t, weapon: w, hit, crit: false, dmg: 0, killed: false, pv, overwatch: !!opts.overwatch };
    if (hit) {
      let dmg = Rules.randInt(st, pv.dmg[0], pv.dmg[1]);
      if (st.rng() * 100 < pv.crit) { ev.crit = true; dmg += Math.max(1, Math.floor(w.dmg[1] / 2)); }
      const d = Rules.damage(st, t, dmg, a); ev.dmg = dmg; ev.killed = d.killed; ev.relicDropped = d.relicDropped;
      if (w.bleed && t.alive) t.statuses.bleeding = R.bleedTurns;
      if (t.alive && opts.suppress) { t.statuses.suppressed = 1; t.overwatch = false; }
    } else if (opts.suppress) { t.statuses.suppressed = 1; t.overwatch = false; }
    a.hunkered = false; a.overwatch = false;
    return ev;
  };

  // ---------- overwatch ----------
  Rules.overwatchers = function (st, mover) {
    const enemies = Rules.alive(st, mover.faction === 'na' ? 'h' : 'na');
    return enemies.filter(e => { if (!e.overwatch) return false; const w = Rules.rangedWeapon(e); if (!w) return false; if (e.ammo[w.id] !== undefined && e.ammo[w.id] <= 0) return false; return Rules.dist(e.x, e.y, mover.x, mover.y) <= w.maxRange && Rules.hasLOS(st, e.x, e.y, mover.x, mover.y); });
  };
  Rules.anyOverwatchThreat = function (st, mover, x, y) {
    const enemies = Rules.alive(st, mover.faction === 'na' ? 'h' : 'na');
    return enemies.some(e => e.overwatch && Rules.visibleTo(st, mover.faction, e) && (function () { const w = Rules.rangedWeapon(e); return w && Rules.dist(e.x, e.y, x, y) <= w.maxRange && Rules.hasLOS(st, e.x, e.y, x, y); })());
  };

  // ---------- area effects ----------
  Rules.blastCells = function (st, cx, cy, radius) { const out = []; for (let y = cy - radius; y <= cy + radius; y++) for (let x = cx - radius; x <= cx + radius; x++) { const c = Rules.cell(st, x, y); if (c) out.push(c); } return out; };
  Rules.destroyCell = function (st, c) {
    const t = c.terr; if (!t.destructible) return null; const before = t.id; const nc = t.degradeTo || (t.explosive ? '.' : 'r'); c.ch = nc; c.terr = TC.TERRAIN[nc]; c.dirty = true; return { x: c.x, y: c.y, from: before, to: c.terr.id, explosive: t.explosive };
  };
  Rules.explode = function (st, cx, cy, radius, dmg, src, ignoreArmor) {
    const cells = Rules.blastCells(st, cx, cy, radius); const ev = { type: 'explosion', x: cx, y: cy, radius, hits: [], destroyed: [], chain: [] };
    for (const c of cells) {
      const u = Rules.unitAt(st, c.x, c.y);
      if (u) { const d = Math.max(1, dmg - (ignoreArmor ? 0 : Math.floor(u.def.armor / 2))); const r = Rules.damage(st, u, d, src); ev.hits.push({ t: u, dmg: d, killed: r.killed, relicDropped: r.relicDropped }); }
      if (c.terr.explosive) ev.chain.push({ x: c.x, y: c.y });
      const d = Rules.destroyCell(st, c); if (d) ev.destroyed.push(d);
    }
    return ev;
  };
  Rules.coneCells = function (st, u, tx, ty, range) {
    let vx = tx - u.x, vy = ty - u.y; const len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len; const out = [];
    for (let y = u.y - range; y <= u.y + range; y++) for (let x = u.x - range; x <= u.x + range; x++) {
      if (x === u.x && y === u.y) continue; const c = Rules.cell(st, x, y); if (!c) continue;
      const d = Math.hypot(x - u.x, y - u.y); if (d > range + 0.5) continue;
      const dot = ((x - u.x) * vx + (y - u.y) * vy) / d; if (dot < Math.cos(Math.PI / 4) - 1e-6) continue;
      if (!Rules.rawLOS(st, u.x, u.y, x, y)) continue; if (c.terr.los) continue;
      out.push(c);
    }
    return out;
  };

  // ---------- actions ----------
  Rules.canAct = (u) => u.alive && u.ap > 0;
  Rules.canUse = function (st, u, abId) {
    const ab = A[abId]; if (!ab) return { ok: false };
    if (u.ap < ab.cost) return { ok: false, reason: 'ap' };
    if (ab.faith && st.faith < ab.faith) return { ok: false, reason: 'faith' };
    if (ab.blood && st.blood < ab.blood) return { ok: false, reason: 'blood' };
    if (ab.cooldown && (u.cooldowns[abId] || 0) > 0) return { ok: false, reason: 'cd' };
    if (abId === 'grenade' && u.grenades <= 0) return { ok: false, reason: 'ammo' };
    if (abId === 'flame') { const w = Rules.flameWeapon(u); if (!w || u.ammo[w.id] <= 0) return { ok: false, reason: 'ammo' }; }
    if (abId === 'shoot' || abId === 'aimed' || abId === 'suppress') { const w = Rules.rangedWeapon(u); if (!w) return { ok: false }; if (u.ammo[w.id] !== undefined && u.ammo[w.id] <= 0) return { ok: false, reason: 'ammo' }; }
    if (abId === 'melee' && !Rules.meleeWeapon(u)) return { ok: false };
    if (abId === 'reload') { const w = Rules.rangedWeapon(u) || Rules.flameWeapon(u); if (!w || u.ammo[w.id] === undefined || u.ammo[w.id] >= w.ammo) return { ok: false, reason: 'full' }; }
    if (abId === 'overwatch') { const w = Rules.rangedWeapon(u); if (!w || u.ammo[w.id] <= 0 || u.statuses.burning) return { ok: false, reason: 'ammo' }; }
    if (abId === 'pray') { if (u.faction !== 'na') return { ok: false }; if (!Rules.adjacentShrine(st, u)) return { ok: false, reason: 'shrine' }; }
    if (abId === 'relic') { if (u.faction !== 'na' || u.hasRelic) return { ok: false }; if (!Rules.canTakeRelic(st, u)) return { ok: false }; }
    if (abId === 'droprelic' && !u.hasRelic) return { ok: false };
    return { ok: true, ab };
  };
  Rules.adjacentShrine = function (st, u) { for (const [dx, dy] of DIRS8) { const c = Rules.cell(st, u.x + dx, u.y + dy); if (c && c.terr.shrine && !c.prayed) return c; } return null; };
  Rules.canTakeRelic = function (st, u) {
    if (st.relic.state === 'altar') return Rules.cheb(u.x, u.y, st.relic.x, st.relic.y) <= 1;
    if (st.relic.state === 'ground') return Rules.cheb(u.x, u.y, st.relic.x, st.relic.y) <= 1 || (u.x === st.relic.x && u.y === st.relic.y);
    return false;
  };
  Rules.availableAbilities = function (st, u) {
    const list = ['shoot', 'melee', 'overwatch', 'hunker', 'reload'].concat(u.def.abilities.map(a => a === 'grenade' ? 'grenade' : a));
    if (Rules.flameWeapon(u)) list.splice(1, 0, 'flame');
    if (!Rules.rangedWeapon(u)) { ['shoot', 'overwatch'].forEach(x => { const i = list.indexOf(x); if (i >= 0) list.splice(i, 1); }); if (!Rules.flameWeapon(u)) list.splice(list.indexOf('reload'), 1); }
    if (!Rules.meleeWeapon(u)) list.splice(list.indexOf('melee'), 1);
    if (u.faction === 'na') { list.push('pray'); if (u.hasRelic) list.push('droprelic'); else list.push('relic'); }
    return list;
  };

  // Move: apply final position (scene animates per step). Returns nothing; overwatch handled per step by caller.
  Rules.applyStep = function (st, u, x, y) { Rules.face(u, x, y); u.x = x; u.y = y; u.hunkered = false; u.overwatch = false; };
  Rules.checkExtraction = function (st, u) { const c = Rules.cell(st, u.x, u.y); return !!(u.hasRelic && c && c.terr.extract); };

  Rules.doOverwatch = function (st, u) { Rules.spendAP(u, 1); Rules.endsTurn(u); u.overwatch = true; u.hunkered = false; return [{ type: 'status', t: u, status: 'overwatch' }]; };
  Rules.doHunker = function (st, u) { Rules.spendAP(u, 1); Rules.endsTurn(u); u.hunkered = true; u.overwatch = false; return [{ type: 'status', t: u, status: 'hunkered' }]; };
  Rules.doReload = function (st, u) { const w = Rules.rangedWeapon(u) || Rules.flameWeapon(u); u.ammo[w.id] = w.ammo; Rules.spendAP(u, 1); return [{ type: 'reload', t: u }]; };
  Rules.doShoot = function (st, u, t, opts) {
    opts = opts || {}; const w = Rules.rangedWeapon(u); const ab = opts.ability || 'shoot'; const abd = A[ab];
    const o = { aimBonus: abd.aimBonus || 0, critBonus: abd.critBonus || 0, suppress: ab === 'suppress' };
    const ev = Rules.resolveAttack(st, u, t, w, o); if (!ev) return null; Rules.spendAP(u, abd.cost); Rules.endsTurn(u); ev.ability = ab; return [ev];
  };
  Rules.doMelee = function (st, u, t) { const w = Rules.meleeWeapon(u); const ev = Rules.resolveAttack(st, u, t, w, {}); if (!ev) return null; Rules.spendAP(u, 1); Rules.endsTurn(u); return [ev]; };
  Rules.doGrenade = function (st, u, x, y) {
    if (Rules.dist(u.x, u.y, x, y) > A.grenade.range + 0.5) return null; u.grenades--; Rules.spendAP(u, 1); Rules.endsTurn(u); Rules.face(u, x, y); u.hunkered = false; u.overwatch = false;
    const evs = [{ type: 'throw', a: u, x, y }]; const ev = Rules.explode(st, x, y, A.grenade.radius, A.grenade.dmg, u, false); ev.a = u; evs.push(ev);
    Rules.chainExplosions(st, ev, evs, u); return evs;
  };
  Rules.chainExplosions = function (st, ev, evs, src) { for (const c of ev.chain) { const e2 = Rules.explode(st, c.x, c.y, 1, 3, src, false); e2.barrel = true; evs.push(e2); Rules.chainExplosions(st, e2, evs, src); } };
  Rules.doFlame = function (st, u, tx, ty) {
    const w = Rules.flameWeapon(u); const cells = Rules.coneCells(st, u, tx, ty, w.range); if (!cells.length) return null;
    Rules.useAmmo(u, w); Rules.spendAP(u, 1); Rules.endsTurn(u); Rules.face(u, tx, ty); u.hunkered = false; u.overwatch = false;
    const ev = { type: 'flame', a: u, cells, hits: [], destroyed: [] };
    for (const c of cells) { const t = Rules.unitAt(st, c.x, c.y); if (t && t !== u) { const r = Rules.damage(st, t, w.dmg[0], u); if (t.alive) t.statuses.burning = R.burnTurns; ev.hits.push({ t, dmg: w.dmg[0], killed: r.killed, relicDropped: r.relicDropped }); } if (c.terr.id === 'sandbag' || c.terr.id === 'crate') { const d = Rules.destroyCell(st, c); if (d) ev.destroyed.push(d); } }
    return [ev];
  };
  Rules.doRally = function (st, u, t) { Rules.spendAP(u, 1); u.cooldowns.rally = A.rally.cooldown + 1; t.ap = Math.min(2, t.ap + 1); return [{ type: 'buff', a: u, t, status: 'rally' }]; };
  Rules.doBless = function (st, u, t) { Rules.spendAP(u, 1); st.faith -= 1; st.stats.faithSpent += 1; t.statuses.blessed = 2; return [{ type: 'buff', a: u, t, status: 'blessed', holy: true }]; };
  Rules.doLight = function (st, u, t) { Rules.spendAP(u, 1); st.faith -= 2; st.stats.faithSpent += 2; const before = t.hp; t.hp = Math.min(t.maxHp, t.hp + R.lightHeal); delete t.statuses.burning; delete t.statuses.bleeding; delete t.statuses.cursed; delete t.statuses.suppressed; return [{ type: 'heal', a: u, t, amount: t.hp - before, holy: true }]; };
  Rules.doHolyFire = function (st, u, t) {
    if (Rules.dist(u.x, u.y, t.x, t.y) > A.holyfire.range + 0.5 || !Rules.hasLOS(st, u.x, u.y, t.x, t.y)) return null;
    Rules.spendAP(u, 1); Rules.endsTurn(u); st.faith -= 3; st.stats.faithSpent += 3; Rules.face(u, t.x, t.y); u.hunkered = false; u.overwatch = false;
    const r = Rules.damage(st, t, R.holyFireDmg, u); if (t.alive) t.statuses.burning = R.burnTurns; return [{ type: 'holyfire', a: u, t, dmg: R.holyFireDmg, killed: r.killed, relicDropped: r.relicDropped }];
  };
  Rules.doPray = function (st, u) { const c = Rules.adjacentShrine(st, u); if (!c) return null; c.prayed = true; c.dirty = true; Rules.spendAP(u, 1); st.faith += R.prayFaith; st.stats.shrines++; return [{ type: 'pray', a: u, cell: c }]; };
  Rules.doTakeRelic = function (st, u) {
    if (!Rules.canTakeRelic(st, u)) return null; Rules.spendAP(u, 1); const first = st.relic.state === 'altar'; st.relic.state = 'carried'; st.relic.bearer = u.id; u.hasRelic = true; Rules.face(u, st.relic.x, st.relic.y);
    const evs = [{ type: 'relicTaken', a: u, first }]; if (!st.bellsRung) { st.bellsRung = true; st.pendingReinf.push({ units: TC.REINF_RELIC, reason: 'bells' }); }
    return evs;
  };
  Rules.doDropRelic = function (st, u) { if (!u.hasRelic) return null; Rules.spendAP(u, 1); u.hasRelic = false; st.relic.state = 'ground'; st.relic.x = u.x; st.relic.y = u.y; st.relic.bearer = null; return [{ type: 'relicDrop', a: u }]; };
  Rules.doCurse = function (st, u, t) { if (Rules.dist(u.x, u.y, t.x, t.y) > A.curse.range || !Rules.hasLOS(st, u.x, u.y, t.x, t.y)) return null; Rules.spendAP(u, 1); st.blood -= 2; t.statuses.cursed = 2; t.overwatch = false; return [{ type: 'buff', a: u, t, status: 'cursed', dark: true }]; };
  Rules.doMutate = function (st, u, t) { if (Rules.dist(u.x, u.y, t.x, t.y) > A.mutate.range) return null; Rules.spendAP(u, 1); st.blood -= 2; t.statuses.mutated = 3; return [{ type: 'buff', a: u, t, status: 'mutated', dark: true }]; };
  Rules.doSacrifice = function (st, u, t) { if (Rules.cheb(u.x, u.y, t.x, t.y) > 1 || t.faction !== 'h' || t === u) return null; Rules.spendAP(u, 1); const r = Rules.damage(st, t, 999, u); st.blood += 3; u.hp = Math.min(u.maxHp, u.hp + 4); return [{ type: 'sacrifice', a: u, t, killed: true, relicDropped: r.relicDropped }]; };

  // ---------- turn flow ----------
  // Start of a faction's turn: tick statuses, reset AP, resources. Returns events.
  Rules.startTurn = function (st, faction) {
    const evs = []; st.phase = faction;
    if (faction === 'na') { st.faith += R.faithPerTurn; evs.push({ type: 'resource', faith: R.faithPerTurn }); }
    else { st.blood += R.bloodPerTurn; evs.push({ type: 'resource', blood: R.bloodPerTurn }); }
    for (const u of Rules.alive(st, faction)) {
      u.ap = R.apPerTurn; u.hunkered = false; u.overwatch = false; u.acted = false;
      for (const k in u.cooldowns) if (u.cooldowns[k] > 0) u.cooldowns[k]--;
      if (u.statuses.burning) { const r = Rules.damage(st, u, R.burnDmg, null); evs.push({ type: 'tick', t: u, status: 'burning', dmg: R.burnDmg, killed: r.killed, relicDropped: r.relicDropped }); if (!u.alive) continue; u.statuses.burning--; if (u.statuses.burning <= 0) delete u.statuses.burning; }
      if (u.statuses.bleeding) { const r = Rules.damage(st, u, R.bleedDmg, null); evs.push({ type: 'tick', t: u, status: 'bleeding', dmg: R.bleedDmg, killed: r.killed, relicDropped: r.relicDropped }); if (!u.alive) continue; u.statuses.bleeding--; if (u.statuses.bleeding <= 0) delete u.statuses.bleeding; }
      for (const s of ['blessed', 'cursed', 'mutated', 'suppressed']) { if (u.statuses[s]) { u.statuses[s]--; if (u.statuses[s] <= 0) delete u.statuses[s]; } }
    }
    return evs;
  };
  Rules.spawnReinforcements = function (st) {
    const evs = []; if (!st.pendingReinf.length) return evs;
    const free = []; for (let y = 0; y < st.grid.h; y++) for (let x = 0; x < st.grid.w; x++) { const c = st.grid.cells[y][x]; if (c.terr.deploy === 'h' && !Rules.unitAt(st, x, y)) free.push(c); }
    // also allow the top edge rows if deploy is full
    for (let x = 0; x < st.grid.w; x++) for (let y = 0; y < 2; y++) { const c = st.grid.cells[y][x]; if (c.terr.walk && !Rules.unitAt(st, x, y) && !free.includes(c)) free.push(c); }
    for (const grp of st.pendingReinf) { const spawned = []; for (const r of grp.units) { if (!free.length) break; const c = free.shift(); const u = Rules.spawnUnit(st, r.type, null, c); u.ap = R.apPerTurn; spawned.push(u); } evs.push({ type: 'reinforcements', units: spawned, reason: grp.reason }); }
    st.pendingReinf = []; return evs;
  };
  Rules.checkOver = function (st) {
    if (st.over) return st.over;
    const na = Rules.alive(st, 'na'), h = Rules.alive(st, 'h');
    if (na.some(u => Rules.checkExtraction(st, u))) { st.over = { win: true, reason: 'extract' }; return st.over; }
    if (!na.length) { st.over = { win: false, reason: 'wipe' }; return st.over; }
    if (!h.length && !st.pendingReinf.length) { st.over = { win: true, reason: 'wipe' }; return st.over; }
    return null;
  };
  Rules.checkTimeOut = function (st) { if (!st.over && st.turn > R.turnLimit) { st.over = { win: false, reason: 'time' }; } return st.over; };
})();
