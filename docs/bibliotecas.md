# Bibliotecas

Cada dependência do projeto foi escolhida por uma razão clara. Esta página explica **o que
cada uma faz, por que a escolhemos e como a usamos**, com links que levam direto à
documentação oficial — inclusive às seções específicas das funções citadas.

A stack é dividida em duas: o **núcleo atual** (Fase 1, já em produção) e a **stack-alvo**
da reestruturação (Fase 1.5).

| Biblioteca | Papel | Fase |
|---|---|---|
| [httpx](#httpx) | Cliente HTTP | Núcleo |
| [Pydantic v2](#pydantic-v2) | Modelos de dados validados | Núcleo |
| [Typer](#typer) | CLI | Núcleo |
| [Rich](#rich) | Saída no terminal | Núcleo |
| [Jinja2](#jinja2) | Templates HTML | Núcleo |
| [python-dotenv](#python-dotenv) | Variáveis de ambiente | Núcleo |
| [pytest](#pytest) | Testes | Núcleo |
| [FastAPI](#fastapi) | Framework de API | Alvo |
| [SQLModel](#sqlmodel) | ORM | Alvo |
| [Alembic](#alembic) | Migrations | Alvo |
| [React](#react) + [Vite](#vite) | Frontend | Alvo |
| [TanStack Query](#tanstack-query) | Estado de servidor | Alvo |
| [MkDocs Material](#mkdocs-material) | Documentação | Ferramenta |

---

## Núcleo atual

### httpx
Cliente HTTP moderno, com API quase idêntica ao `requests`, suporte a HTTP/2 e modo
assíncrono nativo. Usamos para falar com a **Overpass API** (OSM), o **Serper** e nas
verificações do **DomainGuesser**.

```python title="HEAD rápido no DomainGuesser"
resp = httpx.head(f"https://{dominio}", follow_redirects=True, timeout=3.0)
# HEAD não baixa o corpo da página → ~10x mais rápido que GET para "o site existe?"
```

- :material-book: [Documentação](https://www.python-httpx.org/) ·
  [Quickstart](https://www.python-httpx.org/quickstart/) ·
  [`httpx.head()`](https://www.python-httpx.org/api/#helper-functions) ·
  [Clients & connection pooling](https://www.python-httpx.org/advanced/clients/)

### Pydantic v2
Validação de dados e tipagem em runtime; o core foi reescrito em Rust (muito rápido). É a
base dos nossos modelos (`RawPlace`, `Business`, `ScoutRun`) — e também do FastAPI.

```python title="model_copy() — imutabilidade no enricher"
return b.model_copy(update={"website": novo_website,
                            "website_kind": WebsiteKind.PROPRIO, **nova_aval})
```

- :material-book: [Documentação v2](https://docs.pydantic.dev/latest/) ·
  [Models](https://docs.pydantic.dev/latest/concepts/models/) ·
  [`Field`](https://docs.pydantic.dev/latest/concepts/fields/) ·
  [`model_copy`](https://docs.pydantic.dev/latest/api/base_model/#pydantic.BaseModel.model_copy)

### Typer
CLI declarativo a partir de *type hints* (mesmo autor do FastAPI). Gera help, validação e
sub-comandos automaticamente.

- :material-book: [Documentação](https://typer.tiangolo.com/) ·
  [Options](https://typer.tiangolo.com/tutorial/options/) ·
  [Sub-comandos](https://typer.tiangolo.com/tutorial/subcommands/add-typer/)

### Rich
Saída bonita no terminal: tabelas, painéis, spinners. Usado na CLI (`Panel`, `Table`,
`console.status`).

- :material-book: [Documentação](https://rich.readthedocs.io/) ·
  [Tables](https://rich.readthedocs.io/en/stable/tables.html) ·
  [Console](https://rich.readthedocs.io/en/stable/console.html)

### Jinja2
Motor de templates (o mesmo do Flask). Gera o dashboard HTML do Scout, com `autoescape`
para segurança.

- :material-book: [Documentação](https://jinja.palletsprojects.com/) ·
  [Sintaxe de templates](https://jinja.palletsprojects.com/en/stable/templates/)

### python-dotenv
Carrega variáveis de um arquivo `.env` para o ambiente, antes de qualquer `os.getenv()`.
Mantém segredos fora do código.

```python title="config.py — ordem importa"
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)
SERPER_API_KEY = os.getenv("SERPER_API_KEY") or None
```

- :material-book: [Documentação](https://saurabh-kumar.com/python-dotenv/)

### pytest
Framework de testes. 77 testes em ~0,7 s. Usamos `parametrize`, `monkeypatch` e `capsys`.
Detalhes em [Testes](testes.md).

- :material-book: [Documentação](https://docs.pytest.org/) ·
  [parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html) ·
  [monkeypatch](https://docs.pytest.org/en/stable/how-to/monkeypatch.html)

!!! note "Biblioteca padrão também conta"
    Boa parte do trabalho é feita pela *stdlib*: `abc` (interfaces plugáveis),
    `concurrent.futures` (DomainGuesser paralelo), `tracemalloc` (memória nos benchmarks),
    `urllib.parse` (extrair domínio), `hashlib` (IDs do Serper), `sqlite3`, `dataclasses`.

---

## Stack-alvo (reestruturação)

### FastAPI
Framework de API construído sobre Pydantic e Starlette: async nativo, validação automática
e documentação **Swagger/OpenAPI** gerada sozinha. Reaproveita nossos modelos Pydantic e o
`run_scout()` já puro.

- :material-book: [Documentação](https://fastapi.tiangolo.com/) ·
  [First Steps](https://fastapi.tiangolo.com/tutorial/first-steps/) ·
  [Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/) ·
  [Dependencies (`Depends`)](https://fastapi.tiangolo.com/tutorial/dependencies/) ·
  [Testing](https://fastapi.tiangolo.com/tutorial/testing/)

### SQLModel
ORM que une modelo Pydantic + tabela SQL (sobre SQLAlchemy), do mesmo autor do FastAPI.
Mesmo código fala SQLite **e** PostgreSQL.

- :material-book: [Documentação](https://sqlmodel.tiangolo.com/) ·
  [Modelos com tabela](https://sqlmodel.tiangolo.com/tutorial/create-db-and-table/) ·
  [Relacionamentos](https://sqlmodel.tiangolo.com/tutorial/relationship-attributes/)

### Alembic
Migrations para SQLAlchemy/SQLModel: versiona o schema do banco (o "git do banco").

- :material-book: [Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html) ·
  [Autogenerate](https://alembic.sqlalchemy.org/en/latest/autogenerate.html)

### React
Biblioteca de UI baseada em componentes e fluxo de dados unidirecional. Stack do dashboard.

- :material-book: [react.dev](https://react.dev/) ·
  [Pensando em React](https://react.dev/learn/thinking-in-react) ·
  [Hooks customizados](https://react.dev/learn/reusing-logic-with-custom-hooks)

### Vite
Ferramenta de build/dev server para o frontend: *hot reload* instantâneo e build otimizado.
Escolhido em vez de Next.js por mantermos uma SPA enxuta consumindo a API Python.

- :material-book: [Documentação](https://vite.dev/) ·
  [Build para produção](https://vite.dev/guide/build.html)

### TanStack Query
Gerencia o *server-state* no React: cache, revalidação e estados de carregando/erro — sem o
boilerplate de `useEffect`.

- :material-book: [Overview](https://tanstack.com/query/latest/docs/framework/react/overview) ·
  [Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries)

---

## Ferramentas

### MkDocs Material
O gerador desta documentação: tema com painel lateral, busca, dark mode e suporte a Mermaid;
referência de API gerada dos docstrings via **mkdocstrings**; deploy no GitHub Pages.

- :material-book: [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) ·
  [MkDocs](https://www.mkdocs.org/) ·
  [mkdocstrings](https://mkdocstrings.github.io/) ·
  [Ruff (linter/formatter)](https://docs.astral.sh/ruff/)
