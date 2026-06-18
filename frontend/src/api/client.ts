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

export interface InsightsRead {
  run_id: number
  kpis: KpiRead
  insights: string[]
}

export interface BusinessRead {
  id: number
  run_id: number
  nome: string | null
  setor: string
  setor_nome: string
  lat: number | null
  lon: number | null
  endereco: string | null
  telefone: string | null
  email: string | null
  website: string | null
  website_kind: string
  site_status: string
  score: number
  score_label: string
  contactavel: boolean
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
  busca?: string
  offset?: number
  limit?: number
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

  getInsights: (runId: number) =>
    get<InsightsRead>(`/api/runs/${runId}/insights`),

  getBusinesses: (runId: number, filters: BusinessFilters = {}) =>
    get<BusinessRead[]>(`/api/runs/${runId}/businesses${buildQuery(filters)}`),

  startRun: (body: RunStartRequest) =>
    post<RunStartResponse>('/api/scout/runs', body),
}
