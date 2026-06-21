import { useState } from 'react'
import type { BusinessRead } from '../api/client'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
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
import './LeadDrawer.css'

const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site',
  SO_REDE_SOCIAL: 'Só rede social',
  COM_SITE: 'Tem site',
  DESCONHECIDO: 'Desconhecido',
}

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
        <header className="drawer-head">
          <div>
            <SheetTitle className="drawer-nome">{nome}</SheetTitle>
            <SheetDescription className="sr-only">
              Detalhes, contato e ações de prospecção do lead {nome}.
            </SheetDescription>
            <div className="drawer-tags">
              <span className="drawer-chip">{b.setor_nome}</span>
              {b.org_tipo && b.org_tipo !== 'independente' && (
                <span className="drawer-chip chip-warn">{ORG_TIPO_LABELS[b.org_tipo] ?? b.org_tipo}</span>
              )}
              <span className={`status-badge status-${statusSlug(b.site_status)}`}>
                {STATUS_LABELS[b.site_status] ?? b.site_status}
              </span>
            </div>
          </div>
          <SheetClose className="drawer-close" aria-label="Fechar">✕</SheetClose>
        </header>

        {/* Score + porquês */}
        <section className="drawer-score">
          <div className={`score-ring score-${scoreSlug(b.score_label)}`}>
            <span className="score-num">{b.score}</span>
            <span className="score-lbl">{b.score_label}</span>
          </div>
          <div className="score-motivos">
            <p className="block-title">Por que essa oportunidade</p>
            {b.score_motivos && b.score_motivos.length > 0 ? (
              <ul>{b.score_motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            ) : (
              <p className="muted">Sem motivos detalhados nesta execução.</p>
            )}
          </div>
        </section>

        {/* Ações rápidas */}
        <section className="drawer-actions">
          {wa && <a className="act act-wa" href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
          {tel && <a className="act" href={tel}>📞 Ligar</a>}
          {b.email && <a className="act" href={`mailto:${b.email}`}>✉️ E-mail</a>}
          {temSitePróprio && <a className="act" href={b.website!} target="_blank" rel="noreferrer">🌐 Abrir site</a>}
          {maps && <a className="act" href={maps} target="_blank" rel="noreferrer">📍 Mapa</a>}
          <a className="act" href={googleSearchUrl(`${nome} ${cidade ?? ''}`)} target="_blank" rel="noreferrer">🔎 Google</a>
        </section>

        {/* Contato */}
        <section className="drawer-block">
          <p className="block-title">Contato</p>
          <dl className="kv">
            <Item label="Telefone" value={b.telefone} />
            <Item label="E-mail" value={b.email} />
            <Item label="Endereço" value={b.endereco} />
            <Item label="Horário" value={b.horario} />
          </dl>
        </section>

        {/* Presença online */}
        <section className="drawer-block">
          <p className="block-title">Presença online</p>
          {temSitePróprio && (
            <p className="online-row">
              <span>🌐 Site próprio:</span>{' '}
              <a href={b.website!} target="_blank" rel="noreferrer">{prettyUrl(b.website!)}</a>
            </p>
          )}
          {socials.length > 0 && (
            <div className="social-list">
              {socials.map(s => (
                <a key={s.network} className="social-pill" href={s.url} target="_blank" rel="noreferrer">
                  {NETWORK_ICON[s.network]} {s.label}{s.handle ? ` · @${s.handle}` : ''}
                </a>
              ))}
            </div>
          )}
          {!temSitePróprio && socials.length === 0 && (
            <p className="muted">Nenhum link de presença web detectado.</p>
          )}

          {/* Atalhos de busca — úteis enquanto o enriquecimento não traz os links */}
          <div className="search-shortcuts">
            <span className="muted">Buscar perfis:</span>
            <a href={instagramSearchUrl(b.nome, cidade)} target="_blank" rel="noreferrer">📷 Instagram</a>
            <a href={linkedinSearchUrl(b.nome, cidade)} target="_blank" rel="noreferrer">💼 LinkedIn</a>
          </div>
        </section>

        {/* Resumo da empresa (enriquecimento futuro) */}
        <section className="drawer-block">
          <p className="block-title">Resumo da empresa</p>
          {b.resumo ? (
            <p className="resumo">{b.resumo}</p>
          ) : (
            <div className="resumo-placeholder">
              <p className="muted">
                Resumo automático ainda não disponível — chega com o agente de
                enriquecimento/Auditor. Por enquanto, dá pra investigar rápido:
              </p>
              <a className="act act-ghost" href={googleSearchUrl(`${nome} ${cidade ?? ''} sobre`)} target="_blank" rel="noreferrer">
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
      <dt>{label}</dt>
      <dd>{value ? value : <span className="muted">—</span>}</dd>
    </>
  )
}

function scoreSlug(label: string): string {
  return ({
    'ALTÍSSIMA': 'altissima',
    'ALTA': 'alta',
    'MÉDIA': 'media',
    'BAIXA': 'baixa',
  } as Record<string, string>)[label] ?? 'baixa'
}

function statusSlug(status: string): string {
  return ({
    SEM_SITE: 'sem-site',
    SO_REDE_SOCIAL: 'social',
    COM_SITE: 'com-site',
    DESCONHECIDO: 'desconh',
  } as Record<string, string>)[status] ?? 'desconh'
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
