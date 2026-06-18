# Decisões técnicas (ADRs)

Registro no estilo **ADR leve** (*Architecture Decision Record*). Cada decisão tem
contexto, escolha e alternativas, para podermos revisitar com clareza no futuro.

!!! note "O que é um ADR"
    Um *Architecture Decision Record* é um documento curto que captura **uma** decisão
    arquitetural importante: o contexto que a motivou, a opção escolhida e as alternativas
    consideradas. Referência: [adr.github.io](https://adr.github.io/).

---

## D1 — Fonte de dados inicial: OpenStreetMap (Overpass API)

**Escolha:** começar com a Overpass API do OpenStreetMap.
**Por quê:** 100% grátis, sem chave, sem cartão, sem cadastro. Funciona hoje. Traz nome,
categoria, telefone, site, endereço, horário e coordenadas.
**Trade-off:** cobertura de negócios informais é menor que a do Google, e a cobertura de
**telefone é baixa** (em Guarujá, ~12,5%).
**Alternativas (plugáveis):** Serper.dev (2.500 buscas/mês grátis, dados do Google Maps) e
Google Places. Entram via nova `BusinessSource` sem reescrever o pipeline.

## D2 — Determinístico primeiro, LLM depois

**Escolha:** o núcleo do Scout (classificar, pontuar, agregar) não usa LLM.
**Por quê:** é grátis, instantâneo, 100% testável e previsível. O LLM entra só onde agrega
(insights ricos e os agentes 2–5). A camada de insights já é plugável para receber
Gemini/Claude depois.

## D3 — Sem framework de agentes na Fase 1

**Escolha:** não usar CrewAI/LangGraph agora.
**Por quê:** (a) o Scout é um pipeline de dados, não precisa de raciocínio/delegação;
(b) **teste real**: no Python 3.14 o resolvedor do pip só chega ao `crewai 0.11.2` (de ~2
anos atrás), puxando `langchain 0.1.x` e forçando downgrade de typer/rich — instável.
**Plano:** introduzir CrewAI/LangGraph nas fases 2+, provavelmente num **venv Python 3.12
separado** para essas partes, mantendo o Scout leve.

## D4 — Stack leve no núcleo: httpx, pydantic, jinja2, typer, rich

**Por quê:** poucas dependências, todas com suporte ao Python 3.14 (httpx 0.28, pydantic
2.x com core em Rust, typer, rich, jinja2 3.1). SQLite é da biblioteca padrão.

## D5 — Modelo de score de oportunidade (0–100), explicável

Soma de componentes, limitada a 100, **com motivo legível para cada ponto**:

| Componente | Pontos |
|------------|-------:|
| Base: sem site | 60 |
| Base: só rede social | 70 |
| Base: já tem site próprio | 25 |
| Tem telefone | +20 |
| Tem horário de funcionamento | +5 |
| Tem endereço | +5 |
| Setor prioritário | +10 |

Rótulos: ≥80 ALTÍSSIMA · ≥65 ALTA · ≥45 MÉDIA · <45 BAIXA. Pesos em `config.py`.

## D6 — "Só rede social" é o lead mais quente (base 70 > 60)

**Por quê:** quem tem só Instagram/Facebook já entendeu que precisa estar online, mas não
tem site de verdade — é mais fácil de convencer do que quem não tem presença alguma.
Detectamos por domínio (`facebook`/`instagram`/`linktr.ee`/`wa.me`/...) e por tags
`contact:instagram`/`contact:facebook`.

## D7 — "Lead quente" exige oportunidade ALTA **e** contato

**Antes:** lead quente = score ≥ 65. Resultado: diluído demais.
**Depois:** lead quente = score ≥ 65 **E** ter telefone/e-mail.
**Por quê:** um lead que não dá para contatar não está "pronto para abordar". Funil honesto.

## D8 — SQLite local + relatório HTML estático (revisada na D10)

**Por quê (à época):** zero infraestrutura, zero custo. O relatório era um único `.html`.
**Revisão:** com o Scout consolidado, evoluímos para banco com ORM e frontend React — ver **D10**.

## D9 — Layout `src/` + console script `fabrica`

**Por quê:** evita imports acidentais, força instalação explícita (`pip install -e .`) e dá
um comando de terminal limpo.

---

## D10 — Evolução para aplicação full-stack (React + FastAPI + SQLModel)

**Contexto:** o Scout amadureceu (multi-fonte, enriquecimento, 77 testes). Para virar a
base sólida dos próximos agentes, precisa de uma API, um banco "de verdade" e um frontend.
**Escolha:** **FastAPI** (backend) + **SQLModel + Alembic** (dados) + **Vite + React +
TypeScript** (frontend), tudo rodando local por enquanto.
**Por quê:** FastAPI reaproveita os modelos Pydantic e o `run_scout()` já puro; SQLModel
unifica modelo Pydantic + tabela e fala SQLite **e** Postgres; React é a stack que o
usuário domina, e Vite mantém a SPA enxuta sem o peso de um segundo backend (Next.js).
**Alternativas:** Next.js (traria backend próprio competindo com o FastAPI); Django REST
(mais pesado); Node/NestJS (reescreveria lógica Python já testada). Detalhe no
[Plano — Base Sólida](plano-base-solida.md).

## D11 — Documentação em MkDocs Material, publicada no GitHub Pages

**Escolha:** **MkDocs Material** como base de conhecimento, com referência de API gerada
dos docstrings (mkdocstrings).
**Por quê:** Markdown (baixo atrito), painel/busca prontos, deploy trivial via GitHub
Actions. Os relatórios HTML artesanais (Sessões 01–03) têm seu conteúdo **migrado** para
páginas Markdown; os originais ficam arquivados em `docs/_arquivo/`.
**Alternativa:** Docusaurus (React/MDX) — mais poderoso para painéis interativos, porém
mais manutenção.

## D12 — Repositório público + GitHub Pages

**Escolha:** repositório **público** em
[github.com/hectorautomacoesdev/fabrica-de-sites](https://github.com/hectorautomacoesdev/fabrica-de-sites),
doc publicada no GitHub Pages.
**Por quê:** contas grátis do GitHub só publicam Pages a partir de repositórios públicos;
o caminho mais simples e sem custo.
**Porta de segurança:** segredos (chave do Serper) ficam **só** no `.env` (no `.gitignore`);
varredura de segredos antes de cada push. Dados sensíveis de execução (banco, dashboards)
moram em `data/`, que é ignorado pelo git.

---

## D13 — ORM: SQLModel em vez de SQL cru

**Escolha:** substituir o `db.py` (sqlite3 da stdlib) por **SQLModel** (SQLAlchemy 2 + Pydantic).
**Por quê:** tipagem nativa, queries composáveis, migrations via Alembic e transição simples
para Postgres (só muda a URL de conexão). O `db.py` cru era SQL manual sem type safety —
aceitável como MVP, mas dificulta evoluções e testes.
**Decisão de compatibilidade:** não usar `from __future__ import annotations` nos models
SQLModel — o metaclass precisa inspecionar as anotações em tempo de definição de classe.
**Alembic:** `create_all(checkfirst=True)` para dev; `alembic upgrade head` para produção.
DBs existentes recebem `alembic stamp head` para marcar como migrados sem re-executar DDL.

## D14 — Service layer explícito entre CLI e API

**Escolha:** `services/scout_service.py` como único ponto de orquestração:
`run_and_save` (pipeline → persiste) e `get_insights`. CLI e API chamam este módulo.
**Por quê:** sem o service layer, os dois pontos de entrada (CLI e FastAPI) precisariam
replicar a lógica de montar fontes, chamar `run_scout`, salvar no banco e calcular insights.
**Padrão:** Application Service (Fowler — *Patterns of Enterprise Application Architecture*).

## D15 — DTO separado do model de banco

**Escolha:** `api/schemas/responses.py` com `RunRead`, `BusinessRead`, `KpiRead` etc.,
**separados** dos `RunTable`/`BusinessTable` do SQLModel.
**Por quê:** o schema de banco e o contrato de API evoluem em ritmos diferentes.
Colocar `table=True` direto nos schemas de resposta acopla as duas camadas — qualquer
refatoração de banco quebra a API e vice-versa.
**Nota:** `KpiRead` é calculado em runtime (não persiste no banco), reforçando que nem
todo dado de resposta precisa ter uma tabela.

## D16 — Session por request no FastAPI via Depends

**Escolha:** `get_session()` como gerador (`yield`) injetado via `Depends` do FastAPI.
Todos os endpoints recebem a sessão como parâmetro tipado (`SessionDep`).
**Por quê:** garante que cada request HTTP usa uma sessão própria (sem vazamento de estado
entre requests), e o `with Session(engine) as session` fecha a conexão mesmo em caso de
exceção. Para a CLI, cria-se uma sessão diretamente no service layer.
**Referência:** [SQLModel — FastAPI Integration](https://sqlmodel.tiangolo.com/tutorial/fastapi/).

## D17 — Frontend: Vite + React + TypeScript (SPA local)

**Escolha:** SPA em `frontend/` consumindo a API REST via TanStack Query.
**Por quê:** o usuário já conhece React. SPA é adequado para um painel interno (sem SEO,
sem SSR). TanStack Query cuida de cache, revalidação e estados de loading/error sem boilerplate.
**Proxy Vite:** em dev, `/api/*` é proxiado para `localhost:8001` — CORS só precisa estar
habilitado para prod. Em prod, um reverse proxy (nginx) faz o mesmo.
**`verbatimModuleSyntax`:** o `tsconfig` do Vite exige `import type` para importações
que são só tipos — padrão moderno que evita imports circulares e clarifica intenção.
