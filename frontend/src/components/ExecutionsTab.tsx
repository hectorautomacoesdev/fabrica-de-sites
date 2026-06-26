import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { RunRead } from '../api/client'

const config = {
  total: { label: 'Negócios mapeados' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

interface Props {
  runs: RunRead[]
  activeRunId: number | null
  onSelect: (id: number) => void
}

export default function ExecutionsTab({ runs, activeRunId, onSelect }: Props) {
  if (runs.length === 0) {
    return (
      <div className="py-16 text-center text-[0.9rem] text-text-muted">
        Nenhuma execução encontrada.
      </div>
    )
  }

  const chartData = [...runs]
    .reverse() // cronológico (mais antiga à esq.)
    .map(r => ({ label: fmtDate(r.gerado_em), total: r.total, id: r.id }))

  return (
    <div className="space-y-6">
      {/* Gráfico de tendência */}
      {runs.length >= 2 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted">
            Tendência — negócios mapeados por execução
          </p>
          <ChartContainer config={config} className="h-[180px]">
            <BarChart data={chartData} margin={{ left: 4, right: 8, top: 16, bottom: 8 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--chart-1)" radius={4} maxBarSize={40}>
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Tabela de histórico */}
      <div className="rounded-xl border border-border bg-card">
        <table className="w-full text-[0.84rem]">
          <thead>
            <tr className="border-b border-border text-left text-[0.78rem] font-bold uppercase tracking-[0.06em] text-text-muted">
              <th className="px-4 py-2.5">Data</th>
              <th className="px-4 py-2.5">Cidade</th>
              <th className="px-4 py-2.5">Fonte</th>
              <th className="px-4 py-2.5 text-right">Mapeados</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {runs.map(r => {
              const active = r.id === activeRunId
              return (
                <tr
                  key={r.id}
                  className={`cursor-pointer border-b border-border-faint last:border-b-0 transition-colors hover:bg-hover ${active ? 'bg-brand-faint' : ''}`}
                  onClick={() => onSelect(r.id)}
                >
                  <td className="px-4 py-2.5 text-text-muted">{fmtDate(r.gerado_em)}</td>
                  <td className="px-4 py-2.5 font-medium text-text-strong">{r.cidade}</td>
                  <td className="px-4 py-2.5 text-text-muted">{r.fonte}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-text-strong">{r.total}</td>
                  <td className="px-4 py-2.5 text-right">
                    {active && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[0.74rem] font-semibold text-white">
                        ativa
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
