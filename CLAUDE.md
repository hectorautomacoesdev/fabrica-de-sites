# CLAUDE.md — Fábrica de Sites

Instruções de projeto para o Claude Code. Carregado em toda sessão. Mantenha curto e de alto sinal.

## O que é o projeto

Sistema **multiagente** que encontra negócios locais sem site (ou com site fraco), gera sites sob medida e oferece aos donos. Mercado inicial: **Guarujá/SP**. Projeto de aprendizado: o Hector quer **participar da construção**, não só receber o resultado.

Os 5 agentes (construídos em fases, do simples ao complexo):

| # | Agente | Papel | Fase |
|---|--------|-------|------|
| 1 | **Scout** | Mapeia negócios, detecta quem não tem site, ranqueia oportunidade | ✅ concluído (1 + 1.5) |
| 2 | **Benchmark** | Define o que é "site bom" por setor | próxima |
| 3 | **Auditor** | Avalia sites existentes | futura |
| 4 | **Criador** | Gera e publica o site | futura |
| 5 | **Prospector** | Contata o dono (WhatsApp/e-mail) | futura |

**Estado atual:** Fase 1.5 (Base Sólida) concluída — Scout virou app full-stack local: FastAPI + SQLModel + React. 93 testes passando.

## Stack e layout

- **Python ≥ 3.11** (venv principal em `.venv` usa 3.14). ⚠️ **CrewAI não roda no 3.14** — fases 2+ usarão um venv 3.12 separado.
- **Backend:** FastAPI + SQLModel (sobre SQLAlchemy) + SQLite + Alembic (migrations).
- **Frontend (produto):** Vite + React 19 + TypeScript + TanStack Query + axios, em `frontend/`.
- **CLI:** Typer + Rich. **HTTP:** httpx. **Templates:** Jinja2. **Config:** pydantic + python-dotenv.

```
src/fabrica_sites/
├── config.py              # configs centrais (cidade, pesos do score)
├── models.py              # modelos de domínio (Pydantic): RawPlace, Business, ScoutRun
├── cli.py                 # CLI (Typer) — usa o service layer
├── core/sectors.py        # taxonomia de setores + mapeamento de tags OSM
├── db/                    # engine, models (SQLModel: RunTable/BusinessTable), repository
├── services/scout_service.py   # run_and_save + get_insights (CLI e API chamam o MESMO)
├── api/                   # FastAPI: app, deps, routers/{scout,runs,misc}, schemas/responses (DTOs)
└── agents/scout/
    ├── sources/           # fontes plugáveis (ABC): overpass.py, serper.py
    ├── enrichers/         # enrichers plugáveis (ABC): domain_guesser.py
    ├── classifier.py · scorer.py · insighter.py · reporter.py · scout.py
    └── templates/report.html.j2
tests/                     # 93 testes (unit/integração/performance + contrato de API)
frontend/                  # SPA React (produto Scout)
docs/                      # documentação (atual: MkDocs Material → GitHub Pages)
alembic/                   # migrations
```

## Comandos

```powershell
# Instalar (uma vez)
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"               # runtime + pytest

# CLI (grátis, sem chave de API)
fabrica scout run --cidade "Guarujá" --abrir
fabrica scout setores | stats | --help

# Backend (API)
.\.venv\Scripts\uvicorn.exe fabrica_sites.api.app:app --reload --port 8001   # Swagger em /docs

# Frontend
cd frontend; npm install; npm run dev        # dev server (proxy → API :8001)
npm run build                                 # build de produção
npm run lint                                  # eslint

# Testes (rodar antes de declarar algo pronto)
.\.venv\Scripts\pytest.exe                    # 93 testes, ~0,7s

# Banco (migrations)
.\.venv\Scripts\alembic.exe upgrade head      # aplica migrations
.\.venv\Scripts\alembic.exe stamp head        # marca DB já existente sem rodar migration

# Docs (atual)
pip install -e ".[docs]"; mkdocs serve        # preview local em :8000
```

## Convenções

- **Determinístico primeiro, IA depois.** O que dá pra fazer sem LLM, fazemos sem LLM.
- **Tudo plugável.** Novas fontes/enrichers implementam a ABC em `sources/base.py` / `enrichers/base.py` — não se mexe no pipeline.
- **Uma fonte da verdade por lógica.** CLI e API chamam o mesmo `scout_service`. Nunca duplicar regra de negócio.
- **DTOs separados do domínio.** Modelos de API ficam em `api/schemas/` (não expor SQLModel cru).
- **Imutabilidade no enriquecimento:** usar `model_copy(update=...)` em vez de mutar.
- **Idioma:** código/identificadores em português quando já é o padrão do arquivo; docstrings e docs em PT-BR.
- **Lint/format:** Ruff (Python), ESLint (frontend). Rodar antes de fechar tarefa.

## Guardrails (importante)

- **Repo é PÚBLICO** (`github.com/hectorautomacoesdev/fabrica-de-sites`). **Nunca** commitar segredos. `SERPER_API_KEY` e afins vivem só no `.env` local (gitignored). Varrer por segredos antes de qualquer push.
- **Custos:** Fase 1/1.5 roda **de graça** (OSM/Overpass é grátis e sem chave). Só introduzir custo (Serper, LLM, deploy pago) quando o ganho for claro e combinado.
- **Não commitar/push sem o Hector pedir.** Se estiver na branch default, criar branch antes.
- Co-autor em commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Como o Hector quer trabalhar

- **Planejar junto antes de executar.** Consultar nas decisões, explicar o passo a passo. Ele está aprendendo — o "porquê" importa tanto quanto o "o quê".
- **Começar grátis, evoluir em fases**, um módulo de cada vez. Testar de verdade (testes A/B quando fizer sentido) e ajustar.
- **Registrar plano/decisões na documentação** — ele quer uma base de conhecimento navegável e visual. Todo trabalho relevante vira página de doc.
- **Ser 100% honesto.** Não ter medo de discordar, de voltar atrás, de atrasar para fazer bem feito. Autoavaliar com sinceridade.
- Transcrições por voz às vezes truncam palavras — confirmar termos ambíguos.

## Memória persistente

Há memória pessoal em `C:\Users\hecto\.claude\projects\C--Projetos-IA\memory\` (`MEMORY.md` + arquivos). **Diferença:** este `CLAUDE.md` é do *repositório* (versionado, compartilhado, sobre o projeto); a memória é *pessoal* (sobre o Hector e o histórico, fora do repo). Manter os dois em dia.
