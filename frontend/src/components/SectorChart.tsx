import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useBusinesses } from '../hooks/useScout'

const config = {
  sem_site: { label: 'Sem site próprio' },
}

interface Props { runId: number }

export default function SectorChart({ runId }: Props) {
  const { data: businesses = [], isLoading } = useBusinesses(runId, { limit: 5000 })

  if (isLoading) {
    return (
      <div className="flex h-[248px] items-center justify-center rounded-xl border border-border bg-card text-[0.85rem] text-text-muted">
        Carregando setores…
      </div>
    )
  }

  // Conta negócios sem site próprio por setor (top 10)
  const bySetor: Record<string, number> = {}
  for (const b of businesses) {
    if (b.site_status !== 'COM_SITE') {
      bySetor[b.setor_nome] = (bySetor[b.setor_nome] ?? 0) + 1
    }
  }

  const data = Object.entries(bySetor)
    .map(([setor, sem_site]) => ({ setor, sem_site }))
    .sort((a, b) => b.sem_site - a.sem_site)
    .slice(0, 10)

  if (data.length === 0) {
    return (
      <div className="flex h-[248px] items-center justify-center rounded-xl border border-border bg-card text-[0.85rem] text-text-muted">
        Nenhum setor disponível.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
        Carência por setor — top 10
      </p>
      <ChartContainer config={config} className="h-[200px]">
        <BarChart
          data={data}
          margin={{ left: 4, right: 8, top: 16, bottom: 48 }}
        >
          <XAxis
            dataKey="setor"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            angle={-35}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="sem_site" fill="var(--chart-1)" radius={4} maxBarSize={36}>
            <LabelList
              dataKey="sem_site"
              position="top"
              style={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
