import { type FormEvent, useState } from 'react'
import type { RunStartRequest } from '../api/client'
import { useStartRun } from '../hooks/useScout'
import './ScoutForm.css'

interface Props {
  onSuccess: (runId: number) => void
}

export default function ScoutForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [cidade, setCidade] = useState('Guarujá')
  const [comSerper, setComSerper] = useState(false)
  const [enriquecer, setEnriquecer] = useState(false)
  const { mutate, isPending, error } = useStartRun()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const body: RunStartRequest = { cidade, com_serper: comSerper, enriquecer }
    mutate(body, {
      onSuccess: res => {
        setOpen(false)
        onSuccess(res.run_id)
      },
    })
  }

  if (!open) {
    return (
      <button className="btn-run" onClick={() => setOpen(true)}>
        ＋ Nova coleta
      </button>
    )
  }

  return (
    <div className="scout-form-overlay" onClick={() => !isPending && setOpen(false)}>
      <form className="scout-form" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <h3>Nova coleta do Scout</h3>

        <label>
          Cidade
          <input
            value={cidade}
            onChange={e => setCidade(e.target.value)}
            required
            disabled={isPending}
          />
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={comSerper}
            onChange={e => setComSerper(e.target.checked)}
            disabled={isPending}
          />
          Adicionar Serper (Google Maps) como fonte
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={enriquecer}
            onChange={e => setEnriquecer(e.target.checked)}
            disabled={isPending}
          />
          Enriquecer com DomainGuesser
        </label>

        {error && <p className="form-error">{(error as Error).message}</p>}

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </button>
          <button type="submit" className="btn-submit" disabled={isPending}>
            {isPending ? 'Coletando…' : 'Rodar Scout'}
          </button>
        </div>

        {isPending && (
          <p className="form-hint">
            A coleta pode levar 5–90 s dependendo das opções escolhidas.
          </p>
        )}
      </form>
    </div>
  )
}
