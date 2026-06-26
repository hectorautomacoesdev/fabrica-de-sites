import type { KpiRead } from '../api/client'

interface Props {
  kpis: KpiRead
  cidade?: string
}

/**
 * Resumo determinístico do mercado da cidade — gerado dos próprios números (grátis,
 * sem IA). É a "manchete" da visão geral: abre com o que gera ação (leads quentes),
 * seguindo a regra dos 5 segundos e o foco em métricas acionáveis (ver plano de BI).
 */
export default function CitySummary({ kpis, cidade }: Props) {
  const local = cidade ?? 'a cidade'
  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <p className="mb-1.5 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted">
        Resumo do mercado — {local}
      </p>
      <p className="text-[0.95rem] leading-relaxed text-text">
        O Scout mapeou <strong className="text-text-strong">{kpis.total}</strong> negócios em {local}.{' '}
        <strong className="text-text-strong">{kpis.pct_sem_site_proprio}%</strong> não têm site próprio
        e <strong className="text-text-strong">{kpis.pct_contactavel}%</strong> são contactáveis — o que
        rende <strong className="text-brand">{kpis.leads_quentes} leads quentes</strong> prontos para
        abordar.
        {kpis.so_social > 0 && (
          <>
            {' '}Destes, <strong className="text-text-strong">{kpis.so_social}</strong> têm só rede
            social — o lead mais fácil de converter.
          </>
        )}
      </p>
    </section>
  )
}
