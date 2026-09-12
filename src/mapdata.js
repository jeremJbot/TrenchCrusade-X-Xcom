/* Trench Crusade × XCOM — map: "Les Cloches de Saint-Ambroise" 16x16
   Legend:
   .  mud           ~  water crater     w  barbed wire      s  sandbags (half, blocks move)
   #  wall (full)   =  low wall (half)  c  crate (half)     b  barrel (half)      t  dead tree (full, blocks LOS)
   T  trench        D  trench w/ duckboards                 f  chapel flagstones
   +  shrine (half) A  altar (relic)    G  stained glass wall (full)    r  rubble (walkable, no cover)
   E  extraction    n  NA deploy        h  heretic deploy   p  votive post (half, doesn't block LOS)
   x  cross grave (half cover)
*/
window.TC = window.TC || {};
TC.MAP_ROWS = [
  //0123456789ABCDEF   x →   (y ↓)
  'hhh..r..t...r...', // 0
  'hh...........t..', // 1
  'h...ww...=...r..', // 2
  'h.sTT.....s..~..', // 3
  '..wT...r....+...', // 4
  '.t.T.##G##..r.x.', // 5
  '...T.#fff#...s..', // 6
  '.r.T.GfAff...r..', // 7
  '...s.#fff#..==..', // 8
  '..w..##rG#..=...', // 9
  '...+r....r..cc..', // 10
  '....r~....s.b.p.', // 11
  '.x...........r..', // 12
  'EE....TTT......n', // 13
  'EE.....D..+...nn', // 14
  'EE.t.........nnn', // 15
];
TC.TERRAIN = {
  '.': { id: 'mud', walk: true, cost: 1, cover: 0, los: false },
  'r': { id: 'rubble', walk: true, cost: 1, cover: 0, los: false },
  '~': { id: 'water', walk: true, cost: 2, cover: 0, los: false },
  'w': { id: 'wire', walk: true, cost: 3, cover: 0, los: false },
  's': { id: 'sandbag', walk: false, cost: 99, cover: 1, los: false, destructible: true },
  '#': { id: 'wall', walk: false, cost: 99, cover: 2, los: true, destructible: true, degradeTo: '=' },
  'G': { id: 'glass', walk: false, cost: 99, cover: 2, los: true, destructible: true, degradeTo: '=' },
  '=': { id: 'lowwall', walk: false, cost: 99, cover: 1, los: false, destructible: true },
  'c': { id: 'crate', walk: false, cost: 99, cover: 1, los: false, destructible: true },
  'b': { id: 'barrel', walk: false, cost: 99, cover: 1, los: false, destructible: true, explosive: true },
  't': { id: 'tree', walk: false, cost: 99, cover: 2, los: true },
  'T': { id: 'trench', walk: true, cost: 1, cover: 0, los: false, trench: true },
  'D': { id: 'trench', walk: true, cost: 1, cover: 0, los: false, trench: true, duck: true },
  'f': { id: 'flag', walk: true, cost: 1, cover: 0, los: false },
  '+': { id: 'shrine', walk: false, cost: 99, cover: 1, los: false, shrine: true },
  'p': { id: 'post', walk: false, cost: 99, cover: 1, los: false },
  'x': { id: 'grave', walk: false, cost: 99, cover: 1, los: false, destructible: true },
  'A': { id: 'altar', walk: false, cost: 99, cover: 1, los: false, altar: true },
  'E': { id: 'extract', walk: true, cost: 1, cover: 0, los: false, extract: true },
  'n': { id: 'mud', walk: true, cost: 1, cover: 0, los: false, deploy: 'na' },
  'h': { id: 'mud', walk: true, cost: 1, cover: 0, los: false, deploy: 'h' },
};
