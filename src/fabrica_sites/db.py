"""Persistência em SQLite (biblioteca padrão, sem dependência externa).

Duas tabelas:
- ``runs``: uma linha por execução do Scout (cidade, data, total).
- ``businesses``: os negócios encontrados, ligados a uma run.

Guardamos as tags cruas como JSON, para podermos reprocessar/auditar depois
sem ter que consultar o OpenStreetMap de novo.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path

from .models import Business, ScoutRun, SiteStatus, WebsiteKind

_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cidade      TEXT    NOT NULL,
    admin_level INTEGER NOT NULL,
    fonte       TEXT    NOT NULL,
    gerado_em   TEXT    NOT NULL,
    total       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS businesses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    osm_type      TEXT,
    osm_id        INTEGER,
    nome          TEXT,
    setor         TEXT,
    setor_nome    TEXT,
    lat           REAL,
    lon           REAL,
    endereco      TEXT,
    telefone      TEXT,
    email         TEXT,
    website       TEXT,
    website_kind  TEXT,
    horario       TEXT,
    site_status   TEXT,
    score         INTEGER,
    score_label   TEXT,
    contactavel   INTEGER,
    score_motivos TEXT,
    raw_tags      TEXT
);

CREATE INDEX IF NOT EXISTS idx_business_run ON businesses(run_id);
"""


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(_SCHEMA)
    return conn


def save_run(conn: sqlite3.Connection, run: ScoutRun) -> int:
    """Grava uma execução e seus negócios. Retorna o id da run."""
    cur = conn.execute(
        "INSERT INTO runs (cidade, admin_level, fonte, gerado_em, total) "
        "VALUES (?, ?, ?, ?, ?)",
        (run.cidade, run.admin_level, run.fonte,
         run.gerado_em.isoformat(), run.total),
    )
    run_id = int(cur.lastrowid)

    conn.executemany(
        """INSERT INTO businesses (
            run_id, osm_type, osm_id, nome, setor, setor_nome, lat, lon,
            endereco, telefone, email, website, website_kind, horario,
            site_status, score, score_label, contactavel, score_motivos, raw_tags
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        [
            (
                run_id, b.osm_type, b.osm_id, b.nome, b.setor, b.setor_nome,
                b.lat, b.lon, b.endereco, b.telefone, b.email, b.website,
                b.website_kind.value, b.horario, b.site_status.value, b.score,
                b.score_label, int(b.contactavel),
                json.dumps(b.score_motivos, ensure_ascii=False),
                json.dumps(b.raw_tags, ensure_ascii=False),
            )
            for b in run.negocios
        ],
    )
    conn.commit()
    return run_id


def latest_run(conn: sqlite3.Connection) -> ScoutRun | None:
    """Reconstrói a execução mais recente a partir do banco."""
    row = conn.execute(
        "SELECT * FROM runs ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        return None

    negocios_rows = conn.execute(
        "SELECT * FROM businesses WHERE run_id = ? ORDER BY score DESC",
        (row["id"],),
    ).fetchall()

    negocios = [
        Business(
            osm_type=r["osm_type"], osm_id=r["osm_id"], nome=r["nome"],
            setor=r["setor"], setor_nome=r["setor_nome"],
            lat=r["lat"], lon=r["lon"], endereco=r["endereco"],
            telefone=r["telefone"], email=r["email"], website=r["website"],
            website_kind=WebsiteKind(r["website_kind"]),
            horario=r["horario"], site_status=SiteStatus(r["site_status"]),
            score=r["score"], score_label=r["score_label"],
            contactavel=bool(r["contactavel"]),
            score_motivos=json.loads(r["score_motivos"] or "[]"),
            raw_tags=json.loads(r["raw_tags"] or "{}"),
        )
        for r in negocios_rows
    ]

    return ScoutRun(
        cidade=row["cidade"], admin_level=row["admin_level"],
        fonte=row["fonte"], gerado_em=datetime.fromisoformat(row["gerado_em"]),
        negocios=negocios,
    )
