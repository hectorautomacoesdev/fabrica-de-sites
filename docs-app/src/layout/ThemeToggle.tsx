import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

function getInitial(): Theme {
  const saved = localStorage.getItem('docs-theme') as Theme | null
  if (saved) return saved
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('docs-theme', theme)
  }, [theme])

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema claro/escuro"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
