"""Router de runs — lista, detalhe, negócios e insights."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query, Response

from ...agents.scout import scorer as scout_scorer
from ...agents.scout.resumo import gerar_resumo
from ...agents.scout.subsetores import classificar_subsetor
from ...db import repository
from ...models import WebsiteKind
from ...services import scout_service
from ..deps import SessionDep
from ..schemas.responses import BusinessPatch, BusinessRead, InsightsRead, KpiRead, RunRead, SectorStat, SubsetorStat

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
    por_subsetor_raw: dict = dados.get("por_subsetor", {})
    return InsightsRead(
        run_id=run_id,
        kpis=KpiRead(**kpis),
        insights=dados["insights"],
        por_setor=[SectorStat(**s) for s in dados["por_setor"]],
        status_dist=dados["status_dist"],
        por_subsetor={
            setor_key: [SubsetorStat(**sub) for sub in subs]
            for setor_key, subs in por_subsetor_raw.items()
        },
    )


@router.get("/{run_id}/businesses", response_model=list[BusinessRead])
def get_businesses(
    run_id: int,
    session: SessionDep,
    response: Response,
    setor: str | None = Query(None),
    subsetor: str | None = Query(None, description="Subsetor derivado de raw_tags (filtro em memória)."),
    site_status: str | None = Query(None),
    contactavel: bool | None = Query(None),
    score_min: int | None = Query(None, ge=0, le=100),
    busca: str | None = Query(None, min_length=2),
    org_tipo: str | None = Query(None, pattern="^(independente|publico|rede)$"),
    tag: str | None = Query(None, description="Filtra negócios que possuem essa tag."),
    order_by: str = Query(
        "score",
        pattern="^(score|nome|setor|setor_nome|site_status|score_label|contactavel)$",
        description="Coluna de ordenação.",
    ),
    order_dir: str = Query("desc", pattern="^(asc|desc)$"),
    offset: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=5000),
) -> list[BusinessRead]:
    """Lista negócios de uma run com filtros, ordenação e paginação.

    O **total** de registros que casam com os filtros (ignorando ``offset``/
    ``limit``) é devolvido no header ``X-Total-Count`` — base para a paginação
    do frontend.

    O parâmetro ``subsetor`` filtra pelo subsetor derivado das ``raw_tags`` do
    OSM (ex.: "Pizzaria", "Dentista"). Como o subsetor não está armazenado no
    banco, o filtro é aplicado em memória sobre os registros já filtrados pelos
    demais critérios — eficiente pois o ``setor`` costuma reduzir para < 200 rows.
    """
    filtros = dict(
        setor=setor,
        site_status=site_status,
        contactavel=contactavel,
        score_min=score_min,
        busca=busca,
        org_tipo=org_tipo,
        tag=tag,
    )

    if subsetor:
        # Busca tudo (até 5000) já filtrado pelos outros critérios e aplica o
        # filtro de subsetor em Python — viável pois o setor reduz bastante o N.
        all_rows = repository.get_businesses(
            run_id, session, order_by=order_by, order_dir=order_dir,
            offset=0, limit=5000, **filtros,
        )
        matching = [
            r for r in all_rows
            if classificar_subsetor(r.setor, json.loads(r.raw_tags or "{}")) == subsetor
        ]
        response.headers["X-Total-Count"] = str(len(matching))
        rows = matching[offset: offset + limit]
    else:
        response.headers["X-Total-Count"] = str(
            repository.count_businesses(run_id, session, **filtros)
        )
        rows = repository.get_businesses(
            run_id, session, order_by=order_by, order_dir=order_dir,
            offset=offset, limit=limit, **filtros,
        )

    return [_row_to_read(r) for r in rows]


def _row_to_read(r) -> BusinessRead:  # type: ignore[return]
    """Converte uma linha do banco em BusinessRead (DTO de saída)."""
    resumo = r.resumo_manual or gerar_resumo(repository.table_to_business(r))
    return BusinessRead(
        id=r.id,  # type: ignore[arg-type]
        run_id=r.run_id,
        nome=r.nome,
        org_tipo=r.org_tipo,
        setor=r.setor,
        setor_nome=r.setor_nome,
        lat=r.lat,
        lon=r.lon,
        endereco=r.endereco,
        telefone=r.telefone,
        telefone2=r.telefone2,
        email=r.email,
        email2=r.email2,
        website=r.website,
        website_kind=r.website_kind,
        horario=r.horario,
        site_status=r.site_status,
        score=r.score,
        score_label=r.score_label,
        contactavel=r.contactavel,
        score_motivos=json.loads(r.score_motivos or "[]"),
        resumo=resumo,
        instagram=r.instagram,
        facebook=r.facebook,
        linkedin=r.linkedin,
        resumo_manual=r.resumo_manual,
        notas=json.loads(r.notas or "[]"),
        tags=json.loads(r.tags or "[]"),
    )


# Campos que disparam recálculo do score quando editados
_SCORE_TRIGGER = frozenset({"website_kind", "org_tipo", "telefone", "telefone2", "email", "email2", "endereco", "horario"})


@router.patch("/{run_id}/businesses/{business_id}", response_model=BusinessRead)
def patch_business(
    run_id: int,
    business_id: int,
    patch: BusinessPatch,
    session: SessionDep,
) -> BusinessRead:
    """Edita campos de um negócio e, se necessário, recalcula o score."""
    row = repository.get_business_by_id(business_id, session)
    if row is None or row.run_id != run_id:
        raise HTTPException(status_code=404, detail=f"Business {business_id} não encontrado na run {run_id}.")

    update_data = patch.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("notas", "tags"):
            setattr(row, field, json.dumps(value, ensure_ascii=False))
        else:
            setattr(row, field, value)

    if update_data.keys() & _SCORE_TRIGGER:
        score_input = {
            "website_kind": WebsiteKind(row.website_kind),
            "org_tipo": row.org_tipo,
            "telefone": row.telefone,
            "telefone2": row.telefone2,
            "email": row.email,
            "email2": row.email2,
            "endereco": row.endereco,
            "horario": row.horario,
            "setor": row.setor,
        }
        result = scout_scorer.score(score_input)
        row.site_status = result["site_status"].value
        row.score = result["score"]
        row.score_label = result["score_label"]
        row.score_motivos = json.dumps(result["score_motivos"], ensure_ascii=False)
        row.contactavel = result["contactavel"]

    session.add(row)
    session.commit()
    session.refresh(row)
    return _row_to_read(row)
