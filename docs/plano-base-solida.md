# Plano — Base Sólida (Documentação + Reestruturação do Scout)

> **▣ Por que esta fase existe** — o Agente Scout é o **coração** do projeto — é dele que saem as oportunidades. Antes de
> avançar para os próximos agentes, vamos **solidificar a base**: transformar o Scout de
> um script local (CLI + HTML estático + SQLite cru) em uma **aplicação real** — backend
> com API, frontend React, banco com ORM/migrations — e construir esta documentação de
> referência. Tudo roda **local** por enquanto (sem nuvem), mas estruturado como app de
> produção, pronto para escalar depois.

## Progresso

| Fase | O que é | Status |
|---|---|---|
| **0** | GitHub + higiene de segredos | ✅ Concluída |
| **1** | Documentação (MkDocs Material → GitHub Pages) | 🚧 Em andamento |
| **2** | Reestruturação do Scout (FastAPI + SQLModel + React) | ⏳ Após a doc |
| **3** | Estratégia de testes (documentada na 1, implementada na 2) | ⏳ |

> Ordem combinada com o usuário: **primeiro a documentação**, depois a reestruturação.

## Decisões de stack (tomadas em conjunto)

| Camada | Escolha | Motivo |
|--------|---------|--------|
| Frontend | **Vite + React + TypeScript** (SPA) | Domínio do React; painel interno não precisa de SSR; separação limpa com a API |
| Backend | **FastAPI** | Reaproveita 100% do Python e dos modelos Pydantic; `run_scout()` já é serviço puro; Swagger automático |
| Banco | **SQLModel + SQLite** + **Alembic** | Mesmo autor do FastAPI; zero infra local; troca p/ Postgres = mudar a conexão; migrations versionadas |
| Docs | **MkDocs Material** | Markdown, painel/busca prontos, referência de API via mkdocstrings, deploy trivial no Pages |
| GitHub | **Repo público + GitHub Pages** | Pages grátis e imediato (com porta de segurança para segredos — Fase 0) |
| Relatórios 01/02/03 | **Migrar conteúdo p/ MkDocs** | Ganha busca/navegação/consistência; HTML antigos arquivados |
| Escopo Scout | **Refatorar p/ API + manter CLI** | Mesmo núcleo serve CLI e API; base sólida sem perder o que existe |

## Arquitetura-alvo

```text
React (Vite + TS) ──HTTP/JSON──▶ FastAPI (routers + DTOs) ─┐
                                                            ▼
CLI (fabrica) ──────────────────────────────────▶ Service layer
                                          (run_scout, insights, persistência)
                                                            │
                                                            ▼
                                                  SQLModel ──▶ SQLite → Postgres
```

A CLI atual e a nova API consomem **o mesmo** service layer — sem duplicar lógica.

## Fase 0 — GitHub + higiene de segredos ✅

1. Verificar autenticação (`gh auth status`).
2. `.gitignore` cobrindo `.env`, `.venv/`, `data/*.db`, `__pycache__/`, `node_modules/`,
   `frontend/dist/`, `site/`.
3. **Varredura de segredos** antes do primeiro commit: a chave do Serper vive **só** no
   `.env` (ignorado). Criado `.env.example` sem valores.
4. `git init`, commit inicial, repositório **público**, push.

## Fase 1 — Documentação (MkDocs Material) 🚧

- **Setup**: tema Material (painel lateral, busca, dark mode), mermaid, mkdocstrings.
- **Seções**: Início · Arquitetura (full-stack + design patterns + design de banco) ·
  Bibliotecas · Código (módulo a módulo + convenções) · Testes · Decisões (ADRs) ·
  Roadmap · **este Plano** · Relatórios de Sessão · Referência de API · Escalando para a nuvem.
- **Conteúdo pesquisado** com referências oficiais em cada seção densa.
- **Citações de código** como *permalinks* do GitHub (resolve "não dá para colar tudo").
- **Publicação**: GitHub Actions → GitHub Pages a cada push em `main`.

## Fase 2 — Reestruturação do Scout ⏳

- **Dados**: models SQLModel (`Run`, `Business`) + Alembic; repositórios substituem o SQL cru.
- **Service layer**: `scout_service` reutilizável por CLI e API.
- **API**: FastAPI com `POST /api/scout/runs`, `GET /api/runs[/{id}]`,
  `GET /api/runs/{id}/businesses` (filtros + paginação), `GET /api/sectors`, `GET /healthz`.
  DTOs separados dos models de banco; Swagger em `/docs`.
- **Frontend**: app Vite + React + TS consumindo a API (KPIs, gráficos, mapa, tabela filtrável).
- **CLI**: mantida, apontando para o novo service layer.

## Fase 3 — Estratégia de testes ⏳

Pirâmide explícita: unitários · integração · contrato/API (`TestClient`) · componente
(Vitest + RTL) · e2e (Playwright) · desempenho (tracemalloc). CI roda tudo a cada push.

## Riscos / observações

- **Segredos em repo público** → mitigado pela Fase 0.
- **Python 3.14 vs libs** → FastAPI/SQLModel/Alembic suportam 3.11+; validar no 3.14 atual.
  Não afeta o plano de CrewAI (fases 2+ seguem em venv 3.12 separado — ver [Decisões](decisoes.md)).
- **Migração dos relatórios** → os HTML originais ficam preservados em `docs/_arquivo/`.
