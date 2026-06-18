"""Fonte de dados: OpenStreetMap via Overpass API.

Grátis, sem chave, sem cadastro. Consulta os negócios de uma cidade por
nome de área administrativa (no Brasil, município = admin_level 8), com
fallback para bounding box caso a área não seja encontrada.
"""

from __future__ import annotations

import httpx

from .... import config
from ....models import RawPlace
from .base import BusinessSource

# Valores de tag que nos interessam, por chave. shop/craft/office/healthcare
# são pegos por inteiro (qualquer valor); amenity/tourism/leisure são filtrados
# para não trazer coisas não-comerciais (escolas públicas, bancos de praça...).
_AMENITY = (
    "restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|biergarten|"
    "clinic|doctors|dentist|veterinary|pharmacy|car_wash|car_rental|"
    "language_school|driving_school|music_school|prep_school|college|spa"
)
_TOURISM = "hotel|guest_house|hostel|motel|apartment|chalet|resort"
_LEISURE = "fitness_centre|sports_centre|dance|spa"


def _build_query(cidade: str, admin_level: int) -> str:
    """Query OverpassQL buscando negócios dentro da área administrativa."""
    selectors = (
        '  nwr["shop"](area.a);\n'
        f'  nwr["amenity"~"^({_AMENITY})$"](area.a);\n'
        f'  nwr["tourism"~"^({_TOURISM})$"](area.a);\n'
        f'  nwr["leisure"~"^({_LEISURE})$"](area.a);\n'
        '  nwr["craft"](area.a);\n'
        '  nwr["office"](area.a);\n'
        '  nwr["healthcare"](area.a);\n'
    )
    return (
        "[out:json][timeout:90];\n"
        f'area["name"="{cidade}"]["admin_level"="{admin_level}"]->.a;\n'
        f"(\n{selectors});\n"
        "out center tags;"
    )


def _build_query_bbox(bbox: tuple[float, float, float, float]) -> str:
    """Versão por bounding box (fallback se a área por nome falhar)."""
    s, w, n, e = bbox
    b = f"({s},{w},{n},{e})"
    selectors = (
        f'  nwr["shop"]{b};\n'
        f'  nwr["amenity"~"^({_AMENITY})$"]{b};\n'
        f'  nwr["tourism"~"^({_TOURISM})$"]{b};\n'
        f'  nwr["leisure"~"^({_LEISURE})$"]{b};\n'
        f'  nwr["craft"]{b};\n'
        f'  nwr["office"]{b};\n'
        f'  nwr["healthcare"]{b};\n'
    )
    return f"[out:json][timeout:90];\n(\n{selectors});\nout center tags;"


def _parse(elements: list[dict]) -> list[RawPlace]:
    lugares: list[RawPlace] = []
    for el in elements:
        if el.get("type") == "count":
            continue
        # node tem lat/lon direto; way/relation trazem "center" via "out center".
        lat = el.get("lat")
        lon = el.get("lon")
        if lat is None and "center" in el:
            lat = el["center"].get("lat")
            lon = el["center"].get("lon")
        lugares.append(
            RawPlace(
                osm_type=el.get("type", "node"),
                osm_id=el.get("id", 0),
                lat=lat,
                lon=lon,
                tags=el.get("tags", {}) or {},
            )
        )
    return lugares


class OverpassSource(BusinessSource):
    name = "OpenStreetMap (Overpass)"

    def __init__(
        self,
        endpoints: list[str] | None = None,
        timeout: float | None = None,
    ) -> None:
        self.endpoints = endpoints or config.OVERPASS_ENDPOINTS
        self.timeout = timeout or config.HTTP_TIMEOUT

    def _post(self, query: str) -> list[dict]:
        """Tenta cada espelho da Overpass até um responder."""
        ultimo_erro: Exception | None = None
        for url in self.endpoints:
            try:
                resp = httpx.post(
                    url,
                    data={"data": query},
                    timeout=self.timeout,
                    headers={"User-Agent": config.USER_AGENT},
                )
                resp.raise_for_status()
                return resp.json().get("elements", [])
            except Exception as exc:  # noqa: BLE001 - tentamos o próximo espelho
                ultimo_erro = exc
                continue
        raise RuntimeError(
            f"Todos os espelhos da Overpass falharam. Último erro: {ultimo_erro}"
        )

    def fetch(
        self,
        cidade: str,
        admin_level: int = 8,
        limit: int | None = None,
    ) -> list[RawPlace]:
        elements = self._post(_build_query(cidade, admin_level))

        # Se a área por nome não retornou nada, tenta o bounding box (só faz
        # sentido para a cidade default; para outras cidades, não há bbox).
        if not elements and cidade == config.DEFAULT_CITY:
            elements = self._post(_build_query_bbox(config.GUARUJA_BBOX))

        lugares = _parse(elements)
        if limit is not None:
            lugares = lugares[:limit]
        return lugares
