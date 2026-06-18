"""Taxonomia de setores e mapeamento a partir de tags do OpenStreetMap.

Este é o conhecimento de "contexto" do Scout: dado o conjunto de tags de um
ponto no OSM (ex.: ``{"shop": "hairdresser"}``), dizemos a que setor de
negócio ele pertence.

A ordem da lista SECTORS importa: setores específicos vêm primeiro e o
"Comércio & Lojas" (que casa qualquer ``shop=*``) vem por último, como
captura-tudo do varejo. "Outros" é o fallback final.

Cada setor traz uma cor (usada nos gráficos e no mapa do relatório) e um
sinalizador de prioridade (setores no foco inicial do negócio).
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Sentinela que casa qualquer valor presente para uma chave de tag.
ANY = "*"


@dataclass(frozen=True)
class Sector:
    key: str
    nome: str
    emoji: str
    cor: str  # hex, para Chart.js / Leaflet
    prioritario: bool
    # matchers: lista de (chave_da_tag, valores). valores == ANY casa qualquer
    # valor; senão é um conjunto de valores aceitos.
    matchers: tuple[tuple[str, object], ...] = field(default_factory=tuple)


# Ordem = prioridade de classificação (primeiro que casar vence).
SECTORS: list[Sector] = [
    Sector(
        key="beleza",
        nome="Beleza & Estética",
        emoji="💇",
        cor="#ec4899",
        prioritario=True,
        matchers=(
            ("shop", frozenset({
                "hairdresser", "beauty", "cosmetics", "perfumery",
                "hairdresser_supply", "nail_salon", "tattoo", "massage",
            })),
            ("leisure", frozenset({"spa"})),
            ("amenity", frozenset({"spa"})),
            ("beauty", ANY),
        ),
    ),
    Sector(
        key="saude",
        nome="Saúde & Clínicas",
        emoji="🩺",
        cor="#06b6d4",
        prioritario=True,
        matchers=(
            ("amenity", frozenset({
                "clinic", "doctors", "dentist", "veterinary", "pharmacy",
            })),
            ("healthcare", ANY),
            ("shop", frozenset({"optician", "hearing_aids", "medical_supply"})),
        ),
    ),
    Sector(
        key="alimentacao",
        nome="Alimentação",
        emoji="🍽️",
        cor="#f59e0b",
        prioritario=True,
        matchers=(
            ("amenity", frozenset({
                "restaurant", "cafe", "fast_food", "bar", "pub",
                "ice_cream", "food_court", "biergarten",
            })),
            ("shop", frozenset({
                "bakery", "confectionery", "pastry", "butcher", "deli",
                "greengrocer", "seafood", "cheese", "coffee",
            })),
        ),
    ),
    Sector(
        key="turismo",
        nome="Turismo & Hospedagem",
        emoji="🏨",
        cor="#8b5cf6",
        prioritario=True,  # Guarujá é cidade de praia → turismo é forte
        matchers=(
            ("tourism", frozenset({
                "hotel", "guest_house", "hostel", "motel",
                "apartment", "chalet", "resort",
            })),
        ),
    ),
    Sector(
        key="fitness",
        nome="Fitness & Esporte",
        emoji="🏋️",
        cor="#22c55e",
        prioritario=False,
        matchers=(
            ("leisure", frozenset({"fitness_centre", "sports_centre", "dance"})),
            ("shop", frozenset({"sports"})),
        ),
    ),
    Sector(
        key="automotivo",
        nome="Automotivo",
        emoji="🚗",
        cor="#64748b",
        prioritario=False,
        matchers=(
            ("shop", frozenset({
                "car", "car_repair", "car_parts", "tyres",
                "motorcycle", "motorcycle_repair", "car_wash",
            })),
            ("amenity", frozenset({"car_wash", "car_rental"})),
        ),
    ),
    Sector(
        key="servicos",
        nome="Serviços & Reparos",
        emoji="🔧",
        cor="#0ea5e9",
        prioritario=False,
        matchers=(
            ("craft", ANY),
            ("shop", frozenset({
                "laundry", "dry_cleaning", "locksmith",
                "funeral_directors", "travel_agency",
            })),
        ),
    ),
    Sector(
        key="profissional",
        nome="Escritórios & Profissionais",
        emoji="💼",
        cor="#3b82f6",
        prioritario=False,
        matchers=(
            ("office", ANY),
        ),
    ),
    Sector(
        key="educacao",
        nome="Educação & Cursos",
        emoji="📚",
        cor="#a855f7",
        prioritario=False,
        matchers=(
            ("amenity", frozenset({
                "language_school", "driving_school", "music_school",
                "prep_school", "college",
            })),
        ),
    ),
    # CAPTURA-TUDO do varejo: qualquer shop=* não casado acima.
    Sector(
        key="comercio",
        nome="Comércio & Lojas",
        emoji="🛍️",
        cor="#ef4444",
        prioritario=True,
        matchers=(
            ("shop", ANY),
        ),
    ),
]

# Fallback final, quando nada casa.
OUTROS = Sector(
    key="outros", nome="Outros", emoji="📍", cor="#94a3b8", prioritario=False,
)

_BY_KEY: dict[str, Sector] = {s.key: s for s in SECTORS}
_BY_KEY[OUTROS.key] = OUTROS


def _matches(tags: dict[str, str], chave: str, valores: object) -> bool:
    if chave not in tags:
        return False
    if valores is ANY:
        return True
    return tags[chave] in valores  # type: ignore[operator]


def classify_sector(tags: dict[str, str]) -> Sector:
    """Retorna o setor de um conjunto de tags do OSM (ou OUTROS)."""
    for sector in SECTORS:
        for chave, valores in sector.matchers:
            if _matches(tags, chave, valores):
                return sector
    return OUTROS


def get_sector(key: str) -> Sector:
    return _BY_KEY.get(key, OUTROS)


def all_sectors() -> list[Sector]:
    """Todos os setores, incluindo OUTROS, para iteração/relatórios."""
    return [*SECTORS, OUTROS]
