/* =====================================================================
   DFIN — Centre de pilotage de la Direction financière (SGP)
   DONNÉES 100 % FICTIVES — noms, chiffres, dates et événements inventés
   pour tester le concept. Aucune donnée réelle.
   ===================================================================== */
'use strict';

const DFIN = window.DFIN || (window.DFIN = {});

DFIN.COMPANY = {
  short: 'SGP',
  name: 'Société du Grand Paris',
  dept: 'Direction financière',
  floor: 'Plateau F — 4e étage',
  today: new Date(2026, 8, 12, 8, 32), // 12 septembre 2026, 08:32
};

DFIN.PLAYER = {
  name: 'Vous',
  role: 'Directeur·rice financier·ère adjoint·e',
  shirt: '#2c4a7a', hair: '#3a2a1c', skin: '#e8c39e',
};

/* -------------------------------------------------- Unités ---------- */
DFIN.UNITS = [
  { id: 'dir', name: 'Direction', short: 'DIR', color: '#c9a34a', amb: 'Bois sombre, tapis bordeaux, bibliothèque de rapports annuels.',
    desc: 'Bureau de la Directrice financière. Pilotage global, arbitrages, relations avec la Direction générale et le Conseil de surveillance.' },
  { id: 'pil', name: 'Centre de pilotage', short: 'PIL', color: '#4fb3d9', amb: 'Salle sombre, mur d\'écrans, consoles et halo bleu.',
    desc: 'Cockpit : mur d\'écrans, indicateurs consolidés temps réel, cellule data & performance.' },
  { id: 'srv', name: 'Salle serveurs', short: 'SRV', color: '#5aa0c8', amb: 'Baies noires, LED qui clignotent, plancher technique, froid.',
    desc: 'Hébergement de l\'ERP financier, des entrepôts de données et des reportings automatisés.' },
  { id: 'fin', name: 'Financement & Trésorerie', short: 'FIN', color: '#3aa76d', amb: 'Vert profond, mur végétal, planisphère des investisseurs, écrans de marché.',
    desc: 'Position de trésorerie, placements, programme obligataire vert, gestion de la dette et des risques de taux.' },
  { id: 'cdg', name: 'Contrôle de gestion', short: 'CDG', color: '#e07a3f', amb: 'Orange chaud, tableaux blancs couverts de courbes, classeurs et copieur.',
    desc: 'Budget, atterrissage, reporting mensuel, analyse des écarts, cadrage budgétaire N+1.' },
  { id: 'bud', name: 'Consolidation & Pilotage budgétaire', short: 'BUD', color: '#7c6bd1', amb: 'Violet, grande table de travail, calendrier mural, doubles écrans.',
    desc: 'Comptes consolidés, clôtures, arrêtés semestriels, synthèse budgétaire pluriannuelle, relation CAC.' },
  { id: 'fis', name: 'Fiscalité', short: 'FIS', color: '#b78a3a', amb: 'Cabinet feutré : lampes, fauteuil cuir, rayonnages de codes fiscaux.',
    desc: 'Recettes fiscales affectées, TVA, fiscalité des opérations, redevances et recettes commerciales.' },
  { id: 'ass', name: 'Assurances', short: 'ASS', color: '#5b7fa6', amb: 'Bleu ardoise, armoires à polices, coffre-fort, parapluies au portemanteau.',
    desc: 'Programme d\'assurances du Grand Paris Express : tous risques chantier, responsabilité civile, sinistres et franchises.' },
  { id: 'ci', name: 'Contrôle interne', short: 'CI', color: '#8a9bab', amb: 'Gris clair, listes de contrôle au mur, armoire verrouillée, ordre parfait.',
    desc: 'Cartographie des risques financiers, contrôles clés, séparation des tâches, suivi des recommandations d\'audit.' },
  { id: 'lab', name: 'Lab IA & Data', short: 'LAB', color: '#c95bd6', amb: 'Néons violets, poufs, bureau debout, écran incurvé, mini-baie et robot.',
    desc: 'Automatisation des reportings, assistants IA finance, ERP et référentiels de données.' },
  { id: 'caf', name: 'Lounge', short: 'CAF', color: '#a86f4a', amb: 'Terracotta, canapés, guirlandes, machine à café et vraies informations.',
    desc: 'Machine à café, bruits de couloir et vraies informations.' },
];

/* -------------------------------------------------- Personnes ------- */
/* seat: index du siège dans le pod de l'unité (voir map.js) */
DFIN.PEOPLE = [ // glasses/long/badge ajoutés plus bas
  { id: 'helene', name: 'Hélène Marchetti', role: 'Directrice financière', unit: 'dir', seat: 0,
    skin: '#e6bf9a', hair: '#5a4632', shirt: '#7a2e3a', mood: 'exigeante',
    greet: 'Ah, vous voilà. Le COMEX est à 11h et j\'ai besoin d\'une vision consolidée. Asseyez-vous deux minutes.' },

  { id: 'priya', name: 'Priya Nair', role: 'Data analyst — cellule pilotage', unit: 'pil', seat: 0,
    skin: '#b07b55', hair: '#1c1410', shirt: '#2f6f8f', mood: 'concentrée',
    greet: 'Le mur d\'écrans se rafraîchit toutes les 15 minutes. Si un chiffre vous paraît bizarre, c\'est probablement le flux SAP qui a une heure de retard.' },
  { id: 'malik', name: 'Malik Ouedraogo', role: 'Chargé de performance', unit: 'pil', seat: 1,
    skin: '#7a4a2a', hair: '#0f0c0a', shirt: '#365f8a', mood: 'détendu',
    greet: 'Regardez l\'écran central : l\'atterrissage 2026 bouge encore, les lignes 15 Ouest et 18 ont renvoyé leurs prévisions hier soir.' },

  { id: 'sophie', name: 'Sophie Lenoir', role: 'Responsable Contrôle de gestion', unit: 'cdg', seat: 0,
    skin: '#f0d0b0', hair: '#c98f4f', shirt: '#d9662e', mood: 'sous pression',
    greet: 'On est à J+8 du reporting d\'août. L\'atterrissage 2026 tient à 4 050 M€ mais j\'ai deux lignes qui tirent.' },
  { id: 'thomas', name: 'Thomas Roux', role: 'Contrôleur de gestion — Infrastructures', unit: 'cdg', seat: 1,
    skin: '#e9c6a4', hair: '#2b2118', shirt: '#c4552a', mood: 'méthodique',
    greet: 'Les écarts d\'août sont dans le fichier. Le génie civil de la 15 Sud dérape de 12 M€, mais c\'est du décalage, pas du surcoût.' },
  { id: 'aicha', name: 'Aïcha Diallo', role: 'Contrôleuse de gestion — Fonctions support', unit: 'cdg', seat: 2,
    skin: '#8a5a3a', hair: '#141010', shirt: '#e08a58', mood: 'enjouée',
    greet: 'Les frais de structure sont sous le budget de 3 %. Enfin une bonne nouvelle à mettre dans le reporting !' },

  { id: 'marc', name: 'Marc Dupuis', role: 'Responsable Consolidation & Pilotage budgétaire', unit: 'bud', seat: 0,
    skin: '#e3bc98', hair: '#8c8c8c', shirt: '#5a4aa8', mood: 'stoïque',
    greet: 'La clôture d\'août est à 92 %. Il reste 14 anomalies d\'interface et un rapprochement bancaire qui refuse de tomber juste.' },
  { id: 'nadege', name: 'Nadège Okafor', role: 'Responsable consolidation & CAC', unit: 'bud', seat: 1,
    skin: '#6e4327', hair: '#0e0b09', shirt: '#8f80d6', mood: 'précise',
    greet: 'Les commissaires aux comptes arrivent le 22 pour l\'intérim. Je prépare le dossier de révision.' },

  { id: 'nadia', name: 'Nadia Haddad', role: 'Responsable Financement & Trésorerie', unit: 'fin', seat: 0,
    skin: '#d9ad85', hair: '#1a1210', shirt: '#2f8f5c', mood: 'vigilante',
    greet: 'Position ce matin : 2 348 M€. On couvre 5,4 mois de décaissements. L\'émission verte de novembre se prépare.' },
  { id: 'pierre', name: 'Pierre Vasseur', role: 'Responsable Financements', unit: 'fin', seat: 1,
    skin: '#e8c4a0', hair: '#4a3a2c', shirt: '#3aa76d', mood: 'enthousiaste',
    greet: 'Le book-building de l\'obligation verte ? Les investisseurs sont chauds. On vise 1,5 Md€ sur 20 ans à mid-swap +38.' },
  { id: 'elodie', name: 'Élodie Chen', role: 'Back-office trésorerie', unit: 'fin', seat: 2,
    skin: '#f0d4b4', hair: '#151010', shirt: '#57b884', mood: 'rigoureuse',
    greet: 'Les rapprochements bancaires sont faits. Un virement de 4,2 M€ en suspens avec l\'agence comptable — je relance.' },


  { id: 'olivier', name: 'Olivier Mercier', role: 'Fiscaliste', unit: 'fis', seat: 0,
    skin: '#e6c2a0', hair: '#6a5a4a', shirt: '#a87a2e', mood: 'affable',
    greet: 'Les recettes fiscales affectées 2026 sont prévues à 812 M€. La TSB rentre bien, l\'IFER est conforme aux prévisions.' },
  { id: 'camille', name: 'Camille Petit', role: 'Chargée des recettes affectées', unit: 'fis', seat: 1,
    skin: '#f4d8bc', hair: '#c49a4a', shirt: '#c99a44', mood: 'curieuse',
    greet: 'La taxe spéciale d\'équipement a été notifiée : 117 M€. Je mets à jour le tableau de recettes.' },

  { id: 'yann', name: 'Yann Le Goff', role: 'Responsable Lab IA & SI Finance', unit: 'lab', seat: 0,
    skin: '#e9c8a8', hair: '#8a3a2a', shirt: '#2f6fb8', mood: 'geek',
    greet: 'PHENIX lot 2 est à 78 %. La bascule des immobilisations est prévue le week-end du 4 octobre. Croisez les doigts.' },
  { id: 'kevin', name: 'Kevin Nguyen', role: 'Développeur data finance', unit: 'lab', seat: 1,
    skin: '#f0d0ac', hair: '#141210', shirt: '#4f8fd9', mood: 'malicieux',
    greet: 'J\'ai automatisé le reporting de trésorerie. Nadia ne le sait pas encore, elle croit que c\'est moi qui le fais à la main.' },

  { id: 'claire', name: 'Claire Bonnet', role: 'Responsable Assurances', unit: 'ass', seat: 0,
    skin: '#eccaa8', hair: '#8c5a3a', shirt: '#4a6d94', mood: 'posée',
    greet: 'Le programme tous risques chantier est renouvelé jusqu\'en 2028. Trois sinistres ouverts sur la 15 Sud, dont une venue d\'eau à 2,4 M€.' },
  { id: 'samuel', name: 'Samuel Adjei', role: 'Chargé de sinistres', unit: 'ass', seat: 1,
    skin: '#6e4327', hair: '#0e0b09', shirt: '#6f93bd', mood: 'méthodique',
    greet: 'J\'instruis 11 dossiers de sinistres. La franchise moyenne est de 500 k€, on récupère 71 % des montants déclarés.' },

  { id: 'isabelle', name: 'Isabelle Fontaine', role: 'Responsable Contrôle interne', unit: 'ci', seat: 0,
    skin: '#ebc9a8', hair: '#5a4838', shirt: '#6f7f8f', mood: 'posée',
    greet: '37 contrôles clés, 34 conformes. Les 3 écarts portent sur la séparation des tâches dans le circuit d\'engagement.' },
  { id: 'hugo', name: 'Hugo Lambert', role: 'Chargé de contrôle interne', unit: 'ci', seat: 1,
    skin: '#e4bf9c', hair: '#2a1e14', shirt: '#8a9bab', mood: 'consciencieux',
    greet: 'Le plan d\'audit interne 2026 : 5 missions sur 7 réalisées. La revue des délégations de signature commence lundi.' },

  { id: 'sandrine', name: 'Sandrine Morel', role: 'Assistante de direction', unit: 'dir', seat: 1,
    skin: '#f1d3b5', hair: '#b06a3a', shirt: '#c9a34a', mood: 'organisée',
    greet: 'L\'agenda d\'Hélène est plein jusqu\'à jeudi. Le COMEX est à 11h, salle du Conseil. Elle veut ses éléments à 10h30 dernier délai.' },
];

/* -------------------------------------------------- Reportings ------ */
/* Chaque unité a un reporting : KPIs, une série (graphique), commentaires, vigilances */
DFIN.REPORTS = {
  cdg: {
    title: 'Reporting mensuel — Août 2026 (J+8)',
    kpis: [
      { l: 'Budget invest. 2026', v: '4 180 M€' },
      { l: 'Réalisé à fin août', v: '2 640 M€', s: '63 %' },
      { l: 'Atterrissage 2026', v: '4 050 M€', s: '−3,1 % vs budget', t: 'ok' },
      { l: 'Frais de structure', v: '−3 %', s: 'vs budget', t: 'ok' },
      { l: 'Écarts > 5 M€', v: '6 lignes', t: 'warn' },
    ],
    chart: { type: 'bar', title: 'Dépenses d\'investissement mensuelles (M€)', labels: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep*','Oct*','Nov*','Déc*'],
      series: [ { name: 'Budget', data: [300,320,340,350,360,370,340,330,360,380,370,360], color: '#8a8a8a' },
                { name: 'Réalisé / Prév.', data: [281,305,338,362,349,371,318,316,350,372,368,352], color: '#e07a3f' } ] },
    comments: [
      'L\'atterrissage 2026 se stabilise à 4 050 M€, soit −130 M€ par rapport au budget, principalement par décalage calendaire du génie civil (15 Sud, 16).',
      'Les frais de structure restent maîtrisés (−3 %), effet des recrutements différés au 2e semestre.',
      'Cadrage budgétaire 2027 : les lettres de cadrage partent le 25/09 avec une hypothèse d\'indexation à 2,4 %.',
    ],
    alerts: [
      { t: 'warn', m: 'Ligne 15 Sud — génie civil : +12 M€ d\'écart en août (décalage, à confirmer au T3).' },
      { t: 'warn', m: 'Ligne 18 — avenant gares (+34 M€) non encore intégré à l\'atterrissage.' },
      { t: 'ok', m: 'Reporting d\'août diffusable le 15/09 comme prévu.' },
    ],
  },
  bud: {
    title: 'Consolidation & pilotage budgétaire — Août 2026',
    kpis: [
      { l: 'Avancement clôture', v: '92 %', t: 'ok' },
      { l: 'Anomalies ouvertes', v: '14', s: 'interfaces SAP', t: 'warn' },
      { l: 'Factures reçues (semaine)', v: '1 840' },
      { l: 'Délai global de paiement', v: '27 j', s: 'objectif 30 j', t: 'ok' },
      { l: 'Mises en service à reclasser', v: '1,1 Md€' },
    ],
    chart: { type: 'line', title: 'Délai global de paiement (jours)', labels: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août'],
      series: [ { name: 'DGP', data: [31,29,28,30,27,26,28,27], color: '#7c6bd1' }, { name: 'Objectif', data: [30,30,30,30,30,30,30,30], color: '#8a8a8a', dash: true } ] },
    comments: [
      'Clôture d\'août à 92 % à J+8. Les 14 anomalies proviennent de l\'interface achats → comptabilité (lot PHENIX 1).',
      'Rapprochement bancaire du compte Trésor : écart de 4,2 M€ identifié (virement en suspens), régularisation en cours avec la trésorerie.',
      'Intérim des commissaires aux comptes du 22 au 26/09.',
    ],
    alerts: [
      { t: 'warn', m: '14 anomalies d\'interface à traiter avant le 15/09.' },
      { t: 'warn', m: 'Écart de rapprochement 4,2 M€ — en cours avec TRE.' },
      { t: 'ok', m: 'DGP sous l\'objectif pour le 5e mois consécutif.' },
    ],
  },
  fin: {
    title: 'Position de trésorerie — 12/09/2026',
    kpis: [
      { l: 'Trésorerie disponible', v: '2 348 M€', t: 'ok' },
      { l: 'Couverture décaissements', v: '5,4 mois' },
      { l: 'Encours de dette', v: '26,8 Md€' },
      { l: 'Taux moyen pondéré', v: '1,62 %' },
      { l: 'Prochaine émission verte', v: '1,5 Md€', s: '17/11 — 20 ans' },
    ],
    chart: { type: 'line', title: 'Trésorerie fin de mois (M€) — réel puis prévision', labels: ['Mar','Avr','Mai','Juin','Juil','Août','Sep*','Oct*','Nov*','Déc*'],
      series: [ { name: 'Trésorerie', data: [2810,2620,2450,2890,2610,2348,2050,1780,3180,2860], color: '#3aa76d' }, { name: 'Seuil de sécurité', data: [1500,1500,1500,1500,1500,1500,1500,1500,1500,1500], color: '#d94f6a', dash: true } ] },
    comments: [
      'Position de 2 348 M€ ce matin, en baisse saisonnière (pic de décaissements travaux de l\'été).',
      'Le point bas prévisionnel est atteint fin octobre (1 780 M€), au-dessus du seuil de sécurité de 1 500 M€ ; l\'émission verte de novembre reconstitue la marge.',
      'Sensibilité : +100 pb de taux = +9 M€ de frais financiers annuels sur la dette variable (3 % de l\'encours).',
    ],
    alerts: [
      { t: 'warn', m: 'Point bas fin octobre à 1 780 M€ — marge de 280 M€ sur le seuil.' },
      { t: 'ok', m: 'Notation confirmée AA (perspective stable) le 03/09.' },
      { t: 'info', m: 'Roadshow investisseurs 06–08/10 : Paris, Francfort, Amsterdam.' },
    ],
  },
  inv: {
    title: 'Programme — Coûts à terminaison, revue T3 2026 (synthèse BUD)',
    kpis: [
      { l: 'CAT programme', v: '36,1 Md€', s: 'objectif 35,6', t: 'warn' },
      { l: 'Engagé cumulé', v: '29,4 Md€', s: '81 %' },
      { l: 'Provision pour aléas', v: '1,9 Md€', s: 'consommée 41 %' },
      { l: 'Marchés en alerte', v: '18 🟠 · 3 🔴', t: 'warn' },
      { l: 'Avenants signés (T3)', v: '+61 M€' },
    ],
    chart: { type: 'bar', title: 'CAT par ligne (Md€) — objectif vs estimé', labels: ['L14','L15 S','L15 O','L15 E','L16','L17','L18'],
      series: [ { name: 'Objectif', data: [3.4,7.2,5.9,5.6,4.5,3.3,5.7], color: '#8a8a8a' }, { name: 'Estimé T3', data: [3.4,7.4,6.2,5.6,4.6,3.3,5.6], color: '#d94f6a' } ] },
    comments: [
      'Le coût à terminaison du programme ressort à 36,1 Md€ (+0,5 Md€ vs objectif), porté par les lignes 15 Sud et 15 Ouest.',
      '15 Ouest : retard de 6 semaines des tunneliers, impact estimé 180 M€ (pénalités en discussion avec le groupement).',
      '3 marchés en alerte rouge présentés au comité d\'engagement du 18/09.',
    ],
    alerts: [
      { t: 'bad', m: 'L15 Ouest — tunneliers : +6 semaines, +180 M€ estimés.' },
      { t: 'warn', m: 'L15 Sud — génie civil : réclamation groupement 95 M€ en instruction.' },
      { t: 'ok', m: 'L18 — avenant gares signé, planning sécurisé.' },
    ],
  },
  fis: {
    title: 'Recettes affectées & fiscalité — 2026',
    kpis: [
      { l: 'Recettes fiscales affectées', v: '812 M€', s: 'prévision 2026' },
      { l: 'Encaissé à date', v: '561 M€', s: '69 %', t: 'ok' },
      { l: 'TSB (taxe sur les bureaux)', v: '498 M€' },
      { l: 'IFER matériel roulant', v: '86 M€' },
      { l: 'Crédit de TVA en attente', v: '212 M€', t: 'warn' },
    ],
    chart: { type: 'bar', title: 'Recettes affectées par nature (M€)', labels: ['TSB','TSE','IFER','Redev.','Autres'],
      series: [ { name: 'Prévu 2026', data: [498,117,86,74,37], color: '#8a8a8a' }, { name: 'Encaissé', data: [402,0,86,52,21], color: '#b78a3a' } ] },
    comments: [
      'Les recettes fiscales affectées 2026 sont attendues à 812 M€ ; 69 % encaissés à date, conformément au calendrier de recouvrement.',
      'Taxe spéciale d\'équipement notifiée à 117 M€, encaissement en novembre.',
      'Crédit de TVA : 212 M€ en attente de remboursement, délai moyen 42 jours.',
    ],
    alerts: [
      { t: 'warn', m: 'Crédit de TVA 212 M€ — relance DGFiP en cours.' },
      { t: 'ok', m: 'IFER intégralement encaissée.' },
      { t: 'info', m: 'Redevances commerciales gares : +8 % vs 2025.' },
    ],
  },
  lab: {
    title: 'Lab IA & Data — PHENIX, automatisation, assistants',
    kpis: [
      { l: 'PHENIX lot 2 (immos)', v: '78 %', s: 'bascule 04/10', t: 'ok' },
      { l: 'Disponibilité ERP', v: '99,6 %' },
      { l: 'Tickets ouverts', v: '23', s: '4 critiques', t: 'warn' },
      { l: 'Reportings automatisés', v: '31 / 45' },
      { l: 'Interfaces en anomalie', v: '1', s: 'achats → compta', t: 'warn' },
    ],
    chart: { type: 'line', title: 'Avancement PHENIX lot 2 (%)', labels: ['Mar','Avr','Mai','Juin','Juil','Août','Sep'],
      series: [ { name: 'Réel', data: [12,25,38,49,61,70,78], color: '#3f8fd9' }, { name: 'Plan', data: [15,28,40,52,64,76,85], color: '#8a8a8a', dash: true } ] },
    comments: [
      'PHENIX lot 2 (immobilisations) à 78 %, léger retard de 7 points sur le plan, bascule maintenue au week-end du 4 octobre.',
      'Interface achats → comptabilité : correctif livré en recette, mise en production le 14/09.',
      '31 reportings sur 45 sont désormais automatisés (trésorerie, DGP, engagements).',
    ],
    alerts: [
      { t: 'warn', m: 'Correctif interface achats à valider avant le 14/09 (impact clôture).' },
      { t: 'warn', m: 'Gel des développements du 28/09 au 06/10 (bascule PHENIX).' },
      { t: 'ok', m: 'Reporting trésorerie automatisé livré.' },
    ],
  },
  ci: {
    title: 'Contrôle interne — T3 2026',
    kpis: [
      { l: 'Contrôles clés', v: '37', s: '34 conformes', t: 'ok' },
      { l: 'Écarts ouverts', v: '3', s: 'séparation des tâches', t: 'warn' },
      { l: 'Recommandations audit', v: '12 / 19', s: 'closes' },
      { l: 'Risques majeurs', v: '6', s: '2 en hausse', t: 'warn' },
      { l: 'Plan d\'audit 2026', v: '5 / 7', s: 'missions' },
    ],
    chart: { type: 'bar', title: 'Cartographie : risques financiers majeurs (criticité /25)', labels: ['Dérive CAT','Taux','Liquidité','Fraude','SI','Fiscal'],
      series: [ { name: 'T2', data: [16,9,6,8,12,7], color: '#8a8a8a' }, { name: 'T3', data: [18,10,6,8,14,7], color: '#8a9bab' } ] },
    comments: [
      '34 contrôles clés sur 37 conformes ; les 3 écarts concernent la séparation des tâches dans le circuit d\'engagement (habilitations SAP).',
      'Risques en hausse : dérive des coûts à terminaison (18/25) et risque SI lié à la bascule PHENIX (14/25).',
      'Revue des délégations de signature à partir du 15/09.',
    ],
    alerts: [
      { t: 'warn', m: 'Habilitations SAP : 3 conflits de séparation des tâches à corriger.' },
      { t: 'warn', m: 'Risque SI en hausse pendant la bascule PHENIX.' },
      { t: 'ok', m: '12 recommandations d\'audit closes depuis janvier.' },
    ],
  },
  ass: {
    title: 'Programme d\'assurances — Point T3 2026',
    kpis: [
      { l: 'Primes annuelles', v: '38,4 M€' },
      { l: 'Sinistres ouverts', v: '11', s: '3 sur la L15 Sud', t: 'warn' },
      { l: 'Taux de récupération', v: '71 %', s: 'montants déclarés', t: 'ok' },
      { l: 'Franchise moyenne', v: '500 k€' },
      { l: 'Renouvellement TRC', v: '2028', s: 'signé', t: 'ok' },
    ],
    chart: { type: 'bar', title: 'Sinistres déclarés vs indemnisés par ligne (M€)', labels: ['L14','L15 S','L15 O','L16','L17','L18'],
      series: [ { name: 'Déclaré', data: [1.2,6.8,2.1,3.4,0.9,1.7], color: '#8a8a8a' }, { name: 'Indemnisé', data: [1.0,4.1,1.6,2.6,0.7,1.2], color: '#5b7fa6' } ] },
    comments: [
      'Le programme tous risques chantier (TRC) est renouvelé jusqu\'en 2028 avec une prime stable (+1,8 %).',
      'Venue d\'eau sur la 15 Sud : 2,4 M€ déclarés, expertise contradictoire le 24/09.',
      'Responsabilité civile maître d\'ouvrage : aucun sinistre majeur au T3.',
    ],
    alerts: [
      { t: 'warn', m: 'L15 Sud — venue d\'eau : expertise le 24/09, 2,4 M€ en jeu.' },
      { t: 'ok', m: 'TRC renouvelée jusqu\'en 2028.' },
      { t: 'info', m: 'Revue annuelle du programme avec le courtier le 15/10.' },
    ],
  },
  srv: {
    title: 'Salle serveurs — État des systèmes financiers',
    kpis: [
      { l: 'ERP financier', v: '99,6 %', s: 'disponibilité', t: 'ok' },
      { l: 'Entrepôt de données', v: 'OK', s: 'dernier flux 07:50', t: 'ok' },
      { l: 'Reportings automatisés', v: '31 / 45' },
      { l: 'Sauvegarde', v: 'J-0', s: '02:10 ce matin', t: 'ok' },
      { l: 'Température', v: '21,4 °C' },
    ],
    chart: { type: 'line', title: 'Disponibilité ERP (%)', labels: ['Mar','Avr','Mai','Juin','Juil','Août','Sep'], series: [ { name: 'Dispo.', data: [99.2,99.8,99.5,99.9,99.7,99.6,99.6], color: '#5aa0c8' } ] },
    comments: [ 'Les racks hébergent l\'ERP, l\'entrepôt de données finance et les robots de reporting du Lab IA.', 'Gel des développements du 28/09 au 06/10 pour la bascule PHENIX lot 2.' ],
    alerts: [ { t: 'warn', m: 'Bascule PHENIX lot 2 le 04/10 : fenêtre d\'indisponibilité de 6 h.' }, { t: 'ok', m: 'Sauvegardes vérifiées.' } ],
  },
  pil: {
    title: 'Tableau de bord consolidé — Direction financière',
    kpis: [
      { l: 'Atterrissage invest. 2026', v: '4 050 M€', s: '−3,1 % vs budget', t: 'ok' },
      { l: 'Trésorerie', v: '2 348 M€', t: 'ok' },
      { l: 'CAT programme', v: '36,1 Md€', s: '+0,5 vs objectif', t: 'warn' },
      { l: 'Clôture août', v: '92 %' },
      { l: 'Recettes affectées encaissées', v: '69 %' },
    ],
    chart: { type: 'line', title: 'Trésorerie (M€) et dépenses mensuelles', labels: ['Mar','Avr','Mai','Juin','Juil','Août','Sep*','Oct*','Nov*','Déc*'],
      series: [ { name: 'Trésorerie', data: [2810,2620,2450,2890,2610,2348,2050,1780,3180,2860], color: '#4fb3d9' } ] },
    comments: [ 'Synthèse alimentée par les unités. Rafraîchissement toutes les 15 minutes.' ],
    alerts: [
      { t: 'bad', m: 'L15 Ouest — tunneliers (+180 M€).' },
      { t: 'warn', m: 'Point bas trésorerie fin octobre (1 780 M€).' },
      { t: 'warn', m: 'Bascule PHENIX lot 2 le 04/10.' },
    ],
  },
  dir: {
    title: 'Note de synthèse pour le COMEX — 12/09/2026',
    kpis: [
      { l: 'Message clé n°1', v: 'Atterrissage tenu', s: '4 050 M€', t: 'ok' },
      { l: 'Message clé n°2', v: 'Liquidité solide', s: '5,4 mois', t: 'ok' },
      { l: 'Point d\'attention', v: 'CAT +0,5 Md€', s: 'L15 Ouest', t: 'warn' },
      { l: 'Décision attendue', v: 'Green bond', s: '1,5 Md€ — 17/11' },
    ],
    chart: { type: 'bar', title: 'Budget 2027 — cadrage (Md€)', labels: ['Invest.','Fonct.','Frais fin.','Recettes aff.'],
      series: [ { name: '2026', data: [4.05,0.21,0.43,0.81], color: '#8a8a8a' }, { name: 'Cadrage 2027', data: [4.6,0.22,0.47,0.84], color: '#c9a34a' } ] },
    comments: [ 'Note en cours de rédaction. Les éléments manquants sont à collecter auprès des unités.' ],
    alerts: [ { t: 'info', m: 'COMEX à 11h — salle du Conseil.' } ],
  },
  caf: {
    title: 'Cafétéria', kpis: [ { l: 'Cafés servis aujourd\'hui', v: '143' }, { l: 'Rumeurs en circulation', v: '4' } ],
    chart: { type: 'bar', title: 'Consommation de café par unité (tasses/jour)', labels: ['CDG','CPT','TRE','INV','FIS','SIF','CIR'], series: [ { name: 'Tasses', data: [28,34,19,24,11,17,10], color: '#a86f4a' } ] },
    comments: [ 'La machine fait un bruit bizarre depuis mardi.' ], alerts: [],
  },
};

/* -------------------------------------------------- Calendrier ------ */
/* d: 'YYYY-MM-DD', u: unité, t: type (clot|comite|budget|fin|audit|si|ext) */
DFIN.CALENDAR = [
  { d: '2026-09-14', u: 'lab', t: 'si',     n: 'Mise en production du correctif interface achats → comptabilité' },
  { d: '2026-09-15', u: 'bud', t: 'clot',   n: 'Fin de clôture mensuelle d\'août (J+10)' },
  { d: '2026-09-15', u: 'cdg', t: 'budget', n: 'Diffusion du reporting mensuel d\'août au COMEX' },
  { d: '2026-09-15', u: 'ci', t: 'audit',  n: 'Lancement de la revue des délégations de signature' },
  { d: '2026-09-18', u: 'bud', t: 'comite', n: 'Comité d\'engagement — revue des CAT T3 (3 marchés rouges)' },
  { d: '2026-09-22', u: 'fin', t: 'comite', n: 'Comité de trésorerie et de financement' },
  { d: '2026-09-22', u: 'bud', t: 'audit',  n: 'Intérim des commissaires aux comptes (22–26/09)' },
  { d: '2026-09-25', u: 'cdg', t: 'budget', n: 'Envoi des lettres de cadrage budgétaire 2027' },
  { d: '2026-09-28', u: 'lab', t: 'si',     n: 'Gel des développements ERP (jusqu\'au 06/10)' },
  { d: '2026-09-30', u: 'bud', t: 'clot',   n: 'Arrêté des comptes semestriels au 30/06 — version définitive' },
  { d: '2026-10-04', u: 'lab', t: 'si',     n: 'Bascule PHENIX lot 2 — immobilisations (week-end)' },
  { d: '2026-10-06', u: 'fin', t: 'fin',    n: 'Roadshow investisseurs obligation verte (Paris, Francfort, Amsterdam)' },
  { d: '2026-10-08', u: 'dir', t: 'comite', n: 'Conseil de surveillance — comptes semestriels' },
  { d: '2026-10-13', u: 'ci', t: 'comite', n: 'Comité d\'audit — cartographie des risques T3' },
  { d: '2026-10-15', u: 'bud', t: 'clot',   n: 'Clôture mensuelle de septembre (J+10)' },
  { d: '2026-09-24', u: 'ass', t: 'ext',    n: 'Expertise contradictoire — venue d\'eau L15 Sud (2,4 M€)' },
  { d: '2026-10-15', u: 'ass', t: 'comite', n: 'Revue annuelle du programme d\'assurances avec le courtier' },
  { d: '2026-10-20', u: 'cdg', t: 'budget', n: 'Atterrissage 2026 — version 2' },
  { d: '2026-10-27', u: 'fis', t: 'fin',    n: 'Déclaration TVA T3 et demande de remboursement de crédit' },
  { d: '2026-11-03', u: 'cdg', t: 'budget', n: 'Arbitrages budgétaires 2027 avec les directions opérationnelles' },
  { d: '2026-11-10', u: 'fis', t: 'fin',    n: 'Encaissement de la taxe spéciale d\'équipement (117 M€)' },
  { d: '2026-11-17', u: 'fin', t: 'fin',    n: 'Émission obligataire verte — 1,5 Md€, 20 ans' },
  { d: '2026-11-20', u: 'bud', t: 'comite', n: 'Comité d\'engagement — avenants lignes 15 & 16' },
  { d: '2026-11-26', u: 'dir', t: 'comite', n: 'Conseil de surveillance — budget 2027' },
  { d: '2026-12-10', u: 'bud', t: 'comite', n: 'Revue des coûts à terminaison T4' },
  { d: '2026-12-15', u: 'ci', t: 'audit',  n: 'Restitution du plan d\'audit interne 2026' },
  { d: '2026-12-18', u: 'bud', t: 'clot',   n: 'Pré-clôture annuelle — instructions de clôture 2026' },
  { d: '2026-12-22', u: 'fin', t: 'fin',    n: 'Placement de fin d\'année et point de liquidité' },
];
DFIN.CAL_TYPES = {
  clot: { n: 'Clôture', c: '#7c6bd1' }, comite: { n: 'Comité / Conseil', c: '#c9a34a' }, budget: { n: 'Budget & reporting', c: '#e07a3f' },
  fin: { n: 'Trésorerie & fiscal', c: '#3aa76d' }, audit: { n: 'Audit & contrôle', c: '#8a9bab' }, si: { n: 'SI Finance', c: '#3f8fd9' }, ext: { n: 'Externe', c: '#d94f6a' },
};

/* -------------------------------------------------- Dernières infos - */
/* Par personne : liste d'infos "fraîches" (une nouvelle info à chaque visite) */
DFIN.NEWS = {
  helene: [ 'Le Directeur général veut un focus sur la liquidité et la dérive des CAT. Pas de surprise, mais des chiffres solides.',
            'Le Conseil de surveillance du 8 octobre examinera les comptes semestriels. Je veux une répétition générale la semaine prochaine.',
            'On m\'a demandé une note sur l\'impact d\'une hausse de 100 points de base. Voyez avec Nadia.' ],
  sandrine: [ 'La salle du Conseil est réservée de 11h à 12h30. Les documents doivent être envoyés à 10h30.',
              'Rachid a demandé 15 minutes avec Hélène avant le COMEX. J\'ai calé 10h15.',
              'Le traiteur du Conseil de surveillance est confirmé. Oui, c\'est important aussi.' ],
  priya: [ 'Le flux SAP de ce matin est passé à 7h50. Les chiffres du mur sont à jour.',
           'J\'ai ajouté un indicateur de point bas de trésorerie sur l\'écran de gauche.',
           'Le taux de complétude des prévisions des directions opérationnelles est à 94 %.' ],
  malik: [ 'La 15 Ouest a envoyé une prévision révisée hier à 19h : +22 M€ sur septembre.',
           'Le taux de consommation du budget est de 63 % à fin août, en ligne avec la courbe en S.',
           'Je prépare un écran spécial COMEX avec 5 indicateurs, pas plus.' ],
  sophie: [ 'L\'atterrissage 2026 tient à 4 050 M€. Si la 18 intègre son avenant, on passe à 4 084.',
            'Le cadrage 2027 part le 25 : indexation 2,4 %, gel des effectifs support.',
            'Le reporting d\'août sera diffusé lundi 15 à 9h. Les commentaires sont relus.' ],
  thomas: [ 'Le génie civil de la 15 Sud : 12 M€ d\'écart, mais 9 M€ sont un simple décalage de facturation.',
            'Les directions opérationnelles ont rendu 94 % de leurs prévisions. Il manque la 17.',
            'Je fais tourner un scénario "aléas +10 %" pour Hélène.' ],
  aicha: [ 'Les frais de structure sont à −3 % : recrutements décalés et moins de déplacements.',
           'Les frais de conseil dépassent de 1,2 M€ — c\'est l\'étude PHENIX lot 3.',
           'J\'ai mis les graphiques du reporting en couleurs "daltonien-friendly". Personne n\'a remarqué.' ],
  marc: [ 'Clôture à 92 %. Les 14 anomalies seront purgées si le correctif SI passe dimanche.',
          'L\'écart de rapprochement de 4,2 M€ : virement en suspens à l\'agence comptable, Élodie relance.',
          'Les CAC arrivent le 22. Nadège a préparé le dossier de révision.' ],
  julie: [ '1 840 factures cette semaine, un record. Le DGP tient à 27 jours.',
           'Trois fournisseurs de la 16 réclament des intérêts moratoires. Montant : 48 k€.',
           'Le circuit de validation dématérialisé est enfin utilisé par toutes les directions.' ],
  lucas: [ '1,1 Md€ de mises en service de la 14 Nord à reclasser en immobilisations ce mois-ci.',
           'La bascule PHENIX lot 2 va migrer 41 000 fiches d\'immobilisation. J\'ai vérifié les 200 plus grosses.',
           'Amortissements 2026 recalculés : +6 M€ par rapport au budget.' ],
  nadege: [ 'Dossier de révision prêt à 80 % pour l\'intérim des CAC.',
            'Les CAC veulent un focus sur les provisions pour litiges : 340 M€ au 30/06.',
            'Les comptes semestriels seront arrêtés le 30/09, version définitive.' ],
  nadia: [ 'Position : 2 348 M€. Point bas prévu fin octobre à 1 780 M€, au-dessus du seuil de 1 500.',
           'Sensibilité +100 pb : +9 M€ de frais financiers par an. Note envoyée à Hélène.',
           'Le comité de trésorerie du 22 validera le programme d\'émission de novembre.' ],
  pierre: [ 'L\'obligation verte : 1,5 Md€, 20 ans, cible mid-swap +38. Les investisseurs nordiques sont intéressés.',
            'Roadshow du 6 au 8 octobre : Paris, Francfort, Amsterdam. Hélène part avec moi.',
            'La notation AA a été confirmée le 3 septembre, perspective stable.' ],
  elodie: [ 'Rapprochements faits. Le virement de 4,2 M€ sera régularisé lundi, j\'ai eu l\'agence comptable.',
            'Les placements arrivent à échéance le 30/09 : 600 M€ à replacer.',
            'Kevin a automatisé le reporting de trésorerie. Je le sais, mais je ne dis rien à Nadia.' ],
  rachid: [ 'CAT à 36,1 Md€. La 15 Ouest, ce sont les tunneliers : 6 semaines de retard, 180 M€.',
            'Comité d\'engagement le 18 : 3 marchés rouges à présenter. J\'ai besoin qu\'Hélène arbitre.',
            'La réclamation du groupement de la 15 Sud est instruite : 95 M€ demandés, on en reconnaît 30.' ],
  ines: [ 'La revue des CAT T3 est finalisée : 18 marchés en orange, 3 en rouge.',
          'Sur la 16, les gares sont dans les clous. C\'est le système de transport qui inquiète.',
          'Je prépare la fiche de synthèse "aléas" pour le comité du 18.' ],
  baptiste: [ 'L\'avenant gares de la 18 est signé : +34 M€, planning sécurisé.',
              'La 17 n\'a pas rendu sa prévision. Je les relance ce matin.',
              'Les pénalités de retard de la 15 Ouest : 12 M€ potentiels, à négocier.' ],
  olivier: [ 'Recettes fiscales affectées 2026 : 812 M€ prévus, 69 % encaissés.',
             'Le crédit de TVA de 212 M€ : la DGFiP annonce un remboursement sous 3 semaines.',
             'La TSB progresse de 2,1 % cette année, effet de l\'indexation des tarifs.' ],
  camille: [ 'La taxe spéciale d\'équipement est notifiée à 117 M€, encaissement en novembre.',
             'Les redevances commerciales des gares progressent de 8 %.',
             'Je mets à jour le tableau de recettes pour le COMEX.' ],
  yann: [ 'PHENIX lot 2 à 78 %. Bascule le week-end du 4 octobre, gel des développements dès le 28/09.',
          'Le correctif de l\'interface achats passe en production le 14. Marc croise les doigts.',
          'Disponibilité de l\'ERP : 99,6 % sur le mois.' ],
  kevin: [ 'Reporting de trésorerie automatisé. Gain : 2 jours-homme par mois.',
           'J\'ai un prototype de tableau de bord CAT en temps réel. Rachid ne veut pas encore le voir.',
           '4 tickets critiques ouverts, tous liés à l\'interface achats.' ],
  isabelle: [ '3 écarts de séparation des tâches : des habilitations SAP à corriger, rien de grave.',
              'Risques en hausse au T3 : dérive des CAT et risque SI pendant la bascule.',
              'Le comité d\'audit du 13 octobre examinera la cartographie.' ],
  hugo: [ 'La revue des délégations de signature commence lundi. 214 délégations à passer en revue.',
          '5 missions d\'audit sur 7 réalisées. Les deux dernières portent sur les achats et la paie.',
          '12 recommandations d\'audit closes depuis janvier, 7 restent ouvertes.' ],
};

/* -------------------------------------------------- Bavardages ------ */
DFIN.CHATTER = {
  ass: [ 'Expertise le 24.', 'Franchise 500 k€.', 'La TRC est renouvelée.', 'Onze dossiers ouverts.' ],
  srv: [ 'bip.', 'bip bip.' ],
  cdg: [ 'Le fichier ne s\'ouvre plus…', 'Encore un écart de 12 M€ ?', 'J+8. On tient.', 'Qui a touché à l\'onglet Synthèse ?' ],
  bud: [ 'Le rapprochement ne tombe pas juste.', '1 840 factures…', 'C\'est une écriture d\'inventaire.', 'Les CAC arrivent le 22.' ],
  fin: [ 'Mid-swap +38, pas plus.', 'Position à 2 348.', 'Le point bas est fin octobre.', 'La banque a rappelé.' ],
  inv: [ 'Six semaines de retard…', 'La 15 Ouest, encore.', 'Comité le 18.', 'Aléas ou surcoût ?' ],
  fis: [ 'La TSB rentre bien.', '212 M€ de crédit de TVA.', 'La TSE est notifiée.', 'Redevances : +8 %.' ],
  lab: [ 'Le flux est passé à 7h50.', 'Gel des devs le 28.', 'Encore un ticket critique.', 'Bascule le 4 octobre.' ],
  ci: [ '34 sur 37.', 'Séparation des tâches…', 'Le comité d\'audit est le 13.', '214 délégations à revoir.' ],
  pil: [ 'Rafraîchissement dans 4 min.', 'La courbe en S se tient.', 'Écran spécial COMEX.', 'Le flux a une heure de retard.' ],
  dir: [ 'COMEX à 11h.', 'Il me faut une synthèse.', 'Dernier délai 10h30.', 'Le DG veut du concret.' ],
  caf: [ 'La machine fait un bruit bizarre.', 'Tu prends un café ?', 'Il paraît que…', 'Pause de 5 minutes.' ],
};

DFIN.RUMORS = [
  'Il paraît que le Conseil de surveillance va demander un plan d\'économies de 5 % sur les frais de structure.',
  'La machine à café serait remplacée par un modèle à grains en novembre. Une révolution.',
  'Quelqu\'un aurait vu Kevin automatiser le reporting de trésorerie. Nadia n\'est pas au courant.',
  'L\'obligation verte serait sursouscrite 4 fois si on en croit Pierre. Pierre est optimiste.',
  'Le groupement de la 15 Ouest préparerait une réclamation de 200 M€. Rachid ne dort plus.',
  'La DAF adjointe ferait le tour du plateau pour "prendre le pouls". Suspect.',
];

/* -------------------------------------------------- Missions -------- */
/* Chaque mission demande de collecter des éléments auprès de personnes, puis de revenir voir le donneur d'ordre. */
DFIN.MISSIONS = [
  {
    id: 'm1', title: 'Les éléments du COMEX', giver: 'helene', deadline: '10:30',
    intro: 'Le COMEX est à 11h. Il me faut trois choses, et vite : la position de trésorerie de Nadia, l\'atterrissage 2026 de Sophie et la synthèse des coûts à terminaison de Marc. Revenez me voir quand vous avez tout.',
    items: [
      { id: 'tre_pos', who: 'nadia',  label: 'Position de trésorerie', ask: 'J\'ai besoin de ta position de trésorerie pour le COMEX.',
        answer: 'La voilà : 2 348 M€ ce matin, 5,4 mois de couverture, point bas fin octobre à 1 780 M€. Je t\'envoie la note de sensibilité aussi.', fact: 'Trésorerie 2 348 M€ · couverture 5,4 mois · point bas 1 780 M€ (oct.)' },
      { id: 'cdg_att', who: 'sophie', label: 'Atterrissage 2026', ask: 'Il me faut l\'atterrissage 2026 pour la note du COMEX.',
        answer: 'Atterrissage à 4 050 M€, soit −130 M€ vs budget, essentiellement du décalage calendaire. Attention : l\'avenant gares de la 18 n\'est pas encore dedans.', fact: 'Atterrissage 2026 : 4 050 M€ (−3,1 % vs budget), hors avenant L18' },
      { id: 'bud_cat', who: 'marc', label: 'Synthèse coûts à terminaison', ask: 'Il me faut la synthèse consolidée des coûts à terminaison pour le COMEX.',
        answer: 'Programme à 36,1 Md€, soit +0,5 Md€ vs objectif. Le sujet, c\'est la 15 Ouest : tunneliers, 6 semaines, 180 M€. Les comptes semestriels intègrent une provision.', fact: 'CAT 36,1 Md€ (+0,5 vs objectif) · L15 Ouest +180 M€' },
    ],
    outro: 'Parfait. Trésorerie solide, atterrissage tenu, et un point d\'attention clair sur la 15 Ouest. C\'est exactement ce dont j\'ai besoin. Je rédige la note.',
    reward: 'Note COMEX bouclée',
  },
  {
    id: 'm2', title: 'L\'écart de 4,2 M€', giver: 'marc', deadline: '12:00',
    intro: 'Puisque vous passez… j\'ai un écart de rapprochement de 4,2 M€ sur le compte Trésor. La trésorerie dit que c\'est un virement en suspens. Vous pouvez vérifier auprès d\'Élodie et me confirmer que le SI ne bloque pas la régularisation ?',
    items: [
      { id: 'elo_vir', who: 'elodie', label: 'Confirmation du virement', ask: 'Marc a un écart de 4,2 M€ sur le compte Trésor. C\'est bien un virement en suspens ?',
        answer: 'Oui : virement à l\'agence comptable émis le 9, non encore comptabilisé de leur côté. Régularisation confirmée pour lundi. Je lui envoie la pièce.', fact: 'Écart 4,2 M€ = virement du 09/09 en suspens, régularisé lundi' },
      { id: 'yann_int', who: 'yann', label: 'Interface SI', ask: 'Le correctif de l\'interface achats → comptabilité, il passe bien dimanche ?',
        answer: 'Recette validée hier soir. Mise en production dimanche 14 à 6h. Les 14 anomalies de Marc devraient être purgées lundi matin.', fact: 'Correctif interface en production dimanche 14/09 — anomalies purgées lundi' },
    ],
    outro: 'Un virement en suspens et un correctif dimanche. Bon. La clôture d\'août sera à 100 % lundi. Merci d\'être passé.',
    reward: 'Clôture d\'août sécurisée',
  },
  {
    id: 'm3', title: 'Le risque de taux', giver: 'helene', deadline: '14:00',
    intro: 'Le DG m\'a demandé l\'impact d\'une hausse de 100 points de base. J\'ai le chiffre de Nadia, mais je veux le croiser avec le contrôle interne et savoir ce que ça change pour le budget 2027. Allez voir Isabelle et Sophie.',
    items: [
      { id: 'isa_taux', who: 'isabelle', label: 'Risque de taux (cartographie)', ask: 'Où est le risque de taux dans la cartographie ?',
        answer: 'Criticité 10/25, stable. 97 % de la dette est à taux fixe, l\'exposition est faible. Le vrai sujet de la carto, c\'est la dérive des CAT à 18/25.', fact: 'Risque de taux 10/25 (stable) · 97 % de dette à taux fixe' },
      { id: 'sop_2027', who: 'sophie', label: 'Impact budget 2027', ask: '+100 pb, ça change quoi au cadrage 2027 ?',
        answer: '+9 M€ de frais financiers, soit 2 % de l\'enveloppe. Absorbable dans le cadrage : on a prévu 470 M€ de frais financiers en 2027 avec une marge.', fact: '+100 pb = +9 M€ en 2027, absorbé dans le cadrage (470 M€)' },
    ],
    outro: 'Exposition faible, impact absorbable. Le DG sera rassuré. Vous pouvez aller prendre un café, vous l\'avez mérité.',
    reward: 'Note risque de taux envoyée au DG',
  },
];

/* -------------------------------------------------- Bandeau écran --- */
DFIN.TICKER = [
  'SINISTRES OUVERTS 11 · TRC 2028 ✔',  'TRÉSORERIE 2 348 M€ ▲', 'ATTERRISSAGE 2026 : 4 050 M€', 'CAT PROGRAMME 36,1 Md€ ⚠', 'CLÔTURE AOÛT 92 %', 'DGP 27 j ✔',
  'RECETTES AFFECTÉES ENCAISSÉES 69 %', 'PHENIX LOT 2 : 78 %', 'NOTATION AA — STABLE', 'GREEN BOND 1,5 Md€ — 17/11',
  'COMITÉ D\'ENGAGEMENT 18/09', 'L15 OUEST : +6 SEM ⚠', 'CONTRÔLES CLÉS 34/37', 'DONNÉES FICTIVES — DÉMO',
];

DFIN.PEOPLE.forEach((p, i) => { p.glasses = i % 3 === 1; p.long = i % 4 === 2; p.badge = i % 2 === 0; });
