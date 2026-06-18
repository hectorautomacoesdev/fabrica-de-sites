"""Script de comparação: Scout sem vs com DomainGuesser.

Roda o pipeline duas vezes com os mesmos dados (mesma semente de ordenação do
OSM) e mostra quais negócios mudaram de SEM_SITE para COM_SITE.

Uso: python scripts/comparativo_enricher.py [--limit N]
"""

import sys
import time
import argparse

# Garante saída UTF-8 no Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1] / "src"))

from fabrica_sites.agents.scout.scout import run_scout
from fabrica_sites.agents.scout import insighter
from fabrica_sites.agents.scout.enrichers import DomainGuesser
from fabrica_sites.models import SiteStatus


def fmt_kpis(kpis: dict) -> str:
    k = kpis
    return (
        f"  Total         : {k['total']}\n"
        f"  Sem site      : {k['sem_site']} ({k['sem_site']*100//max(k['total'],1)}%)\n"
        f"  Só social     : {k['so_social']}\n"
        f"  Com site      : {k['com_site']} ({k['com_site']*100//max(k['total'],1)}%)\n"
        f"  Contactável   : {k['contactavel']} ({k['pct_contactavel']}%)\n"
        f"  Leads quentes : {k['leads_quentes']}"
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=80)
    args = p.parse_args()

    print("=" * 60)
    print(f"Comparativo DomainGuesser — amostra {args.limit} negócios")
    print("=" * 60)

    # ---- BASELINE -----------------------------------------------------------
    print("\n[1/2] Coletando dados (Overpass)...")
    t0 = time.perf_counter()
    run_base = run_scout("Guarujá", limit=args.limit)
    t_base = time.perf_counter() - t0
    dados_base = insighter.compute(run_base)

    print(f"\nBASELINE (sem enriquecimento)  [{t_base:.1f}s]")
    print(fmt_kpis(dados_base["kpis"]))

    # Mapa: (osm_type, osm_id) → site_status antes do enricher
    status_antes = {
        (b.osm_type, b.osm_id): b.site_status
        for b in run_base.negocios
    }

    # ---- COM DOMAIN GUESSER -------------------------------------------------
    print("\n[2/2] Aplicando DomainGuesser...")
    t1 = time.perf_counter()
    run_enriq = run_scout("Guarujá", limit=args.limit, enrichers=[DomainGuesser()])
    t_enriq = time.perf_counter() - t1
    dados_enriq = insighter.compute(run_enriq)

    print(f"\nCOM DomainGuesser  [{t_enriq:.1f}s]")
    print(fmt_kpis(dados_enriq["kpis"]))

    # ---- DIFF ---------------------------------------------------------------
    print("\n--- Sites descobertos pelo DomainGuesser ---")
    descobertos = []
    for b in run_enriq.negocios:
        chave = (b.osm_type, b.osm_id)
        if (
            status_antes.get(chave) is SiteStatus.SEM_SITE
            and b.site_status is SiteStatus.COM_SITE
        ):
            descobertos.append(b)

    if descobertos:
        for b in descobertos:
            print(f"  ✓ {b.nome or '(sem nome)':<35} {b.website}")
    else:
        print("  Nenhum novo site descoberto nesta amostra.")

    # Resumo delta
    k0 = dados_base["kpis"]
    k1 = dados_enriq["kpis"]
    print("\n--- Resumo do impacto ---")
    delta_sem = k0["sem_site"] - k1["sem_site"]
    delta_com = k1["com_site"] - k0["com_site"]
    delta_quentes = k1["leads_quentes"] - k0["leads_quentes"]
    print(f"  SEM_SITE   : {k0['sem_site']} → {k1['sem_site']}  (delta: {-delta_sem})")
    print(f"  COM_SITE   : {k0['com_site']} → {k1['com_site']}  (delta: +{delta_com})")
    print(f"  Leads quen.: {k0['leads_quentes']} → {k1['leads_quentes']}  (delta: {delta_quentes:+d})")
    print(f"  Total descobertos: {len(descobertos)} sites ocultos encontrados")


if __name__ == "__main__":
    main()
