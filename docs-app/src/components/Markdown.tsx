import { useRef, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'

const _hlOptions = {
  languages: { python, bash, typescript, javascript },
  aliases: { ts: 'typescript', tsx: 'typescript', sh: 'bash', py: 'python', js: 'javascript' },
  plainText: ['text', 'plain'],
}

// <pre> com botão de copiar — lê o texto renderado via innerText (robusto).
function Pre({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const text = ref.current?.innerText ?? ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <div className="md-pre">
      <button className="md-copy" onClick={copy}>
        {copied ? '✓ copiado' : 'copiar'}
      </button>
      <pre ref={ref}>{children}</pre>
    </div>
  )
}

const MKDOCS_SITE = 'https://hectorautomacoesdev.github.io/fabrica-de-sites/'

// Rotas que ESTE app React realmente renderiza (sidebar em data/nav.ts).
const REACT_ROUTES = new Set([
  '', 'fonte-unica', 'estrutura', 'arquitetura', 'bibliotecas', 'react', 'evolucao',
  'resumo', 'boas-praticas', 'custos', 'codigo', 'testes', 'decisoes',
  'roadmap', 'relatorios', 'plano-base-solida', 'publicacao-ci-cd', 'escala-nuvem',
])

// Sub-arquivos que no React são concatenados na página-pai. Links relativos do tipo
// "convencoes.md" (de dentro de codigo/) perdem o contexto da pasta, então mapeamos pelo nome.
const SUBPAGE_TO_PARENT: Record<string, string> = {
  'design-patterns': 'arquitetura',
  'banco-de-dados': 'arquitetura',
  convencoes: 'codigo',
}

// O conteúdo vem de `docs/` com links no estilo MkDocs (ex.: "decisoes.md",
// "arquitetura/design-patterns.md", "../roadmap.md"). Aqui convertemos para a rota do
// HashRouter (#/slug). Páginas que só existem no site MkDocs (escala-nuvem, plano-base-solida,
// publicacao-ci-cd, referencia-api…) abrem o site publicado em vez de quebrar.
function resolveMdLink(href: string): string {
  const pathPart = href.split('#')[0]
  const clean = pathPart.replace(/\.md$/, '').replace(/^(\.\.\/)+/, '').replace(/^\.\//, '')
  const parts = clean.split('/')
  let slug: string
  if (parts[0] === 'arquitetura') slug = 'arquitetura'
  else if (parts[0] === 'codigo') slug = 'codigo'
  else if (parts[0] === 'relatorios') slug = 'relatorios'
  else {
    slug = parts[parts.length - 1]
    if (slug === 'index') slug = '' // docs/index.md → Início
    if (slug === 'frontend') slug = 'react' // docs/frontend.md ↔ rota /react
    if (SUBPAGE_TO_PARENT[slug]) slug = SUBPAGE_TO_PARENT[slug] // ex.: convencoes → codigo
  }
  if (REACT_ROUTES.has(slug)) return `#/${slug}`
  return `${MKDOCS_SITE}${clean}/`
}

const components: Components = {
  pre: Pre,
  a({ href, children }) {
    const isHttp = !!href && /^https?:/.test(href)
    const isInternalMd = !!href && !isHttp && /\.md(#.*)?$/.test(href)
    const target = isInternalMd ? resolveMdLink(href!) : href
    const external = isHttp || (!!target && /^https?:/.test(target))
    return (
      <a href={target} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
        {children}
      </a>
    )
  },
}

/** Renderiza uma string Markdown (GFM + syntax highlight) no estilo da doc. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, _hlOptions]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
