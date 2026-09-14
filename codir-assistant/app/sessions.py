"""Séances : transcription, énoncés, résumé borné, tours et interventions."""
from __future__ import annotations

import json

from .config import MODES
from .db import Database, new_id, now_iso

RECENT_WINDOW = 14          # énoncés récents envoyés intégralement au modèle
SUMMARY_TRIGGER = 30        # énoncés non résumés avant de rafraîchir le résumé
INTERVENTION_STATUSES = ("proposee", "lue", "rejetee", "reportee", "obsolete")


class SessionStore:
    def __init__(self, db: Database):
        self.db = db

    # ---- séances
    def start(self, title: str, mode: str) -> dict:
        if mode not in MODES:
            mode = "codir_assiste"
        for s in self.db.query("SELECT id FROM sessions WHERE status = 'active'"):
            self.close(s["id"])
        sid = new_id("ses")
        self.db.execute("INSERT INTO sessions(id, title, mode, status, started_at) VALUES (?,?,?,?,?)",
                        (sid, title.strip() or "Séance", mode, "active", now_iso()))
        return self.get(sid)

    def get(self, sid: str) -> dict | None:
        return self.db.one("SELECT * FROM sessions WHERE id = ?", (sid,))

    def active(self) -> dict | None:
        return self.db.one("SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1")

    def list(self) -> list[dict]:
        return self.db.query("SELECT * FROM sessions ORDER BY started_at DESC")

    def close(self, sid: str) -> dict | None:
        self.db.execute("UPDATE sessions SET status = 'closed', ended_at = ? WHERE id = ? AND status = 'active'", (now_iso(), sid))
        self.db.execute("UPDATE interventions SET status = 'obsolete' WHERE session_id = ? AND status IN ('proposee','reportee')", (sid,))
        return self.get(sid)

    def set_mode(self, sid: str, mode: str) -> dict | None:
        if mode not in MODES:
            raise ValueError("Mode inconnu")
        self.db.execute("UPDATE sessions SET mode = ? WHERE id = ?", (mode, sid))
        return self.get(sid)

    # ---- énoncés
    def add_utterance(self, sid: str, kind: str, text: str, source: str = "micro", speaker: str | None = None,
                      turn_id: str | None = None) -> dict:
        seq = (self.db.one("SELECT COALESCE(MAX(seq), 0) AS m FROM utterances WHERE session_id = ?", (sid,))["m"] or 0) + 1
        uid = new_id("utt")
        self.db.execute(
            "INSERT INTO utterances(id, session_id, seq, ts, kind, speaker, text, source, turn_id) VALUES (?,?,?,?,?,?,?,?,?)",
            (uid, sid, seq, now_iso(), kind, speaker, text.strip(), source, turn_id),
        )
        return self.db.one("SELECT * FROM utterances WHERE id = ?", (uid,))

    def utterances(self, sid: str, since_seq: int = 0, limit: int | None = None) -> list[dict]:
        sql = "SELECT * FROM utterances WHERE session_id = ? AND seq > ? ORDER BY seq"
        params: list = [sid, since_seq]
        if limit:
            sql += " LIMIT ?"; params.append(limit)
        return self.db.query(sql, params)

    def get_utterance(self, uid: str) -> dict | None:
        return self.db.one("SELECT * FROM utterances WHERE id = ?", (uid,))

    def last_seq(self, sid: str) -> int:
        return self.db.one("SELECT COALESCE(MAX(seq), 0) AS m FROM utterances WHERE session_id = ?", (sid,))["m"] or 0

    def is_duplicate(self, sid: str, text: str, window: int = 3) -> bool:
        """Évite la double ingestion d'un même segment (rejeu réseau, double clic)."""
        recent = self.db.query("SELECT text FROM utterances WHERE session_id = ? AND kind = 'participant' ORDER BY seq DESC LIMIT ?",
                               (sid, window))
        norm = " ".join(text.lower().split())
        return any(" ".join(r["text"].lower().split()) == norm for r in recent)

    # ---- résumé borné
    def summary(self, sid: str) -> dict | None:
        return self.db.one("SELECT * FROM session_summaries WHERE session_id = ?", (sid,))

    def set_summary(self, sid: str, summary: str, upto_seq: int) -> None:
        self.db.execute(
            """INSERT INTO session_summaries(session_id, summary, upto_seq, updated_at) VALUES (?,?,?,?)
               ON CONFLICT(session_id) DO UPDATE SET summary = excluded.summary, upto_seq = excluded.upto_seq, updated_at = excluded.updated_at""",
            (sid, summary, upto_seq, now_iso()),
        )

    def needs_summary(self, sid: str) -> bool:
        s = self.summary(sid)
        upto = s["upto_seq"] if s else 0
        return self.last_seq(sid) - upto - RECENT_WINDOW >= SUMMARY_TRIGGER

    def context_window(self, sid: str) -> dict:
        """Résumé + énoncés récents (borné) ; les énoncés plus anciens restent consultables par id."""
        s = self.summary(sid)
        last = self.last_seq(sid)
        recent = self.utterances(sid, since_seq=max(0, last - RECENT_WINDOW))
        return {"summary": s["summary"] if s else "", "summary_upto_seq": s["upto_seq"] if s else 0, "recent": recent,
                "unsummarized_from": (s["upto_seq"] if s else 0) + 1, "recent_from": max(0, last - RECENT_WINDOW) + 1}

    # ---- tours
    def create_turn(self, sid: str | None, trigger: str, input_text: str, search_mode: str) -> str:
        tid = new_id("turn")
        self.db.execute("INSERT INTO turns(id, session_id, ts, trigger, input_text, status, search_mode) VALUES (?,?,?,?,?,?,?)",
                        (tid, sid, now_iso(), trigger, input_text, "en_cours", search_mode))
        return tid

    def finish_turn(self, tid: str, status: str, result: dict | None = None, error: str | None = None) -> None:
        self.db.execute("UPDATE turns SET status = ?, result_json = ?, error = ? WHERE id = ?",
                        (status, json.dumps(result, ensure_ascii=False) if result is not None else None, error, tid))

    def get_turn(self, tid: str) -> dict | None:
        row = self.db.one("SELECT * FROM turns WHERE id = ?", (tid,))
        if row and row.get("result_json"):
            row["result"] = json.loads(row["result_json"])
        return row

    # ---- interventions
    def add_intervention(self, sid: str, *, trigger: str, motif: str, text: str, sources: list[str], turn_id: str | None,
                         policy_check: dict, status: str = "proposee") -> dict:
        iid = new_id("int")
        self.db.execute(
            """INSERT INTO interventions(id, session_id, turn_id, ts, trigger, motif, text, sources, status, policy_check, after_seq)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (iid, sid, turn_id, now_iso(), trigger, motif, text, json.dumps(sources, ensure_ascii=False), status,
             json.dumps(policy_check, ensure_ascii=False), self.last_seq(sid)),
        )
        return self.get_intervention(iid)

    def get_intervention(self, iid: str) -> dict | None:
        row = self.db.one("SELECT * FROM interventions WHERE id = ?", (iid,))
        if row:
            row["sources"] = json.loads(row["sources"] or "[]")
            row["policy_check"] = json.loads(row["policy_check"] or "{}")
        return row

    def list_interventions(self, sid: str, status: str | None = None) -> list[dict]:
        sql, params = "SELECT id FROM interventions WHERE session_id = ?", [sid]
        if status:
            sql += " AND status = ?"; params.append(status)
        return [self.get_intervention(r["id"]) for r in self.db.query(sql + " ORDER BY ts DESC", params)]

    def set_intervention_status(self, iid: str, status: str, spoken: bool = False) -> dict | None:
        if status not in INTERVENTION_STATUSES:
            raise ValueError("Statut invalide")
        self.db.execute("UPDATE interventions SET status = ?, spoken_at = COALESCE(spoken_at, ?) WHERE id = ?",
                        (status, now_iso() if spoken else None, iid))
        if spoken:
            row = self.get_intervention(iid)
            self.db.execute("UPDATE sessions SET last_intervention_at = ? WHERE id = ?", (now_iso(), row["session_id"]))
        return self.get_intervention(iid)

    # ---- clarifications
    def add_clarification(self, sid: str | None, turn_id: str | None, question: str, reason: str) -> dict:
        cid = new_id("clar")
        self.db.execute("INSERT INTO clarifications(id, session_id, turn_id, ts, question, reason, status) VALUES (?,?,?,?,?,?,?)",
                        (cid, sid, turn_id, now_iso(), question, reason, "ouverte"))
        return self.db.one("SELECT * FROM clarifications WHERE id = ?", (cid,))

    def list_clarifications(self, sid: str, status: str | None = None) -> list[dict]:
        sql, params = "SELECT * FROM clarifications WHERE session_id = ?", [sid]
        if status:
            sql += " AND status = ?"; params.append(status)
        return self.db.query(sql + " ORDER BY ts DESC", params)

    def answer_clarification(self, cid: str, answer: str | None, status: str) -> dict | None:
        self.db.execute("UPDATE clarifications SET answer = ?, status = ? WHERE id = ?", (answer, status, cid))
        return self.db.one("SELECT * FROM clarifications WHERE id = ?", (cid,))
