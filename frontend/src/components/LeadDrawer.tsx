import { useState } from 'react'
import type { BusinessRead } from '../api/client'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { StatusBadge } from './Badge'
import { scoreTextClass } from '../lib/score'
import {
  buildProspectMessage,
  instagramSearchUrl,
  linkedinSearchUrl,
  googleSearchUrl,
  mapsUrl,
  NETWORK_ICON,
  socialLinks,
  telUrl,
  websiteIsSocial,
  whatsappUrl,
} from '../lib/leadUtils'

const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site',
  SO_REDE_SOCIAL: 'Só rede social',
  COM_SITE: 'Tem site',
  DESCONHECIDO: 'Desconhecido',
}

// Padrões repetidos do drawer
const act = 'inline-flex cursor-pointer items-center gap-[5px] rounded-lg border border-border bg-card px-3 py-[7px] text-[0.85rem] font-semibold text-text-strong no-underline hover:bg-hover'
const blockTitle = 'mb-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted'
const block = 'border-t border-border-faint pt-[14px]'
const muted = 'text-[0.86rem] text-text-muted'
const chip = 'rounded-full bg-brand-faint px-2 py-0.5 text-[0.78rem] font-semibold text-brand'

const ORG_TIPO_LABELS: Record<string, string> = {
  independente: 'Independente',
  publico: 'Órgão público',
  rede: 'Rede / franquia',
}

interface Props {
  business: BusinessRead | null
  cidade?: string
  onClose: () => void
}

export default function LeadDrawer({ business, cidade, onClose }: Props) {
  const open = business !== null
  // Retém o último negócio para o conteúdo não sumir durante a animação de saída
  // (o Radix mantém o painel montado até a transição terminar). Padrão oficial do
  // React de "ajustar estado durante o render" — re-renderiza na hora, sem effect.
  const [shown, setShown] = useState<BusinessRead | null>(business)
  if (business !== null && business !== shown) {
    setShown(business)
  }

  const b = shown
  const nome = b?.nome ?? 'Negócio sem nome'
  const wa = b ? whatsappUrl(b.telefone, buildProspectMessage(b, cidade)) : null
  const tel = b ? telUrl(b.telefone) : null
  const maps = b ? mapsUrl(b) : null
  const socials = b ? socialLinks(b) : []
  const temSitePróprio = !!b?.website && !websiteIsSocial(b)

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[440px] max-w-[94vw] gap-[18px] overflow-y-auto p-5 sm:max-w-[94vw]"
        aria-label={`Detalhe de ${nome}`}
      >
        {b && (
          <>
        {/* Cabeçalho */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle className="text-[1.15rem] font-bold leading-[1.25] tracking-[-0.01em] text-text-strong">{nome}</SheetTitle>
            <SheetDescription className="sr-only">
              Detalhes, contato e ações de prospecção do lead {nome}.
            </SheetDescription>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={chip}>{b.setor_nome}</span>
              {b.org_tipo && b.org_tipo !== 'independente' && (
                <span className={cn(chip, 'bg-[#fef3c7] text-[#92400e]')}>{ORG_TIPO_LABELS[b.org_tipo] ?? b.org_tipo}</span>
              )}
              <StatusBadge status={b.site_status} label={STATUS_LABELS[b.site_status] ?? b.site_status} />
            </div>
          </div>
          <SheetClose
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent text-[0.9rem] text-text-muted hover:bg-hover hover:text-text-strong"
            aria-label="Fechar"
          >✕</SheetClose>
        </header>

        {/* Score + porquês */}
        <section className="flex items-center gap-4 rounded-xl border border-border bg-card p-[14px]">
          <div className={cn('flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-current', scoreTextClass(b.score_label))}>
            <span className="text-[1.5rem] font-extrabold leading-none">{b.score}</span>
            <span className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.04em]">{b.score_label}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className={blockTitle}>Por que essa oportunidade</p>
            {b.score_motivos && b.score_motivos.length > 0 ? (
              <ul className="flex list-none flex-col gap-[3px]">
                {b.score_motivos.map((m, i) => (
                  <li key={i} className="relative pl-[14px] text-[0.85rem] text-text before:absolute before:left-[2px] before:text-brand before:content-['•']">{m}</li>
                ))}
              </ul>
            ) : (
              <p className={muted}>Sem motivos detalhados nesta execução.</p>
            )}
          </div>
        </section>

        {/* Ações rápidas */}
        <section className="flex flex-wrap gap-2">
          {wa && <a className={cn(act, 'border-[#25d366] bg-[#25d366] text-[#06301a] hover:bg-[#25d366] hover:brightness-105')} href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
          {tel && <a className={act} href={tel}>📞 Ligar</a>}
          {b.email && <a className={act} href={`mailto:${b.email}`}>✉️ E-mail</a>}
          {temSitePróprio && <a className={act} href={b.website!} target="_blank" rel="noreferrer">🌐 Abrir site</a>}
          {maps && <a className={act} href={maps} target="_blank" rel="noreferrer">📍 Mapa</a>}
          <a className={act} href={googleSearchUrl(`${nome} ${cidade ?? ''}`)} target="_blank" rel="noreferrer">🔎 Google</a>
        </section>

        {/* Contato */}
        <section className={block}>
          <p className={blockTitle}>Contato</p>
          <dl className="grid grid-cols-[84px_1fr] gap-x-2.5 gap-y-1.5 text-[0.84rem]">
            <Item label="Telefone" value={b.telefone} />
            <Item label="E-mail" value={b.email} />
            <Item label="Endereço" value={b.endereco} />
            <Item label="Horário" value={b.horario} />
          </dl>
        </section>

        {/* Presença online */}
        <section className={block}>
          <p className={blockTitle}>Presença online</p>
          {temSitePróprio && (
            <p className="mb-2 text-[0.84rem]">
              <span>🌐 Site próprio:</span>{' '}
              <a className="break-all" href={b.website!} target="_blank" rel="noreferrer">{prettyUrl(b.website!)}</a>
            </p>
          )}
          {socials.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {socials.map(s => (
                <a key={s.network} className="rounded-full border border-border bg-brand-faint px-2.5 py-1 text-[0.83rem] text-brand no-underline hover:bg-hover" href={s.url} target="_blank" rel="noreferrer">
                  {NETWORK_ICON[s.network]} {s.label}{s.handle ? ` · @${s.handle}` : ''}
                </a>
              ))}
            </div>
          )}
          {!temSitePróprio && socials.length === 0 && (
            <p className={muted}>Nenhum link de presença web detectado.</p>
          )}

          {/* Atalhos de busca — úteis enquanto o enriquecimento não traz os links */}
          <div className="flex flex-wrap items-center gap-2.5 text-[0.85rem]">
            <span className={muted}>Buscar perfis:</span>
            <a className="font-semibold no-underline" href={instagramSearchUrl(b.nome, cidade)} target="_blank" rel="noreferrer">📷 Instagram</a>
            <a className="font-semibold no-underline" href={linkedinSearchUrl(b.nome, cidade)} target="_blank" rel="noreferrer">💼 LinkedIn</a>
          </div>
        </section>

        {/* Resumo da empresa (enriquecimento futuro) */}
        <section className={block}>
          <p className={blockTitle}>Resumo da empresa</p>
          {b.resumo ? (
            <p className="text-[0.86rem] leading-[1.55] text-text">{b.resumo}</p>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <p className={muted}>
                Resumo automático ainda não disponível — chega com o agente de
                enriquecimento/Auditor. Por enquanto, dá pra investigar rápido:
              </p>
              <a className={cn(act, 'bg-transparent')} href={googleSearchUrl(`${nome} ${cidade ?? ''} sobre`)} target="_blank" rel="noreferrer">
                🔎 Pesquisar sobre a empresa
              </a>
            </div>
          )}
        </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="break-words text-text">{value ? value : <span className={muted}>—</span>}</dd>
    </>
  )
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
