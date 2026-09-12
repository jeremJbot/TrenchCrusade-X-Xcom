# Trench Crusade × XCOM — *Les Cloches de Saint-Ambroise*

Jeu tactique au tour par tour dans l'univers grimdark de **Trench Crusade**, avec les mécaniques d'**XCOM** (2 actions par tour, couverts, flanquement, % de toucher, vigilance, retranchement, grenades, états…).
Une seule carte dense (16×16 isométrique), deux bandes : **New Antioch** (joueur) contre les **Légions Hérétiques** (IA).

**Smartphone uniquement, en portrait.** Aucune installation : ouvrez `index.html` (ou hébergez le dossier, par ex. GitHub Pages).

## Scénario

La chapelle de Saint-Ambroise est tombée. Le **Reliquaire du Martyr** repose encore sur l'autel, au centre des ruines.

- **Objectif principal** : saisir le Reliquaire (une unité adjacente à l'autel, 1 PA) puis l'extraire au **Poste de Secours** (coin ouest de la carte).
- **Alternative** : anéantir toutes les forces hérétiques.
- **Limite** : 12 tours.
- **Piège** : saisir la relique fait sonner les cloches → 3 renforts hérétiques arrivent par le nord. Si la relique n'est pas prise au tour 5, 2 renforts arrivent quand même.
- **Bonus** : 3 sanctuaires votifs sur la carte ; prier à côté (1 PA) donne +2 Foi (une fois par sanctuaire).

## Bandes

**New Antioch (6)** : Capitaine de tranchée (épée, *Rallier*), Prêtre de combat (miracles : *Bénédiction*, *Lumière*, *Feu Sacré*), 2 Fusiliers (*Tir visé*), Grenadier (2 grenades, détruisent les couverts), Sergent lance-flammes (cône de feu, enflamme).

**Légions Hérétiques (7 + renforts)** : Prêtre hérétique (*Malédiction*, *Mutation*, *Sacrifice*), Bourreau (fouet barbelé, saignement), 3 Légionnaires, Infanterie lourde ointe (mitrailleuse, *Suppression*), Loup de guerre.

## Ressources de faction

- **Foi** (New Antioch) : +1 par tour, +2 par prière. Dépensée par le Prêtre.
- **Sang** (Hérétiques) : +1 par tour, +1 à chaque mort sur la carte. Dépensé par le Prêtre hérétique.

## Commandes tactiles

- Toucher un soldat → le sélectionner. Toucher une case → prévisualiser le déplacement (bleu = 1 PA, jaune = 2 PA), retoucher ou **Confirmer** → se déplacer.
- Toucher un ennemi → prévisualiser le tir (toucher %, critique, couvert, flanquement) → **Feu**.
- Barre d'actions en bas : tirer, corps à corps, vigilance, se retrancher, recharger, capacités de classe. Appui long sur un bouton → description.
- Glisser pour déplacer la caméra, pincer pour zoomer. Menu ≡ → vue d'ensemble, règles, langue (FR/EN), son.

## Technique

- Phaser 3.80 (CDN jsDelivr, avec copie locale `lib/phaser.min.js` en secours) — aucun build, aucune dépendance npm.
- Tous les graphismes sont **générés par code** (Canvas 2D) : tuiles isométriques, ruines, tranchées, sprites d'unités, particules, décals. Aucune image externe.
- Sons **synthétisés** en Web Audio (tirs, explosions, cloches, ambiance).
- Interface bilingue FR/EN, HUD en DOM pour une typographie nette sur mobile.

```
index.html          page unique
css/style.css       HUD mobile (portrait)
src/i18n.js         textes FR/EN
src/data.js         armes, unités, capacités, constantes de règles
src/mapdata.js      carte ASCII 16×16 et types de terrain
src/rules.js        moteur de règles pur (grille, LdV, couvert, pathfinding, combat, états, tours)
src/ai.js           IA hérétique
src/art.js          génération procédurale des textures
src/audio.js        synthèse sonore
src/hud.js          HUD DOM
src/scenes/*.js     scènes Phaser (boot, menu, bataille)
src/main.js         point d'entrée
```

## Tester en local

```
npx http-server -p 8080 .
```
puis ouvrir `http://localhost:8080` sur un téléphone (ou en mode appareil mobile du navigateur).


---

## Autre prototype dans ce dépôt : `dfin/` — Cockpit de la Direction financière

Simulation 2D vue de dessus (style *Prison Architect*) du plateau d'une direction financière : unités en pods, mur d'écrans de pilotage, PNJ à qui parler, reportings, calendrier de gestion et missions. Données 100 % fictives. Ouvrir `dfin/index.html`. Voir [`dfin/README.md`](dfin/README.md).
