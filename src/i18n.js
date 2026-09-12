/* Trench Crusade × XCOM — i18n (FR / EN) */
window.TC = window.TC || {};
(function () {
  const STR = {
    fr: {
      title: 'TRENCH CRUSADE', subtitle: 'Les Cloches de Saint-Ambroise',
      tagline: 'Une escarmouche tactique dans les tranchées de la Guerre Sainte',
      play: 'DÉPLOYER', howto: 'RÈGLES', continue_: 'REPRENDRE', language: 'Langue', sound: 'Son', on: 'ON', off: 'OFF',
      briefingTitle: 'ORDRE DE MISSION', briefing1: 'La chapelle de Saint-Ambroise est tombée. Le Reliquaire du Martyr y repose encore, au milieu des ruines, entre les mains de l’Hérésie.',
      briefing2: 'Reprenez la relique et exfiltrez-la par le Poste de Secours à l’ouest avant que les cloches n’aient sonné douze fois. Priez aux sanctuaires pour raviver la Foi.',
      briefing3: 'Attention : saisir la relique fera sonner les cloches. Les Légions accourront.',
      objectives: 'Objectifs', objPrimary: 'Récupérer le Reliquaire dans la chapelle et l’extraire au Poste de Secours (ouest)', objAlt: 'Ou anéantir toutes les forces hérétiques', objLimit: 'Limite : 12 tours', objBonus: 'Bonus : prier aux 3 sanctuaires (+2 Foi chacun)',
      begin: 'AU COMBAT', back: 'RETOUR',
      turn: 'Tour', of: '/', phaseNA: 'NEW ANTIOCH', phaseH: 'LÉGIONS HÉRÉTIQUES',
      objRelicAltar: 'Reliquaire → chapelle', objRelicCarried: '{name} → Poste de Secours', objRelicGround: 'Ramasser le Reliquaire',
      endTurn: 'FIN DU TOUR', cancel: 'ANNULER', enemyTurn: 'TOUR ENNEMI…',
      bannerNA: 'NEW ANTIOCH', bannerNAsub: 'Que la Foi guide vos tirs', bannerH: 'LÉGIONS HÉRÉTIQUES', bannerHsub: 'Le sang appelle le sang',
      bannerReinf: 'LES CLOCHES SONNENT', bannerReinfSub: 'Les Légions accourent depuis le nord', bannerReinf2: 'RENFORTS HÉRÉTIQUES', bannerReinf2Sub: 'De nouvelles silhouettes émergent de la brume',
      bannerWin: 'VICTOIRE', bannerLose: 'DÉFAITE',
      winExtract: 'Le Reliquaire du Martyr est sauf. Les cloches de Saint-Ambroise sonneront encore.', winWipe: 'L’Hérésie a été purgée jusqu’au dernier. Le Reliquaire est à vous.',
      loseWipe: 'Votre bande gît dans la boue. Les cloches se sont tues.', loseTime: 'La douzième cloche a sonné. La relique reste aux mains de l’Hérésie.',
      again: 'REJOUER', menu: 'MENU',
      statTurns: 'Tours joués', statKills: 'Hérétiques abattus', statLost: 'Pertes', statFaith: 'Foi dépensée', statShrines: 'Sanctuaires priés',
      ap: 'PA', hp: 'PV', aim: 'Visée', def: 'Déf', mob: 'Mob', armor: 'Arm', ammo: 'Mun',
      // actions
      actMove: 'Déplacer', actShoot: 'Tirer', actMelee: 'Corps à corps', actOverwatch: 'Vigilance', actHunker: 'Se retrancher', actReload: 'Recharger', actGrenade: 'Grenade', actFlame: 'Flammes', actAimed: 'Tir visé',
      actRally: 'Rallier', actBless: 'Bénédiction', actLight: 'Lumière', actHolyFire: 'Feu Sacré', actPray: 'Prier', actRelic: 'Prendre la relique', actDropRelic: 'Déposer',
      actCurse: 'Malédiction', actMutate: 'Mutation', actSacrifice: 'Sacrifice', actSuppress: 'Suppression',
      // descriptions
      dActMove: 'Se déplacer. 1 PA (bleu) ou 2 PA (jaune, course).',
      dActShoot: 'Tirer sur une cible en vue. Termine le tour.', dActMelee: 'Attaque au contact. Ignore le couvert. Termine le tour.',
      dActOverwatch: 'Tire sur le premier ennemi qui bouge en vue (-15 Visée). Termine le tour.', dActHunker: 'Double le couvert et annule les critiques. Termine le tour.',
      dActReload: 'Recharger l’arme. 1 PA.', dActGrenade: 'Explosion 3×3, 3 dégâts, détruit les couverts. Portée 6. Termine le tour.',
      dActFlame: 'Cône de feu (portée 3). Touche automatiquement, enflamme, ignore le couvert. Termine le tour.', dActAimed: 'Tir de précision : +25 Visée, +30 Critique. 2 PA.',
      dActRally: 'Donne 1 PA à un allié à 6 cases. Recharge : 3 tours.', dActBless: '1 Foi. Un allié gagne +20 Visée et +20 Défense pour 1 tour.',
      dActLight: '2 Foi. Soigne 4 PV et purifie un allié adjacent (ou soi-même).', dActHolyFire: '3 Foi. Colonne de feu sacré : 5 dégâts sûrs, ignore le couvert, enflamme. Portée 7.',
      dActPray: '+2 Foi. Une fois par sanctuaire. 1 PA.', dActRelic: 'Saisir le Reliquaire (-1 Mobilité). Les cloches sonneront.', dActDropRelic: 'Déposer le Reliquaire au sol.',
      // log
      logShot: '{a} tire sur {t} : {r}', logMelee: '{a} attaque {t} : {r}', logHit: 'touché ({d})', logCrit: 'CRITIQUE ({d})', logMiss: 'raté', logKill: '{t} est abattu',
      logMove: '{a} se déplace', logOverwatch: 'VIGILANCE : {a} tire sur {t}', logGrenade: '{a} lance une grenade', logFlame: '{a} embrase la zone',
      logBurn: '{t} brûle ({d})', logBleed: '{t} saigne ({d})', logPray: '{a} prie : +2 Foi', logRelicTaken: '{a} s’empare du Reliquaire !', logRelicDrop: 'Le Reliquaire tombe au sol',
      logBless: '{a} bénit {t}', logLight: '{a} soigne {t} (+{d})', logHolyFire: '{a} invoque le Feu Sacré sur {t}', logRally: '{a} rallie {t}',
      logCurse: '{a} maudit {t}', logMutate: '{t} mute : chair et rage', logSacrifice: '{a} sacrifie {t} : +3 Sang', logSuppress: '{a} cloue {t} sous le feu',
      logHunker: '{a} se retranche', logOverwatchSet: '{a} en vigilance', logReload: '{a} recharge', logReinf: 'Renforts hérétiques : {n} unités', logBlood: 'Le sang coule : +1 Sang',
      logHeretic: 'Hérétique', logCoverDestroyed: 'Un couvert vole en éclats',
      // preview
      pvHit: 'Toucher', pvCrit: 'Crit', pvDmg: 'Dégâts', pvCover: 'Couvert', pvNone: 'aucun', pvHalf: 'demi', pvFull: 'plein', pvFlank: 'FLANQUÉ', pvRange: 'Portée', pvFire: 'FEU', pvConfirm: 'CONFIRMER', pvAuto: 'auto',
      pvTargets: 'cibles', pvMoveCost: 'Déplacement', pvDash: 'course', pvOwWarn: '⚠ vigilance ennemie',
      // statuses
      stBurning: 'Brûle', stBleeding: 'Saigne', stBlessed: 'Béni', stCursed: 'Maudit', stMutated: 'Muté', stHunkered: 'Retranché', stOverwatch: 'Vigilance', stSuppressed: 'Cloué', stRelic: 'Reliquaire',
      // help
      helpTitle: 'RÈGLES DU CHAMP DE BATAILLE',
      help: [
        ['Actions', 'Chaque unité a 2 PA par tour. Bouger coûte 1 PA (bleu) ou 2 PA (jaune). Tirer, se retrancher ou se mettre en vigilance termine le tour de l’unité.'],
        ['Couvert', 'Un demi-couvert (sacs, murets, caisses) donne -20 % à toucher, un plein couvert (murs, arbres) -40 %. Une unité dans une tranchée a un demi-couvert de tous côtés. Sans couvert face au tireur : FLANQUÉ, +40 % critique.'],
        ['Vigilance', 'Une unité en vigilance tire sur le premier ennemi qui bouge dans sa ligne de vue.'],
        ['Foi', 'New Antioch gagne 1 Foi par tour et +2 en priant à un sanctuaire. Le Prêtre la dépense en miracles.'],
        ['Sang', 'Les Hérétiques gagnent 1 Sang par tour et +1 à chaque mort. Leur Prêtre le dépense en malédictions et mutations.'],
        ['Reliquaire', 'Un allié adjacent à l’autel peut saisir le Reliquaire (-1 Mob). Amenez-le au Poste de Secours (ouest). S’il meurt, la relique tombe au sol.'],
        ['Caméra', 'Glissez pour déplacer, pincez pour zoomer. Touchez une unité pour la sélectionner, une case pour prévisualiser, encore une fois pour confirmer.'],
      ],
      tutorial: 'Touchez un soldat, puis une case (bleu = 1 PA, jaune = 2 PA). Touchez un ennemi pour voir vos chances.',
      noTarget: 'Aucune cible en vue', noAmmo: 'Chargeur vide', noFaith: 'Foi insuffisante', endTurnConfirm: 'Des unités ont encore des PA. Terminer le tour ?', yes: 'OUI', no: 'NON',
      unitsLeft: '{n} unité(s) peuvent encore agir',
      menuTitle: 'PAUSE', resume: 'REPRENDRE', restart: 'RECOMMENCER', quit: 'QUITTER', overview: 'VUE D’ENSEMBLE',
      loading: 'CHARGEMENT', tapToStart: 'TOUCHEZ POUR COMMENCER',
      pendingReinf: '{n} renforts en route',
      units: {
        captain: 'Capitaine de tranchée', priest: 'Prêtre de combat', yeoman: 'Fusilier', grenadier: 'Grenadier', flamer: 'Sergent lance-flammes',
        hpriest: 'Prêtre hérétique', executioner: 'Bourreau', legionnaire: 'Légionnaire', heavy: 'Infanterie lourde ointe', wolf: 'Loup de guerre',
      },
      weapons: { rifle: 'Fusil de tranchée', carbine: 'Carabine', pistol: 'Pistolet', sword: 'Épée bénite', mace: 'Masse', shovel: 'Pelle', flamethrower: 'Lance-flammes', whip: 'Fouet barbelé', staff: 'Bâton', hmg: 'Mitrailleuse lourde', bite: 'Crocs' },
      names: { captain: 'Cpt. Aurelius', priest: 'Fr. Matthias', yeoman1: 'Sdt. Bram', yeoman2: 'Sdt. Josse', grenadier: 'Cpl. Idris', flamer: 'Sgt. Vale' },
    },
    en: {
      title: 'TRENCH CRUSADE', subtitle: 'The Bells of Saint Ambrose',
      tagline: 'A tactical skirmish in the trenches of the Holy War',
      play: 'DEPLOY', howto: 'RULES', continue_: 'CONTINUE', language: 'Language', sound: 'Sound', on: 'ON', off: 'OFF',
      briefingTitle: 'MISSION ORDERS', briefing1: 'The chapel of Saint Ambrose has fallen. The Martyr’s Reliquary still rests among the ruins, in the hands of Heresy.',
      briefing2: 'Recover the relic and extract it through the Aid Post to the west before the bells toll twelve times. Pray at the shrines to rekindle your Faith.',
      briefing3: 'Beware: seizing the relic will ring the bells. The Legions will come.',
      objectives: 'Objectives', objPrimary: 'Recover the Reliquary from the chapel and extract it at the Aid Post (west)', objAlt: 'Or annihilate all heretic forces', objLimit: 'Limit: 12 turns', objBonus: 'Bonus: pray at the 3 shrines (+2 Faith each)',
      begin: 'TO BATTLE', back: 'BACK',
      turn: 'Turn', of: '/', phaseNA: 'NEW ANTIOCH', phaseH: 'HERETIC LEGIONS',
      objRelicAltar: 'Reliquary → chapel', objRelicCarried: '{name} → Aid Post', objRelicGround: 'Pick up the Reliquary',
      endTurn: 'END TURN', cancel: 'CANCEL', enemyTurn: 'ENEMY TURN…',
      bannerNA: 'NEW ANTIOCH', bannerNAsub: 'May Faith guide your aim', bannerH: 'HERETIC LEGIONS', bannerHsub: 'Blood calls for blood',
      bannerReinf: 'THE BELLS TOLL', bannerReinfSub: 'The Legions rush in from the north', bannerReinf2: 'HERETIC REINFORCEMENTS', bannerReinf2Sub: 'New silhouettes emerge from the mist',
      bannerWin: 'VICTORY', bannerLose: 'DEFEAT',
      winExtract: 'The Martyr’s Reliquary is safe. The bells of Saint Ambrose will ring again.', winWipe: 'Heresy has been purged to the last. The Reliquary is yours.',
      loseWipe: 'Your warband lies in the mud. The bells have fallen silent.', loseTime: 'The twelfth bell has tolled. The relic remains in heretic hands.',
      again: 'PLAY AGAIN', menu: 'MENU',
      statTurns: 'Turns played', statKills: 'Heretics slain', statLost: 'Losses', statFaith: 'Faith spent', statShrines: 'Shrines prayed',
      ap: 'AP', hp: 'HP', aim: 'Aim', def: 'Def', mob: 'Mob', armor: 'Arm', ammo: 'Ammo',
      actMove: 'Move', actShoot: 'Fire', actMelee: 'Melee', actOverwatch: 'Overwatch', actHunker: 'Hunker down', actReload: 'Reload', actGrenade: 'Grenade', actFlame: 'Flames', actAimed: 'Aimed shot',
      actRally: 'Rally', actBless: 'Blessing', actLight: 'Light', actHolyFire: 'Holy Fire', actPray: 'Pray', actRelic: 'Take relic', actDropRelic: 'Drop',
      actCurse: 'Curse', actMutate: 'Mutation', actSacrifice: 'Sacrifice', actSuppress: 'Suppress',
      dActMove: 'Move. 1 AP (blue) or 2 AP (yellow, dash).',
      dActShoot: 'Fire at a target in view. Ends the turn.', dActMelee: 'Attack in close combat. Ignores cover. Ends the turn.',
      dActOverwatch: 'Fire at the first enemy that moves in sight (-15 Aim). Ends the turn.', dActHunker: 'Doubles cover and negates crits. Ends the turn.',
      dActReload: 'Reload the weapon. 1 AP.', dActGrenade: '3×3 blast, 3 damage, destroys cover. Range 6. Ends the turn.',
      dActFlame: 'Cone of fire (range 3). Auto-hit, sets ablaze, ignores cover. Ends the turn.', dActAimed: 'Precision shot: +25 Aim, +30 Crit. 2 AP.',
      dActRally: 'Grant 1 AP to an ally within 6 tiles. Cooldown: 3 turns.', dActBless: '1 Faith. An ally gains +20 Aim and +20 Defense for 1 turn.',
      dActLight: '2 Faith. Heal 4 HP and cleanse an adjacent ally (or yourself).', dActHolyFire: '3 Faith. Pillar of holy fire: 5 sure damage, ignores cover, sets ablaze. Range 7.',
      dActPray: '+2 Faith. Once per shrine. 1 AP.', dActRelic: 'Seize the Reliquary (-1 Mobility). The bells will toll.', dActDropRelic: 'Drop the Reliquary on the ground.',
      logShot: '{a} fires at {t}: {r}', logMelee: '{a} strikes {t}: {r}', logHit: 'hit ({d})', logCrit: 'CRITICAL ({d})', logMiss: 'miss', logKill: '{t} is slain',
      logMove: '{a} moves', logOverwatch: 'OVERWATCH: {a} fires at {t}', logGrenade: '{a} throws a grenade', logFlame: '{a} sets the area ablaze',
      logBurn: '{t} burns ({d})', logBleed: '{t} bleeds ({d})', logPray: '{a} prays: +2 Faith', logRelicTaken: '{a} seizes the Reliquary!', logRelicDrop: 'The Reliquary falls to the ground',
      logBless: '{a} blesses {t}', logLight: '{a} heals {t} (+{d})', logHolyFire: '{a} calls Holy Fire upon {t}', logRally: '{a} rallies {t}',
      logCurse: '{a} curses {t}', logMutate: '{t} mutates: flesh and fury', logSacrifice: '{a} sacrifices {t}: +3 Blood', logSuppress: '{a} pins {t} under fire',
      logHunker: '{a} hunkers down', logOverwatchSet: '{a} on overwatch', logReload: '{a} reloads', logReinf: 'Heretic reinforcements: {n} units', logBlood: 'Blood is spilled: +1 Blood',
      logHeretic: 'Heretic', logCoverDestroyed: 'Cover is blown apart',
      pvHit: 'Hit', pvCrit: 'Crit', pvDmg: 'Damage', pvCover: 'Cover', pvNone: 'none', pvHalf: 'half', pvFull: 'full', pvFlank: 'FLANKED', pvRange: 'Range', pvFire: 'FIRE', pvConfirm: 'CONFIRM', pvAuto: 'auto',
      pvTargets: 'targets', pvMoveCost: 'Move', pvDash: 'dash', pvOwWarn: '⚠ enemy overwatch',
      stBurning: 'Burning', stBleeding: 'Bleeding', stBlessed: 'Blessed', stCursed: 'Cursed', stMutated: 'Mutated', stHunkered: 'Hunkered', stOverwatch: 'Overwatch', stSuppressed: 'Pinned', stRelic: 'Reliquary',
      helpTitle: 'BATTLEFIELD RULES',
      help: [
        ['Actions', 'Each unit has 2 AP per turn. Moving costs 1 AP (blue) or 2 AP (yellow). Firing, hunkering or overwatch ends the unit’s turn.'],
        ['Cover', 'Half cover (sandbags, low walls, crates) gives -20% to hit, full cover (walls, trees) -40%. A unit in a trench has half cover from all sides. No cover facing the shooter: FLANKED, +40% crit.'],
        ['Overwatch', 'A unit on overwatch fires at the first enemy that moves within its line of sight.'],
        ['Faith', 'New Antioch gains 1 Faith per turn and +2 by praying at a shrine. The Priest spends it on miracles.'],
        ['Blood', 'Heretics gain 1 Blood per turn and +1 for every death. Their Priest spends it on curses and mutations.'],
        ['Reliquary', 'An ally adjacent to the altar can seize the Reliquary (-1 Mob). Bring it to the Aid Post (west). If the bearer dies, the relic drops.'],
        ['Camera', 'Drag to pan, pinch to zoom. Tap a unit to select, tap a tile to preview, tap again to confirm.'],
      ],
      tutorial: 'Tap a soldier, then a tile (blue = 1 AP, yellow = 2 AP). Tap an enemy to see your odds.',
      noTarget: 'No target in sight', noAmmo: 'Magazine empty', noFaith: 'Not enough Faith', endTurnConfirm: 'Some units still have AP. End turn?', yes: 'YES', no: 'NO',
      unitsLeft: '{n} unit(s) can still act',
      menuTitle: 'PAUSED', resume: 'RESUME', restart: 'RESTART', quit: 'QUIT', overview: 'OVERVIEW',
      loading: 'LOADING', tapToStart: 'TAP TO START',
      pendingReinf: '{n} reinforcements inbound',
      units: {
        captain: 'Trench Captain', priest: 'Combat Priest', yeoman: 'Yeoman', grenadier: 'Grenadier', flamer: 'Flamer Sergeant',
        hpriest: 'Heretic Priest', executioner: 'Executioner', legionnaire: 'Legionnaire', heavy: 'Anointed Heavy Infantry', wolf: 'War Wolf',
      },
      weapons: { rifle: 'Trench rifle', carbine: 'Carbine', pistol: 'Pistol', sword: 'Blessed sword', mace: 'Mace', shovel: 'Shovel', flamethrower: 'Flamethrower', whip: 'Barbed whip', staff: 'Staff', hmg: 'Heavy machine gun', bite: 'Fangs' },
      names: { captain: 'Cpt. Aurelius', priest: 'Fr. Matthias', yeoman1: 'Pvt. Bram', yeoman2: 'Pvt. Josse', grenadier: 'Cpl. Idris', flamer: 'Sgt. Vale' },
    },
  };
  let lang = 'fr';
  try { lang = localStorage.getItem('tc_lang') || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'); } catch (e) { }
  function fmt(s, p) { if (!p) return s; return s.replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined ? p[k] : m)); }
  TC.T = function (key, p) {
    const d = STR[lang] || STR.fr; const v = d[key] !== undefined ? d[key] : (STR.fr[key] !== undefined ? STR.fr[key] : key);
    return typeof v === 'string' ? fmt(v, p) : v;
  };
  TC.TU = (id) => (STR[lang].units[id] || STR.fr.units[id] || id);
  TC.TW = (id) => (STR[lang].weapons[id] || STR.fr.weapons[id] || id);
  TC.TN = (id) => (STR[lang].names[id] || STR.fr.names[id] || null);
  TC.getLang = () => lang;
  TC.setLang = (l) => { lang = STR[l] ? l : 'fr'; try { localStorage.setItem('tc_lang', lang); } catch (e) { } document.documentElement.lang = lang; };
  TC.langs = ['fr', 'en'];
})();
