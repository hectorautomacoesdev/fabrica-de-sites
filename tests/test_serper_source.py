"""Testes do SerperSource (sem chamadas reais à API — usa dados mockados)."""

from __future__ import annotations

import pytest

from fabrica_sites.agents.scout.sources.serper import (
    SerperSource,
    _place_to_raw,
    _serper_id,
)
from fabrica_sites.agents.scout.scout import run_scout
from fabrica_sites.models import RawPlace


# ---------------------------------------------------------------------------
# Dados de exemplo (estrutura retornada pela API do Serper)
# ---------------------------------------------------------------------------

_PLACE_RESTAURANTE = {
    "title": "Restaurante Mar e Sol",
    "address": "Av. Castelo Branco, 555 - Guarujá, SP",
    "latitude": -23.9920,
    "longitude": -46.2650,
    "phoneNumber": "+55 13 3355-1234",
    "website": "https://maresol.com.br",
    "rating": 4.3,
    "category": "Restaurant",
}

_PLACE_SEM_NOME = {
    "title": "",
    "address": "Guarujá, SP",
}

_PLACE_SALAO = {
    "title": "Salão Beleza Total",
    "address": "Rua XV de Novembro, 22 - Guarujá, SP",
    "latitude": -23.9877,
    "longitude": -46.2560,
    "phoneNumber": "+55 13 99988-7777",
    "website": None,
    "rating": 4.7,
}


# ---------------------------------------------------------------------------
# Testes de _place_to_raw
# ---------------------------------------------------------------------------

def test_place_to_raw_extrai_campos_basicos():
    raw = _place_to_raw(_PLACE_RESTAURANTE, "amenity", "restaurant")
    assert raw is not None
    assert raw.osm_type == "serper"
    assert raw.tags["name"] == "Restaurante Mar e Sol"
    assert raw.tags["amenity"] == "restaurant"
    assert raw.tags["phone"] == "+55 13 3355-1234"
    assert raw.tags["website"] == "https://maresol.com.br"
    assert raw.lat == pytest.approx(-23.9920)
    assert raw.lon == pytest.approx(-46.2650)


def test_place_to_raw_sem_website_nao_adiciona_tag():
    raw = _place_to_raw(_PLACE_SALAO, "shop", "hairdresser")
    assert raw is not None
    assert "website" not in raw.tags


def test_place_to_raw_retorna_none_para_sem_nome():
    assert _place_to_raw(_PLACE_SEM_NOME, "amenity", "restaurant") is None


def test_place_to_raw_id_estavel():
    """O ID gerado deve ser idempotente (mesmo input → mesmo ID)."""
    raw1 = _place_to_raw(_PLACE_RESTAURANTE, "amenity", "restaurant")
    raw2 = _place_to_raw(_PLACE_RESTAURANTE, "amenity", "restaurant")
    assert raw1.osm_id == raw2.osm_id


def test_serper_id_positivo():
    sid = _serper_id("Restaurante X", "Av. Principal, 1")
    assert sid > 0


# ---------------------------------------------------------------------------
# Testes do SerperSource (sem rede real)
# ---------------------------------------------------------------------------

class _FakeResp:
    """Simula uma resposta do Serper Maps."""

    def __init__(self, places):
        self._data = {"places": places}

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


def test_serper_sem_chave_retorna_lista_vazia(monkeypatch):
    """Sem API key configurada, SerperSource deve retornar lista vazia."""
    # Garante que mesmo que .env tenha a chave, o teste simula "sem chave"
    monkeypatch.setattr("fabrica_sites.agents.scout.sources.serper.config.SERPER_API_KEY", None)
    src = SerperSource(api_key=None)
    assert src.fetch("Guarujá") == []


def test_serper_retorna_raw_places(monkeypatch):
    """Com API key, deve retornar RawPlaces construídos dos resultados."""
    monkeypatch.setattr(
        "fabrica_sites.agents.scout.sources.serper.httpx.post",
        lambda url, **kw: _FakeResp([_PLACE_RESTAURANTE]),
    )
    src = SerperSource(
        api_key="fake-key",
        queries=[("restaurantes {cidade} SP", "amenity", "restaurant")],
    )
    resultado = src.fetch("Guarujá")
    assert len(resultado) == 1
    assert resultado[0].tags["amenity"] == "restaurant"
    assert resultado[0].tags["name"] == "Restaurante Mar e Sol"


def test_serper_deduplica_dentro_da_propria_fonte(monkeypatch):
    """O mesmo negócio retornado por duas queries diferentes é deduplicado."""
    monkeypatch.setattr(
        "fabrica_sites.agents.scout.sources.serper.httpx.post",
        lambda url, **kw: _FakeResp([_PLACE_RESTAURANTE]),
    )
    src = SerperSource(
        api_key="fake-key",
        # Duas queries que retornam o mesmo restaurante
        queries=[
            ("restaurantes {cidade} SP", "amenity", "restaurant"),
            ("bares {cidade} SP", "amenity", "bar"),
        ],
    )
    resultado = src.fetch("Guarujá")
    assert len(resultado) == 1, "Deveria deduplica o mesmo negócio de duas queries"


def test_serper_limit_funciona(monkeypatch):
    """O parâmetro limit deve cortar os resultados."""
    monkeypatch.setattr(
        "fabrica_sites.agents.scout.sources.serper.httpx.post",
        lambda url, **kw: _FakeResp([_PLACE_RESTAURANTE, _PLACE_SALAO]),
    )
    src = SerperSource(
        api_key="fake-key",
        queries=[("q {cidade}", "shop", "general")],
    )
    resultado = src.fetch("Guarujá", limit=1)
    assert len(resultado) == 1


def test_serper_falha_de_api_nao_quebra_pipeline(monkeypatch):
    """Se uma query falhar, o pipeline continua com as outras."""
    chamadas = []

    def fake_post(url, **kw):
        chamadas.append(kw.get("json", {}).get("q", ""))
        if "erro" in kw.get("json", {}).get("q", ""):
            raise ConnectionError("Serper fora do ar")
        return _FakeResp([_PLACE_RESTAURANTE])

    monkeypatch.setattr(
        "fabrica_sites.agents.scout.sources.serper.httpx.post",
        fake_post,
    )
    src = SerperSource(
        api_key="fake-key",
        queries=[
            ("erro query {cidade}", "amenity", "restaurant"),
            ("ok query {cidade}", "shop", "hairdresser"),
        ],
    )
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        resultado = src.fetch("Guarujá")

    assert len(resultado) == 1  # só a query que funcionou
    assert len(chamadas) == 2   # ambas foram tentadas


# ---------------------------------------------------------------------------
# Teste de integração: Serper + Scout pipeline
# ---------------------------------------------------------------------------

def test_scout_com_serper_e_dedup_por_nome(monkeypatch):
    """Scout com duas fontes deduplica por nome: mesmo negócio não aparece 2x."""
    from fabrica_sites.agents.scout.sources.base import BusinessSource

    # Fonte 1 (OSM fake): um restaurante sem telefone
    class OSMFake(BusinessSource):
        name = "osm-fake"
        def fetch(self, cidade, admin_level=8, limit=None):
            return [RawPlace(
                osm_type="node", osm_id=100,
                tags={"amenity": "restaurant", "name": "Restaurante Mar e Sol"},
            )]

    # Fonte 2 (Serper fake): o MESMO restaurante com telefone
    class SerperFake(BusinessSource):
        name = "serper-fake"
        def fetch(self, cidade, admin_level=8, limit=None):
            return [RawPlace(
                osm_type="serper", osm_id=999,
                tags={"amenity": "restaurant", "name": "Restaurante Mar e Sol",
                      "phone": "+55 13 3355-9999"},
            )]

    run = run_scout("Teste", sources=[OSMFake(), SerperFake()])
    # Dedup por nome: deve sobrar só 1 negócio (o do OSM, que foi primeiro)
    assert run.total == 1, (
        f"Esperava 1 negócio após dedup, mas encontrou {run.total}"
    )
    # A fonte registrada no run deve incluir ambas
    assert "osm-fake" in run.fonte
    assert "serper-fake" in run.fonte
