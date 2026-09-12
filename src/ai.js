/* Trench Crusade × XCOM — Heretic AI. Produces a plan (list of actions) for a single unit; the scene executes them one by one. */
window.TC = window.TC || {};
(function () {
  const R = TC.Rules, A = TC.ABILITIES;
  const AI = {};
  TC.AI = AI;

  function targetsFrom(st, u, x, y, w) {
    // evaluate all NA units attackable from (x,y) with weapon w
    const fake = Object.assign({}, u, { x, y }); const out = [];
    for (const t of R.alive(st, 'na')) {
      const pv = R.attackPreview(st, fake, t, w, {}); if (!pv.ok) continue;
      const avg = (pv.dmg[0] + pv.dmg[1]) / 2 * (1 + pv.crit / 100 * 0.5); let score = pv.hit / 100 * avg;
      if (avg >= t.hp) score += 3 * pv.hit / 100; if (t.hasRelic) score *= 1.8; if (t.type === 'priest') score *= 1.3; if (t.type === 'flamer' && R.dist(x, y, t.x, t.y) < 5) score *= 1.3;
      out.push({ t, pv, score });
    }
    out.sort((a, b) => b.score - a.score); return out;
  }
  function exposure(st, u, x, y) {
    // how many NA units could shoot this tile, weighted by cover
    let e = 0; const fake = Object.assign({}, u, { x, y });
    for (const t of R.alive(st, 'na')) { const w = R.rangedWeapon(t); if (!w) continue; if (R.dist(t.x, t.y, x, y) > w.maxRange) continue; if (!R.hasLOS(st, t.x, t.y, x, y)) continue; const cov = R.coverAgainst(st, fake, t.x, t.y); e += cov === 2 ? 0.3 : (cov === 1 ? 0.6 : 1.2); }
    return e;
  }
  function goal(st, u) {
    const na = R.alive(st, 'na'); if (!na.length) return { x: u.x, y: u.y };
    const bearer = na.find(t => t.hasRelic); if (bearer) return bearer;
    if (st.relic.state === 'ground') return { x: st.relic.x, y: st.relic.y };
    // nearest enemy, biased toward the chapel
    let best = null, bd = 1e9; for (const t of na) { const d = R.dist(u.x, u.y, t.x, t.y); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  function bestTile(st, u, reach, evalFn) {
    let best = null, bs = -1e9;
    for (const [k, v] of reach) { if (v.blocked) continue; const [x, y] = k.split(',').map(Number); const s = evalFn(x, y, v.cost); if (s > bs) { bs = s; best = { x, y, cost: v.cost, score: s }; } }
    return best;
  }

  // Priest spell decisions (executed before the unit acts)
  AI.priestSpells = function (st, u) {
    const acts = []; if (u.type !== 'hpriest') return acts;
    const na = R.alive(st, 'na'), h = R.alive(st, 'h');
    // sacrifice when badly hurt and a legionnaire is adjacent
    if (u.hp <= 4) { const adj = h.find(t => t.type === 'legionnaire' && t !== u && R.cheb(u.x, u.y, t.x, t.y) <= 1); if (adj) acts.push({ kind: 'sacrifice', t: adj }); }
    if (st.blood >= 2) {
      const bearer = na.find(t => t.hasRelic && R.dist(u.x, u.y, t.x, t.y) <= A.curse.range && R.hasLOS(st, u.x, u.y, t.x, t.y));
      const brute = h.filter(t => (t.type === 'executioner' || t.type === 'wolf') && !t.statuses.mutated && R.dist(u.x, u.y, t.x, t.y) <= A.mutate.range && na.some(n => R.dist(n.x, n.y, t.x, t.y) <= 10));
      if (bearer && !bearer.statuses.cursed) acts.push({ kind: 'curse', t: bearer });
      else if (brute.length) acts.push({ kind: 'mutate', t: brute[0] });
      else { const vis = na.filter(t => !t.statuses.cursed && R.dist(u.x, u.y, t.x, t.y) <= A.curse.range && R.hasLOS(st, u.x, u.y, t.x, t.y)).sort((a, b) => b.def.aim - a.def.aim); if (vis.length) acts.push({ kind: 'curse', t: vis[0] }); }
    }
    return acts;
  };

  // Decide the next action for a unit. Returns one action; the scene executes and calls again while unit.ap > 0.
  AI.decide = function (st, u) {
    const na = R.alive(st, 'na'); if (!na.length) return { kind: 'end' };
    const ranged = R.rangedWeapon(u), melee = R.meleeWeapon(u); const g = goal(st, u);
    const isMelee = !ranged; const mob = R.effMob(u);
    const reach1 = R.reachable(st, u, mob); const reach2 = u.ap >= 2 ? R.reachable(st, u, mob * 2) : reach1;

    // 0) reload if empty and safe
    if (ranged && u.ammo[ranged.id] <= 0) { if (u.ap >= 1) return { kind: 'reload' }; }

    // 1) attack from current tile?
    const here = ranged && u.ammo[ranged.id] > 0 ? targetsFrom(st, u, u.x, u.y, ranged) : [];
    const hereM = melee ? targetsFrom(st, u, u.x, u.y, melee) : [];
    const heavySuppress = u.type === 'heavy' && here.length && here[0].pv.hit < 45 && st.rng() < 0.6;

    if (u.ap >= 1) {
      // melee units: find a tile adjacent to an enemy
      if (isMelee) {
        if (hereM.length && hereM[0].pv) return { kind: 'melee', t: hereM[0].t };
        // reachable adjacent tiles with 1 AP (then attack), else with 2 AP (dash), else approach
        const evalAdj = (reach) => bestTile(st, u, reach, (x, y) => { const ts = targetsFrom(st, Object.assign({}, u), x, y, melee); if (!ts.length) return -1e9; return ts[0].score * 10 - exposure(st, u, x, y) * 0.5; });
        if (u.ap >= 2) { const b = evalAdj(reach1); if (b && b.score > -1e8 && !(b.x === u.x && b.y === u.y)) return { kind: 'move', x: b.x, y: b.y, then: 'melee' }; }
        const b2 = evalAdj(reach2); if (b2 && b2.score > -1e8) return { kind: 'move', x: b2.x, y: b2.y, then: 'melee' };
        // approach goal
        const ap = bestTile(st, u, reach2, (x, y) => -R.dist(x, y, g.x, g.y) * 2 - exposure(st, u, x, y) * 1.5 + (R.cell(st, x, y).terr.trench ? 1 : 0));
        if (ap && !(ap.x === u.x && ap.y === u.y)) return { kind: 'move', x: ap.x, y: ap.y };
        return { kind: 'hunker' };
      }
      // ranged units
      if (u.ap >= 2) {
        // Option A: shoot from here (score), Option B: move 1 AP to a better tile then shoot
        const hereScore = here.length ? here[0].score * 10 - exposure(st, u, u.x, u.y) * 2 : -1e9;
        const b = bestTile(st, u, reach1, (x, y, cost) => {
          const ts = targetsFrom(st, u, x, y, ranged); const s = ts.length ? ts[0].score * 10 : -6; const ex = exposure(st, u, x, y);
          const c = R.cell(st, x, y); const dGoal = R.dist(x, y, g.x, g.y);
          return s - ex * 2 - dGoal * 0.35 + (c.terr.trench ? 1.5 : 0) - (x === u.x && y === u.y ? 0.01 : 0);
        });
        const moveScore = b ? b.score : -1e9;
        if (here.length && hereScore >= moveScore - 1.0) return heavySuppress ? { kind: 'suppress', t: here[0].t } : { kind: 'shoot', t: here[0].t };
        if (b && !(b.x === u.x && b.y === u.y)) { const ts = targetsFrom(st, u, b.x, b.y, ranged); return { kind: 'move', x: b.x, y: b.y, then: ts.length ? 'shoot' : null }; }
        if (here.length) return { kind: 'shoot', t: here[0].t };
        // nothing to shoot: dash toward goal if far, else overwatch
        const dg = R.dist(u.x, u.y, g.x, g.y);
        if (dg > 9) { const ap = bestTile(st, u, reach2, (x, y) => -R.dist(x, y, g.x, g.y) * 2 - exposure(st, u, x, y) * 1.2 + (R.cell(st, x, y).terr.trench ? 1 : 0)); if (ap && !(ap.x === u.x && ap.y === u.y)) return { kind: 'move', x: ap.x, y: ap.y, dash: true }; }
        else { const ap = bestTile(st, u, reach1, (x, y) => -R.dist(x, y, g.x, g.y) * 1.2 - exposure(st, u, x, y) * 2 + (R.cell(st, x, y).terr.trench ? 1.5 : 0) + (R.coverAgainst(st, Object.assign({}, u, { x, y }), g.x, g.y) * 1.5)); if (ap && !(ap.x === u.x && ap.y === u.y)) return { kind: 'move', x: ap.x, y: ap.y }; }
        return { kind: 'overwatch' };
      }
      // 1 AP left
      if (here.length) return heavySuppress ? { kind: 'suppress', t: here[0].t } : { kind: 'shoot', t: here[0].t };
      if (hereM.length) return { kind: 'melee', t: hereM[0].t };
      if (ranged && u.ammo[ranged.id] < ranged.ammo && exposure(st, u, u.x, u.y) < 0.7) return { kind: 'reload' };
      const threats = na.filter(t => R.dist(t.x, t.y, u.x, u.y) <= 10).length;
      return threats ? { kind: 'overwatch' } : { kind: 'hunker' };
    }
    return { kind: 'end' };
  };
})();
