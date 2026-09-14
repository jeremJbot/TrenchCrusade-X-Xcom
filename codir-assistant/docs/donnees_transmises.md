# Données transmises aux fournisseurs et conservation

| Fournisseur | Données envoyées | Quand |
|---|---|---|
| Modèle (API Claude, `ANTHROPIC_*`) | Consignes système, règles résumées, extraits documentaires retrouvés (texte), souvenirs pertinents (contenu, statut, provenance), résumé de séance, énoncés récents (≤ 14), question ou segment, définitions d'outils, résultats d'outils. Jamais d'audio. | À chaque tour (question adressée ou segment écouté), lors du résumé de séance, lors de la revérification d'une intervention. |
| Transcription (`STT_*`, endpoint compatible OpenAI) | L'audio brut de chaque segment de parole détecté (webm/opus), la langue. | À chaque segment, micro actif et non suspendu. En pause, aucun envoi. Pendant la lecture d'une réponse, aucun segment n'est envoyé (prévention de la réingestion). |
| Reconnaissance du navigateur (`STT_PROVIDER=browser`) | L'audio est traité par le fournisseur du navigateur (Google pour Chrome, Microsoft pour Edge), hors de l'application. | Idem. |
| Synthèse (`TTS_*`) | Le texte de la réponse orale ou de l'intervention. | À chaque lecture. |
| Embeddings (`EMBEDDINGS_*`, optionnel) | Le texte de chaque extrait indexé, et le texte de chaque requête. | À l'indexation et à chaque recherche. |

## Conservation locale (base SQLite `data/codir.sqlite3`)
- **Conservé** : métadonnées et extraits des documents indexés (supprimés physiquement quand le fichier disparaît), transcription texte des séances, réponses, résumés de séance, souvenirs et leur historique, décisions, actions, interventions, clarifications, tours (entrée texte et résultat).
- **Non conservé** : l'audio brut (transmis au fournisseur STT puis libéré ; aucun fichier audio écrit sur disque), les clés (lues depuis `.env`, jamais renvoyées au navigateur ni journalisées).
- Les journaux du serveur (uvicorn) ne contiennent que les routes appelées.

## Politique du fournisseur de modèle
Les conditions de conservation des données côté fournisseur dépendent du contrat de l'organisation (par exemple les options de rétention de l'API Claude). Vérifier ces conditions avant tout usage avec des données réelles.
