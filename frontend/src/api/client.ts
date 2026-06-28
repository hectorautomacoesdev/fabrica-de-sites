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
  contactavel: number        // negócios com telefone/e-mail no setor
  oportunidade: number       // sem_site + so_social (mercado imediato)
  oportunidade_pct: number
  score_medio: number
  leads_quentes: number
}

/** Contagens de um subsetor dentro de um setor (granularidade extra). */
export interface SubsetorStat {
  subsetor: string
  total: number
  sem_site: number
  so_social: number
  com_site: number
  contactavel: number
  leads_quentes: number
}

export interface InsightsRead {
  run_id: number
  kpis: KpiRead
  insights: string[]
  por_setor: SectorStat[]
  status_dist: Record<string, number>
  /** Subsetores agrupados por setor_key (ex.: "alimentacao" → [...]) */
  por_subsetor: Record<string, SubsetorStat[]>
}

export interface NoteItem {
  id: string
  texto: string
  criado_em: string
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
  telefone2?: string | null
  email: string | null
  email2?: string | null
  website: string | null
  website_kind: string
  horario?: string | null
  site_status: string
  score: number
  score_label: string
  contactavel: boolean
  score_motivos?: string[]
  resumo?: string | null
  instagram?: string | null
  facebook?: string | null
  linkedin?: string | null
  resumo_manual?: string | null
  notas?: NoteItem[]
  tags?: string[]
}

export interface BusinessPatch {
  website_kind?: string | null
  org_tipo?: string | null
  telefone?: string | null
  telefone2?: string | null
  email?: string | null
  email2?: string | null
  endereco?: string | null
  horario?: string | null
  website?: string | null
  instagram?: string | null
  facebook?: string | null
  linkedin?: string | null
  resumo_manual?: string | null
  notas?: NoteItem[] | null
  tags?: string[] | null
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
  subsetor?: string
  site_status?: string
  contactavel?: boolean
  score_min?: number
  org_tipo?: string
  busca?: string
  tag?: string
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

async function post<T>(path: string, body: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(path, {
    method,
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

  patchBusiness: (runId: number, businessId: number, patch: BusinessPatch) =>
    post<BusinessRead>(`/api/runs/${runId}/businesses/${businessId}`, patch, 'PATCH'),

  startRun: (body: RunStartRequest) =>
    post<RunStartResponse>('/api/scout/runs', body),
}
