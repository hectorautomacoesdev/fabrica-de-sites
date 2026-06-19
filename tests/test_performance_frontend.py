"""Testes de performance do bundle frontend.

Analisa o tamanho dos artefatos gerados pelo Vite build para:
  - frontend/   (SPA React do Scout — app de produto)
  - docs-app/   (Documentação React navegável)

Para cada app, roda dois builds e compara:
  - Produção  (minificado + tree-shaken):  npm run build
  - Dev       (bundled, sem minificação):  vite build --mode development --outDir dist-dev

Métricas coletadas por build:
  - Tempo de build (segundos)
  - Tamanho raw total de JS e CSS (KB)
  - Tamanho gzip total de JS e CSS (KB)  ← o que o browser baixa na prática
  - Chunk mais pesado (nome + tamanho)
  - Peso do highlight.js no node_modules (baseline da biblioteca completa)

Limites aplicados APENAS ao build de produção — dev naturalmente é maior.

Marcador: @pytest.mark.frontend
Para excluir esses testes (lentos, ~2-4 min): pytest -m "not frontend"
Para rodar só esses: pytest -m frontend
"""

from __future__ import annotations

import gzip
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent
FRONTEND_DIR = ROOT / "frontend"
DOCS_APP_DIR = ROOT / "docs-app"

# Limites para build de produção
_LIMITE_FRONTEND_JS_GZIP_KB  = 350   # frontend usa React + TanStack Query
_LIMITE_DOCSAPP_JS_GZIP_KB   = 230   # baseline pós-trim: 161.7KB gzip (margem ~40%)
_LIMITE_BUILD_TEMPO_S        = 120   # builds devem concluir em 2 min


# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------

def _gzip_size(path: Path) -> int:
    """Retorna o tamanho gzip do arquivo (bytes)."""
    return len(gzip.compress(path.read_bytes(), compresslevel=9))


def _analisar_dist(dist_dir: Path) -> dict:
    """Analisa o conteúdo de um diretório dist/ e retorna métricas."""
    if not dist_dir.exists():
        return {}

    assets = list(dist_dir.glob("assets/*"))
    js_files  = [f for f in assets if f.suffix == ".js"]
    css_files = [f for f in assets if f.suffix == ".css"]

    js_raw_total  = sum(f.stat().st_size for f in js_files)
    js_gzip_total = sum(_gzip_size(f) for f in js_files)
    css_raw_total  = sum(f.stat().st_size for f in css_files)
    css_gzip_total = sum(_gzip_size(f) for f in css_files)

    maior_chunk = max(js_files, key=lambda f: f.stat().st_size, default=None)

    return {
        "js_raw_kb":   js_raw_total  / 1024,
        "js_gzip_kb":  js_gzip_total / 1024,
        "css_raw_kb":  css_raw_total  / 1024,
        "css_gzip_kb": css_gzip_total / 1024,
        "n_chunks":    len(js_files),
        "maior_chunk": {
            "nome":    maior_chunk.name if maior_chunk else "—",
            "raw_kb":  maior_chunk.stat().st_size / 1024 if maior_chunk else 0,
            "gzip_kb": _gzip_size(maior_chunk) / 1024 if maior_chunk else 0,
        },
    }


def _npm_build(app_dir: Path, extra_args: list[str] | None = None) -> tuple[float, Path]:
    """
    Executa o build npm e retorna (tempo_em_s, caminho_do_dist).
    extra_args são passados após '--' para o script npm build.
    """
    cmd = ["npm", "run", "build"]
    if extra_args:
        cmd += ["--"] + extra_args

    t0 = time.perf_counter()
    result = subprocess.run(
        cmd,
        cwd=app_dir,
        capture_output=True,
        text=True,
        shell=True,  # necessário no Windows para encontrar npm no PATH
    )
    elapsed = time.perf_counter() - t0

    if result.returncode != 0:
        pytest.fail(
            f"Build falhou em {app_dir.name}:\n"
            f"STDOUT:\n{result.stdout[-2000:]}\n"
            f"STDERR:\n{result.stderr[-2000:]}"
        )

    # outDir padrão é dist/; se --outDir foi passado, usa ele
    out_dir = "dist"
    for i, arg in enumerate(extra_args or []):
        if arg == "--outDir" and i + 1 < len(extra_args or []):
            out_dir = (extra_args or [])[i + 1]
        elif arg.startswith("--outDir="):
            out_dir = arg.split("=", 1)[1]

    return elapsed, app_dir / out_dir


def _peso_highlight_js(app_dir: Path) -> dict:
    """Mede o peso do highlight.js no node_modules."""
    # O lowlight (usado pelo rehype-highlight) embute o highlight.js
    candidates = [
        app_dir / "node_modules" / "highlight.js" / "lib" / "core.js",
        app_dir / "node_modules" / "highlight.js" / "es" / "core.js",
        app_dir / "node_modules" / "highlight.js" / "lib" / "index.js",
    ]
    # Pega todos os arquivos .js do highlight.js para somar o total
    hljs_dir = app_dir / "node_modules" / "highlight.js"
    if not hljs_dir.exists():
        return {"disponivel": False}

    todos = list(hljs_dir.rglob("*.js"))
    # Foca nos arquivos de linguagem (lib/languages/ ou es/languages/)
    lang_files = [f for f in todos if "languages" in f.parts]
    outros_js  = [f for f in todos if "languages" not in f.parts]

    lang_raw_kb  = sum(f.stat().st_size for f in lang_files) / 1024
    outros_raw_kb = sum(f.stat().st_size for f in outros_js)  / 1024

    # Estima gzip do bundle completo (um arquivo representativo)
    core = next((f for f in candidates if f.exists()), None)
    core_raw_kb  = core.stat().st_size / 1024 if core else 0
    core_gzip_kb = _gzip_size(core) / 1024 if core else 0

    return {
        "disponivel":      True,
        "n_linguagens":    len(lang_files),
        "lang_raw_kb":     lang_raw_kb,
        "outros_raw_kb":   outros_raw_kb,
        "total_raw_kb":    lang_raw_kb + outros_raw_kb,
        "core_raw_kb":     core_raw_kb,
        "core_gzip_kb":    core_gzip_kb,
    }


# ---------------------------------------------------------------------------
# Fixtures — rodam os builds uma vez por sessão (são lentos)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def frontend_builds():
    """Roda build de produção e dev do frontend/. Retorna dict com métricas."""
    # produção
    t_prod, dist_prod = _npm_build(FRONTEND_DIR)
    metricas_prod = _analisar_dist(dist_prod)

    # dev (sem minificação)
    t_dev, dist_dev = _npm_build(
        FRONTEND_DIR,
        extra_args=["--mode", "development", "--outDir", "dist-dev"],
    )
    metricas_dev = _analisar_dist(dist_dev)

    # restaura dist/ de produção para não deixar lixo
    shutil.rmtree(dist_dev, ignore_errors=True)

    return {
        "prod": {"tempo_s": t_prod, **metricas_prod},
        "dev":  {"tempo_s": t_dev,  **metricas_dev},
    }


@pytest.fixture(scope="session")
def docsapp_builds():
    """Roda build de produção e dev do docs-app/. Retorna dict com métricas."""
    t_prod, dist_prod = _npm_build(DOCS_APP_DIR)
    metricas_prod = _analisar_dist(dist_prod)

    t_dev, dist_dev = _npm_build(
        DOCS_APP_DIR,
        extra_args=["--mode", "development", "--outDir", "dist-dev"],
    )
    metricas_dev = _analisar_dist(dist_dev)

    shutil.rmtree(dist_dev, ignore_errors=True)

    return {
        "prod": {"tempo_s": t_prod, **metricas_prod},
        "dev":  {"tempo_s": t_dev,  **metricas_dev},
    }


# ---------------------------------------------------------------------------
# Testes de limite — build de produção do frontend/
# ---------------------------------------------------------------------------

@pytest.mark.frontend
class TestFrontendProducao:
    def test_build_conclui_em_tempo_aceitavel(self, frontend_builds):
        t = frontend_builds["prod"]["tempo_s"]
        assert t < _LIMITE_BUILD_TEMPO_S, (
            f"Build do frontend demorou {t:.1f}s (limite {_LIMITE_BUILD_TEMPO_S}s)"
        )

    def test_js_gzip_abaixo_do_limite(self, frontend_builds):
        kb = frontend_builds["prod"]["js_gzip_kb"]
        assert kb < _LIMITE_FRONTEND_JS_GZIP_KB, (
            f"JS gzip do frontend: {kb:.1f}KB (limite {_LIMITE_FRONTEND_JS_GZIP_KB}KB)"
        )


# ---------------------------------------------------------------------------
# Testes de limite — build de produção do docs-app/
# ---------------------------------------------------------------------------

@pytest.mark.frontend
class TestDocsAppProducao:
    def test_build_conclui_em_tempo_aceitavel(self, docsapp_builds):
        t = docsapp_builds["prod"]["tempo_s"]
        assert t < _LIMITE_BUILD_TEMPO_S, (
            f"Build do docs-app demorou {t:.1f}s (limite {_LIMITE_BUILD_TEMPO_S}s)"
        )

    def test_js_gzip_abaixo_do_limite(self, docsapp_builds):
        kb = docsapp_builds["prod"]["js_gzip_kb"]
        assert kb < _LIMITE_DOCSAPP_JS_GZIP_KB, (
            f"JS gzip do docs-app: {kb:.1f}KB (limite {_LIMITE_DOCSAPP_JS_GZIP_KB}KB)\n"
            f"Dica: o highlight.js completo pesa ~700KB raw. "
            f"Considere importar apenas as linguagens usadas."
        )


# ---------------------------------------------------------------------------
# Baseline do highlight.js (sempre passa — registra o peso atual)
# ---------------------------------------------------------------------------

@pytest.mark.frontend
def test_baseline_highlight_js(capsys):
    """Mede o peso do highlight.js no node_modules da docs-app. Não falha — é baseline."""
    info = _peso_highlight_js(DOCS_APP_DIR)
    with capsys.disabled():
        print("\n\n=== Baseline highlight.js (docs-app/node_modules) ===")
        if not info.get("disponivel"):
            print("  highlight.js não encontrado em node_modules.")
        else:
            print(f"  Linguagens suportadas:   {info['n_linguagens']} arquivos .js")
            print(f"  Peso das linguagens:     {info['lang_raw_kb']:.1f} KB raw")
            print(f"  Peso do core+utils:      {info['outros_raw_kb']:.1f} KB raw")
            print(f"  Total na biblioteca:     {info['total_raw_kb']:.1f} KB raw")
            print(f"  Core isolado (raw/gzip): {info['core_raw_kb']:.1f} KB / {info['core_gzip_kb']:.1f} KB")
            print()
            print("  OPORTUNIDADE: ao importar só as linguagens usadas (Python, JS,")
            print("  Bash, TypeScript) o bundle cairia de ~700KB para ~50-80KB raw.")
        print("=" * 55)


# ---------------------------------------------------------------------------
# Relatório comparativo dev vs produção (sempre passa)
# ---------------------------------------------------------------------------

@pytest.mark.frontend
def test_relatorio_comparativo(frontend_builds, docsapp_builds, capsys):
    """Imprime tabela comparando dev vs produção para os dois apps."""

    def _linha(label, prod, dev, key_raw, key_gzip):
        pr = prod.get(key_raw, 0)
        pg = prod.get(key_gzip, 0)
        dr = dev.get(key_raw, 0)
        dg = dev.get(key_gzip, 0)
        ganho = ((dr - pr) / dr * 100) if dr > 0 else 0
        return (label, pr, pg, dr, dg, ganho)

    with capsys.disabled():
        print("\n\n=== Relatório de Bundle — Produção vs Dev (sem minificação) ===")
        print()
        hdr = f"  {'App / Métrica':<30} {'Prod raw':>10} {'Prod gzip':>10} {'Dev raw':>10} {'Dev gzip':>10} {'Redução':>9}"
        sep = "  " + "-" * (len(hdr) - 2)
        print(hdr)
        print(sep)

        for app_label, builds in [("frontend/ (Scout)", frontend_builds), ("docs-app/ (Docs)", docsapp_builds)]:
            prod = builds["prod"]
            dev  = builds["dev"]

            print(f"\n  {app_label}")

            for label, pr, pg, dr, dg, ganho in [
                _linha("    JS total",  prod, dev, "js_raw_kb",  "js_gzip_kb"),
                _linha("    CSS total", prod, dev, "css_raw_kb", "css_gzip_kb"),
            ]:
                print(
                    f"  {label:<30} {pr:>9.1f}K {pg:>9.1f}K {dr:>9.1f}K {dg:>9.1f}K {ganho:>+8.1f}%"
                )

            print(f"  {'    Tempo de build':<30} {prod['tempo_s']:>9.1f}s {'':>10} {dev['tempo_s']:>9.1f}s")
            print(f"  {'    Chunks JS':<30} {prod['n_chunks']:>10} {'':>10} {dev['n_chunks']:>10}")

            mc = prod.get("maior_chunk", {})
            if mc.get("nome"):
                print(f"  {'    Chunk maior (prod)':<30} {mc['raw_kb']:>9.1f}K {mc['gzip_kb']:>9.1f}K   {mc['nome']}")

        print(sep)
        print("\n  Redução = quanto a minificação+tree-shaking reduziu o tamanho.")
        print("  gzip = tamanho que o browser efetivamente baixa (servidor com compressão).")
        print("=" * (len(hdr) - 2) + "\n")
