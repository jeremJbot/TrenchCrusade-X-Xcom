#!/bin/bash
# Lanceur un clic (macOS : double-clic sur lancer.command ; Linux : ./lancer.command)
cd "$(dirname "$0")"
command -v python3 >/dev/null || { echo "Python 3.11+ introuvable."; read -r -p "Entrée pour fermer"; exit 1; }
if [ ! -d .venv ]; then
  echo "Première installation : création de l'environnement…"
  python3 -m venv .venv && .venv/bin/python -m pip install -q -r requirements.txt || { read -r -p "Échec. Entrée pour fermer"; exit 1; }
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Fichier .env créé : renseigner les clés (ANTHROPIC_API_KEY, STT_API_KEY, TTS_API_KEY) puis relancer."
  ${EDITOR:-open -t} .env 2>/dev/null || true
fi
echo "Démarrage de l'assistant CODIR FIN… fermer cette fenêtre (Ctrl+C) pour l'arrêter."
.venv/bin/python run.py --ouvrir
