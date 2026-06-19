import { NavLink } from 'react-router-dom'
import { NAV } from '../data/nav'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand" end>
        <span className="brand-mark">◆</span>
        <span className="brand-text">
          Fábrica de Sites
          <small>Documentação</small>
        </span>
      </NavLink>

      <nav className="nav">
        {NAV.map((group) => (
          <div className="nav-group" key={group.group}>
            <p className="nav-group-title">{group.group}</p>
            {group.items.map((it) => (
              <NavLink
                key={it.slug}
                to={`/${it.slug}`}
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span>{it.title}</span>
                {it.status === 'soon' && <span className="badge-soon">em breve</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">v0.1 · Fase 1.5</div>
    </aside>
  )
}
