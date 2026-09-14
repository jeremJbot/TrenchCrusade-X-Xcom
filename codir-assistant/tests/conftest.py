import os
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "evals" / "fixtures"


@pytest.fixture
def workspace(tmp_path: Path):
    docs = tmp_path / "documents"
    docs.mkdir()
    for name in ("note_organisation_fictive.md", "calendrier_budgetaire_fictif.docx", "scan_sans_texte_fictif.pdf", "image_non_supportee.png"):
        shutil.copy(FIXTURES / name, docs / name)
    return tmp_path


def make_settings(tmp_path: Path):
    from app.config import Settings
    return Settings(data_dir=tmp_path, docs_dir=tmp_path / "documents", llm_provider="simulated", stt_provider="none",
                    tts_provider="none", embeddings_provider="none", intervention_min_delay_s=0)


@pytest.fixture
def client(workspace):
    from app.main import create_app
    app = create_app(make_settings(workspace))
    with TestClient(app) as c:
        c.app = app
        yield c


def new_client(workspace):
    """Redémarrage simulé : nouvelle application sur la même base."""
    from app.main import create_app
    app = create_app(make_settings(workspace))
    return TestClient(app)
