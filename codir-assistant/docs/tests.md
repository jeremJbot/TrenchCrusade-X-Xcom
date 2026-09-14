# Vérifications réalisées

## 1. Tests automatisés (sans réseau, fournisseur simulé) — exécutés dans cet environnement
`python -m pytest -q` : 26 tests.
- Ingestion : documents exploitables/inexploitables (DOCX, MD indexés ; PDF image → `ocr_requis` ; PNG → `non_supporte`), aucune ingestion « réussie » sans extrait, DOCX sans numéro de page (section + paragraphes), réindexation après modification, suppression (retrait de la recherche, aucune copie, souvenirs signalés à réexaminer), métadonnées jamais inventées.
- Parcours : réponse documentaire avec source vérifiée, absence de réponse, déclaration mémorisée avec provenance et **persistante après redémarrage** (nouvelle application sur la même base), doublon ignoré, contradiction (intervention sourcée + souvenir déclaré), montant incertain → clarification, action sans responsable (champs vides visibles), mode A sans intervention spontanée, projet de relevé, annulation de tour.
- Règles : l'agent ne peut pas créer ni passer un souvenir en « validé » ; validation d'action/décision par l'acteur `agent` refusée (HTTP 403) ; hypothèse/synthèse jamais en fait déclaré ; contradiction reliée sans écrasement ; correction humaine historisée ; références non vues rejetées ; instruction malveillante dans une source sans effet (aucune validation) ; gardes d'intervention (déclencheur, source, délai, longueur, répétition, mode) ; intervention devenue inutile avant lecture (mode actif) ; lecture par l'animateur.

`python evals/run_evals.py` : 7 scénarios automatisés réussis avec le fournisseur simulé ; 5 autres couverts par les tests ci-dessus ou à réaliser sur le poste.

## 2. Essai de l'interface avec un micro factice — exécuté dans cet environnement
Chromium piloté par Playwright avec un fichier audio en guise de micro et un **faux serveur audio** (`evals/fake_audio_server.py`, renvoie un texte fixe et un WAV de silence). Vérifié : actualisation des documents, démarrage de séance, question clavier avec sources, énoncé mémorisé, détection de parole → segment → `/api/stt` → question adressée (« Assistant, ») → réponse → `/api/tts`, indicateurs micro (écoute, suspendu, arrêté), affichage des erreurs réseau de transcription. **Ceci valide la mécanique client, pas la transcription ni la synthèse réelles.**

## 3. Essais avec services réels — non réalisés ici (aucune clé disponible)
- Appel réel de l'API Claude (adaptateur `app/providers/anthropic_llm.py`, SDK `anthropic` 1.5.0 ; paramètres vérifiés contre la signature du SDK : `output_config`, `fallbacks`, `betas`). À valider : `python evals/run_evals.py --real` avec `ANTHROPIC_API_KEY`.
- Transcription et synthèse via un endpoint compatible OpenAI (`STT_API_KEY`, `TTS_API_KEY`) : onglet Réglages → Tester les connexions.
- Embeddings (`EMBEDDINGS_PROVIDER=openai_compatible`).

## 4. Essais audio à réaliser sur le poste utilisateur
- Qualité de la détection de parole avec le micro réel (seuil adaptatif ; ajuster `noise*3` dans `app/static/app.js` si besoin), gestion des échos (annulation d'écho du navigateur + micro ignoré pendant la voix), interruption vocale optionnelle.
- Pause effective (aucun appel `/api/stt` visible dans le journal serveur pendant la pause), reprise, arrêt.
- Latence de bout en bout (segment → réponse vocale) avec les fournisseurs choisis.
- Mode C : lecture automatique lors d'une pause réelle.
