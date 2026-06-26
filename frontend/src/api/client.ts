/** Tipos espelhando os schemas da API Python. */

export interface RunRead {
  id: number
  cidade: string
  admin_level: number
  fonte: string
  gerado_em: string
  total: number
}

export interface KpiRead {
  total: number
  sem_site: number
  so_social: number
  com_site: number
  sem_site_proprio: number
  contactavel: number
  leads_quentes: number
  pct_sem_site_proprio: number
  pct_contactavel: number
}

/** Um setor da taxonomia do Scout (GET /api/sectors). */
export interface Sector {
  key: string
  nome: string
  emoji: string
  prioritario: boolean
}

/** Agregação de uma run por setor — alimenta o overview de categorias. */
export interface SectorStat {
  key: string
  nome: string
  emoji: string
  cor: string
  prioritario: boolean
  total: number
  sem_site: number
  so_social: number
  com_site: number
  oportunidade: number       // sem_site + so_social (mercado imediato)
  oportunidade_pct: number
  score_medio: number
  leads_quentes: number
}

export interface InsightsRead {
  run_id: number
  kpis: KpiRead
  insights: string[]
  por_setor: SectorStat[]
  status_dist: Record<string, number>
}

export interface BusinessRead {
  id: number
  run_id: number
  nome: string | null
  org_tipo: string
  setor: string
  setor_nome: string
  lat: number | null
  lon: number | null
  endereco: string | null
  telefone: string | null
  email: string | null
  website: string | null
  website_kind: string
  horario?: string | null
  site_status: string
  score: number
  score_label: string
  contactavel: boolean
  score_motivos?: string[]
  // ── Campos de enriquecimento (ainda NÃO vêm da API; o painel se adapta
  //    quando estiverem presentes — ver fase Auditor/enriquecimento). ──
  instagram?: string | null
  facebook?: string | null
  linkedin?: string | null
  resumo?: string | null
}

export interface RunStartRequest {
  cidade: string
  admin_level?: number
  limit?: number | null
  com_serper?: boolean
  enriquecer?: boolean
}

export interface RunStartResponse {
  run_id: number
  run: RunRead
  insights: InsightsRead
}

export interface BusinessFilters {
  setor?: string
  site_status?: string
  contactavel?: boolean
  score_min?: number
  org_tipo?: string
  busca?: string
  order_by?: string
  order_dir?: 'asc' | 'desc'
  offset?: number
  limit?: number
}

/** Página de negócios + total (lido do header X-Total-Count) — para paginação server-side. */
export interface BusinessPage {
  items: BusinessRead[]
  total: number
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(detail?.detail ?? `API ${path}: ${res.status}`)
  }
  return res.json() as Promise<T>
}

function buildQuery(params: object): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) p.set(k, String(v as string | number | boolean))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  listRuns: (limit = 20) =>
    get<RunRead[]>(`/api/runs${buildQuery({ limit })}`),

  listSectors: () =>
    get<Sector[]>('/api/sectors'),

  getInsights: (runId: number) =>
    get<InsightsRead>(`/api/runs/${runId}/insights`),

  getBusinesses: (runId: number, filters: BusinessFilters = {}) =>
    get<BusinessRead[]>(`/api/runs/${runId}/businesses${buildQuery(filters)}`),

  // Versão paginada: além dos itens, devolve o total (header X-Total-Count).
  // Base para a tabela com paginação/ordenação server-side (Frente 2).
  getBusinessesPaged: async (
    runId: number,
    filters: BusinessFilters = {},
  ): Promise<BusinessPage> => {
    const path = `/api/runs/${runId}/businesses${buildQuery(filters)}`
    const res = await fetch(path)
    if (!res.ok) throw new Error(`API ${path}: ${res.status}`)
    const items = (await res.json()) as BusinessRead[]
    const total = Number(res.headers.get('X-Total-Count') ?? items.length)
    return { items, total }
  },

  startRun: (body: RunStartRequest) =>
    post<RunStartResponse>('/api/scout/runs', body),
}
