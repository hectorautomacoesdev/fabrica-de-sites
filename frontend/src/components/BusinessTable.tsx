import { type ChangeEvent, useState } from 'react'
import type { BusinessRead, BusinessFilters } from '../api/client'
import { useBusinesses } from '../hooks/useScout'
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

interface Props {
  runId: number
}

export default function BusinessTable({ runId }: Props) {
  const [filters, setFilters] = useState<BusinessFilters>({ limit: 300 })
  const [busca, setBusca] = useState('')

  const activeFilters: BusinessFilters = {
    ...filters,
    busca: busca.length >= 2 ? busca : undefined,
  }

  const { data: businesses = [], isFetching } = useBusinesses(runId, activeFilters)

  function set<K extends keyof BusinessFilters>(key: K, val: BusinessFilters[K]) {
    setFilters(f => ({ ...f, [key]: val || undefined }))
  }

  function handleBusca(e: ChangeEvent<HTMLInputElement>) {
    setBusca(e.target.value)
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

        <select onChange={e => set('score_min', e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Score mín.</option>
          <option value="65">≥ 65 (Alta)</option>
          <option value="80">≥ 80 (Altíssima)</option>
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
              <th>Endereço</th>
              <th>Site</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map(b => (
              <Row key={b.id} b={b} />
            ))}
            {businesses.length === 0 && !isFetching && (
              <tr>
                <td colSpan={7} className="empty-row">Nenhum negócio encontrado com esses filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ b }: { b: BusinessRead }) {
  return (
    <tr>
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
      <td className="td-endereco">{b.endereco ?? <span className="none">—</span>}</td>
      <td>
        {b.website
          ? <a href={b.website} target="_blank" rel="noreferrer" className="site-link">↗</a>
          : <span className="none">—</span>}
      </td>
    </tr>
  )
}
