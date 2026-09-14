"""Transcription et synthèse via des endpoints compatibles OpenAI (HTTP brut, sans SDK).

Données transmises : l'audio brut de chaque segment (STT) et le texte à prononcer (TTS).
L'audio n'est pas conservé côté serveur après la requête.
"""
from __future__ import annotations

import httpx

from .base import ProviderError


class OpenAICompatibleSTT:
    name = "openai_compatible"

    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 60.0):
        self.base_url, self.api_key, self.model, self.timeout = base_url, api_key, model, timeout

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    def transcribe(self, audio: bytes, mime: str, language: str) -> dict:
        ext = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mp4": "mp4", "audio/mpeg": "mp3"}.get(
            mime.split(";")[0].strip(), "webm")
        files = {"file": (f"segment.{ext}", audio, mime.split(";")[0].strip() or "audio/webm")}
        data = {"model": self.model, "language": language, "response_format": "json"}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(f"{self.base_url}/audio/transcriptions", headers=self._headers(), data=data, files=files)
        except httpx.HTTPError as exc:
            raise ProviderError(f"Transcription injoignable : {exc}") from exc
        if r.status_code >= 400:
            raise ProviderError(f"Transcription refusée ({r.status_code}) : {r.text[:300]}")
        payload = r.json()
        return {"text": (payload.get("text") or "").strip(), "provider": self.name, "model": self.model}

    def check(self) -> dict:
        if not self.api_key and "api.openai.com" in self.base_url:
            return {"ok": False, "detail": "STT_API_KEY manquante"}
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(f"{self.base_url}/models", headers=self._headers())
            return {"ok": r.status_code < 400, "detail": f"HTTP {r.status_code} sur {self.base_url}/models"}
        except httpx.HTTPError as exc:
            return {"ok": False, "detail": f"Injoignable : {exc}"}


class OpenAICompatibleTTS:
    name = "openai_compatible"

    def __init__(self, base_url: str, api_key: str, model: str, voice: str, timeout: float = 60.0):
        self.base_url, self.api_key, self.model, self.voice, self.timeout = base_url, api_key, model, voice, timeout

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    def synthesize(self, text: str) -> tuple[bytes, str]:
        body = {"model": self.model, "voice": self.voice, "input": text, "response_format": "mp3"}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(f"{self.base_url}/audio/speech", headers=self._headers(), json=body)
        except httpx.HTTPError as exc:
            raise ProviderError(f"Synthèse vocale injoignable : {exc}") from exc
        if r.status_code >= 400:
            raise ProviderError(f"Synthèse vocale refusée ({r.status_code}) : {r.text[:300]}")
        return r.content, r.headers.get("content-type", "audio/mpeg")

    def check(self) -> dict:
        if not self.api_key and "api.openai.com" in self.base_url:
            return {"ok": False, "detail": "TTS_API_KEY manquante"}
        try:
            audio, ctype = self.synthesize("Test de synthèse vocale.")
            return {"ok": len(audio) > 0, "detail": f"{len(audio)} octets ({ctype})"}
        except ProviderError as exc:
            return {"ok": False, "detail": str(exc)}


class OpenAICompatibleEmbeddings:
    name = "openai_compatible"

    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 60.0):
        self.base_url, self.api_key, self.model, self.timeout = base_url, api_key, model, timeout

    def embed(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), 64):
            batch = texts[i:i + 64]
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    r = client.post(f"{self.base_url}/embeddings", headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
                                    json={"model": self.model, "input": batch})
            except httpx.HTTPError as exc:
                raise ProviderError(f"Embeddings injoignables : {exc}") from exc
            if r.status_code >= 400:
                raise ProviderError(f"Embeddings refusés ({r.status_code}) : {r.text[:300]}")
            data = sorted(r.json()["data"], key=lambda d: d.get("index", 0))
            out.extend([d["embedding"] for d in data])
        return out

    def check(self) -> dict:
        try:
            v = self.embed(["test"])
            return {"ok": True, "detail": f"Vecteur de dimension {len(v[0])}"}
        except ProviderError as exc:
            return {"ok": False, "detail": str(exc)}
