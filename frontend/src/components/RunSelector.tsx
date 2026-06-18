import type { RunRead } from '../api/client'
import './RunSelector.css'

interface Props {
  runs: RunRead[]
  selectedId: number | null
  onChange: (id: number) => void
  loading: boolean
}

export default function RunSelector({ runs, selectedId, onChange, loading }: Props) {
  if (loading) return <div className="run-selector-placeholder">Carregando execuções…</div>
  if (runs.length === 0) return <div className="run-selector-placeholder">Nenhuma execução ainda.</div>

  return (
    <div className="run-selector">
      <label htmlFor="run-select">Execução:</label>
      <select
        id="run-select"
        value={selectedId ?? ''}
        onChange={e => onChange(Number(e.target.value))}
      >
        {runs.map(r => (
          <option key={r.id} value={r.id}>
            #{r.id} — {r.cidade} &nbsp;·&nbsp; {r.total} negócios &nbsp;·&nbsp;{' '}
            {new Date(r.gerado_em).toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })}
            &nbsp;·&nbsp; {r.fonte}
          </option>
        ))}
      </select>
    </div>
  )
}
