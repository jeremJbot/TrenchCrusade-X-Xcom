/* Trench Crusade × XCOM — game data */
window.TC = window.TC || {};
(function () {
  // Weapons: acc = accuracy modifier, range = optimal range (tiles), maxRange = hard limit
  TC.WEAPONS = {
    rifle:        { id: 'rifle', type: 'ranged', dmg: [3, 5], acc: 0,  crit: 10, range: 8, maxRange: 12, ammo: 4, sfx: 'rifle' },
    carbine:      { id: 'carbine', type: 'ranged', dmg: [3, 4], acc: 5,  crit: 10, range: 6, maxRange: 9,  ammo: 4, sfx: 'rifle' },
    pistol:       { id: 'pistol', type: 'ranged', dmg: [2, 4], acc: 0,  crit: 10, range: 5, maxRange: 8,  ammo: 6, close: true, sfx: 'pistol' },
    hmg:          { id: 'hmg', type: 'ranged', dmg: [3, 6], acc: -5, crit: 5,  range: 9, maxRange: 13, ammo: 3, sfx: 'hmg' },
    flamethrower: { id: 'flamethrower', type: 'flame', dmg: [3, 3], acc: 0, crit: 0, range: 3, maxRange: 3, ammo: 4, sfx: 'flame' },
    sword:        { id: 'sword', type: 'melee', dmg: [4, 6], acc: 10, crit: 20, sfx: 'blade' },
    mace:         { id: 'mace', type: 'melee', dmg: [3, 5], acc: 5,  crit: 15, sfx: 'blunt' },
    shovel:       { id: 'shovel', type: 'melee', dmg: [2, 4], acc: 5,  crit: 10, sfx: 'blunt' },
    staff:        { id: 'staff', type: 'melee', dmg: [3, 5], acc: 0,  crit: 15, sfx: 'blunt' },
    whip:         { id: 'whip', type: 'melee', dmg: [3, 5], acc: 10, crit: 20, bleed: true, sfx: 'blade' },
    bite:         { id: 'bite', type: 'melee', dmg: [2, 4], acc: 15, crit: 30, sfx: 'bite' },
  };

  // Unit archetypes
  TC.UNIT_TYPES = {
    // ---- New Antioch ----
    captain:     { faction: 'na', hp: 12, aim: 85, def: 10, mob: 5, armor: 1, weapons: ['rifle', 'sword'], abilities: ['rally'], sight: 12 },
    priest:      { faction: 'na', hp: 10, aim: 75, def: 5,  mob: 5, armor: 0, weapons: ['pistol', 'mace'], abilities: ['bless', 'light', 'holyfire'], sight: 12 },
    yeoman:      { faction: 'na', hp: 8,  aim: 80, def: 5,  mob: 5, armor: 0, weapons: ['rifle'], abilities: ['aimed'], sight: 12 },
    grenadier:   { faction: 'na', hp: 9,  aim: 75, def: 5,  mob: 4, armor: 1, weapons: ['carbine'], abilities: ['grenade'], grenades: 2, sight: 12 },
    flamer:      { faction: 'na', hp: 10, aim: 70, def: 0,  mob: 4, armor: 1, weapons: ['flamethrower', 'shovel'], abilities: [], sight: 12 },
    // ---- Heretic Legions ----
    hpriest:     { faction: 'h', hp: 8,  aim: 60, def: 5,  mob: 5, armor: 0, weapons: ['pistol', 'staff'], abilities: ['curse', 'mutate', 'sacrifice'], sight: 12 },
    executioner: { faction: 'h', hp: 10, aim: 65, def: 15, mob: 6, armor: 1, weapons: ['whip'], abilities: [], sight: 12 },
    legionnaire: { faction: 'h', hp: 4,  aim: 55, def: 5,  mob: 5, armor: 0, weapons: ['rifle'], abilities: [], sight: 12 },
    heavy:       { faction: 'h', hp: 12, aim: 55, def: 0,  mob: 3, armor: 2, weapons: ['hmg'], abilities: ['suppress'], sight: 12 },
    wolf:        { faction: 'h', hp: 6,  aim: 70, def: 25, mob: 7, armor: 0, weapons: ['bite'], abilities: [], sight: 12, beast: true },
  };

  // Abilities. cost = AP, ends = ends turn, res = resource cost (faith/blood)
  TC.ABILITIES = {
    shoot:     { id: 'shoot', ico: '🎯', cost: 1, ends: true, target: 'enemy' },
    melee:     { id: 'melee', ico: '⚔', cost: 1, ends: true, target: 'enemy', melee: true },
    overwatch: { id: 'overwatch', ico: '👁', cost: 1, ends: true, target: 'self' },
    hunker:    { id: 'hunker', ico: '🛡', cost: 1, ends: true, target: 'self' },
    reload:    { id: 'reload', ico: '🔄', cost: 1, ends: false, target: 'self' },
    grenade:   { id: 'grenade', ico: '💣', cost: 1, ends: true, target: 'tile', range: 6, radius: 1, dmg: 3, danger: true },
    flame:     { id: 'flame', ico: '🔥', cost: 1, ends: true, target: 'cone', range: 3, danger: true },
    aimed:     { id: 'aimed', ico: '🔭', cost: 2, ends: true, target: 'enemy', aimBonus: 25, critBonus: 30 },
    rally:     { id: 'rally', ico: '📯', cost: 1, ends: false, target: 'ally', range: 6, cooldown: 3 },
    bless:     { id: 'bless', ico: '✚', cost: 1, ends: false, target: 'ally', range: 6, faith: 1, holy: true },
    light:     { id: 'light', ico: '☀', cost: 1, ends: false, target: 'ally', range: 1, faith: 2, holy: true, selfOk: true },
    holyfire:  { id: 'holyfire', ico: '🕯', cost: 1, ends: true, target: 'enemy', range: 7, faith: 3, holy: true, noLOS: false },
    pray:      { id: 'pray', ico: '🙏', cost: 1, ends: false, target: 'self', holy: true },
    relic:     { id: 'relic', ico: '⚱', cost: 1, ends: false, target: 'self' },
    droprelic: { id: 'droprelic', ico: '⬇', cost: 1, ends: false, target: 'self' },
    curse:     { id: 'curse', ico: '☠', cost: 1, ends: false, target: 'enemy', range: 8, blood: 2 },
    mutate:    { id: 'mutate', ico: '🧬', cost: 1, ends: false, target: 'ally', range: 8, blood: 2 },
    sacrifice: { id: 'sacrifice', ico: '🔪', cost: 1, ends: false, target: 'ally', range: 1, blood: 0 },
    suppress:  { id: 'suppress', ico: '💥', cost: 1, ends: true, target: 'enemy' },
  };

  // Rosters
  TC.ROSTER_NA = [
    { type: 'captain', name: 'captain' }, { type: 'priest', name: 'priest' }, { type: 'yeoman', name: 'yeoman1' },
    { type: 'yeoman', name: 'yeoman2' }, { type: 'grenadier', name: 'grenadier' }, { type: 'flamer', name: 'flamer' },
  ];
  TC.ROSTER_H = [
    { type: 'hpriest' }, { type: 'executioner' }, { type: 'legionnaire' }, { type: 'legionnaire' }, { type: 'legionnaire' }, { type: 'heavy' }, { type: 'wolf' },
  ];
  TC.REINF_RELIC = [{ type: 'legionnaire' }, { type: 'legionnaire' }, { type: 'wolf' }];
  TC.REINF_TURN5 = [{ type: 'legionnaire' }, { type: 'legionnaire' }];

  TC.RULES = {
    turnLimit: 12, apPerTurn: 2, faithStart: 1, faithPerTurn: 1, prayFaith: 2, bloodPerTurn: 1, bloodPerDeath: 1,
    coverHalf: 20, coverFull: 40, overwatchPenalty: 15, flankCrit: 40, rangePenalty: 10, closeBonus: 10,
    burnDmg: 2, burnTurns: 2, bleedDmg: 1, bleedTurns: 3, blessAim: 20, blessDef: 20, curseAim: 30, mutateDmg: 2, mutateMob: 2, suppressAim: 25,
    holyFireDmg: 5, lightHeal: 4, relicMobPenalty: 1, reinfTurn: 5, dashMult: 2,
  };
})();
