"""Recherche lexicale (FTS5) combinée à une recherche sémantique optionnelle."""
from __future__ import annotations

import math
import re

from .db import Database
from .documents import unpack


def fts_query(q: str) -> str:
    """Construit une requête FTS5 tolérante : termes préfixés, reliés par OR."""
    terms = [t for t in re.findall(r"[\w'’-]+", q.lower(), flags=re.UNICODE) if len(t) > 2]
    stop = {"les", "des", "une", "est", "que", "qui", "pour", "dans", "sur", "avec", "pas", "par", "aux", "nous", "vous",
            "quel", "quelle", "quels", "quelles", "sont", "cette", "comment", "combien", "elle", "ils", "elles"}
    terms = [t.replace("'", "").replace("’", "") for t in terms if t not in stop]
    if not terms:
        return ""
    return " OR ".join(f'"{t}"*' for t in terms[:12])


class SearchEngine:
    def __init__(self, db: Database, embedder=None):
        self.db = db
        self.embedder = embedder

    @property
    def mode(self) -> str:
        return "lexicale + sémantique" if self.embedder is not None else "lexicale"

    def search_chunks(self, query: str, k: int = 6) -> list[dict]:
        lexical = self._lexical(query, k * 2)
        semantic = self._semantic(query, k * 2) if self.embedder is not None else []
        return self._fuse(lexical, semantic, k)

    def _lexical(self, query: str, k: int) -> list[dict]:
        fq = fts_query(query)
        if not fq:
            return []
        rows = self.db.query(
            """SELECT c.id, c.document_id, c.section, c.page, c.paragraph_ref, c.text, d.name AS document_name,
                      d.doc_status, d.version_label, d.content_date, bm25(chunks_fts) AS score
               FROM chunks_fts f JOIN chunks c ON c.id = f.chunk_id JOIN documents d ON d.id = c.document_id
               WHERE chunks_fts MATCH ? AND d.deleted_at IS NULL
               ORDER BY score LIMIT ?""",
            (fq, k),
        )
        for i, r in enumerate(rows):
            r["rank_lex"] = i + 1
        return rows

    def _semantic(self, query: str, k: int) -> list[dict]:
        try:
            qv = self.embedder.embed([query])[0]
        except Exception:
            return []
        rows = self.db.query(
            """SELECT c.id, c.document_id, c.section, c.page, c.paragraph_ref, c.text, c.embedding, d.name AS document_name,
                      d.doc_status, d.version_label, d.content_date
               FROM chunks c JOIN documents d ON d.id = c.document_id
               WHERE c.embedding IS NOT NULL AND d.deleted_at IS NULL"""
        )
        scored = []
        for r in rows:
            v = unpack(r.pop("embedding"))
            r["score_sem"] = _cosine(qv, v)
            scored.append(r)
        scored.sort(key=lambda r: -r["score_sem"])
        out = scored[:k]
        for i, r in enumerate(out):
            r["rank_sem"] = i + 1
        return out

    @staticmethod
    def _fuse(lex: list[dict], sem: list[dict], k: int) -> list[dict]:
        # Reciprocal rank fusion
        merged: dict[str, dict] = {}
        for r in lex:
            merged.setdefault(r["id"], dict(r))["rrf"] = merged.get(r["id"], {}).get("rrf", 0) + 1 / (60 + r["rank_lex"])
        for r in sem:
            m = merged.setdefault(r["id"], dict(r))
            m["rrf"] = m.get("rrf", 0) + 1 / (60 + r["rank_sem"])
        out = sorted(merged.values(), key=lambda r: -r["rrf"])[:k]
        for r in out:
            r.pop("score", None)
            r.pop("score_sem", None)
        return out

    def get_chunk(self, chunk_id: str) -> dict | None:
        return self.db.one(
            """SELECT c.id, c.document_id, c.ordinal, c.section, c.page, c.paragraph_ref, c.text, d.name AS document_name,
                      d.doc_status, d.version_label, d.content_date
               FROM chunks c JOIN documents d ON d.id = c.document_id WHERE c.id = ? AND d.deleted_at IS NULL""",
            (chunk_id,),
        )

    def search_memories(self, query: str, dossier: str | None = None, k: int = 8) -> list[dict]:
        fq = fts_query(query)
        if fq:
            rows = self.db.query(
                """SELECT m.* FROM memories_fts f JOIN memories m ON m.id = f.memory_id
                   WHERE memories_fts MATCH ? AND m.deleted_at IS NULL ORDER BY bm25(memories_fts) LIMIT ?""",
                (fq, k),
            )
        else:
            rows = self.db.query("SELECT * FROM memories WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?", (k,))
        if dossier:
            rows = [r for r in rows if (r.get("dossier") or "").lower() == dossier.lower()] or rows
        return rows


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0
