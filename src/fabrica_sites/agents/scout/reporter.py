"""Gera o relatório HTML (dashboard) do Scout.

Produz um único arquivo .html autossuficiente que você abre no navegador:
KPIs, gráficos (Chart.js), mapa (Leaflet) e tabela filtrável dos negócios.
Os dados são embutidos como JSON; as bibliotecas vêm de CDN (precisa de
internet só para renderizar gráficos/mapa).
"""

from __future__ import annotations

import json
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from ...core.sectors import get_sector
from ...models import ScoutRun, SiteStatus
from . import insighter

TEMPLATES_DIR = Path(__file__).parent / "templates"

_STATUS_LEGIVEL = {
    SiteStatus.SEM_SITE.value: "Sem site",
    SiteStatus.SO_REDE_SOCIAL.value: "Só rede social",
    SiteStatus.COM_SITE.value: "Tem site",
    SiteStatus.DESCONHECIDO.value: "Desconhecido",
}


def _j(obj) -> str:
    """json.dumps seguro para embutir dentro de <script> (escapa < > &)."""
    return (
        json.dumps(obj, ensure_ascii=False)
        .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    )


def _negocio_para_json(b) -> dict:
    return {
        "nome": b.nome or "(sem nome)",
        "setor": b.setor_nome,
        "cor": get_sector(b.setor).cor,
        "status": b.site_status.value,
        "status_legivel": _STATUS_LEGIVEL.get(b.site_status.value, "—"),
        "score": b.score,
        "label": b.score_label,
        "telefone": b.telefone or "",
        "website": b.website or "",
        "lat": b.lat,
        "lon": b.lon,
        "osm_url": b.osm_url,
        "maps_url": b.maps_url or "",
        "motivos": b.score_motivos,
    }


def render(run: ScoutRun, out_path: Path) -> Path:
    dados = insighter.compute(run)
    negocios_json = [_negocio_para_json(b) for b in dados["top_leads"]]

    # Centro do mapa: média das coordenadas válidas (fallback: Guarujá).
    coords = [(b.lat, b.lon) for b in run.negocios if b.lat and b.lon]
    if coords:
        centro = [sum(c[0] for c in coords) / len(coords),
                  sum(c[1] for c in coords) / len(coords)]
    else:
        centro = [-23.99, -46.26]

    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=select_autoescape(["html", "j2"]),
    )
    template = env.get_template("report.html.j2")
    html = template.render(
        cidade=run.cidade,
        gerado_em=run.gerado_em.strftime("%d/%m/%Y %H:%M"),
        fonte=run.fonte,
        kpis=dados["kpis"],
        insights=dados["insights"],
        por_setor=dados["por_setor"],
        # JSON para o JavaScript (escapado para não quebrar o <script>):
        negocios_json=_j(negocios_json),
        centro_json=_j(centro),
        setor_labels=_j([s["nome"] for s in dados["por_setor"]]),
        setor_oportunidade=_j([s["oportunidade"] for s in dados["por_setor"]]),
        setor_total=_j([s["total"] for s in dados["por_setor"]]),
        setor_cores=_j([s["cor"] for s in dados["por_setor"]]),
        status_labels=_j(["Sem site", "Só rede social", "Tem site"]),
        status_valores=_j([
            dados["status_dist"]["SEM_SITE"],
            dados["status_dist"]["SO_REDE_SOCIAL"],
            dados["status_dist"]["COM_SITE"],
        ]),
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    return out_path
