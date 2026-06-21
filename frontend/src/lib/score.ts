// Cor (classe text-* do Tailwind) por rótulo de score — compartilhada pela badge
// de score da tabela e pelo anel de score do drawer. Classes completas e estáticas
// para o Tailwind detectá-las.
export const SCORE_TEXT: Record<string, string> = {
  ALTÍSSIMA: 'text-[#dc2626]',
  ALTA: 'text-[#d97706]',
  MÉDIA: 'text-[#2563eb]',
  BAIXA: 'text-text-muted',
}

export function scoreTextClass(label: string): string {
  return SCORE_TEXT[label] ?? SCORE_TEXT.BAIXA
}
