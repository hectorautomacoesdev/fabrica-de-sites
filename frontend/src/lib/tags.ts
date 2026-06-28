/** Definição das tags manuais de lead — compartilhado entre tabelas e drawer. */

export interface TagDef {
  id: string
  label: string
  emoji: string
  /** Classes Tailwind para o chip ativo */
  cls: string
}

export const TAGS: TagDef[] = [
  { id: 'fechado',             emoji: '🔒', label: 'Fechado',           cls: 'border-[#6b7280] bg-[#6b728020] text-[#374151]' },
  { id: 'recusou',             emoji: '🚫', label: 'Recusou',           cls: 'border-[#ef4444] bg-[#ef444420] text-[#b91c1c]' },
  { id: 'boa_oportunidade',    emoji: '⭐', label: 'Boa oportunidade',  cls: 'border-[#22c55e] bg-[#22c55e20] text-[#15803d]' },
  { id: 'pouco_potencial',     emoji: '📉', label: 'Pouco potencial',   cls: 'border-[#f59e0b] bg-[#f59e0b20] text-[#b45309]' },
  { id: 'entrar_em_contato',   emoji: '📞', label: 'Entrar em contato', cls: 'border-[#3b82f6] bg-[#3b82f620] text-[#1d4ed8]' },
  { id: 'aguardando_resposta', emoji: '⏳', label: 'Aguardando',        cls: 'border-[#f97316] bg-[#f9731620] text-[#c2410c]' },
  { id: 'em_negociacao',       emoji: '🤝', label: 'Em negociação',     cls: 'border-[#8b5cf6] bg-[#8b5cf620] text-[#6d28d9]' },
  { id: 'franquia',            emoji: '🏬', label: 'Franquia',          cls: 'border-[#eab308] bg-[#eab30820] text-[#a16207]' },
  { id: 'servico_publico',     emoji: '🏛️', label: 'Serviço público',   cls: 'border-[#64748b] bg-[#64748b20] text-[#334155]' },
]

export const TAG_BY_ID = Object.fromEntries(TAGS.map(t => [t.id, t]))

/** Mostra os chips de tag de uma linha de tabela (máximo 3, só emoji). */
export function tagChipsCell(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return ''
  return tags
    .slice(0, 3)
    .map(id => TAG_BY_ID[id]?.emoji ?? '🏷️')
    .join(' ')
}
