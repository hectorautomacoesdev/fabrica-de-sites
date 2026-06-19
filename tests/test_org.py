"""Testes de classificação de tipo de organização (org_tipo).

Garante que órgãos públicos, redes/franquias e negócios independentes
sejam corretamente identificados — e que o score reflita essa distinção.
"""

import pytest

from fabrica_sites.agents.scout.scout import build_business
from fabrica_sites.core.org import classify_org
from fabrica_sites.models import OrgTipo, RawPlace, SiteStatus


def _b(tags, osm_id=1):
    return build_business(RawPlace(osm_type="node", osm_id=osm_id, tags=tags))


# ---------------------------------------------------------------------------
# classify_org — lógica pura
# ---------------------------------------------------------------------------

class TestClassifyOrg:

    def test_upa_por_operator_type_government(self):
        assert classify_org({"name": "UPA Central", "operator:type": "government"}) == "publico"

    def test_upa_por_nome(self):
        assert classify_org({"name": "UPA Guarujá"}) == "publico"

    def test_ubs_por_nome(self):
        assert classify_org({"name": "UBS Vila Áurea"}) == "publico"

    def test_prefeitura_por_nome(self):
        assert classify_org({"name": "Prefeitura Municipal de Guarujá"}) == "publico"

    def test_governo_tag_explícita(self):
        assert classify_org({"government": "town_hall", "name": "Câmara"}) == "publico"

    def test_delegacia_amenity(self):
        assert classify_org({"amenity": "police", "name": "Delegacia"}) == "publico"

    def test_escola_municipal(self):
        assert classify_org({"name": "Escola Municipal Dom Pedro II"}) == "publico"

    def test_hospital_estadual(self):
        assert classify_org({"name": "Hospital Estadual"}) == "publico"

    def test_cras(self):
        assert classify_org({"name": "CRAS Centro"}) == "publico"

    def test_mcdonalds_por_wikidata(self):
        assert classify_org({
            "name": "McDonald's",
            "brand:wikidata": "Q38076",
        }) == "rede"

    def test_drogasil_por_wikidata(self):
        assert classify_org({
            "name": "Drogasil",
            "brand:wikidata": "Q10261016",
        }) == "rede"

    def test_mcdonalds_por_nome_sem_wikidata(self):
        assert classify_org({"name": "McDonald's Guarujá"}) == "rede"

    def test_burger_king_por_nome(self):
        assert classify_org({"name": "Burger King"}) == "rede"

    def test_carrefour_por_nome(self):
        assert classify_org({"name": "Carrefour"}) == "rede"

    def test_barbearia_independente(self):
        assert classify_org({"name": "Barbearia do Zé", "shop": "hairdresser"}) == "independente"

    def test_restaurante_independente(self):
        assert classify_org({"name": "Restaurante Sabor da Praia", "amenity": "restaurant"}) == "independente"

    def test_farmacia_independente(self):
        # farmácia sem brand:wikidata e sem nome de rede
        assert classify_org({"name": "Farmácia Popular", "amenity": "pharmacy"}) == "independente"

    def test_tags_vazias_sao_independente(self):
        assert classify_org({}) == "independente"


# ---------------------------------------------------------------------------
# Pipeline completo — score reflete o tipo
# ---------------------------------------------------------------------------

class TestScoreComOrgTipo:

    def test_upa_tem_score_zero(self):
        b = _b({"name": "UPA Guarujá", "operator:type": "government",
                "phone": "+55 13 9999-0000"}, osm_id=10)
        assert b.org_tipo is OrgTipo.PUBLICO
        assert b.score == 0
        assert b.contactavel is False  # públicos não são leads
        assert any("público" in m.lower() for m in b.score_motivos)

    def test_mcdonalds_tem_score_baixo(self):
        b = _b({"name": "McDonald's", "brand:wikidata": "Q38076",
                "phone": "+55 13 9999-0000", "opening_hours": "Mo-Su 10:00-22:00"}, osm_id=11)
        assert b.org_tipo is OrgTipo.REDE
        assert b.score <= 25  # cap em base_com_site
        assert any("rede" in m.lower() or "franquia" in m.lower() for m in b.score_motivos)

    def test_salao_independente_tem_score_alto(self):
        b = _b({"shop": "hairdresser", "name": "Salão Beleza Total",
                "phone": "+55 13 99999-1234"}, osm_id=12)
        assert b.org_tipo is OrgTipo.INDEPENDENTE
        assert b.score >= 65  # sem site + setor prioritário + telefone

    def test_rede_com_site_social_cap(self):
        """Rede com Instagram não deve escapar do cap de 25."""
        b = _b({"name": "Burger King", "brand:wikidata": "Q177054",
                "contact:instagram": "burgerking.br"}, osm_id=13)
        assert b.org_tipo is OrgTipo.REDE
        assert b.score <= 25

    def test_org_tipo_propagado_no_modelo(self):
        """Garante que o campo org_tipo chega ao modelo Business."""
        b = _b({"name": "Drogasil", "brand:wikidata": "Q10261016"}, osm_id=14)
        assert hasattr(b, "org_tipo")
        assert b.org_tipo is OrgTipo.REDE
