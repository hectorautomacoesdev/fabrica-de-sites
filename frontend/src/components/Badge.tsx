import { cn } from '@/lib/utils'

// Cores de status são pastéis fixos (independentes do tema claro/escuro) — são
// semânticas do dado, não da UI. Classes completas e estáticas para o Tailwind
// conseguir detectá-las (nada de `bg-${x}` dinâmico).
const STATUS_COLORS: Record<string, string> = {
  SEM_SITE: 'bg-[#fef3c7] text-[#92400e]',
  SO_REDE_SOCIAL: 'bg-[#fce7f3] text-[#9d174d]',
  COM_SITE: 'bg-[#d1fae5] text-[#065f46]',
  DESCONHECIDO: 'bg-border-faint text-text-muted',
}

/** Pílula de status do site (Sem site / Só social / Tem site). O texto do rótulo
 *  é decidido por quem chama (a tabela usa formas curtas; o drawer, completas). */
export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-[0.72rem] font-semibold whitespace-nowrap',
        STATUS_COLORS[status] ?? STATUS_COLORS.DESCONHECIDO,
      )}
    >
      {label}
    </span>
  )
}
