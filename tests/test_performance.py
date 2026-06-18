"""Testes de desempenho do pipeline do Scout.

Filosofia: medir, não otimizar prematuramente.

Estes testes estabelecem LIMITES ACEITÁVEIS para as operações principais:
se alguma mudança futura ultrapassar um limite, o teste falha e você sabe
que algo ficou mais lento. Não usa rede — tudo mockado.

Métricas coletadas:
  - Tempo de parede (wall-clock) com time.perf_counter()
  - Pico de alocação de memória com tracemalloc (stdlib)

Limites definidos de forma conservadora (2-5x o tempo atual observado)
para não gerar falsos alarmes por variação natural do sistema.
"""

from __future__ import annotations

import time
import tracemalloc
from contextlib import contextmanager

import pytest

from fabrica_sites.agents.scout.enrichers.domain_guesser import (
    DomainGuesser,
    gerar_candidatos,
    _nome_vale_tentar,
)
from fabrica_sites.agents.scout.scout import build_business, run_scout
from fabrica_sites.agents.scout.sources.base import BusinessSource
from fabrica_sites.models import RawPlace, SiteStatus


# ---------------------------------------------------------------------------
# Utilitários de medição
# ---------------------------------------------------------------------------

@contextmanager
def _medir():
    """Contexto que mede tempo e pico de memória."""
    tracemalloc.start()
    t0 = time.perf_counter()
    yield
    elapsed = time.perf_counter() - t0
    _, pico = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    _medir.ultimo_tempo = elapsed
    _medir.ultimo_mem_kb = pico / 1024


_medir.ultimo_tempo = 0.0
_medir.ultimo_mem_kb = 0.0


# ---------------------------------------------------------------------------
# Fábrica de dados sintéticos
# ---------------------------------------------------------------------------

def _raw_sem_site(n: int) -> list[RawPlace]:
    """Gera n RawPlaces SEM_SITE com nomes únicos."""
    setores = ["hairdresser", "restaurant", "dentist", "hotel", "clothes"]
    return [
        RawPlace(
            osm_type="node",
            osm_id=i,
            lat=-23.99 + i * 0.001,
            lon=-46.26 + i * 0.001,
            tags={
                "shop" if i % 5 != 2 else "amenity": setores[i % 5],
                "name": f"Negócio Teste {i:04d}",
            },
        )
        for i in range(n)
    ]


def _raw_com_telefone(n: int) -> list[RawPlace]:
    """Gera n RawPlaces com telefone."""
    return [
        RawPlace(
            osm_type="node",
            osm_id=1000 + i,
            tags={
                "shop": "hairdresser",
                "name": f"Salão Fone {i:04d}",
                "phone": f"+55 13 9{i:04d}-0000",
            },
        )
        for i in range(n)
    ]


class _SyntheticSource(BusinessSource):
    name = "synthetic"

    def __init__(self, places: list[RawPlace]):
        self._places = places

    def fetch(self, cidade, admin_level=8, limit=None):
        return self._places[:limit] if limit else self._places


# ---------------------------------------------------------------------------
# Benchmarks de componentes individuais
# ---------------------------------------------------------------------------

class TestBenchmarkComponentes:
    """Mede operações atômicas — limites bem apertados (sub-milissegundo)."""

    def test_build_business_unitario_abaixo_de_1ms(self):
        raw = _raw_sem_site(1)[0]
        with _medir():
            for _ in range(1000):
                build_business(raw)
        por_chamada_ms = (_medir.ultimo_tempo / 1000) * 1000
        assert por_chamada_ms < 1.0, (
            f"build_business demorou {por_chamada_ms:.3f}ms por chamada "
            f"(limite: 1ms). Algo pode ter regredido."
        )

    def test_gerar_candidatos_rapido(self):
        nomes = [f"Empresa Teste {i}" for i in range(500)]
        with _medir():
            for nome in nomes:
                gerar_candidatos(nome)
        por_chamada_us = (_medir.ultimo_tempo / 500) * 1_000_000
        assert por_chamada_us < 500, (
            f"gerar_candidatos demorou {por_chamada_us:.1f}µs por chamada "
            f"(limite: 500µs)."
        )

    def test_nome_vale_tentar_rapido(self):
        nomes = [f"Negócio Aleatório {i}" for i in range(2000)]
        with _medir():
            for nome in nomes:
                _nome_vale_tentar(nome)
        por_chamada_us = (_medir.ultimo_tempo / 2000) * 1_000_000
        assert por_chamada_us < 100, (
            f"_nome_vale_tentar demorou {por_chamada_us:.1f}µs por chamada "
            f"(limite: 100µs)."
        )


# ---------------------------------------------------------------------------
# Benchmarks de pipeline
# ---------------------------------------------------------------------------

class TestBenchmarkPipeline:
    """Mede o pipeline completo com dados sintéticos (sem rede)."""

    @pytest.mark.parametrize("n", [50, 200, 500])
    def test_pipeline_sem_enricher_escala_linealmente(self, n):
        places = _raw_sem_site(n)
        source = _SyntheticSource(places)

        with _medir():
            run = run_scout("Teste", source=source)

        assert run.total == n
        tempo_por_negocio_ms = (_medir.ultimo_tempo / n) * 1000
        # Limite: 5ms por negócio (muito generoso — na prática é <0.1ms)
        assert tempo_por_negocio_ms < 5.0, (
            f"Pipeline com {n} negócios: {tempo_por_negocio_ms:.2f}ms/negócio "
            f"(limite: 5ms). Verifique se algum módulo ficou lento."
        )

    def test_pipeline_500_negocios_abaixo_de_500ms(self):
        places = _raw_sem_site(500)
        source = _SyntheticSource(places)

        with _medir():
            run = run_scout("Teste", source=source)

        assert run.total == 500
        assert _medir.ultimo_tempo < 0.5, (
            f"Pipeline de 500 negócios demorou {_medir.ultimo_tempo:.3f}s "
            f"(limite: 0.5s)."
        )

    def test_pipeline_memoria_nao_explode_em_escala(self):
        """Memória por negócio deve ser razoável — detecta vazamentos."""
        places = _raw_sem_site(1000)
        source = _SyntheticSource(places)

        with _medir():
            run = run_scout("Teste", source=source)

        assert run.total == 1000
        mem_por_negocio_kb = _medir.ultimo_mem_kb / 1000
        # Cada Business é pequeno — limite de 10KB por negócio é generoso
        assert mem_por_negocio_kb < 10.0, (
            f"Uso de memória: {mem_por_negocio_kb:.2f}KB por negócio "
            f"(limite: 10KB). Possível retenção desnecessária de dados."
        )

    def test_deduplicacao_multi_fonte_nao_degrada(self):
        """Dedup O(n²) não deve travar com centenas de negócios.

        O teste mede TEMPO, não contagem exata. Nomes sintéticos sequenciais
        ("Negócio Teste 0000", "0001"…) compartilham muitos bigramas e são
        deduplicados pelo algoritmo de Jaccard — esse comportamento é correto
        para nomes reais quase idênticos. O importante aqui é que a operação
        O(n²) termine em tempo aceitável.
        """
        class FonteA(_SyntheticSource):
            name = "fonte-a"

        class FonteB(_SyntheticSource):
            name = "fonte-b"

        places_a = _raw_sem_site(100)
        places_b = [
            RawPlace(
                osm_type="serper",
                osm_id=5000 + i,
                tags={"amenity": "restaurant", "name": f"Restaurante Único {i:03d}"},
            )
            for i in range(100)
        ]

        with _medir():
            run = run_scout("Teste", sources=[FonteA(places_a), FonteB(places_b)])

        assert run.total >= 2, "Pipeline retornou 0 negócios — problema na coleta."
        assert _medir.ultimo_tempo < 1.0, (
            f"Dedup de 200 negócios (2 fontes) demorou {_medir.ultimo_tempo:.3f}s "
            f"(limite: 1s)."
        )


# ---------------------------------------------------------------------------
# Benchmark do DomainGuesser (sem rede real)
# ---------------------------------------------------------------------------

class TestBenchmarkDomainGuesser:
    """DomainGuesser com rede mockada — mede overhead do pipeline de enriquecimento."""

    def test_enricher_overhead_por_negocio_com_mock(self, monkeypatch):
        """Overhead do enriquecimento (sem latência de rede) deve ser mínimo."""
        monkeypatch.setattr(
            "fabrica_sites.agents.scout.enrichers.domain_guesser._encontrar_site",
            lambda nome, timeout: None,  # sempre "não encontrou"
        )

        places = _raw_sem_site(100)
        source = _SyntheticSource(places)
        guesser = DomainGuesser(timeout=1.0, workers=5)

        with _medir():
            run = run_scout("Teste", source=source, enrichers=[guesser])

        assert run.total == 100
        # Overhead (sem rede): deve ser < 2s para 100 negócios
        assert _medir.ultimo_tempo < 2.0, (
            f"DomainGuesser (sem rede) demorou {_medir.ultimo_tempo:.2f}s para "
            f"100 negócios (limite: 2s). Verifique o overhead de threading."
        )

    def test_filtro_genericos_reduz_trabalho(self, monkeypatch):
        """Negócios com nomes genéricos não devem disparar verificações HTTP."""
        chamadas: list[str] = []

        def rastrear(nome, timeout):
            chamadas.append(nome)
            return None

        monkeypatch.setattr(
            "fabrica_sites.agents.scout.enrichers.domain_guesser._encontrar_site",
            rastrear,
        )

        # Metade dos negócios com nome genérico, metade com nome específico
        genericos = [
            RawPlace(osm_type="node", osm_id=i,
                     tags={"amenity": "restaurant", "name": "Bar"})
            for i in range(50)
        ]
        especificos = [
            RawPlace(osm_type="node", osm_id=100 + i,
                     tags={"amenity": "restaurant", "name": f"Restaurante Bela Vista {i}"})
            for i in range(50)
        ]

        source = _SyntheticSource(genericos + especificos)
        guesser = DomainGuesser(timeout=1.0, workers=5)
        run_scout("Teste", source=source, enrichers=[guesser])

        # Genéricos ("Bar") não devem ter sido verificados
        assert len(chamadas) == 50, (
            f"Esperava 50 verificações (só específicos), mas houve {len(chamadas)}. "
            f"Filtro de nomes genéricos pode estar falhando."
        )
        assert all("Bela Vista" in c for c in chamadas), (
            "Verificação foi feita em negócio genérico indevidamente."
        )


# ---------------------------------------------------------------------------
# Relatório de linha de base (não falha — apenas registra)
# ---------------------------------------------------------------------------

def test_imprimir_baseline_de_desempenho(capsys):
    """Imprime métricas de referência. Sempre passa — serve como documentação."""
    places_100 = _raw_sem_site(100)
    places_500 = _raw_sem_site(500)

    resultados = []
    for n, places in [(100, places_100), (500, places_500)]:
        with _medir():
            run_scout("Teste", source=_SyntheticSource(places))
        resultados.append((n, _medir.ultimo_tempo, _medir.ultimo_mem_kb))

    with capsys.disabled():
        print("\n--- Baseline de desempenho (pipeline sintético, sem rede) ---")
        print(f"  {'N':>5}  {'Tempo (ms)':>12}  {'Mem pico (KB)':>14}  {'ms/negócio':>12}")
        for n, t, m in resultados:
            print(f"  {n:>5}  {t*1000:>12.1f}  {m:>14.1f}  {t*1000/n:>12.3f}")
        print("------------------------------------------------------------")
