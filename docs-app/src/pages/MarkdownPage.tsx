import Markdown from '../components/Markdown'

/** Página genérica: renderiza uma string Markdown (o conteúdo traz o próprio # título). */
export default function MarkdownPage({ source }: { source: string }) {
  return (
    <article className="page">
      <Markdown>{source}</Markdown>
    </article>
  )
}
