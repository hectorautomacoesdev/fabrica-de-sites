"""Fonte de dados: Google Maps via Serper.dev.

MOTIVAÇÃO
---------
O OpenStreetMap tem ótima cobertura geográfica e é 100% grátis, mas a
cobertura de CONTATOS é baixa (~12,5% dos negócios em Guarujá têm telefone
no OSM). O Google Maps tem cobertura de telefone muito superior.

Serper.dev é um wrapper do Google que custa 0,50 USD / 1.000 buscas e oferece
2.500 buscas gratuitas/mês sem cartão. Um scout completo de Guarujá gasta
~15-20 chamadas (queries por setor), perfeitamente dentro do plano grátis.

CONFIGURAÇÃO
------------
Defina a variável de ambiente SERPER_API_KEY (ver .env.example). Sem a chave,
``SerperSource.fetch()`` simplesmente retorna lista vazia e loga um aviso.
Isso garante que o pipeline não quebra nunca — só que sem enriquecimento.

ESTRATÉGIA DE BUSCA
-------------------
Em vez de buscar um negócio por vez (esgotaria a cota rapidamente), fazemos
buscas POR SETOR: "restaurantes Guarujá SP", "salões de beleza Guarujá SP",
etc. Cada chamada retorna até 20 resultados e custa 1 crédito.

DEDUPLICAÇÃO COM OSM
--------------------
O Serper retorna alguns dos mesmos negócios que o OSM já capturou. O pipeline
do Scout deduplica por similaridade de nome — businesses do Serper cujo nome
é muito similar ao de um business do OSM já carregado são descartados (o OSM
tem coordenadas mais precisas e é a fonte primária). O que SOBRA são negócios
no Google Maps mas ausentes do OSM — geralmente negócios mais informais ou
mais novos que ainda não foram mapeados.

Como bônus: os resultados do Serper JÁ trazem telefone e site, então esses
negócios "novos" ficam imediatamente com contactavel=True.
"""

from __future__ import annotations

import hashlib
import warnings
from typing import Iterator

import httpx

from .... import config
from ....models import RawPlace
from .base import BusinessSource

_SERPER_URL = "https://google.serper.dev/maps"

# Mapeamento: (query_template, tag_chave, tag_valor)
# Para cada linha rodamos uma busca e criamos RawPlaces com aquelas tags.
# Ordem: setores prioritários primeiro para usar a cota com mais valor.
_QUERIES: list[tuple[str, str, str]] = [
    # Alimentação
    ("restaurantes {cidade} SP", "amenity", "restaurant"),
    ("bares {cidade} SP", "amenity", "bar"),
    ("cafés cafeterias {cidade} SP", "amenity", "cafe"),
    ("padarias {cidade} SP", "shop", "bakery"),
    # Beleza
    ("salões de beleza cabeleireiros {cidade} SP", "shop", "hairdresser"),
    ("barbearias {cidade} SP", "shop", "hairdresser"),
    ("estética manicure {cidade} SP", "shop", "beauty"),
    # Saúde
    ("clínicas médicas {cidade} SP", "amenity", "clinic"),
    ("dentistas odontologia {cidade} SP", "amenity", "dentist"),
    ("farmácias {cidade} SP", "amenity", "pharmacy"),
    ("veterinários {cidade} SP", "amenity", "veterinary"),
    # Turismo (Guarujá é cidade de praia)
    ("hotéis {cidade} SP", "tourism", "hotel"),
    ("pousadas {cidade} SP", "tourism", "guest_house"),
    # Fitness
    ("academias {cidade} SP", "leisure", "fitness_centre"),
    # Comércio
    ("supermercados {cidade} SP", "shop", "supermarket"),
    ("lojas roupas {cidade} SP", "shop", "clothes"),
    # Serviços
    ("mecânicos oficinas {cidade} SP", "shop", "car_repair"),
]


def _serper_id(title: str, address: str) -> int:
    """ID estável (não-OSM) para um resultado do Serper.

    Usa MD5 do (título+endereço) truncado a 31 bits. Mantemos positivo para
    não colidir com possíveis OSM IDs (que também são positivos, mas partilham
    o mesmo espaço). O osm_type="serper" já garante separação no pipeline.
    """
    raw = f"{title}|{address}".encode()
    h = hashlib.md5(raw).hexdigest()
    return int(h[:8], 16) & 0x7FFF_FFFF  # 31 bits positivos


def _place_to_raw(place: dict, tag_chave: str, tag_valor: str) -> RawPlace | None:
    """Converte um lugar do Serper em RawPlace com tags compatíveis com o OSM."""
    title = (place.get("title") or "").strip()
    if not title:
        return None

    address = place.get("address") or ""
    tags: dict[str, str] = {
        tag_chave: tag_valor,
        "_source": "serper",
    }
    if title:
        tags["name"] = title
    if address:
        tags["addr:full"] = address
    phone = place.get("phoneNumber")
    if phone:
        tags["phone"] = phone.strip()
    website = place.get("website")
    if website:
        tags["website"] = website.strip()

    lat = place.get("latitude")
    lon = place.get("longitude")

    return RawPlace(
        osm_type="serper",
        osm_id=_serper_id(title, address),
        lat=float(lat) if lat is not None else None,
        lon=float(lon) if lon is not None else None,
        tags=tags,
    )


class SerperSource(BusinessSource):
    """Busca negócios locais via Google Maps (Serper.dev Maps API).

    Requer SERPER_API_KEY. Se a chave não estiver configurada, retorna lista
    vazia com um aviso — o pipeline continua funcionando com o OSM.

    Parâmetros
    ----------
    api_key:
        Chave da API. Se None, lê de config.SERPER_API_KEY.
    cidade:
        Cidade injetada nas queries. Normalmente vem do parâmetro da busca;
        pode ser sobrescrito aqui para testes.
    max_results:
        Máximo de resultados por query (padrão: 20, limite do Serper: 20).
    queries:
        Lista de (query_template, tag_chave, tag_valor). Se None, usa o padrão
        completo. Para testes ou scout parcial, passe uma lista menor.
    """

    name = "Google Maps (Serper.dev)"

    def __init__(
        self,
        api_key: str | None = None,
        max_results: int = 20,
        queries: list[tuple[str, str, str]] | None = None,
    ) -> None:
        self._api_key = api_key or config.SERPER_API_KEY
        self._max_results = min(max_results, 20)
        self._queries = queries if queries is not None else _QUERIES

    def _disponivel(self) -> bool:
        if not self._api_key:
            warnings.warn(
                "SERPER_API_KEY não configurada. "
                "Serper.dev está desativado — configure a chave no .env para enriquecer contatos.",
                stacklevel=3,
            )
            return False
        return True

    def _search(self, query: str) -> list[dict]:
        """Faz uma chamada ao Serper Maps e retorna a lista de lugares."""
        resp = httpx.post(
            _SERPER_URL,
            headers={
                "X-API-KEY": self._api_key,
                "Content-Type": "application/json",
            },
            json={"q": query, "gl": "br", "hl": "pt-br", "num": self._max_results},
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json().get("places", [])

    def fetch(
        self,
        cidade: str,
        admin_level: int = 8,  # noqa: ARG002 — não usado no Serper
        limit: int | None = None,
    ) -> list[RawPlace]:
        if not self._disponivel():
            return []

        lugares: list[RawPlace] = []
        vistos_ids: set[int] = set()

        for query_tpl, tag_chave, tag_valor in self._queries:
            query = query_tpl.format(cidade=cidade)
            try:
                results = self._search(query)
            except Exception as exc:  # noqa: BLE001
                warnings.warn(f"Serper falhou para '{query}': {exc}", stacklevel=2)
                continue

            for place in results:
                raw = _place_to_raw(place, tag_chave, tag_valor)
                if raw is None:
                    continue
                if raw.osm_id in vistos_ids:
                    continue  # duplicata dentro do Serper (mesmo negócio em queries diferentes)
                vistos_ids.add(raw.osm_id)
                lugares.append(raw)

                if limit is not None and len(lugares) >= limit:
                    return lugares

        return lugares
