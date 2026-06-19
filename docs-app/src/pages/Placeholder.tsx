import { Link, useLocation } from 'react-router-dom'
import { titleForPath } from '../data/nav'

export default function Placeholder() {
  const { pathname } = useLocation()
  const title = titleForPath(pathname)

  return (
    <article className="page">
      <header className="page-head">
        <p className="page-kicker">Em construção</p>
        <h1>{title}</h1>
      </header>

      <div className="soon-box">
        <span className="soon-emoji">🚧</span>
        <p>
          Esta página ainda não foi escrita. Faz parte da <strong>Fase B</strong> da documentação —
          que começa assim que você aprovar o visual desta página-modelo.
        </p>
        <Link className="soon-link" to="/bibliotecas">
          Ver a página-modelo pronta (Bibliotecas) →
        </Link>
      </div>
    </article>
  )
}
