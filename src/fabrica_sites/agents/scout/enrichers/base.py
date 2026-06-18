"""Interface base para enriquecedores de negócios.

Um BusinessEnricher recebe a lista de negócios JÁ classificados e pontuados
e devolve a mesma lista, potencialmente com mais informações (telefone
descoberto, site encontrado, coordenadas enriquecidas, etc.).

Por que separar de BusinessSource?
- Source = descobre negócios (de onde vêm os dados brutos)
- Enricher = melhora negócios já encontrados (adiciona info que a fonte não tinha)

Isso mantém cada etapa com responsabilidade única e facilita testar, ativar
ou desativar cada enriquecedor de forma independente.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from ....models import Business


class BusinessEnricher(ABC):
    """Contrato de um enriquecedor de negócios."""

    #: nome curto para logs e relatórios
    name: str = "desconhecido"

    @abstractmethod
    def enrich(
        self,
        businesses: list[Business],
        cidade: str,
    ) -> list[Business]:
        """Recebe a lista classificada e devolve a lista enriquecida.

        A implementação pode criar novas instâncias (imutável) ou devolver a
        lista com os objetos originais se não houve mudança.
        """
        raise NotImplementedError
