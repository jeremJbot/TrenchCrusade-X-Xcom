"""Serveur audio FACTICE (tests uniquement, étiqueté SIMULÉ).

Imite les endpoints compatibles OpenAI /v1/audio/transcriptions et /v1/audio/speech pour tester
la mécanique client (détection de parole, envoi de segment, lecture) SANS transcription réelle.
Il renvoie toujours le texte fixé par FAKE_STT_TEXT et un WAV de silence. Ne valide en rien
le parcours audio réel.

Usage : python evals/fake_audio_server.py [port]
"""
import json
import os
import struct
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

TEXT = os.environ.get("FAKE_STT_TEXT", "[SIMULÉ] Assistant, quel est le seuil de visa de la chaîne de la dépense ?")


def silent_wav(seconds: float = 0.6, rate: int = 16000) -> bytes:
    n = int(seconds * rate)
    data = b"\x00\x00" * n
    return b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) + b"data" + struct.pack("<I", len(data)) + data


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):  # silencieux
        pass

    def do_GET(self):
        self._json({"data": [{"id": "fake"}]})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        if self.path.endswith("/audio/transcriptions"):
            self._json({"text": TEXT if length > 200 else "", "simulated": True})
        elif self.path.endswith("/audio/speech"):
            wav = silent_wav()
            self.send_response(200); self.send_header("Content-Type", "audio/wav"); self.send_header("Content-Length", str(len(wav))); self.end_headers(); self.wfile.write(wav)
        elif self.path.endswith("/embeddings"):
            inputs = json.loads(body).get("input", [])
            self._json({"data": [{"index": i, "embedding": [float((hash(t) >> s) & 0xFF) / 255 for s in range(0, 64, 8)]} for i, t in enumerate(inputs)]})
        else:
            self.send_response(404); self.end_headers()

    def _json(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
    print(f"[SIMULÉ] faux serveur audio sur http://127.0.0.1:{port}/v1")
    HTTPServer(("127.0.0.1", port), H).serve_forever()
