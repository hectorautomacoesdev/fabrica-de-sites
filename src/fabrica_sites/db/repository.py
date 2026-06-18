"""Acesso a dados — substitui o db.py original (SQL cru).

Todas as funções recebem uma `Session` explícita, tornando a dependência
visível para FastAPI (via Depends) e para o service layer (via context manager).
"""

from __future__ import annotations

import json
from datetime import datetime

from sqlmodel import Session, col, select

from ..models import Business, ScoutRun, SiteStatus, WebsiteKind
from .models import BusinessTable, RunTable


# ---------------------------------------------------------------------------
# Escrita
# ---------------------------------------------------------------------------

def save_run(run: ScoutRun, session: Session) -> int:
    """Persiste um ScoutRun e seus negócios. Retorna o id da run."""
    row = RunTable(
        cidade=run.cidade,
        admin_level=run.admin_level,
        fonte=run.fonte,
        gerado_em=run.gerado_em,
        total=run.total,
    )
    session.add(row)
    session.flush()  # popula row.id sem commitar ainda

    for b in run.negocios:
        session.add(_business_to_table(b, run_id=row.id))  # type: ignore[arg-type]

    session.commit()
    session.refresh(row)
    return row.id  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Leitura
# ---------------------------------------------------------------------------

def latest_run(session: Session) -> ScoutRun | None:
    """Reconstrói a execução mais recente como ScoutRun."""
    run_row = session.exec(
        select(RunTable).order_by(col(RunTable.id).desc()).limit(1)
    ).first()
    if run_row is None:
        return None
    return _reconstruct_run(run_row, session)


def get_run_by_id(run_id: int, session: Session) -> ScoutRun | None:
    """Reconstrói uma execução pelo id."""
    run_row = session.get(RunTable, run_id)
    if run_row is None:
        return None
    return _reconstruct_run(run_row, session)


def list_runs(session: Session, limit: int = 20) -> list[RunTable]:
    """Lista as execuções mais recentes (só metadados, sem negócios)."""
    return list(
        session.exec(
            select(RunTable).order_by(col(RunTable.id).desc()).limit(limit)
        ).all()
    )


def get_businesses(
    run_id: int,
    session: Session,
    *,
    setor: str | None = None,
    site_status: str | None = None,
    contactavel: bool | None = None,
    score_min: int | None = None,
    busca: str | None = None,
    offset: int = 0,
    limit: int = 200,
) -> list[BusinessTable]:
    """Lista negócios de uma run com filtros opcionais."""
    stmt = (
        select(BusinessTable)
        .where(BusinessTable.run_id == run_id)
        .order_by(col(BusinessTable.score).desc())
    )
    if setor:
        stmt = stmt.where(BusinessTable.setor == setor)
    if site_status:
        stmt = stmt.where(BusinessTable.site_status == site_status)
    if contactavel is not None:
        stmt = stmt.where(BusinessTable.contactavel == contactavel)
    if score_min is not None:
        stmt = stmt.where(col(BusinessTable.score) >= score_min)
    if busca:
        term = f"%{busca}%"
        stmt = stmt.where(col(BusinessTable.nome).like(term))
    stmt = stmt.offset(offset).limit(limit)
    return list(session.exec(stmt).all())


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _business_to_table(b: Business, run_id: int) -> BusinessTable:
    return BusinessTable(
        run_id=run_id,
        osm_type=b.osm_type,
        osm_id=b.osm_id,
        nome=b.nome,
        setor=b.setor,
        setor_nome=b.setor_nome,
        lat=b.lat,
        lon=b.lon,
        endereco=b.endereco,
        telefone=b.telefone,
        email=b.email,
        website=b.website,
        website_kind=b.website_kind.value,
        horario=b.horario,
        site_status=b.site_status.value,
        score=b.score,
        score_label=b.score_label,
        contactavel=b.contactavel,
        score_motivos=json.dumps(b.score_motivos, ensure_ascii=False),
        raw_tags=json.dumps(b.raw_tags, ensure_ascii=False),
    )


def _table_to_business(row: BusinessTable) -> Business:
    return Business(
        osm_type=row.osm_type or "node",
        osm_id=row.osm_id or 0,
        nome=row.nome,
        setor=row.setor,
        setor_nome=row.setor_nome,
        lat=row.lat,
        lon=row.lon,
        endereco=row.endereco,
        telefone=row.telefone,
        email=row.email,
        website=row.website,
        website_kind=WebsiteKind(row.website_kind),
        horario=row.horario,
        site_status=SiteStatus(row.site_status),
        score=row.score,
        score_label=row.score_label,
        contactavel=row.contactavel,
        score_motivos=json.loads(row.score_motivos or "[]"),
        raw_tags=json.loads(row.raw_tags or "{}"),
    )


def _reconstruct_run(run_row: RunTable, session: Session) -> ScoutRun:
    business_rows = session.exec(
        select(BusinessTable)
        .where(BusinessTable.run_id == run_row.id)
        .order_by(col(BusinessTable.score).desc())
    ).all()
    return ScoutRun(
        cidade=run_row.cidade,
        admin_level=run_row.admin_level,
        fonte=run_row.fonte,
        gerado_em=run_row.gerado_em,
        negocios=[_table_to_business(r) for r in business_rows],
    )
