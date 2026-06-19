// Fonte única da verdade da navegação: alimenta a sidebar E o título das páginas.
export type NavStatus = 'ready' | 'soon'

export interface NavItem {
  slug: string // rota relativa (sem barra). '' = Início.
  title: string
  status: NavStatus
}

export interface NavGroup {
  group: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    group: 'Começo',
    items: [{ slug: '', title: 'Início', status: 'ready' }],
  },
  {
    group: 'Entender o projeto',
    items: [
      { slug: 'fonte-unica', title: 'Documentação de fonte única', status: 'ready' },
      { slug: 'estrutura', title: 'Estrutura do projeto', status: 'ready' },
      { slug: 'arquitetura', title: 'Arquitetura', status: 'ready' },
      { slug: 'bibliotecas', title: 'Bibliotecas', status: 'ready' },
      { slug: 'react', title: 'Frontend & React', status: 'ready' },
    ],
  },
  {
    group: 'Evolução & meta',
    items: [
      { slug: 'evolucao', title: 'Evolução do projeto', status: 'ready' },
      { slug: 'resumo', title: 'Resumo & ponderações', status: 'ready' },
      { slug: 'boas-praticas', title: 'Boas práticas do Claude', status: 'ready' },
      { slug: 'custos', title: 'Custos', status: 'soon' },
    ],
  },
  {
    group: 'Referência',
    items: [
      { slug: 'codigo', title: 'Código', status: 'ready' },
      { slug: 'testes', title: 'Testes', status: 'ready' },
      { slug: 'decisoes', title: 'Decisões (ADRs)', status: 'ready' },
      { slug: 'roadmap', title: 'Roadmap', status: 'ready' },
      { slug: 'relatorios', title: 'Relatórios de sessão', status: 'ready' },
    ],
  },
]

// Busca o título de uma rota (para o placeholder e o <title>).
export function titleForPath(pathname: string): string {
  const slug = pathname.replace(/^\/+/, '')
  for (const g of NAV) {
    for (const it of g.items) {
      if (it.slug === slug) return it.title
    }
  }
  return 'Página'
}
