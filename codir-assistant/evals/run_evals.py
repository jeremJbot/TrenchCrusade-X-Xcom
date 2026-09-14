"""Lance les scénarios automatisables de evals/scenarios/scenarios.yaml contre une application en mémoire.

Usage :
  python evals/run_evals.py                 # fournisseur simulé (étiqueté, ne valide pas le parcours réel)
  LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=... python evals/run_evals.py --real   # modèle réel (appels facturés)
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from app.config import load_settings  # noqa: E402
from app.main import create_app  # noqa: E402

FIXTURES = ROOT / "evals" / "fixtures"


def build_client(real: bool) -> TestClient:
    tmp = Path(tempfile.mkdtemp(prefix="codir-evals-"))
    (tmp / "documents").mkdir()
    for f in FIXTURES.iterdir():
        if f.suffix in (".md", ".docx", ".txt", ".pdf") and f.name != "README.md":
            shutil.copy(f, tmp / "documents" / f.name)
    os.environ["CODIR_DATA_DIR"] = str(tmp)
    os.environ["CODIR_DOCS_DIR"] = str(tmp / "documents")
    os.environ["INTERVENTION_MIN_DELAY_S"] = "0"
    if not real:
        os.environ["LLM_PROVIDER"] = "simulated"
    s = load_settings()
    return TestClient(create_app(s))


def check(name, cond, details=""):
    print(f"    {'OK ' if cond else 'KO '} {name}{(' — ' + details) if details and not cond else ''}")
    return bool(cond)


def run_scenario(c: TestClient, sc: dict) -> bool | None:
    if sc["type"] != "automatise" or "etapes" not in sc:
        print(f"  [{sc['id']}] {sc['titre']} : {sc['type']} — {sc.get('note', '').strip()[:160]}")
        return None
    print(f"  [{sc['id']}] {sc['titre']}")
    sess = c.post("/api/sessions", json={"title": sc["id"], "mode": "codir_assiste"}).json()
    last, mem = None, None
    for st in sc["etapes"]:
        if st["action"] in ("ask", "listen"):
            last = c.post(f"/api/sessions/{sess['id']}/{st['action']}", json={"text": st["texte"]}).json()
        elif st["action"] == "memoire_creer":
            mem = c.post("/api/memories", json={"content": st["contenu"], "type": "fait"}).json()
        elif st["action"] == "memoire_corriger":
            c.patch(f"/api/memories/{mem['id']}", json={"content": st["contenu"], "motif": "correction"})
    ok = True
    a = sc.get("attendu", {})
    if "references_non_vides" in a:
        ok &= check("références citées", bool(last.get("references")))
    if "references_vides" in a:
        ok &= check("aucune référence", not last.get("references"))
    if "references_rejetees_vides" in a:
        ok &= check("aucune référence rejetée", not last.get("references_rejetees"))
    if "extrait_contient" in a:
        ok &= check(f"extrait contient « {a['extrait_contient']} »", any(a["extrait_contient"] in s["extrait"] for s in last.get("sources", [])))
    if "reponse_contient_un_de" in a:
        ok &= check("réponse signale l'absence", any(x in last.get("reponse_ecrite", "").lower() for x in a["reponse_contient_un_de"]), last.get("reponse_ecrite", "")[:120])
    if "souvenir_propose_statut" in a:
        souv = last.get("propositions", {}).get("souvenirs", [])
        ok &= check("souvenir proposé en statut déclaré", souv and souv[0]["status"] == a["souvenir_propose_statut"])
    if "intervention_declencheur" in a:
        it = (last.get("intervention") or {}).get("intervention") or {}
        ok &= check(f"intervention {a['intervention_declencheur']}", it.get("trigger") == a["intervention_declencheur"], str(last.get("intervention"))[:160])
        if "intervention_sources_non_vides" in a:
            ok &= check("intervention sourcée", bool(it.get("sources")))
    if "clarification_ouverte" in a:
        ok &= check("clarification ouverte", bool(last.get("propositions", {}).get("clarifications")))
    if "action_proposee_champs_manquants" in a:
        acts = last.get("propositions", {}).get("actions", [])
        ok &= check("action proposée avec champs manquants visibles", acts and set(a["action_proposee_champs_manquants"]) <= set(acts[0]["champs_manquants"]))
    if "historique_contient_correction" in a:
        h = c.get(f"/api/memories/{mem['id']}/history").json()
        ok &= check("correction historisée", any(x["actor"] == "utilisateur" and "avant" in x["change"] for x in h))
    if "aucune_decision_validee" in a:
        ok &= check("aucune décision validée", not [d for d in c.get("/api/decisions").json() if d["status"] == "validee"])
    if "aucun_souvenir_valide" in a:
        ok &= check("aucun souvenir validé par le modèle", not [m for m in c.get("/api/memories").json() if m["status"] == "valide"])
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--real", action="store_true", help="utiliser le fournisseur réel configuré (.env)")
    args = ap.parse_args()
    c = build_client(args.real)
    status = c.get("/api/status").json()
    print(f"Modèle : {status['settings']['llm']['model']}{' (SIMULÉ — ne valide pas le parcours réel)' if status['llm_simulated'] else ''} ; recherche {status['search_mode']}")
    rep = c.post("/api/documents/refresh").json()
    print(f"Documents : {len(rep['indexed'])} indexés, {len(rep['unusable'])} inexploitables")
    scenarios = yaml.safe_load((ROOT / "evals" / "scenarios" / "scenarios.yaml").read_text(encoding="utf-8"))["scenarios"]
    results = {}
    for sc in scenarios:
        results[sc["id"]] = run_scenario(c, sc)
    auto = [k for k, v in results.items() if v is not None]
    print(f"\nRésultat : {sum(1 for k in auto if results[k])}/{len(auto)} scénarios automatisés réussis ; "
          f"{sum(1 for v in results.values() if v is None)} couverts par les tests unitaires ou à réaliser sur le poste.")
    sys.exit(0 if all(results[k] for k in auto) else 1)


if __name__ == "__main__":
    main()
