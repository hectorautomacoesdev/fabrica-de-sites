"""Orquestração do Agente Scout.

Pipeline em três estágios:
  1. COLETA  — uma ou mais BusinessSources entregam RawPlace[]
  2. CLASSIF — cada RawPlace vira um Business (extração + pontuação)
  3. ENRIQ   — BusinessEnricher[] melhoram os dados (opcional)

Responsabilidade única: transformar fontes brutas em um ScoutRun limpo.
I/O (banco, relatório, impressão) fica na CLI.
"""

from __future__ import annotations

import re
import unicodedata

from ...models import Business, RawPlace, ScoutRun
from . import classifier, scorer
from .enrichers.base import BusinessEnricher
from .sources import BusinessSource, OverpassSource


# ---------------------------------------------------------------------------
# Deduplicação por similaridade de nome (multi-fonte)
# ---------------------------------------------------------------------------

def _normalizar(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9\s]", "", s).strip()


def _bigrams(s: str) -> frozenset[str]:
    s = re.sub(r"\s+", " ", s)
    return frozenset(s[i : i + 2] for i in range(len(s) - 1))


def _similar(a: str | None, b: str | None, threshold: float = 0.45) -> bool:
    """True se nomes forem similares o suficiente para representar o mesmo negócio.

    Usa coeficiente de Jaccard sobre bigramas de caracteres normalizados.
    Limiar padrão de 0,45 é permissivo o suficiente para pegar "Drogasil" ↔
    "Farmácia Drogasil" mas restritivo o suficiente para não confundir
    "Restaurante A" com "Restaurante B".
    """
    if not a or not b:
        return False
    na, nb = _normalizar(a), _normalizar(b)
    if na == nb:
        return True
    ba, bb = _bigrams(na), _bigrams(nb)
    if not ba or not bb:
        return False
    inter = len(ba & bb)
    union = len(ba | bb)
    return (inter / union) >= threshold if union else False


# ---------------------------------------------------------------------------
# Construção de um Business a partir de um RawPlace
# ---------------------------------------------------------------------------

def build_business(raw: RawPlace) -> Business:
    """Aplica extração + score a um lugar bruto → Business."""
    campos = classifier.extract(raw)
    avaliacao = scorer.score(campos)
    return Business(**campos, **avaliacao)


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def run_scout(
    cidade: str,
    admin_level: int = 8,
    limit: int | None = None,
    # Compatibilidade retroativa: `source` é o parâmetro original.
    source: BusinessSource | None = None,
    # Novos parâmetros: múltiplas fontes e enriquecedores.
    sources: list[BusinessSource] | None = None,
    enrichers: list[BusinessEnricher] | None = None,
) -> ScoutRun:
    """Roda o Scout para uma cidade e devolve um ScoutRun.

    Lógica de fontes:
    - Se ``source`` for passado: usa só ela (retrocompatibilidade com testes).
    - Se ``sources`` for passado: usa a lista.
    - Padrão (nenhum dos dois): apenas OverpassSource.
    """
    # Resolve a lista de fontes.
    if source is not None:
        lista_fontes = [source]
    elif sources is not None:
        lista_fontes = sources
    else:
        lista_fontes = [OverpassSource()]

    # ---- ESTÁGIO 1: COLETA ------------------------------------------------
    brutos_por_fonte: list[tuple[str, list[RawPlace]]] = []
    for src in lista_fontes:
        raw_list = list(src.fetch(cidade, admin_level=admin_level, limit=limit))
        brutos_por_fonte.append((src.name, raw_list))

    # ---- ESTÁGIO 2: CLASSIFICAÇÃO + DEDUPLICAÇÃO --------------------------
    # Primeira passada: dedup por (osm_type, osm_id) — garante que uma fonte
    # não traga o mesmo ponto OSM duas vezes.
    vistos_ids: set[tuple[str, int]] = set()
    negocios: list[Business] = []
    for _nome_fonte, brutos in brutos_por_fonte:
        for raw in brutos:
            chave = (raw.osm_type, raw.osm_id)
            if chave in vistos_ids:
                continue
            vistos_ids.add(chave)
            negocios.append(build_business(raw))

    # Segunda passada: dedup por similaridade de nome (fontes diferentes podem
    # reportar o mesmo negócio com IDs distintos — ex. OSM vs. Serper).
    # Estratégia: mantemos o primeiro encontrado (fonte primária), descartamos
    # duplicatas de fontes secundárias.
    if len(lista_fontes) > 1:
        unicos: list[Business] = []
        for b in negocios:
            if not any(_similar(b.nome, u.nome) for u in unicos):
                unicos.append(b)
        negocios = unicos

    # ---- ESTÁGIO 3: ENRIQUECIMENTO ----------------------------------------
    if enrichers:
        for enricher in enrichers:
            negocios = enricher.enrich(negocios, cidade)

    negocios.sort(key=lambda b: b.score, reverse=True)

    # Nome da fonte para o relatório.
    nomes_fontes = [src.name for src in lista_fontes]
    fonte_str = " + ".join(nomes_fontes) if len(nomes_fontes) > 1 else nomes_fontes[0]

    return ScoutRun(
        cidade=cidade,
        admin_level=admin_level,
        fonte=fonte_str,
        negocios=negocios,
    )
