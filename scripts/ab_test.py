"""Comparativo A/B entre as 4 configurações do Scout.

Configurações testadas:
  A — Baseline : só OpenStreetMap
  B — +Guesser : OSM + DomainGuesser
  C — +Serper  : OSM + Serper (sem DomainGuesser)
  D — Full     : OSM + Serper + DomainGuesser

Métricas coletadas por configuração:
  - Tempo de execução (wall-clock)
  - Pico de memória RAM (tracemalloc)
  - Negócios totais / sem site / com site / contactáveis / leads quentes
  - Sites descobertos vs. baseline (delta)

Uso:
    python scripts/ab_test.py [--cidade Guarujá] [--limit N]
"""

from __future__ import annotations

import argparse
import sys
import time
import tracemalloc
from dataclasses import dataclass, field
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fabrica_sites import config as cfg
from fabrica_sites.agents.scout import insighter
from fabrica_sites.agents.scout.enrichers import DomainGuesser
from fabrica_sites.agents.scout.scout import run_scout
from fabrica_sites.agents.scout.sources import OverpassSource, SerperSource
from fabrica_sites.models import SiteStatus


@dataclass
class RunResult:
    label: str
    tempo_s: float
    mem_pico_kb: float
    total: int
    sem_site: int
    so_social: int
    com_site: int
    contactavel: int
    leads_quentes: int
    ids_com_site: frozenset = field(default_factory=frozenset, repr=False)


def _medir(label: str, cidade: str, sources, enrichers) -> RunResult:
    tracemalloc.start()
    t0 = time.perf_counter()

    run = run_scout(cidade, sources=sources, enrichers=enrichers)

    t1 = time.perf_counter()
    _, pico = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    k = insighter.compute(run)["kpis"]
    ids_com_site = frozenset(
        (b.osm_type, b.osm_id)
        for b in run.negocios
        if b.site_status is SiteStatus.COM_SITE
    )

    return RunResult(
        label=label,
        tempo_s=round(t1 - t0, 1),
        mem_pico_kb=round(pico / 1024, 1),
        total=k["total"],
        sem_site=k["sem_site"],
        so_social=k["so_social"],
        com_site=k["com_site"],
        contactavel=k["contactavel"],
        leads_quentes=k["leads_quentes"],
        ids_com_site=ids_com_site,
    )


def _fmt_delta(val: int, base: int, melhor_maior: bool = True) -> str:
    d = val - base
    if d == 0:
        return f"{val}"
    sinal = "+" if d > 0 else ""
    flecha = "↑" if (d > 0) == melhor_maior else "↓"
    return f"{val} ({sinal}{d} {flecha})"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--cidade", default=cfg.DEFAULT_CITY)
    p.add_argument("--limit", type=int, default=None)
    args = p.parse_args()

    tem_serper = bool(cfg.SERPER_API_KEY)
    print(f"\n{'='*62}")
    print(f"  A/B Test — Scout de '{args.cidade}'")
    print(f"  Serper: {'✓ ATIVO' if tem_serper else '✗ sem chave (configs A e B apenas)'}")
    if args.limit:
        print(f"  Limite: {args.limit} negócios")
    print(f"{'='*62}\n")

    osm = OverpassSource()
    guesser = DomainGuesser()
    serper = SerperSource() if tem_serper else None

    configs = [
        ("A — Baseline (só OSM)",    [osm],         None),
        ("B — OSM + DomainGuesser",  [osm],         [guesser]),
    ]
    if tem_serper:
        configs += [
            ("C — OSM + Serper",         [osm, serper], None),
            ("D — Full (OSM+Serper+DG)", [osm, serper], [guesser]),
        ]

    resultados: list[RunResult] = []
    for label, sources, enrichers in configs:
        print(f"  Rodando {label}...", end=" ", flush=True)
        r = _medir(label, args.cidade, sources,
                   enrichers if args.limit is None
                   else (enrichers or []))
        resultados.append(r)
        print(f"✓ ({r.tempo_s}s)")

    base = resultados[0]

    # ---- Tabela de métricas de negócios --------------------------------
    print(f"\n{'─'*62}")
    print(f"  MÉTRICAS DE QUALIDADE DE DADOS")
    print(f"{'─'*62}")
    header = f"  {'Config':<28} {'Total':>5} {'SemSite':>8} {'ComSite':>8} {'Contato':>8} {'Leads':>6}"
    print(header)
    print(f"  {'─'*58}")
    for r in resultados:
        base_total = base.total
        print(
            f"  {r.label:<28}"
            f" {_fmt_delta(r.total, base.total, True):>5}"
            f" {_fmt_delta(r.sem_site, base.sem_site, False):>8}"
            f" {_fmt_delta(r.com_site, base.com_site, True):>8}"
            f" {_fmt_delta(r.contactavel, base.contactavel, True):>8}"
            f" {_fmt_delta(r.leads_quentes, base.leads_quentes, True):>6}"
        )

    # ---- Tabela de desempenho ------------------------------------------
    print(f"\n{'─'*62}")
    print(f"  DESEMPENHO")
    print(f"{'─'*62}")
    header2 = f"  {'Config':<28} {'Tempo (s)':>10} {'Mem pico (KB)':>14}"
    print(header2)
    print(f"  {'─'*54}")
    for r in resultados:
        print(f"  {r.label:<28} {r.tempo_s:>10.1f} {r.mem_pico_kb:>14.1f}")

    # ---- Sites novos por config ----------------------------------------
    print(f"\n{'─'*62}")
    print(f"  SITES DESCOBERTOS vs. BASELINE (A)")
    print(f"{'─'*62}")
    for r in resultados[1:]:
        novos = r.ids_com_site - base.ids_com_site
        print(f"  {r.label}: +{len(novos)} sites novos vs. baseline")

    # ---- Recomendação --------------------------------------------------
    melhor = max(resultados, key=lambda r: r.leads_quentes)
    print(f"\n  🏆 Config com mais leads quentes: {melhor.label} ({melhor.leads_quentes} leads)")
    if tem_serper:
        custo_d = next((r for r in resultados if r.label.startswith("D")), None)
        custo_b = next((r for r in resultados if r.label.startswith("B")), None)
        if custo_d and custo_b:
            overhead_s = round(custo_d.tempo_s - custo_b.tempo_s, 1)
            print(f"  ⏱  Overhead do Serper sobre só DomainGuesser: +{overhead_s}s")
    print()


if __name__ == "__main__":
    main()
