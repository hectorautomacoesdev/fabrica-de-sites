import { lazy, Suspense, useState } from 'react'
import BusinessTable from './components/BusinessTable'
import CitySummary from './components/CitySummary'
import KpiCards from './components/KpiCards'
import ProspectFunnel from './components/ProspectFunnel'
import RunSelector from './components/RunSelector'
import ScoutForm from './components/ScoutForm'
import SectorChart from './components/SectorChart'
import ThemeToggle from './components/ThemeToggle'
import { useInsights, useRuns } from './hooks/useScout'

const MapView = lazy(() => import('./components/MapView'))

export default function App() {
  const { data: runs = [], isLoading: loadingRuns, error: runsError } = useRuns()
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)

  // Seleciona automaticamente a run mais recente quando os dados chegam
  const activeRunId = selectedRunId ?? (runs.length > 0 ? runs[0].id : null)
  const cidade = runs.find(r => r.id === activeRunId)?.cidade

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
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
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
          {/* Resumo do mercado — a manchete da visão geral */}
          <CitySummary kpis={insights.kpis} cidade={cidade} />

          {/* KPIs */}
          <p className={sectionTitle}>Indicadores</p>
          <KpiCards kpis={insights.kpis} />

          {/* Gráficos — Fase B */}
          <p className={sectionTitle}>Análise visual</p>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProspectFunnel kpis={insights.kpis} />
            <SectorChart runId={activeRunId} />
          </div>

          {/* Mapa — Fase C */}
          <p className={sectionTitle}>Mapa de oportunidades</p>
          <div className="mb-6">
            <Suspense fallback={
              <div className="flex h-[420px] items-center justify-center rounded-xl border border-border bg-card text-[0.85rem] text-text-muted">
                Carregando mapa…
              </div>
            }>
              <MapView runId={activeRunId} cidade={cidade} />
            </Suspense>
          </div>

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
          <BusinessTable runId={activeRunId} cidade={cidade} />
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
