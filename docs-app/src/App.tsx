import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './layout/Layout'
import Home from './pages/Home'
import Bibliotecas from './pages/Bibliotecas'
import Estrutura from './pages/Estrutura'
import Evolucao from './pages/Evolucao'
import MarkdownPage from './pages/MarkdownPage'
import Placeholder from './pages/Placeholder'
import { MD_CONTENT } from './content'

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bibliotecas" element={<Bibliotecas />} />
          <Route path="/estrutura" element={<Estrutura />} />
          <Route path="/evolucao" element={<Evolucao />} />
          {Object.entries(MD_CONTENT).map(([slug, src]) => (
            <Route key={slug} path={`/${slug}`} element={<MarkdownPage source={src} />} />
          ))}
          {/* Slugs ainda sem conteúdo (ex.: custos) caem no placeholder. */}
          <Route path="*" element={<Placeholder />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
