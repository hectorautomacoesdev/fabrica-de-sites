"""Interface de linha de comando da Fábrica de Sites.

Uso:
    fabrica scout run --cidade "Guarujá" --abrir
    fabrica scout run --cidade "Guarujá" --enriquecer --abrir
    fabrica scout setores
    fabrica scout stats
"""

from __future__ import annotations

import time
import webbrowser
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from . import config, db
from .agents.scout import insighter, reporter
from .agents.scout.scout import run_scout
from .core.sectors import all_sectors

app = typer.Typer(help="Fábrica de Sites — sistema multiagente (Fase 1: Scout).",
                  no_args_is_help=True)
scout_app = typer.Typer(help="Agente Scout — prospecção e contexto.",
                        no_args_is_help=True)
app.add_typer(scout_app, name="scout")
console = Console()


def _tabela_kpis(dados: dict) -> Table:
    k = dados["kpis"]
    t = Table(show_header=False, box=None, pad_edge=False)
    t.add_column(style="bold cyan", justify="right")
    t.add_column()
    t.add_row(str(k["total"]), "negócios mapeados")
    t.add_row(str(k["sem_site_proprio"]),
              f"sem site próprio ([bold]{k['pct_sem_site_proprio']}%[/])")
    t.add_row(str(k["so_social"]), "🔥 só rede social")
    t.add_row(str(k["com_site"]), "têm site (auditar na fase 3)")
    t.add_row(str(k["contactavel"]),
              f"com contato ([bold]{k['pct_contactavel']}%[/])")
    t.add_row(str(k["leads_quentes"]), "⭐ leads quentes (alta oport. + contato)")
    return t


@scout_app.command("run")
def scout_run(
    cidade: str = typer.Option(config.DEFAULT_CITY, "--cidade", "-c"),
    admin_level: int = typer.Option(config.DEFAULT_ADMIN_LEVEL, "--admin-level"),
    limit: Optional[int] = typer.Option(None, "--limit", "-l",
        help="Limita o nº de negócios (útil para teste rápido)."),
    out: Path = typer.Option(config.DEFAULT_REPORT_PATH, "--out", "-o"),
    abrir: bool = typer.Option(False, "--abrir", help="Abre o relatório no navegador."),
    enriquecer: bool = typer.Option(
        False, "--enriquecer", "-e",
        help=(
            "Ativa enriquecedores pós-coleta: "
            "(1) DomainGuesser — testa nomenegocio.com.br para SEM_SITE; "
            "(2) Serper — adiciona contatos via Google Maps se SERPER_API_KEY estiver configurada."
        ),
    ),
    com_serper: bool = typer.Option(
        False, "--com-serper",
        help="Adiciona Serper.dev como fonte secundária (requer SERPER_API_KEY).",
    ),
) -> None:
    """Mapeia negócios da cidade, pontua oportunidade e gera o relatório HTML."""
    config.ensure_dirs()

    # Monta a lista de fontes.
    from .agents.scout.sources import OverpassSource, SerperSource
    fontes = [OverpassSource()]
    if com_serper:
        if not config.SERPER_API_KEY:
            console.print("[yellow]⚠ --com-serper solicitado mas SERPER_API_KEY não está definida "
                          "no .env. Ignorando Serper.[/]")
        else:
            fontes.append(SerperSource())

    # Monta a lista de enriquecedores.
    from .agents.scout.enrichers import DomainGuesser
    enrichers_list = []
    if enriquecer:
        enrichers_list.append(DomainGuesser())
        if not com_serper and config.SERPER_API_KEY:
            console.print("[dim]💡 Dica: SERPER_API_KEY detectada. "
                          "Use --com-serper para adicionar contatos do Google Maps.[/]")

    # Monta o texto de fontes para o painel.
    fontes_str = " + ".join(f.name for f in fontes)
    enriq_str = ("DomainGuesser" + (", Serper" if com_serper else "")
                 if enriquecer else "nenhum")

    console.print(Panel.fit(
        f"[bold]🔭 Agente Scout[/]\n"
        f"Cidade: [cyan]{cidade}[/]\n"
        f"Fontes: [dim]{fontes_str}[/]\n"
        f"Enriquecedores: [dim]{enriq_str}[/]",
        border_style="cyan",
    ))

    t_inicio = time.perf_counter()

    try:
        with console.status("[cyan]Consultando fontes de dados...[/]"):
            run = run_scout(
                cidade,
                admin_level=admin_level,
                limit=limit,
                sources=fontes,
                enrichers=enrichers_list or None,
            )
    except Exception as exc:  # noqa: BLE001
        console.print(f"[bold red]Erro ao coletar dados:[/] {exc}")
        raise typer.Exit(code=1)

    t_total = time.perf_counter() - t_inicio

    if run.total == 0:
        console.print("[yellow]Nenhum negócio encontrado. "
                      "Confira o nome da cidade (ex.: \"Guarujá\").[/]")
        raise typer.Exit(code=0)

    # Persiste e gera o relatório.
    conn = db.connect(config.DB_PATH)
    run_id = db.save_run(conn, run)
    conn.close()
    caminho = reporter.render(run, out)
    dados = insighter.compute(run)

    console.print(_tabela_kpis(dados))
    console.print()
    for ins in dados["insights"]:
        console.print(f"  {ins}")

    # Top 10 leads.
    tabela = Table(title="\n⭐ Top 10 leads", header_style="bold")
    tabela.add_column("Nome"); tabela.add_column("Setor")
    tabela.add_column("Situação"); tabela.add_column("Score", justify="right")
    tabela.add_column("Oport."); tabela.add_column("Telefone")
    for b in dados["top_leads"][:10]:
        tabela.add_row(b.nome or "(sem nome)", b.setor_nome,
                       b.site_status.value, str(b.score), b.score_label,
                       b.telefone or "—")
    console.print(tabela)

    console.print(f"\n[dim]⏱ {t_total:.1f}s[/]")
    console.print(f"[green]✓[/] Banco: [dim]{config.DB_PATH}[/] (run #{run_id})")
    console.print(f"[green]✓[/] Relatório: [bold]{caminho}[/]")
    if abrir:
        webbrowser.open(caminho.resolve().as_uri())


@scout_app.command("setores")
def scout_setores() -> None:
    """Lista a taxonomia de setores usada na classificação."""
    t = Table(title="Setores", header_style="bold")
    t.add_column("Setor"); t.add_column("Chave", style="dim")
    t.add_column("Prioritário", justify="center")
    for s in all_sectors():
        t.add_row(f"{s.emoji} {s.nome}", s.key, "★" if s.prioritario else "")
    console.print(t)


@scout_app.command("stats")
def scout_stats() -> None:
    """Mostra estatísticas da última execução salva no banco."""
    if not config.DB_PATH.exists():
        console.print("[yellow]Nenhuma execução ainda. Rode `fabrica scout run`.[/]")
        raise typer.Exit(code=0)
    conn = db.connect(config.DB_PATH)
    run = db.latest_run(conn)
    conn.close()
    if run is None:
        console.print("[yellow]Banco vazio.[/]")
        raise typer.Exit(code=0)
    console.print(Panel.fit(
        f"Última execução · [cyan]{run.cidade}[/] · "
        f"{run.gerado_em.strftime('%d/%m/%Y %H:%M')}", border_style="cyan"))
    console.print(_tabela_kpis(insighter.compute(run)))


def main() -> None:
    app()


if __name__ == "__main__":
    app()
