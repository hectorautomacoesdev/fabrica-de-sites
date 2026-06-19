// Stub do módulo 'lowlight' para o alias do Vite.
// Importa createLowlight pelo path físico (evita referência circular com o alias).
// Exporta common={} vazio — o rehype-highlight usa `settings.languages || common`,
// e nós sempre passamos languages explicitamente em Markdown.tsx,
// então o common nunca é usado em runtime. Isso remove as 37 linguagens padrão do bundle.
export { createLowlight } from '../node_modules/lowlight/lib/index.js'
export const common = {} as Record<string, never>
export const all = {} as Record<string, never>
