# Frontend & React

O dashboard do Scout (e esta documentação) são feitos em **React + Vite + TypeScript**. Esta página explica a stack do frontend, como os componentes se organizam e como os dados fluem da API até a tela.

> Para o detalhe das bibliotecas em si (React, Vite, TanStack Query, axios), veja [Bibliotecas](bibliotecas.md).

## Por que essa stack

- **React** — a stack que o usuário já domina; componentes reutilizáveis e um ecossistema enorme.
- **Vite** — dev server com hot reload instantâneo e build otimizado. Escolhido em vez de Next.js porque é uma **SPA enxuta** consumindo a API Python; não precisamos de SSR/SEO num painel interno.
- **TypeScript** — tipa as respostas da API (DTOs), então o editor avisa na hora se um contrato muda.
- **TanStack Query** — cuida do *server-state* (cache, revalidação, loading/erro) sem boilerplate.

## Estrutura do `frontend/`

```text
frontend/src/
├── main.tsx                 # ponto de entrada; monta o QueryClientProvider
├── App.tsx                  # layout do dashboard (header + seções)
├── api/
│   └── client.ts            # instância axios (baseURL) + funções de chamada
├── hooks/
│   └── useScout.ts          # hooks de dados (useRuns, useInsights) via useQuery
└── components/
    ├── KpiCards.tsx         # cartões de indicadores
    ├── BusinessTable.tsx    # tabela filtrável de negócios
    ├── RunSelector.tsx      # seletor da execução ativa
    └── ScoutForm.tsx        # modal para disparar uma nova coleta
```

## Componentes: apresentação vs. container

Componentes pequenos e combináveis. Os de **apresentação** só recebem `props` e renderizam (`KpiCards`, `BusinessTable`); a lógica de dados/estado fica em **hooks** (`useScout`) ou no container (`App`). Isso facilita reuso e teste.

```tsx
// componente de apresentação: recebe dados, não busca nada
function KpiCards({ kpis }: { kpis: Kpis }) {
  return <div className="kpis">{/* ...renderiza os números... */}</div>
}
```

## Custom hooks — encapsular a lógica de dados

Em vez de espalhar `useEffect` + `fetch` pelos componentes, a busca vive em hooks:

```tsx
// hooks/useScout.ts
export function useInsights(runId: number | null) {
  return useQuery({
    queryKey: ['insights', runId],
    queryFn: () => api.getInsights(runId!),
    enabled: runId !== null,        // só busca quando há uma run selecionada
  })
}
```

## Server-state vs. client-state

A grande ideia do TanStack Query é separar dois tipos de estado:

- **Server-state** — dados que *vêm da API* (lista de negócios, KPIs). Têm cache, revalidação e estados de carregando/erro. Tratar isso na mão com `useState/useEffect` vira boilerplate e bugs. → **TanStack Query**.
- **Client-state** — estado *local da UI* (filtros selecionados, qual run está ativa, modal aberto). → **`useState`** comum.

```tsx
// App.tsx — client-state local (qual run o usuário escolheu)
const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
// server-state (os dados daquela run) vêm do hook:
const { data: insights, isLoading } = useInsights(activeRunId)
```

## Fluxo de dados unidirecional

Estado flui de cima para baixo (via `props`); eventos sobem por callbacks. Previsível e fácil de depurar — princípio central do React.

```text
            API (FastAPI :8001)
                  ▲  │ JSON
       axios      │  ▼
   useQuery (TanStack Query) ── cache
                  │ data
                  ▼
   App  ──props──▶ KpiCards / BusinessTable / RunSelector
    ▲                         │
    └────── callback ─────────┘  (ex.: "nova run criada", "filtro mudou")
```

## Comunicação com a API

O `client.ts` cria uma instância axios com `baseURL`. Em **desenvolvimento**, o Vite faz *proxy* de `/api/*` para `localhost:8001`, então não há dor de CORS. Em produção, um reverse proxy faria o mesmo papel.

```ts
// api/client.ts
const http = axios.create({ baseURL: '/api' })
export const api = {
  getRuns: () => http.get('/runs').then((r) => r.data),
  getInsights: (id: number) => http.get(`/runs/${id}/insights`).then((r) => r.data),
}
```

## Esta documentação

Esta doc é um segundo app React (`docs-app/`), com a mesma base (Vite + TS) e o mesmo idioma visual do produto. Acrescenta `react-router-dom` (navegação por rotas), `react-markdown` + `remark-gfm` (conteúdo em Markdown) e `rehype-highlight` (destaque de código). Páginas de prosa são Markdown; páginas visuais (Estrutura, Evolução, Bibliotecas) são componentes React. **O conteúdo Markdown é lido diretamente da pasta `docs/`** — a mesma fonte do site MkDocs, para não haver duplicação.
