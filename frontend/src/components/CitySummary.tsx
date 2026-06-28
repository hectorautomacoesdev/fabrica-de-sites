import type { KpiRead, SectorStat } from '../api/client'

interface Props {
  kpis: KpiRead
  porSetor: SectorStat[]
  cidade?: string
}

/** Número em destaque dentro da frase. */
function Num({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-text-strong tabular-nums">{children}</strong>
}

/** Setor como chip inline (emoji + nome). */
function SectorPill({ emoji, nome }: { emoji: string; nome: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-brand-faint px-2 py-0.5 align-middle text-[0.88rem] font-semibold text-brand">
      <span aria-hidden>{emoji}</span> {nome}
    </span>
  )
}

/**
 * Manchete da Visão Geral — resumo determinístico do mercado (grátis, sem IA).
 * Sempre fala da cidade inteira; os 3 setores em destaque são os com mais
 * negócios contactáveis (telefone/e-mail).
 */
export default function CitySummary({ kpis, porSetor, cidade }: Props) {
  const local = cidade ?? 'a cidade'
  const nSetores = porSetor.length
  const top3 = [...porSetor].sort((a, b) => b.contactavel - a.contactavel).slice(0, 3)

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-l-[3px] border-brand p-5">
        <p className="text-[0.74rem] font-bold uppercase tracking-[0.14em] text-brand">
          Visão geral do Scout
        </p>
        <h2 className="mt-1 text-[1.7rem] font-extrabold tracking-[-0.02em] text-text-strong">
          {local}
        </h2>
        <p className="mt-3 max-w-[62ch] text-[1.02rem] leading-[1.7] text-text">
          O Scout mapeou <Num>{kpis.total}</Num> negócios, divididos em{' '}
          <Num>{nSetores}</Num> setores.
          {top3.length > 0 && (
            <>
              {' '}Os com mais contatos:{' '}
              {top3.map(s => (
                <SectorPill key={s.key} emoji={s.emoji} nome={s.nome} />
              ))}.
            </>
          )}
          {' '}No total, <strong className="font-bold text-brand">{kpis.leads_quentes} leads quentes</strong>{' '}
          prontos para abordar.
        </p>
      </div>
    </section>
  )
}
