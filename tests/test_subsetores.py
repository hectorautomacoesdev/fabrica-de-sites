"""Testes unitários da taxonomia de subsetores (sem rede, sem banco)."""

from __future__ import annotations

import pytest

from fabrica_sites.agents.scout.subsetores import classificar_subsetor


@pytest.mark.parametrize("setor, tags, esperado", [
    # ── Alimentação ──────────────────────────────────────────────────────────
    ("alimentacao", {"amenity": "restaurant", "cuisine": "pizza"}, "Pizzaria"),
    ("alimentacao", {"amenity": "restaurant", "cuisine": "japanese"}, "Japonês & Sushi"),
    ("alimentacao", {"amenity": "restaurant", "cuisine": "sushi"}, "Japonês & Sushi"),
    ("alimentacao", {"amenity": "restaurant", "cuisine": "burger"}, "Hamburgueria"),
    ("alimentacao", {"amenity": "restaurant"}, "Restaurante"),
    ("alimentacao", {"amenity": "fast_food"}, "Lanchonete"),
    ("alimentacao", {"amenity": "fast_food", "cuisine": "pizza"}, "Pizzaria"),
    ("alimentacao", {"amenity": "cafe"}, "Cafeteria"),
    ("alimentacao", {"amenity": "bar"}, "Bar & Boteco"),
    ("alimentacao", {"amenity": "pub"}, "Bar & Boteco"),
    ("alimentacao", {"amenity": "ice_cream"}, "Sorveteria"),
    ("alimentacao", {"shop": "bakery"}, "Padaria"),
    ("alimentacao", {"shop": "confectionery"}, "Confeitaria & Doces"),
    ("alimentacao", {"amenity": "restaurant", "cuisine": "barbecue"}, "Churrascaria"),
    ("alimentacao", {"amenity": "restaurant", "cuisine": "seafood"}, "Frutos do Mar"),

    # ── Saúde ─────────────────────────────────────────────────────────────────
    ("saude", {"amenity": "pharmacy"}, "Farmácia"),
    ("saude", {"amenity": "dentist"}, "Dentista"),
    ("saude", {"amenity": "veterinary"}, "Veterinária"),
    ("saude", {"shop": "optician"}, "Ótica"),
    ("saude", {"amenity": "doctors"}, "Consultório Médico"),
    ("saude", {"amenity": "doctors", "healthcare:speciality": "cardiology"}, "Cardiologia"),
    ("saude", {"amenity": "doctors", "healthcare:speciality": "pediatrics"}, "Pediatria"),
    ("saude", {"amenity": "clinic"}, "Clínica"),
    ("saude", {"amenity": "clinic", "healthcare:speciality": "dermatology"}, "Clínica de Dermatologia"),

    # ── Beleza ────────────────────────────────────────────────────────────────
    ("beleza", {"shop": "hairdresser"}, "Salão de Cabelo"),
    ("beleza", {"shop": "hairdresser", "name": "Barbearia do João"}, "Barbearia"),
    ("beleza", {"shop": "nail_salon"}, "Manicure & Nail Art"),
    ("beleza", {"shop": "tattoo"}, "Tatuagem & Piercing"),
    ("beleza", {"shop": "beauty"}, "Estética & Spa"),

    # ── Comércio ──────────────────────────────────────────────────────────────
    ("comercio", {"shop": "clothes"}, "Roupas & Moda"),
    ("comercio", {"shop": "supermarket"}, "Supermercado"),
    ("comercio", {"shop": "electronics"}, "Eletro & Tecnologia"),
    ("comercio", {"shop": "pet"}, "Pet Shop"),
    ("comercio", {"shop": "furniture"}, "Móveis & Decoração"),

    # ── Turismo ───────────────────────────────────────────────────────────────
    ("turismo", {"tourism": "hotel"}, "Hotel"),
    ("turismo", {"tourism": "guest_house"}, "Pousada"),
    ("turismo", {"tourism": "hostel"}, "Hostel"),

    # ── Automotivo ────────────────────────────────────────────────────────────
    ("automotivo", {"shop": "car_repair"}, "Oficina Mecânica"),
    ("automotivo", {"shop": "car_wash"}, "Lava-Rápido"),
    ("automotivo", {"shop": "tyres"}, "Pneus"),

    # ── Serviços ──────────────────────────────────────────────────────────────
    ("servicos", {"craft": "electrician"}, "Elétrica"),
    ("servicos", {"craft": "plumber"}, "Hidráulica & Encanamento"),
    ("servicos", {"shop": "laundry"}, "Lavanderia"),
    ("servicos", {"shop": "travel_agency"}, "Agência de Viagens"),

    # ── Profissional ──────────────────────────────────────────────────────────
    ("profissional", {"office": "lawyer"}, "Advocacia & Jurídico"),
    ("profissional", {"office": "accountant"}, "Contabilidade"),
    ("profissional", {"office": "estate_agent"}, "Imobiliária"),

    # ── Educação ──────────────────────────────────────────────────────────────
    ("educacao", {"amenity": "language_school"}, "Escola de Idiomas"),
    ("educacao", {"amenity": "driving_school"}, "Auto Escola"),

    # ── Fitness ───────────────────────────────────────────────────────────────
    ("fitness", {"leisure": "fitness_centre"}, "Academia de Ginástica"),
    ("fitness", {"leisure": "dance"}, "Dança & Artes Marciais"),

    # ── Setor desconhecido → Outros ───────────────────────────────────────────
    ("outros", {"amenity": "place_of_worship"}, "Outros"),
    ("xyz_inexistente", {"shop": "clothes"}, "Outros"),
])
def test_classificar_subsetor(setor, tags, esperado):
    resultado = classificar_subsetor(setor, tags)
    assert resultado == esperado, (
        f"setor={setor!r} tags={tags!r}: esperado {esperado!r}, obtido {resultado!r}"
    )


def test_tags_vazias_retornam_fallback():
    """Tags vazias devem retornar o fallback do setor, não explodir."""
    assert classificar_subsetor("alimentacao", {}) == "Alimentação (outros)"
    assert classificar_subsetor("saude", {}) == "Saúde (outros)"
    assert classificar_subsetor("comercio", {}) == "Comércio (outros)"
