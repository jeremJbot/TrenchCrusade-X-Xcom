"""Serveur web local de l'assistant CODIR FIN (FastAPI)."""
from __future__ import annotations

import logging
import threading
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .agent.orchestrator import Orchestrator
from .config import MODES, Settings, load_settings
from .db import Database
from .documents import DOC_STATUSES, SUPPORTED, DocumentStore
from .memory import AuthorizationError, MemoryStore
from .providers.base import ProviderError
from .providers.factory import build_embeddings, build_llm, build_stt, build_tts
from .search import SearchEngine
from .sessions import SessionStore

log = logging.getLogger("codir")


class DocMeta(BaseModel):
    doc_status: str | None = None
    version_label: str | None = None
    content_date: str | None = None


class SessionIn(BaseModel):
    title: str = "Séance CODIR FIN"
    mode: str | None = None


class ModeIn(BaseModel):
    mode: str


class TurnIn(BaseModel):
    text: str
    speaker: str | None = None
    source: str = "clavier"


class TTSIn(BaseModel):
    text: str


class SilenceIn(BaseModel):
    silence_ms: int = 0


class ClarIn(BaseModel):
    answer: str | None = None
    status: str = "repondue"


class MemoryIn(BaseModel):
    content: str
    type: str = "fait"
    dossier: str | None = None
    author: str | None = None
    effective_at: str | None = None
    status: str = "declare"


class MemoryPatch(BaseModel):
    content: str | None = None
    dossier: str | None = None
    author: str | None = None
    effective_at: str | None = None
    motif: str | None = None
    actor: str = "utilisateur"


class StatusIn(BaseModel):
    status: str
    motif: str | None = None
    actor: str = "utilisateur"


class DecisionIn(BaseModel):
    objet: str
    dossier: str | None = None
    session_id: str | None = None


class DecisionPatch(BaseModel):
    status: str | None = None
    objet: str | None = None
    dossier: str | None = None
    actor: str = "utilisateur"


class ActionIn(BaseModel):
    objet: str
    dossier: str | None = None
    responsable: str | None = None
    echeance: str | None = None
    session_id: str | None = None


class ActionPatch(BaseModel):
    objet: str | None = None
    dossier: str | None = None
    responsable: str | None = None
    echeance: str | None = None
    status: str | None = None
    actor: str = "utilisateur"

STATIC_DIR = Path(__file__).parent / "static"


class AppState:
    def __init__(self, settings: Settings, db: Database | None = None):
        self.settings = settings
        self.db = db or Database(settings.db_path)
        self.embedder = None
        self.provider_errors: dict[str, str] = {}
        try:
            self.embedder = build_embeddings(settings)
        except ProviderError as exc:
            self.provider_errors["embeddings"] = str(exc)
        self.documents = DocumentStore(self.db, settings.docs_dir, embedder=self.embedder)
        self.search = SearchEngine(self.db, embedder=self.embedder)
        self.memory = MemoryStore(self.db)
        self.sessions = SessionStore(self.db)
        try:
            self.llm = build_llm(settings)
        except ProviderError as exc:
            self.llm = None
            self.provider_errors["llm"] = str(exc)
        self.stt = build_stt(settings)
        self.tts = build_tts(settings)
        self.orchestrator = Orchestrator(settings, self.llm, self.search, self.memory, self.sessions) if self.llm else None

    def require_llm(self) -> Orchestrator:
        if not self.orchestrator:
            raise HTTPException(503, f"Modèle non configuré : {self.provider_errors.get('llm', 'LLM_PROVIDER invalide')}")
        return self.orchestrator


def create_app(settings: Settings | None = None, db: Database | None = None) -> FastAPI:
    settings = settings or load_settings()
    state = AppState(settings, db)
    app = FastAPI(title="Assistant CODIR FIN", docs_url=None, redoc_url=None)
    app.state.ctx = state

    # ------------------------------------------------------------ erreurs
    @app.exception_handler(AuthorizationError)
    async def _auth(_: Request, exc: AuthorizationError):
        return JSONResponse(status_code=403, content={"detail": str(exc)})

    @app.exception_handler(ValueError)
    async def _val(_: Request, exc: ValueError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    # ------------------------------------------------------------ pages
    @app.get("/")
    def index():
        return FileResponse(STATIC_DIR / "index.html")

    # ------------------------------------------------------------ état
    @app.get("/api/status")
    def status():
        docs = state.documents.list_documents(include_deleted=False)
        counts = {}
        for d in docs:
            counts[d["index_state"]] = counts.get(d["index_state"], 0) + 1
        active = state.sessions.active()
        return {
            "settings": settings.public_settings(),
            "provider_errors": state.provider_errors,
            "llm_ready": state.orchestrator is not None,
            "llm_simulated": bool(getattr(state.llm, "simulated", False)),
            "search_mode": state.search.mode,
            "documents": {"total": len(docs), "par_etat": counts, "chunks": state.db.one("SELECT COUNT(*) AS n FROM chunks")["n"]},
            "session": active,
            "modes": MODES,
            "policies": {"modes": state.orchestrator.policies["modes"] if state.orchestrator else {},
                         "min_delay_s": settings.intervention_min_delay_s, "max_chars": settings.intervention_max_chars},
        }

    @app.post("/api/diagnostics")
    def diagnostics():
        out = {}
        out["llm"] = state.llm.check() if state.llm else {"ok": False, "detail": state.provider_errors.get("llm", "non configuré")}
        out["stt"] = state.stt.check() if state.stt else {"ok": settings.stt_provider == "browser", "detail": f"Fournisseur : {settings.stt_provider} (aucun test serveur)"}
        out["tts"] = state.tts.check() if state.tts else {"ok": settings.tts_provider == "browser", "detail": f"Fournisseur : {settings.tts_provider} (aucun test serveur)"}
        out["embeddings"] = state.embedder.check() if state.embedder else {"ok": True, "detail": "Désactivés : recherche lexicale seule"}
        out["base"] = {"ok": True, "detail": str(settings.db_path)}
        return out

    # ------------------------------------------------------------ documents
    @app.get("/api/documents")
    def list_documents():
        return {"docs_dir": str(settings.docs_dir), "formats": sorted(SUPPORTED), "documents": state.documents.list_documents()}

    @app.post("/api/documents/refresh")
    def refresh_documents():
        return state.documents.refresh()

    @app.post("/api/documents/upload")
    async def upload_document(file: UploadFile = File(...)):
        name = Path(file.filename or "document").name
        if not name or name.startswith("."):
            raise HTTPException(400, "Nom de fichier invalide")
        settings.docs_dir.mkdir(parents=True, exist_ok=True)
        target = settings.docs_dir / name
        target.write_bytes(await file.read())
        report = state.documents.refresh()
        doc = state.db.one("SELECT * FROM documents WHERE rel_path = ?", (name,))
        return {"document": doc, "rapport": report}


    @app.patch("/api/documents/{doc_id}")
    def patch_document(doc_id: str, meta: DocMeta):
        if meta.doc_status and meta.doc_status not in DOC_STATUSES:
            raise HTTPException(400, "Statut documentaire invalide")
        doc = state.documents.update_metadata(doc_id, meta.doc_status, meta.version_label, meta.content_date)
        if not doc:
            raise HTTPException(404, "Document inconnu")
        return doc

    @app.get("/api/documents/{doc_id}/chunks")
    def document_chunks(doc_id: str):
        doc = state.documents.get(doc_id)
        if not doc:
            raise HTTPException(404, "Document inconnu")
        return {"document": doc, "chunks": state.documents.chunks_of(doc_id)}

    @app.get("/api/search")
    def search(q: str, k: int = 6):
        return {"mode": state.search.mode, "resultats": state.search.search_chunks(q, k=k)}

    # ------------------------------------------------------------ séances

    @app.post("/api/sessions")
    def start_session(body: SessionIn):
        return state.sessions.start(body.title, body.mode or settings.default_mode)

    @app.get("/api/sessions")
    def list_sessions():
        return state.sessions.list()

    @app.get("/api/sessions/active")
    def active_session():
        return state.sessions.active()

    @app.get("/api/sessions/{sid}")
    def get_session(sid: str):
        s = state.sessions.get(sid)
        if not s:
            raise HTTPException(404, "Séance inconnue")
        return s


    @app.patch("/api/sessions/{sid}")
    def set_mode(sid: str, body: ModeIn):
        return state.sessions.set_mode(sid, body.mode)

    @app.post("/api/sessions/{sid}/close")
    def close_session(sid: str):
        return state.sessions.close(sid)

    @app.get("/api/sessions/{sid}/utterances")
    def utterances(sid: str, since_seq: int = 0):
        return state.sessions.utterances(sid, since_seq=since_seq)

    @app.get("/api/sessions/{sid}/summary")
    def summary(sid: str):
        return state.sessions.summary(sid) or {"session_id": sid, "summary": "", "upto_seq": 0}

    @app.post("/api/sessions/{sid}/summarize")
    def summarize(sid: str):
        return state.require_llm().maybe_summarize(sid, force=True) or {"detail": "Rien à résumer"}

    @app.get("/api/sessions/{sid}/minutes")
    def minutes(sid: str):
        if not state.sessions.get(sid):
            raise HTTPException(404, "Séance inconnue")
        return state.require_llm().draft_minutes(sid)

    # ------------------------------------------------------------ tours

    def _active_session(sid: str) -> dict:
        s = state.sessions.get(sid)
        if not s:
            raise HTTPException(404, "Séance inconnue")
        if s["status"] != "active":
            raise HTTPException(409, "Séance clôturée")
        return s

    def _after_turn(sid: str):
        orch = state.orchestrator
        if orch and state.sessions.needs_summary(sid):
            threading.Thread(target=orch.maybe_summarize, args=(sid,), daemon=True).start()

    @app.post("/api/sessions/{sid}/ask")
    def ask(sid: str, body: TurnIn):
        _active_session(sid)
        orch = state.require_llm()
        text = body.text.strip()
        if not text:
            raise HTTPException(400, "Question vide")
        utt = state.sessions.add_utterance(sid, "participant", text, source=body.source, speaker=body.speaker or None)
        result = orch.run_turn(session_id=sid, text=text, trigger="adresse", utterance_id=utt["id"], speaker=body.speaker or None)
        result["utterance"] = utt
        _after_turn(sid)
        return result

    @app.post("/api/sessions/{sid}/listen")
    def listen(sid: str, body: TurnIn):
        _active_session(sid)
        text = body.text.strip()
        if not text:
            raise HTTPException(400, "Segment vide")
        if state.sessions.is_duplicate(sid, text):
            return {"traite": False, "motif": "Segment déjà reçu (doublon ignoré)"}
        utt = state.sessions.add_utterance(sid, "participant", text, source=body.source, speaker=body.speaker or None)
        orch = state.orchestrator
        if not orch:
            return {"traite": False, "utterance": utt, "motif": "Modèle non configuré : segment conservé dans la transcription"}
        result = orch.run_turn(session_id=sid, text=text, trigger="ecoute", utterance_id=utt["id"], speaker=body.speaker or None)
        result["utterance"] = utt
        _after_turn(sid)
        return result

    @app.post("/api/turns/{tid}/cancel")
    def cancel_turn(tid: str):
        ok = state.orchestrator.cancel(tid) if state.orchestrator else False
        return {"annule": ok}

    @app.get("/api/turns/{tid}")
    def get_turn(tid: str):
        t = state.sessions.get_turn(tid)
        if not t:
            raise HTTPException(404, "Tour inconnu")
        return t

    # ------------------------------------------------------------ audio
    @app.post("/api/stt")
    async def stt(file: UploadFile = File(...)):
        if not state.stt:
            raise HTTPException(503, f"Transcription serveur non configurée (STT_PROVIDER={settings.stt_provider})")
        audio = await file.read()
        if len(audio) < 200:
            return {"text": "", "detail": "Segment trop court"}
        try:
            return state.stt.transcribe(audio, file.content_type or "audio/webm", settings.stt_language)
        except ProviderError as exc:
            raise HTTPException(502, str(exc))
        finally:
            del audio  # l'audio brut n'est pas conservé


    @app.post("/api/tts")
    def tts(body: TTSIn):
        if not state.tts:
            raise HTTPException(503, f"Synthèse serveur non configurée (TTS_PROVIDER={settings.tts_provider})")
        text = body.text.strip()[:3000]
        if not text:
            raise HTTPException(400, "Texte vide")
        try:
            audio, ctype = state.tts.synthesize(text)
        except ProviderError as exc:
            raise HTTPException(502, str(exc))
        return Response(content=audio, media_type=ctype)

    # ------------------------------------------------------------ interventions
    @app.get("/api/sessions/{sid}/interventions")
    def interventions(sid: str, status: str | None = None):
        return state.sessions.list_interventions(sid, status)


    @app.post("/api/interventions/{iid}/lire")
    def read_intervention(iid: str):
        """Lecture déclenchée par l'animateur (modes assisté/actif)."""
        it = state.sessions.get_intervention(iid)
        if not it:
            raise HTTPException(404)
        if it["status"] not in ("proposee", "reportee"):
            raise HTTPException(409, f"Intervention déjà {it['status']}")
        return state.sessions.set_intervention_status(iid, "lue", spoken=True)

    @app.post("/api/interventions/{iid}/autoriser-lecture-auto")
    def autospeak(iid: str, body: SilenceIn):
        """Mode actif : vérifie pause, statut et pertinence avant lecture automatique."""
        it = state.sessions.get_intervention(iid)
        if not it:
            raise HTTPException(404)
        session = state.sessions.get(it["session_id"])
        orch = state.require_llm()
        ok, why = orch.policy.can_autospeak(session["mode"], body.silence_ms)
        if not ok:
            return {"autorisee": False, "motif": why}
        if it["status"] not in ("proposee", "reportee"):
            return {"autorisee": False, "motif": f"Statut {it['status']}"}
        if session.get("last_intervention_at"):
            verdict = orch.policy.evaluate(mode=session["mode"], proposal={"declencheur": it["trigger"], "motif": it["motif"], "texte": it["text"], "sources": it["sources"]},
                                           valid_sources=it["sources"], recent_interventions=[], last_intervention_at=session["last_intervention_at"], trigger_kind="ecoute")
            if not verdict["autorisee"]:
                return {"autorisee": False, "motif": "; ".join(verdict["motifs_refus"])}
        check = orch.recheck_intervention(iid)
        if not check["toujours_utile"]:
            return {"autorisee": False, "motif": f"Devenue inutile : {check['motif']}", "intervention": state.sessions.get_intervention(iid)}
        return {"autorisee": True, "intervention": state.sessions.set_intervention_status(iid, "lue", spoken=True)}

    @app.post("/api/interventions/{iid}/reverifier")
    def recheck(iid: str):
        return state.require_llm().recheck_intervention(iid)

    @app.post("/api/interventions/{iid}/rejeter")
    def reject_intervention(iid: str):
        return state.sessions.set_intervention_status(iid, "rejetee")

    @app.post("/api/interventions/{iid}/reporter")
    def postpone_intervention(iid: str):
        return state.sessions.set_intervention_status(iid, "reportee")

    @app.post("/api/sessions/{sid}/interventions/suspendre")
    def suspend_all(sid: str):
        n = 0
        for it in state.sessions.list_interventions(sid, "proposee"):
            state.sessions.set_intervention_status(it["id"], "reportee"); n += 1
        return {"reportees": n}

    # ------------------------------------------------------------ clarifications
    @app.get("/api/sessions/{sid}/clarifications")
    def clarifications(sid: str, status: str | None = None):
        return state.sessions.list_clarifications(sid, status)


    @app.post("/api/clarifications/{cid}")
    def answer_clarification(cid: str, body: ClarIn):
        if body.status not in ("repondue", "ignoree"):
            raise HTTPException(400, "Statut invalide")
        return state.sessions.answer_clarification(cid, body.answer, body.status)

    # ------------------------------------------------------------ mémoire
    @app.get("/api/memories")
    def memories(status: str | None = None, dossier: str | None = None, needs_review: bool | None = None):
        return state.memory.list(status=status, dossier=dossier, needs_review=needs_review)


    @app.post("/api/memories")
    def create_memory(body: MemoryIn):
        active = state.sessions.active()
        ref = {"session_id": active["id"] if active else None, "saisi_par": "utilisateur"}
        return state.memory.propose(content=body.content, type=body.type, source_type="utilisateur", source_ref=ref, actor="utilisateur",
                                    dossier=body.dossier, author=body.author, effective_at=body.effective_at, status=body.status)


    @app.patch("/api/memories/{mid}")
    def correct_memory(mid: str, body: MemoryPatch):
        try:
            return state.memory.correct(mid, body.actor, content=body.content, dossier=body.dossier, author=body.author,
                                        effective_at=body.effective_at, motif=body.motif)
        except KeyError:
            raise HTTPException(404, "Souvenir inconnu")


    @app.post("/api/memories/{mid}/status")
    def memory_status(mid: str, body: StatusIn):
        if not state.memory.get(mid):
            raise HTTPException(404, "Souvenir inconnu")
        return state.memory.set_status(mid, body.status, body.actor, body.motif)

    @app.delete("/api/memories/{mid}")
    def delete_memory(mid: str, motif: str | None = None):
        state.memory.delete(mid, "utilisateur", motif)
        return {"supprime": mid}

    @app.get("/api/memories/{mid}/history")
    def memory_history(mid: str):
        return state.memory.history(mid)

    # ------------------------------------------------------------ décisions / actions
    @app.get("/api/decisions")
    def decisions(session_id: str | None = None, status: str | None = None):
        return state.memory.list_decisions(session_id, status)


    @app.post("/api/decisions")
    def create_decision(body: DecisionIn):
        sid = body.session_id or (state.sessions.active() or {}).get("id")
        return state.memory.propose_decision(objet=body.objet, dossier=body.dossier, source_ref={"session_id": sid, "saisi_par": "utilisateur"},
                                             proposed_by="utilisateur", session_id=sid)


    @app.patch("/api/decisions/{did}")
    def patch_decision(did: str, body: DecisionPatch):
        if not state.memory.get_decision(did):
            raise HTTPException(404)
        if body.objet is not None or body.dossier is not None:
            state.memory.update_decision(did, body.actor, body.objet, body.dossier)
        if body.status:
            return state.memory.set_decision_status(did, body.status, body.actor)
        return state.memory.get_decision(did)

    @app.get("/api/actions")
    def actions(session_id: str | None = None, status: str | None = None):
        out = state.memory.list_actions(session_id, status)
        for a in out:
            a["champs_manquants"] = state.memory.missing_fields(a)
        return out


    @app.post("/api/actions")
    def create_action(body: ActionIn):
        sid = body.session_id or (state.sessions.active() or {}).get("id")
        return state.memory.propose_action(objet=body.objet, dossier=body.dossier, responsable=body.responsable, echeance=body.echeance,
                                           source_ref={"session_id": sid, "saisi_par": "utilisateur"}, proposed_by="utilisateur", session_id=sid)


    @app.patch("/api/actions/{aid}")
    def patch_action(aid: str, body: ActionPatch):
        if not state.memory.get_action(aid):
            raise HTTPException(404)
        a = state.memory.update_action(aid, body.actor, objet=body.objet, dossier=body.dossier, responsable=body.responsable,
                                       echeance=body.echeance, status=body.status)
        a["champs_manquants"] = state.memory.missing_fields(a)
        return a

    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    return app


def run():
    import uvicorn

    settings = load_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    app = create_app(settings)
    log.info("Assistant CODIR FIN sur http://%s:%s (répertoire documents : %s)", settings.host, settings.port, settings.docs_dir)
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="info")


if __name__ == "__main__":
    run()
