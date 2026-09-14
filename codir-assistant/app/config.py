"""Chargement de la configuration depuis l'environnement et un fichier .env optionnel.

Les clés restent côté serveur : rien de ce module n'est exposé tel quel au frontend
(voir `public_settings()` qui ne renvoie que des informations non sensibles).
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODES = ("dialogue_dirige", "codir_assiste", "codir_actif")


def load_dotenv(path: Path) -> None:
    """Charge un fichier .env minimal (KEY=VALUE, commentaires #) sans écraser l'environnement."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


@dataclass
class Settings:
    host: str = "127.0.0.1"
    port: int = 8765
    data_dir: Path = BASE_DIR / "data"
    docs_dir: Path = BASE_DIR / "data" / "documents"
    default_mode: str = "codir_assiste"

    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5"
    anthropic_effort: str = "medium"
    anthropic_fallbacks: bool = True

    stt_provider: str = "openai_compatible"
    stt_base_url: str = "https://api.openai.com/v1"
    stt_api_key: str = ""
    stt_model: str = "whisper-1"
    stt_language: str = "fr"

    tts_provider: str = "openai_compatible"
    tts_base_url: str = "https://api.openai.com/v1"
    tts_api_key: str = ""
    tts_model: str = "tts-1"
    tts_voice: str = "alloy"

    embeddings_provider: str = "none"
    embeddings_base_url: str = "https://api.openai.com/v1"
    embeddings_api_key: str = ""
    embeddings_model: str = "text-embedding-3-small"

    intervention_min_delay_s: int = 90
    intervention_max_chars: int = 600

    extra: dict = field(default_factory=dict)

    @property
    def db_path(self) -> Path:
        return self.data_dir / "codir.sqlite3"

    def public_settings(self) -> dict:
        """Vue sans secret, destinée à l'interface."""
        return {
            "host": self.host,
            "port": self.port,
            "docs_dir": str(self.docs_dir),
            "data_dir": str(self.data_dir),
            "default_mode": self.default_mode,
            "llm": {
                "provider": self.llm_provider,
                "model": self.anthropic_model if self.llm_provider == "anthropic" else "simulé",
                "effort": self.anthropic_effort,
                "key_configured": bool(self.anthropic_api_key) if self.llm_provider == "anthropic" else None,
                "simulated": self.llm_provider == "simulated",
            },
            "stt": {
                "provider": self.stt_provider,
                "base_url": self.stt_base_url if self.stt_provider == "openai_compatible" else None,
                "model": self.stt_model if self.stt_provider == "openai_compatible" else None,
                "language": self.stt_language,
                "key_configured": bool(self.stt_api_key) if self.stt_provider == "openai_compatible" else None,
            },
            "tts": {
                "provider": self.tts_provider,
                "base_url": self.tts_base_url if self.tts_provider == "openai_compatible" else None,
                "model": self.tts_model if self.tts_provider == "openai_compatible" else None,
                "voice": self.tts_voice,
                "key_configured": bool(self.tts_api_key) if self.tts_provider == "openai_compatible" else None,
            },
            "embeddings": {
                "provider": self.embeddings_provider,
                "model": self.embeddings_model if self.embeddings_provider != "none" else None,
                "key_configured": bool(self.embeddings_api_key) if self.embeddings_provider != "none" else None,
            },
            "intervention": {
                "min_delay_s": self.intervention_min_delay_s,
                "max_chars": self.intervention_max_chars,
            },
            "retention": {
                "audio_brut": "non conservé (transmis au fournisseur STT puis supprimé de la mémoire du serveur)",
                "texte": "transcriptions, réponses, mémoire, décisions et actions conservés dans la base SQLite locale",
            },
        }


def _bool(v: str, default: bool) -> bool:
    if v is None or v == "":
        return default
    return v.lower() in ("1", "true", "on", "yes", "oui")


def load_settings(env_file: Path | None = None) -> Settings:
    load_dotenv(env_file or BASE_DIR / ".env")
    g = os.environ.get
    s = Settings(
        host=g("CODIR_HOST", "127.0.0.1"),
        port=int(g("CODIR_PORT", "8765")),
        data_dir=(BASE_DIR / g("CODIR_DATA_DIR", "./data")).resolve(),
        docs_dir=(BASE_DIR / g("CODIR_DOCS_DIR", "./data/documents")).resolve(),
        default_mode=g("CODIR_DEFAULT_MODE", "codir_assiste"),
        llm_provider=g("LLM_PROVIDER", "anthropic"),
        anthropic_api_key=g("ANTHROPIC_API_KEY", ""),
        anthropic_model=g("ANTHROPIC_MODEL", "claude-opus-5"),
        anthropic_effort=g("ANTHROPIC_EFFORT", "medium"),
        anthropic_fallbacks=_bool(g("ANTHROPIC_FALLBACKS", "on"), True),
        stt_provider=g("STT_PROVIDER", "openai_compatible"),
        stt_base_url=g("STT_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
        stt_api_key=g("STT_API_KEY", ""),
        stt_model=g("STT_MODEL", "whisper-1"),
        stt_language=g("STT_LANGUAGE", "fr"),
        tts_provider=g("TTS_PROVIDER", "openai_compatible"),
        tts_base_url=g("TTS_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
        tts_api_key=g("TTS_API_KEY", ""),
        tts_model=g("TTS_MODEL", "tts-1"),
        tts_voice=g("TTS_VOICE", "alloy"),
        embeddings_provider=g("EMBEDDINGS_PROVIDER", "none"),
        embeddings_base_url=g("EMBEDDINGS_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
        embeddings_api_key=g("EMBEDDINGS_API_KEY", ""),
        embeddings_model=g("EMBEDDINGS_MODEL", "text-embedding-3-small"),
        intervention_min_delay_s=int(g("INTERVENTION_MIN_DELAY_S", "90")),
        intervention_max_chars=int(g("INTERVENTION_MAX_CHARS", "600")),
    )
    if s.default_mode not in MODES:
        s.default_mode = "codir_assiste"
    return s
