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
import LeadDrawer from './LeadDrawer'
import './BusinessTable.css'

const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site',
  SO_REDE_SOCIAL: 'Só social',
  COM_SITE: 'Tem site',
  DESCONHECIDO: 'Desconh.',
}

const STATUS_CLASS: Record<string, string> = {
  SEM_SITE: 'status-sem-site',
  SO_REDE_SOCIAL: 'status-social',
  COM_SITE: 'status-com-site',
  DESCONHECIDO: 'status-desconh',
}

const SCORE_CLASS: Record<string, string> = {
  ALTÍSSIMA: 'score-altissima',
  ALTA: 'score-alta',
  MÉDIA: 'score-media',
  BAIXA: 'score-baixa',
}

const SETORES = [
  '', 'alimentacao', 'automotivo', 'beleza', 'comercio',
  'educacao', 'fitness', 'outros', 'profissional',
  'saude', 'servicos', 'turismo',
]

// Opções de ordenação amigáveis → (order_by, order_dir)
const ORDENACOES: Record<string, { order_by: string; order_dir: 'asc' | 'desc'; label: string }> = {
  'score_desc': { order_by: 'score', order_dir: 'desc', label: 'Maior score' },
  'score_asc': { order_by: 'score', order_dir: 'asc', label: 'Menor score' },
  'nome_asc': { order_by: 'nome', order_dir: 'asc', label: 'Nome (A→Z)' },
}

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

  function handleOrdem(e: ChangeEvent<HTMLSelectElement>) {
    const o = ORDENACOES[e.target.value]
    setOrdem(e.target.value)
    setFilters(f => ({ ...f, order_by: o.order_by, order_dir: o.order_dir }))
  }

  return (
    <div className="table-section">
      <div className="table-toolbar">
        <input
          className="search-input"
          placeholder="Buscar por nome…"
          value={busca}
          onChange={handleBusca}
        />

        <select onChange={e => set('setor', e.target.value || undefined)}>
          <option value="">Todos os setores</option>
          {SETORES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select onChange={e => set('site_status', e.target.value || undefined)}>
          <option value="">Todos os status</option>
          <option value="SEM_SITE">Sem site</option>
          <option value="SO_REDE_SOCIAL">Só rede social</option>
          <option value="COM_SITE">Tem site</option>
        </select>

        <select onChange={e => set('contactavel', e.target.value === '' ? undefined : e.target.value === 'true')}>
          <option value="">Com e sem contato</option>
          <option value="true">Com contato</option>
          <option value="false">Sem contato</option>
        </select>

        <select onChange={e => set('org_tipo', e.target.value || undefined)}>
          <option value="">Todo tipo de org.</option>
          <option value="independente">Independente</option>
          <option value="rede">Rede / franquia</option>
          <option value="publico">Órgão público</option>
        </select>

        <select onChange={e => set('score_min', e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Score mín.</option>
          <option value="65">≥ 65 (Alta)</option>
          <option value="80">≥ 80 (Altíssima)</option>
        </select>

        <select value={ordem} onChange={handleOrdem} title="Ordenar">
          {Object.entries(ORDENACOES).map(([k, o]) => (
            <option key={k} value={k}>{o.label}</option>
          ))}
        </select>

        <span className="table-count">
          {isFetching ? 'Filtrando…' : `${businesses.length} negócios`}
        </span>
      </div>

      <div className="table-wrapper">
        <table className="biz-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Setor</th>
              <th>Status</th>
              <th>Score</th>
              <th>Telefone</th>
              <th>Web</th>
              <th aria-label="Ação"></th>
            </tr>
          </thead>
          <tbody>
            {businesses.map(b => (
              <Row key={b.id} b={b} cidade={cidade} onOpen={() => setSelectedId(b.id)} />
            ))}
            {businesses.length === 0 && !isFetching && (
              <tr>
                <td colSpan={7} className="empty-row">Nenhum negócio encontrado com esses filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadDrawer business={selected} cidade={cidade} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function Row({ b, cidade, onOpen }: { b: BusinessRead; cidade?: string; onOpen: () => void }) {
  const wa = whatsappUrl(b.telefone, buildProspectMessage(b, cidade))
  const social = b.website && websiteIsSocial(b) ? detectSocial(b.website) : null
  const temSitePróprio = !!b.website && !social

  return (
    <tr className="biz-row" onClick={onOpen} tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') onOpen() }}>
      <td className="td-nome">{b.nome ?? <em className="sem-nome">sem nome</em>}</td>
      <td>{b.setor_nome}</td>
      <td>
        <span className={`status-badge ${STATUS_CLASS[b.site_status] ?? ''}`}>
          {STATUS_LABELS[b.site_status] ?? b.site_status}
        </span>
      </td>
      <td>
        <span className={`score-badge ${SCORE_CLASS[b.score_label] ?? ''}`}>
          {b.score} <small>{b.score_label}</small>
        </span>
      </td>
      <td>{b.telefone ?? <span className="none">—</span>}</td>
      <td>
        {social ? (
          <a href={social.url} target="_blank" rel="noreferrer" className="site-link"
             title={social.label} onClick={e => e.stopPropagation()}>
            {NETWORK_ICON[social.network]}
          </a>
        ) : temSitePróprio ? (
          <a href={b.website!} target="_blank" rel="noreferrer" className="site-link"
             title="Abrir site" onClick={e => e.stopPropagation()}>↗</a>
        ) : (
          <span className="none">—</span>
        )}
      </td>
      <td className="td-acao">
        {wa ? (
          <a className="wa-mini" href={wa} target="_blank" rel="noreferrer"
             title="Chamar no WhatsApp" onClick={e => e.stopPropagation()}>💬</a>
        ) : (
          <span className="none">—</span>
        )}
      </td>
    </tr>
  )
}
