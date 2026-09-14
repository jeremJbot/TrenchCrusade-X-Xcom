# Assistant CODIR FIN — pilote local

Assistant conversationnel audio (français) pour le comité de direction de la direction financière de la SGP.
Interface web locale, microphone et sortie audio, documents de référence déposés dans un répertoire,
mémoire persistante, décisions et actions validées uniquement dans l'interface.

**Statut : pilote monoposte.** Le serveur écoute sur `127.0.0.1` et n'est ni multi-utilisateur ni sécurisé pour une exposition réseau.

## Prérequis
- Python 3.11+, un navigateur récent (Chrome/Edge recommandés pour l'audio).
- Un fournisseur de modèle (API Claude), de transcription et de synthèse vocale **configurés explicitement**
  (aucun service n'est fourni par l'abonnement Claude Code).

## Lancement en un clic
- **Windows** : double-cliquer sur `lancer.bat`.
- **macOS** : double-cliquer sur `lancer.command` (Linux : `./lancer.command`).

Au premier lancement, le script crée l'environnement, installe les dépendances, crée `.env` à partir de `.env.example` (à compléter avec les clés) puis ouvre `http://127.0.0.1:8765` dans le navigateur. Fermer la fenêtre arrête l'assistant.

## Installation manuelle
```bash
cd codir-assistant
python3 -m venv .venv && . .venv/bin/activate      # ou : uv venv && . .venv/bin/activate
pip install -r requirements.txt                    # ou : uv pip install -r requirements.txt
cp .env.example .env                               # puis renseigner les clés
```

## Configuration (.env)
| Variable | Rôle |
|---|---|
| `LLM_PROVIDER` | `anthropic` (clé `ANTHROPIC_API_KEY`, modèle `ANTHROPIC_MODEL`, défaut `claude-opus-5`) ou `simulated` (mode SIMULÉ, étiqueté, sans appel réseau, ne valide pas le parcours réel) |
| `STT_PROVIDER` | `openai_compatible` (`POST {STT_BASE_URL}/audio/transcriptions`, ex. OpenAI Whisper, Groq, faster-whisper-server local), `browser` (reconnaissance du navigateur) ou `none` |
| `TTS_PROVIDER` | `openai_compatible` (`POST {TTS_BASE_URL}/audio/speech`), `browser` (voix du navigateur) ou `none` |
| `EMBEDDINGS_PROVIDER` | `none` (recherche lexicale seule) ou `openai_compatible` (`POST {EMBEDDINGS_BASE_URL}/embeddings`, ex. OpenAI, Voyage) |
| `CODIR_DOCS_DIR` | Répertoire surveillé des documents (DOCX, PDF textuel, TXT, MD) |
| `INTERVENTION_MIN_DELAY_S`, `INTERVENTION_MAX_CHARS` | Politique de prise de parole |

Les clés restent côté serveur ; le navigateur ne dialogue qu'avec `http://127.0.0.1:8765`.

## Lancement
```bash
. .venv/bin/activate
python run.py
# puis ouvrir http://127.0.0.1:8765
```
Onglet **Réglages → Tester les connexions** pour vérifier chaque fournisseur.

## Tests
```bash
python -m pytest -q            # 26 tests automatisés (fournisseur simulé, sans réseau)
python evals/run_evals.py      # scénarios métier fictifs, fournisseur simulé
python evals/run_evals.py --real   # mêmes scénarios avec le modèle réel configuré (appels facturés)
```
Voir `docs/tests.md` pour la distinction entre tests automatisés, essais avec services réels et essais audio sur le poste.

## Structure
```
run.py                     point d'entrée
app/config.py              configuration (.env), vue publique sans secret
app/db.py                  SQLite + migrations (migrations/*.sql)
app/documents.py           ingestion DOCX/PDF/TXT/MD, découpage, réindexation, suppression
app/search.py              recherche lexicale FTS5 + sémantique optionnelle (fusion RRF)
app/memory.py              souvenirs, décisions, actions : règles d'autorisation dans le code
app/sessions.py            séances, transcription, résumé borné, tours, interventions, clarifications
app/agent/orchestrator.py  pipeline d'un tour (recherche, contexte borné, boucle d'outils, vérification)
app/agent/tools.py         outils étroits exposés au modèle
app/agent/verification.py  contrôle des références et statuts ; chargement des politiques
app/agent/intervention.py  politique de prise de parole (modes A/B/C)
app/providers/             adaptateurs Claude, STT/TTS/embeddings compatibles OpenAI, simulé
app/static/                interface web (HTML/CSS/JS sans build)
agent/system_prompt.md     consignes stables de l'agent
agent/policies.yaml        règles d'intervention et d'autorisation
agent/schemas/             schémas JSON (réponse structurée, souvenir, action, décision)
evals/                     scénarios fictifs, lanceur, corpus de test, faux serveur audio (tests)
docs/                      guide de première séance, données transmises, tests, limites
```

## Documentation
- `docs/guide_premiere_seance.md` — essai d'une première séance pas à pas.
- `docs/donnees_transmises.md` — ce qui est envoyé à chaque fournisseur, ce qui est conservé.
- `docs/tests.md` — ce qui a été testé et comment.
- `docs/limites_et_suite.md` — limites connues et prochaines étapes.
