"""Orchestrateur d'un tour : identifier, rechercher, contextualiser, produire, vérifier, enregistrer.

Séparation des sources du contexte :
- consignes stables : agent/system_prompt.md (system) ;
- règles d'intervention et d'autorisation : agent/policies.yaml (appliquées ici, résumées au modèle) ;
- documents et souvenirs : via les outils (et une pré-recherche bornée) ;
- mémoire persistante : MemoryStore ;
- contexte temporaire de séance : résumé borné + énoncés récents ;
- appels d'outils : ToolContext.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

from ..config import BASE_DIR, Settings
from ..memory import AuthorizationError, MemoryStore
from ..providers.base import LLMResponse, ProviderError
from ..search import SearchEngine
from ..sessions import SessionStore
from .intervention import InterventionPolicy
from .tools import TOOL_DEFINITIONS, ToolContext, final_tool_definition, repere
from .verification import load_policies, sanitize_memory_status, verify_memory_refs, verify_references

SYSTEM_PROMPT_PATH = BASE_DIR / "agent" / "system_prompt.md"
RESPONSE_SCHEMA_PATH = BASE_DIR / "agent" / "schemas" / "reponse.schema.json"
MAX_ITERATIONS = 8
PRE_RETRIEVE_K = 4


class TurnCancelled(Exception):
    pass


class Orchestrator:
    def __init__(self, settings: Settings, llm, search: SearchEngine, memory: MemoryStore, sessions: SessionStore):
        self.settings = settings
        self.llm = llm
        self.search = search
        self.memory = memory
        self.sessions = sessions
        self.policies = load_policies()
        self.policy = InterventionPolicy(self.policies, settings.intervention_min_delay_s, settings.intervention_max_chars)
        self.system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
        self.response_schema = json.loads(RESPONSE_SCHEMA_PATH.read_text(encoding="utf-8"))
        self.tools = TOOL_DEFINITIONS + [final_tool_definition(self.response_schema)]
        self._cancel_flags: dict[str, threading.Event] = {}
        self._session_locks: dict[str, threading.Lock] = {}
        self._latest_turn: dict[str, str] = {}

    # ------------------------------------------------------------------ API
    def cancel(self, turn_id: str) -> bool:
        ev = self._cancel_flags.get(turn_id)
        if ev:
            ev.set()
            return True
        return False

    def run_turn(self, *, session_id: str | None, text: str, trigger: str, utterance_id: str | None = None,
                 speaker: str | None = None) -> dict:
        """trigger = 'adresse' (question posée à l'assistant) ou 'ecoute' (segment entendu en séance)."""
        session = self.sessions.get(session_id) if session_id else None
        mode = session["mode"] if session else "dialogue_dirige"
        mode_cfg = self.policy.mode_config(mode)

        # 1. Faut-il traiter ce tour ?
        if trigger == "ecoute" and not mode_cfg["analyse_ecoute"]:
            return {"traite": False, "motif": f"Analyse d'écoute désactivée en mode {mode}"}
        if not text.strip():
            return {"traite": False, "motif": "Texte vide"}

        turn_id = self.sessions.create_turn(session_id, trigger, text, self.search.mode)
        cancel = threading.Event()
        self._cancel_flags[turn_id] = cancel
        lock = self._session_locks.setdefault(session_id or "_", threading.Lock())
        key = session_id or "_"
        if trigger == "adresse":
            # Une nouvelle question rend obsolète la question précédente encore en cours (pas les segments d'écoute).
            prev = self._latest_turn.get(key)
            if prev and prev in self._cancel_flags:
                self._cancel_flags[prev].set()
            self._latest_turn[key] = turn_id
        source_ref = {"session_id": session_id, "utterance_id": utterance_id, "turn_id": turn_id}
        ctx = ToolContext(self.search, self.memory, session_id, turn_id, source_ref)
        try:
            with lock:
                if cancel.is_set():
                    raise TurnCancelled()
                result = self._execute(ctx, session, mode, text, trigger, cancel, speaker)
            result["turn_id"] = turn_id
            self.sessions.finish_turn(turn_id, "termine", result)
            return result
        except TurnCancelled:
            self.sessions.finish_turn(turn_id, "annule")
            return {"traite": False, "turn_id": turn_id, "annule": True, "motif": "Tour annulé (obsolète ou interrompu)"}
        except ProviderError as exc:
            self.sessions.finish_turn(turn_id, "erreur", error=str(exc))
            return {"traite": False, "turn_id": turn_id, "erreur": str(exc)}
        finally:
            self._cancel_flags.pop(turn_id, None)

    # ------------------------------------------------------------ pipeline
    def _execute(self, ctx: ToolContext, session: dict | None, mode: str, text: str, trigger: str,
                 cancel: threading.Event, speaker: str | None) -> dict:
        # 2. Sources et souvenirs pertinents (pré-recherche bornée, le modèle peut compléter par outils)
        pre_chunks = self.search.search_chunks(text, k=PRE_RETRIEVE_K)
        pre_mems = self.search.search_memories(text, k=4)
        for c in pre_chunks:
            ctx.seen_chunks[c["id"]] = c
        for m in pre_mems:
            ctx.seen_memories[m["id"]] = m

        # 3. Contexte borné avec provenance et statut
        user_block = self._build_context(session, mode, text, trigger, pre_chunks, pre_mems, speaker)
        messages: list[dict] = [{"role": "user", "content": [{"type": "text", "text": user_block}]}]

        # 4. Production structurée (boucle d'outils bornée)
        final: dict | None = None
        last_text = ""
        for _ in range(MAX_ITERATIONS):
            if cancel.is_set():
                raise TurnCancelled()
            resp: LLMResponse = self.llm.generate(system=self.system_prompt, messages=messages, tools=self.tools)
            if resp.refusal:
                return {"traite": True, "repondre": True, "reponse_ecrite": "Le modèle a décliné cette demande (filtre de sécurité).",
                        "reponse_orale": "", "references": [], "sources": [], "erreur_modele": resp.refusal}
            messages.append({"role": "assistant", "content": resp.content})
            last_text = resp.text or last_text
            if resp.stop_reason != "tool_use" or not resp.tool_uses:
                break
            results = []
            for tu in resp.tool_uses:
                if tu["name"] == "produire_reponse":
                    final = tu["input"] if isinstance(tu["input"], dict) else {}
                    results.append({"type": "tool_result", "tool_use_id": tu["id"], "content": json.dumps({"ok": True})})
                    continue
                out = ctx.execute(tu["name"], tu["input"] if isinstance(tu["input"], dict) else {})
                results.append({"type": "tool_result", "tool_use_id": tu["id"], "content": out})
            messages.append({"role": "user", "content": results})
            if final is not None:
                break
        if final is None:
            # Le modèle n'a pas utilisé l'outil final : réponse texte sans référence vérifiable.
            final = {"repondre": trigger == "adresse", "reponse_ecrite": last_text, "reponse_orale": last_text[:400],
                     "references": [], "souvenirs_cites": [], "souvenirs_proposes": [], "decisions_proposees": [],
                     "actions_proposees": [], "clarifications": [], "intervention": None, "_sans_outil_final": True}
        if cancel.is_set():
            raise TurnCancelled()

        # 5. Vérifications côté application
        refs, rejected_refs = verify_references(final.get("references"), ctx.seen_chunks)
        mem_refs, rejected_mem = verify_memory_refs(final.get("souvenirs_cites"), ctx.seen_memories)
        sources = [self._source_view(ctx.seen_chunks[r]) for r in refs]
        souvenirs_cites = [self._memory_view(ctx.seen_memories[m]) for m in mem_refs]

        # 7. Enregistrement des propositions (sans contourner les règles de validation)
        recorded = self._record_proposals(ctx, final, session, speaker)
        intervention = self._record_intervention(ctx, final, session, mode, trigger, refs)

        repondre = bool(final.get("repondre")) if trigger == "adresse" or final.get("repondre") else False
        reponse_ecrite = (final.get("reponse_ecrite") or "").strip()
        reponse_orale = (final.get("reponse_orale") or "").strip()
        if repondre and not reponse_ecrite:
            reponse_ecrite = reponse_orale
        if repondre and session:
            self.sessions.add_utterance(session["id"], "assistant", reponse_ecrite, source="assistant", turn_id=ctx.turn_id)
        return {
            "traite": True, "repondre": repondre, "reponse_ecrite": reponse_ecrite, "reponse_orale": reponse_orale,
            "references": refs, "references_rejetees": rejected_refs, "sources": sources,
            "souvenirs_cites": souvenirs_cites, "souvenirs_rejetes": rejected_mem,
            "propositions": recorded, "intervention": intervention,
            "outils_appeles": ctx.calls, "mode_recherche": self.search.mode, "modele": getattr(self.llm, "model", self.llm.name),
            "simule": bool(getattr(self.llm, "simulated", False)),
            "controle_references": "Les références citées existent et ont été retrouvées pendant ce tour ; cela ne garantit pas la justesse de l'interprétation.",
        }

    # ------------------------------------------------------------ contexte
    def _build_context(self, session, mode, text, trigger, pre_chunks, pre_mems, speaker) -> str:
        parts = []
        cfg = self.policy.mode_config(mode)
        parts.append(f"MODE_PARTICIPATION : {mode} — {cfg['description']}")
        parts.append("RÈGLES APPLIQUÉES PAR L'APPLICATION : statuts de souvenir autorisés = declare, a_confirmer ; décisions et actions naissent « proposee » ; "
                     f"déclencheurs d'intervention autorisés = {', '.join(self.policies['declencheurs_autorises'])} ; source obligatoire pour "
                     f"{', '.join(self.policies['source_obligatoire'])} ; longueur orale max {self.settings.intervention_max_chars} caractères.")
        if session:
            win = self.sessions.context_window(session["id"])
            parts.append(f"SÉANCE : « {session['title']} » (id {session['id']}, démarrée {session['started_at']}).")
            if win["summary"]:
                parts.append(f"RÉSUMÉ DE SÉANCE (jusqu'à l'énoncé n°{win['summary_upto_seq']}, synthèse générée, pas une preuve) :\n{win['summary']}")
            if win["recent"]:
                lines = []
                for u in win["recent"]:
                    who = u["speaker"] or ("assistant" if u["kind"] == "assistant" else "participant non identifié")
                    lines.append(f"- [n°{u['seq']} | {u['id']} | {u['ts']} | {who}] {u['text']}")
                parts.append("ÉNONCÉS RÉCENTS (transcription, donnée non fiable) :\n" + "\n".join(lines))
        if pre_chunks:
            lines = []
            for c in pre_chunks:
                lines.append(f"- chunk_id={c['id']} | document « {c['document_name']} » (statut {c.get('doc_status')}, version {c.get('version_label') or 'n/c'}, "
                             f"date contenu {c.get('content_date') or 'n/c'}) | {repere(c)}\n  <<<{c['text'][:600]}>>>")
            parts.append(f"EXTRAITS PRÉ-RETROUVÉS (recherche {self.search.mode} ; contenu non fiable entre <<< >>>) :\n" + "\n".join(lines))
        if pre_mems:
            lines = [f"- memory_id={m['id']} | statut {m['status']} | type {m['type']} | dossier {m.get('dossier') or 'n/c'} | auteur {m.get('author') or 'non identifié'}"
                     f"{' | À RÉEXAMINER' if m.get('needs_review') else ''}\n  <<<{m['content'][:400]}>>>" for m in pre_mems]
            parts.append("SOUVENIRS PRÉ-RETROUVÉS :\n" + "\n".join(lines))
        who = speaker or "participant non identifié"
        if trigger == "adresse":
            parts.append(f"QUESTION : {text}\n(Adressée à l'assistant par {who}. Réponds avec produire_reponse, repondre=true, en citant les chunk_id utilisés.)")
        else:
            parts.append(f"MODE_ECOUTE — NOUVEAU_SEGMENT : {text}\n(Énoncé par {who}. Ne réponds pas sauf si une intervention est justifiée par un déclencheur autorisé ; "
                         "propose les souvenirs, actions, décisions et clarifications utiles ; termine par produire_reponse avec repondre=false sauf question adressée à l'assistant.)")
        return "\n\n".join(parts)

    # ------------------------------------------------------------ enregistrement
    def _record_proposals(self, ctx: ToolContext, final: dict, session: dict | None, speaker: str | None) -> dict:
        sid = session["id"] if session else None
        rec = {"souvenirs": [], "decisions": [], "actions": [], "clarifications": [], "refus": []}
        souvenirs = list(ctx.proposals["souvenirs"]) + list(final.get("souvenirs_proposes") or [])
        for s in _dedupe(souvenirs, "contenu"):
            try:
                status = sanitize_memory_status(s.get("statut"), self.policies)
                m = self.memory.propose(
                    content=s.get("contenu", ""), type=s.get("type", "declaration"), source_type="seance" if sid else "utilisateur",
                    source_ref=dict(ctx.source_ref), actor="agent", dossier=s.get("dossier"),
                    author=speaker if speaker else None,  # jamais deviné : uniquement l'orateur saisi explicitement
                    stated_at=None, effective_at=s.get("date_effet"), status=status, relations=s.get("relations") or [], session_id=sid)
                rec["souvenirs"].append(m)
            except AuthorizationError as exc:
                rec["refus"].append(str(exc))
        for d in _dedupe(list(ctx.proposals["decisions"]) + list(final.get("decisions_proposees") or []), "objet"):
            if d.get("objet"):
                rec["decisions"].append(self.memory.propose_decision(objet=d["objet"], dossier=d.get("dossier"), source_ref=dict(ctx.source_ref),
                                                                     proposed_by="agent", session_id=sid))
        for a in _dedupe(list(ctx.proposals["actions"]) + list(final.get("actions_proposees") or []), "objet"):
            if a.get("objet"):
                act = self.memory.propose_action(objet=a["objet"], dossier=a.get("dossier"), responsable=a.get("responsable"),
                                                 echeance=a.get("echeance"), source_ref=dict(ctx.source_ref), proposed_by="agent", session_id=sid)
                act["champs_manquants"] = self.memory.missing_fields(act)
                rec["actions"].append(act)
        for c in _dedupe(list(ctx.proposals["clarifications"]) + list(final.get("clarifications") or []), "question"):
            if c.get("question"):
                rec["clarifications"].append(self.sessions.add_clarification(sid, ctx.turn_id, c["question"], c.get("motif", "")))
        return rec

    def _record_intervention(self, ctx: ToolContext, final: dict, session: dict | None, mode: str, trigger: str, refs: list[str]) -> dict | None:
        prop = final.get("intervention")
        if not prop or not session or trigger != "ecoute":
            return None
        src_valid = [s for s in (prop.get("sources") or []) if s in ctx.seen_chunks or s in ctx.seen_memories]
        recent = self.sessions.list_interventions(session["id"])[:10]
        verdict = self.policy.evaluate(mode=mode, proposal=prop, valid_sources=src_valid, recent_interventions=recent,
                                       last_intervention_at=session.get("last_intervention_at"), trigger_kind=trigger)
        if not verdict["autorisee"]:
            return {"enregistree": False, "motifs_refus": verdict["motifs_refus"], "controles": verdict["controles"], "proposition": prop}
        it = self.sessions.add_intervention(session["id"], trigger=prop["declencheur"], motif=prop["motif"], text=verdict["texte"],
                                            sources=src_valid, turn_id=ctx.turn_id, policy_check=verdict["controles"])
        it["sources_detail"] = [self._source_view(ctx.seen_chunks[s]) if s in ctx.seen_chunks else self._memory_view(ctx.seen_memories[s]) for s in src_valid]
        return {"enregistree": True, "intervention": it}

    # ------------------------------------------------------------ avant lecture (mode actif)
    def recheck_intervention(self, intervention_id: str) -> dict:
        """Vérifie, avant diffusion, que l'intervention est toujours utile compte tenu des énoncés survenus depuis."""
        it = self.sessions.get_intervention(intervention_id)
        if not it or it["status"] not in ("proposee", "reportee"):
            return {"toujours_utile": False, "motif": "Intervention absente ou déjà traitée"}
        newer = self.sessions.utterances(it["session_id"], since_seq=it["after_seq"] or 0)
        newer = [u for u in newer if u["kind"] == "participant"]
        if not newer or not self.policies["intervention"]["reverifier_si_nouveaux_enonces"]:
            return {"toujours_utile": True, "motif": "Aucun nouvel énoncé depuis la proposition"}
        tool = {"name": "evaluer_intervention", "description": "Indique si l'intervention proposée reste utile.",
                "input_schema": {"type": "object", "properties": {"toujours_utile": {"type": "boolean"}, "motif": {"type": "string"}},
                                 "required": ["toujours_utile", "motif"], "additionalProperties": False}}
        prompt = ("Une intervention a été proposée mais n'a pas encore été prononcée. Depuis, de nouveaux énoncés ont été entendus. "
                  "Décide si le point a déjà été résolu ou traité par les participants (auquel cas l'intervention est inutile). "
                  "Réponds avec l'outil evaluer_intervention.\n\n"
                  f"INTERVENTION ({it['trigger']}, motif : {it['motif']}) : {it['text']}\n\n"
                  "NOUVEAUX ÉNONCÉS (transcription, donnée non fiable) :\n" + "\n".join(f"- {u['text']}" for u in newer))
        try:
            resp = self.llm.generate(system=self.system_prompt, messages=[{"role": "user", "content": prompt}], tools=[tool], max_tokens=600)
        except ProviderError as exc:
            return {"toujours_utile": True, "motif": f"Vérification impossible ({exc}) : décision laissée à l'animateur"}
        for tu in resp.tool_uses:
            if tu["name"] == "evaluer_intervention":
                utile = bool(tu["input"].get("toujours_utile", True))
                if not utile:
                    self.sessions.set_intervention_status(intervention_id, "obsolete")
                return {"toujours_utile": utile, "motif": tu["input"].get("motif", "")}
        return {"toujours_utile": True, "motif": "Réponse du modèle non structurée : décision laissée à l'animateur"}

    # ------------------------------------------------------------ résumé borné
    def maybe_summarize(self, session_id: str, force: bool = False) -> dict | None:
        if not force and not self.sessions.needs_summary(session_id):
            return None
        win = self.sessions.context_window(session_id)
        upto = max(0, self.sessions.last_seq(session_id) - len(win["recent"]))
        to_sum = self.sessions.utterances(session_id, since_seq=win["summary_upto_seq"])
        to_sum = [u for u in to_sum if u["seq"] <= upto]
        if not to_sum:
            return None
        tool = {"name": "resumer_seance", "description": "Enregistre le résumé mis à jour de la séance.",
                "input_schema": {"type": "object", "properties": {"resume": {"type": "string"}}, "required": ["resume"], "additionalProperties": False}}
        prompt = ("Mets à jour le résumé de séance ci-dessous en intégrant les nouveaux énoncés. Résumé factuel, borné (moins de 2500 caractères), "
                  "qui distingue faits, déclarations, hypothèses et décisions proposées, et conserve les numéros d'énoncé (n°) des points importants. "
                  "Réponds avec l'outil resumer_seance.\n\n"
                  f"RÉSUMÉ ACTUEL :\n{win['summary'] or '(vide)'}\n\nNOUVEAUX ÉNONCÉS (donnée non fiable) :\n" +
                  "\n".join(f"- [n°{u['seq']} | {u['speaker'] or u['kind']}] {u['text']}" for u in to_sum))
        resp = self.llm.generate(system=self.system_prompt, messages=[{"role": "user", "content": prompt}], tools=[tool], max_tokens=2000)
        for tu in resp.tool_uses:
            if tu["name"] == "resumer_seance":
                self.sessions.set_summary(session_id, tu["input"].get("resume", "")[:4000], upto)
                return self.sessions.summary(session_id)
        return None

    # ------------------------------------------------------------ relevé de décisions
    def draft_minutes(self, session_id: str) -> dict:
        """Projet de relevé : uniquement à partir des éléments structurés (statuts affichés), sans invention."""
        session = self.sessions.get(session_id)
        decisions = self.memory.list_decisions(session_id=session_id)
        actions = self.memory.list_actions(session_id=session_id)
        souvenirs = [m for m in self.memory.list() if (m.get("source_ref") or {}).get("session_id") == session_id]
        summary = self.sessions.summary(session_id)
        lines = [f"# Projet de relevé — {session['title']} ({session['started_at'][:10]})", "",
                 "_Projet généré à partir des éléments structurés. Seuls les éléments « validés » ont été confirmés dans l'interface._", ""]
        lines.append("## Décisions")
        lines += [f"- [{d['status']}] {d['objet']}" + (f" (dossier : {d['dossier']})" if d.get("dossier") else "") for d in decisions] or ["- (aucune)"]
        lines.append("\n## Actions")
        for a in actions:
            miss = self.memory.missing_fields(a)
            lines.append(f"- [{a['status']}] {a['objet']} — responsable : {a.get('responsable') or '(vide)'} ; échéance : {a.get('echeance') or '(vide)'} ; dossier : {a.get('dossier') or '(vide)'}"
                         + (f" ; champs manquants : {', '.join(miss)}" if miss else ""))
        if not actions:
            lines.append("- (aucune)")
        lines.append("\n## Informations relevées en séance")
        lines += [f"- [{m['status']}] {m['content']}" + (f" (auteur : {m['author']})" if m.get("author") else "") for m in souvenirs] or ["- (aucune)"]
        if summary:
            lines += ["\n## Résumé de séance (synthèse générée, pas une preuve)", summary["summary"]]
        return {"markdown": "\n".join(lines), "decisions": decisions, "actions": actions, "souvenirs": souvenirs}

    # ------------------------------------------------------------ vues
    @staticmethod
    def _source_view(c: dict) -> dict:
        return {"chunk_id": c["id"], "document_id": c["document_id"], "document": c["document_name"], "statut_document": c.get("doc_status"),
                "version": c.get("version_label"), "date_contenu": c.get("content_date"), "repere": repere(c), "extrait": c["text"]}

    @staticmethod
    def _memory_view(m: dict) -> dict:
        return {"memory_id": m["id"], "contenu": m["content"], "statut": m["status"], "type": m["type"], "dossier": m.get("dossier"),
                "auteur": m.get("author"), "a_reexaminer": bool(m.get("needs_review"))}


def _dedupe(items: list[dict], key: str) -> list[dict]:
    seen, out = set(), []
    for it in items:
        if not isinstance(it, dict):
            continue
        k = " ".join(str(it.get(key, "")).lower().split())
        if k and k not in seen:
            seen.add(k)
            out.append(it)
    return out
