# DFIN — Cockpit de la Direction financière (prototype 2D)

Simulation immersive en vue de dessus (style *Prison Architect*) du plateau de la direction financière de la SGP.
**Toutes les données sont fictives** (personnes, chiffres, dates, événements) : il s'agit d'un test de concept.

Ouvrez `dfin/index.html` (ou hébergez le dossier). Aucun build, aucune dépendance : HTML + Canvas 2D + Web Audio.

## Le concept

- Vous incarnez le **DAF adjoint**. Vendredi 12 septembre 2026, 8h32 : le COMEX est à 11h.
- Le plateau est un open space compact : **chaque pod est une unité** avec sa propre ambiance (Financement & Trésorerie, Contrôle de gestion, Consolidation & Pilotage budgétaire, Fiscalité, Assurances, Contrôle interne, Lab IA & Data, Lounge), plus le bureau de la Directrice financière, le centre de pilotage et la salle serveurs. Éclairage d'ambiance : lampes, néons, écrans, lumière des fenêtres.
- Au nord, le **cockpit de pilotage** : un mur de trois grands écrans vivants (KPI consolidés, courbe de trésorerie, compte à rebours du COMEX, calendrier de gestion, alertes, bandeau défilant), des consoles et un pupitre.
- On se déplace pour **parler aux collègues** (dernières infos, points de vigilance), **consulter leurs reportings** (KPI, graphiques, commentaires de gestion), le **calendrier de gestion** (septembre → décembre 2026) et la vue consolidée du cockpit.
- Trois **missions** enchaînées (collecter des éléments auprès des unités et les rapporter) donnent un fil conducteur ; l'horloge du plateau tourne (20 s de jeu par seconde réelle).
- Les PNJ vivent : ils tapent au clavier, vont au café, au copieur, à la fontaine à eau, visitent d'autres pods, bavardent en bulles.
- Ambiance sonore synthétisée : bourdonnement de plateau, frappes clavier, téléphone, pas.

## Commandes

| Action | Commande |
| --- | --- |
| Se déplacer | `Z Q S D` / `W A S D` / flèches, ou clic sur le sol |
| Parler / consulter | `E`, `Espace`, ou clic sur un collègue / un objet |
| Choisir une réponse | `1` … `6` |
| Carnet · Calendrier · Plan · Aide | `N` · `C` · `M` · `H` |
| Fermer | `Échap` |
| Zoom | molette |

Sur écran tactile, un joystick virtuel (glisser) et un bouton d'action apparaissent ; la sélection de texte est désactivée sur le plateau.

## Structure

```
dfin/index.html      page unique
dfin/css/style.css   HUD, dialogue, panneaux
dfin/src/data.js     données fictives : unités, personnes, reportings, calendrier, infos, missions
dfin/src/map.js      plan du plateau (pièces, mobilier, sièges, points d'intérêt)
dfin/src/art.js      graphismes générés par code (sols, murs, mobilier, personnages, portraits)
dfin/src/world.js    entités, pathfinding A*, déplacement, IA des PNJ
dfin/src/render.js   caméra, couche statique, mur d'écrans vivant, minimap
dfin/src/ui.js       HUD, dialogues, panneaux (reporting, calendrier, cockpit, carnet, plan), graphiques
dfin/src/audio.js    ambiance sonore Web Audio
dfin/src/main.js     boucle de jeu, entrées, horloge, missions, interactions
```

## Pistes d'évolution

- Brancher de vraies sources (exports du SI financier, calendrier partagé) à la place de `data.js`.
- Journée complète avec agenda (comités dans la salle du Comité, réunions, événements aléatoires).
- Éditeur de plateau pour reconfigurer les pods selon l'organigramme réel.
