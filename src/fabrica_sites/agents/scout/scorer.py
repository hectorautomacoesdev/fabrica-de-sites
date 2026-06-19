"""Cálculo do score de oportunidade (0–100).

A pergunta que o score responde: "quão boa é a chance de vender um site para
este negócio?" Ele é deliberadamente SIMPLES e EXPLICÁVEL — cada ponto tem um
motivo legível, listado em ``score_motivos``. Os pesos vivem em config.py.

Lógica resumida:
- Base pela presença web: sem site > só rede social > já tem site.
  (quem só tem rede social é o melhor lead: quer estar online, mas sem site.)
- + ter telefone (dá para contatar)
- + sinais de negócio estabelecido (horário, endereço)
- + estar num setor prioritário
"""

from __future__ import annotations

from ... import config
from ...core.sectors import get_sector
from ...models import SiteStatus, WebsiteKind

_W = config.SCORE_WEIGHTS


def _label(score: int) -> str:
    for minimo, nome in config.SCORE_FAIXAS:
        if score >= minimo:
            return nome
    return "BAIXA"


def score(fields: dict) -> dict:
    """Recebe os campos extraídos e devolve os campos de avaliação."""
    motivos: list[str] = []
    pontos = 0

    org_tipo: str = fields.get("org_tipo", "independente")

    # Órgão público: score zero — não é nosso mercado.
    if org_tipo == "publico":
        kind: WebsiteKind = fields["website_kind"]
        status = (
            SiteStatus.SEM_SITE if kind is WebsiteKind.NENHUM
            else SiteStatus.SO_REDE_SOCIAL if kind is WebsiteKind.REDE_SOCIAL
            else SiteStatus.COM_SITE
        )
        motivos.append("Órgão público — fora do escopo da Fábrica de Sites (0)")
        return {
            "site_status": status,
            "score": 0,
            "score_label": _label(0),
            "score_motivos": motivos,
            "contactavel": False,
        }

    # 1) Base pela presença web.
    kind = fields["website_kind"]
    if kind is WebsiteKind.NENHUM:
        status = SiteStatus.SEM_SITE
        pontos += _W["base_sem_site"]
        motivos.append(f"Sem site (+{_W['base_sem_site']})")
    elif kind is WebsiteKind.REDE_SOCIAL:
        status = SiteStatus.SO_REDE_SOCIAL
        pontos += _W["base_so_rede_social"]
        motivos.append(f"Só rede social, sem site próprio (+{_W['base_so_rede_social']})")
    else:
        status = SiteStatus.COM_SITE
        pontos += _W["base_com_site"]
        motivos.append(f"Já tem site — Auditor avalia qualidade depois (+{_W['base_com_site']})")

    # 2) Contactabilidade.
    if fields.get("telefone"):
        pontos += _W["tem_telefone"]
        motivos.append(f"Tem telefone (+{_W['tem_telefone']})")

    # 3) Sinais de negócio estabelecido.
    if fields.get("horario"):
        pontos += _W["tem_horario"]
        motivos.append(f"Tem horário de funcionamento (+{_W['tem_horario']})")
    if fields.get("endereco"):
        pontos += _W["tem_endereco"]
        motivos.append(f"Tem endereço (+{_W['tem_endereco']})")

    # 4) Setor prioritário.
    if get_sector(fields["setor"]).prioritario:
        pontos += _W["setor_prioritario"]
        motivos.append(f"Setor prioritário (+{_W['setor_prioritario']})")

    # Rede/franquia: cap em base_com_site (25) — tem site corporativo, oportunidade baixa.
    if org_tipo == "rede":
        pontos = min(pontos, _W["base_com_site"])
        motivos.append("Rede/franquia — site corporativo já existe (cap 25)")

    pontos = min(pontos, 100)
    contactavel = bool(fields.get("telefone") or fields.get("email"))

    return {
        "site_status": status,
        "score": pontos,
        "score_label": _label(pontos),
        "score_motivos": motivos,
        "contactavel": contactavel,
    }
