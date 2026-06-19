# Estrutura do projeto

Como as pastas são organizadas e — o mais importante — **como elas conversam**. A regra de ouro: cada pasta tem uma responsabilidade, e as dependências apontam sempre para dentro (do mundo externo para o núcleo).

> Esta página tem uma versão **interativa** na documentação React (`docs-app/`), com o mapa de camadas colorido. Aqui está a versão em texto, equivalente em conteúdo.

## Mapa de pastas

| Caminho | Papel |
|---|---|
| `src/fabrica_sites/` | Código Python do produto (o cérebro) |
| `  ├─ agents/scout/` | O pipeline: sources, enrichers, classifier, scorer, scout |
| `  ├─ api/` | FastAPI: routers, schemas (DTOs), deps |
| `  ├─ services/` | Orquestração compartilhada (CLI + API) |
| `  ├─ db/` | SQLModel: models, engine, repository |
| `  ├─ core/` | Domínio puro: taxonomia de setores |
| `  ├─ models.py` | Modelos Pydantic do pipeline |
| `  ├─ config.py` | Configurações centrais (sem números mágicos) |
| `  └─ cli.py` | CLI (Typer + Rich) |
| `frontend/` | SPA React do dashboard (o produto) |
| `docs-app/` | Esta documentação (React) |
| `tests/` | 93 testes (unit, integração, contrato, desempenho) |
| `alembic/` | Migrations do banco (versionamento de schema) |
| `data/` | Banco e relatórios gerados — gitignored |

## Como as pastas conversam (as camadas)

Cada requisição desce pelas camadas. Uma camada só conhece a de baixo — trocar a de cima (ou a de baixo) não quebra o meio. A **CLI** entra direto no service layer.

```text
  CLI (fabrica) ────────────────┐
                                ▼
  Frontend (React)   frontend/ · docs-app/    só apresentação e interação; sem regra de negócio
        │
        ▼
  API (FastAPI)      src/…/api/               traduz HTTP ⇄ serviço; DTOs, validação, status, Swagger
        │
        ▼
  Service layer      src/…/services/          orquestra run_scout + persistência + insights
        │
        ▼
  Repositórios       src/…/db/                isolam o acesso ao banco; nenhuma SQL acima daqui
  (SQLModel)
        │
        ▼
  Banco              data/fabrica.db          SQLite → Postgres (mesmo código SQLModel)
```

> **ℹ A regra de dependência (Clean Architecture)** — as setas apontam **para dentro**: o frontend depende da API, a API depende do serviço, o serviço depende do repositório. O núcleo (regra de negócio) não conhece as bordas (HTTP, framework, banco). É isso que mantém o núcleo testável e estável enquanto as bordas mudam. Detalhe em [Arquitetura](arquitetura/index.md).
