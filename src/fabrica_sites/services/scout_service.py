"""Scout service — orquestração do pipeline reutilizável por CLI e API.

Encapsula: montar fontes/enriquecedores → run_scout → persistir → insights.
A CLI e a API chamam este módulo; nenhuma delas faz acesso a dados diretamente.
"""

from __future__ import annotations

from sqlmodel import Session

from .. import config
from ..agents.scout import insighter
from ..agents.scout.enrichers.base import BusinessEnricher
from ..agents.scout.scout import run_scout
from ..agents.scout.sources.base import BusinessSource
from ..db import repository
from ..db.engine import get_engine
from ..models import ScoutRun


def run_and_save(
    cidade: str = config.DEFAULT_CITY,
    admin_level: int = config.DEFAULT_ADMIN_LEVEL,
    limit: int | None = None,
    sources: list[BusinessSource] | None = None,
    enrichers: list[BusinessEnricher] | None = None,
    session: Session | None = None,
) -> tuple[int, ScoutRun]:
    """Executa o Scout, persiste no banco e devolve (run_id, ScoutRun).

    Se ``session`` não for fornecida, cria uma sessão temporária (útil na CLI).
    Para FastAPI, passe a sessão do `Depends(get_session)` para participar da
    transação do request.
    """
    run = run_scout(
        cidade,
        admin_level=admin_level,
        limit=limit,
        sources=sources,
        enrichers=enrichers,
    )

    if session is not None:
        run_id = repository.save_run(run, session)
    else:
        with Session(get_engine()) as s:
            run_id = repository.save_run(run, s)

    return run_id, run


def get_insights(run: ScoutRun) -> dict:
    """Calcula KPIs e insights de texto de um ScoutRun.

    Wrapper fino que expõe `insighter.compute` para quem não importa agents/.
    """
    return insighter.compute(run)
