// Conteúdo estruturado da página Bibliotecas.
// Para cada lib: o que é no mundo → principais funções → como usamos aqui.
export type LibGroup = 'nucleo' | 'alvo' | 'frontend'

export interface Library {
  name: string
  role: string
  group: LibGroup
  world: string
  functions: string[]
  ourUse: string
  snippet?: { title: string; lang: string; code: string }
  links: { label: string; url: string }[]
}

export const LIBRARIES: Library[] = [
  // ───────────────── Núcleo do pipeline ─────────────────
  {
    name: 'httpx',
    role: 'Cliente HTTP',
    group: 'nucleo',
    world:
      'Cliente HTTP moderno para Python. Faz requisições web (GET/POST/HEAD…) com uma API quase idêntica à do clássico requests, mas com HTTP/2, timeouts robustos e modo assíncrono nativo.',
    functions: [
      'httpx.get() / .post() / .head() — requisições pontuais',
      'httpx.Client() — sessão reutilizável com pool de conexões (mais rápido em lote)',
      'httpx.AsyncClient() — requisições concorrentes com async/await',
      'timeout e follow_redirects como cidadãos de primeira classe',
    ],
    ourUse:
      'Falamos com a Overpass API (OpenStreetMap), o Serper e checamos a existência de sites no DomainGuesser. Usamos HEAD em vez de GET para responder "o site existe?" sem baixar a página inteira.',
    snippet: {
      title: 'HEAD rápido no DomainGuesser',
      lang: 'python',
      code: 'resp = httpx.head(f"https://{dominio}", follow_redirects=True, timeout=3.0)\n# HEAD não baixa o corpo → ~10x mais rápido que GET para "o site existe?"',
    },
    links: [
      { label: 'Documentação', url: 'https://www.python-httpx.org/' },
      { label: 'Quickstart', url: 'https://www.python-httpx.org/quickstart/' },
    ],
  },
  {
    name: 'Pydantic v2',
    role: 'Modelos validados',
    group: 'nucleo',
    world:
      'Padrão de fato para validação de dados e tipagem em runtime no Python. Você declara os campos com type hints e ele valida, converte e documenta os dados sozinho — o núcleo foi reescrito em Rust, então é muito rápido.',
    functions: [
      'BaseModel — define um modelo validado a partir de type hints',
      'Field(...) — regras por campo (default, min/max, alias, descrição)',
      'model_validate() / model_dump() — parse e serialização (dict/JSON)',
      'model_copy(update=...) — cópia imutável trocando campos',
    ],
    ourUse:
      'É a base dos modelos de domínio (RawPlace, Business, ScoutRun) e também do FastAPI. Usamos model_copy no enriquecimento para nunca mutar o objeto original.',
    snippet: {
      title: 'model_copy() — imutabilidade no enricher',
      lang: 'python',
      code: 'return b.model_copy(update={\n    "website": novo_website,\n    "website_kind": WebsiteKind.PROPRIO,\n    **nova_aval,\n})',
    },
    links: [
      { label: 'Documentação v2', url: 'https://docs.pydantic.dev/latest/' },
      { label: 'model_copy', url: 'https://docs.pydantic.dev/latest/api/base_model/#pydantic.BaseModel.model_copy' },
    ],
  },
  {
    name: 'Typer',
    role: 'CLI',
    group: 'nucleo',
    world:
      'Framework para criar interfaces de linha de comando (CLI) a partir de type hints, do mesmo autor do FastAPI. Gera help, validação de argumentos e subcomandos automaticamente.',
    functions: [
      '@app.command() — transforma uma função em comando',
      'Argument / Option tipados, com help e validação automáticos',
      'subcomandos aninhados (add_typer)',
      'prompts, cores e confirmações prontos',
    ],
    ourUse:
      'É a CLI `fabrica scout run --cidade "Guarujá" --abrir`. Cada comando chama o mesmo service layer que a API — uma fonte da verdade só.',
    links: [
      { label: 'Documentação', url: 'https://typer.tiangolo.com/' },
      { label: 'Subcomandos', url: 'https://typer.tiangolo.com/tutorial/subcommands/add-typer/' },
    ],
  },
  {
    name: 'Rich',
    role: 'Saída no terminal',
    group: 'nucleo',
    world:
      'Biblioteca para deixar a saída do terminal bonita e legível: tabelas, painéis, barras de progresso, syntax highlight e spinners.',
    functions: [
      'Console — imprime com cores, estilos e markup',
      'Table — tabelas formatadas no terminal',
      'Panel — caixas destacadas',
      'Progress / console.status — progresso e spinners',
    ],
    ourUse:
      'A CLI mostra os resultados do Scout em tabelas e painéis, com um spinner enquanto a coleta roda.',
    links: [
      { label: 'Documentação', url: 'https://rich.readthedocs.io/' },
      { label: 'Tables', url: 'https://rich.readthedocs.io/en/stable/tables.html' },
    ],
  },
  {
    name: 'Jinja2',
    role: 'Templates HTML',
    group: 'nucleo',
    world:
      'Motor de templates (o mesmo do Flask). Mistura HTML com lógica leve — {{ variável }}, {% for %} — para gerar páginas a partir de dados, com autoescape de segurança por padrão.',
    functions: [
      '{{ }} interpolação e {% %} controle de fluxo',
      'filtros (|length, |round, |default)',
      'herança de templates ({% extends %} + blocks)',
      'autoescape contra injeção de HTML/XSS',
    ],
    ourUse:
      'Gera o dashboard HTML do Scout (report.html.j2) — mapa, gráficos e tabela filtrável — a partir dos negócios coletados.',
    links: [
      { label: 'Documentação', url: 'https://jinja.palletsprojects.com/' },
      { label: 'Templates', url: 'https://jinja.palletsprojects.com/en/stable/templates/' },
    ],
  },
  {
    name: 'python-dotenv',
    role: 'Variáveis de ambiente',
    group: 'nucleo',
    world:
      'Carrega variáveis de um arquivo .env para o ambiente, antes de qualquer os.getenv(). Mantém segredos (chaves de API) fora do código e do controle de versão.',
    functions: [
      'load_dotenv() — lê o .env para o ambiente',
      'override=False — não sobrescreve variáveis já definidas',
      'dotenv_values() — lê sem poluir o ambiente',
    ],
    ourUse:
      'config.py carrega o .env antes de ler SERPER_API_KEY. Segredos vivem só no .env local (gitignored) — crítico, já que o repositório é público.',
    snippet: {
      title: 'config.py — a ordem importa',
      lang: 'python',
      code: 'load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)\nSERPER_API_KEY = os.getenv("SERPER_API_KEY") or None',
    },
    links: [{ label: 'Documentação', url: 'https://saurabh-kumar.com/python-dotenv/' }],
  },
  {
    name: 'pytest',
    role: 'Testes',
    group: 'nucleo',
    world:
      'O framework de testes mais usado no Python. Você escreve testes como funções simples com assert; ele descobre, roda e reporta tudo automaticamente.',
    functions: [
      'assert direto (sem assertEquals)',
      '@pytest.mark.parametrize — o mesmo teste com vários dados',
      'fixtures — preparam dados/estado reutilizáveis',
      'monkeypatch — troca dependências (rede, env) no teste',
    ],
    ourUse:
      '93 testes em ~0,7 s. parametrize nas regras de score, monkeypatch para não bater na rede de verdade, e 16 testes de contrato da API.',
    links: [
      { label: 'Documentação', url: 'https://docs.pytest.org/' },
      { label: 'parametrize', url: 'https://docs.pytest.org/en/stable/how-to/parametrize.html' },
    ],
  },

  // ───────────────── API & dados ─────────────────
  {
    name: 'FastAPI',
    role: 'Framework de API',
    group: 'alvo',
    world:
      'Framework web/API para Python construído sobre Pydantic e Starlette. Async nativo, validação automática de entrada/saída e documentação Swagger/OpenAPI gerada sozinha.',
    functions: [
      '@app.get/post(...) — rotas tipadas',
      'parâmetros e bodies validados via type hints/Pydantic',
      'Depends() — injeção de dependências (sessão de banco, auth)',
      'APIRouter — divide a API em módulos; /docs Swagger automático',
    ],
    ourUse:
      '7 endpoints REST (health, setores, runs CRUD, insights, negócios com filtros). Reaproveita nossos modelos Pydantic e o service layer; routers separados (scout, runs, misc) e DTOs próprios.',
    snippet: {
      title: 'Injeção de dependência da sessão',
      lang: 'python',
      code: '@router.get("/runs/{run_id}/insights")\ndef get_insights(run_id: int, session: Session = Depends(get_session)):\n    ...',
    },
    links: [
      { label: 'Documentação', url: 'https://fastapi.tiangolo.com/' },
      { label: 'Dependencies', url: 'https://fastapi.tiangolo.com/tutorial/dependencies/' },
    ],
  },
  {
    name: 'uvicorn',
    role: 'Servidor ASGI',
    group: 'alvo',
    world:
      'Servidor ASGI de alta performance que efetivamente roda apps async como o FastAPI. É o motor que recebe as requisições HTTP e as entrega ao seu código.',
    functions: [
      'uvicorn app:app — sobe o servidor',
      '--reload — recarrega ao salvar (desenvolvimento)',
      '--workers — múltiplos processos em produção',
      'integra com Gunicorn em deploys maiores',
    ],
    ourUse:
      'Roda a API em desenvolvimento: uvicorn fabrica_sites.api.app:app --reload --port 8001 (Swagger em /docs).',
    links: [{ label: 'Documentação', url: 'https://www.uvicorn.org/' }],
  },
  {
    name: 'SQLModel',
    role: 'ORM',
    group: 'alvo',
    world:
      'ORM que une modelo Pydantic + tabela SQL numa classe só (sobre o SQLAlchemy), do mesmo autor do FastAPI. O mesmo código fala SQLite e PostgreSQL.',
    functions: [
      'class X(SQLModel, table=True) — vira tabela',
      'Field(primary_key=, foreign_key=, index=)',
      'Session + select() — consultas tipadas',
      'Relationship — relacionamentos entre tabelas',
    ],
    ourUse:
      'db/models.py define RunTable e BusinessTable; o repository encapsula as consultas com filtros. Começamos em SQLite, prontos para Postgres sem reescrever.',
    links: [
      { label: 'Documentação', url: 'https://sqlmodel.tiangolo.com/' },
      { label: 'Criar tabelas', url: 'https://sqlmodel.tiangolo.com/tutorial/create-db-and-table/' },
    ],
  },
  {
    name: 'Alembic',
    role: 'Migrations',
    group: 'alvo',
    world:
      'Ferramenta de migrations para SQLAlchemy/SQLModel — versiona a estrutura do banco (o "git do schema"). Cada mudança de tabela vira um arquivo aplicável e reversível.',
    functions: [
      'alembic revision --autogenerate — detecta mudanças no modelo',
      'alembic upgrade head — aplica as migrations',
      'alembic downgrade — reverte',
      'alembic stamp — marca um banco já existente sem rodar a migration',
    ],
    ourUse:
      'Migration inicial 620b7b3bfb9b. Bancos que já existiam são marcados com `stamp head` para não tentar recriar tabelas.',
    links: [
      { label: 'Tutorial', url: 'https://alembic.sqlalchemy.org/en/latest/tutorial.html' },
      { label: 'Autogenerate', url: 'https://alembic.sqlalchemy.org/en/latest/autogenerate.html' },
    ],
  },

  // ───────────────── Frontend ─────────────────
  {
    name: 'React',
    role: 'UI por componentes',
    group: 'frontend',
    world:
      'A biblioteca de interface mais usada do mundo. Você descreve a tela como componentes (funções que retornam markup JSX) e o React atualiza o que mudou quando os dados mudam — fluxo de dados unidirecional.',
    functions: [
      'componentes de função + JSX',
      'useState / useEffect — estado e efeitos',
      'props — passam dados de cima para baixo',
      'hooks customizados — reaproveitam lógica',
    ],
    ourUse:
      'Base do dashboard do Scout (KpiCards, BusinessTable filtrável, RunSelector, ScoutForm) e desta própria documentação.',
    links: [
      { label: 'react.dev', url: 'https://react.dev/' },
      { label: 'Pensando em React', url: 'https://react.dev/learn/thinking-in-react' },
    ],
  },
  {
    name: 'Vite',
    role: 'Build & dev server',
    group: 'frontend',
    world:
      'Ferramenta de build e servidor de desenvolvimento para frontends modernos. Hot reload quase instantâneo no dev e bundle otimizado para produção (Rollup por baixo).',
    functions: [
      'dev server com HMR (hot module replacement)',
      'build de produção otimizado',
      'imports especiais (?raw, ?url)',
      'configuração simples via vite.config.ts',
    ],
    ourUse:
      'Empacota tanto o produto quanto esta doc. Escolhido em vez de Next.js por ser uma SPA enxuta consumindo a API Python. Build do produto: 236 KB JS.',
    links: [
      { label: 'Documentação', url: 'https://vite.dev/' },
      { label: 'Build', url: 'https://vite.dev/guide/build.html' },
    ],
  },
  {
    name: 'TypeScript',
    role: 'JS com tipos',
    group: 'frontend',
    world:
      'JavaScript com tipos. Adiciona checagem em tempo de desenvolvimento, pegando erros antes de rodar e dando autocomplete muito melhor no editor.',
    functions: [
      'anotações de tipo (: string, : number)',
      'interface / type — formato de objetos',
      'generics — tipos reutilizáveis',
      'inferência — deduz tipos sozinho',
    ],
    ourUse:
      'Todo o frontend e esta doc são em TS. Tipamos as respostas da API (DTOs) para o editor avisar se um contrato mudar.',
    links: [{ label: 'Documentação', url: 'https://www.typescriptlang.org/docs/' }],
  },
  {
    name: 'TanStack Query',
    role: 'Estado de servidor',
    group: 'frontend',
    world:
      'Gerencia o "estado de servidor" no React — dados vindos de uma API. Cuida de cache, revalidação e estados de carregando/erro sem o boilerplate manual de useEffect + useState.',
    functions: [
      'useQuery — busca + cache + loading/error',
      'useMutation — cria/atualiza dados',
      'invalidateQueries — revalida após uma mudança',
      'staleTime / gcTime configuráveis',
    ],
    ourUse:
      'O dashboard usa useQuery para carregar runs e insights; ao rodar um novo Scout, invalida e recarrega sozinho.',
    links: [
      { label: 'Overview', url: 'https://tanstack.com/query/latest/docs/framework/react/overview' },
      { label: 'Queries', url: 'https://tanstack.com/query/latest/docs/framework/react/guides/queries' },
    ],
  },
  {
    name: 'axios',
    role: 'Cliente HTTP (browser)',
    group: 'frontend',
    world:
      'Cliente HTTP para JavaScript/browser. Faz as chamadas à API com uma interface limpa, interceptors e parse de JSON automático.',
    functions: [
      'axios.get/post(...) — requisições',
      'instância com baseURL e headers padrão',
      'interceptors — alteram request/response globalmente',
      'parse de JSON e tratamento de erro automáticos',
    ],
    ourUse:
      'O client.ts do frontend usa uma instância axios com baseURL apontando para a API (em dev, via proxy do Vite).',
    links: [{ label: 'Documentação', url: 'https://axios-http.com/docs/intro' }],
  },
]
