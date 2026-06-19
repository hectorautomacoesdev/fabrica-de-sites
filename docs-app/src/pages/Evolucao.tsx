import Callout from '../components/Callout'

const STATS = [
  { label: 'Leads quentes', from: '34', to: '145', note: '+326%' },
  { label: 'Negócios mapeados', from: '385', to: '513', note: 'multi-fonte' },
  { label: 'Testes automatizados', from: '0', to: '93', note: 'pirâmide de testes' },
  { label: 'Tempo por negócio', from: '—', to: '0,04 ms', note: 'baseline medido' },
]

const AB = [
  { id: 'A', label: 'Só OSM', leads: 34, negocios: 385, contact: 48, tempo: '2,6 s', best: false },
  { id: 'B', label: 'OSM + DomainGuesser', leads: 29, negocios: 385, contact: 48, tempo: '34,7 s', best: false },
  { id: 'C', label: 'OSM + Serper', leads: 159, negocios: 518, contact: 246, tempo: '59,2 s', best: true },
  { id: 'D', label: 'Full (todas as fontes)', leads: 144, negocios: 512, contact: 240, tempo: '92,8 s', best: false },
]
const MAX_LEADS = Math.max(...AB.map((c) => c.leads))

const ANTES_DEPOIS = [
  { antes: 'db.py com SQL cru', depois: 'SQLModel + Alembic', ganho: 'tipagem, migrations, pronto p/ Postgres' },
  { antes: 'Relatório HTML estático', depois: 'API FastAPI + dashboard React', ganho: 'interativo; base dos próximos agentes' },
  { antes: 'Lógica duplicada na CLI', depois: 'Service layer único', ganho: 'uma fonte da verdade' },
  { antes: '1 fonte de dados (OSM)', depois: 'Fontes plugáveis (OSM + Serper + DomainGuesser)', ganho: '34 → 145 leads quentes' },
  { antes: 'Documentação em MkDocs', depois: 'Documentação em React (esta)', ganho: 'visual próprio + interatividade' },
]

const TIMELINE = [
  { s: '01', t: 'Fundação do Scout', d: 'src layout, OSM, score explicável, SQLite, 1º dashboard. 385 negócios.' },
  { s: '02', t: 'Enriquecimento + A/B', d: 'Serper + DomainGuesser, dedup, testes A/B. 34 → 145 leads; 77 testes.' },
  { s: '03', t: 'Deep dive', d: 'Análise de bibliotecas, arquitetura, convenções, autoavaliação honesta.' },
  { s: '04', t: 'Doc + CI/CD', d: 'Primeira doc (MkDocs) no GitHub Pages; higiene de segredos.' },
  { s: '05', t: 'Base Sólida', d: 'SQLModel, Alembic, FastAPI, React. 93 testes passando.' },
  { s: '06', t: 'Doc em React + CLAUDE.md', d: 'Esta documentação; memória de projeto versionada.' },
]

export default function Evolucao() {
  return (
    <article className="page">
      <header className="page-head">
        <p className="page-kicker">Evolução & meta</p>
        <h1>Evolução do projeto</h1>
        <p className="page-lead">
          O que era, o que é agora e o que melhorou — com os números reais de coleta, desempenho e
          qualidade. Cada salto veio de um teste honesto, não de um palpite.
        </p>
      </header>

      <div className="stat-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-nums">
              <span className="stat-from">{s.from}</span>
              <span className="stat-arrow">→</span>
              <span className="stat-to">{s.to}</span>
            </span>
            <span className="stat-note">{s.note}</span>
          </div>
        ))}
      </div>

      <h2 className="block-title">Ganho de coleta — testes A/B (Guarujá)</h2>
      <p className="page-lead" style={{ marginBottom: 18 }}>
        Quatro configurações de fontes, medindo o que importa: <strong>leads quentes</strong>
        (oportunidade alta <em>e</em> contactável). Empilhar fontes multiplicou os leads — ao custo
        de tempo.
      </p>

      <div className="ab-chart">
        {AB.map((c) => (
          <div className={`ab-row ${c.best ? 'best' : ''}`} key={c.id}>
            <div className="ab-head">
              <span className="ab-label">
                <strong>{c.id}</strong> · {c.label}
                {c.best && <span className="ab-badge">melhor custo/benefício</span>}
              </span>
              <span className="ab-value">{c.leads} leads</span>
            </div>
            <div className="ab-track">
              <div className="ab-bar" style={{ width: `${(c.leads / MAX_LEADS) * 100}%` }} />
            </div>
            <div className="ab-meta">
              {c.negocios} negócios · {c.contact} contactáveis · {c.tempo}
            </div>
          </div>
        ))}
      </div>

      <Callout kind="tip" title="Leitura do A/B">
        A config <strong>C (OSM + Serper)</strong> deu o melhor retorno: mais negócios, muito mais
        contactáveis e o pico de leads quentes, em tempo razoável. O <strong>DomainGuesser</strong>
        sozinho (B) até reduziu leads (achou sites próprios, "esfriando" alguns) — útil como sinal,
        não como motor. A execução final usou a config completa: <strong>513 negócios, 145 leads
        quentes</strong>.
      </Callout>

      <h2 className="block-title">Desempenho do pipeline</h2>
      <p className="page-lead" style={{ marginBottom: 14 }}>
        Medido com <code>tracemalloc</code> + <code>perf_counter</code>, sem rede (dados sintéticos):
      </p>
      <div className="perf-grid">
        <div className="perf-card">
          <span className="perf-big">~0,04 ms</span>
          <span className="perf-cap">por negócio (100 e 500 — escala linear)</span>
        </div>
        <div className="perf-card">
          <span className="perf-big">~1,6 MB</span>
          <span className="perf-cap">de RAM para 500 negócios</span>
        </div>
        <div className="perf-card">
          <span className="perf-big">~0,7 s</span>
          <span className="perf-cap">para rodar os 77 testes do núcleo</span>
        </div>
      </div>

      <h2 className="block-title">Antes → depois</h2>
      <div className="ad-list">
        {ANTES_DEPOIS.map((r) => (
          <div className="ad-row" key={r.antes}>
            <span className="ad-antes">{r.antes}</span>
            <span className="ad-arrow">→</span>
            <span className="ad-depois">{r.depois}</span>
            <span className="ad-ganho">{r.ganho}</span>
          </div>
        ))}
      </div>

      <h2 className="block-title">Linha do tempo</h2>
      <div className="timeline">
        {TIMELINE.map((it) => (
          <div className="tl-item" key={it.s}>
            <span className="tl-dot">{it.s}</span>
            <div className="tl-body">
              <span className="tl-title">{it.t}</span>
              <span className="tl-desc">{it.d}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
