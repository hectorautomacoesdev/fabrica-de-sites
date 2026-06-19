import type { ReactNode } from 'react'

type Kind = 'info' | 'tip' | 'warning' | 'note'

const ICON: Record<Kind, string> = { info: 'ℹ', tip: '✦', warning: '⚠', note: '✎' }

export default function Callout({
  kind = 'info',
  title,
  children,
}: {
  kind?: Kind
  title?: string
  children: ReactNode
}) {
  return (
    <div className={`callout callout-${kind}`}>
      <div className="callout-head">
        <span className="callout-icon">{ICON[kind]}</span>
        {title && <span className="callout-title">{title}</span>}
      </div>
      <div className="callout-body">{children}</div>
    </div>
  )
}
