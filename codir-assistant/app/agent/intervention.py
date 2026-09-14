"""Politique de prise de parole : gardes appliquées dans le code (mode, motif, source, délai, longueur, répétition)."""
from __future__ import annotations

import difflib
from datetime import datetime, timezone


def _parse(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts)
    except ValueError:
        return None


class InterventionPolicy:
    def __init__(self, policies: dict, min_delay_s: int, max_chars: int):
        self.p = policies
        self.min_delay_s = min_delay_s
        self.max_chars = max_chars

    def mode_config(self, mode: str) -> dict:
        return self.p["modes"].get(mode, self.p["modes"]["codir_assiste"])

    def evaluate(self, *, mode: str, proposal: dict, valid_sources: list[str], recent_interventions: list[dict],
                 last_intervention_at: str | None, trigger_kind: str) -> dict:
        """Retourne {autorisee: bool, motifs_refus: [...], texte: str, controles: {...}}."""
        checks: dict = {}
        refus: list[str] = []
        cfg = self.mode_config(mode)
        if trigger_kind == "ecoute" and not cfg["interventions"]:
            refus.append(f"Le mode {mode} n'autorise pas les interventions spontanées")
        checks["mode"] = mode

        declencheur = proposal.get("declencheur")
        if declencheur not in self.p["declencheurs_autorises"]:
            refus.append(f"Déclencheur non autorisé : {declencheur}")
        checks["declencheur"] = declencheur

        motif = (proposal.get("motif") or "").strip()
        if not motif:
            refus.append("Motif explicite manquant")
        checks["motif_present"] = bool(motif)

        if declencheur in self.p["source_obligatoire"] and not valid_sources:
            refus.append("Source obligatoire absente ou non vérifiée pour ce déclencheur")
        checks["sources_verifiees"] = list(valid_sources)

        texte = (proposal.get("texte") or "").strip()
        texte_complet = texte
        if not texte:
            refus.append("Texte d'intervention vide")
        if len(texte) > self.max_chars:
            texte = texte[: self.max_chars].rsplit(" ", 1)[0] + "…"
            checks["texte_tronque"] = True
        checks["longueur"] = len(texte)

        # délai minimal entre interventions spontanées (le délai ne s'applique pas à une question adressée)
        if trigger_kind == "ecoute" and last_intervention_at:
            last = _parse(last_intervention_at)
            if last:
                elapsed = (datetime.now(timezone.utc) - last).total_seconds()
                checks["delai_depuis_derniere_s"] = round(elapsed)
                if elapsed < self.min_delay_s:
                    refus.append(f"Délai minimal non écoulé ({round(elapsed)} s < {self.min_delay_s} s)")

        # répétition
        seuil = self.p["intervention"]["similarite_repetition"]
        for prev in recent_interventions:
            if prev.get("status") in ("rejetee",) or not prev.get("text"):
                continue
            ratio = max(difflib.SequenceMatcher(None, prev["text"].lower(), t.lower()).ratio() for t in (texte, texte_complet))
            if ratio >= seuil:
                refus.append(f"Répétition d'une intervention récente ({int(ratio * 100)} %)")
                checks["repetition_de"] = prev["id"]
                break

        return {"autorisee": not refus, "motifs_refus": refus, "texte": texte, "controles": checks}

    def can_autospeak(self, mode: str, silence_ms: int) -> tuple[bool, str]:
        cfg = self.mode_config(mode)
        if not cfg["lecture_automatique"]:
            return False, f"Lecture automatique non autorisée en mode {mode}"
        if silence_ms < self.p["intervention"]["pause_minimale_ms"]:
            return False, f"Pause insuffisante ({silence_ms} ms < {self.p['intervention']['pause_minimale_ms']} ms)"
        return True, "ok"
