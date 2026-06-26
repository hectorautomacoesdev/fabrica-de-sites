"""Testes do resumo determinístico de negócios (sem rede, sem banco)."""

from __future__ import annotations

from fabrica_sites.agents.scout.resumo import gerar_resumo
from fabrica_sites.models import Business, OrgTipo, SiteStatus, WebsiteKind


def _negocio(**kwargs) -> Business:
    """Business mínimo com defaults sensatos; sobrescreva o que o teste precisa."""
    base = dict(osm_type="node", osm_id=1, nome="Teste", setor="alimentacao",
                setor_nome="Alimentação")
    base.update(kwargs)
    return Business(**base)


def test_tipo_especifico_vem_das_tags_osm():
    b = _negocio(raw_tags={"shop": "bakery"}, site_status=SiteStatus.SEM_SITE)
    assert gerar_resumo(b).startswith("Padaria")


def test_cai_no_nome_do_setor_quando_tag_desconhecida():
    b = _negocio(raw_tags={"shop": "tag_que_nao_existe"}, site_status=SiteStatus.SEM_SITE,
                 setor_nome="Comércio & Lojas")
    assert "Comércio & Lojas" in gerar_resumo(b)


def test_usa_description_do_osm_quando_presente():
    b = _negocio(raw_tags={"amenity": "restaurant",
                           "description": "Comida caseira há 20 anos"},
                 site_status=SiteStatus.SEM_SITE)
    assert gerar_resumo(b).startswith("Comida caseira há 20 anos.")


def test_orgao_publico_marcado_como_fora_do_alvo():
    b = _negocio(org_tipo=OrgTipo.PUBLICO, site_status=SiteStatus.SEM_SITE)
    assert "fora do alvo" in gerar_resumo(b).lower()


def test_rede_marcada_como_fora_do_alvo():
    b = _negocio(org_tipo=OrgTipo.REDE, site_status=SiteStatus.COM_SITE)
    assert "fora do alvo" in gerar_resumo(b).lower()


def test_com_site_vira_candidato_a_auditoria():
    b = _negocio(site_status=SiteStatus.COM_SITE, website="https://x.com.br",
                 website_kind=WebsiteKind.PROPRIO)
    assert "auditoria" in gerar_resumo(b).lower()


def test_lead_quente_quando_alta_oportunidade_e_contato():
    b = _negocio(site_status=SiteStatus.SO_REDE_SOCIAL, telefone="13999990000",
                 score=80, score_label="ALTÍSSIMA", contactavel=True)
    resumo = gerar_resumo(b).lower()
    assert "lead quente" in resumo
    assert "telefone" in resumo


def test_sem_contato_sugere_enriquecer():
    b = _negocio(site_status=SiteStatus.SEM_SITE, contactavel=False,
                 score=70, score_label="ALTA")
    assert "enriquecer" in gerar_resumo(b).lower()


def test_resumo_sempre_nao_vazio():
    b = _negocio(site_status=SiteStatus.DESCONHECIDO)
    assert gerar_resumo(b).strip()
