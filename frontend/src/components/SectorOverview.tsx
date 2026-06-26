import type { SectorStat } from '../api/client'

// Cores da barra de composição — semânticas, alinhadas ao resto do painel.
const COR_SEM_SITE = 'var(--chart-1)'      // oportunidade (mercado imediato)
const COR_SO_SOCIAL = '#d97706'            // só rede social (mesmo amber do score ALTA)
const COR_COM_SITE = 'var(--text-muted)'   // já tem site (fora do alvo imediato)

interface Props {
  data: SectorStat[]
  onSelectSector?: (key: string) => void
}

/**
 * Overview das categorias: um card por setor, ordenado por oportunidade.
 * A barra segmentada mostra a composição do setor (sem site / só social / com
 * site) de relance — é o "porquê" do número de oportunidade. Clicar abre os
 * leads do setor.
 */
export default function SectorOverview({ data, onSelectSector }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded-xl border border-border bg-card text-[0.85rem] text-text-muted">
        Nenhum setor nesta execução.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.map(s => (
        <SectorCard key={s.key} s={s} onSelect={onSelectSector} />
      ))}
    </div>
  )
}

function SectorCard({ s, onSelect }: { s: SectorStat; onSelect?: (key: string) => void }) {
  const seg = (n: number) => (s.total > 0 ? `${(n / s.total) * 100}%` : '0%')
  const clickable = !!onSelect

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onSelect!(s.key) : undefined}
      onKeyDown={clickable ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect!(s.key) } } : undefined}
      aria-label={clickable ? `Ver leads de ${s.nome}` : undefined}
      className={
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition ' +
        (clickable
          ? 'cursor-pointer hover:border-brand hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:2px]'
          : '')
      }
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[1.3rem] leading-none" aria-hidden>{s.emoji}</span>
          <span className="text-[0.95rem] font-semibold text-text-strong">{s.nome}</span>
        </div>
        {s.prioritario && (
          <span className="shrink-0 rounded-full bg-brand-faint px-2 py-0.5 text-[0.66rem] font-bold uppercase tracking-[0.04em] text-brand">
            ★ foco
          </span>
        )}
      </div>

      {/* Número-herói: oportunidade (negócios sem site próprio) */}
      <div className="flex items-baseline gap-2">
        <span className="text-[1.9rem] font-extrabold leading-none text-brand">{s.oportunidade}</span>
        <span className="text-[0.78rem] leading-tight text-text-muted">
          sem site próprio<br />
          <span className="text-text-muted">de {s.total} ({s.oportunidade_pct}%)</span>
        </span>
      </div>

      {/* Barra de composição — o "porquê" visual */}
      <div>
        <div className="flex h-2 overflow-hidden rounded-full bg-border-faint" aria-hidden>
          <div style={{ width: seg(s.sem_site), background: COR_SEM_SITE }} />
          <div style={{ width: seg(s.so_social), background: COR_SO_SOCIAL }} />
          <div style={{ width: seg(s.com_site), background: COR_COM_SITE, opacity: 0.5 }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-text-muted">
          <Dot color={COR_SEM_SITE} label="Sem site" n={s.sem_site} />
          <Dot color={COR_SO_SOCIAL} label="Só social" n={s.so_social} />
          <Dot color={COR_COM_SITE} label="Tem site" n={s.com_site} dim />
        </div>
      </div>

      {/* Rodapé: score médio + leads quentes */}
      <div className="flex items-center justify-between border-t border-border-faint pt-2 text-[0.76rem] text-text-muted">
        <span>Score médio <strong className="text-text-strong">{s.score_medio}</strong></span>
        <span>{s.leads_quentes > 0 ? `⭐ ${s.leads_quentes} quentes` : '— sem leads quentes'}</span>
      </div>
    </div>
  )
}

function Dot({ color, label, n, dim }: { color: string; label: string; n: number; dim?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: color, opacity: dim ? 0.5 : 1 }}
      />
      {label} <strong className="font-semibold text-text">{n}</strong>
    </span>
  )
}
