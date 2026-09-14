"""Mémoire persistante : souvenirs métier, décisions et actions.

Règles imposées dans le code (indépendamment du prompt) :
- L'agent ne peut proposer qu'en statut `declare` ou `a_confirmer` ; `valide` est réservé à
  l'interface (acteur `utilisateur`).
- Une contradiction crée un nouvel élément relié (`contredit`) sans écraser l'ancien.
- Un remplacement conserve l'ancien élément en statut `remplace` avec la relation.
- Toute correction humaine est historisée dans memory_history.
- Décisions et actions naissent toujours en `proposee`.
"""
from __future__ import annotations

import json

from .db import Database, new_id, now_iso

MEMORY_TYPES = ("fait", "declaration", "hypothese", "engagement", "synthese", "correction")
MEMORY_STATUSES = ("declare", "a_confirmer", "valide", "conteste", "remplace")
AGENT_ALLOWED_STATUSES = ("declare", "a_confirmer")
RELATION_TYPES = ("contredit", "remplace", "precise", "complete")
DECISION_STATUSES = ("proposee", "validee", "rejetee")
ACTION_STATUSES = ("proposee", "validee", "rejetee", "en_cours", "terminee")


class AuthorizationError(Exception):
    """Levée quand un acteur tente une opération qui ne lui est pas permise."""


class MemoryStore:
    def __init__(self, db: Database):
        self.db = db

    # ------------------------------------------------------------ souvenirs
    def propose(self, *, content: str, type: str, source_type: str, source_ref: dict, actor: str,
                dossier: str | None = None, author: str | None = None, stated_at: str | None = None,
                effective_at: str | None = None, status: str = "declare", relations: list[dict] | None = None,
                session_id: str | None = None) -> dict:
        if type not in MEMORY_TYPES:
            type = "declaration"
        if type == "hypothese":
            status = "a_confirmer"  # une hypothèse reste une hypothèse
        if type == "synthese":
            status = "a_confirmer"  # une synthèse générée n'est jamais une preuve autonome
        if actor == "agent" and status not in AGENT_ALLOWED_STATUSES:
            raise AuthorizationError("L'agent ne peut pas créer un souvenir validé : statut réservé à l'interface")
        if status not in MEMORY_STATUSES:
            status = "declare"
        relations = [r for r in (relations or []) if r.get("type") in RELATION_TYPES and r.get("memory_id")]
        # vérification des relations : les cibles doivent exister
        relations = [r for r in relations if self.get(r["memory_id"])]
        if session_id and "session_id" not in source_ref:
            source_ref = dict(source_ref, session_id=session_id)
        mid = new_id("mem")
        ts = now_iso()
        self.db.execute(
            """INSERT INTO memories(id, content, dossier, type, source_type, source_ref, author, stated_at, effective_at,
               status, relations, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (mid, content.strip(), dossier, type, source_type, json.dumps(source_ref, ensure_ascii=False), author,
             stated_at, effective_at, status, json.dumps(relations, ensure_ascii=False), ts, ts),
        )
        self.db.execute("INSERT INTO memories_fts(content, dossier, memory_id) VALUES (?,?,?)", (content, dossier or "", mid))
        for rel in relations:
            if rel["type"] == "contredit":
                # l'élément antérieur devient contesté, il n'est pas effacé
                self._set_status(rel["memory_id"], "conteste", actor, motif=f"Contredit par {mid}")
            elif rel["type"] == "remplace":
                self._set_status(rel["memory_id"], "remplace", actor, motif=f"Remplacé par {mid}")
        self._history(mid, actor, {"creation": True, "status": status, "type": type})
        return self.get(mid)

    def get(self, mid: str) -> dict | None:
        row = self.db.one("SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL", (mid,))
        return _inflate(row) if row else None

    def list(self, status: str | None = None, dossier: str | None = None, needs_review: bool | None = None) -> list[dict]:
        sql, params = "SELECT * FROM memories WHERE deleted_at IS NULL", []
        if status:
            sql += " AND status = ?"; params.append(status)
        if dossier:
            sql += " AND dossier = ?"; params.append(dossier)
        if needs_review is not None:
            sql += " AND needs_review = ?"; params.append(1 if needs_review else 0)
        return [_inflate(r) for r in self.db.query(sql + " ORDER BY updated_at DESC", params)]

    def set_status(self, mid: str, status: str, actor: str, motif: str | None = None) -> dict:
        if status not in MEMORY_STATUSES:
            raise ValueError("Statut invalide")
        if actor != "utilisateur" and status not in AGENT_ALLOWED_STATUSES:
            raise AuthorizationError("Seule une validation explicite dans l'interface peut changer ce statut")
        self._set_status(mid, status, actor, motif)
        return self.get(mid)

    def _set_status(self, mid: str, status: str, actor: str, motif: str | None = None) -> None:
        before = self.get(mid)
        if not before:
            return
        self.db.execute("UPDATE memories SET status = ?, needs_review = 0, review_reason = NULL, updated_at = ? WHERE id = ?",
                        (status, now_iso(), mid))
        self._history(mid, actor, {"avant": {"status": before["status"]}, "apres": {"status": status}, "motif": motif})

    def correct(self, mid: str, actor: str, *, content: str | None = None, dossier: str | None = None,
                author: str | None = None, effective_at: str | None = None, motif: str | None = None) -> dict:
        if actor != "utilisateur":
            raise AuthorizationError("Seul l'utilisateur peut corriger un souvenir")
        before = self.get(mid)
        if not before:
            raise KeyError(mid)
        fields, params, avant, apres = [], [], {}, {}
        for col, val in (("content", content), ("dossier", dossier), ("author", author), ("effective_at", effective_at)):
            if val is not None and val != before.get(col):
                fields.append(f"{col} = ?"); params.append(val); avant[col] = before.get(col); apres[col] = val
        if fields:
            fields.append("updated_at = ?"); params.append(now_iso())
            fields.append("needs_review = 0"); fields.append("review_reason = NULL")
            self.db.execute(f"UPDATE memories SET {', '.join(fields)} WHERE id = ?", params + [mid])
            if "content" in apres or "dossier" in apres:
                self.db.execute("DELETE FROM memories_fts WHERE memory_id = ?", (mid,))
                after = self.get(mid)
                self.db.execute("INSERT INTO memories_fts(content, dossier, memory_id) VALUES (?,?,?)",
                                (after["content"], after["dossier"] or "", mid))
            self._history(mid, actor, {"avant": avant, "apres": apres, "motif": motif or "Correction humaine"})
        return self.get(mid)

    def delete(self, mid: str, actor: str, motif: str | None = None) -> None:
        if actor != "utilisateur":
            raise AuthorizationError("Seul l'utilisateur peut supprimer un souvenir")
        self.db.execute("UPDATE memories SET deleted_at = ?, updated_at = ? WHERE id = ?", (now_iso(), now_iso(), mid))
        self.db.execute("DELETE FROM memories_fts WHERE memory_id = ?", (mid,))
        self._history(mid, actor, {"suppression": True, "motif": motif})

    def history(self, mid: str) -> list[dict]:
        rows = self.db.query("SELECT * FROM memory_history WHERE memory_id = ? ORDER BY ts", (mid,))
        for r in rows:
            r["change"] = json.loads(r["change"])
        return rows

    def _history(self, mid: str, actor: str, change: dict) -> None:
        self.db.execute("INSERT INTO memory_history(id, memory_id, ts, actor, change) VALUES (?,?,?,?,?)",
                        (new_id("hist"), mid, now_iso(), actor, json.dumps(change, ensure_ascii=False)))

    # ------------------------------------------------------------ décisions
    def propose_decision(self, *, objet: str, source_ref: dict, proposed_by: str, dossier: str | None = None,
                         session_id: str | None = None, status: str = "proposee") -> dict:
        if proposed_by == "agent" and status != "proposee":
            raise AuthorizationError("L'agent ne peut pas valider une décision")
        if status != "proposee":
            status = "proposee"  # toute décision naît proposée, même saisie par l'utilisateur
        did, ts = new_id("dec"), now_iso()
        self.db.execute(
            """INSERT INTO decisions(id, session_id, objet, dossier, status, source_ref, proposed_by, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (did, session_id, objet.strip(), dossier, status, json.dumps(source_ref, ensure_ascii=False), proposed_by, ts, ts),
        )
        return self.get_decision(did)

    def get_decision(self, did: str) -> dict | None:
        row = self.db.one("SELECT * FROM decisions WHERE id = ?", (did,))
        return _inflate(row) if row else None

    def list_decisions(self, session_id: str | None = None, status: str | None = None) -> list[dict]:
        sql, params = "SELECT * FROM decisions WHERE 1=1", []
        if session_id:
            sql += " AND session_id = ?"; params.append(session_id)
        if status:
            sql += " AND status = ?"; params.append(status)
        return [_inflate(r) for r in self.db.query(sql + " ORDER BY created_at DESC", params)]

    def set_decision_status(self, did: str, status: str, actor: str) -> dict:
        if actor != "utilisateur":
            raise AuthorizationError("Seule une validation explicite dans l'interface peut changer le statut d'une décision")
        if status not in DECISION_STATUSES:
            raise ValueError("Statut invalide")
        validated = now_iso() if status == "validee" else None
        self.db.execute("UPDATE decisions SET status = ?, validated_at = ?, updated_at = ? WHERE id = ?",
                        (status, validated, now_iso(), did))
        return self.get_decision(did)

    def update_decision(self, did: str, actor: str, objet: str | None = None, dossier: str | None = None) -> dict:
        if actor != "utilisateur":
            raise AuthorizationError("Seul l'utilisateur peut modifier une décision")
        if objet is not None:
            self.db.execute("UPDATE decisions SET objet = ?, updated_at = ? WHERE id = ?", (objet, now_iso(), did))
        if dossier is not None:
            self.db.execute("UPDATE decisions SET dossier = ?, updated_at = ? WHERE id = ?", (dossier or None, now_iso(), did))
        return self.get_decision(did)

    # ------------------------------------------------------------ actions
    def propose_action(self, *, objet: str, source_ref: dict, proposed_by: str, dossier: str | None = None,
                       responsable: str | None = None, echeance: str | None = None, session_id: str | None = None,
                       status: str = "proposee") -> dict:
        if proposed_by == "agent" and status != "proposee":
            raise AuthorizationError("L'agent ne peut pas valider une action")
        status = "proposee"
        aid, ts = new_id("act"), now_iso()
        self.db.execute(
            """INSERT INTO actions(id, session_id, objet, dossier, responsable, echeance, status, source_ref, proposed_by,
               created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (aid, session_id, objet.strip(), dossier, responsable or None, echeance or None, status,
             json.dumps(source_ref, ensure_ascii=False), proposed_by, ts, ts),
        )
        return self.get_action(aid)

    def get_action(self, aid: str) -> dict | None:
        row = self.db.one("SELECT * FROM actions WHERE id = ?", (aid,))
        return _inflate(row) if row else None

    def list_actions(self, session_id: str | None = None, status: str | None = None, dossier: str | None = None) -> list[dict]:
        sql, params = "SELECT * FROM actions WHERE 1=1", []
        if session_id:
            sql += " AND session_id = ?"; params.append(session_id)
        if status:
            sql += " AND status = ?"; params.append(status)
        if dossier:
            sql += " AND dossier = ?"; params.append(dossier)
        return [_inflate(r) for r in self.db.query(sql + " ORDER BY created_at DESC", params)]

    def update_action(self, aid: str, actor: str, **fields) -> dict:
        if actor != "utilisateur":
            raise AuthorizationError("Seul l'utilisateur peut modifier ou valider une action")
        allowed = {"objet", "dossier", "responsable", "echeance", "status"}
        sets, params = [], []
        for k, v in fields.items():
            if k not in allowed or v is None:
                continue
            if k == "status":
                if v not in ACTION_STATUSES:
                    raise ValueError("Statut invalide")
                if v == "validee":
                    sets.append("validated_at = ?"); params.append(now_iso())
            sets.append(f"{k} = ?"); params.append(v if v != "" else None)
        if sets:
            sets.append("updated_at = ?"); params.append(now_iso())
            self.db.execute(f"UPDATE actions SET {', '.join(sets)} WHERE id = ?", params + [aid])
        return self.get_action(aid)

    def missing_fields(self, action: dict) -> list[str]:
        return [f for f in ("responsable", "echeance", "dossier") if not action.get(f)]


def _inflate(row: dict) -> dict:
    row = dict(row)
    for key in ("source_ref", "relations"):
        if key in row and isinstance(row[key], str):
            try:
                row[key] = json.loads(row[key])
            except json.JSONDecodeError:
                pass
    return row
