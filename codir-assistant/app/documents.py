"""Ingestion documentaire : parcours du répertoire, extraction, découpage, indexation.

Règles appliquées ici (et non seulement dans le prompt) :
- Une ingestion n'est annoncée réussie que si du texte exploitable a été extrait.
- Les PDF sans couche texte sont marqués `ocr_requis`, les formats inconnus `non_supporte`.
- Un DOCX n'a pas de numéro de page : repères = titre de section + plage de paragraphes.
- Un document modifié (empreinte différente) est réindexé ; un document disparu est marqué
  `supprime`, ses extraits sont retirés de la recherche active et les souvenirs qui en
  dépendent sont signalés pour réexamen.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .db import Database, new_id, now_iso

SUPPORTED = {".docx": "docx", ".pdf": "pdf", ".txt": "txt", ".md": "md"}
DOC_STATUSES = ("reference_validee", "document_de_travail", "archive", "inconnu")
CHUNK_TARGET = 1200  # caractères visés par extrait
CHUNK_MIN = 200


@dataclass
class Segment:
    text: str
    section: str | None = None
    page: int | None = None
    paragraph_index: int | None = None


@dataclass
class Extraction:
    segments: list[Segment] = field(default_factory=list)
    state: str = "indexe"  # indexe | vide | ocr_requis | non_supporte | erreur
    error: str | None = None


# ---------------------------------------------------------------- extraction

def extract_docx(path: Path) -> Extraction:
    import docx  # python-docx

    d = docx.Document(str(path))
    segs: list[Segment] = []
    section = None
    idx = 0
    for p in d.paragraphs:
        idx += 1
        txt = p.text.strip()
        if not txt:
            continue
        style = (p.style.name or "") if p.style is not None else ""
        if style.lower().startswith(("heading", "titre")) or style.lower() == "title":
            section = txt
            segs.append(Segment(text=txt, section=section, paragraph_index=idx))
            continue
        segs.append(Segment(text=txt, section=section, paragraph_index=idx))
    for t_i, table in enumerate(d.tables, start=1):
        rows = []
        for row in table.rows:
            cells = [c.text.strip().replace("\n", " ") for c in row.cells]
            if any(cells):
                rows.append(" | ".join(cells))
        if rows:
            idx += 1
            segs.append(Segment(text=f"[Tableau {t_i}]\n" + "\n".join(rows), section=section, paragraph_index=idx))
    if not any(s.text.strip() for s in segs):
        return Extraction(state="vide", error="Aucun texte extrait du DOCX")
    return Extraction(segments=segs)


def extract_pdf(path: Path) -> Extraction:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    segs: list[Segment] = []
    total_chars = 0
    for page_no, page in enumerate(reader.pages, start=1):
        try:
            txt = page.extract_text() or ""
        except Exception as exc:  # page illisible
            txt = ""
            if page_no == 1:
                return Extraction(state="erreur", error=f"Extraction PDF impossible : {exc}")
        txt = txt.strip()
        total_chars += len(txt)
        for para in re.split(r"\n\s*\n", txt):
            para = para.strip()
            if para:
                segs.append(Segment(text=para, page=page_no))
    pages = max(len(reader.pages), 1)
    if total_chars < 20 * pages:  # quasi aucun texte : PDF image
        return Extraction(state="ocr_requis", error="PDF sans couche texte exploitable : OCR nécessaire")
    return Extraction(segments=segs)


def extract_text_like(path: Path, fmt: str) -> Extraction:
    raw = path.read_text(encoding="utf-8", errors="replace")
    segs: list[Segment] = []
    section = None
    for idx, block in enumerate(re.split(r"\n\s*\n", raw), start=1):
        block = block.strip()
        if not block:
            continue
        if fmt == "md":
            m = re.match(r"^(#{1,6})\s+(.*)$", block.splitlines()[0])
            if m:
                section = m.group(2).strip()
                block = "\n".join([section] + block.splitlines()[1:]).strip()  # titre sans marqueurs Markdown
        segs.append(Segment(text=block, section=section, paragraph_index=idx))
    if not segs:
        return Extraction(state="vide", error="Fichier texte vide")
    return Extraction(segments=segs)


def extract(path: Path) -> tuple[str, Extraction]:
    fmt = SUPPORTED.get(path.suffix.lower())
    if fmt is None:
        return "autre", Extraction(state="non_supporte", error=f"Format non pris en charge : {path.suffix}")
    try:
        if fmt == "docx":
            return fmt, extract_docx(path)
        if fmt == "pdf":
            return fmt, extract_pdf(path)
        return fmt, extract_text_like(path, fmt)
    except Exception as exc:
        return fmt, Extraction(state="erreur", error=f"{type(exc).__name__}: {exc}")


# ---------------------------------------------------------------- découpage

def chunk_segments(segments: list[Segment]) -> list[dict]:
    """Regroupe les paragraphes en extraits ~CHUNK_TARGET caractères sans mélanger sections/pages."""
    chunks: list[dict] = []
    buf: list[Segment] = []
    size = 0

    def flush():
        nonlocal buf, size
        if not buf:
            return
        text = "\n".join(s.text for s in buf)
        pages = {s.page for s in buf if s.page is not None}
        paras = [s.paragraph_index for s in buf if s.paragraph_index is not None]
        para_ref = None
        if paras:
            para_ref = f"§{min(paras)}" if min(paras) == max(paras) else f"§{min(paras)}-{max(paras)}"
        chunks.append({
            "text": text,
            "section": buf[0].section,
            "page": min(pages) if pages else None,
            "paragraph_ref": para_ref,
        })
        buf, size = [], 0

    for seg in segments:
        # ne pas mélanger deux sections ou deux pages dans un extrait
        if buf and (seg.section != buf[-1].section or seg.page != buf[-1].page) and size >= 60:
            flush()
        if size + len(seg.text) > CHUNK_TARGET and buf:
            flush()
        if len(seg.text) > CHUNK_TARGET * 2:
            # paragraphe très long : découpe par phrases
            for piece in re.findall(r".{1," + str(CHUNK_TARGET) + r"}(?:\s|$)", seg.text, flags=re.S):
                piece = piece.strip()
                if piece:
                    buf.append(Segment(piece, seg.section, seg.page, seg.paragraph_index))
                    size += len(piece)
                    flush()
            continue
        buf.append(seg)
        size += len(seg.text)
    flush()
    return chunks


# ---------------------------------------------------------------- indexation

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 16), b""):
            h.update(block)
    return h.hexdigest()


def stable_doc_id(rel_path: str) -> str:
    return "doc_" + hashlib.sha1(rel_path.encode("utf-8")).hexdigest()[:12]


class DocumentStore:
    def __init__(self, db: Database, docs_dir: Path, embedder=None):
        self.db = db
        self.docs_dir = docs_dir
        self.embedder = embedder  # optionnel : objet avec .embed(list[str]) -> list[list[float]]

    # ---- lecture
    def list_documents(self, include_deleted: bool = True) -> list[dict]:
        sql = "SELECT * FROM documents"
        if not include_deleted:
            sql += " WHERE deleted_at IS NULL"
        return self.db.query(sql + " ORDER BY name")

    def get(self, doc_id: str) -> dict | None:
        return self.db.one("SELECT * FROM documents WHERE id = ?", (doc_id,))

    def chunks_of(self, doc_id: str) -> list[dict]:
        return self.db.query(
            "SELECT id, document_id, ordinal, section, page, paragraph_ref, text FROM chunks WHERE document_id = ? ORDER BY ordinal",
            (doc_id,),
        )

    # ---- métadonnées saisies par l'utilisateur (jamais inventées)
    def update_metadata(self, doc_id: str, doc_status: str | None = None, version_label: str | None = None,
                        content_date: str | None = None) -> dict | None:
        doc = self.get(doc_id)
        if not doc:
            return None
        if doc_status is not None:
            if doc_status not in DOC_STATUSES:
                raise ValueError("Statut documentaire invalide")
            self.db.execute("UPDATE documents SET doc_status = ? WHERE id = ?", (doc_status, doc_id))
        if version_label is not None:
            self.db.execute("UPDATE documents SET version_label = ? WHERE id = ?", (version_label or None, doc_id))
        if content_date is not None:
            self.db.execute("UPDATE documents SET content_date = ? WHERE id = ?", (content_date or None, doc_id))
        return self.get(doc_id)

    # ---- synchronisation avec le répertoire
    def refresh(self) -> dict:
        """Parcourt le répertoire, indexe les nouveautés/modifications, marque les suppressions."""
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        report = {"indexed": [], "unchanged": [], "removed": [], "unusable": [], "reviews": []}
        seen: set[str] = set()
        for path in sorted(p for p in self.docs_dir.rglob("*") if p.is_file() and not p.name.startswith(".")):
            rel = path.relative_to(self.docs_dir).as_posix()
            seen.add(rel)
            outcome = self._sync_file(path, rel)
            report[outcome["bucket"]].append(outcome["doc"])
        # documents disparus
        for doc in self.list_documents(include_deleted=False):
            if doc["rel_path"] not in seen:
                self._mark_deleted(doc["id"])
                report["removed"].append(self.get(doc["id"]))
                report["reviews"].extend(self._flag_dependent_memories(doc["id"], doc["name"]))
        return report

    def _sync_file(self, path: Path, rel: str) -> dict:
        digest = sha256_file(path)
        doc_id = stable_doc_id(rel)
        existing = self.db.one("SELECT * FROM documents WHERE rel_path = ?", (rel,))
        mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(timespec="seconds")
        if existing and existing["sha256"] == digest and existing["deleted_at"] is None:
            return {"bucket": "unchanged", "doc": existing}
        fmt, extraction = extract(path)
        chunks = chunk_segments(extraction.segments) if extraction.state == "indexe" else []
        if extraction.state == "indexe" and not chunks:
            extraction.state, extraction.error = "vide", "Aucun extrait exploitable"
        ts = now_iso()
        if existing:
            self.db.execute(
                """UPDATE documents SET name=?, sha256=?, size=?, format=?, file_modified_at=?, reindexed_at=?,
                   index_state=?, index_error=?, chunk_count=?, deleted_at=NULL WHERE id=?""",
                (path.name, digest, path.stat().st_size, fmt, mtime, ts, extraction.state, extraction.error,
                 len(chunks), doc_id),
            )
            if existing["sha256"] != digest and existing["sha256"] is not None:
                self._flag_dependent_memories(doc_id, path.name, reason="Document modifié : vérifier que le souvenir reste exact")
        else:
            self.db.execute(
                """INSERT INTO documents(id, name, rel_path, sha256, size, format, doc_status, file_modified_at,
                   imported_at, reindexed_at, index_state, index_error, chunk_count)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (doc_id, path.name, rel, digest, path.stat().st_size, fmt, "inconnu", mtime, ts, ts,
                 extraction.state, extraction.error, len(chunks)),
            )
        self._replace_chunks(doc_id, path.name, chunks)
        doc = self.get(doc_id)
        return {"bucket": "indexed" if extraction.state == "indexe" else "unusable", "doc": doc}

    def _replace_chunks(self, doc_id: str, doc_name: str, chunks: list[dict]) -> None:
        with self.db.lock:
            self.db.conn.execute("DELETE FROM chunks_fts WHERE chunk_id IN (SELECT id FROM chunks WHERE document_id = ?)", (doc_id,))
            self.db.conn.execute("DELETE FROM chunks WHERE document_id = ?", (doc_id,))
            embeddings = None
            if self.embedder is not None and chunks:
                try:
                    embeddings = self.embedder.embed([c["text"] for c in chunks])
                except Exception as exc:
                    embeddings = None
                    self.db.conn.execute("UPDATE documents SET index_error = ? WHERE id = ?",
                                         (f"Embeddings indisponibles ({exc}) : recherche lexicale seule", doc_id))
            for i, c in enumerate(chunks):
                cid = f"chk_{doc_id[4:]}_{i:04d}"
                emb = _pack(embeddings[i]) if embeddings else None
                self.db.conn.execute(
                    "INSERT INTO chunks(id, document_id, ordinal, section, page, paragraph_ref, text, embedding) VALUES (?,?,?,?,?,?,?,?)",
                    (cid, doc_id, i, c["section"], c["page"], c["paragraph_ref"], c["text"], emb),
                )
                self.db.conn.execute(
                    "INSERT INTO chunks_fts(text, section, document_name, chunk_id) VALUES (?,?,?,?)",
                    (c["text"], c["section"] or "", doc_name, cid),
                )
            self.db.conn.commit()

    def _mark_deleted(self, doc_id: str) -> None:
        # Pas de copie consultable conservée : les extraits sont physiquement supprimés.
        self._replace_chunks(doc_id, "", [])
        self.db.execute(
            "UPDATE documents SET deleted_at = ?, index_state = 'supprime', chunk_count = 0 WHERE id = ?",
            (now_iso(), doc_id),
        )

    def _flag_dependent_memories(self, doc_id: str, doc_name: str, reason: str | None = None) -> list[dict]:
        reason = reason or f"Document source supprimé ({doc_name}) : souvenir à réexaminer"
        rows = self.db.query(
            "SELECT id FROM memories WHERE deleted_at IS NULL AND source_type = 'document' AND source_ref LIKE ?",
            (f'%"{doc_id}"%',),
        )
        for r in rows:
            self.db.execute(
                "UPDATE memories SET needs_review = 1, review_reason = ?, updated_at = ? WHERE id = ?",
                (reason, now_iso(), r["id"]),
            )
            self.db.execute(
                "INSERT INTO memory_history(id, memory_id, ts, actor, change) VALUES (?,?,?,?,?)",
                (new_id("hist"), r["id"], now_iso(), "systeme", '{"needs_review": true, "motif": "' + reason.replace('"', "'") + '"}'),
            )
        return rows


def _pack(vec: list[float]) -> bytes:
    import struct
    return struct.pack(f"<{len(vec)}f", *vec)


def unpack(blob: bytes) -> list[float]:
    import struct
    n = len(blob) // 4
    return list(struct.unpack(f"<{n}f", blob))
