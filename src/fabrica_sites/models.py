"""Modelos de dados (Pydantic v2).

São as "formas" dos dados que circulam pelo Scout: um lugar bruto vindo do
OpenStreetMap (RawPlace) e o negócio já classificado e pontuado (Business).
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class OrgTipo(str, Enum):
    """Tipo de organização — determina se é um lead válido para a Fábrica."""

    INDEPENDENTE = "independente"  # negócio local/independente — nosso mercado
    PUBLICO = "publico"            # órgão público (UPA, prefeitura, escola) — fora
    REDE = "rede"                  # rede/franquia com site corporativo — fora


class SiteStatus(str, Enum):
    """Situação do negócio quanto a ter site."""

    SEM_SITE = "SEM_SITE"                # nenhuma presença web detectada
    SO_REDE_SOCIAL = "SO_REDE_SOCIAL"    # só Facebook/Instagram/Linktree/etc.
    COM_SITE = "COM_SITE"                # tem site próprio (Auditor avalia depois)
    DESCONHECIDO = "DESCONHECIDO"


class WebsiteKind(str, Enum):
    """Tipo do link encontrado no campo de site."""

    NENHUM = "nenhum"
    REDE_SOCIAL = "rede_social"
    PROPRIO = "proprio"


class RawPlace(BaseModel):
    """Lugar cru, exatamente como veio da fonte (Overpass). Sem julgamento."""

    osm_type: str
    osm_id: int
    lat: float | None = None
    lon: float | None = None
    tags: dict[str, str] = Field(default_factory=dict)


class Business(BaseModel):
    """Negócio classificado e pontuado — a unidade central do Scout."""

    # Identidade (vinda do OSM)
    osm_type: str
    osm_id: int
    nome: str | None = None

    # Tipo de organização
    org_tipo: OrgTipo = OrgTipo.INDEPENDENTE

    # Classificação de setor
    setor: str = "outros"
    setor_nome: str = "Outros"

    # Localização
    lat: float | None = None
    lon: float | None = None
    endereco: str | None = None

    # Contato
    telefone: str | None = None
    email: str | None = None
    website: str | None = None
    website_kind: WebsiteKind = WebsiteKind.NENHUM

    # Operação
    horario: str | None = None

    # Avaliação de oportunidade
    site_status: SiteStatus = SiteStatus.DESCONHECIDO
    score: int = 0
    score_label: str = "BAIXA"
    score_motivos: list[str] = Field(default_factory=list)
    contactavel: bool = False

    # Dados brutos para auditoria/depuração
    raw_tags: dict[str, str] = Field(default_factory=dict)

    @property
    def osm_url(self) -> str:
        """Link para ver/editar o ponto no OpenStreetMap."""
        return f"https://www.openstreetmap.org/{self.osm_type}/{self.osm_id}"

    @property
    def maps_url(self) -> str | None:
        """Link para o Google Maps pela coordenada (útil para conferência manual)."""
        if self.lat is None or self.lon is None:
            return None
        return f"https://www.google.com/maps/search/?api=1&query={self.lat},{self.lon}"


class ScoutRun(BaseModel):
    """Uma execução do Scout: metadados + os negócios encontrados."""

    cidade: str
    admin_level: int
    fonte: str
    gerado_em: datetime = Field(default_factory=datetime.now)
    negocios: list[Business] = Field(default_factory=list)

    @property
    def total(self) -> int:
        return len(self.negocios)
