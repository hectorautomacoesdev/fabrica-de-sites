"""Testes do score de oportunidade (via pipeline build_business)."""

from fabrica_sites.agents.scout.scout import build_business
from fabrica_sites.models import RawPlace, SiteStatus, WebsiteKind


def _b(tags, osm_id=1):
    return build_business(RawPlace(osm_type="node", osm_id=osm_id, tags=tags))


def test_sem_site_setor_prioritario_com_telefone():
    b = _b({"shop": "hairdresser", "name": "Salão X", "phone": "+55 13 99999"})
    assert b.site_status is SiteStatus.SEM_SITE
    assert b.website_kind is WebsiteKind.NENHUM
    assert b.score == 60 + 20 + 10            # base + telefone + setor
    assert b.score_label == "ALTÍSSIMA"
    assert b.contactavel is True


def test_so_rede_social_eh_lead_mais_quente_que_sem_site():
    social = _b({"shop": "beauty", "website": "https://instagram.com/salao"}, 2)
    assert social.site_status is SiteStatus.SO_REDE_SOCIAL
    assert social.score == 70 + 10            # base social + setor
    # base de "só rede social" (70) > base de "sem site" (60)
    sem = _b({"shop": "beauty"}, 3)
    assert social.score > sem.score


def test_com_site_proprio_pontua_menos():
    b = _b({"amenity": "restaurant", "website": "https://meurestaurante.com.br",
            "phone": "x", "opening_hours": "Mo-Fr 09:00-18:00"}, 4)
    assert b.site_status is SiteStatus.COM_SITE
    assert b.score == 25 + 20 + 5 + 10        # base + telefone + horario + setor


def test_social_via_tag_contact_instagram():
    b = _b({"shop": "bakery", "contact:instagram": "padaria.guaruja"}, 5)
    assert b.website_kind is WebsiteKind.REDE_SOCIAL
    assert b.site_status is SiteStatus.SO_REDE_SOCIAL


def test_motivos_sao_explicaveis():
    b = _b({"shop": "hairdresser", "phone": "x"})
    assert any("Sem site" in m for m in b.score_motivos)
    assert any("telefone" in m.lower() for m in b.score_motivos)
