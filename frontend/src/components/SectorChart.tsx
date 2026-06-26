import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { SectorStat } from '../api/client'

const config = {
  oportunidade: { label: 'Sem site próprio' },
}

interface Props {
  /** Agregação por setor vinda dos insights da run (já calculada no backend). */
  data: SectorStat[]
}

export default function SectorChart({ data }: Props) {
  // Carência por setor = negócios sem site próprio (sem_site + só social), top 10.
  const chartData = [...data]
    .filter(s => s.oportunidade > 0)
    .sort((a, b) => b.oportunidade - a.oportunidade)
    .slice(0, 10)
    .map(s => ({ setor: s.nome, oportunidade: s.oportunidade }))

  if (chartData.length === 0) {
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
          data={chartData}
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
          <Bar dataKey="oportunidade" fill="var(--chart-1)" radius={4} maxBarSize={36}>
            <LabelList
              dataKey="oportunidade"
              position="top"
              style={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
