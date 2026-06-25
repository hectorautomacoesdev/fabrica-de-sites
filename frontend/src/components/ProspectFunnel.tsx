import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { KpiRead } from '../api/client'

const config = {
  valor: { label: 'Negócios' },
}

const ETAPAS = [
  { key: 'total',           label: 'Mapeados',       color: 'var(--chart-3)' },
  { key: 'sem_site_proprio', label: 'Sem site',       color: 'var(--chart-2)' },
  { key: 'contactavel',     label: 'Contactáveis',    color: 'var(--chart-1)' },
  { key: 'leads_quentes',   label: 'Leads quentes',   color: 'var(--chart-4)' },
] as const

interface Props { kpis: KpiRead }

export default function ProspectFunnel({ kpis }: Props) {
  const data = ETAPAS.map(e => ({ etapa: e.label, valor: kpis[e.key], color: e.color }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
        Funil de prospecção
      </p>
      <ChartContainer config={config} className="h-[200px]">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="etapa"
            width={110}
            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="valor" radius={5} maxBarSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text-muted)' }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
