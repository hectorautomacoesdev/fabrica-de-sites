import { type ChangeEvent, useState } from 'react'
import type { BusinessRead, BusinessFilters } from '../api/client'
import { useBusinesses } from '../hooks/useScout'
import {
  buildProspectMessage,
  detectSocial,
  NETWORK_ICON,
  websiteIsSocial,
  whatsappUrl,
} from '../lib/leadUtils'
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

const SETORES = [
  'alimentacao', 'automotivo', 'beleza', 'comercio',
  'educacao', 'fitness', 'outros', 'profissional',
  'saude', 'servicos', 'turismo',
]

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
}

export default function BusinessTable({ runId, cidade }: Props) {
  const [filters, setFilters] = useState<BusinessFilters>({ limit: 300, order_by: 'score', order_dir: 'desc' })
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('score_desc')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const activeFilters: BusinessFilters = {
    ...filters,
    busca: busca.length >= 2 ? busca : undefined,
  }

  const { data: businesses = [], isFetching } = useBusinesses(runId, activeFilters)
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
          className="min-w-[180px] rounded-md border border-border bg-card px-2.5 py-1.5 text-[0.82rem] text-text-strong"
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
            ...SETORES.map(s => ({ value: s, label: s })),
          ]}
        />

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
          placeholder="Ordenar"
          value={ordem}
          onValueChange={handleOrdem}
          options={Object.entries(ORDENACOES).map(([k, o]) => ({ value: k, label: o.label }))}
        />

        <span className="ml-auto text-[0.8rem] whitespace-nowrap text-text-muted">
          {isFetching ? 'Filtrando…' : `${businesses.length} negócios`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-[0.82rem] [&_tr:last-child>td]:border-b-0">
          <thead>
            <tr>
              {['Nome', 'Setor', 'Status', 'Score', 'Telefone', 'Web', ''].map((h, i) => (
                <th
                  key={i}
                  aria-label={h || 'Ação'}
                  className="border-b border-border bg-card px-3 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-[0.05em] whitespace-nowrap text-text-muted"
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
                <td colSpan={7} className="p-8 text-center text-text-muted">
                  Nenhum negócio encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadDrawer business={selected} cidade={cidade} onClose={() => setSelectedId(null)} />
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
        className="h-auto rounded-md border-border bg-card py-1.5 text-[0.82rem] text-text-strong dark:bg-card dark:hover:bg-hover"
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
          {b.score} <small className="text-[0.7rem] font-normal text-text-muted">{b.score_label}</small>
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
