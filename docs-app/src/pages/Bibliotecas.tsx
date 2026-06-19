import { useMemo, useState } from 'react'
import { LIBRARIES, type LibGroup } from '../data/libraries'
import CodeBlock from '../components/CodeBlock'
import Callout from '../components/Callout'

type Filter = LibGroup | 'todos'

const GROUPS: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'nucleo', label: 'Núcleo do pipeline' },
  { id: 'alvo', label: 'API & dados' },
  { id: 'frontend', label: 'Frontend' },
]

export default function Bibliotecas() {
  const [filter, setFilter] = useState<Filter>('todos')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const libs = useMemo(
    () => (filter === 'todos' ? LIBRARIES : LIBRARIES.filter((l) => l.group === filter)),
    [filter],
  )

  function toggle(name: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <article className="page">
      <header className="page-head">
        <p className="page-kicker">Entender o projeto</p>
        <h1>Bibliotecas</h1>
        <p className="page-lead">
          Cada dependência foi escolhida por uma razão clara. Para cada uma:{' '}
          <strong>o que ela é no mundo</strong>, <strong>as principais funções</strong> que as
          pessoas usam e <strong>como a aplicamos</strong> na Fábrica de Sites — com links para a
          documentação oficial. Clique num card para expandir.
        </p>
      </header>

      <div className="filter-row">
        {GROUPS.map((g) => {
          const count = g.id === 'todos' ? LIBRARIES.length : LIBRARIES.filter((l) => l.group === g.id).length
          return (
            <button
              key={g.id}
              className={`chip ${filter === g.id ? 'active' : ''}`}
              onClick={() => setFilter(g.id)}
            >
              {g.label}
              <span className="chip-count">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="lib-list">
        {libs.map((lib) => {
          const isOpen = open.has(lib.name)
          return (
            <div className={`lib-card ${isOpen ? 'open' : ''}`} key={lib.name}>
              <button className="lib-card-head" onClick={() => toggle(lib.name)}>
                <span className="lib-card-id">
                  <span className="lib-name">{lib.name}</span>
                  <span className={`lib-tag tag-${lib.group}`}>{lib.role}</span>
                </span>
                <span className="lib-chevron">{isOpen ? '−' : '+'}</span>
              </button>

              <p className="lib-world">{lib.world}</p>

              {isOpen && (
                <div className="lib-detail">
                  <div className="lib-block">
                    <p className="lib-block-title">Principais funções / usos</p>
                    <ul className="lib-funcs">
                      {lib.functions.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="lib-block">
                    <p className="lib-block-title">Como usamos aqui</p>
                    <p className="lib-our-use">{lib.ourUse}</p>
                  </div>

                  {lib.snippet && (
                    <div className="lib-block">
                      <p className="lib-block-title">{lib.snippet.title}</p>
                      <CodeBlock code={lib.snippet.code} lang={lib.snippet.lang} />
                    </div>
                  )}

                  <div className="lib-links">
                    {lib.links.map((lk) => (
                      <a key={lk.url} href={lk.url} target="_blank" rel="noreferrer">
                        {lk.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Callout kind="note" title="A biblioteca padrão também conta">
        Boa parte do trabalho é da stdlib do Python: <code>abc</code> (interfaces plugáveis),{' '}
        <code>concurrent.futures</code> (DomainGuesser paralelo), <code>tracemalloc</code> (memória
        nos benchmarks), <code>urllib.parse</code>, <code>hashlib</code>, <code>sqlite3</code> e{' '}
        <code>dataclasses</code>.
      </Callout>

      <Callout kind="info" title="A stack desta documentação">
        Esta página é React + Vite + TypeScript, com <code>react-router-dom</code> (navegação),{' '}
        <code>react-markdown</code> + <code>remark-gfm</code> (conteúdo em Markdown) e{' '}
        <code>rehype-highlight</code> (destaque de código).
      </Callout>
    </article>
  )
}
