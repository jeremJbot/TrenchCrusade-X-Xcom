@echo off
REM Lanceur un clic (Windows). Double-cliquer sur ce fichier.
cd /d "%~dp0"
where python >nul 2>nul || (echo Python 3.11+ introuvable. Installer depuis https://www.python.org/downloads/ en cochant "Add python to PATH". & pause & exit /b 1)
if not exist .venv (
  echo Premiere installation : creation de l'environnement...
  python -m venv .venv || (pause & exit /b 1)
  .venv\Scripts\python -m pip install -q -r requirements.txt || (pause & exit /b 1)
)
if not exist .env (
  copy .env.example .env >nul
  echo Fichier .env cree : renseigner les cles ^(ANTHROPIC_API_KEY, STT_API_KEY, TTS_API_KEY^) puis relancer.
  notepad .env
)
echo Demarrage de l'assistant CODIR FIN... fermer cette fenetre pour l'arreter.
.venv\Scripts\python run.py --ouvrir
pause
