/* =====================================================================
   Mur de pilotage — Direction financière (SGP)
   DONNÉES 100 % FICTIVES, conçues pour tester la navigation.
   Modèle : écrans → indicateurs (séries mensuelles 2026, cible, sens,
   ventilation par ligne) + graphiques, alertes, calendrier de gestion.
   ===================================================================== */
'use strict';
const WALL = window.WALL || (window.WALL = {});

WALL.META = { org: 'SGP', dept: 'Direction financière', year: 2026, todayIdx: 8, realizedThrough: 7, updated: '07:50', source: 'ERP + entrepôt de données finance' };
WALL.MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
WALL.LINES = [
  { id: 'L14', name: 'Ligne 14', color: '#9085e9' }, { id: 'L15S', name: 'Ligne 15 Sud', color: '#3987e5' }, { id: 'L15O', name: 'Ligne 15 Ouest', color: '#d95926' },
  { id: 'L15E', name: 'Ligne 15 Est', color: '#199e70' }, { id: 'L16', name: 'Ligne 16', color: '#c98500' }, { id: 'L17', name: 'Ligne 17', color: '#d55181' }, { id: 'L18', name: 'Ligne 18', color: '#e66767' },
];

/* Formats : 'meur' (M€), 'mdeur' (Md€), 'pct', 'int', 'days', 'months', 'ratepct' */
const S = (arr) => arr; // lisibilité

WALL.SCREENS = [
  /* ------------------------------------------------ 1. Synthèse ---- */
  { id: 'syn', title: 'Synthèse DFIN', short: 'Synthèse', unit: 'Direction', owner: 'Hélène Marchetti', color: '#c9a34a', pos: [1, 1],
    intro: 'Les huit indicateurs suivis chaque semaine par la Directrice financière. Chaque tuile ouvre l\'écran de l\'unité concernée.',
    kpis: [
      { id: 'syn_tre', ref: 'fin_pos', label: 'Trésorerie disponible' },
      { id: 'syn_att', ref: 'cdg_att', label: 'Atterrissage investissements 2026' },
      { id: 'syn_cat', ref: 'cat_prog', label: 'Coût à terminaison programme' },
      { id: 'syn_rec', ref: 'fis_enc', label: 'Recettes affectées encaissées' },
      { id: 'syn_dgp', ref: 'bud_dgp', label: 'Délai global de paiement' },
      { id: 'syn_ctl', ref: 'ci_conf', label: 'Contrôles clés conformes' },
      { id: 'syn_sin', ref: 'ass_open', label: 'Sinistres ouverts' },
      { id: 'syn_erp', ref: 'lab_dispo', label: 'Disponibilité ERP' },
    ],
    charts: [ { ref: 'fin_pos', type: 'line', title: 'Trésorerie fin de mois (M€)' }, { ref: 'cdg_mens', type: 'bars', title: 'Dépenses d\'investissement mensuelles (M€)' } ],
  },
  /* ------------------------------------------------ 2. Financement - */
  { id: 'fin', title: 'Trésorerie & Financement', short: 'Trésorerie', unit: 'Financement & Trésorerie', owner: 'Nadia Haddad', color: '#3aa76d', pos: [2, 1],
    intro: 'Position, couverture, dette et programme obligataire vert. Le point bas prévisionnel de fin octobre est le point d\'attention.',
    kpis: [
      { id: 'fin_pos', label: 'Position de trésorerie', fmt: 'meur', good: 'up', target: 1500, targetLabel: 'seuil de sécurité', series: S([3120, 2980, 2810, 2620, 2450, 2890, 2610, 2348, 2050, 1780, 3180, 2860]),
        comment: 'Baisse saisonnière liée au pic de décaissements travaux de l\'été. L\'émission verte de novembre reconstitue la marge.', source: 'Trésorerie J-1 (banques + Trésor)' },
      { id: 'fin_cov', label: 'Couverture des décaissements', fmt: 'months', good: 'up', target: 3, series: S([7.1, 6.8, 6.4, 6.0, 5.6, 6.6, 5.9, 5.4, 4.7, 4.1, 7.3, 6.6]), comment: 'Nombre de mois de décaissements couverts par la trésorerie disponible.' },
      { id: 'fin_debt', label: 'Encours de dette', fmt: 'mdeur', good: 'none', series: S([25.3, 25.3, 25.3, 26.0, 26.0, 26.0, 26.8, 26.8, 26.8, 26.8, 28.3, 28.3]), comment: 'Deux émissions au 1er semestre, émission verte de 1,5 Md€ prévue le 17/11.' },
      { id: 'fin_rate', label: 'Taux moyen pondéré', fmt: 'ratepct', good: 'down', series: S([1.58, 1.58, 1.58, 1.60, 1.60, 1.60, 1.62, 1.62, 1.62, 1.62, 1.66, 1.66]), comment: 'Impact des émissions 2026 réalisées à des taux supérieurs au stock.' },
      { id: 'fin_fix', label: 'Part de dette à taux fixe', fmt: 'pct', good: 'up', target: 90, series: S([96, 96, 96, 97, 97, 97, 97, 97, 97, 97, 97, 97]), comment: 'Exposition au risque de taux limitée : +100 pb = +9 M€ de frais financiers annuels.' },
      { id: 'fin_place', label: 'Placements', fmt: 'meur', good: 'none', series: S([1800, 1700, 1600, 1500, 1400, 1700, 1500, 1300, 1100, 900, 2000, 1800]), comment: '600 M€ arrivent à échéance le 30/09.' },
    ],
    charts: [
      { ref: 'fin_pos', type: 'line', title: 'Trésorerie fin de mois (M€) — réel puis prévision, seuil 1 500' },
      { type: 'bars', title: 'Échéancier de remboursement de la dette (Md€)', labels: ['2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036+'], series: [{ name: 'Amortissements', data: [0.4, 0.6, 0.9, 1.2, 1.4, 1.5, 1.7, 1.8, 2.1, 15.2] }] },
      { type: 'bars', title: 'Répartition des investisseurs — dernière émission (%)', labels: ['France', 'Allemagne', 'Benelux', 'Nordiques', 'Royaume-Uni', 'Asie', 'Autres'], series: [{ name: 'Part', data: [31, 18, 14, 12, 11, 9, 5] }] },
    ],
  },
  /* ------------------------------------------------ 3. Budget ------ */
  { id: 'cdg', title: 'Budget & Atterrissage', short: 'Budget', unit: 'Contrôle de gestion', owner: 'Sophie Lenoir', color: '#e07a3f', pos: [3, 1],
    intro: 'Exécution du budget d\'investissement 2026, atterrissage et frais de structure. Ventilation par ligne disponible.',
    kpis: [
      { id: 'cdg_att', label: 'Atterrissage investissements 2026', fmt: 'meur', good: 'range', target: 4180, targetLabel: 'budget', series: S([4180, 4180, 4160, 4150, 4120, 4110, 4080, 4050, 4050, 4084, 4084, 4084]), comment: 'Stabilisé à 4 050 M€ (−3,1 % vs budget) par décalage calendaire du génie civil. L\'avenant gares L18 (+34 M€) sera intégré en octobre.' },
      { id: 'cdg_cum', label: 'Réalisé cumulé', fmt: 'meur', good: 'none', series: S([281, 586, 924, 1286, 1635, 2006, 2324, 2640, 2990, 3362, 3730, 4082]), comment: '63 % du budget consommé à fin août, en ligne avec la courbe en S.' },
      { id: 'cdg_pct', label: 'Taux de consommation du budget', fmt: 'pct', good: 'none', series: S([7, 14, 22, 31, 39, 48, 56, 63, 72, 80, 89, 98]) },
      { id: 'cdg_mens', label: 'Dépenses du mois', fmt: 'meur', good: 'none', series: S([281, 305, 338, 362, 349, 371, 318, 316, 350, 372, 368, 352]),
        byLine: { L14: [30, 32, 34, 36, 33, 35, 30, 28, 30, 32, 31, 30], L15S: [78, 84, 92, 98, 96, 102, 88, 90, 96, 102, 101, 96], L15O: [52, 56, 62, 68, 66, 70, 60, 58, 66, 70, 69, 66], L15E: [41, 45, 50, 54, 52, 55, 47, 46, 52, 55, 54, 52], L16: [38, 41, 46, 49, 47, 50, 43, 43, 47, 50, 49, 47], L17: [20, 22, 24, 26, 25, 27, 23, 23, 25, 27, 26, 25], L18: [22, 25, 30, 31, 30, 32, 27, 28, 34, 36, 38, 36] } },
      { id: 'cdg_struct', label: 'Frais de structure vs budget', fmt: 'pctsigned', good: 'down', target: 0, series: S([-1, -2, -2, -3, -3, -3, -3, -3, -3, -2, -2, -2]), comment: 'Recrutements décalés au 2e semestre, moins de déplacements.' },
      { id: 'cdg_compl', label: 'Complétude des prévisions des directions', fmt: 'pct', good: 'up', target: 100, series: S([88, 90, 92, 91, 93, 94, 92, 94, 94, 96, 97, 98]), comment: 'Il manque la ligne 17 au cycle de septembre.' },
    ],
    charts: [
      { type: 'line', title: 'Courbe en S — cumul budget vs réalisé / prévision (M€)', labels: WALL.MONTHS, series: [{ name: 'Budget cumulé', data: [300, 620, 960, 1310, 1670, 2040, 2380, 2710, 3070, 3450, 3820, 4180], neutral: true }, { name: 'Réalisé / prévision', data: [281, 586, 924, 1286, 1635, 2006, 2324, 2640, 2990, 3362, 3730, 4082] }] },
      { ref: 'cdg_mens', type: 'bars', title: 'Dépenses mensuelles (M€)', byLine: true },
    ],
  },
  /* ------------------------------------------------ 4. Clôture ----- */
  { id: 'bud', title: 'Consolidation & Clôture', short: 'Clôture', unit: 'Consolidation & Pilotage budgétaire', owner: 'Marc Dupuis', color: '#7c6bd1', pos: [1, 2],
    intro: 'Avancement des clôtures, qualité comptable, délais de paiement et préparation des comptes semestriels.',
    kpis: [
      { id: 'bud_clot', label: 'Avancement de la clôture du mois', fmt: 'pct', good: 'up', target: 100, series: S([100, 100, 100, 100, 100, 100, 100, 92, 0, 0, 0, 0]), comment: 'Clôture d\'août à 92 % à J+8. 14 anomalies d\'interface achats → comptabilité.' },
      { id: 'bud_anom', label: 'Anomalies d\'interface ouvertes', fmt: 'int', good: 'down', target: 0, series: S([31, 24, 19, 22, 17, 12, 16, 14, 4, 2, 2, 1]), comment: 'Correctif PHENIX en production le 14/09.' },
      { id: 'bud_fact', label: 'Factures reçues (mois)', fmt: 'int', good: 'none', series: S([6120, 6480, 7010, 7320, 7100, 7650, 6890, 7360, 7200, 7400, 7300, 6900]) },
      { id: 'bud_dgp', label: 'Délai global de paiement', fmt: 'days', good: 'down', target: 30, targetLabel: 'objectif légal', series: S([31, 29, 28, 30, 27, 26, 28, 27, 27, 28, 28, 29]), comment: 'Sous l\'objectif pour le 5e mois consécutif.' },
      { id: 'bud_immo', label: 'Mises en service reclassées (cumul)', fmt: 'mdeur', good: 'none', series: S([0.2, 0.3, 0.5, 0.6, 0.8, 1.1, 1.3, 1.4, 2.5, 2.7, 2.9, 3.2]), comment: '1,1 Md€ de mises en service de la 14 Nord à reclasser en septembre.' },
      { id: 'bud_prov', label: 'Provisions pour litiges', fmt: 'meur', good: 'none', series: S([310, 310, 318, 318, 325, 340, 340, 340, 352, 352, 352, 360]), comment: 'Focus des commissaires aux comptes pour l\'intérim du 22/09.' },
    ],
    charts: [
      { ref: 'bud_dgp', type: 'line', title: 'Délai global de paiement (jours) — objectif 30' },
      { type: 'bars', title: 'Anomalies ouvertes par interface', labels: ['Achats→Compta', 'Paie→Compta', 'Banques', 'Immobilisations', 'Recettes'], series: [{ name: 'Anomalies', data: [9, 1, 2, 1, 1] }] },
    ],
  },
  /* ------------------------------------------------ 5. CAT --------- */
  { id: 'cat', title: 'Coûts à terminaison', short: 'CAT', unit: 'Pilotage des investissements', owner: 'Rachid Benali', color: '#d94f6a', pos: [2, 2],
    intro: 'Coût à terminaison du programme, par ligne, et passage T2 → T3. Les marchés en alerte rouge passent au comité d\'engagement du 18/09.',
    kpis: [
      { id: 'cat_prog', label: 'Coût à terminaison programme', fmt: 'mdeur1', good: 'down', target: 35.6, targetLabel: 'objectif', series: S([35.6, 35.6, 35.6, 35.7, 35.7, 35.7, 35.9, 36.1, 36.1, 36.1, 36.2, 36.2]),
        byLine: { L14: [3.4, 3.4, 3.4, 3.4, 3.4, 3.4, 3.4, 3.4, 3.4, 3.4, 3.4, 3.4], L15S: [7.2, 7.2, 7.2, 7.3, 7.3, 7.3, 7.4, 7.4, 7.4, 7.4, 7.5, 7.5], L15O: [5.9, 5.9, 5.9, 5.9, 5.9, 5.9, 6.1, 6.2, 6.2, 6.2, 6.2, 6.2], L15E: [5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6], L16: [4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.6, 4.6, 4.6, 4.6, 4.6, 4.6], L17: [3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3], L18: [5.7, 5.7, 5.7, 5.7, 5.7, 5.7, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6] },
        comment: '+0,5 Md€ vs objectif, porté par la 15 Sud (réclamation génie civil) et la 15 Ouest (tunneliers +6 semaines, +180 M€).' },
      { id: 'cat_eng', label: 'Engagé cumulé', fmt: 'pct', good: 'none', series: S([76, 76, 77, 78, 78, 79, 80, 81, 81, 82, 83, 84]) },
      { id: 'cat_alea', label: 'Provision pour aléas consommée', fmt: 'pct', good: 'down', target: 50, series: S([33, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 45]), comment: '1,9 Md€ de provision, 41 % consommés à 81 % d\'engagement : trajectoire tenable.' },
      { id: 'cat_alert', label: 'Marchés en alerte (orange + rouge)', fmt: 'int', good: 'down', series: S([14, 15, 15, 17, 18, 19, 20, 21, 21, 20, 19, 18]), comment: '18 marchés en orange, 3 en rouge.' },
      { id: 'cat_aven', label: 'Avenants signés (cumul)', fmt: 'meur', good: 'none', series: S([12, 21, 35, 48, 62, 90, 104, 125, 151, 165, 178, 190]) },
    ],
    charts: [
      { ref: 'cat_prog', type: 'bars', title: 'CAT par ligne (Md€) — objectif vs estimé', byLineCompare: { L14: 3.4, L15S: 7.2, L15O: 5.9, L15E: 5.6, L16: 4.5, L17: 3.3, L18: 5.7 } },
      { type: 'bridge', title: 'Passage T2 → T3 (M€)', steps: [{ l: 'CAT T2', v: 35700, total: true }, { l: 'Réclamations', v: 220 }, { l: 'Avenants', v: 61 }, { l: 'Tunneliers L15 O', v: 180 }, { l: 'Économies', v: -95 }, { l: 'Aléas libérés', v: -66 }, { l: 'CAT T3', total: true }] },
    ],
  },
  /* ------------------------------------------------ 6. Fiscalité --- */
  { id: 'fis', title: 'Fiscalité & Recettes', short: 'Fiscalité', unit: 'Fiscalité & Recettes affectées', owner: 'Olivier Mercier', color: '#b78a3a', pos: [3, 2],
    intro: 'Recettes fiscales affectées, encaissements et crédit de TVA.',
    kpis: [
      { id: 'fis_prev', label: 'Recettes affectées prévues 2026', fmt: 'meur', good: 'none', series: S([805, 805, 808, 808, 810, 812, 812, 812, 812, 812, 812, 812]) },
      { id: 'fis_enc', label: 'Recettes affectées encaissées', fmt: 'pct', good: 'up', target: 100, series: S([9, 17, 28, 36, 44, 52, 61, 69, 74, 79, 94, 100]), comment: 'Conforme au calendrier de recouvrement ; la taxe spéciale d\'équipement (117 M€) tombe en novembre.' },
      { id: 'fis_tsb', label: 'Taxe sur les bureaux encaissée', fmt: 'meur', good: 'up', target: 498, series: S([60, 118, 180, 232, 286, 336, 372, 402, 430, 458, 480, 498]) },
      { id: 'fis_tva', label: 'Crédit de TVA en attente', fmt: 'meur', good: 'down', target: 150, series: S([160, 175, 190, 168, 182, 196, 204, 212, 150, 140, 158, 165]), comment: 'La DGFiP annonce un remboursement sous trois semaines.' },
      { id: 'fis_delai', label: 'Délai moyen de remboursement TVA', fmt: 'days', good: 'down', target: 30, series: S([38, 40, 41, 39, 40, 42, 42, 42, 36, 34, 35, 35]) },
      { id: 'fis_redev', label: 'Redevances commerciales gares (cumul)', fmt: 'meur', good: 'up', series: S([6, 12, 19, 25, 32, 39, 46, 52, 58, 65, 71, 78]), comment: '+8 % vs 2025.' },
    ],
    charts: [
      { type: 'line', title: 'Encaissements cumulés (M€) — plan vs réel', labels: WALL.MONTHS, series: [{ name: 'Plan', data: [70, 140, 225, 292, 356, 422, 495, 560, 600, 640, 765, 812], neutral: true }, { name: 'Réel / prévision', data: [73, 138, 227, 292, 357, 422, 495, 561, 601, 641, 763, 812] }] },
      { type: 'bars', title: 'Recettes affectées par nature (M€) — prévu vs encaissé', labels: ['TSB', 'TSE', 'IFER', 'Redevances', 'Autres'], series: [{ name: 'Prévu 2026', data: [498, 117, 86, 74, 37], neutral: true }, { name: 'Encaissé', data: [402, 0, 86, 52, 21] }] },
    ],
  },
  /* ------------------------------------------------ 7. Assurances -- */
  { id: 'ass', title: 'Assurances', short: 'Assurances', unit: 'Assurances', owner: 'Claire Bonnet', color: '#5b7fa6', pos: [1, 3],
    intro: 'Programme d\'assurances du Grand Paris Express : primes, sinistres, récupérations.',
    kpis: [
      { id: 'ass_prime', label: 'Primes annuelles', fmt: 'meur1', good: 'down', series: S([38.4, 38.4, 38.4, 38.4, 38.4, 38.4, 38.4, 38.4, 38.4, 38.4, 38.4, 38.4]), comment: 'TRC renouvelée jusqu\'en 2028, +1,8 %.' },
      { id: 'ass_open', label: 'Sinistres ouverts', fmt: 'int', good: 'down', series: S([8, 9, 9, 10, 9, 10, 11, 11, 11, 10, 9, 9]), byLine: { L14: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], L15S: [2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2], L15O: [1, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2], L15E: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], L16: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], L17: [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], L18: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        comment: 'Trois dossiers sur la 15 Sud, dont une venue d\'eau à 2,4 M€ (expertise le 24/09).' },
      { id: 'ass_rec', label: 'Taux de récupération', fmt: 'pct', good: 'up', target: 70, series: S([66, 67, 68, 68, 69, 70, 70, 71, 71, 71, 72, 72]) },
      { id: 'ass_fr', label: 'Franchise moyenne', fmt: 'keur', good: 'none', series: S([500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500]) },
      { id: 'ass_decl', label: 'Sinistres déclarés (cumul)', fmt: 'meur1', good: 'down', series: S([1.1, 2.3, 3.9, 5.2, 6.8, 8.4, 12.1, 16.1, 16.6, 17.2, 17.9, 18.5]) },
    ],
    charts: [
      { type: 'bars', title: 'Sinistres déclarés vs indemnisés par ligne (M€)', labels: ['L14', 'L15S', 'L15O', 'L15E', 'L16', 'L17', 'L18'], lineKeys: true, series: [{ name: 'Déclaré', data: [1.2, 6.8, 2.1, 1.0, 3.4, 0.9, 1.7], neutral: true }, { name: 'Indemnisé', data: [1.0, 4.1, 1.6, 0.8, 2.6, 0.7, 1.2] }] },
      { ref: 'ass_open', type: 'bars', title: 'Sinistres ouverts par mois', byLine: true },
    ],
  },
  /* ------------------------------------------------ 8. Contrôle int. */
  { id: 'ci', title: 'Contrôle interne & Risques', short: 'Risques', unit: 'Contrôle interne', owner: 'Isabelle Fontaine', color: '#8a9bab', pos: [2, 3],
    intro: 'Contrôles clés, cartographie des risques financiers et suivi des recommandations d\'audit.',
    kpis: [
      { id: 'ci_conf', label: 'Contrôles clés conformes', fmt: 'pct', good: 'up', target: 95, series: S([89, 89, 92, 92, 92, 92, 92, 92, 92, 95, 95, 97]), comment: '34 sur 37. Les 3 écarts portent sur la séparation des tâches (habilitations SAP).' },
      { id: 'ci_ecart', label: 'Écarts ouverts', fmt: 'int', good: 'down', target: 0, series: S([4, 4, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1]) },
      { id: 'ci_reco', label: 'Recommandations d\'audit closes', fmt: 'frac19', good: 'up', target: 19, series: S([5, 6, 7, 8, 9, 10, 11, 12, 12, 14, 16, 17]) },
      { id: 'ci_maj', label: 'Risques majeurs en hausse', fmt: 'int', good: 'down', series: S([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1]), comment: 'Dérive des coûts à terminaison (18/25) et risque SI pendant la bascule PHENIX (14/25).' },
      { id: 'ci_audit', label: 'Missions du plan d\'audit réalisées', fmt: 'frac7', good: 'up', target: 7, series: S([0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7]) },
    ],
    charts: [
      { type: 'bars', title: 'Criticité des risques financiers majeurs (/25) — T2 vs T3', labels: ['Dérive CAT', 'SI / bascule', 'Taux', 'Fraude', 'Fiscal', 'Liquidité'], series: [{ name: 'T2', data: [16, 12, 9, 8, 7, 6], neutral: true }, { name: 'T3', data: [18, 14, 10, 8, 7, 6] }] },
      { type: 'matrix', title: 'Matrice probabilité × gravité (T3)', points: [{ l: 'Dérive CAT', p: 4, g: 4 }, { l: 'SI / bascule', p: 3, g: 4 }, { l: 'Taux', p: 2, g: 4 }, { l: 'Fraude', p: 2, g: 3 }, { l: 'Fiscal', p: 2, g: 2 }, { l: 'Liquidité', p: 1, g: 4 }] },
    ],
  },
  /* ------------------------------------------------ 9. Lab IA ------ */
  { id: 'lab', title: 'Lab IA & SI Finance', short: 'SI & IA', unit: 'Lab IA & Data', owner: 'Yann Le Goff', color: '#c95bd6', pos: [3, 3],
    intro: 'Disponibilité de l\'ERP, projet PHENIX, automatisation des reportings et assistants IA.',
    kpis: [
      { id: 'lab_dispo', label: 'Disponibilité ERP', fmt: 'pct1', good: 'up', target: 99.5, series: S([99.2, 99.8, 99.5, 99.9, 99.7, 99.6, 99.6, 99.6, 99.6, 99.1, 99.7, 99.8]), comment: 'Fenêtre d\'indisponibilité de 6 h prévue le 04/10 (bascule PHENIX lot 2).' },
      { id: 'lab_phenix', label: 'PHENIX lot 2 — avancement', fmt: 'pct', good: 'up', target: 100, series: S([5, 8, 12, 25, 38, 49, 61, 70, 78, 100, 100, 100]), comment: 'Retard de 7 points sur le plan, bascule maintenue au 04/10.' },
      { id: 'lab_tick', label: 'Tickets critiques ouverts', fmt: 'int', good: 'down', target: 0, series: S([6, 5, 7, 4, 3, 5, 6, 4, 2, 3, 1, 1]) },
      { id: 'lab_auto', label: 'Reportings automatisés', fmt: 'frac45', good: 'up', target: 45, series: S([18, 20, 22, 24, 26, 27, 29, 31, 33, 35, 38, 40]) },
      { id: 'lab_fact', label: 'Factures lues par l\'assistant IA (mois)', fmt: 'int', good: 'up', series: S([0, 0, 1200, 2800, 4100, 5200, 5600, 6900, 7000, 7200, 7100, 6800]), comment: '12 anomalies remontées en août à la comptabilité fournisseurs.' },
      { id: 'lab_hours', label: 'Heures économisées (cumul)', fmt: 'int', good: 'up', series: S([40, 95, 180, 300, 450, 620, 810, 1020, 1250, 1500, 1780, 2060]) },
    ],
    charts: [
      { type: 'line', title: 'PHENIX lot 2 — réel vs plan (%)', labels: WALL.MONTHS, series: [{ name: 'Plan', data: [8, 15, 22, 28, 40, 52, 64, 76, 85, 100, 100, 100], neutral: true }, { name: 'Réel / prévision', data: [5, 8, 12, 25, 38, 49, 61, 70, 78, 100, 100, 100] }] },
      { ref: 'lab_tick', type: 'bars', title: 'Tickets critiques ouverts par mois' },
    ],
  },
];

/* ------------------------------------------------ Alertes ---------- */
/* sev : critical | serious | warning | good ; screen + kpi pour la navigation ; line optionnelle */
WALL.ALERTS = [
  { id: 'a1', sev: 'critical', screen: 'cat', kpi: 'cat_prog', line: 'L15O', m: 'L15 Ouest — tunneliers : +6 semaines, +180 M€ estimés. Pénalités en discussion.', since: '2026-09-02' },
  { id: 'a2', sev: 'serious', screen: 'fin', kpi: 'fin_pos', m: 'Point bas de trésorerie fin octobre à 1 780 M€ — marge de 280 M€ sur le seuil.', since: '2026-08-28' },
  { id: 'a3', sev: 'serious', screen: 'cat', kpi: 'cat_prog', line: 'L15S', m: 'L15 Sud — réclamation génie civil 95 M€ en instruction (30 M€ reconnus).', since: '2026-08-19' },
  { id: 'a4', sev: 'warning', screen: 'lab', kpi: 'lab_dispo', m: 'Bascule PHENIX lot 2 le 04/10 : indisponibilité ERP de 6 h, gel des développements dès le 28/09.', since: '2026-09-01' },
  { id: 'a5', sev: 'warning', screen: 'bud', kpi: 'bud_anom', m: '14 anomalies d\'interface achats → comptabilité à purger avant le 15/09.', since: '2026-09-08' },
  { id: 'a6', sev: 'warning', screen: 'ass', kpi: 'ass_open', line: 'L15S', m: 'Venue d\'eau L15 Sud : 2,4 M€ déclarés, expertise contradictoire le 24/09.', since: '2026-09-05' },
  { id: 'a7', sev: 'warning', screen: 'ci', kpi: 'ci_ecart', m: '3 conflits de séparation des tâches dans les habilitations SAP.', since: '2026-07-30' },
  { id: 'a8', sev: 'warning', screen: 'fis', kpi: 'fis_tva', m: 'Crédit de TVA de 212 M€ en attente, délai moyen 42 jours.', since: '2026-08-31' },
  { id: 'a9', sev: 'warning', screen: 'cdg', kpi: 'cdg_att', line: 'L18', m: 'Avenant gares L18 (+34 M€) non encore intégré à l\'atterrissage.', since: '2026-09-09' },
  { id: 'a10', sev: 'good', screen: 'bud', kpi: 'bud_dgp', m: 'Délai global de paiement sous l\'objectif pour le 5e mois consécutif.', since: '2026-09-05' },
  { id: 'a11', sev: 'good', screen: 'fin', kpi: 'fin_debt', m: 'Notation AA confirmée (perspective stable) le 03/09.', since: '2026-09-03' },
];

/* ------------------------------------------------ Calendrier ------- */
WALL.CAL_TYPES = { clot: { n: 'Clôture', c: '#7c6bd1' }, comite: { n: 'Comité / Conseil', c: '#c9a34a' }, budget: { n: 'Budget & reporting', c: '#e07a3f' }, fin: { n: 'Trésorerie & fiscal', c: '#3aa76d' }, audit: { n: 'Audit & contrôle', c: '#8a9bab' }, si: { n: 'SI Finance', c: '#3f8fd9' }, ext: { n: 'Externe', c: '#d94f6a' } };
WALL.CALENDAR = [
  { d: '2026-09-14', s: 'lab', t: 'si', n: 'Mise en production du correctif interface achats → comptabilité' },
  { d: '2026-09-15', s: 'bud', t: 'clot', n: 'Fin de clôture mensuelle d\'août (J+10)' },
  { d: '2026-09-15', s: 'cdg', t: 'budget', n: 'Diffusion du reporting mensuel d\'août au COMEX' },
  { d: '2026-09-15', s: 'ci', t: 'audit', n: 'Lancement de la revue des délégations de signature' },
  { d: '2026-09-18', s: 'cat', t: 'comite', n: 'Comité d\'engagement — revue des CAT T3 (3 marchés rouges)' },
  { d: '2026-09-22', s: 'fin', t: 'comite', n: 'Comité de trésorerie et de financement' },
  { d: '2026-09-22', s: 'bud', t: 'audit', n: 'Intérim des commissaires aux comptes (22–26/09)' },
  { d: '2026-09-24', s: 'ass', t: 'ext', n: 'Expertise contradictoire — venue d\'eau L15 Sud' },
  { d: '2026-09-25', s: 'cdg', t: 'budget', n: 'Envoi des lettres de cadrage budgétaire 2027' },
  { d: '2026-09-28', s: 'lab', t: 'si', n: 'Gel des développements ERP (jusqu\'au 06/10)' },
  { d: '2026-09-30', s: 'bud', t: 'clot', n: 'Arrêté des comptes semestriels — version définitive' },
  { d: '2026-10-04', s: 'lab', t: 'si', n: 'Bascule PHENIX lot 2 — immobilisations' },
  { d: '2026-10-06', s: 'fin', t: 'fin', n: 'Roadshow investisseurs obligation verte (Paris, Francfort, Amsterdam)' },
  { d: '2026-10-08', s: 'syn', t: 'comite', n: 'Conseil de surveillance — comptes semestriels' },
  { d: '2026-10-13', s: 'ci', t: 'comite', n: 'Comité d\'audit — cartographie des risques T3' },
  { d: '2026-10-15', s: 'ass', t: 'comite', n: 'Revue annuelle du programme d\'assurances avec le courtier' },
  { d: '2026-10-15', s: 'bud', t: 'clot', n: 'Clôture mensuelle de septembre (J+10)' },
  { d: '2026-10-20', s: 'cdg', t: 'budget', n: 'Atterrissage 2026 — version 2' },
  { d: '2026-10-27', s: 'fis', t: 'fin', n: 'Déclaration TVA T3 et demande de remboursement de crédit' },
  { d: '2026-11-03', s: 'cdg', t: 'budget', n: 'Arbitrages budgétaires 2027 avec les directions opérationnelles' },
  { d: '2026-11-10', s: 'fis', t: 'fin', n: 'Encaissement de la taxe spéciale d\'équipement (117 M€)' },
  { d: '2026-11-17', s: 'fin', t: 'fin', n: 'Émission obligataire verte — 1,5 Md€, 20 ans' },
  { d: '2026-11-20', s: 'cat', t: 'comite', n: 'Comité d\'engagement — avenants lignes 15 & 16' },
  { d: '2026-11-26', s: 'syn', t: 'comite', n: 'Conseil de surveillance — budget 2027' },
  { d: '2026-12-10', s: 'cat', t: 'comite', n: 'Revue des coûts à terminaison T4' },
  { d: '2026-12-15', s: 'ci', t: 'audit', n: 'Restitution du plan d\'audit interne 2026' },
  { d: '2026-12-18', s: 'bud', t: 'clot', n: 'Pré-clôture annuelle — instructions de clôture 2026' },
];

/* Séquence du mode présentation (COMEX) */
WALL.PRESENTATION = [
  { screen: 'syn', note: 'Vue d\'ensemble : trésorerie solide, atterrissage tenu, un point d\'attention sur les coûts à terminaison.' },
  { screen: 'fin', kpi: 'fin_pos', note: 'Position à 2 348 M€, point bas fin octobre au-dessus du seuil, émission verte le 17/11.' },
  { screen: 'cdg', kpi: 'cdg_att', note: 'Atterrissage 2026 à 4 050 M€, −3,1 % vs budget, essentiellement du décalage calendaire.' },
  { screen: 'cat', kpi: 'cat_prog', note: 'CAT à 36,1 Md€ : +0,5 Md€ vs objectif, 15 Ouest et 15 Sud à suivre au comité du 18/09.' },
  { screen: 'ci', kpi: 'ci_conf', note: 'Contrôle interne : 34 contrôles clés conformes sur 37, deux risques majeurs en hausse.' },
];
