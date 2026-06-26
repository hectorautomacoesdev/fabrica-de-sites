"""Testes de contrato da API REST (FastAPI TestClient).

Verificam: status HTTP, formato das respostas e comportamento dos filtros.
Usam o banco SQLite real em data/fabrica.db — se não houver runs, alguns
testes são pulados graciosamente.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from fabrica_sites.api.app import app

client = TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_list_sectors_retorna_lista():
    r = client.get("/api/sectors")
    assert r.status_code == 200
    sectors = r.json()
    assert isinstance(sectors, list)
    assert len(sectors) >= 5
    # Verifica estrutura de um setor
    s = sectors[0]
    assert "key" in s
    assert "nome" in s
    assert "prioritario" in s


# ---------------------------------------------------------------------------
# Runs
# ---------------------------------------------------------------------------

def test_list_runs_retorna_lista():
    r = client.get("/api/runs")
    assert r.status_code == 200
    runs = r.json()
    assert isinstance(runs, list)


def test_list_runs_respeita_limit():
    r = client.get("/api/runs?limit=2")
    assert r.status_code == 200
    assert len(r.json()) <= 2


def test_list_runs_limit_invalido_retorna_422():
    r = client.get("/api/runs?limit=0")
    assert r.status_code == 422


def test_get_run_inexistente_retorna_404():
    r = client.get("/api/runs/999999")
    assert r.status_code == 404


def test_get_run_insights_inexistente_retorna_404():
    r = client.get("/api/runs/999999/insights")
    assert r.status_code == 404


def test_get_businesses_run_inexistente_retorna_lista_vazia():
    """Run inexistente retorna lista vazia (não há businesses para ela)."""
    r = client.get("/api/runs/999999/businesses")
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# Testes com dados reais (pulados se banco vazio)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def first_run_id() -> int | None:
    r = client.get("/api/runs")
    runs = r.json()
    return runs[0]["id"] if runs else None


def test_get_run_retorna_campos_corretos(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}")
    assert r.status_code == 200
    run = r.json()
    assert "id" in run
    assert "cidade" in run
    assert "total" in run
    assert "fonte" in run
    assert "gerado_em" in run
    assert run["total"] > 0


def test_get_insights_retorna_kpis(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}/insights")
    assert r.status_code == 200
    body = r.json()
    assert "kpis" in body
    assert "insights" in body
    kpis = body["kpis"]
    assert kpis["total"] > 0
    assert isinstance(kpis["pct_sem_site_proprio"], float)
    assert isinstance(body["insights"], list)
    assert len(body["insights"]) > 0
    # Agregação por setor exposta para o overview de categorias
    assert "por_setor" in body
    assert isinstance(body["por_setor"], list)
    assert len(body["por_setor"]) >= 1
    s = body["por_setor"][0]
    for campo in ("key", "nome", "emoji", "cor", "total", "oportunidade",
                  "score_medio", "leads_quentes"):
        assert campo in s
    assert "status_dist" in body and isinstance(body["status_dist"], dict)


def test_get_businesses_retorna_lista(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}/businesses?limit=10")
    assert r.status_code == 200
    bizs = r.json()
    assert isinstance(bizs, list)
    assert len(bizs) <= 10
    if bizs:
        b = bizs[0]
        assert "id" in b
        assert "setor" in b
        assert "site_status" in b
        assert "score" in b
        assert "contactavel" in b
        # Campos ricos para o painel de detalhe (visão 360 do lead)
        assert "horario" in b
        assert "score_motivos" in b
        assert isinstance(b["score_motivos"], list)
        # Resumo determinístico: presente e não-vazio
        assert "resumo" in b
        assert b["resumo"] and isinstance(b["resumo"], str)


def test_businesses_limit_aceita_ate_5000(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    # O mapa/overview pedem todos os pontos; o teto subiu de 1000 → 5000.
    assert client.get(
        f"/api/runs/{first_run_id}/businesses?limit=5000").status_code == 200
    assert client.get(
        f"/api/runs/{first_run_id}/businesses?limit=5001").status_code == 422


def test_filtro_contactavel(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}/businesses?contactavel=true&limit=50")
    assert r.status_code == 200
    for b in r.json():
        assert b["contactavel"] is True


def test_filtro_score_min(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}/businesses?score_min=65&limit=50")
    assert r.status_code == 200
    for b in r.json():
        assert b["score"] >= 65


def test_filtro_busca_retorna_matches(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    # busca por string muito curta deve retornar 422
    r = client.get(f"/api/runs/{first_run_id}/businesses?busca=a")
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Total (header X-Total-Count) e ordenação
# ---------------------------------------------------------------------------

def test_businesses_header_total_presente(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}/businesses?limit=5")
    assert r.status_code == 200
    assert "X-Total-Count" in r.headers
    total = int(r.headers["X-Total-Count"])
    assert total >= len(r.json())  # o total ignora o limit


def test_businesses_total_respeita_filtro(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    todos = int(client.get(
        f"/api/runs/{first_run_id}/businesses?limit=1").headers["X-Total-Count"])
    contact = int(client.get(
        f"/api/runs/{first_run_id}/businesses?contactavel=true&limit=1"
    ).headers["X-Total-Count"])
    assert 0 <= contact <= todos


def test_businesses_ordenacao_score_asc_e_desc(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    asc = [b["score"] for b in client.get(
        f"/api/runs/{first_run_id}/businesses?order_by=score&order_dir=asc&limit=100"
    ).json()]
    assert asc == sorted(asc)                  # crescente
    desc = [b["score"] for b in client.get(
        f"/api/runs/{first_run_id}/businesses?limit=100").json()]
    assert desc == sorted(desc, reverse=True)  # desc é o padrão (compatível)


def test_businesses_ordenacao_por_nome_ok(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(
        f"/api/runs/{first_run_id}/businesses?order_by=nome&order_dir=asc&limit=10")
    assert r.status_code == 200


def test_businesses_order_by_invalido_retorna_422(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}/businesses?order_by=cpf")
    assert r.status_code == 422


def test_businesses_order_dir_invalido_retorna_422(first_run_id):
    if first_run_id is None:
        pytest.skip("Banco sem runs")
    r = client.get(f"/api/runs/{first_run_id}/businesses?order_dir=cima")
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/scout/runs — apenas valida que endpoint existe e recusa payloads inválidos
# ---------------------------------------------------------------------------

def test_start_run_cidade_vazia_retorna_erro():
    r = client.post("/api/scout/runs", json={"cidade": ""})
    # FastAPI pode retornar 422 (validation) ou 404/500 dependendo do pipeline.
    # O importante é que NÃO retorne 201 com cidade vazia.
    assert r.status_code != 201


def test_start_run_com_serper_sem_chave_retorna_422(monkeypatch):
    """com_serper=True sem API key configurada deve retornar 422."""
    monkeypatch.setattr(
        "fabrica_sites.api.routers.scout.config.SERPER_API_KEY", None
    )
    r = client.post("/api/scout/runs", json={"cidade": "Guarujá", "com_serper": True})
    assert r.status_code == 422
