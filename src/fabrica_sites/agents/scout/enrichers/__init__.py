"""Enriquecedores: etapas de pós-processamento que melhoram os dados coletados.

Diferença de uma ``BusinessSource``: a fonte ENCONTRA negócios; o enriquecedor
MELHORA negócios já encontrados (ex.: adiciona telefone, descobre site oculto).
"""

from .base import BusinessEnricher
from .domain_guesser import DomainGuesser

__all__ = ["BusinessEnricher", "DomainGuesser"]
