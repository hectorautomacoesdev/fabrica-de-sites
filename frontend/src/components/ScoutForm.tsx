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

const labelCls = 'flex flex-col gap-[5px] text-[0.85rem] font-medium text-text-muted'
const checkLabelCls = 'flex cursor-pointer flex-row items-center gap-2 text-[0.85rem] font-medium text-text-strong'
const inputCls = 'rounded-md border border-border bg-bg px-2.5 py-[7px] text-[0.9rem] text-text-strong'
const btnCancelCls = 'cursor-pointer rounded-md border border-border bg-transparent px-4 py-[7px] text-text-muted disabled:cursor-not-allowed disabled:opacity-50'
const btnSubmitCls = 'cursor-pointer rounded-md border-0 bg-brand px-5 py-[7px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'

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
        <button className="cursor-pointer rounded-[7px] border-0 bg-brand px-[18px] py-2 text-[0.9rem] font-semibold text-white transition-opacity hover:opacity-85">
          ＋ Nova coleta
        </button>
      </DialogTrigger>

      {/* DialogContent "pelado": o card visível é o <form>, preservando o visual.
          O Radix dá overlay, foco preso e ESC. */}
      <DialogContent
        showCloseButton={false}
        className="max-w-[420px] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[420px]"
      >
        <form
          className="flex w-full max-w-[420px] flex-col gap-[14px] rounded-xl border border-border bg-card px-8 py-7"
          onSubmit={handleSubmit}
        >
          <DialogTitle className="m-0 text-[1.1rem] font-semibold text-text-strong">
            Nova coleta do Scout
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure e dispare uma nova coleta de negócios do agente Scout.
          </DialogDescription>

          <label className={labelCls}>
            Cidade
            <input
              className={inputCls}
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              required
              disabled={isPending}
            />
          </label>

          <label className={checkLabelCls}>
            <input
              type="checkbox"
              checked={comSerper}
              onChange={e => setComSerper(e.target.checked)}
              disabled={isPending}
            />
            Adicionar Serper (Google Maps) como fonte
          </label>

          <label className={checkLabelCls}>
            <input
              type="checkbox"
              checked={enriquecer}
              onChange={e => setEnriquecer(e.target.checked)}
              disabled={isPending}
            />
            Enriquecer com DomainGuesser
          </label>

          {error && <p className="m-0 text-[0.82rem] text-[#e74c3c]">{(error as Error).message}</p>}

          <div className="flex justify-end gap-2.5">
            <button type="button" className={btnCancelCls} onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </button>
            <button type="submit" className={btnSubmitCls} disabled={isPending}>
              {isPending ? 'Coletando…' : 'Rodar Scout'}
            </button>
          </div>

          {isPending && (
            <p className="m-0 text-center text-[0.78rem] text-text-muted">
              A coleta pode levar 5–90 s dependendo das opções escolhidas.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
