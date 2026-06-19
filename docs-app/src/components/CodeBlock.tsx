import { useRef, useState } from 'react'

/** Bloco de código com rótulo de linguagem e botão copiar (reusa estilos .md-pre). */
export default function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <div className="md-pre">
      {lang && <span className="code-lang">{lang}</span>}
      <button className="md-copy" onClick={copy}>
        {copied ? '✓ copiado' : 'copiar'}
      </button>
      <pre ref={ref}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
