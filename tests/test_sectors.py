"""Testes da classificação de setores a partir de tags do OSM."""

import pytest

from fabrica_sites.core.sectors import classify_sector

CASOS = [
    ({"shop": "hairdresser"}, "beleza"),
    ({"shop": "beauty"}, "beleza"),
    ({"leisure": "spa"}, "beleza"),
    ({"amenity": "dentist"}, "saude"),
    ({"healthcare": "physiotherapist"}, "saude"),
    ({"amenity": "restaurant"}, "alimentacao"),
    ({"shop": "bakery"}, "alimentacao"),       # shop específico vence o catch-all
    ({"tourism": "hotel"}, "turismo"),
    ({"leisure": "fitness_centre"}, "fitness"),
    ({"shop": "car_repair"}, "automotivo"),
    ({"craft": "electrician"}, "servicos"),
    ({"office": "lawyer"}, "profissional"),
    ({"amenity": "language_school"}, "educacao"),
    ({"shop": "clothes"}, "comercio"),          # catch-all do varejo
    ({"amenity": "bench"}, "outros"),           # nada comercial
]


@pytest.mark.parametrize("tags, esperado", CASOS)
def test_classify_sector(tags, esperado):
    assert classify_sector(tags).key == esperado


def test_shop_especifico_tem_prioridade_sobre_comercio():
    # bakery é shop, mas deve cair em alimentacao, não no genérico comercio.
    assert classify_sector({"shop": "bakery"}).key == "alimentacao"
    assert classify_sector({"shop": "hairdresser"}).key == "beleza"
