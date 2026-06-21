import type { KpiRead } from '../api/client'
import { cn } from '@/lib/utils'

interface Props {
  kpis: KpiRead
}

interface CardProps {
  value: number | string
  label: string
  sub?: string
  highlight?: boolean
}

function Card({ value, label, sub, highlight }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-border bg-card px-5 py-4 text-center',
        highlight && 'border-brand bg-brand-faint',
      )}
    >
      <div className={cn('text-[2rem] font-bold leading-[1.1] text-text-strong', highlight && 'text-brand')}>
        {value}
      </div>
      <div className="mt-1 text-[0.8rem] font-medium uppercase tracking-[0.04em] text-text-muted">
        {label}
      </div>
      {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
    </div>
  )
}

export default function KpiCards({ kpis }: Props) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      <Card value={kpis.total} label="Negócios mapeados" />
      <Card
        value={kpis.sem_site_proprio}
        label="Sem site próprio"
        sub={`${kpis.pct_sem_site_proprio}% do total`}
      />
      <Card value={kpis.so_social} label="Só rede social" />
      <Card value={kpis.com_site} label="Têm site próprio" />
      <Card
        value={kpis.contactavel}
        label="Com contato"
        sub={`${kpis.pct_contactavel}% do total`}
      />
      <Card
        value={kpis.leads_quentes}
        label="Leads quentes"
        sub="Alta oportunidade + contato"
        highlight
      />
    </div>
  )
}
