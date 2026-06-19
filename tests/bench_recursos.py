"""Script de benchmark de recursos do sistema.

Inicia o uvicorn em subprocesso e mede RAM (RSS) e CPU% do processo
em repouso e sob carga, usando psutil. Imprime relatório no terminal.

USO:
    python tests/bench_recursos.py

Requer: psutil (pip install -e ".[dev]"), uvicorn já instalado no venv.
NÃO é um teste pytest — é um script standalone.
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
UVICORN = ROOT / ".venv" / "Scripts" / "uvicorn.exe"
API_URL = "http://127.0.0.1:8001"
PORT = 8001

ENDPOINTS_CARGA = [
    "/healthz",
    "/api/sectors",
    "/api/runs",
    "/api/runs/999999",
    "/api/runs/999999/businesses",
    "/api/runs/999999/insights",
]

N_REQUISICOES = 60  # por endpoint na fase de carga


def _verificar_deps():
    try:
        import psutil   # noqa: F401
        import httpx    # noqa: F401
    except ImportError as e:
        print(f"[ERRO] Dependência ausente: {e}")
        print("       Instale com: pip install -e '.[dev]'")
        sys.exit(1)


def _aguardar_api(timeout_s: float = 15.0) -> bool:
    """Aguarda a API subir fazendo polling em /healthz."""
    import httpx
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            r = httpx.get(f"{API_URL}/healthz", timeout=1.0)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.3)
    return False


def _medir_processo(proc_psutil, duracao_s: float = 2.0) -> dict:
    """Coleta amostras de RAM e CPU do processo por duracao_s segundos."""
    import psutil
    amostras_cpu = []
    amostras_ram = []
    deadline = time.monotonic() + duracao_s
    proc_psutil.cpu_percent()  # descarta primeira leitura (sempre 0.0)
    while time.monotonic() < deadline:
        try:
            amostras_cpu.append(proc_psutil.cpu_percent(interval=0.1))
            mem = proc_psutil.memory_info()
            amostras_ram.append(mem.rss / 1024 / 1024)  # MB
        except Exception:
            break
    if not amostras_ram:
        return {}
    return {
        "ram_mb_media": sum(amostras_ram) / len(amostras_ram),
        "ram_mb_max":   max(amostras_ram),
        "cpu_pct_media": sum(amostras_cpu) / len(amostras_cpu),
        "cpu_pct_max":   max(amostras_cpu),
    }


def _fazer_carga(n_por_endpoint: int) -> dict:
    """Dispara requisições para todos os endpoints e mede latências."""
    import httpx
    import statistics

    latencias: dict[str, list[float]] = {ep: [] for ep in ENDPOINTS_CARGA}

    with httpx.Client(base_url=API_URL, timeout=10.0) as cli:
        for _ in range(n_por_endpoint):
            for ep in ENDPOINTS_CARGA:
                t0 = time.perf_counter()
                cli.get(ep)
                latencias[ep].append((time.perf_counter() - t0) * 1000)

    return {
        ep: {
            "p50": statistics.median(lat),
            "p95": statistics.quantiles(lat, n=100)[94],
            "media": statistics.mean(lat),
        }
        for ep, lat in latencias.items()
    }


def main():
    _verificar_deps()
    import psutil

    print("\n" + "=" * 60)
    print("  Fábrica de Sites — Benchmark de Recursos do Sistema")
    print("=" * 60)
    print(f"\n  Iniciando uvicorn na porta {PORT}...")

    proc = subprocess.Popen(
        [str(UVICORN), "fabrica_sites.api.app:app", "--port", str(PORT)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=ROOT,
    )

    try:
        ps = psutil.Process(proc.pid)

        print("  Aguardando API subir (máx 15s)...", end="", flush=True)
        if not _aguardar_api(timeout_s=15.0):
            print(" FALHOU")
            print("[ERRO] API não respondeu em 15s. Verifique se a porta está livre.")
            return
        print(" OK")

        # --- Fase 1: em repouso ---
        print("\n  [1/3] Medindo recursos em repouso (2s)...")
        repouso = _medir_processo(ps, duracao_s=2.0)

        # --- Fase 2: carga ---
        print(f"  [2/3] Aplicando carga ({N_REQUISICOES} req × {len(ENDPOINTS_CARGA)} endpoints)...")
        t_carga0 = time.perf_counter()
        latencias = _fazer_carga(N_REQUISICOES)
        t_carga = time.perf_counter() - t_carga0
        total_reqs = N_REQUISICOES * len(ENDPOINTS_CARGA)
        rps_total = total_reqs / t_carga

        # --- Fase 3: sob carga (medição simultânea — aprox pós-carga) ---
        print("  [3/3] Medindo recursos após carga (2s)...")
        sob_carga = _medir_processo(ps, duracao_s=2.0)

        # --- Relatório ---
        print("\n" + "=" * 60)
        print("  RESULTADO — Recursos do Processo (uvicorn)")
        print("=" * 60)
        print(f"\n  {'Métrica':<30} {'Repouso':>12} {'Pós-carga':>12}")
        print("  " + "-" * 56)
        if repouso and sob_carga:
            print(f"  {'RAM RSS média (MB)':<30} {repouso['ram_mb_media']:>11.1f}  {sob_carga['ram_mb_media']:>11.1f}")
            print(f"  {'RAM RSS máxima (MB)':<30} {repouso['ram_mb_max']:>11.1f}  {sob_carga['ram_mb_max']:>11.1f}")
            print(f"  {'CPU% média':<30} {repouso['cpu_pct_media']:>11.1f}  {sob_carga['cpu_pct_media']:>11.1f}")
            print(f"  {'CPU% máxima':<30} {repouso['cpu_pct_max']:>11.1f}  {sob_carga['cpu_pct_max']:>11.1f}")
        print(f"\n  Total de requisições:  {total_reqs}")
        print(f"  Tempo da carga:        {t_carga:.2f}s")
        print(f"  Throughput real (TCP): {rps_total:.0f} req/s")

        print("\n" + "=" * 60)
        print("  RESULTADO — Latência por Endpoint (com TCP real)")
        print("=" * 60)
        print(f"\n  {'Endpoint':<35} {'p50 ms':>8} {'p95 ms':>8} {'média ms':>10}")
        print("  " + "-" * 63)
        for ep, stats in latencias.items():
            print(
                f"  {ep:<35} {stats['p50']:>8.2f} {stats['p95']:>8.2f} {stats['media']:>10.2f}"
            )
        print("  " + "-" * 63)
        print("\n  Obs.: latências acima incluem overhead TCP real (localhost).")
        print("=" * 60 + "\n")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
