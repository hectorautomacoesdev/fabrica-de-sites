import type { RunRead } from '../api/client'

interface Props {
  runs: RunRead[]
  selectedId: number | null
  onChange: (id: number) => void
  loading: boolean
}

export default function RunSelector({ runs, selectedId, onChange, loading }: Props) {
  if (loading) return <div className="py-1.5 text-sm text-text-muted">Carregando execuções…</div>
  if (runs.length === 0) return <div className="py-1.5 text-sm text-text-muted">Nenhuma execução ainda.</div>

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label htmlFor="run-select" className="text-[0.85rem] font-semibold whitespace-nowrap text-text-muted">
        Execução:
      </label>
      <select
        id="run-select"
        value={selectedId ?? ''}
        onChange={e => onChange(Number(e.target.value))}
        className="min-w-[260px] cursor-pointer rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-text-strong"
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
