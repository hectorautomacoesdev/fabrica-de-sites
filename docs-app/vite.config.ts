import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// base relativa ("./") para funcionar tanto local quanto no subcaminho do GitHub Pages.
// O roteamento usa HashRouter, então não precisa de configuração de servidor.
export default defineConfig({
  plugins: [react()],
  base: './',
  // O conteúdo Markdown é importado de ../docs (fonte única, fora de docs-app/).
  // Liberar a raiz do repositório no dev server permite o import com ?raw.
  server: {
    fs: { allow: [path.resolve(__dirname, '..')] },
  },
  resolve: {
    alias: {
      // Substitui o import do lowlight por um stub que exporta common={}.
      // O rehype-highlight usa `settings.languages || common` — como sempre
      // passamos languages explicitamente em Markdown.tsx, o common vazio
      // nunca é usado em runtime, mas o bundler exclui as 37 linguagens padrão.
      lowlight: path.resolve(__dirname, 'src/lowlight-slim.ts'),
    },
  },
})
