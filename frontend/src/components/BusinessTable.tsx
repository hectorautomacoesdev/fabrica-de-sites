import { type ChangeEvent, useState } from 'react'
import type { BusinessRead, BusinessFilters, SubsetorStat } from '../api/client'
import { useBusinessesPaged, useSectors } from '../hooks/useScout'
import {
  buildProspectMessage,
  detectSocial,
  NETWORK_ICON,
  websiteIsSocial,
  whatsappUrl,
} from '../lib/leadUtils'
import { TAGS, TAG_BY_ID } from '../lib/tags'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from './Badge'
import { scoreTextClass } from '../lib/score'
import LeadDrawer from './LeadDrawer'

const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site',
  SO_REDE_SOCIAL: 'Só social',
  COM_SITE: 'Tem site',
  DESCONHECIDO: 'Desconh.',
}

// Opções de ordenação amigáveis → (order_by, order_dir)
const ORDENACOES: Record<string, { order_by: string; order_dir: 'asc' | 'desc'; label: string }> = {
  'score_desc': { order_by: 'score', order_dir: 'desc', label: 'Maior score' },
  'score_asc': { order_by: 'score', order_dir: 'asc', label: 'Menor score' },
  'nome_asc': { order_by: 'nome', order_dir: 'asc', label: 'Nome (A→Z)' },
}

// Radix Select não aceita value="" — usamos este sentinela para "sem filtro".
const ALL = '__all__'

interface Props {
  runId: number
  cidade?: string
  /** Setor pré-selecionado (drill vindo do overview de Setores). */
  sectorFilter?: string
  /** Subsetores por setor_key — habilita o filtro dinâmico de subsetor. */
  porSubsetor?: Record<string, SubsetorStat[]>
  /** Tamanho de página inicial (padrão 25). */
  defaultPageSize?: number
}

export default function BusinessTable({ runId, cidade, sectorFilter, porSubsetor, defaultPageSize = 25 }: Props) {
  const [filters, setFilters] = useState<BusinessFilters>({ order_by: 'score', order_dir: 'desc', setor: sectorFilter })
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('score_desc')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const { data: sectors = [] } = useSectors()

  // Sincroniza o setor vindo do overview (drill) sem useEffect — "ajustar estado
  // durante o render": quando o prop muda, reflete no filtro interno.
  const [prevSector, setPrevSector] = useState(sectorFilter)
  if (sectorFilter !== prevSector) {
    setPrevSector(sectorFilter)
    setFilters(f => ({ ...f, setor: sectorFilter, subsetor: undefined }))
  }

  // Limpa subsetor ao trocar de setor internamente
  const [prevFilterSetor, setPrevFilterSetor] = useState(filters.setor)
  if (filters.setor !== prevFilterSetor) {
    setPrevFilterSetor(filters.setor)
    if (filters.subsetor) setFilters(f => ({ ...f, subsetor: undefined }))
  }

  const subsetorOptions: SubsetorStat[] =
    filters.setor && porSubsetor ? (porSubsetor[filters.setor] ?? []) : []

  const activeFilters: BusinessFilters = {
    ...filters,
    busca: busca.length >= 2 ? busca : undefined,
  }

  // Volta para a 1ª página sempre que os critérios (não a paginação) mudam.
  const critKey = JSON.stringify(activeFilters)
  const [prevCrit, setPrevCrit] = useState(critKey)
  if (critKey !== prevCrit) {
    setPrevCrit(critKey)
    setPage(0)
  }

  const { data, isFetching } = useBusinessesPaged(runId, {
    ...activeFilters,
    offset: page * pageSize,
    limit: pageSize,
  })
  const businesses = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const selected = selectedId != null ? businesses.find(b => b.id === selectedId) ?? null : null

  function set<K extends keyof BusinessFilters>(key: K, val: BusinessFilters[K]) {
    setFilters(f => ({ ...f, [key]: val || undefined }))
  }

  function handleBusca(e: ChangeEvent<HTMLInputElement>) {
    setBusca(e.target.value)
  }

  function handleOrdem(value: string) {
    const o = ORDENACOES[value]
    setOrdem(value)
    setFilters(f => ({ ...f, order_by: o.order_by, order_dir: o.order_dir }))
  }

  return (
    <div className="mt-2">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="min-w-[180px] rounded-md border border-border bg-card px-2.5 py-1.5 text-[0.86rem] text-text-strong"
          placeholder="Buscar por nome…"
          value={busca}
          onChange={handleBusca}
        />

        <FilterSelect
          placeholder="Todos os setores"
          value={filters.setor ?? ALL}
          onValueChange={v => set('setor', v === ALL ? undefined : v)}
          options={[
            { value: ALL, label: 'Todos os setores' },
            ...sectors.map(s => ({ value: s.key, label: `${s.emoji} ${s.nome}` })),
          ]}
        />

        {subsetorOptions.length > 0 && (
          <FilterSelect
            placeholder="Todos os subsetores"
            value={filters.subsetor ?? ALL}
            onValueChange={v => set('subsetor', v === ALL ? undefined : v)}
            options={[
              { value: ALL, label: 'Todos os subsetores' },
              ...subsetorOptions.map(s => ({ value: s.subsetor, label: s.subsetor })),
            ]}
          />
        )}

        <FilterSelect
          placeholder="Todos os status"
          value={filters.site_status ?? ALL}
          onValueChange={v => set('site_status', v === ALL ? undefined : v)}
          options={[
            { value: ALL, label: 'Todos os status' },
            { value: 'SEM_SITE', label: 'Sem site' },
            { value: 'SO_REDE_SOCIAL', label: 'Só rede social' },
            { value: 'COM_SITE', label: 'Tem site' },
          ]}
        />

        <FilterSelect
          placeholder="Com e sem contato"
          value={filters.contactavel === undefined ? ALL : String(filters.contactavel)}
          onValueChange={v => set('contactavel', v === ALL ? undefined : v === 'true')}
          options={[
            { value: ALL, label: 'Com e sem contato' },
            { value: 'true', label: 'Com contato' },
            { value: 'false', label: 'Sem contato' },
          ]}
        />

        <FilterSelect
          placeholder="Todo tipo de org."
          value={filters.org_tipo ?? ALL}
          onValueChange={v => set('org_tipo', v === ALL ? undefined : v)}
          options={[
            { value: ALL, label: 'Todo tipo de org.' },
            { value: 'independente', label: 'Independente' },
            { value: 'rede', label: 'Rede / franquia' },
            { value: 'publico', label: 'Órgão público' },
          ]}
        />

        <FilterSelect
          placeholder="Score mín."
          value={filters.score_min ? String(filters.score_min) : ALL}
          onValueChange={v => set('score_min', v === ALL ? undefined : Number(v))}
          options={[
            { value: ALL, label: 'Score mín.' },
            { value: '65', label: '≥ 65 (Alta)' },
            { value: '80', label: '≥ 80 (Altíssima)' },
          ]}
        />

        <FilterSelect
          placeholder="Todas as tags"
          value={filters.tag ?? ALL}
          onValueChange={v => set('tag', v === ALL ? undefined : v)}
          options={[
            { value: ALL, label: 'Todas as tags' },
            ...TAGS.map(t => ({ value: t.id, label: `${t.emoji} ${t.label}` })),
          ]}
        />

        <FilterSelect
          placeholder="Ordenar"
          value={ordem}
          onValueChange={handleOrdem}
          options={Object.entries(ORDENACOES).map(([k, o]) => ({ value: k, label: o.label }))}
        />

        <span className="ml-auto text-[0.85rem] whitespace-nowrap text-text-muted">
          {isFetching ? 'Filtrando…' : `${total} negócios`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-[0.86rem] [&_tr:last-child>td]:border-b-0">
          <thead>
            <tr>
              {['Nome', 'Setor', 'Status', 'Score', 'Telefone', 'Web', 'Tags', ''].map((h, i) => (
                <th
                  key={i}
                  aria-label={h || 'Ação'}
                  className="border-b border-border bg-card px-3 py-2 text-left text-[0.78rem] font-semibold uppercase tracking-[0.05em] whitespace-nowrap text-text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {businesses.map(b => (
              <Row key={b.id} b={b} cidade={cidade} onOpen={() => setSelectedId(b.id)} />
            ))}
            {businesses.length === 0 && !isFetching && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-text-muted">
                  Nenhum negócio encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação (server-side) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.83rem] text-text-muted">
        <label className="flex items-center gap-2">
          Por página
          <select
            className="cursor-pointer rounded-md border border-border bg-card px-2 py-1 text-text-strong"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
          >
            {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <span className="tabular-nums">
            {total === 0 ? '0' : `${page * pageSize + 1}–${Math.min(total, (page + 1) * pageSize)}`} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="cursor-pointer rounded-md border border-border bg-card px-2.5 py-1 text-text-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >‹ Anterior</button>
            <span className="px-1 whitespace-nowrap tabular-nums">Pág. {page + 1} de {totalPages}</span>
            <button
              type="button"
              className="cursor-pointer rounded-md border border-border bg-card px-2.5 py-1 text-text-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >Próxima ›</button>
          </div>
        </div>
      </div>

      <LeadDrawer business={selected} cidade={cidade} runId={runId} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        className="h-auto rounded-md border-border bg-card py-1.5 text-[0.86rem] text-text-strong dark:bg-card dark:hover:bg-hover"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const tdBase = 'border-b border-border-faint px-3 py-[7px] align-middle text-text'

function Row({ b, cidade, onOpen }: { b: BusinessRead; cidade?: string; onOpen: () => void }) {
  const wa = whatsappUrl(b.telefone, buildProspectMessage(b, cidade))
  const social = b.website && websiteIsSocial(b) ? detectSocial(b.website) : null
  const temSitePróprio = !!b.website && !social

  return (
    <tr
      className="cursor-pointer hover:bg-hover focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:-2px]"
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen() }}
    >
      <td className={cn(tdBase, 'max-w-[200px] font-medium text-text-strong')}>
        {b.nome ?? <em className="italic text-text-muted">sem nome</em>}
      </td>
      <td className={tdBase}>{b.setor_nome}</td>
      <td className={tdBase}>
        <StatusBadge status={b.site_status} label={STATUS_LABELS[b.site_status] ?? b.site_status} />
      </td>
      <td className={tdBase}>
        <span className={cn('inline-flex items-baseline gap-1 text-[0.85rem] font-bold', scoreTextClass(b.score_label))}>
          {b.score} <small className="text-[0.76rem] font-normal text-text-muted">{b.score_label}</small>
        </span>
      </td>
      <td className={tdBase}>{b.telefone ?? <span className="text-text-muted">—</span>}</td>
      <td className={tdBase}>
        {social ? (
          <a href={social.url} target="_blank" rel="noreferrer" className="text-base text-brand hover:underline"
             title={social.label} onClick={e => e.stopPropagation()}>
            {NETWORK_ICON[social.network]}
          </a>
        ) : temSitePróprio ? (
          <a href={b.website!} target="_blank" rel="noreferrer" className="text-base text-brand hover:underline"
             title="Abrir site" onClick={e => e.stopPropagation()}>↗</a>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className={cn(tdBase, 'max-w-[140px]')}>
        <div className="flex flex-wrap gap-1">
          {(b.tags ?? []).length > 0
            ? (b.tags ?? []).slice(0, 3).map(id => {
                const t = TAG_BY_ID[id]
                if (!t) return null
                return (
                  <span
                    key={id}
                    className={cn('inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[0.68rem] leading-none', t.cls)}
                    title={t.label}
                  >
                    {t.emoji}
                  </span>
                )
              })
            : <span className="text-text-muted">—</span>
          }
        </div>
      </td>
      <td className={cn(tdBase, 'w-[44px] text-center')}>
        {wa ? (
          <a className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[rgba(37,211,102,0.14)] text-[0.9rem] hover:bg-[rgba(37,211,102,0.3)]"
             href={wa} target="_blank" rel="noreferrer"
             title="Chamar no WhatsApp" onClick={e => e.stopPropagation()}>💬</a>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
    </tr>
  )
}
