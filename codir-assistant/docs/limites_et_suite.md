# Limites connues et prochaines étapes

## Limites de la V1
- **Aucun appel réel n'a été validé** : pas de clé API dans l'environnement de développement. Les adaptateurs sont implémentés ; la configuration manquante est `ANTHROPIC_API_KEY` (modèle), `STT_API_KEY`/`STT_BASE_URL` (transcription), `TTS_API_KEY`/`TTS_BASE_URL` (synthèse), et optionnellement `EMBEDDINGS_*`.
- **Monoposte, local** : pas d'authentification, pas de chiffrement, pas de multi-utilisateur. Ne pas exposer sur un réseau.
- **Audio** : segmentation par énergie (pas de VAD neuronal) ; transcription par segments (pas de flux temps réel) ; pas de diarisation ; l'orateur n'est attribué que s'il est saisi. La transcription partielle n'est native qu'avec `STT_PROVIDER=browser`.
- **OCR** : PDF image signalés `ocr_requis`, non traités.
- **Recherche** : lexicale (FTS5) par défaut ; sémantique seulement si un endpoint d'embeddings est configuré. Pas de reranking.
- **Adressage** : préfixe « Assistant, » ou bouton ; pas de détection de mot-clé en flux continu.
- **Mode C** : expérimental ; la revérification avant lecture repose sur un appel modèle.
- **Fournisseur simulé** : scripté et étiqueté ; il n'évalue pas la qualité des réponses du modèle réel.
- Les extraits de documents sont conservés en base tant que le fichier existe ; ils sont supprimés avec lui.

## Prochaines étapes proposées
1. Valider le parcours réel avec les clés (evals `--real`, essais audio sur le poste), ajuster les seuils audio et l'effort du modèle.
2. Connecteurs (interfaces à ajouter dans `app/providers/` et de nouvelles tables) : Teams (transcription de réunion), Outlook (ordre du jour, envoi du relevé après validation explicite), serveurs SGP (répertoires de référence). Aucun envoi n'est possible depuis l'agent : prévoir une action utilisateur dédiée.
3. OCR pour les PDF image (par exemple `ocrmypdf` local), avec marquage du texte issu d'OCR.
4. Recherche sémantique locale (modèle d'embeddings sur le poste) pour éviter la transmission des extraits.
5. Transcription en flux (WebSocket) avec partiels et meilleur VAD ; diarisation optionnelle avec confirmation humaine.
6. Export du relevé (DOCX) et journal d'audit exportable.
7. Durcissement : authentification locale, chiffrement de la base, purge programmée des transcriptions.
