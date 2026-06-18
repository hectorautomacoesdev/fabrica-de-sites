"""Router do Scout — dispara uma nova coleta via POST."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ... import config
from ...agents.scout.enrichers import DomainGuesser
from ...agents.scout.sources import OverpassSource, SerperSource
from ...services import scout_service
from ..deps import SessionDep
from ..schemas.responses import InsightsRead, KpiRead, RunRead, RunStartRequest, RunStartResponse

router = APIRouter(prefix="/api/scout", tags=["Scout"])


@router.post("/runs", response_model=RunStartResponse, status_code=201)
def start_run(body: RunStartRequest, session: SessionDep) -> RunStartResponse:
    """Dispara uma nova coleta do Scout para a cidade informada.

    A coleta roda de forma síncrona; pode levar de 3 s (só OSM) a ~90 s
    (OSM + Serper + DomainGuesser). Em produção, mover para background task.
    """
    sources = [OverpassSource()]
    if body.com_serper:
        if not config.SERPER_API_KEY:
            raise HTTPException(
                status_code=422,
                detail="com_serper=true mas SERPER_API_KEY não está configurada no servidor.",
            )
        sources.append(SerperSource())

    enrichers = []
    if body.enriquecer:
        enrichers.append(DomainGuesser())

    run_id, run = scout_service.run_and_save(
        cidade=body.cidade,
        admin_level=body.admin_level,
        limit=body.limit,
        sources=sources,
        enrichers=enrichers or None,
        session=session,
    )

    dados = scout_service.get_insights(run)
    kpis = dados["kpis"]

    run_read = RunRead(
        id=run_id,
        cidade=run.cidade,
        admin_level=run.admin_level,
        fonte=run.fonte,
        gerado_em=run.gerado_em,
        total=run.total,
    )
    insights_read = InsightsRead(
        run_id=run_id,
        kpis=KpiRead(**kpis),
        insights=dados["insights"],
    )
    return RunStartResponse(run_id=run_id, run=run_read, insights=insights_read)
