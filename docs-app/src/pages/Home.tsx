import { Link } from 'react-router-dom'
import Markdown from '../components/Markdown'

const INTRO = `
A **Fábrica de Sites** é um sistema **multiagente** que encontra negócios locais sem site
(ou com site fraco), gera sites sob medida e os oferece aos donos. Mercado inicial: **Guarujá/SP**.

O projeto avança **em fases, do simples ao complexo** — e de graça até o valor ficar claro.
Hoje o **Agente Scout** está pronto: mapeia a cidade, detecta quem não tem site e ranqueia a
oportunidade por setor.

\`\`\`bash
# Rodar o Scout (grátis, sem chave de API)
fabrica scout run --cidade "Guarujá" --abrir
\`\`\`
`

const AGENTS = [
  { n: 1, name: 'Scout', role: 'Mapeia negócios e detecta quem não tem site', done: true },
  { n: 2, name: 'Benchmark', role: 'Define o que é "site bom" por setor', done: false },
  { n: 3, name: 'Auditor', role: 'Avalia a qualidade dos sites existentes', done: false },
  { n: 4, name: 'Criador', role: 'Gera e publica o site', done: false },
  { n: 5, name: 'Prospector', role: 'Contata o dono (WhatsApp/e-mail)', done: false },
]

const SHORTCUTS = [
  { to: '/bibliotecas', title: 'Bibliotecas', desc: 'O que cada dependência faz e por que a escolhemos', ready: true },
  { to: '/estrutura', title: 'Estrutura do projeto', desc: 'Pastas, camadas e como tudo conversa', ready: false },
  { to: '/evolucao', title: 'Evolução', desc: 'O que mudou e os ganhos de desempenho', ready: false },
  { to: '/resumo', title: 'Resumo & ponderações', desc: 'Direção das decisões e autoavaliações', ready: false },
]

export default function Home() {
  return (
    <article className="page">
      <div className="hero">
        <span className="hero-badge">Fase 1.5 — Base Sólida concluída</span>
        <h1>Documentação da Fábrica de Sites</h1>
        <p className="hero-sub">
          Base de conhecimento navegável: arquitetura, bibliotecas, evolução e decisões — tudo no
          mesmo idioma visual do produto.
        </p>
      </div>

      <Markdown>{INTRO}</Markdown>

      <h2 className="block-title">Os 5 agentes</h2>
      <div className="agents">
        {AGENTS.map((a) => (
          <div className={`agent ${a.done ? 'agent-done' : ''}`} key={a.n}>
            <span className="agent-num">{a.n}</span>
            <div className="agent-body">
              <span className="agent-name">
                {a.name}
                {a.done && <span className="agent-pill">pronto</span>}
              </span>
              <span className="agent-role">{a.role}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className="block-title">Comece por aqui</h2>
      <div className="cards">
        {SHORTCUTS.map((s) => (
          <Link className="card" to={s.to} key={s.to}>
            <span className="card-title">
              {s.title}
              {!s.ready && <span className="card-soon">em breve</span>}
            </span>
            <span className="card-desc">{s.desc}</span>
            <span className="card-arrow">→</span>
          </Link>
        ))}
      </div>
    </article>
  )
}
