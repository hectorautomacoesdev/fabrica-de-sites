import { useState } from 'react'
import type { SectorStat } from '../api/client'
import { useBusinesses } from '../hooks/useScout'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { StatusBadge } from './Badge'
import { scoreTextClass } from '../lib/score'
import { cn } from '@/lib/utils'
import { buildProspectMessage, whatsappUrl } from '../lib/leadUtils'
import LeadDrawer from './LeadDrawer'

const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site',
  SO_REDE_SOCIAL: 'Só social',
  COM_SITE: 'Tem site',
  DESCONHECIDO: 'Desconh.',
}

const COR_SEM_SITE = 'var(--chart-1)'
const COR_SO_SOCIAL = '#d97706'
const COR_COM_SITE = 'var(--text-muted)'

interface Props {
  sector: SectorStat | null
  runId: number
  cidade?: string
  onClose: () => void
  /** Atalho opcional: abre a aba Leads filtrada por este setor. */
  onVerTodos?: (key: string) => void
}

/**
 * Painel lateral de um setor: resumo (oportunidade, composição, score, quentes)
 * + a lista dos negócios do setor. Clicar num negócio abre o LeadDrawer por cima.
 */
export default function SectorDrawer({ sector, runId, cidade, onClose, onVerTodos }: Props) {
  const open = sector !== null
  // Retém o último setor durante a animação de saída (o Radix mantém montado).
  const [shown, setShown] = useState<SectorStat | null>(sector)
  if (sector !== null && sector !== shown) setShown(sector)
  const s = shown

  const [leadId, setLeadId] = useState<number | null>(null)

  const { data: businesses = [], isLoading } = useBusinesses(open ? runId : null, {
    setor: s?.key,
    order_by: 'score',
    order_dir: 'desc',
    limit: 100,
  })
  const selectedLead = leadId != null ? businesses.find(b => b.id === leadId) ?? null : null

  const seg = (n: number) => (s && s.total > 0 ? `${(n / s.total) * 100}%` : '0%')

  return (
    <>
      <Sheet open={open} onOpenChange={o => { if (!o) { setLeadId(null); onClose() } }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[460px] max-w-[94vw] gap-4 overflow-y-auto p-5 sm:max-w-[94vw]"
          aria-label={s ? `Setor ${s.nome}` : 'Setor'}
        >
          {s && (
            <>
              {/* Cabeçalho */}
              <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[1.5rem] leading-none" aria-hidden>{s.emoji}</span>
                  <div>
                    <SheetTitle className="text-[1.1rem] font-bold leading-tight text-text-strong">{s.nome}</SheetTitle>
                    <SheetDescription className="sr-only">Detalhes e negócios do setor {s.nome}.</SheetDescription>
                    {s.prioritario && (
                      <span className="mt-1 inline-block rounded-full bg-brand-faint px-2 py-0.5 text-[0.72rem] font-bold uppercase tracking-[0.04em] text-brand">★ foco</span>
                    )}
                  </div>
                </div>
                <SheetClose
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent text-[0.9rem] text-text-muted hover:bg-hover hover:text-text-strong"
                  aria-label="Fechar"
                >✕</SheetClose>
              </header>

              {/* Resumo: oportunidade + composição + score/quentes */}
              <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[1.9rem] font-extrabold leading-none text-brand">{s.oportunidade}</span>
                  <span className="text-[0.83rem] leading-tight text-text-muted">sem site próprio<br />de {s.total} ({s.oportunidade_pct}%)</span>
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-border-faint" aria-hidden>
                  <div style={{ width: seg(s.sem_site), background: COR_SEM_SITE }} />
                  <div style={{ width: seg(s.so_social), background: COR_SO_SOCIAL }} />
                  <div style={{ width: seg(s.com_site), background: COR_COM_SITE, opacity: 0.5 }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[0.82rem] text-text-muted">
                  <span>Score médio <strong className="text-text-strong">{s.score_medio}</strong></span>
                  <span>{s.leads_quentes > 0 ? `⭐ ${s.leads_quentes} quentes` : '— sem leads quentes'}</span>
                </div>
              </section>

              {/* Lista de negócios do setor */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted">Negócios do setor</p>
                  {onVerTodos && (
                    <button
                      type="button"
                      className="cursor-pointer text-[0.82rem] font-semibold text-brand hover:underline"
                      onClick={() => onVerTodos(s.key)}
                    >Ver na aba Leads →</button>
                  )}
                </div>

                {isLoading ? (
                  <p className="py-6 text-center text-[0.85rem] text-text-muted">Carregando…</p>
                ) : businesses.length === 0 ? (
                  <p className="py-6 text-center text-[0.85rem] text-text-muted">Nenhum negócio neste setor.</p>
                ) : (
                  <ul className="flex list-none flex-col">
                    {businesses.map(b => {
                      const wa = whatsappUrl(b.telefone, buildProspectMessage(b, cidade))
                      return (
                        <li key={b.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setLeadId(b.id)}
                            onKeyDown={e => { if (e.key === 'Enter') setLeadId(b.id) }}
                            className="flex cursor-pointer items-center gap-3 border-b border-border-faint py-2 hover:bg-hover focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:-2px]"
                          >
                            <span className={cn('w-8 shrink-0 text-right text-[0.92rem] font-bold', scoreTextClass(b.score_label))}>{b.score}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[0.86rem] font-medium text-text-strong">{b.nome ?? 'sem nome'}</p>
                              <StatusBadge status={b.site_status} label={STATUS_LABELS[b.site_status] ?? b.site_status} />
                            </div>
                            {wa && (
                              <a
                                className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-[rgba(37,211,102,0.14)] text-[0.9rem] hover:bg-[rgba(37,211,102,0.3)]"
                                href={wa} target="_blank" rel="noreferrer" title="WhatsApp"
                                onClick={e => e.stopPropagation()}
                              >💬</a>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Lead aberto a partir da lista — Sheet irmão, abre por cima. */}
      <LeadDrawer business={selectedLead} cidade={cidade} onClose={() => setLeadId(null)} />
    </>
  )
}
