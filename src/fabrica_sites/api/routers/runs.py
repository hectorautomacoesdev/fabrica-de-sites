"""Router de runs — lista, detalhe, negócios e insights."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response

from ...db import repository
from ...services import scout_service
from ..deps import SessionDep
from ..schemas.responses import BusinessRead, InsightsRead, KpiRead, RunRead

router = APIRouter(prefix="/api/runs", tags=["Runs"])


@router.get("", response_model=list[RunRead])
def list_runs(session: SessionDep, limit: int = Query(20, ge=1, le=100)) -> list[RunRead]:
    """Lista as execuções mais recentes (só metadados)."""
    rows = repository.list_runs(session, limit=limit)
    return [
        RunRead(
            id=r.id,  # type: ignore[arg-type]
            cidade=r.cidade,
            admin_level=r.admin_level,
            fonte=r.fonte,
            gerado_em=r.gerado_em,
            total=r.total,
        )
        for r in rows
    ]


@router.get("/{run_id}", response_model=RunRead)
def get_run(run_id: int, session: SessionDep) -> RunRead:
    """Detalhes de uma run (metadados + total)."""
    run = repository.get_run_by_id(run_id, session)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} não encontrada.")
    return RunRead(
        id=run_id,
        cidade=run.cidade,
        admin_level=run.admin_level,
        fonte=run.fonte,
        gerado_em=run.gerado_em,
        total=run.total,
    )


@router.get("/{run_id}/insights", response_model=InsightsRead)
def get_insights(run_id: int, session: SessionDep) -> InsightsRead:
    """KPIs e insights de texto de uma run."""
    run = repository.get_run_by_id(run_id, session)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} não encontrada.")
    dados = scout_service.get_insights(run)
    kpis = dados["kpis"]
    return InsightsRead(run_id=run_id, kpis=KpiRead(**kpis), insights=dados["insights"])


@router.get("/{run_id}/businesses", response_model=list[BusinessRead])
def get_businesses(
    run_id: int,
    session: SessionDep,
    response: Response,
    setor: str | None = Query(None),
    site_status: str | None = Query(None),
    contactavel: bool | None = Query(None),
    score_min: int | None = Query(None, ge=0, le=100),
    busca: str | None = Query(None, min_length=2),
    order_by: str = Query(
        "score",
        pattern="^(score|nome|setor|setor_nome|site_status|score_label|contactavel)$",
        description="Coluna de ordenação.",
    ),
    order_dir: str = Query("desc", pattern="^(asc|desc)$"),
    offset: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
) -> list[BusinessRead]:
    """Lista negócios de uma run com filtros, ordenação e paginação.

    O **total** de registros que casam com os filtros (ignorando ``offset``/
    ``limit``) é devolvido no header ``X-Total-Count`` — base para a paginação
    do frontend.
    """
    filtros = dict(
        setor=setor,
        site_status=site_status,
        contactavel=contactavel,
        score_min=score_min,
        busca=busca,
    )
    response.headers["X-Total-Count"] = str(
        repository.count_businesses(run_id, session, **filtros)
    )
    rows = repository.get_businesses(
        run_id,
        session,
        order_by=order_by,
        order_dir=order_dir,
        offset=offset,
        limit=limit,
        **filtros,
    )
    return [
        BusinessRead(
            id=r.id,  # type: ignore[arg-type]
            run_id=r.run_id,
            nome=r.nome,
            setor=r.setor,
            setor_nome=r.setor_nome,
            lat=r.lat,
            lon=r.lon,
            endereco=r.endereco,
            telefone=r.telefone,
            email=r.email,
            website=r.website,
            website_kind=r.website_kind,
            site_status=r.site_status,
            score=r.score,
            score_label=r.score_label,
            contactavel=r.contactavel,
        )
        for r in rows
    ]
