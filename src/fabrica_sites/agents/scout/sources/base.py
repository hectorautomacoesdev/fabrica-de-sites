"""Interface comum a toda fonte de dados de negócios.

O Scout não sabe (nem se importa) DE ONDE vêm os negócios — só pede a uma
``BusinessSource`` que os entregue como ``RawPlace``. Hoje temos a Overpass
(OpenStreetMap, grátis). Amanhã podemos plugar Serper.dev ou Google Places
implementando esta mesma interface, sem tocar no resto do pipeline.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable

from ....models import RawPlace


class BusinessSource(ABC):
    """Contrato de uma fonte de negócios locais."""

    #: nome curto da fonte (vai para o relatório/banco, ex.: "OpenStreetMap")
    name: str = "desconhecida"

    @abstractmethod
    def fetch(
        self,
        cidade: str,
        admin_level: int = 8,
        limit: int | None = None,
    ) -> Iterable[RawPlace]:
        """Retorna os lugares brutos encontrados para a cidade."""
        raise NotImplementedError
