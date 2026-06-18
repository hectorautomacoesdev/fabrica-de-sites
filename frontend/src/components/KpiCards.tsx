import type { KpiRead } from '../api/client'
import './KpiCards.css'

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
    <div className={`kpi-card${highlight ? ' kpi-card--highlight' : ''}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function KpiCards({ kpis }: Props) {
  return (
    <div className="kpi-grid">
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
