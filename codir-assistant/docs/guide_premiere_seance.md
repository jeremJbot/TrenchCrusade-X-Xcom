# Guide d'essai d'une première séance

## 0. Préparer
1. Renseigner `.env` (modèle, transcription, synthèse). Sans clé, mettre `LLM_PROVIDER=simulated` : les réponses sont préfixées « [SIMULÉ] » et ne valident rien.
2. Déposer deux ou trois documents (DOCX, PDF textuel, TXT ou MD) dans le répertoire `CODIR_DOCS_DIR` (par défaut `data/documents/`). Ne pas déposer les fixtures fictives de `evals/fixtures/` dans un corpus réel.
3. Lancer `python run.py`, ouvrir `http://127.0.0.1:8765`, onglet **Réglages → Tester les connexions**.

## 1. Documents
- Onglet **Documents → Actualiser les documents** (ou **Déposer…**).
- Chaque document affiche son état : `indexe`, `vide`, `ocr_requis` (PDF image), `non_supporte`, `erreur`, `supprime`.
- Renseigner si possible le statut documentaire (référence validée, document de travail, archive), la version et la date du contenu. Rien n'est inventé : par défaut « inconnu ».

## 2. Séance
- Choisir le mode (B « CODIR assisté » par défaut), **Démarrer la séance**.
- **Activer le micro** : l'indicateur passe en « Écoute active ». Le niveau sonore s'affiche.
- Optionnel : saisir le nom de l'orateur dans « Orateur ». Il est attribué aux énoncés uniquement s'il est saisi (aucune supposition, pas de diarisation).

## 3. Poser une question oralement
- Dire « Assistant, … » ou cliquer **Demander à l'assistant** avant de parler.
- Le segment apparaît d'abord en italique (« Parole en cours… », puis « Transcription en cours… ») puis stabilisé.
- La réponse s'affiche dans la conversation et se prononce (si « Voix » est coché). **Arrêter la voix** interrompt la lecture. Une nouvelle question annule le traitement de la précédente.
- Onglet **Sources** : extraits réellement retrouvés, document, repère (page pour PDF ; section et paragraphes pour DOCX/MD), identifiants. Le contrôle backend garantit l'existence des références citées, pas la justesse de l'interprétation.

## 4. Apporter une information nouvelle
- Parler normalement (sans « Assistant, »). Le segment est analysé en écoute.
- Onglet **Mémoire** : la déclaration apparaît en statut `declare` avec sa provenance (séance, énoncé). Valider, mettre à confirmer, contester, corriger (historisé) ou supprimer.
- Les décisions et actions proposées apparaissent dans **Décisions & actions** en statut `proposee` ; les champs manquants sont marqués. Seul le bouton **Valider** change le statut.

## 5. Interventions (modes B et C)
- Onglet **Interventions** : propositions avec déclencheur, motif et sources. **Lire à voix haute**, **Revérifier l'utilité**, **Reporter**, **Rejeter**, **Suspendre** (tout).
- Mode C (expérimental) : la lecture n'est automatique que lors d'une pause détectée (≥ 1,5 s), après revérification que le point n'est pas déjà résolu, et dans le respect du délai minimal.

## 6. Redémarrer et vérifier
- Arrêter le serveur, relancer `python run.py` : la séance active, la transcription, la mémoire et ses statuts sont retrouvés (base `data/codir.sqlite3`).

## 7. Relevé
- **Décisions & actions → Projet de relevé de décisions** : projet généré à partir des éléments structurés et de leurs statuts, sans invention.
