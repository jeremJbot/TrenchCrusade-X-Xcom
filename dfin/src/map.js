/* =====================================================================
   Plan du plateau : pièces, mobilier, sièges, points d'interaction.
   Grille de 52 × 34 tuiles. Tout est décrit en données puis "construit".
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const W = 52, H = 34;

  // Pièces : intérieur [x1,x2] × [y1,y2] inclus
  const ROOMS = [
    { id: 'dir', name: 'Direction', x1: 1, y1: 1, x2: 10, y2: 8, floor: 'wood', unit: 'dir' },
    { id: 'pil', name: 'Cockpit de pilotage', x1: 12, y1: 1, x2: 39, y2: 8, floor: 'dark', unit: 'pil' },
    { id: 'com', name: 'Salle du Comité', x1: 41, y1: 1, x2: 50, y2: 8, floor: 'carpet2', unit: null },
    { id: 'cor', name: 'Couloir', x1: 1, y1: 10, x2: 50, y2: 11, floor: 'tile', unit: null },
    { id: 'open', name: 'Open space', x1: 1, y1: 12, x2: 50, y2: 32, floor: 'carpet', unit: null },
  ];
  const DOORS = [[5, 9], [25, 9], [26, 9], [45, 9]];
  const GLASS = [];
  for (let x = 13; x <= 38; x++) if (x !== 25 && x !== 26) GLASS.push([x, 9]);
  for (let y = 2; y <= 7; y++) { GLASS.push([11, y]); GLASS.push([40, y]); }

  // Pods des unités dans l'open space (origine, 11 × 8)
  const PODS = { cdg: [1, 13], cpt: [14, 13], tre: [27, 13], inv: [40, 13], fis: [1, 23], sif: [14, 23], cir: [27, 23], caf: [40, 23] };

  function buildMap() {
    const tiles = [];
    for (let y = 0; y < H; y++) {
      tiles.push([]);
      for (let x = 0; x < W; x++) tiles[y].push({ t: 'wall', f: null, room: null, unit: null, win: false, seed: (x * 73 + y * 151) % 97 });
    }
    for (const r of ROOMS) for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) {
      const t = tiles[y][x]; t.t = 'floor'; t.f = r.floor; t.room = r.id; t.unit = r.unit;
    }
    for (const [x, y] of DOORS) { const t = tiles[y][x]; t.t = 'door'; t.f = 'tile'; t.room = 'cor'; }
    for (const [x, y] of GLASS) tiles[y][x].t = 'glass';
    // Fenêtres décoratives sur les murs extérieurs
    for (let y = 2; y < H - 1; y++) if (y % 3 !== 0 && y !== 9 && y !== 10 && y !== 11) { tiles[y][0].win = true; tiles[y][W - 1].win = true; }
    for (let x = 2; x < W - 1; x++) if (x % 4 !== 0) tiles[H - 1][x].win = true;

    const objects = [];
    const seats = {}; // unit -> [ {x,y,face} ]
    const add = (o) => { objects.push(Object.assign({ w: 1, h: 1, solid: true, seed: objects.length * 31 % 100 }, o)); return objects[objects.length - 1]; };
    const seat = (unit, x, y, face) => { (seats[unit] = seats[unit] || []).push({ x, y, face, unit }); };

    // Teinte des pods + mobilier
    for (const unitId in PODS) {
      const [ox, oy] = PODS[unitId];
      const unit = DFIN.UNITS.find(u => u.id === unitId);
      for (let y = oy; y < oy + 8; y++) for (let x = ox; x < ox + 11; x++) { tiles[y][x].unit = unitId; tiles[y][x].f = unitId === 'caf' ? 'cafe' : 'carpet'; }
      add({ type: 'sign', x: ox + 3, y: oy, w: 5, solid: false, unit: unitId, text: unit.short, color: unit.color });
      if (unitId === 'caf') {
        add({ type: 'counter', x: ox + 6, y: oy + 1, w: 3 });
        add({ type: 'coffee', x: ox + 9, y: oy + 1, id: 'coffee' });
        add({ type: 'vending', x: ox + 9, y: oy + 3, id: 'vending' });
        add({ type: 'fridge', x: ox + 9, y: oy + 4 });
        add({ type: 'table2', x: ox + 2, y: oy + 3, w: 2, h: 2 });
        add({ type: 'chair', x: ox + 1, y: oy + 3, dir: 'e' }); add({ type: 'chair', x: ox + 4, y: oy + 4, dir: 'w' });
        add({ type: 'table2', x: ox + 6, y: oy + 5, w: 2, h: 2 });
        add({ type: 'chair', x: ox + 5, y: oy + 5, dir: 'e' }); add({ type: 'chair', x: ox + 8, y: oy + 6, dir: 'w' });
        add({ type: 'sofa', x: ox + 1, y: oy + 7, w: 2 });
        add({ type: 'plant', x: ox, y: oy + 1 }); add({ type: 'plant', x: ox + 10, y: oy + 7 });
        add({ type: 'bin', x: ox + 4, y: oy + 7, solid: false });
        continue;
      }
      // deux bancs dos à dos : rangée nord (chaises au nord, face sud) / rangée sud (chaises au sud, face nord)
      for (const dx of [2, 5]) {
        add({ type: 'desk', x: ox + dx, y: oy + 2, w: 2, dir: 'n', unit: unitId });
        add({ type: 'chair', x: ox + dx, y: oy + 1, dir: 's' });
        add({ type: 'desk', x: ox + dx, y: oy + 3, w: 2, dir: 's', unit: unitId });
        add({ type: 'chair', x: ox + dx, y: oy + 4, dir: 'n' });
      }
      seat(unitId, ox + 2, oy + 1, 's'); seat(unitId, ox + 5, oy + 1, 's'); seat(unitId, ox + 2, oy + 4, 'n'); seat(unitId, ox + 5, oy + 4, 'n');
      add({ type: 'cabinet', x: ox + 9, y: oy + 1 }); add({ type: 'cabinet', x: ox + 9, y: oy + 2 });
      add({ type: 'printer', x: ox + 9, y: oy + 6, id: 'printer_' + unitId });
      add({ type: 'plant', x: ox, y: oy + 1 });
      add({ type: 'whiteboard', x: ox + 2, y: oy + 7, w: 2, unit: unitId });
      add({ type: 'roundtable', x: ox + 6, y: oy + 6 });
      add({ type: 'bin', x: ox + 8, y: oy + 4, solid: false });
    }

    // Direction
    add({ type: 'bookshelf', x: 2, y: 1 }); add({ type: 'bookshelf', x: 3, y: 1, id: 'books' }); add({ type: 'bookshelf', x: 4, y: 1 });
    add({ type: 'plant', x: 1, y: 1 }); add({ type: 'plant', x: 10, y: 1 });
    add({ type: 'bigdesk', x: 5, y: 3, w: 3 });
    add({ type: 'chair', x: 6, y: 2, dir: 's', exec: true }); seat('dir', 6, 2, 's');
    add({ type: 'chair', x: 5, y: 4, dir: 'n' }); add({ type: 'chair', x: 7, y: 4, dir: 'n' });
    add({ type: 'desk', x: 2, y: 6, w: 2, dir: 'n', unit: 'dir' }); add({ type: 'chair', x: 2, y: 5, dir: 's' }); seat('dir', 2, 5, 's');
    add({ type: 'roundtable', x: 8, y: 6 }); add({ type: 'chair', x: 9, y: 7, dir: 'w' });
    add({ type: 'cabinet', x: 1, y: 3 }); add({ type: 'cabinet', x: 1, y: 4 });
    add({ type: 'rug', x: 4, y: 5, w: 5, h: 3, solid: false });

    // Cockpit : mur d'écrans + pupitre + consoles
    add({ type: 'screen', x: 14, y: 1, w: 6, h: 2, id: 'screen_l', panel: 'left' });
    add({ type: 'screen', x: 20, y: 1, w: 12, h: 2, id: 'screen_c', panel: 'main' });
    add({ type: 'screen', x: 32, y: 1, w: 6, h: 2, id: 'screen_r', panel: 'right' });
    add({ type: 'console', x: 25, y: 4, w: 2, id: 'console' });
    for (const cx of [15, 18, 21, 28, 31, 34]) {
      add({ type: 'desk', x: cx, y: 4, w: 2, dir: 's', unit: 'pil', console: true }); add({ type: 'chair', x: cx, y: 5, dir: 'n' });
      add({ type: 'desk', x: cx, y: 7, w: 2, dir: 's', unit: 'pil', console: true }); add({ type: 'chair', x: cx, y: 8, dir: 'n' });
    }
    seat('pil', 21, 5, 'n'); seat('pil', 28, 5, 'n'); seat('pil', 15, 8, 'n'); seat('pil', 34, 8, 'n');
    add({ type: 'plant', x: 12, y: 1 }); add({ type: 'plant', x: 39, y: 1 }); add({ type: 'plant', x: 12, y: 8 }); add({ type: 'plant', x: 39, y: 8 });
    add({ type: 'server', x: 12, y: 3 }); add({ type: 'server', x: 12, y: 4 }); add({ type: 'server', x: 39, y: 3 });

    // Salle du Comité
    add({ type: 'bigtable', x: 43, y: 3, w: 6, h: 4, id: 'comite' });
    for (const cx of [43, 45, 47]) add({ type: 'chair', x: cx, y: 2, dir: 's' });
    for (const cx of [44, 46, 48]) add({ type: 'chair', x: cx, y: 7, dir: 'n' });
    add({ type: 'chair', x: 42, y: 4, dir: 'e' }); add({ type: 'chair', x: 49, y: 5, dir: 'w' });
    add({ type: 'tv', x: 45, y: 1, w: 2 }); add({ type: 'plant', x: 41, y: 1 }); add({ type: 'plant', x: 50, y: 8 });
    add({ type: 'watercooler', x: 50, y: 1 });

    // Open space : kiosque calendrier de gestion, copieur, plantes
    add({ type: 'board', x: 24, y: 21, w: 4, id: 'calendar' });
    add({ type: 'copier', x: 25, y: 31, w: 2, id: 'copier' });
    add({ type: 'watercooler', x: 13, y: 22 }); add({ type: 'watercooler', x: 38, y: 22 });
    for (const [px, py] of [[12, 12], [39, 12], [12, 32], [39, 32], [25, 12], [26, 12], [1, 32], [50, 32], [1, 21], [50, 21]]) add({ type: 'plant', x: px, y: py });
    add({ type: 'bin', x: 24, y: 32, solid: false }); add({ type: 'bin', x: 27, y: 32, solid: false });

    // Grille de solidité
    const solid = [];
    for (let y = 0; y < H; y++) { solid.push([]); for (let x = 0; x < W; x++) solid[y].push(tiles[y][x].t === 'wall' || tiles[y][x].t === 'glass'); }
    for (const o of objects) if (o.solid) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (solid[y]) solid[y][x] = true;
    // les chaises restent solides pour les déplacements, sauf pour l'occupant
    const objAt = {};
    for (const o of objects) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) objAt[x + ',' + y] = o;

    // Points d'intérêt pour la déambulation des PNJ
    const poi = {
      coffee: { x: 48, y: 24 }, copier: { x: 25, y: 30 }, water1: { x: 13, y: 21 }, water2: { x: 38, y: 21 }, board: { x: 25, y: 22 },
      cockpit: { x: 25, y: 6 }, comite: { x: 45, y: 8 }, corridor: { x: 25, y: 10 },
    };

    return { W, H, tiles, objects, seats, solid, objAt, rooms: ROOMS, pods: PODS, poi, spawn: { x: 5, y: 11 } };
  }

  DFIN.buildMap = buildMap;
})();
