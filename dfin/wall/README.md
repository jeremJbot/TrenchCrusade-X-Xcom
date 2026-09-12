# Mur de pilotage — Direction financière (prototype)

Un mur de neuf dashboards (un par unité + une synthèse) avec une navigation avancée, pensé pour la projection en salle et l'usage quotidien sur poste. **Données 100 % fictives.**

Ouvrir `dfin/wall/index.html` (aucun build, aucune dépendance ; polices IBM Plex chargées depuis Google Fonts, avec repli système).

## Navigation

Trois niveaux, avec animation de zoom : **mur** (9 écrans) → **écran** (une unité : 5 à 8 indicateurs, 2 à 3 graphiques) → **indicateur** (inspecteur : valeur, écart, cible, trajectoire 12 mois, ventilation par ligne, lecture, alertes liées, échéances).

| Fonction | Commande |
| --- | --- |
| Recherche & commandes (indicateurs, écrans, alertes, échéances, lignes, dates, actions, vues enregistrées) | `/` ou `Ctrl`+`K` |
| Ouvrir l'écran n · vue mur | `1`–`9` · `W` / `0` / `Échap` |
| Choisir / ouvrir · indicateur suivant · écran suivant | flèches / `↵` · `←` `→` · `⇧←` `⇧→` |
| Date de référence (curseur temporel, réel puis prévision) · rejouer l'année | `,` `.` · `Espace` |
| Filtre par ligne (appliqué à tout le mur) | sélecteur d'en-tête ou `L` |
| Alertes · calendrier de gestion | `A` · `C` |
| Présentation COMEX (5 écrans commentés) · rotation automatique | `P` · `R` |
| Comparer deux écrans côte à côte | `X` |
| Enregistrer la vue · copier le lien profond | `B` · inspecteur |
| Zoom libre | molette, pincer, glisser ; double-clic pour réinitialiser |

Chaque état (écran, indicateur, date, ligne) est porté par l'URL : un lien suffit pour partager exactement une vue. Sur téléphone, le mur devient une colonne d'écrans défilable.

## Structure

```
wall/index.html   page
wall/wall.css     styles (thème sombre de salle de pilotage)
wall/data.js      modèle : écrans → indicateurs (séries 12 mois, cible, sens, ventilation par ligne), graphiques, alertes, calendrier, séquence de présentation
wall/charts.js    graphiques canvas HiDPI avec survol : lignes, barres, pont (waterfall), sparklines
wall/app.js       navigation zoomable, palette, clavier, inspecteur, tiroir alertes/calendrier, ligne de temps, présentation, comparaison, vues
```

## Alimenter le mur en données réelles

Tout passe par `data.js`, un simple objet JavaScript. Pour le brancher :

1. **Fichier** : générer `data.js` (ou un `data.json` chargé au démarrage) depuis vos sources — extractions de l'ERP, fichiers des unités, mails de synthèse. Un Cowork ou une routine planifiée peut produire ce fichier chaque matin.
2. **Service** : exposer le même objet en JSON derrière une URL ; le mur le recharge toutes les quinze minutes et affiche l'heure de mise à jour.
3. Les champs attendus par indicateur : `id`, `label`, `fmt`, `good` (`up`/`down`/`range`/`none`), `target`, `series` (12 valeurs, réel puis prévision), `byLine` (optionnel), `comment`, `source`.
