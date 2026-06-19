import Callout from '../components/Callout'

const FOLDERS: { path: string; role: string; mono?: boolean }[] = [
  { path: 'src/fabrica_sites/', role: 'Código Python do produto (o cérebro)' },
  { path: '  ├─ agents/scout/', role: 'O pipeline: sources, enrichers, classifier, scorer, scout' },
  { path: '  ├─ api/', role: 'FastAPI: routers, schemas (DTOs), deps' },
  { path: '  ├─ services/', role: 'Orquestração compartilhada (CLI + API)' },
  { path: '  ├─ db/', role: 'SQLModel: models, engine, repository' },
  { path: '  ├─ core/', role: 'Domínio puro: taxonomia de setores' },
  { path: '  ├─ models.py', role: 'Modelos Pydantic do pipeline' },
  { path: '  ├─ config.py', role: 'Configurações centrais (sem números mágicos)' },
  { path: '  └─ cli.py', role: 'CLI (Typer + Rich)' },
  { path: 'frontend/', role: 'SPA React do dashboard (o produto)' },
  { path: 'docs-app/', role: 'Esta documentação (React)' },
  { path: 'tests/', role: '93 testes (unit, integração, contrato, desempenho)' },
  { path: 'alembic/', role: 'Migrations do banco (versionamento de schema)' },
  { path: 'data/', role: 'Banco e relatórios gerados — gitignored' },
]

const LAYERS: { name: string; dir: string; desc: string; tone: string }[] = [
  { name: 'Frontend (React)', dir: 'frontend/ · docs-app/', desc: 'Só apresentação e interação. Busca dados da API e exibe. Sem regra de negócio.', tone: 'frontend' },
  { name: 'API (FastAPI)', dir: 'src/…/api/', desc: 'Traduz HTTP ⇄ serviço. Define DTOs, validação, status e Swagger.', tone: 'api' },
  { name: 'Service layer', dir: 'src/…/services/', desc: 'Orquestra run_scout + persistência + insights. A CLI também chama aqui.', tone: 'service' },
  { name: 'Repositórios (SQLModel)', dir: 'src/…/db/', desc: 'Isolam o acesso ao banco. Nenhuma SQL nas camadas de cima.', tone: 'repo' },
  { name: 'Banco (SQLite → Postgres)', dir: 'data/fabrica.db', desc: 'Persistência. O mesmo código SQLModel fala SQLite e PostgreSQL.', tone: 'db' },
]

export default function Estrutura() {
  return (
    <article className="page">
      <header className="page-head">
        <p className="page-kicker">Entender o projeto</p>
        <h1>Estrutura do projeto</h1>
        <p className="page-lead">
          Como as pastas são organizadas e — o mais importante — <strong>como elas conversam</strong>.
          A regra de ouro: cada pasta tem uma responsabilidade, e as dependências apontam sempre
          para dentro (do mundo externo para o núcleo).
        </p>
      </header>

      <h2 className="block-title">Mapa de pastas</h2>
      <div className="tree">
        {FOLDERS.map((f) => (
          <div className="tree-row" key={f.path}>
            <code className="tree-path">{f.path}</code>
            <span className="tree-role">{f.role}</span>
          </div>
        ))}
      </div>

      <h2 className="block-title">Como as pastas conversam (as camadas)</h2>
      <p className="page-lead" style={{ marginBottom: 18 }}>
        Cada requisição desce pelas camadas. Uma camada só conhece a de baixo — trocar a de cima
        (ou a de baixo) não quebra o meio.
      </p>

      <div className="layers">
        <div className="cli-tap">
          <span className="cli-box">CLI (fabrica)</span>
          <span className="cli-arrow">entra direto no serviço ↘</span>
        </div>
        {LAYERS.map((l, i) => (
          <div className="layer-wrap" key={l.name}>
            <div className={`layer tone-${l.tone}`}>
              <div className="layer-top">
                <span className="layer-name">{l.name}</span>
                <code className="layer-dir">{l.dir}</code>
              </div>
              <span className="layer-desc">{l.desc}</span>
            </div>
            {i < LAYERS.length - 1 && <span className="layer-arrow">▼</span>}
          </div>
        ))}
      </div>

      <Callout kind="info" title="A regra de dependência (Clean Architecture)">
        As setas apontam <strong>para dentro</strong>: o frontend depende da API, a API depende do
        serviço, o serviço depende do repositório. O núcleo (regra de negócio) não conhece as bordas
        (HTTP, framework, banco). É isso que mantém o núcleo testável e estável enquanto as bordas
        mudam. Detalhe em <a href="#/arquitetura">Arquitetura</a>.
      </Callout>
    </article>
  )
}
