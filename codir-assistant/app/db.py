"""Accès SQLite et migrations versionnées (répertoire migrations/)."""
from __future__ import annotations

import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .config import BASE_DIR

MIGRATIONS_DIR = BASE_DIR / "migrations"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class Database:
    """Connexion SQLite partagée, sérialisée par un verrou (pilote monoposte)."""

    def __init__(self, path: Path | str):
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.execute("PRAGMA journal_mode = WAL")
        self.lock = threading.RLock()
        self.migrate()

    def migrate(self) -> None:
        with self.lock:
            self.conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
            applied = {r[0] for r in self.conn.execute("SELECT version FROM schema_migrations")}
            for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
                version = int(sql_file.name.split("_", 1)[0])
                if version in applied:
                    continue
                self.conn.executescript(sql_file.read_text(encoding="utf-8"))
                self.conn.execute(
                    "INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)", (version, now_iso())
                )
                self.conn.commit()

    def execute(self, sql: str, params: tuple | list = ()) -> sqlite3.Cursor:
        with self.lock:
            cur = self.conn.execute(sql, params)
            self.conn.commit()
            return cur

    def query(self, sql: str, params: tuple | list = ()) -> list[dict]:
        with self.lock:
            return [dict(r) for r in self.conn.execute(sql, params).fetchall()]

    def one(self, sql: str, params: tuple | list = ()) -> dict | None:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    def get_setting(self, key: str, default: str | None = None) -> str | None:
        row = self.one("SELECT value FROM settings WHERE key = ?", (key,))
        return row["value"] if row else default

    def set_setting(self, key: str, value: str) -> None:
        self.execute(
            "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )

    def close(self) -> None:
        with self.lock:
            self.conn.close()
