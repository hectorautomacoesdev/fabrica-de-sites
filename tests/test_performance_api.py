"""Testes de performance da API REST.

Mede latência (p50/p95/p99) e alocação de memória dos endpoints principais
via FastAPI TestClient (sem servidor real, sem overhead TCP).

Limites definidos de forma conservadora (5-10x o tempo típico esperado)
para não gerar falsos alarmes por variação natural do sistema.
"""

from __future__ import annotations

import statistics
import time
import tracemalloc

from fastapi.testclient import TestClient

from fabrica_sites.api.app import app

client = TestClient(app)

_N = 50  # repetições por endpoint


def _latencias(fn, n: int = _N) -> list[float]:
    """Executa fn n vezes e retorna latências em ms."""
    tempos: list[float] = []
    for _ in range(n):
        t0 = time.perf_counter()
        fn()
        tempos.append((time.perf_counter() - t0) * 1000)
    return tempos


def _p(lat: list[float], pct: int) -> float:
    return statistics.quantiles(lat, n=100)[pct - 1]


# ---------------------------------------------------------------------------
# Latência por endpoint
# ---------------------------------------------------------------------------

class TestLatenciaEndpoints:
    """Verifica que nenhum endpoint regride além do limite definido."""

    def test_healthz_p95_abaixo_de_10ms(self):
        lat = _latencias(lambda: client.get("/healthz"))
        p95 = _p(lat, 95)
        assert p95 < 10, f"/healthz p95={p95:.1f}ms (limite 10ms)"

    def test_sectors_p95_abaixo_de_50ms(self):
        lat = _latencias(lambda: client.get("/api/sectors"))
        p95 = _p(lat, 95)
        assert p95 < 50, f"/api/sectors p95={p95:.1f}ms (limite 50ms)"

    def test_list_runs_p95_abaixo_de_50ms(self):
        lat = _latencias(lambda: client.get("/api/runs"))
        p95 = _p(lat, 95)
        assert p95 < 50, f"/api/runs p95={p95:.1f}ms (limite 50ms)"

    def test_run_404_p95_abaixo_de_50ms(self):
        lat = _latencias(lambda: client.get("/api/runs/999999"))
        p95 = _p(lat, 95)
        assert p95 < 50, f"/api/runs/999999 p95={p95:.1f}ms (limite 50ms)"

    def test_businesses_p95_abaixo_de_100ms(self):
        lat = _latencias(lambda: client.get("/api/runs/999999/businesses"))
        p95 = _p(lat, 95)
        assert p95 < 100, f"/api/runs/.../businesses p95={p95:.1f}ms (limite 100ms)"

    def test_insights_p95_abaixo_de_50ms(self):
        lat = _latencias(lambda: client.get("/api/runs/999999/insights"))
        p95 = _p(lat, 95)
        assert p95 < 50, f"/api/runs/.../insights p95={p95:.1f}ms (limite 50ms)"


# ---------------------------------------------------------------------------
# Throughput
# ---------------------------------------------------------------------------

class TestThroughput:
    """Mede quantas requisições por segundo a API processa em série."""

    def test_healthz_throughput_acima_de_100_rps(self):
        n = 200
        t0 = time.perf_counter()
        for _ in range(n):
            client.get("/healthz")
        rps = n / (time.perf_counter() - t0)
        assert rps > 100, f"/healthz throughput={rps:.0f} req/s (mínimo 100)"

    def test_sectors_throughput_acima_de_50_rps(self):
        n = 100
        t0 = time.perf_counter()
        for _ in range(n):
            client.get("/api/sectors")
        rps = n / (time.perf_counter() - t0)
        assert rps > 50, f"/api/sectors throughput={rps:.0f} req/s (mínimo 50)"

    def test_runs_throughput_acima_de_50_rps(self):
        n = 100
        t0 = time.perf_counter()
        for _ in range(n):
            client.get("/api/runs")
        rps = n / (time.perf_counter() - t0)
        assert rps > 50, f"/api/runs throughput={rps:.0f} req/s (mínimo 50)"


# ---------------------------------------------------------------------------
# Alocação de memória por request
# ---------------------------------------------------------------------------

class TestMemoriaEndpoints:
    """Detecta vazamentos — memória por request não deve crescer sem controle."""

    def test_healthz_memoria_por_request_abaixo_de_10kb(self):
        n = 100
        tracemalloc.start()
        for _ in range(n):
            client.get("/healthz")
        _, pico = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        kb_por_req = (pico / 1024) / n
        assert kb_por_req < 10, (
            f"/healthz aloca {kb_por_req:.2f}KB/req (limite 10KB)"
        )

    def test_sectors_memoria_por_request_abaixo_de_50kb(self):
        n = 50
        tracemalloc.start()
        for _ in range(n):
            client.get("/api/sectors")
        _, pico = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        kb_por_req = (pico / 1024) / n
        assert kb_por_req < 50, (
            f"/api/sectors aloca {kb_por_req:.2f}KB/req (limite 50KB)"
        )

    def test_runs_memoria_por_request_abaixo_de_50kb(self):
        n = 50
        tracemalloc.start()
        for _ in range(n):
            client.get("/api/runs")
        _, pico = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        kb_por_req = (pico / 1024) / n
        assert kb_por_req < 50, (
            f"/api/runs aloca {kb_por_req:.2f}KB/req (limite 50KB)"
        )


# ---------------------------------------------------------------------------
# Relatório consolidado (sempre passa — serve como documentação viva)
# ---------------------------------------------------------------------------

def test_relatorio_completo_api(capsys):
    """Imprime tabela de latências e throughput de todos os endpoints."""
    endpoints = [
        ("/healthz",                        "healthcheck"),
        ("/api/sectors",                    "lista setores"),
        ("/api/runs",                       "lista runs"),
        ("/api/runs?limit=2",               "lista runs (limit)"),
        ("/api/runs/999999",                "run inexistente (404)"),
        ("/api/runs/999999/businesses",     "businesses (run inex.)"),
        ("/api/runs/999999/insights",       "insights (run inex.)"),
    ]

    linhas: list[tuple] = []
    for url, label in endpoints:
        lat = _latencias(lambda u=url: client.get(u), n=50)
        p50 = _p(lat, 50)
        p95 = _p(lat, 95)
        p99 = _p(lat, 99)
        linhas.append((label, p50, p95, p99))

    # throughput
    n_tp = 200
    t0 = time.perf_counter()
    for _ in range(n_tp):
        client.get("/healthz")
    rps_healthz = n_tp / (time.perf_counter() - t0)

    n_tp = 100
    t0 = time.perf_counter()
    for _ in range(n_tp):
        client.get("/api/runs")
    rps_runs = n_tp / (time.perf_counter() - t0)

    with capsys.disabled():
        sep = "  " + "-" * 72
        print("\n\n=== Relatório de Performance da API (TestClient, sem overhead TCP) ===")
        print(f"\n  {'Endpoint':<35} {'p50 ms':>8} {'p95 ms':>8} {'p99 ms':>8}")
        print(sep)
        for label, p50, p95, p99 in linhas:
            print(f"  {label:<35} {p50:>8.2f} {p95:>8.2f} {p99:>8.2f}")
        print(sep)
        print(f"\n  Throughput /healthz:   {rps_healthz:>6.0f} req/s")
        print(f"  Throughput /api/runs:  {rps_runs:>6.0f} req/s")
        print("\n  Obs.: valores acima NÃO incluem latência de rede TCP.")
        print("        Para latência real, use bench_recursos.py.\n")
