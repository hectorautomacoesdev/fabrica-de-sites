import { useState } from 'react'
import './App.css'
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

  if (runsError) {
    return (
      <div className="app">
        <div className="error-msg">
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
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-title">
          Fábrica de Sites &mdash; <span>Scout</span>
        </div>
        <div className="header-right">
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
        <div className="state-msg">
          Nenhuma execução encontrada. Clique em <strong>+ Nova coleta</strong> para rodar o Scout.
        </div>
      ) : loadingInsights ? (
        <div className="state-msg">Carregando dados da execução…</div>
      ) : insights ? (
        <>
          {/* KPIs */}
          <p className="section-title">Indicadores</p>
          <KpiCards kpis={insights.kpis} />

          {/* Insights de texto */}
          <div className="insights-section">
            <h2>Insights</h2>
            <ul className="insights-list">
              {insights.insights.map((txt, i) => (
                <li key={i}>{txt}</li>
              ))}
            </ul>
          </div>

          {/* Tabela de negócios */}
          <p className="section-title">Negócios mapeados</p>
          <BusinessTable runId={activeRunId} />
        </>
      ) : null}

      {/* ── Footer ── */}
      <footer style={{ marginTop: 32, textAlign: 'right' }}>
        <a
          className="api-link"
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
