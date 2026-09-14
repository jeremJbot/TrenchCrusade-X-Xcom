"""Parcours : question sourcée, absence de réponse, déclaration mémorisée, persistance, contradiction, montant, action."""
from tests.conftest import new_client


def start(client, mode="codir_assiste"):
    client.post("/api/documents/refresh")
    return client.post("/api/sessions", json={"title": "Test", "mode": mode}).json()


def test_documentary_answer_with_verified_sources(client):
    s = start(client)
    r = client.post(f"/api/sessions/{s['id']}/ask", json={"text": "Quel est le seuil de visa de la chaîne de la dépense ?"}).json()
    assert r["traite"] and r["repondre"] and r["simule"] is True
    assert r["reponse_ecrite"].startswith("[SIMULÉ]")
    assert r["references"] and r["sources"][0]["document"] == "note_organisation_fictive.md"
    assert "500 000" in r["sources"][0]["extrait"]
    assert r["references_rejetees"] == []
    assert r["mode_recherche"] == "lexicale"
    # la réponse est dans la transcription
    utts = client.get(f"/api/sessions/{s['id']}/utterances").json()
    assert [u["kind"] for u in utts] == ["participant", "assistant"]


def test_no_answer_in_corpus(client):
    s = start(client)
    r = client.post(f"/api/sessions/{s['id']}/ask", json={"text": "Quelle est la couleur du logo ?"}).json()
    assert r["repondre"] and r["references"] == [] and "ne trouve pas" in r["reponse_ecrite"]


def test_declaration_is_memorised_with_provenance_and_persists(client, workspace):
    s = start(client)
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Le comité assurances se tiendra la semaine prochaine avec le courtier.", "source": "micro"}).json()
    assert r["traite"] and r["repondre"] is False
    mems = r["propositions"]["souvenirs"]
    assert len(mems) == 1 and mems[0]["status"] == "declare" and mems[0]["author"] is None
    assert mems[0]["source_ref"]["session_id"] == s["id"] and mems[0]["source_ref"]["utterance_id"] == r["utterance"]["id"]
    # redémarrage
    c2 = new_client(workspace)
    found = c2.get("/api/memories").json()
    assert [m["id"] for m in found] == [mems[0]["id"]] and found[0]["status"] == "declare"
    assert c2.get("/api/sessions/active").json()["id"] == s["id"]


def test_duplicate_segment_ignored(client):
    s = start(client)
    client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Le comité assurances se tiendra la semaine prochaine."})
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Le comité assurances se tiendra  la semaine prochaine."}).json()
    assert r["traite"] is False and "doublon" in r["motif"]


def test_contradiction_creates_linked_intervention_and_memory(client):
    s = start(client)
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Le seuil de visa de la chaîne de la dépense n'est plus de cinq cent mille euros."}).json()
    it = r["intervention"]
    assert it["enregistree"] and it["intervention"]["trigger"] == "contradiction" and it["intervention"]["sources"]
    assert it["intervention"]["status"] == "proposee"
    assert r["propositions"]["souvenirs"][0]["status"] == "declare"
    queue = client.get(f"/api/sessions/{s['id']}/interventions").json()
    assert len(queue) == 1


def test_uncertain_amount_triggers_clarification(client):
    s = start(client)
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Le surcoût serait d'environ 3 M€ je crois sur le lot 2."}).json()
    assert r["propositions"]["clarifications"] and r["propositions"]["clarifications"][0]["status"] == "ouverte"
    cid = r["propositions"]["clarifications"][0]["id"]
    assert client.post(f"/api/clarifications/{cid}", json={"answer": "3,2 M€", "status": "repondue"}).json()["status"] == "repondue"


def test_action_without_owner_stays_empty(client):
    s = start(client)
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Il faudra mettre à jour le registre des risques avant le prochain comité, c'est une action à faire."}).json()
    acts = r["propositions"]["actions"]
    assert acts and acts[0]["status"] == "proposee" and acts[0]["responsable"] is None and acts[0]["echeance"] is None
    assert set(acts[0]["champs_manquants"]) >= {"responsable", "echeance"}
    assert r["intervention"]["enregistree"] and r["intervention"]["intervention"]["trigger"] == "action_incomplete"


def test_dialogue_dirige_has_no_spontaneous_interventions(client):
    s = start(client, mode="dialogue_dirige")
    r = client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Il faudra mettre à jour le registre des risques, c'est une action à faire."}).json()
    assert r["intervention"]["enregistree"] is False
    assert any("dialogue_dirige" in m for m in r["intervention"]["motifs_refus"])


def test_minutes_draft_shows_statuses_and_gaps(client):
    s = start(client)
    client.post(f"/api/sessions/{s['id']}/listen", json={"text": "Il faudra mettre à jour le registre des risques, c'est une action à faire."})
    m = client.get(f"/api/sessions/{s['id']}/minutes").json()
    assert "[proposee]" in m["markdown"] and "responsable : (vide)" in m["markdown"]
    assert "validés" in m["markdown"]


def test_turn_cancel_marks_turn_cancelled(client):
    s = start(client)
    orch = client.app.state.ctx.orchestrator
    tid = client.app.state.ctx.sessions.create_turn(s["id"], "adresse", "x", "lexicale")
    import threading
    orch._cancel_flags[tid] = threading.Event()
    assert client.post(f"/api/turns/{tid}/cancel").json()["annule"] is True
    assert client.post("/api/turns/inconnu/cancel").json()["annule"] is False
