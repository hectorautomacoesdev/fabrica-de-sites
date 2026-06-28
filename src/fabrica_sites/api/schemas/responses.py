"""Schemas de resposta (DTOs) para a API.

Separados dos models SQLModel de banco — permitem evoluir a API sem mudar
o schema do banco e vice-versa.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


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
    telefone2: str | None = None
    email: str | None
    email2: str | None = None
    website: str | None
    website_kind: str
    horario: str | None = None
    site_status: str
    score: int
    score_label: str
    contactavel: bool
    score_motivos: list[str] = Field(default_factory=list)
    resumo: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    linkedin: str | None = None
    resumo_manual: str | None = None
    notas: list[dict[str, Any]] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class BusinessPatch(BaseModel):
    """Campos editáveis de um negócio (PATCH). Apenas campos presentes são atualizados."""

    model_config = ConfigDict(extra='ignore')

    # Inputs do scorer (trigger re-score automático)
    website_kind: str | None = None
    org_tipo: str | None = None

    # Contato
    telefone: str | None = None
    telefone2: str | None = None
    email: str | None = None
    email2: str | None = None
    endereco: str | None = None
    horario: str | None = None

    # Presença online
    website: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    linkedin: str | None = None

    # Conteúdo manual
    resumo_manual: str | None = None
    notas: list[dict[str, Any]] | None = None
    tags: list[str] | None = None


class SectorStat(BaseModel):
    """Agregação de uma run por setor — alimenta o overview de categorias."""

    key: str
    nome: str
    emoji: str
    cor: str
    prioritario: bool
    total: int
    sem_site: int
    so_social: int
    com_site: int
    contactavel: int           # negócios com telefone/e-mail no setor
    oportunidade: int          # sem_site + so_social (mercado imediato)
    oportunidade_pct: float
    score_medio: float
    leads_quentes: int


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


class SubsetorStat(BaseModel):
    """Contagens de um subsetor dentro de um setor de uma run."""

    subsetor: str
    total: int
    sem_site: int
    so_social: int
    com_site: int
    contactavel: int
    leads_quentes: int


class InsightsRead(BaseModel):
    """KPIs + insights de texto + agregação por setor de uma run."""

    run_id: int
    kpis: KpiRead
    insights: list[str]
    por_setor: list[SectorStat] = Field(default_factory=list)
    status_dist: dict[str, int] = Field(default_factory=dict)
    # Subsetores agrupados por setor_key → lista ordenada por total desc.
    por_subsetor: dict[str, list[SubsetorStat]] = Field(default_factory=dict)


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
