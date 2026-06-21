import { useState } from 'react'
import BusinessTable from './components/BusinessTable'
import KpiCards from './components/KpiCards'
import RunSelector from './components/RunSelector'
import ScoutForm from './components/ScoutForm'
import { useInsights, useRuns } from './hooks/useScout'

export default function App() {
  const { data: runs = [], isLoading: loadingRuns, error: runsError } = useRuns()
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)

  // Seleciona automaticamente a run mais recente quando os dados chegam
  const activeRunId = selectedRunId ?? (runs.length > 0 ? runs[0].id : null)

  const { data: insights, isLoading: loadingInsights } = useInsights(activeRunId)

  function handleNewRun(runId: number) {
    setSelectedRunId(runId)
  }

  const appShell = 'mx-auto max-w-[1280px] px-5 pb-10'
  const sectionTitle = 'mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted'
  const stateMsg = 'px-5 py-12 text-center text-[0.9rem] text-text-muted'

  if (runsError) {
    return (
      <div className={appShell}>
        <div className="px-5 py-8 text-center text-[0.9rem] text-[#e74c3c]">
          Não foi possível conectar à API. Certifique-se de que o servidor está rodando em{' '}
          <code>localhost:8001</code>.<br />
          <small>
            <a href="http://localhost:8001/docs" target="_blank" rel="noreferrer">
              Abrir Swagger →
            </a>
          </small>
        </div>
      </div>
    )
  }

  return (
    <div className={appShell}>
      {/* ── Header ── */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
        <div className="text-[1.1rem] font-bold tracking-[-0.02em] text-text-strong">
          Fábrica de Sites &mdash; <span className="text-brand">Scout</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <RunSelector
            runs={runs}
            selectedId={activeRunId}
            onChange={setSelectedRunId}
            loading={loadingRuns}
          />
          <ScoutForm onSuccess={handleNewRun} />
        </div>
      </header>

      {/* ── Conteúdo principal ── */}
      {activeRunId === null ? (
        <div className={stateMsg}>
          Nenhuma execução encontrada. Clique em <strong>+ Nova coleta</strong> para rodar o Scout.
        </div>
      ) : loadingInsights ? (
        <div className={stateMsg}>Carregando dados da execução…</div>
      ) : insights ? (
        <>
          {/* KPIs */}
          <p className={sectionTitle}>Indicadores</p>
          <KpiCards kpis={insights.kpis} />

          {/* Insights de texto */}
          <div className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Insights</h2>
            <ul className="flex list-none flex-col gap-1">
              {insights.insights.map((txt, i) => (
                <li key={i} className="border-b border-border-faint py-1 text-[0.85rem] text-text last:border-b-0">{txt}</li>
              ))}
            </ul>
          </div>

          {/* Tabela de negócios */}
          <p className={sectionTitle}>
            Negócios mapeados{' '}
            <span className="font-normal normal-case tracking-normal text-text-muted">
              — clique numa linha para ver o lead
            </span>
          </p>
          <BusinessTable runId={activeRunId} cidade={runs.find(r => r.id === activeRunId)?.cidade} />
        </>
      ) : null}

      {/* ── Footer ── */}
      <footer className="mt-8 text-right">
        <a
          className="text-[0.78rem] text-text-muted"
          href="http://localhost:8001/docs"
          target="_blank"
          rel="noreferrer"
        >
          API Swagger →
        </a>
      </footer>
    </div>
  )
}
