"""Règles d'autorisation et de mémoire appliquées dans le code."""
import pytest

from app.memory import AuthorizationError, MemoryStore


def test_agent_cannot_create_validated_memory(client):
    ms = MemoryStore(client.app.state.ctx.db)
    with pytest.raises(AuthorizationError):
        ms.propose(content="x", type="fait", source_type="seance", source_ref={}, actor="agent", status="valide")
    m = ms.propose(content="x", type="fait", source_type="seance", source_ref={}, actor="agent", status="declare")
    with pytest.raises(AuthorizationError):
        ms.set_status(m["id"], "valide", actor="agent")


def test_unauthorized_validation_via_api_is_refused(client):
    client.post("/api/documents/refresh")
    s = client.post("/api/sessions", json={"title": "t"}).json()
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Il faudra mettre à jour le registre, action à faire."}).json()
    act = r["propositions"]["actions"][0]
    assert client.patch(f"/api/actions/{act['id']}", json={"status": "validee", "actor": "agent"}).status_code == 403
    mem = client.post("/api/memories", json={"content": "m", "type": "fait"}).json()
    assert client.post(f"/api/memories/{mem['id']}/status", json={"status": "valide", "actor": "agent"}).status_code == 403
    dec = client.post("/api/decisions", json={"objet": "d"}).json()
    assert dec["status"] == "proposee"
    assert client.patch(f"/api/decisions/{dec['id']}", json={"status": "validee", "actor": "agent"}).status_code == 403
    # validation explicite par l'interface
    assert client.patch(f"/api/decisions/{dec['id']}", json={"status": "validee"}).json()["status"] == "validee"
    a = client.patch(f"/api/actions/{act['id']}", json={"status": "validee", "responsable": "pôle Coûts"}).json()
    assert a["status"] == "validee" and a["validated_at"] and a["champs_manquants"] == ["echeance", "dossier"]


def test_hypothesis_and_synthesis_never_declared_facts(client):
    ms = MemoryStore(client.app.state.ctx.db)
    h = ms.propose(content="peut-être", type="hypothese", source_type="seance", source_ref={}, actor="agent", status="declare")
    assert h["status"] == "a_confirmer"
    s = ms.propose(content="synthèse", type="synthese", source_type="seance", source_ref={}, actor="agent", status="declare")
    assert s["status"] == "a_confirmer"


def test_contradiction_links_without_overwriting(client):
    ms = MemoryStore(client.app.state.ctx.db)
    old = ms.propose(content="Seuil 500 k€", type="fait", source_type="document", source_ref={"document_id": "d"}, actor="utilisateur", status="valide")
    new = ms.propose(content="Seuil 700 k€", type="declaration", source_type="seance", source_ref={}, actor="agent",
                     relations=[{"type": "contredit", "memory_id": old["id"]}])
    assert ms.get(old["id"])["content"] == "Seuil 500 k€" and ms.get(old["id"])["status"] == "conteste"
    assert new["relations"] == [{"type": "contredit", "memory_id": old["id"]}]
    assert new["status"] == "declare"


def test_human_correction_is_historised(client):
    m = client.post("/api/memories", json={"content": "Échéance en juin", "type": "fait"}).json()
    r = client.patch(f"/api/memories/{m['id']}", json={"content": "Échéance en juillet", "motif": "erreur de transcription"}).json()
    assert r["content"] == "Échéance en juillet"
    hist = client.get(f"/api/memories/{m['id']}/history").json()
    assert hist[-1]["actor"] == "utilisateur" and hist[-1]["change"]["avant"]["content"] == "Échéance en juin"
    assert client.patch(f"/api/memories/{m['id']}", json={"content": "x", "actor": "agent"}).status_code == 403
    client.delete(f"/api/memories/{m['id']}")
    assert client.get("/api/memories").json() == []


def test_references_must_have_been_seen(client):
    from app.agent.verification import verify_references
    valid, rejected = verify_references(["chk_a", "chk_b", 42], {"chk_a": {}})
    assert valid == ["chk_a"] and rejected == ["chk_b", "42"]


def test_malicious_instruction_in_source_is_data(client, workspace):
    import shutil
    from tests.conftest import FIXTURES
    shutil.copy(FIXTURES / "instruction_malveillante_fictive.txt", workspace / "documents")
    client.post("/api/documents/refresh")
    s = client.post("/api/sessions", json={"title": "t"}).json()
    r = client.post(f"/api/sessions/{s['id']}/ask", json={"text": "Quand est arrêtée la clôture trimestrielle ?"}).json()
    assert r["references"]
    # rien n'a été validé, aucune décision créée par la lecture du document
    assert client.get("/api/decisions").json() == []
    assert all(m["status"] != "valide" for m in client.get("/api/memories").json())
    # l'extrait est encadré comme donnée non fiable dans les résultats d'outils
    from app.agent.tools import UNTRUSTED_NOTE
    assert UNTRUSTED_NOTE


def test_intervention_policy_gates(client):
    from app.agent.intervention import InterventionPolicy
    from app.agent.verification import load_policies
    from datetime import datetime, timezone
    p = InterventionPolicy(load_policies(), min_delay_s=90, max_chars=50)
    base = dict(declencheur="contradiction", motif="écart", texte="x" * 80, sources=["chk"])
    ok = p.evaluate(mode="codir_assiste", proposal=base, valid_sources=["chk"], recent_interventions=[], last_intervention_at=None, trigger_kind="ecoute")
    assert ok["autorisee"] and ok["controles"]["texte_tronque"] and len(ok["texte"]) <= 51
    no_src = p.evaluate(mode="codir_assiste", proposal=base, valid_sources=[], recent_interventions=[], last_intervention_at=None, trigger_kind="ecoute")
    assert not no_src["autorisee"]
    too_soon = p.evaluate(mode="codir_assiste", proposal=base, valid_sources=["chk"], recent_interventions=[],
                          last_intervention_at=datetime.now(timezone.utc).isoformat(), trigger_kind="ecoute")
    assert any("Délai" in m for m in too_soon["motifs_refus"])
    rep = p.evaluate(mode="codir_assiste", proposal=base, valid_sources=["chk"], recent_interventions=[{"id": "i1", "text": "x" * 80, "status": "lue"}],
                     last_intervention_at=None, trigger_kind="ecoute")
    assert any("Répétition" in m for m in rep["motifs_refus"])
    bad = p.evaluate(mode="codir_assiste", proposal=dict(base, declencheur="humeur"), valid_sources=["chk"], recent_interventions=[], last_intervention_at=None, trigger_kind="ecoute")
    assert not bad["autorisee"]
    assert p.can_autospeak("codir_assiste", 5000)[0] is False
    assert p.can_autospeak("codir_actif", 500)[0] is False
    assert p.can_autospeak("codir_actif", 2000)[0] is True


def test_intervention_becomes_obsolete_before_reading(client):
    client.post("/api/documents/refresh")
    s = client.post("/api/sessions", json={"title": "t", "mode": "codir_actif"}).json()
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Il faudra mettre à jour le registre, action à faire."}).json()
    iid = r["intervention"]["intervention"]["id"]
    # nouveaux énoncés : le point est résolu
    client.post(f"/api/sessions/{s['id']}/listen", json={"text": "C'est résolu, Paul s'en charge pour vendredi."})
    v = client.post(f"/api/interventions/{iid}/autoriser-lecture-auto", json={"silence_ms": 2000}).json()
    assert v["autorisee"] is False and "inutile" in v["motif"]
    assert client.app.state.ctx.sessions.get_intervention(iid)["status"] == "obsolete"


def test_intervention_read_by_facilitator(client):
    client.post("/api/documents/refresh")
    s = client.post("/api/sessions", json={"title": "t"}).json()
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Il faudra mettre à jour le registre, action à faire."}).json()
    iid = r["intervention"]["intervention"]["id"]
    assert client.post(f"/api/interventions/{iid}/autoriser-lecture-auto", json={"silence_ms": 5000}).json()["autorisee"] is False  # mode assisté
    it = client.post(f"/api/interventions/{iid}/lire").json()
    assert it["status"] == "lue" and it["spoken_at"]
    assert client.post(f"/api/interventions/{iid}/lire").status_code == 409
