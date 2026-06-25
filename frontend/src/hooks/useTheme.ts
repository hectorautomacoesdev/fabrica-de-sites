import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'mid' | 'light'

const KEY = 'scout-theme'
const VALID = new Set<Theme>(['dark', 'mid', 'light'])

function readStored(): Theme {
  try {
    const s = localStorage.getItem(KEY) as Theme | null
    if (s && VALID.has(s)) return s
  } catch { /* noop */ }
  return 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStored)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(KEY, theme) } catch { /* noop */ }
  }, [theme])

  return { theme, setTheme: setThemeState }
}
