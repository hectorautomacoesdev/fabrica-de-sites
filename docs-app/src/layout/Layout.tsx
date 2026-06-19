import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import { titleForPath } from '../data/nav'

export default function Layout({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  // A cada navegação: fecha o menu mobile, sobe ao topo, atualiza o <title>.
  useEffect(() => {
    setNavOpen(false)
    window.scrollTo(0, 0)
    document.title = `${titleForPath(location.pathname)} · Fábrica de Sites`
  }, [location.pathname])

  return (
    <div className={`shell ${navOpen ? 'nav-open' : ''}`}>
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <button className="nav-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Abrir menu">
            ☰
          </button>
          <span className="topbar-crumb">{titleForPath(location.pathname)}</span>
          <div className="topbar-right">
            <a
              className="topbar-link"
              href="https://github.com/hectorautomacoesdev/fabrica-de-sites"
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
            <ThemeToggle />
          </div>
        </header>
        <main className="content">{children}</main>
        <div className="scrim" onClick={() => setNavOpen(false)} />
      </div>
    </div>
  )
}
