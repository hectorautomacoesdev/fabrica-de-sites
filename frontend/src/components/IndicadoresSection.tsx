import { useEffect, useState } from 'react'
import type { BusinessRead, BusinessFilters, KpiRead, SectorStat, SubsetorStat } from '../api/client'
import { useBusinessesPaged } from '../hooks/useScout'
import { cn } from '@/lib/utils'
import { StatusBadge } from './Badge'
import { scoreTextClass } from '../lib/score'
import {
  buildProspectMessage,
  detectSocial,
  NETWORK_ICON,
  websiteIsSocial,
  whatsappUrl,
} from '../lib/leadUtils'
import { TAGS, tagChipsCell } from '../lib/tags'
import KpiCards from './KpiCards'
import LeadDrawer from './LeadDrawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = '__all__'
const PAGE_SIZE = 5

function sectorToKpi(s: SectorStat): KpiRead {
  return {
    total: s.total,
    sem_site: s.sem_site,
    so_social: s.so_social,
    com_site: s.com_site,
    sem_site_proprio: s.oportunidade,
    contactavel: s.contactavel,
    leads_quentes: s.leads_quentes,
    pct_sem_site_proprio: s.total > 0 ? +(s.oportunidade / s.total * 100).toFixed(1) : 0,
    pct_contactavel: s.total > 0 ? +(s.contactavel / s.total * 100).toFixed(1) : 0,
  }
}

interface Props {
  kpis: KpiRead
  porSetor: SectorStat[]
  porSubsetor: Record<string, SubsetorStat[]>
  runId: number
  cidade?: string
}

// ─── IndicadoresSection ──────────────────────────────────────────────────────

export default function IndicadoresSection({ kpis, porSetor, porSubsetor, runId, cidade }: Props) {
  const [selectedSector, setSelectedSector] = useState(ALL)

  const activeSector = selectedSector === ALL
    ? null
    : (porSetor.find(s => s.key === selectedSector) ?? null)
  const displayKpis = activeSector ? sectorToKpi(activeSector) : kpis

  function toggleSector(key: string) {
    setSelectedSector(prev => (prev === key ? ALL : key))
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">

      {/* ── Cabeçalho + chips ── */}
      <div className="border-b border-border px-4 py-3">
        <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted">
          Indicadores
          {activeSector && (
            <span className="ml-2 font-normal normal-case tracking-normal">
              — {activeSector.emoji} {activeSector.nome}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <SectorChip active={selectedSector === ALL} onClick={() => setSelectedSector(ALL)}>
            Todos
          </SectorChip>
          {porSetor.map(s => (
            <SectorChip key={s.key} active={selectedSector === s.key} onClick={() => toggleSector(s.key)}>
              <span aria-hidden>{s.emoji}</span>{' '}{s.nome}
              <span className="ml-1 tabular-nums text-[0.76rem] opacity-70">
                ({s.leads_quentes})
              </span>
            </SectorChip>
          ))}
        </div>
      </div>

      {/* ── KPI cards (esquerda) + tabela compacta (direita) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">

        {/* Coluna esquerda: KPI cards */}
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <KpiCards kpis={displayKpis} />
        </div>

        {/* Coluna direita: tabela compacta embutida (sem borda própria) */}
        <CompactLeadsTable
          runId={runId}
          cidade={cidade}
          sectorKey={selectedSector === ALL ? undefined : selectedSector}
          sectorLabel={activeSector ? `${activeSector.emoji} ${activeSector.nome}` : undefined}
          subsetorOptions={selectedSector !== ALL ? (porSubsetor[selectedSector] ?? []) : []}
        />

      </div>
    </div>
  )
}

// ─── Chip de setor ───────────────────────────────────────────────────────────

function SectorChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-[0.83rem] font-medium transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-border bg-card text-text hover:border-brand hover:text-brand',
      )}
    >
      {children}
    </button>
  )
}

// ─── Tabela compacta embutida ─────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site',
  SO_REDE_SOCIAL: 'Só social',
  COM_SITE: 'Tem site',
  DESCONHECIDO: 'Desconh.',
}

interface CompactTableProps {
  runId: number
  cidade?: string
  sectorKey?: string
  sectorLabel?: string
  subsetorOptions?: SubsetorStat[]
}

function CompactLeadsTable({ runId, cidade, sectorKey, sectorLabel, subsetorOptions = [] }: CompactTableProps) {
  const [expanded, setExpanded] = useState(true)
  const [page, setPage] = useState(0)

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [contactFilter, setContactFilter] = useState<boolean | undefined>(undefined)
  const [scoreMin, setScoreMin] = useState<number | undefined>(undefined)
  const [subsetorFilter, setSubsetorFilter] = useState<string | undefined>(undefined)
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined)

  const [inputValue, setInputValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestQuery, setSuggestQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    if (inputValue.length < 2) {
      setSuggestQuery('')
      setShowSuggestions(false)
      return
    }
    const t = setTimeout(() => {
      setSuggestQuery(inputValue)
      setShowSuggestions(true)
    }, 300)
    return () => clearTimeout(t)
  }, [inputValue])

  const [prevSector, setPrevSector] = useState(sectorKey)
  if (sectorKey !== prevSector) {
    setPrevSector(sectorKey)
    setPage(0)
    setSubsetorFilter(undefined)   // limpa o subsetor ao trocar de setor
  }

  const tableFilters: BusinessFilters = {
    setor: sectorKey,
    subsetor: subsetorFilter,
    site_status: statusFilter,
    contactavel: contactFilter,
    score_min: scoreMin,
    tag: tagFilter,
    busca: searchTerm.length >= 2 ? searchTerm : undefined,
    order_by: 'score',
    order_dir: 'desc',
  }

  const critKey = JSON.stringify(tableFilters)
  const [prevCrit, setPrevCrit] = useState(critKey)
  if (critKey !== prevCrit) {
    setPrevCrit(critKey)
    setPage(0)
  }

  const { data, isFetching } = useBusinessesPaged(runId, {
    ...tableFilters,
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  })

  const { data: suggestData } = useBusinessesPaged(
    suggestQuery.length >= 2 ? runId : null,
    { busca: suggestQuery, setor: sectorKey, limit: 12, order_by: 'nome', order_dir: 'asc' },
  )
  const rawSuggestions = suggestData?.items ?? []
  const suggestions = [...rawSuggestions].sort((a, b) => {
    const q = inputValue.toLowerCase()
    const aStarts = (a.nome ?? '').toLowerCase().startsWith(q)
    const bStarts = (b.nome ?? '').toLowerCase().startsWith(q)
    if (aStarts && !bStarts) return -1
    if (!aStarts && bStarts) return 1
    return 0
  })

  const businesses = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selected = selectedId != null ? businesses.find(b => b.id === selectedId) ?? null : null

  function applySearch(nome: string) {
    setInputValue(nome)
    setSearchTerm(nome)
    setShowSuggestions(false)
  }

  function clearSearch() {
    setInputValue('')
    setSearchTerm('')
    setSuggestQuery('')
    setShowSuggestions(false)
  }

  return (
    <div className="flex flex-col">

      {/* Cabeçalho da tabela */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted">
          Preview de leads
          {sectorLabel && (
            <span className="ml-1.5 font-normal normal-case tracking-normal">{sectorLabel}</span>
          )}
          {!isFetching && total > 0 && (
            <span className="ml-2 font-normal normal-case tracking-normal">
              — {total} encontrados
            </span>
          )}
          {isFetching && (
            <span className="ml-2 font-normal normal-case tracking-normal opacity-50"> a filtrar…</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="cursor-pointer text-[0.8rem] text-text-muted hover:text-text"
        >
          {expanded ? 'Ocultar ↑' : 'Ver leads ↓'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <div className="relative">
              <input
                className="min-w-[180px] rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[0.84rem] text-text-strong outline-none focus:border-brand"
                placeholder="Buscar por nome…"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onFocus={() => {
                  if (suggestQuery.length >= 2 && suggestions.length > 0) setShowSuggestions(true)
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter') applySearch(inputValue)
                  if (e.key === 'Escape') clearSearch()
                }}
              />
              {inputValue.length > 0 && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  onMouseDown={e => { e.preventDefault(); clearSearch() }}
                >
                  ×
                </button>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 top-full z-50 mt-1 max-h-[200px] w-full min-w-[240px] overflow-auto rounded-md border border-border bg-card shadow-lg">
                  {suggestions.map(s => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-[0.84rem] text-text-strong hover:bg-hover"
                        onMouseDown={e => { e.preventDefault(); applySearch(s.nome ?? '') }}
                      >
                        {s.nome}
                        <span className="ml-2 text-[0.75rem] text-text-muted">{s.setor_nome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {subsetorOptions.length > 0 && (
              <CompactSelect
                value={subsetorFilter ?? ALL}
                onValueChange={v => { setSubsetorFilter(v === ALL ? undefined : v); setPage(0) }}
                placeholder="Todos os subsetores"
                options={[
                  { value: ALL, label: 'Todos os subsetores' },
                  ...subsetorOptions.map(s => ({ value: s.subsetor, label: s.subsetor })),
                ]}
              />
            )}

            <CompactSelect
              value={statusFilter ?? ALL}
              onValueChange={v => setStatusFilter(v === ALL ? undefined : v)}
              placeholder="Todos os status"
              options={[
                { value: ALL, label: 'Todos os status' },
                { value: 'SEM_SITE', label: 'Sem site' },
                { value: 'SO_REDE_SOCIAL', label: 'Só social' },
                { value: 'COM_SITE', label: 'Tem site' },
              ]}
            />

            <CompactSelect
              value={contactFilter === undefined ? ALL : String(contactFilter)}
              onValueChange={v => setContactFilter(v === ALL ? undefined : v === 'true')}
              placeholder="Com e sem contato"
              options={[
                { value: ALL, label: 'Com e sem contato' },
                { value: 'true', label: 'Com contato' },
                { value: 'false', label: 'Sem contato' },
              ]}
            />

            <CompactSelect
              value={scoreMin !== undefined ? String(scoreMin) : ALL}
              onValueChange={v => setScoreMin(v === ALL ? undefined : Number(v))}
              placeholder="Score mín."
              options={[
                { value: ALL, label: 'Score mín.' },
                { value: '65', label: '≥ 65 (Alta)' },
                { value: '80', label: '≥ 80 (Altíssima)' },
              ]}
            />

            <CompactSelect
              value={tagFilter ?? ALL}
              onValueChange={v => { setTagFilter(v === ALL ? undefined : v); setPage(0) }}
              placeholder="Todas as tags"
              options={[
                { value: ALL, label: 'Todas as tags' },
                ...TAGS.map(t => ({ value: t.id, label: `${t.emoji} ${t.label}` })),
              ]}
            />
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.84rem] [&_tr:last-child>td]:border-b-0">
              <thead>
                <tr>
                  {['Nome', 'Status', 'Score', 'Tags', 'Web', ''].map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-border bg-card/50 px-3 py-2 text-left text-[0.74rem] font-semibold uppercase tracking-[0.05em] whitespace-nowrap text-text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {businesses.map(b => (
                  <CompactRow key={b.id} b={b} cidade={cidade} onOpen={() => setSelectedId(b.id)} />
                ))}
                {businesses.length === 0 && !isFetching && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[0.85rem] text-text-muted">
                      Nenhum negócio encontrado com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-2 text-[0.8rem] text-text-muted">
            <span className="tabular-nums">
              {total === 0
                ? '0 resultados'
                : `${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} de ${total}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="cursor-pointer rounded border border-border bg-card px-2.5 py-1 text-text hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ‹
              </button>
              <span className="px-2 tabular-nums">Pág. {page + 1} / {totalPages}</span>
              <button
                type="button"
                className="cursor-pointer rounded border border-border bg-card px-2.5 py-1 text-text hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}

      <LeadDrawer business={selected} cidade={cidade} runId={runId} onClose={() => setSelectedId(null)} />
    </div>
  )
}

// ─── Linha compacta ───────────────────────────────────────────────────────────

const tdBase = 'border-b border-border-faint px-3 py-[6px] align-middle text-text'

function CompactRow({
  b,
  cidade,
  onOpen,
}: {
  b: BusinessRead
  cidade?: string
  onOpen: () => void
}) {
  const wa = whatsappUrl(b.telefone, buildProspectMessage(b, cidade))
  const social = b.website && websiteIsSocial(b) ? detectSocial(b.website) : null
  const temSite = !!b.website && !social

  return (
    <tr
      className="cursor-pointer hover:bg-hover"
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen() }}
    >
      <td className={cn(tdBase, 'max-w-[180px]')}>
        <span className="block truncate font-medium text-text-strong">
          {b.nome ?? <em className="font-normal italic text-text-muted">sem nome</em>}
        </span>
      </td>
      <td className={tdBase}>
        <StatusBadge status={b.site_status} label={STATUS_LABELS[b.site_status] ?? b.site_status} />
      </td>
      <td className={tdBase}>
        <span className={cn('font-bold tabular-nums', scoreTextClass(b.score_label))}>
          {b.score}
        </span>
      </td>
      <td className={cn(tdBase, 'text-[0.9rem] tracking-wide')}>
        <span title={(b.tags ?? []).map(id => id).join(', ')}>
          {tagChipsCell(b.tags) || <span className="text-text-muted">—</span>}
        </span>
      </td>
      <td className={tdBase}>
        {social ? (
          <a
            href={social.url}
            target="_blank"
            rel="noreferrer"
            className="text-base text-brand hover:underline"
            title={social.label}
            onClick={e => e.stopPropagation()}
          >
            {NETWORK_ICON[social.network]}
          </a>
        ) : temSite ? (
          <a
            href={b.website!}
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
            title="Abrir site"
            onClick={e => e.stopPropagation()}
          >
            ↗
          </a>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className={cn(tdBase, 'w-[36px] text-center')}>
        {wa ? (
          <a
            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded bg-[rgba(37,211,102,0.14)] hover:bg-[rgba(37,211,102,0.3)]"
            href={wa}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
            onClick={e => e.stopPropagation()}
          >
            💬
          </a>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
    </tr>
  )
}

// ─── Select compacto ─────────────────────────────────────────────────────────

function CompactSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        className="h-auto rounded-md border-border bg-transparent py-1.5 text-[0.84rem] text-text-strong"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
