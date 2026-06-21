import { type FormEvent, useState } from 'react'
import type { RunStartRequest } from '../api/client'
import { useStartRun } from '../hooks/useScout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

  return (
    <Dialog open={open} onOpenChange={o => { if (!isPending) setOpen(o) }}>
      <DialogTrigger asChild>
        <button className="btn-run">＋ Nova coleta</button>
      </DialogTrigger>

      {/* DialogContent "pelado": o card visível continua sendo o .scout-form,
          preservando o visual original. O Radix dá overlay, foco preso e ESC. */}
      <DialogContent
        showCloseButton={false}
        className="max-w-[420px] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[420px]"
      >
        <form className="scout-form" onSubmit={handleSubmit}>
          <DialogTitle className="m-0 text-[1.1rem] font-semibold text-text-strong">
            Nova coleta do Scout
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure e dispare uma nova coleta de negócios do agente Scout.
          </DialogDescription>

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
      </DialogContent>
    </Dialog>
  )
}
