"""Modelos de banco de dados (SQLModel, table=True).

Nota: NÃO use `from __future__ import annotations` aqui — o metaclass do
SQLModel precisa inspecionar as anotações em tempo de definição de classe.
"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class RunTable(SQLModel, table=True):
    """Uma execução do Scout — metadados e totais."""

    __tablename__ = "runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    cidade: str
    admin_level: int
    fonte: str
    gerado_em: datetime
    total: int


class BusinessTable(SQLModel, table=True):
    """Negócio encontrado pelo Scout, ligado a uma RunTable."""

    __tablename__ = "businesses"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="runs.id", index=True)

    # Identidade
    osm_type: Optional[str] = None
    osm_id: Optional[int] = None
    nome: Optional[str] = None

    # Tipo de organização
    org_tipo: str = "independente"  # valor de OrgTipo

    # Setor
    setor: str = "outros"
    setor_nome: str = "Outros"

    # Localização
    lat: Optional[float] = None
    lon: Optional[float] = None
    endereco: Optional[str] = None

    # Contato
    telefone: Optional[str] = None
    telefone2: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    website: Optional[str] = None
    website_kind: str = "nenhum"      # valor de WebsiteKind
    horario: Optional[str] = None

    # Redes sociais (editáveis manualmente)
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    linkedin: Optional[str] = None

    # Avaliação
    site_status: str = "DESCONHECIDO"  # valor de SiteStatus
    score: int = 0
    score_label: str = "BAIXA"
    contactavel: bool = False
    score_motivos: str = "[]"          # JSON list[str]
    raw_tags: str = "{}"               # JSON dict[str, str]

    # Conteúdo manual
    resumo_manual: Optional[str] = None
    notas: Optional[str] = None        # JSON list[{id, texto, criado_em}]
    tags: Optional[str] = None         # JSON list[str] de tags manuais
