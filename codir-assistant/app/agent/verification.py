"""Contrôles côté application sur la sortie du modèle.

- Les références citées doivent exister ET avoir été vues pendant le tour (retournées par un outil).
- Les statuts proposés sont ramenés aux statuts autorisés à l'agent.
- Ce contrôle garantit l'existence des références, pas la justesse de leur interprétation.
"""
from __future__ import annotations

from pathlib import Path

import yaml

from ..config import BASE_DIR

POLICIES_PATH = BASE_DIR / "agent" / "policies.yaml"


def load_policies(path: Path = POLICIES_PATH) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def verify_references(refs: list, seen_chunks: dict) -> tuple[list[str], list[str]]:
    valid, rejected = [], []
    for r in refs or []:
        if isinstance(r, str) and r in seen_chunks:
            if r not in valid:
                valid.append(r)
        else:
            rejected.append(str(r))
    return valid, rejected


def verify_memory_refs(refs: list, seen_memories: dict) -> tuple[list[str], list[str]]:
    valid, rejected = [], []
    for r in refs or []:
        if isinstance(r, str) and r in seen_memories:
            valid.append(r)
        else:
            rejected.append(str(r))
    return valid, rejected


def sanitize_memory_status(status: str | None, policies: dict) -> str:
    allowed = policies["autorisations"]["agent"]["souvenirs_statuts_autorises"]
    return status if status in allowed else "declare"


def has_authorized_tool(name: str, policies: dict) -> bool:
    return name in policies["autorisations"]["agent"]["outils"]
