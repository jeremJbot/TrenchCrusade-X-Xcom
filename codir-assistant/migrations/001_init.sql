-- Schéma initial de l'assistant CODIR FIN. Appliqué par app/db.py (table schema_migrations).

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Documents de référence déposés dans le répertoire surveillé.
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,                -- identifiant stable (dérivé du chemin relatif)
  name TEXT NOT NULL,
  rel_path TEXT NOT NULL UNIQUE,
  sha256 TEXT,
  size INTEGER,
  format TEXT,                        -- docx | pdf | txt | md | autre
  doc_status TEXT NOT NULL DEFAULT 'inconnu',  -- reference_validee | document_de_travail | archive | inconnu
  version_label TEXT,                 -- version indiquée par l'utilisateur (jamais inventée)
  content_date TEXT,                  -- date du contenu si connue (distincte de la date d'import)
  file_modified_at TEXT,              -- mtime du fichier
  imported_at TEXT NOT NULL,
  reindexed_at TEXT,
  index_state TEXT NOT NULL,          -- indexe | vide | ocr_requis | non_supporte | erreur | supprime
  index_error TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

-- Extraits (chunks) indexés. Un DOCX n'a pas de page : on utilise section + paragraphes.
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  section TEXT,
  page INTEGER,                       -- uniquement pour les PDF
  paragraph_ref TEXT,                 -- ex. "§12-15" pour DOCX/TXT/MD
  text TEXT NOT NULL,
  embedding BLOB                      -- vecteur float32 sérialisé, si embeddings configurés
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id, ordinal);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  text, section, document_name, chunk_id UNINDEXED, tokenize = 'unicode61 remove_diacritics 2'
);

-- Séances.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  mode TEXT NOT NULL,                 -- dialogue_dirige | codir_assiste | codir_actif
  status TEXT NOT NULL,               -- active | closed
  started_at TEXT NOT NULL,
  ended_at TEXT,
  last_intervention_at TEXT
);

-- Transcription et échanges (contexte temporaire de séance).
CREATE TABLE IF NOT EXISTS utterances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,                 -- participant | assistant | systeme
  speaker TEXT,                       -- NULL sauf identification fiable (saisie explicite)
  text TEXT NOT NULL,
  source TEXT,                        -- micro | clavier | assistant
  turn_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_utt_session ON utterances(session_id, seq);

-- Résumé borné de la séance (mémoire de travail), avec borne haute couverte.
CREATE TABLE IF NOT EXISTS session_summaries (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  upto_seq INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tours de traitement (traçabilité, annulation).
CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  ts TEXT NOT NULL,
  trigger TEXT NOT NULL,              -- adresse | ecoute
  input_text TEXT NOT NULL,
  status TEXT NOT NULL,               -- en_cours | termine | annule | erreur
  result_json TEXT,
  error TEXT,
  search_mode TEXT
);

-- Mémoire métier persistante.
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  dossier TEXT,
  type TEXT NOT NULL,                 -- fait | declaration | hypothese | engagement | synthese | correction
  source_type TEXT NOT NULL,          -- document | seance | utilisateur
  source_ref TEXT NOT NULL,           -- JSON : {document_id, chunk_id} ou {session_id, utterance_id, ts}
  author TEXT,                        -- uniquement si identifié de manière fiable
  stated_at TEXT,
  effective_at TEXT,
  status TEXT NOT NULL,               -- declare | a_confirmer | valide | conteste | remplace
  relations TEXT NOT NULL DEFAULT '[]', -- JSON [{type: contredit|remplace|precise|complete, memory_id}]
  needs_review INTEGER NOT NULL DEFAULT 0,
  review_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content, dossier, memory_id UNINDEXED, tokenize = 'unicode61 remove_diacritics 2'
);

-- Historisation des corrections humaines et changements de statut.
CREATE TABLE IF NOT EXISTS memory_history (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  actor TEXT NOT NULL,                -- utilisateur | agent | systeme
  change TEXT NOT NULL                -- JSON {avant, apres, motif}
);

-- Décisions structurées (validées uniquement via l'interface).
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  objet TEXT NOT NULL,
  dossier TEXT,
  status TEXT NOT NULL,               -- proposee | validee | rejetee
  source_ref TEXT NOT NULL,
  proposed_by TEXT NOT NULL,          -- agent | utilisateur
  validated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Actions structurées. Les champs manquants restent NULL et visibles.
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  objet TEXT NOT NULL,
  dossier TEXT,
  responsable TEXT,
  echeance TEXT,
  status TEXT NOT NULL,               -- proposee | validee | rejetee | en_cours | terminee
  source_ref TEXT NOT NULL,
  proposed_by TEXT NOT NULL,
  validated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- File des interventions proposées par l'assistant.
CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_id TEXT,
  ts TEXT NOT NULL,
  trigger TEXT NOT NULL,              -- question_adressee | contradiction | precision | action_incomplete | dependance | clarification
  motif TEXT NOT NULL,
  text TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]', -- JSON [chunk_id | memory_id]
  status TEXT NOT NULL,               -- proposee | lue | rejetee | reportee | obsolete
  policy_check TEXT,                  -- JSON des contrôles appliqués
  spoken_at TEXT,
  after_seq INTEGER                   -- dernier seq d'énoncé connu lors de la proposition
);

-- Demandes de clarification (montant, date, nom, négation).
CREATE TABLE IF NOT EXISTS clarifications (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  turn_id TEXT,
  ts TEXT NOT NULL,
  question TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,               -- ouverte | repondue | ignoree
  answer TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
