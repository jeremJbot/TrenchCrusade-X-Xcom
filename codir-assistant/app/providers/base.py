"""Interfaces communes des adaptateurs."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class LLMResponse:
    content: list[dict]          # blocs {type: text|tool_use|thinking...} au format API Messages
    stop_reason: str
    model: str = ""
    usage: dict = field(default_factory=dict)
    refusal: dict | None = None

    @property
    def text(self) -> str:
        return "\n".join(b.get("text", "") for b in self.content if b.get("type") == "text").strip()

    @property
    def tool_uses(self) -> list[dict]:
        return [b for b in self.content if b.get("type") == "tool_use"]


class LLMProvider(Protocol):
    name: str
    simulated: bool

    def generate(self, *, system: str, messages: list[dict], tools: list[dict], max_tokens: int = 4000) -> LLMResponse: ...

    def check(self) -> dict: ...


class STTProvider(Protocol):
    name: str

    def transcribe(self, audio: bytes, mime: str, language: str) -> dict: ...

    def check(self) -> dict: ...


class TTSProvider(Protocol):
    name: str

    def synthesize(self, text: str) -> tuple[bytes, str]: ...

    def check(self) -> dict: ...


class EmbeddingsProvider(Protocol):
    name: str

    def embed(self, texts: list[str]) -> list[list[float]]: ...

    def check(self) -> dict: ...


class ProviderError(Exception):
    pass
