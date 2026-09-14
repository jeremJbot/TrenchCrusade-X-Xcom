"""Point d'entrée : python run.py [--ouvrir]  (--ouvrir : ouvre le navigateur automatiquement)"""
import sys
import threading
import webbrowser

from app.config import load_settings
from app.main import run

if __name__ == "__main__":
    if "--ouvrir" in sys.argv:
        s = load_settings()
        threading.Timer(1.5, lambda: webbrowser.open(f"http://{s.host}:{s.port}")).start()
    run()
