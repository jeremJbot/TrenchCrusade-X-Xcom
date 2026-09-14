"""Instanciation des adaptateurs selon la configuration."""
from __future__ import annotations

from ..config import Settings
from .anthropic_llm import AnthropicLLM
from .audio import OpenAICompatibleEmbeddings, OpenAICompatibleSTT, OpenAICompatibleTTS
from .base import ProviderError
from .simulated import SimulatedLLM


def build_llm(s: Settings):
    if s.llm_provider == "simulated":
        return SimulatedLLM()
    if s.llm_provider == "anthropic":
        return AnthropicLLM(s.anthropic_api_key, s.anthropic_model, s.anthropic_effort, s.anthropic_fallbacks)
    raise ProviderError(f"LLM_PROVIDER inconnu : {s.llm_provider}")


def build_stt(s: Settings):
    if s.stt_provider == "openai_compatible":
        return OpenAICompatibleSTT(s.stt_base_url, s.stt_api_key, s.stt_model)
    return None  # browser | none : rien côté serveur


def build_tts(s: Settings):
    if s.tts_provider == "openai_compatible":
        return OpenAICompatibleTTS(s.tts_base_url, s.tts_api_key, s.tts_model, s.tts_voice)
    return None


def build_embeddings(s: Settings):
    if s.embeddings_provider == "openai_compatible":
        return OpenAICompatibleEmbeddings(s.embeddings_base_url, s.embeddings_api_key, s.embeddings_model)
    return None
