"""Fournisseur de modèle SIMULÉ, explicitement étiqueté.

Sert aux tests automatisés et à la démonstration sans clé. Il ne valide pas le parcours
réel : ses réponses sont préfixées « [SIMULÉ] » et son comportement est scripté :
1. appel n°1 : recherche documentaire et mémoire avec la question ;
2. appel n°2 : réponse finale citant les extraits réellement retournés par les outils.
"""
from __future__ import annotations

import json
import re

from .base import LLMResponse


class SimulatedLLM:
    name = "simulated"
    simulated = True
    model = "simulé"

    def generate(self, *, system: str, messages: list[dict], tools: list[dict], max_tokens: int = 4000) -> LLMResponse:
        user_text = _last_user_text(messages)
        tool_results = _tool_results(messages)
        tool_names = {t["name"] for t in tools}
        if "resumer_seance" in tool_names:
            return _resume(messages)
        if "evaluer_intervention" in tool_names:
            return LLMResponse(content=[{"type": "tool_use", "id": "sim_eval", "name": "evaluer_intervention",
                                         "input": {"toujours_utile": "résolu" not in user_text.lower(), "motif": "[SIMULÉ] évaluation scriptée"}}],
                               stop_reason="tool_use", model=self.model)
        if not tool_results:
            query = _question(user_text)
            return LLMResponse(
                content=[
                    {"type": "tool_use", "id": "sim_search_docs", "name": "rechercher_documents", "input": {"requete": query, "k": 4}},
                    {"type": "tool_use", "id": "sim_search_mem", "name": "rechercher_memoire", "input": {"requete": query}},
                ],
                stop_reason="tool_use", model=self.model,
            )
        chunks = [c for r in tool_results if r["name"] == "rechercher_documents" for c in r["data"].get("resultats", [])]
        mems = [m for r in tool_results if r["name"] == "rechercher_memoire" for m in r["data"].get("resultats", [])]
        mode_ecoute = "MODE_ECOUTE" in user_text
        final: dict = {
            "repondre": True, "references": [c["chunk_id"] for c in chunks[:2]], "souvenirs_cites": [m["memory_id"] for m in mems[:2]],
            "souvenirs_proposes": [], "decisions_proposees": [], "actions_proposees": [], "clarifications": [], "intervention": None,
        }
        q = _question(user_text)
        if chunks:
            top = chunks[0]
            final["reponse_ecrite"] = (f"[SIMULÉ] D'après « {top['document']} » ({top['repere']}) : {top['extrait'][:300]}")
            final["reponse_orale"] = f"[SIMULÉ] Selon le document {top['document']}, {top['extrait'][:160]}"
        else:
            final["reponse_ecrite"] = "[SIMULÉ] Je ne trouve pas d'élément dans le corpus de référence pour répondre à cette question."
            final["reponse_orale"] = final["reponse_ecrite"]
            final["references"] = []
        if mems:
            final["reponse_ecrite"] += f"\nSouvenir ({mems[0]['statut']}) : {mems[0]['contenu'][:200]}"
        if mode_ecoute:
            final["repondre"] = False
            final["reponse_ecrite"] = ""
            final["reponse_orale"] = ""
            seg = _segment(user_text)
            if seg:
                low = seg.lower()
                if re.search(r"\b(\d[\d\s]*(k€|m€|millions?|milliers?|€))", low) and re.search(r"\b(environ|à peu près|je crois|peut-être)\b", low):
                    final["clarifications"].append({"question": f"[SIMULÉ] Pouvez-vous confirmer le montant évoqué : « {seg[:80]} » ?",
                                                    "motif": "montant incertain"})
                if re.search(r"\b(doit|devra|va|prendra|s'engage|à faire|action)\b", low) and re.search(r"\b(qui|personne|sans responsable)\b|\bd'ici\b", low) is None:
                    final["actions_proposees"].append({"objet": f"[SIMULÉ] {seg[:120]}", "dossier": None, "responsable": None, "echeance": None})
                    final["intervention"] = {"declencheur": "action_incomplete", "motif": "[SIMULÉ] action sans responsable ni échéance",
                                             "texte": "[SIMULÉ] Qui porte cette action et à quelle échéance ?", "sources": []}
                elif chunks and re.search(r"\b(n'est plus|désormais|dorénavant|finalement|en fait|contrairement)\b", low):
                    final["intervention"] = {"declencheur": "contradiction", "motif": "[SIMULÉ] écart avec une source",
                                             "texte": f"[SIMULÉ] Cette déclaration diffère du document {chunks[0]['document']}.",
                                             "sources": [chunks[0]["chunk_id"]]}
                    final["souvenirs_proposes"].append({"contenu": seg, "type": "declaration", "dossier": None, "statut": "declare",
                                                        "relations": []})
                else:
                    final["souvenirs_proposes"].append({"contenu": seg, "type": "declaration", "dossier": None, "statut": "declare",
                                                        "relations": []})
        return LLMResponse(content=[{"type": "tool_use", "id": "sim_final", "name": "produire_reponse", "input": final}],
                           stop_reason="tool_use", model=self.model)

    def check(self) -> dict:
        return {"ok": True, "detail": "Mode SIMULÉ actif : aucune validation du parcours réel"}


def _resume(messages: list[dict]) -> LLMResponse:
    text = _last_user_text(messages)
    lines = [l for l in text.splitlines() if l.startswith("- ")]
    summary = "[SIMULÉ] Résumé : " + " / ".join(l[2:][:80] for l in lines[-8:])
    return LLMResponse(content=[{"type": "tool_use", "id": "sim_sum", "name": "resumer_seance", "input": {"resume": summary}}],
                       stop_reason="tool_use", model="simulé")


def _last_user_text(messages: list[dict]) -> str:
    for m in reversed(messages):
        if m["role"] == "user":
            c = m["content"]
            if isinstance(c, str):
                return c
            texts = [b.get("text", "") for b in c if b.get("type") == "text"]
            if texts:
                return "\n".join(texts)
    return ""


def _tool_results(messages: list[dict]) -> list[dict]:
    calls = {}
    for m in messages:
        if m["role"] == "assistant" and isinstance(m["content"], list):
            for b in m["content"]:
                if b.get("type") == "tool_use":
                    calls[b["id"]] = b["name"]
    out = []
    for m in messages:
        if m["role"] == "user" and isinstance(m["content"], list):
            for b in m["content"]:
                if b.get("type") == "tool_result":
                    try:
                        data = json.loads(b["content"]) if isinstance(b["content"], str) else {}
                    except json.JSONDecodeError:
                        data = {}
                    out.append({"name": calls.get(b["tool_use_id"], "?"), "data": data})
    return out


def _question(text: str) -> str:
    m = re.search(r"QUESTION\s*:\s*(.+)", text)
    if m:
        return m.group(1).strip()
    seg = _segment(text)
    return seg or text[-200:]


def _segment(text: str) -> str:
    m = re.search(r"NOUVEAU_SEGMENT\s*:\s*(.+)", text)
    return m.group(1).strip() if m else ""
