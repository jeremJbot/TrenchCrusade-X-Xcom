"""Ingestion, statuts d'indexation, réindexation, suppression."""
from pathlib import Path


def test_refresh_reports_usable_and_unusable(client, workspace):
    r = client.post("/api/documents/refresh").json()
    by_name = {d["name"]: d for d in client.get("/api/documents").json()["documents"]}
    assert by_name["note_organisation_fictive.md"]["index_state"] == "indexe"
    assert by_name["calendrier_budgetaire_fictif.docx"]["index_state"] == "indexe"
    assert by_name["scan_sans_texte_fictif.pdf"]["index_state"] == "ocr_requis"
    assert by_name["image_non_supportee.png"]["index_state"] == "non_supporte"
    assert len(r["indexed"]) == 2 and len(r["unusable"]) == 2
    # jamais d'ingestion "réussie" avec zéro extrait
    for d in by_name.values():
        assert (d["index_state"] == "indexe") == (d["chunk_count"] > 0)


def test_docx_has_sections_not_pages(client):
    client.post("/api/documents/refresh")
    doc = next(d for d in client.get("/api/documents").json()["documents"] if d["format"] == "docx")
    chunks = client.get(f"/api/documents/{doc['id']}/chunks").json()["chunks"]
    assert chunks and all(c["page"] is None for c in chunks)
    assert any(c["section"] == "Étapes" for c in chunks)
    assert all(c["paragraph_ref"] for c in chunks)


def test_search_lexical(client):
    client.post("/api/documents/refresh")
    r = client.get("/api/search", params={"q": "seuil de visa chaîne de la dépense"}).json()
    assert r["mode"] == "lexicale"
    assert r["resultats"] and "500 000" in r["resultats"][0]["text"]


def test_modified_document_is_reindexed(client, workspace):
    client.post("/api/documents/refresh")
    p = workspace / "documents" / "note_organisation_fictive.md"
    before = next(d for d in client.get("/api/documents").json()["documents"] if d["name"] == p.name)
    p.write_text(p.read_text(encoding="utf-8") + "\n\n## Nouveau\n\nLe seuil de visa passe à sept cent mille euros.", encoding="utf-8")
    client.post("/api/documents/refresh")
    after = next(d for d in client.get("/api/documents").json()["documents"] if d["name"] == p.name)
    assert after["id"] == before["id"] and after["sha256"] != before["sha256"]
    r = client.get("/api/search", params={"q": "sept cent mille"}).json()
    assert any("sept cent mille" in x["text"] for x in r["resultats"])


def test_deleted_document_leaves_search_and_flags_memories(client, workspace):
    client.post("/api/documents/refresh")
    doc = next(d for d in client.get("/api/documents").json()["documents"] if d["name"] == "note_organisation_fictive.md")
    chunk = client.get(f"/api/documents/{doc['id']}/chunks").json()["chunks"][0]
    # souvenir dépendant du document
    from app.memory import MemoryStore
    ms = MemoryStore(client.app.state.ctx.db)
    m = ms.propose(content="Le seuil de visa est de 500 000 €", type="fait", source_type="document",
                   source_ref={"document_id": doc["id"], "chunk_id": chunk["id"]}, actor="utilisateur", status="valide")
    (workspace / "documents" / "note_organisation_fictive.md").unlink()
    rep = client.post("/api/documents/refresh").json()
    assert [d["id"] for d in rep["removed"]] == [doc["id"]]
    assert client.get("/api/search", params={"q": "seuil de visa"}).json()["resultats"] == []
    assert client.get(f"/api/documents/{doc['id']}/chunks").json()["chunks"] == []  # aucune copie conservée
    flagged = client.get("/api/memories", params={"needs_review": True}).json()
    assert [x["id"] for x in flagged] == [m["id"]]
    assert "supprimé" in flagged[0]["review_reason"]


def test_metadata_never_invented(client):
    client.post("/api/documents/refresh")
    doc = client.get("/api/documents").json()["documents"][0]
    assert doc["doc_status"] == "inconnu" and doc["version_label"] is None and doc["content_date"] is None
    r = client.patch(f"/api/documents/{doc['id']}", json={"doc_status": "reference_validee", "version_label": "v2", "content_date": "2025-01"}).json()
    assert r["doc_status"] == "reference_validee" and r["version_label"] == "v2"
    assert client.patch(f"/api/documents/{doc['id']}", json={"doc_status": "n_importe_quoi"}).status_code == 400
