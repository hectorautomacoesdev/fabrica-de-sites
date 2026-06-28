import { useEffect, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import type { MouseHandlerDataParam } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { BusinessFilters, BusinessRead, SectorStat, SubsetorStat } from '../api/client'
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
import LeadDrawer from './LeadDrawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  porSetor: SectorStat[]
  porSubsetor: Record<string, SubsetorStat[]>
  runId: number
  cidade?: string
}

const MAX_ROWS = 10

export default function SubsetorChart({ porSetor, porSubsetor, runId, cidade }: Props) {
  const [selectedSector, setSelectedSector] = useState<string>(
    porSetor.length > 0 ? porSetor[0].key : '',
  )
  const [selectedSubsetor, setSelectedSubsetor] = useState<string | null>(null)
  const [chartVisible, setChartVisible] = useState(true)
  const [tableVisible, setTableVisible] = useState(false)

  // Limpa seleção de subsetor ao trocar de setor
  const [prevSector, setPrevSector] = useState(selectedSector)
  if (selectedSector !== prevSector) {
    setPrevSector(selectedSector)
    setSelectedSubsetor(null)
  }

  const activeSector = porSetor.find(s => s.key === selectedSector)
  const rawRows = porSubsetor[selectedSector] ?? []

  let rows = rawRows
  if (rows.length > MAX_ROWS) {
    const visible = rows.slice(0, MAX_ROWS - 1)
    const resto = rows.slice(MAX_ROWS - 1)
    rows = [...visible, {
      subsetor: 'Outros',
      total: resto.reduce((s, r) => s + r.total, 0),
      sem_site: resto.reduce((s, r) => s + r.sem_site, 0),
      so_social: resto.reduce((s, r) => s + r.so_social, 0),
      com_site: resto.reduce((s, r) => s + r.com_site, 0),
      contactavel: resto.reduce((s, r) => s + r.contactavel, 0),
      leads_quentes: resto.reduce((s, r) => s + r.leads_quentes, 0),
    }]
  }

  const sectorTotal = activeSector?.total ?? 0

  // Quantas linhas a tabela mostra depende da visibilidade do gráfico
  const tablePageSize = chartVisible ? 5 : 10

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">

      {/* ── Header com seletor de setor ── */}
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted">
          Composição por subsetor
          {activeSector && (
            <span className="ml-2 font-normal normal-case tracking-normal">
              — {activeSector.emoji} {activeSector.nome} · {sectorTotal} negócios
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {porSetor.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSelectedSector(s.key)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.78rem] font-medium transition-colors',
                selectedSector === s.key
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-card text-text hover:border-brand hover:text-brand',
              )}
            >
              <span aria-hidden>{s.emoji}</span> {s.nome}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-center text-[0.85rem] text-text-muted">
          Nenhum dado disponível para este setor.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">

          {/* ── Painel esquerdo: lista com contagens ── */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.83rem] [&_tr:last-child>td]:border-b-0">
                <thead>
                  <tr>
                    <th className="border-b border-border bg-card/60 px-3 py-2 text-left text-[0.73rem] font-semibold uppercase tracking-[0.05em] text-text-muted">
                      Subsetor
                    </th>
                    <th className="border-b border-border bg-card/60 px-3 py-2 text-right text-[0.73rem] font-semibold uppercase tracking-[0.05em] tabular-nums text-text-muted">
                      Total
                    </th>
                    <th className="border-b border-border bg-card/60 px-3 py-2 text-right text-[0.73rem] font-semibold uppercase tracking-[0.05em] tabular-nums text-[#ef4444]">
                      Sem site
                    </th>
                    <th className="border-b border-border bg-card/60 px-3 py-2 text-right text-[0.73rem] font-semibold uppercase tracking-[0.05em] tabular-nums text-[#f59e0b]">
                      Só social
                    </th>
                    <th className="border-b border-border bg-card/60 px-3 py-2 text-right text-[0.73rem] font-semibold uppercase tracking-[0.05em] tabular-nums text-[#22c55e]">
                      Com site
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(sub => (
                    <SubsetorListRow
                      key={sub.subsetor}
                      sub={sub}
                      sectorTotal={sectorTotal}
                      selected={selectedSubsetor === sub.subsetor}
                      onClick={() => {
                        setSelectedSubsetor(prev => prev === sub.subsetor ? null : sub.subsetor)
                        setTableVisible(true)
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Painel direito: gráfico + tabela de leads ── */}
          <div className="flex flex-col">

            {/* Toggle do gráfico */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-[0.73rem] font-semibold uppercase tracking-[0.05em] text-text-muted">
                Proporção no setor
              </p>
              <button
                type="button"
                onClick={() => setChartVisible(v => !v)}
                className="cursor-pointer text-[0.78rem] text-text-muted hover:text-text"
              >
                {chartVisible ? 'Ocultar gráfico ↑' : 'Ver gráfico ↓'}
              </button>
            </div>

            {/* Gráfico (colapsável) */}
            {chartVisible && (
              <div
                className="overflow-hidden border-b border-border"
                style={{
                  padding: tableVisible ? '0.5rem 1rem' : '1rem',
                  transition: 'padding 0.3s ease',
                }}
              >
                <SubsetorFunil
                  rows={rows}
                  sectorTotal={sectorTotal}
                  selectedSubsetor={selectedSubsetor}
                  compact={tableVisible}
                  onSelect={sub => {
                    setSelectedSubsetor(prev => prev === sub ? null : sub)
                    setTableVisible(true)
                  }}
                />
              </div>
            )}

            {/* Toggle da tabela de leads */}
            <div className="flex items-center justify-between px-4 py-2">
              <p className="text-[0.73rem] font-semibold uppercase tracking-[0.05em] text-text-muted">
                Leads do subsetor
                {selectedSubsetor && (
                  <span className="ml-1.5 font-normal normal-case tracking-normal">
                    — {selectedSubsetor}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setTableVisible(v => !v)}
                className="cursor-pointer text-[0.78rem] text-text-muted hover:text-text"
              >
                {tableVisible ? 'Ocultar tabela ↑' : 'Ver leads ↓'}
              </button>
            </div>

            {/* Tabela de leads (colapsável) */}
            {tableVisible && (
              <SubsetorLeadsTable
                runId={runId}
                cidade={cidade}
                sectorKey={selectedSector}
                subsetorKey={selectedSubsetor ?? undefined}
                pageSize={tablePageSize}
              />
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── Linha da lista (painel esquerdo) ────────────────────────────────────────

const tdList = 'border-b border-border-faint px-3 py-[7px] align-middle'

function SubsetorListRow({
  sub,
  sectorTotal,
  selected,
  onClick,
}: {
  sub: SubsetorStat
  sectorTotal: number
  selected: boolean
  onClick: () => void
}) {
  const pct = sectorTotal > 0 ? ((sub.total / sectorTotal) * 100).toFixed(1) : '0'
  return (
    <tr
      className={cn('cursor-pointer transition-colors', selected ? 'bg-brand/10' : 'hover:bg-hover')}
      onClick={onClick}
      title="Clique para filtrar leads deste subsetor"
    >
      <td className={cn(tdList, 'max-w-[160px]')}>
        <span className="block truncate font-medium text-text-strong" title={sub.subsetor}>
          {sub.subsetor}
        </span>
        <span className="text-[0.72rem] text-text-muted">{pct}% do setor</span>
      </td>
      <td className={cn(tdList, 'text-right tabular-nums font-bold text-text-strong')}>
        {sub.total}
      </td>
      <td className={cn(tdList, 'text-right tabular-nums text-[#ef4444]')}>
        {sub.sem_site > 0 ? sub.sem_site : <span className="opacity-30">—</span>}
      </td>
      <td className={cn(tdList, 'text-right tabular-nums text-[#d97706]')}>
        {sub.so_social > 0 ? sub.so_social : <span className="opacity-30">—</span>}
      </td>
      <td className={cn(tdList, 'text-right tabular-nums text-[#16a34a]')}>
        {sub.com_site > 0 ? sub.com_site : <span className="opacity-30">—</span>}
      </td>
    </tr>
  )
}

// ─── Funil de subsetor (painel direito) ──────────────────────────────────────

const chartConfig = { valor: { label: 'Negócios' } }
const FUNIL_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)',
]

function SubsetorFunil({
  rows,
  sectorTotal,
  selectedSubsetor,
  onSelect,
  compact,
}: {
  rows: SubsetorStat[]
  sectorTotal: number
  selectedSubsetor: string | null
  onSelect: (sub: string) => void
  compact?: boolean
}) {
  const sorted = [...rows].sort((a, b) => b.total - a.total)
  const data = sorted.map((r, i) => ({
    nome: r.subsetor.length > 22 ? r.subsetor.slice(0, 20) + '…' : r.subsetor,
    nomeCompleto: r.subsetor,
    valor: r.total,
    pct: sectorTotal > 0 ? Math.round((r.total / sectorTotal) * 100) : 0,
    color: selectedSubsetor === r.subsetor
      ? 'var(--chart-1)'
      : FUNIL_COLORS[i % FUNIL_COLORS.length],
  }))

  const rowH = compact ? 18 : 28
  const chartHeight = Math.max(compact ? 90 : 160, data.length * rowH + 20)
  const maxBarSize = compact ? 11 : 20
  const fontSize = compact ? 10 : 11

  const labelWidth = Math.min(160, Math.max(90, data.reduce(
    (m, d) => Math.max(m, d.nome.length * 6.5), 0,
  )))

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: chartHeight, transition: 'height 0.3s ease' }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
        onClick={(e: MouseHandlerDataParam) => {
          const idx = e?.activeIndex
          if (idx != null && typeof idx === 'number' && data[idx]) onSelect(data[idx].nomeCompleto)
        }}
        style={{ cursor: 'pointer' }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nome"
          width={labelWidth}
          tick={{ fontSize: fontSize, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value, _name, props) =>
                `${(props.payload as { nomeCompleto?: string })?.nomeCompleto ?? ''}: ${value} (${(props.payload as { pct?: number })?.pct ?? 0}%)`
              }
            />
          }
        />
        <Bar dataKey="valor" radius={4} maxBarSize={maxBarSize} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          <LabelList
            dataKey="pct"
            position="right"
            formatter={(v: unknown) => `${v}%`}
            style={{ fontSize, fontWeight: 700, fill: 'var(--text-muted)' }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// ─── Tabela de leads embutida no SubsetorChart ────────────────────────────────

const ALL_SUB = '__all_sub__'
const tdMini = 'border-b border-border-faint px-3 py-[6px] align-middle text-text'
const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site', SO_REDE_SOCIAL: 'Só social', COM_SITE: 'Tem site', DESCONHECIDO: 'Desconh.',
}

function SubsetorLeadsTable({
  runId,
  cidade,
  sectorKey,
  subsetorKey,
  pageSize,
}: {
  runId: number
  cidade?: string
  sectorKey?: string
  subsetorKey?: string
  pageSize: number
}) {
  const [page, setPage] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestQuery, setSuggestQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [contactFilter, setContactFilter] = useState<boolean | undefined>(undefined)
  const [scoreMin, setScoreMin] = useState<number | undefined>(undefined)
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    if (inputValue.length < 2) { setSuggestQuery(''); setShowSuggestions(false); return }
    const t = setTimeout(() => { setSuggestQuery(inputValue); setShowSuggestions(true) }, 300)
    return () => clearTimeout(t)
  }, [inputValue])

  // Reset ao mudar subsetor
  const [prevSub, setPrevSub] = useState(subsetorKey)
  if (subsetorKey !== prevSub) { setPrevSub(subsetorKey); setPage(0) }

  const tableFilters: BusinessFilters = {
    setor: sectorKey,
    subsetor: subsetorKey,
    contactavel: contactFilter,
    score_min: scoreMin,
    tag: tagFilter,
    busca: searchTerm.length >= 2 ? searchTerm : undefined,
    order_by: 'score',
    order_dir: 'desc',
  }

  const critKey = JSON.stringify(tableFilters)
  const [prevCrit, setPrevCrit] = useState(critKey)
  if (critKey !== prevCrit) { setPrevCrit(critKey); setPage(0) }

  const { data, isFetching } = useBusinessesPaged(runId, {
    ...tableFilters, offset: page * pageSize, limit: pageSize,
  })
  const { data: suggestData } = useBusinessesPaged(
    suggestQuery.length >= 2 ? runId : null,
    { busca: suggestQuery, setor: sectorKey, subsetor: subsetorKey, limit: 12, order_by: 'nome', order_dir: 'asc' },
  )

  const suggestions = [...(suggestData?.items ?? [])].sort((a, b) => {
    const q = inputValue.toLowerCase()
    const aS = (a.nome ?? '').toLowerCase().startsWith(q)
    const bS = (b.nome ?? '').toLowerCase().startsWith(q)
    return aS === bS ? 0 : aS ? -1 : 1
  })

  const businesses = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const selected = selectedId != null ? businesses.find(b => b.id === selectedId) ?? null : null

  function applySearch(nome: string) { setInputValue(nome); setSearchTerm(nome); setShowSuggestions(false) }
  function clearSearch() { setInputValue(''); setSearchTerm(''); setSuggestQuery(''); setShowSuggestions(false) }

  return (
    <div className="border-t border-border">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative">
          <input
            className="min-w-[170px] rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[0.83rem] text-text-strong outline-none focus:border-brand"
            placeholder="Buscar por nome…"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onFocus={() => { if (suggestQuery.length >= 2 && suggestions.length > 0) setShowSuggestions(true) }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={e => { if (e.key === 'Enter') applySearch(inputValue); if (e.key === 'Escape') clearSearch() }}
          />
          {inputValue.length > 0 && (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              onMouseDown={e => { e.preventDefault(); clearSearch() }}>×</button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 top-full z-50 mt-1 max-h-[180px] min-w-[220px] overflow-auto rounded-md border border-border bg-card shadow-lg">
              {suggestions.map(s => (
                <li key={s.id}>
                  <button type="button" className="w-full px-3 py-1.5 text-left text-[0.83rem] text-text-strong hover:bg-hover"
                    onMouseDown={e => { e.preventDefault(); applySearch(s.nome ?? '') }}>
                    {s.nome}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <MiniSelect
          value={contactFilter === undefined ? ALL_SUB : String(contactFilter)}
          onValueChange={v => setContactFilter(v === ALL_SUB ? undefined : v === 'true')}
          options={[
            { value: ALL_SUB, label: 'Com e sem contato' },
            { value: 'true', label: 'Com contato' },
            { value: 'false', label: 'Sem contato' },
          ]}
        />
        <MiniSelect
          value={scoreMin !== undefined ? String(scoreMin) : ALL_SUB}
          onValueChange={v => setScoreMin(v === ALL_SUB ? undefined : Number(v))}
          options={[
            { value: ALL_SUB, label: 'Score mín.' },
            { value: '65', label: '≥ 65 (Alta)' },
            { value: '80', label: '≥ 80 (Altíssima)' },
          ]}
        />
        <MiniSelect
          value={tagFilter ?? ALL_SUB}
          onValueChange={v => { setTagFilter(v === ALL_SUB ? undefined : v); setPage(0) }}
          options={[
            { value: ALL_SUB, label: 'Todas as tags' },
            ...TAGS.map(t => ({ value: t.id, label: `${t.emoji} ${t.label}` })),
          ]}
        />
        <span className="ml-auto text-[0.78rem] text-text-muted tabular-nums">
          {isFetching ? 'a filtrar…' : `${total} negócios`}
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.83rem] [&_tr:last-child>td]:border-b-0">
          <thead>
            <tr>
              {['Nome', 'Status', 'Score', 'Tags', 'Web', ''].map((h, i) => (
                <th key={i} className="border-b border-border bg-card/50 px-3 py-2 text-left text-[0.73rem] font-semibold uppercase tracking-[0.05em] whitespace-nowrap text-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {businesses.map(b => (
              <MiniRow key={b.id} b={b} cidade={cidade} onOpen={() => setSelectedId(b.id)} />
            ))}
            {businesses.length === 0 && !isFetching && (
              <tr><td colSpan={6} className="p-5 text-center text-[0.84rem] text-text-muted">
                Nenhum negócio encontrado.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between px-3 py-2 text-[0.78rem] text-text-muted">
        <span className="tabular-nums">
          {total === 0 ? '0' : `${page * pageSize + 1}–${Math.min(total, (page + 1) * pageSize)} de ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" className="cursor-pointer rounded border border-border bg-card px-2 py-0.5 hover:bg-hover disabled:opacity-40"
            onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
          <span className="px-1.5 tabular-nums">{page + 1}/{totalPages}</span>
          <button type="button" className="cursor-pointer rounded border border-border bg-card px-2 py-0.5 hover:bg-hover disabled:opacity-40"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
        </div>
      </div>

      <LeadDrawer business={selected} cidade={cidade} runId={runId} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function MiniRow({ b, cidade, onOpen }: { b: BusinessRead; cidade?: string; onOpen: () => void }) {
  const wa = whatsappUrl(b.telefone, buildProspectMessage(b, cidade))
  const social = b.website && websiteIsSocial(b) ? detectSocial(b.website) : null
  const temSite = !!b.website && !social
  return (
    <tr className="cursor-pointer hover:bg-hover" onClick={onOpen} tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen() }}>
      <td className={cn(tdMini, 'max-w-[160px]')}>
        <span className="block truncate font-medium text-text-strong">
          {b.nome ?? <em className="font-normal italic text-text-muted">sem nome</em>}
        </span>
      </td>
      <td className={tdMini}>
        <StatusBadge status={b.site_status} label={STATUS_LABELS[b.site_status] ?? b.site_status} />
      </td>
      <td className={tdMini}>
        <span className={cn('font-bold tabular-nums', scoreTextClass(b.score_label))}>{b.score}</span>
      </td>
      <td className={cn(tdMini, 'text-[0.9rem] tracking-wide')}>
        <span title={(b.tags ?? []).join(', ')}>
          {tagChipsCell(b.tags) || <span className="text-text-muted">—</span>}
        </span>
      </td>
      <td className={tdMini}>
        {social
          ? <a href={social.url} target="_blank" rel="noreferrer" className="text-base text-brand hover:underline" title={social.label} onClick={e => e.stopPropagation()}>{NETWORK_ICON[social.network]}</a>
          : temSite
          ? <a href={b.website!} target="_blank" rel="noreferrer" className="text-brand hover:underline" title="Abrir site" onClick={e => e.stopPropagation()}>↗</a>
          : <span className="text-text-muted">—</span>}
      </td>
      <td className={cn(tdMini, 'w-[36px] text-center')}>
        {wa
          ? <a className="inline-flex h-[22px] w-[22px] items-center justify-center rounded bg-[rgba(37,211,102,0.14)] hover:bg-[rgba(37,211,102,0.3)]"
               href={wa} target="_blank" rel="noreferrer" title="WhatsApp" onClick={e => e.stopPropagation()}>💬</a>
          : <span className="text-text-muted">—</span>}
      </td>
    </tr>
  )
}

function MiniSelect({
  value, onValueChange, options,
}: { value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" className="h-auto rounded-md border-border bg-transparent py-1.5 text-[0.83rem] text-text-strong">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
