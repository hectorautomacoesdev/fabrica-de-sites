/**
 * Utilidades de lead — links acionáveis e detecção de redes sociais.
 *
 * Tudo aqui é puro (sem rede) e derivado dos dados que já temos do negócio.
 * A ideia: mesmo sem a API trazer redes sociais/resumo ainda, o painel já
 * oferece atalhos úteis (WhatsApp, ligar, mapa, buscar no Instagram/LinkedIn).
 */

import type { BusinessRead } from '../api/client'

// ──────────────────────────────────────────────────────────────────────────
// Telefone / WhatsApp / mapa
// ──────────────────────────────────────────────────────────────────────────

export function onlyDigits(s: string): string {
  return (s ?? '').replace(/\D+/g, '')
}

/**
 * Normaliza um telefone brasileiro para o formato E.164 sem o "+":
 * 55 + DDD + número. Retorna null se não parecer um telefone válido.
 */
export function normalizePhoneBR(phone: string | null | undefined): string | null {
  if (!phone) return null
  const d = onlyDigits(phone)
  if (d.length < 10) return null // muito curto p/ ser DDD + número
  if (d.startsWith('55') && d.length >= 12) return d // já tem código do país
  if (d.length === 10 || d.length === 11) return `55${d}` // DDD + número
  return d
}

/** Link WhatsApp click-to-chat (wa.me) com mensagem pré-preenchida. */
export function whatsappUrl(
  phone: string | null | undefined,
  message?: string,
): string | null {
  const num = normalizePhoneBR(phone)
  if (!num) return null
  const base = `https://wa.me/${num}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export function telUrl(phone: string | null | undefined): string | null {
  const num = normalizePhoneBR(phone)
  return num ? `tel:+${num}` : null
}

export function mapsUrl(b: Pick<BusinessRead, 'lat' | 'lon' | 'nome' | 'endereco'>): string | null {
  if (b.lat != null && b.lon != null) {
    return `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lon}`
  }
  const q = [b.nome, b.endereco].filter(Boolean).join(' ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

// ──────────────────────────────────────────────────────────────────────────
// Buscas rápidas (úteis enquanto o enriquecimento por API não existe)
// ──────────────────────────────────────────────────────────────────────────

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

/** Busca o Instagram do negócio (via Google, mais robusto que a busca interna). */
export function instagramSearchUrl(nome: string | null, cidade?: string): string {
  return googleSearchUrl(`${nome ?? ''} ${cidade ?? ''} instagram`.trim())
}

export function linkedinSearchUrl(nome: string | null, cidade?: string): string {
  return googleSearchUrl(`${nome ?? ''} ${cidade ?? ''} linkedin`.trim())
}

// ──────────────────────────────────────────────────────────────────────────
// Detecção de rede social a partir de uma URL
// ──────────────────────────────────────────────────────────────────────────

export type SocialNetwork =
  | 'instagram' | 'facebook' | 'linkedin' | 'youtube'
  | 'tiktok' | 'twitter' | 'linktree' | 'whatsapp' | 'maps' | 'outro'

export interface SocialLink {
  network: SocialNetwork
  label: string
  url: string
  handle?: string
}

const NETWORK_LABEL: Record<SocialNetwork, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  youtube: 'YouTube', tiktok: 'TikTok', twitter: 'X / Twitter',
  linktree: 'Linktree', whatsapp: 'WhatsApp', maps: 'Google Maps', outro: 'Site',
}

/** Emoji simples por rede (sem dependência de ícone externo). */
export const NETWORK_ICON: Record<SocialNetwork, string> = {
  instagram: '📷', facebook: '👍', linkedin: '💼', youtube: '▶️',
  tiktok: '🎵', twitter: '🐦', linktree: '🌳', whatsapp: '💬',
  maps: '📍', outro: '🌐',
}

function ensureProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/** Identifica a rede social de uma URL e tenta extrair o @handle. */
export function detectSocial(rawUrl: string | null | undefined): SocialLink | null {
  if (!rawUrl) return null
  let host: string
  let path: string
  try {
    const u = new URL(ensureProtocol(rawUrl.trim()))
    host = u.hostname.replace(/^www\./, '').toLowerCase()
    path = u.pathname.replace(/^\/+|\/+$/g, '')
  } catch {
    return null
  }

  const firstSeg = path.split('/')[0]?.replace(/^@/, '')
  const url = ensureProtocol(rawUrl.trim())

  const match = (net: SocialNetwork, handle?: string): SocialLink => ({
    network: net, label: NETWORK_LABEL[net], url, handle: handle || undefined,
  })

  if (host.includes('instagram.com')) return match('instagram', firstSeg)
  if (host.includes('facebook.com') || host.includes('fb.com')) return match('facebook', firstSeg)
  if (host.includes('linkedin.com')) return match('linkedin', path.replace(/^(company|in)\//, '') || undefined)
  if (host.includes('youtube.com') || host.includes('youtu.be')) return match('youtube', firstSeg)
  if (host.includes('tiktok.com')) return match('tiktok', firstSeg)
  if (host.includes('twitter.com') || host === 'x.com') return match('twitter', firstSeg)
  if (host.includes('linktr.ee') || host.includes('linktree')) return match('linktree', firstSeg)
  if (host.includes('wa.me') || host.includes('api.whatsapp.com')) return match('whatsapp')
  if (host.includes('google.') && path.startsWith('maps')) return match('maps')
  return null
}

/**
 * Reúne as redes sociais conhecidas de um negócio:
 * (1) campos explícitos de enriquecimento (se a API enviar um dia)
 * (2) detectadas a partir do `website` (quando ele é uma rede social).
 */
export function socialLinks(b: BusinessRead): SocialLink[] {
  const out: SocialLink[] = []
  const push = (l: SocialLink | null) => {
    if (l && !out.some(x => x.network === l.network)) out.push(l)
  }

  if (b.instagram) push(detectSocial(b.instagram) ?? mkExplicit('instagram', b.instagram))
  if (b.facebook) push(detectSocial(b.facebook) ?? mkExplicit('facebook', b.facebook))
  if (b.linkedin) push(detectSocial(b.linkedin) ?? mkExplicit('linkedin', b.linkedin))

  // O website pode, ele próprio, ser um link de rede social.
  if (b.website) push(detectSocial(b.website))

  return out
}

function mkExplicit(net: SocialNetwork, url: string): SocialLink {
  return { network: net, label: NETWORK_LABEL[net], url: ensureProtocol(url) }
}

/** Verdadeiro quando o "site" do negócio é, na verdade, uma rede social. */
export function websiteIsSocial(b: BusinessRead): boolean {
  return b.website_kind === 'rede_social' || (!!b.website && detectSocial(b.website) !== null)
}

// ──────────────────────────────────────────────────────────────────────────
// Mensagem de prospecção (gancho conforme a situação do site)
// ──────────────────────────────────────────────────────────────────────────

export function buildProspectMessage(b: BusinessRead, cidade?: string): string {
  const nome = b.nome ?? 'vocês'
  const ondeVi = cidade ? `aqui em ${cidade}` : 'na internet'
  let gancho: string
  switch (b.site_status) {
    case 'SEM_SITE':
      gancho = 'reparei que ainda não encontrei um site próprio de vocês'
      break
    case 'SO_REDE_SOCIAL':
      gancho = 'vi que a presença de vocês hoje é só pelas redes sociais'
      break
    case 'COM_SITE':
      gancho = 'dei uma olhada no site de vocês e tive algumas ideias'
      break
    default:
      gancho = 'gostei do trabalho de vocês'
  }
  return (
    `Olá! Tudo bem? Encontrei a ${nome} ${ondeVi} e ${gancho}. ` +
    `Trabalho criando sites para negócios locais e posso te mostrar uma ideia ` +
    `sem compromisso. Posso te enviar?`
  )
}
