"""Testes do DomainGuesser (sem rede real — mocks via monkeypatch)."""

from __future__ import annotations

import pytest

from fabrica_sites.agents.scout.enrichers.domain_guesser import (
    DomainGuesser,
    _ascii_slug,
    _checar_dominio,
    _encontrar_site,
    gerar_candidatos,
)
from fabrica_sites.agents.scout.scout import build_business
from fabrica_sites.models import Business, RawPlace, SiteStatus, WebsiteKind


# ---------------------------------------------------------------------------
# Testes de geração de candidatos (sem rede)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("nome, esperado_no_primeiro", [
    ("Farmácia Central", "farmaciacentral.com.br"),
    ("Hotel Ilhas da Grécia", "hotelilhasdagrecia.com.br"),
    ("Salão Beleza & Arte", "salaobelezaarte.com.br"),
    ("Restaurante O Gauchão", "restauranteogauchao.com.br"),
    ("Academia FitLife", "academiafitlife.com.br"),
])
def test_gerar_candidatos_primeiro_eh_slug_completo(nome, esperado_no_primeiro):
    candidatos = gerar_candidatos(nome)
    assert len(candidatos) >= 1
    assert candidatos[0] == esperado_no_primeiro, (
        f"Para '{nome}' esperava primeiro candidato '{esperado_no_primeiro}', "
        f"mas got {candidatos}"
    )


def test_gerar_candidatos_sem_stop_words():
    """Versão sem preposições deve aparecer como candidato alternativo."""
    candidatos = gerar_candidatos("Hotel Ilhas da Grécia")
    # Sem "da": "hotelilhasgrecia.com.br"
    assert any("hotelilhasgrecia" in c for c in candidatos), (
        f"Candidatos sem stop words ausentes: {candidatos}"
    )


def test_gerar_candidatos_variante_hifen():
    """Variante com hifens deve aparecer."""
    candidatos = gerar_candidatos("Hotel Ilhas da Grécia")
    assert any("-" in c for c in candidatos), (
        f"Variante com hífen ausente: {candidatos}"
    )


def test_gerar_candidatos_vazio_para_nome_nulo():
    assert gerar_candidatos("") == []
    assert gerar_candidatos(None) == []  # type: ignore[arg-type]


def test_gerar_candidatos_sem_duplicatas():
    candidatos = gerar_candidatos("Bar do João")
    assert len(candidatos) == len(set(candidatos)), "Candidatos com duplicatas"


def test_gerar_candidatos_limite_razoavel():
    """Não deve gerar mais que 8 candidatos por negócio."""
    candidatos = gerar_candidatos("Empresa Nome Muito Longo da Silva e Filhos Ltda")
    assert len(candidatos) <= 8


# ---------------------------------------------------------------------------
# Testes do filtro de nomes genéricos
# ---------------------------------------------------------------------------

from fabrica_sites.agents.scout.enrichers.domain_guesser import _nome_vale_tentar


@pytest.mark.parametrize("nome, esperado", [
    # Genéricos demais → False
    ("Pousada", False),
    ("Bar", False),
    ("Lanchonete", False),
    ("Lan House", False),
    ("Academia", False),
    # Específicos → True
    ("Hotel Ilhas da Grécia", True),
    ("Pousada Caiçara", True),       # "Pousada" + nome específico
    ("McDonald's", True),            # 1 palavra, 9 chars, marca
    ("Drogaria São Paulo", True),    # 2 palavras significativas
    ("Salão Beleza & Arte", True),   # composto
    ("Guarujá Previdência", True),   # nome local específico
])
def test_nome_vale_tentar(nome, esperado):
    assert _nome_vale_tentar(nome) is esperado, (
        f"_nome_vale_tentar('{nome}') = {_nome_vale_tentar(nome)}, esperado {esperado}"
    )


# ---------------------------------------------------------------------------
# Testes com mock de rede
# ---------------------------------------------------------------------------

def _b_sem_site(nome: str, osm_id: int = 99) -> Business:
    return build_business(RawPlace(
        osm_type="node", osm_id=osm_id,
        tags={"shop": "hairdresser", "name": nome},
    ))


def test_enricher_nao_modifica_negocios_com_site():
    """Negócios que já têm site não são verificados."""
    b = build_business(RawPlace(
        osm_type="node", osm_id=1,
        tags={"shop": "hairdresser", "name": "Salão X",
              "website": "https://salaox.com.br"},
    ))
    assert b.site_status is SiteStatus.COM_SITE

    guesser = DomainGuesser(timeout=1.0, workers=1)
    result = guesser.enrich([b], "Guarujá")
    assert result[0].site_status is SiteStatus.COM_SITE
    assert result[0].website == "https://salaox.com.br"


def test_enricher_lista_vazia():
    guesser = DomainGuesser(timeout=1.0, workers=1)
    assert guesser.enrich([], "Guarujá") == []


def test_enricher_sem_nome_nao_e_verificado(monkeypatch):
    """Negócio sem nome nunca dispara uma verificação HTTP."""
    chamadas = []

    def fake_encontrar(nome, timeout):  # noqa: ARG001
        chamadas.append(nome)
        return None

    monkeypatch.setattr(
        "fabrica_sites.agents.scout.enrichers.domain_guesser._encontrar_site",
        fake_encontrar,
    )

    b = build_business(RawPlace(
        osm_type="node", osm_id=5,
        tags={"shop": "hairdresser"},  # sem "name"
    ))
    assert b.nome is None

    guesser = DomainGuesser(timeout=1.0, workers=1)
    guesser.enrich([b], "Guarujá")
    assert chamadas == [], "Não deveria ter verificado negócio sem nome"


def test_enricher_atualiza_site_e_recalcula_score(monkeypatch):
    """Quando um domínio é encontrado, o score cai (negócio TEM site afinal)."""
    monkeypatch.setattr(
        "fabrica_sites.agents.scout.enrichers.domain_guesser._encontrar_site",
        lambda nome, timeout: f"https://{nome.lower().replace(' ', '')}.com.br",  # noqa: ARG005
    )

    b = _b_sem_site("Salão ABC", osm_id=10)
    score_antes = b.score
    assert b.site_status is SiteStatus.SEM_SITE

    guesser = DomainGuesser(timeout=1.0, workers=1)
    resultado = guesser.enrich([b], "Guarujá")

    b_novo = resultado[0]
    assert b_novo.site_status is SiteStatus.COM_SITE
    assert b_novo.website is not None
    assert b_novo.website_kind is WebsiteKind.PROPRIO
    # Score deve cair: base COM_SITE (25) < base SEM_SITE (60)
    assert b_novo.score < score_antes, (
        f"Score deveria ter caído (negócio TEM site), "
        f"mas foi de {score_antes} → {b_novo.score}"
    )


def test_enricher_nao_modifica_negocios_sem_resultado(monkeypatch):
    """Se nenhum domínio for encontrado, o negócio permanece inalterado."""
    monkeypatch.setattr(
        "fabrica_sites.agents.scout.enrichers.domain_guesser._encontrar_site",
        lambda nome, timeout: None,
    )

    b = _b_sem_site("Loja Inexistente", osm_id=20)
    status_antes = b.site_status
    score_antes = b.score

    guesser = DomainGuesser(timeout=1.0, workers=1)
    resultado = guesser.enrich([b], "Guarujá")

    assert resultado[0].site_status is status_antes
    assert resultado[0].score == score_antes


# ---------------------------------------------------------------------------
# Testes de checar_dominio (função de baixo nível, mockada)
# ---------------------------------------------------------------------------

def test_checar_dominio_retorna_false_em_excecao(monkeypatch):
    """Se a requisição falhar, checar_dominio retorna False sem levantar exceção."""
    def raise_always(*args, **kwargs):
        raise ConnectionError("sem rede")

    monkeypatch.setattr(
        "fabrica_sites.agents.scout.enrichers.domain_guesser.httpx.head",
        raise_always,
    )
    assert _checar_dominio("sitequenaoexiste123456.com.br", timeout=1.0) is False


def test_checar_dominio_falso_para_status_404(monkeypatch):
    """Status 404 não conta como site encontrado."""
    class FakeResp:
        status_code = 404

    monkeypatch.setattr(
        "fabrica_sites.agents.scout.enrichers.domain_guesser.httpx.head",
        lambda url, **kw: FakeResp(),
    )
    assert _checar_dominio("qualquer.com.br", timeout=1.0) is False


def test_checar_dominio_verdadeiro_para_status_200(monkeypatch):
    """Status 200 confirma que o site existe."""
    class FakeResp:
        status_code = 200

    monkeypatch.setattr(
        "fabrica_sites.agents.scout.enrichers.domain_guesser.httpx.head",
        lambda url, **kw: FakeResp(),
    )
    assert _checar_dominio("siteexiste.com.br", timeout=1.0) is True
