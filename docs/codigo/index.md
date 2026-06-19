# Código — passeio módulo a módulo

Um tour pelo código do Scout. Cada módulo tem **uma responsabilidade** (ver
[Arquitetura](../arquitetura/index.md)). Os títulos linkam para o arquivo no GitHub, onde
você vê o código completo — aqui mostramos só o trecho mais ilustrativo.

> **Como ler** — o fluxo de dados é: `RawPlace` (cru) → `classifier.extract` → `scorer.score` →
> `Business` (classificado/pontuado) → `insighter` → `reporter`/`db`.

## Estrutura do pacote

```
src/fabrica_sites/
├── config.py            # configurações centrais (cidade, pesos, timeouts)
├── models.py            # modelos de dados (Pydantic) — usados no pipeline
├── cli.py               # interface de linha de comando
├── core/
│   └── sectors.py       # taxonomia de setores + tag→setor
├── db/                  # camada de dados (SQLModel + Alembic)
│   ├── models.py        # RunTable, BusinessTable (SQLModel table=True)
│   ├── engine.py        # create_engine, get_session (FastAPI Depends)
│   └── repository.py    # save_run, latest_run, get_businesses, filtros
├── services/
│   └── scout_service.py # run_and_save + get_insights (CLI e API)
├── api/                 # FastAPI REST
│   ├── app.py           # instância da app + CORS
│   ├── deps.py          # SessionDep (Annotated[Session, Depends])
│   ├── schemas/         # DTOs de request/response
│   └── routers/         # scout.py, runs.py, misc.py
└── agents/scout/
    ├── sources/         # fontes plugáveis (base, overpass, serper)
    ├── enrichers/       # enriquecedores plugáveis (base, domain_guesser)
    ├── classifier.py    # extrai campos + detecta presença web
    ├── scorer.py        # score de oportunidade
    ├── insighter.py     # KPIs + insights
    ├── reporter.py      # dashboard HTML (Jinja2)
    └── scout.py         # orquestra o pipeline (função pura)
```

## [`models.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/models.py)
As "formas" dos dados. `SiteStatus`/`WebsiteKind` são enums que herdam de `str` (serializam
direto para JSON/SQLite). `Business` é a unidade central.

```python
class SiteStatus(str, Enum):
    SEM_SITE = "SEM_SITE"
    SO_REDE_SOCIAL = "SO_REDE_SOCIAL"   # o lead mais quente
    COM_SITE = "COM_SITE"
    DESCONHECIDO = "DESCONHECIDO"
```

## [`config.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/config.py)
Tudo que é ajustável mora aqui — sem "números mágicos" espalhados. Os pesos do score, por
exemplo, são um dicionário único:

```python
SCORE_WEIGHTS = {
    "base_sem_site": 60, "base_so_rede_social": 70, "base_com_site": 25,
    "tem_telefone": 20, "tem_horario": 5, "tem_endereco": 5, "setor_prioritario": 10,
}
```

## [`core/sectors.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/core/sectors.py)
Taxonomia de setores e o mapeamento *tag do OSM → setor*. A **ordem importa**: setores
específicos primeiro; "Comércio" (qualquer `shop=*`) por último, como captura-tudo.

```python
def classify_sector(tags: dict[str, str]) -> Sector:
    for sector in SECTORS:                 # primeiro que casar vence
        for chave, valores in sector.matchers:
            if _matches(tags, chave, valores):
                return sector
    return OUTROS
```

## [`sources/`](https://github.com/hectorautomacoesdev/fabrica-de-sites/tree/main/src/fabrica_sites/agents/scout/sources)
Fontes plugáveis. A interface `BusinessSource` (ABC) define o contrato; `OverpassSource`
(OSM) e `SerperSource` (Google Maps) implementam. Trocar/empilhar fontes não toca no resto.

```python title="sources/overpass.py — fallback entre espelhos"
for url in self.endpoints:
    try:
        resp = httpx.post(url, data={"data": query}, timeout=self.timeout, ...)
        resp.raise_for_status()
        return resp.json().get("elements", [])
    except Exception as exc:        # noqa: BLE001 — tenta o próximo espelho
        ultimo_erro = exc
```

## [`classifier.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/agents/scout/classifier.py)
Extrai nome/contato/endereço e **detecta o tipo de presença web**. O `_is_social` usa
`urlparse` (não substring) para não confundir `salaox.com.br` com `x.com`:

```python
def _is_social(url: str) -> bool:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    return any(host == dom or host.endswith("." + dom) for dom in _SOCIAL_DOMAINS)
```

## [`scorer.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/agents/scout/scorer.py)
Score 0–100 **explicável**: cada ponto vem com um motivo legível em `score_motivos`.

```python
if kind is WebsiteKind.NENHUM:
    status = SiteStatus.SEM_SITE
    pontos += _W["base_sem_site"]
    motivos.append(f"Sem site (+{_W['base_sem_site']})")
```

## [`enrichers/`](https://github.com/hectorautomacoesdev/fabrica-de-sites/tree/main/src/fabrica_sites/agents/scout/enrichers)
Enriquecedores pós-coleta. O `DomainGuesser` testa `nomedonegocio.com.br` em **paralelo**
(ThreadPoolExecutor) e filtra nomes genéricos para evitar falsos positivos.

```python title="enrichers/domain_guesser.py — paralelismo I/O-bound"
with ThreadPoolExecutor(max_workers=self.workers) as pool:
    futures = {pool.submit(_encontrar_site, b.nome, self.timeout): i
               for i, b in alvos.items()}
    for future in as_completed(futures):
        if (resultado := future.result()):
            encontrados[futures[future]] = resultado
```

## [`scout.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/agents/scout/scout.py)
O orquestrador **puro** (não sabe de HTTP/HTML/DB). Coleta de várias fontes, deduplica (por
ID e por nome via Jaccard de bigramas), classifica, enriquece e ordena.

```python
def _similar(a, b, threshold=0.45) -> bool:
    ba, bb = _bigrams(_normalizar(a)), _bigrams(_normalizar(b))
    inter, union = len(ba & bb), len(ba | bb)
    return (inter / union) >= threshold if union else False   # Jaccard
```

## [`insighter.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/agents/scout/insighter.py)
Agrega KPIs e gera insights por **template** (determinístico, grátis). Um "lead quente" é
score ≥ 65 **E** contactável — funil honesto.

## [`reporter.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/agents/scout/reporter.py)
Renderiza o dashboard HTML com Jinja2 e dados embutidos como JSON (escapado para `<script>`).

## [`db/`](https://github.com/hectorautomacoesdev/fabrica-de-sites/tree/main/src/fabrica_sites/db)
Substituiu o `db.py` original (SQL cru). Três arquivos:

- **`models.py`** — `RunTable` e `BusinessTable` como `SQLModel(table=True)`. Nota: não usa
  `from __future__ import annotations` — o metaclass do SQLModel precisa das anotações em
  tempo de definição de classe.
- **`engine.py`** — cria o engine SQLite com `create_all(checkfirst=True)` (seguro para DBs
  existentes) e expõe `get_session()` como gerador para `Depends` do FastAPI.
- **`repository.py`** — funções puras que recebem `Session` explicitamente: `save_run`,
  `latest_run`, `get_run_by_id`, `list_runs`, `get_businesses` (com filtros e paginação).

## [`services/scout_service.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/services/scout_service.py)
Service layer compartilhado pela CLI e pela API: `run_and_save` (executa + persiste) e
`get_insights` (wrapper fino do insighter). Resolve o problema de duplicar lógica entre
os dois pontos de entrada.

## [`api/`](https://github.com/hectorautomacoesdev/fabrica-de-sites/tree/main/src/fabrica_sites/api)
FastAPI com 7 endpoints REST:

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/healthz` | Verifica se a API está no ar |
| `GET` | `/api/sectors` | Lista taxonomia de setores |
| `POST` | `/api/scout/runs` | Dispara uma nova coleta |
| `GET` | `/api/runs` | Lista runs (metadados) |
| `GET` | `/api/runs/{id}` | Detalhes de uma run |
| `GET` | `/api/runs/{id}/insights` | KPIs + insights de texto |
| `GET` | `/api/runs/{id}/businesses` | Negócios com filtros e paginação |

Para rodar: `uvicorn fabrica_sites.api.app:app --reload --port 8001` → Swagger em
[`http://localhost:8001/docs`](http://localhost:8001/docs).

## [`cli.py`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/cli.py)
Interface no terminal (Typer + Rich): `fabrica scout run|setores|stats`. Migrada para
chamar `scout_service.run_and_save()` — sem dependência direta do banco.

---

➡️ Continue em [Convenções de Código](convencoes.md) para os padrões de escrita e estilo.
