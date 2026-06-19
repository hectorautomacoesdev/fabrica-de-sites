# Relatórios de Sessão

Cada sessão de trabalho gerou um relatório navegável. Os **originais em HTML** (com o visual
artesanal) ficam preservados e acessíveis pelos links abaixo; aqui está o resumo de cada um.

> **Migração** — o conteúdo foi resumido em Markdown para entrar na busca e na navegação desta doc. Os
> relatórios completos seguem disponíveis como páginas HTML independentes.

## Sessão 01 — Fundação do Agente Scout

Construção da base: estrutura do projeto (`src` layout, CLI), fonte de dados grátis
(OpenStreetMap/Overpass) plugável, taxonomia de setores, detecção de presença web, score de
oportunidade explicável, persistência SQLite e o primeiro dashboard HTML. Validação real:
**385 negócios** mapeados em Guarujá; primeira bateria de testes automatizados.

[Abrir relatório completo (HTML) ↗](https://hectorautomacoesdev.github.io/fabrica-de-sites/_arquivo/RELATORIO_SESSAO_01.html)

## Sessão 02 — Enriquecimento e testes A/B

Adição do **Serper** (Google Maps via API) como segunda fonte e do **DomainGuesser**
(descobre sites próprios não cadastrados no OSM). Correção de um bug sutil no
`_is_social()` (substring → `urlparse`), deduplicação multi-fonte por similaridade de
bigramas, **testes A/B** das 4 configurações e benchmarks de desempenho. Resultado: salto de
34 para **145 leads quentes**; suíte cresceu para **77 testes**.

[Abrir relatório completo (HTML) ↗](https://hectorautomacoesdev.github.io/fabrica-de-sites/_arquivo/RELATORIO_SESSAO_02.html)

## Sessão 03 — Deep dive em código e bibliotecas

Relatório educacional aprofundado: análise de cada biblioteca (com exemplos reais e links
para a documentação), arquitetura (plugin pattern, `src` layout), passeio módulo a módulo,
convenções de código e autoavaliação honesta. Foi a base de boa parte desta documentação.

[Abrir relatório completo (HTML) ↗](https://hectorautomacoesdev.github.io/fabrica-de-sites/_arquivo/RELATORIO_SESSAO_03.html)

## Sessão 04 — Documentação e CI/CD

Planejamento da "Fase 1.5 — Base Sólida", aprovação do plano e montagem de toda a estrutura
de documentação: MkDocs Material publicado no GitHub Pages com deploy automático via GitHub
Actions, 14 páginas cobrindo arquitetura, design patterns, banco, bibliotecas, código,
testes, escala, ADRs e roadmap. Varredura de segredos antes do push público. Relatório
educacional sobre bibliotecas (HTML, 84 KB, 43 exemplos de código).

## Sessão 05 — Reestruturação do Scout (Fase 1.5)

Implementação completa da reestruturação: `db.py` cru → **SQLModel** (RunTable, BusinessTable,
engine, repository), **Alembic** com migration inicial, **service layer** compartilhado
(`scout_service.run_and_save`), **FastAPI** com 7 endpoints REST (healthz, sectors, runs CRUD,
insights, businesses com filtros), **frontend Vite + React + TypeScript** (KpiCards,
BusinessTable filtrável, RunSelector, modal ScoutForm). CLI migrada para service layer.
93 testes passando (77 originais + 16 novos de contrato de API). Build do frontend: 236KB JS.

## Sessão 06 — Documentação em React + CLAUDE.md

Reconstrução da documentação como **app React** (`docs-app/`), no mesmo idioma visual do produto: barra lateral, tema claro/escuro, conteúdo em Markdown e páginas visuais (Bibliotecas, Estrutura, Evolução). Criação do **CLAUDE.md** (memória de projeto versionada) e autoavaliação honesta sobre processo e ferramentas — registrada em [Resumo & ponderações](../resumo.md) e [Boas práticas do Claude](../boas-praticas.md).

## Sessão 07 — Documentação unificada (fonte única)

Unificação das duas documentações numa **fonte de verdade única**: o conteúdo Markdown passou a viver só em `docs/`, e o app React passou a **lê-lo diretamente** (em vez de manter cópias próprias). Diagramas das páginas compartilhadas foram convertidos para ASCII (portáveis nos dois renderizadores); o MkDocs segue publicado no GitHub Pages e ganhou as páginas que só existiam no React. CI passou a buildar também o app React a cada push.

---

> **A partir de agora** — os relatórios passam a viver **nesta documentação** (Markdown, versionado e buscável),
> conforme combinado: todo plano/registro de trabalho relevante vira página da doc.
