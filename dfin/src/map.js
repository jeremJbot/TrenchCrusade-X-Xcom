/* =====================================================================
   Plan du plateau (compact, 41 × 26) : pièces, pods avec ambiance propre
   à chaque unité, sièges, points d'intérêt, sources de lumière.
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const W = 41, H = 26;

  const ROOMS = [
    { id: 'dir', name: 'Direction', x1: 1, y1: 1, x2: 8, y2: 6, floor: 'wood', unit: 'dir' },
    { id: 'pil', name: 'Centre de pilotage', x1: 10, y1: 1, x2: 29, y2: 6, floor: 'dark', unit: 'pil' },
    { id: 'srv', name: 'Salle serveurs', x1: 31, y1: 1, x2: 39, y2: 6, floor: 'raised', unit: 'srv' },
    { id: 'cor', name: 'Couloir', x1: 1, y1: 8, x2: 39, y2: 8, floor: 'tile', unit: null },
    { id: 'open', name: 'Open space', x1: 1, y1: 9, x2: 39, y2: 24, floor: 'carpet', unit: null },
  ];
  const DOORS = [[4, 7], [19, 7], [20, 7], [35, 7]];
  const GLASS = [];
  for (let x = 11; x <= 28; x++) if (x !== 19 && x !== 20) GLASS.push([x, 7]);
  for (let y = 2; y <= 5; y++) { GLASS.push([9, y]); GLASS.push([30, y]); }
  for (let x = 32; x <= 38; x++) if (x !== 35) GLASS.push([x, 7]);

  const PODS = { fin: [1, 9], cdg: [11, 9], bud: [21, 9], fis: [31, 9], ass: [1, 17], ci: [11, 17], lab: [21, 17], caf: [31, 17] };

  function buildMap() {
    const tiles = [];
    for (let y = 0; y < H; y++) { tiles.push([]); for (let x = 0; x < W; x++) tiles[y].push({ t: 'wall', f: null, room: null, unit: null, win: false, seed: (x * 73 + y * 151) % 97 }); }
    for (const r of ROOMS) for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) { const t = tiles[y][x]; t.t = 'floor'; t.f = r.floor; t.room = r.id; t.unit = r.unit; }
    for (const [x, y] of DOORS) { const t = tiles[y][x]; t.t = 'door'; t.f = 'tile'; t.room = 'cor'; }
    for (const [x, y] of GLASS) tiles[y][x].t = 'glass';
    for (let y = 9; y < H - 1; y++) if (y % 3 !== 1) { tiles[y][0].win = true; tiles[y][W - 1].win = true; }
    for (let x = 2; x < W - 1; x++) if (x % 3 !== 0) tiles[H - 1][x].win = true;

    const objects = []; const seats = {}; const lights = [];
    const add = (o) => { objects.push(Object.assign({ w: 1, h: 1, solid: true, seed: (objects.length * 31 + 7) % 100 }, o)); return objects[objects.length - 1]; };
    const seat = (unit, x, y, face) => { (seats[unit] = seats[unit] || []).push({ x, y, face, unit }); };
    const light = (x, y, r, color, a) => lights.push({ x, y, r, color: color || '#ffd9a0', a: a == null ? 0.9 : a });

    for (const unitId in PODS) {
      const [ox, oy] = PODS[unitId];
      const unit = DFIN.UNITS.find(u => u.id === unitId);
      for (let y = oy; y < oy + 6; y++) for (let x = ox; x < ox + 9; x++) { tiles[y][x].unit = unitId; }
      add({ type: 'rug', x: ox, y: oy + 1, w: 9, h: 5, solid: false, unit: unitId, color: unit.color });
      add({ type: 'sign', x: ox + 2, y: oy, w: 5, solid: false, unit: unitId, color: unit.color });
      if (unitId !== 'caf') {
        for (const dx of [1, 4]) {
          add({ type: 'desk', x: ox + dx, y: oy + 2, w: 2, dir: 'n', unit: unitId, dual: unitId === 'bud' || unitId === 'lab', curved: unitId === 'lab' });
          add({ type: 'chair', x: ox + dx, y: oy + 1, dir: 's', unit: unitId });
          add({ type: 'desk', x: ox + dx, y: oy + 3, w: 2, dir: 's', unit: unitId, dual: unitId === 'bud' || unitId === 'lab', curved: unitId === 'lab' });
          add({ type: 'chair', x: ox + dx, y: oy + 4, dir: 'n', unit: unitId });
        }
        seat(unitId, ox + 1, oy + 1, 's'); seat(unitId, ox + 4, oy + 1, 's'); seat(unitId, ox + 1, oy + 4, 'n'); seat(unitId, ox + 4, oy + 4, 'n');
      }
      const L = (dx, dy, col, r) => light(ox + dx + 0.5, oy + dy + 0.5, r || 2.6, col || '#ffd9a0');
      switch (unitId) {
        case 'fin':
          add({ type: 'plantwall', x: ox + 7, y: oy + 1, w: 2 }); add({ type: 'tickerscreen', x: ox + 7, y: oy + 3, w: 2, id: 'ticker_fin' });
          add({ type: 'worldmap', x: ox + 3, y: oy + 5, w: 3, solid: false }); add({ type: 'lamp', x: ox + 8, y: oy + 5 }); L(8, 5); add({ type: 'plant', x: ox, y: oy + 5, big: true });
          break;
        case 'cdg':
          add({ type: 'whiteboard', x: ox + 7, y: oy + 1, w: 2, unit: unitId, chart: true }); add({ type: 'binders', x: ox + 7, y: oy + 3 }); add({ type: 'printer', x: ox + 8, y: oy + 3, id: 'printer_cdg' });
          add({ type: 'lamp', x: ox + 7, y: oy + 5 }); L(7, 5); add({ type: 'binders', x: ox + 8, y: oy + 5 }); add({ type: 'bin', x: ox, y: oy + 5, solid: false });
          break;
        case 'bud':
          add({ type: 'worktable', x: ox + 7, y: oy + 1, w: 2, h: 2 }); add({ type: 'wallcal', x: ox + 7, y: oy + 4, w: 2, id: 'wallcal' }); add({ type: 'binders', x: ox + 0, y: oy + 5 });
          add({ type: 'lamp', x: ox + 8, y: oy + 5 }); L(8, 5); add({ type: 'plant', x: ox + 6, y: oy + 5 });
          break;
        case 'fis':
          add({ type: 'lawshelf', x: ox + 7, y: oy + 1 }); add({ type: 'lawshelf', x: ox + 8, y: oy + 1, id: 'books_fis' }); add({ type: 'armchair', x: ox + 7, y: oy + 3, dir: 'w' });
          add({ type: 'lamp', x: ox + 8, y: oy + 3, green: true }); L(8, 3, '#ffe8b0', 2.4); add({ type: 'sidetable', x: ox + 7, y: oy + 5 }); add({ type: 'lamp', x: ox + 0, y: oy + 5 }); L(0, 5);
          break;
        case 'ass':
          add({ type: 'cabinet', x: ox + 7, y: oy + 1, tall: true }); add({ type: 'cabinet', x: ox + 8, y: oy + 1, tall: true }); add({ type: 'safe', x: ox + 7, y: oy + 3, id: 'safe' }); add({ type: 'umbrellas', x: ox + 8, y: oy + 3 });
          add({ type: 'lamp', x: ox + 7, y: oy + 5 }); L(7, 5); add({ type: 'plant', x: ox + 8, y: oy + 5 });
          break;
        case 'ci':
          add({ type: 'checklist', x: ox + 7, y: oy + 1, w: 2 }); add({ type: 'cabinet', x: ox + 8, y: oy + 3, locked: true }); add({ type: 'plant', x: ox + 7, y: oy + 3 });
          add({ type: 'lamp', x: ox + 8, y: oy + 5 }); L(8, 5, '#f4f0e6', 2.2); add({ type: 'bin', x: ox, y: oy + 5, solid: false });
          break;
        case 'lab':
          add({ type: 'ledstrip', x: ox, y: oy, w: 9, solid: false }); add({ type: 'beanbag', x: ox + 7, y: oy + 1, color: '#c95bd6' }); add({ type: 'beanbag', x: ox + 8, y: oy + 2, color: '#4fb3d9' });
          add({ type: 'minirack', x: ox + 8, y: oy + 4, id: 'minirack' }); add({ type: 'robot', x: ox + 7, y: oy + 4, id: 'robot' }); add({ type: 'neon', x: ox + 7, y: oy + 5 });
          L(7, 5, '#d070ff', 3.0); L(8, 4, '#60c8ff', 1.8); L(4, 0, '#c95bd6', 2.2);
          break;
        case 'caf':
          add({ type: 'garland', x: ox, y: oy, w: 9, solid: false }); add({ type: 'counter', x: ox + 6, y: oy + 1, w: 2 }); add({ type: 'coffee', x: ox + 8, y: oy + 1, id: 'coffee' }); add({ type: 'fridge', x: ox + 8, y: oy + 2 });
          add({ type: 'bookshelf', x: ox + 5, y: oy + 1 }); add({ type: 'table2', x: ox + 2, y: oy + 2, w: 2, h: 2 }); add({ type: 'chair', x: ox + 1, y: oy + 2, dir: 'e' }); add({ type: 'chair', x: ox + 4, y: oy + 3, dir: 'w' });
          add({ type: 'sofa', x: ox + 1, y: oy + 5, w: 2 }); add({ type: 'armchair', x: ox + 6, y: oy + 4, dir: 'n' }); add({ type: 'sidetable', x: ox + 7, y: oy + 4 }); add({ type: 'lamp', x: ox + 8, y: oy + 5 }); L(8, 5, '#ffc98a', 3.2);
          add({ type: 'plant', x: ox + 4, y: oy + 5, big: true }); add({ type: 'vending', x: ox + 8, y: oy + 3, id: 'vending' }); L(2, 0, '#ffd27a', 2.4); L(6, 0, '#ffd27a', 2.4);
          break;
      }
    }

    // Direction
    add({ type: 'rug', x: 2, y: 2, w: 6, h: 4, solid: false, unit: 'dir', color: '#7a2e3a', fancy: true });
    add({ type: 'bookshelf', x: 2, y: 1 }); add({ type: 'bookshelf', x: 3, y: 1, id: 'books' }); add({ type: 'bookshelf', x: 4, y: 1 }); add({ type: 'plant', x: 8, y: 1, big: true }); add({ type: 'lamp', x: 1, y: 1 }); light(1.5, 1.5, 3, '#ffd9a0');
    add({ type: 'bigdesk', x: 4, y: 3, w: 3 }); add({ type: 'chair', x: 5, y: 2, dir: 's', exec: true }); seat('dir', 5, 2, 's');
    add({ type: 'chair', x: 4, y: 4, dir: 'n' }); add({ type: 'chair', x: 6, y: 4, dir: 'n' });
    add({ type: 'desk', x: 7, y: 5, w: 2, dir: 'n', unit: 'dir' }); add({ type: 'chair', x: 7, y: 4, dir: 's' }); seat('dir', 7, 4, 's');
    add({ type: 'roundtable', x: 1, y: 5 }); add({ type: 'armchair', x: 2, y: 6, dir: 'w' }); add({ type: 'cabinet', x: 1, y: 3, tall: true });

    // Centre de pilotage
    add({ type: 'screen', x: 11, y: 1, w: 5, h: 2, id: 'screen_l', panel: 'left' });
    add({ type: 'screen', x: 16, y: 1, w: 8, h: 2, id: 'screen_c', panel: 'main' });
    add({ type: 'screen', x: 24, y: 1, w: 5, h: 2, id: 'screen_r', panel: 'right' });
    add({ type: 'console', x: 19, y: 4, w: 2, id: 'console' });
    for (const cx of [12, 15, 23, 26]) { add({ type: 'desk', x: cx, y: 4, w: 2, dir: 's', unit: 'pil', console: true }); add({ type: 'chair', x: cx, y: 5, dir: 'n' }); }
    seat('pil', 15, 5, 'n'); seat('pil', 23, 5, 'n');
    add({ type: 'plant', x: 10, y: 1 }); add({ type: 'plant', x: 29, y: 1 }); add({ type: 'plant', x: 10, y: 6 }); add({ type: 'plant', x: 29, y: 6 });
    light(20, 2.5, 7, '#4fb3d9', 0.75);

    // Salle serveurs
    for (const rx of [32, 33, 34, 36, 37, 38]) { add({ type: 'rack', x: rx, y: 2, id: rx === 36 ? 'racks' : undefined }); add({ type: 'rack', x: rx, y: 4 }); }
    add({ type: 'ac', x: 39, y: 1 }); add({ type: 'cabletray', x: 31, y: 1, w: 9, solid: false });
    light(35.5, 3.5, 5, '#5aa0ff', 0.55);

    // Open space : kiosque, copieur, fontaines, plantes, lampadaires d'allée
    add({ type: 'board', x: 18, y: 15, w: 4, id: 'calendar' });
    add({ type: 'copier', x: 19, y: 24, w: 2, id: 'copier' });
    add({ type: 'watercooler', x: 10, y: 15 }); add({ type: 'watercooler', x: 30, y: 15 });
    for (const [px, py] of [[10, 9], [30, 9], [10, 24], [30, 24], [1, 24], [39, 24], [1, 15], [39, 15]]) add({ type: 'plant', x: px, y: py, big: (px + py) % 2 === 0 });
    add({ type: 'lamp', x: 10, y: 16 }); light(10.5, 16.5, 3.2, '#ffd9a0'); add({ type: 'lamp', x: 30, y: 16 }); light(30.5, 16.5, 3.2, '#ffd9a0');
    add({ type: 'sofa', x: 20, y: 16, w: 2, dir: 'n' }); add({ type: 'sidetable', x: 22, y: 16 });
    add({ type: 'bin', x: 18, y: 24, solid: false }); add({ type: 'bin', x: 21, y: 24, solid: false });

    // Lumière du jour par les fenêtres
    for (let y = 9; y < H - 1; y += 3) { light(0.5, y + 0.5, 3.5, '#dfe9f5', 0.5); light(W - 0.5, y + 0.5, 3.5, '#dfe9f5', 0.5); }
    for (let x = 3; x < W - 1; x += 4) light(x + 0.5, H - 0.5, 3.5, '#dfe9f5', 0.5);

    const solid = [];
    for (let y = 0; y < H; y++) { solid.push([]); for (let x = 0; x < W; x++) solid[y].push(tiles[y][x].t === 'wall' || tiles[y][x].t === 'glass'); }
    for (const o of objects) if (o.solid) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (solid[y]) solid[y][x] = true;
    const objAt = {};
    for (const o of objects) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (o.solid || o.id) objAt[x + ',' + y] = o;

    const poi = { coffee: { x: 38, y: 18 }, copier: { x: 19, y: 23 }, water1: { x: 10, y: 14 }, water2: { x: 30, y: 14 }, board: { x: 19, y: 16 }, cockpit: { x: 19, y: 6 }, comite: { x: 35, y: 8 }, corridor: { x: 19, y: 8 } };
    return { W, H, tiles, objects, seats, solid, objAt, rooms: ROOMS, pods: PODS, poi, lights, spawn: { x: 4, y: 8 } };
  }
  DFIN.buildMap = buildMap;
})();
