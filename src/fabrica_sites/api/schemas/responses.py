"""Schemas de resposta (DTOs) para a API.

Separados dos models SQLModel de banco — permitem evoluir a API sem mudar
o schema do banco e vice-versa.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RunRead(BaseModel):
    """Metadados de uma execução do Scout."""

    id: int
    cidade: str
    admin_level: int
    fonte: str
    gerado_em: datetime
    total: int


class BusinessRead(BaseModel):
    """Negócio retornado pela API — subset dos campos do banco."""

    id: int
    run_id: int
    nome: str | None
    org_tipo: str
    setor: str
    setor_nome: str
    lat: float | None
    lon: float | None
    endereco: str | None
    telefone: str | None
    email: str | None
    website: str | None
    website_kind: str
    site_status: str
    score: int
    score_label: str
    contactavel: bool


class KpiRead(BaseModel):
    """KPIs computados de uma run (não persiste, calculado na hora)."""

    total: int
    sem_site: int
    so_social: int
    sem_site_proprio: int
    com_site: int
    contactavel: int
    leads_quentes: int
    pct_sem_site_proprio: float
    pct_contactavel: float


class InsightsRead(BaseModel):
    """KPIs + insights de texto de uma run."""

    run_id: int
    kpis: KpiRead
    insights: list[str]


class RunStartRequest(BaseModel):
    """Corpo do POST /api/scout/runs."""

    cidade: str = Field(default="Guarujá", min_length=2)
    admin_level: int = 8
    limit: int | None = None
    com_serper: bool = False
    enriquecer: bool = False


class RunStartResponse(BaseModel):
    """Resposta do POST /api/scout/runs."""

    run_id: int
    run: RunRead
    insights: InsightsRead
