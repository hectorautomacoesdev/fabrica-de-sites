"""Testes do pipeline do Scout com uma fonte falsa (sem rede)."""

from fabrica_sites.agents.scout.scout import run_scout
from fabrica_sites.agents.scout.sources.base import BusinessSource
from fabrica_sites.agents.scout import insighter
from fabrica_sites.models import RawPlace


class FakeSource(BusinessSource):
    name = "fake"

    def __init__(self, places):
        self.places = places

    def fetch(self, cidade, admin_level=8, limit=None):
        return self.places[:limit] if limit else self.places


def _places():
    return [
        RawPlace(osm_type="node", osm_id=1,
                 tags={"shop": "hairdresser", "name": "Salão A", "phone": "x"}),
        RawPlace(osm_type="node", osm_id=1,  # id duplicado de propósito
                 tags={"shop": "hairdresser", "name": "Salão A (dup)"}),
        RawPlace(osm_type="node", osm_id=2,
                 tags={"amenity": "restaurant", "name": "Resto B",
                       "website": "https://restob.com.br"}),
    ]


def test_run_scout_deduplica_e_ordena():
    run = run_scout("Teste", source=FakeSource(_places()))
    assert run.total == 2                       # duplicata removida
    assert run.fonte == "fake"
    # ordenado por score desc → salão (sem site + telefone) antes do restaurante
    assert run.negocios[0].nome == "Salão A"
    assert run.negocios[0].score >= run.negocios[1].score


def test_limit_corta_resultados():
    run = run_scout("Teste", limit=1, source=FakeSource(_places()))
    assert run.total == 1


def test_insighter_agrega_corretamente():
    run = run_scout("Teste", source=FakeSource(_places()))
    dados = insighter.compute(run)
    assert dados["kpis"]["total"] == 2
    assert dados["kpis"]["sem_site"] == 1       # só o salão
    assert dados["kpis"]["com_site"] == 1       # só o restaurante
    assert len(dados["insights"]) > 0


def test_lead_quente_exige_contato():
    # Salão sem site em setor prioritário tem score alto (90), mas SEM telefone
    # não conta como lead quente; COM telefone, conta.
    sem_contato = [RawPlace(osm_type="node", osm_id=10,
                            tags={"shop": "hairdresser", "name": "Sem Fone"})]
    com_contato = [RawPlace(osm_type="node", osm_id=11,
                            tags={"shop": "hairdresser", "name": "Com Fone",
                                  "phone": "x"})]
    assert insighter.compute(run_scout("T", source=FakeSource(sem_contato)))["kpis"]["leads_quentes"] == 0
    assert insighter.compute(run_scout("T", source=FakeSource(com_contato)))["kpis"]["leads_quentes"] == 1
