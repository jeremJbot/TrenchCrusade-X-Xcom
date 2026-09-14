"""Adaptateur API Claude (SDK officiel `anthropic`).

Données transmises au fournisseur : consignes système, extraits documentaires retrouvés,
souvenirs pertinents, résumé et énoncés récents de la séance, définitions d'outils.
Aucun audio n'est transmis à ce fournisseur.
"""
from __future__ import annotations

import anthropic

from .base import LLMResponse, ProviderError

FALLBACK_BETA = "server-side-fallback-2026-07-01"


class AnthropicLLM:
    name = "anthropic"
    simulated = False

    def __init__(self, api_key: str, model: str, effort: str = "medium", fallbacks: bool = True, timeout: float = 120.0):
        if not api_key:
            raise ProviderError("ANTHROPIC_API_KEY manquante")
        self.client = anthropic.Anthropic(api_key=api_key, timeout=timeout, max_retries=2)
        self.model = model
        self.effort = effort if effort in ("low", "medium", "high", "xhigh", "max") else "medium"
        self.fallbacks = fallbacks

    def generate(self, *, system: str, messages: list[dict], tools: list[dict], max_tokens: int = 4000) -> LLMResponse:
        kwargs = dict(
            model=self.model,
            max_tokens=max_tokens,
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            messages=messages,
            tools=tools,
            output_config={"effort": self.effort},
        )
        try:
            if self.fallbacks:
                try:
                    resp = self.client.beta.messages.create(betas=[FALLBACK_BETA], fallbacks="default", **kwargs)
                except anthropic.BadRequestError as exc:
                    if "fallback" in str(exc).lower():
                        resp = self.client.messages.create(**kwargs)
                    else:
                        raise
            else:
                resp = self.client.messages.create(**kwargs)
        except anthropic.AuthenticationError as exc:
            raise ProviderError(f"Authentification Claude refusée : {exc.message}") from exc
        except anthropic.RateLimitError as exc:
            raise ProviderError("Limite de débit Claude atteinte, réessayer dans quelques secondes") from exc
        except anthropic.APIStatusError as exc:
            raise ProviderError(f"Erreur API Claude ({exc.status_code}) : {exc.message}") from exc
        except anthropic.APIConnectionError as exc:
            raise ProviderError(f"Connexion à l'API Claude impossible : {exc}") from exc
        data = resp.model_dump(exclude_none=True)
        content = [b for b in data.get("content", []) if b.get("type") != "fallback"]
        refusal = None
        if resp.stop_reason == "refusal":
            sd = data.get("stop_details") or {}
            refusal = {"category": sd.get("category"), "explanation": sd.get("explanation")}
        return LLMResponse(content=content, stop_reason=resp.stop_reason or "end_turn", model=data.get("model", self.model),
                           usage=data.get("usage", {}), refusal=refusal)

    def check(self) -> dict:
        try:
            resp = self.client.messages.create(model=self.model, max_tokens=16,
                                               messages=[{"role": "user", "content": "Réponds uniquement : OK"}])
            return {"ok": True, "detail": f"Modèle {resp.model} joignable"}
        except anthropic.APIError as exc:
            return {"ok": False, "detail": f"{type(exc).__name__}: {getattr(exc, 'message', exc)}"}
        except Exception as exc:
            return {"ok": False, "detail": f"{type(exc).__name__}: {exc}"}
