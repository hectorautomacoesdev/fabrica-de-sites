import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Junta classes condicionais (clsx) e resolve conflitos do Tailwind (tailwind-merge).
 * Ex.: cn('px-2', cond && 'px-4') → 'px-4'. Usado por todos os componentes shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
