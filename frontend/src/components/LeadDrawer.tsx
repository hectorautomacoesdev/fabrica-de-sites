import { useState } from 'react'
import type { BusinessPatch, BusinessRead, NoteItem } from '../api/client'
import { TAGS } from '../lib/tags'
import { usePatchBusiness } from '../hooks/useScout'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from './Badge'
import { scoreTextClass } from '../lib/score'
import {
  buildProspectMessage,
  instagramSearchUrl,
  linkedinSearchUrl,
  googleSearchUrl,
  mapsUrl,
  NETWORK_ICON,
  socialLinks,
  telUrl,
  websiteIsSocial,
  whatsappUrl,
} from '../lib/leadUtils'

// ─── Constantes de estilo ────────────────────────────────────────────────────

const act = 'inline-flex cursor-pointer items-center gap-[5px] rounded-lg border border-border bg-card px-3 py-[7px] text-[0.85rem] font-semibold text-text-strong no-underline hover:bg-hover'
const blockTitle = 'text-[0.78rem] font-bold uppercase tracking-[0.08em] text-text-muted'
const muted = 'text-[0.86rem] text-text-muted'
const chip = 'rounded-full bg-brand-faint px-2 py-0.5 text-[0.78rem] font-semibold text-brand'
const inputCls = 'w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[0.85rem] text-text-strong placeholder:text-text-muted outline-none focus:border-brand'
const labelCls = 'block text-[0.78rem] font-semibold text-text-muted mb-0.5'

const ORG_LABELS: Record<string, string> = {
  independente: 'Independente',
  publico: 'Órgão público',
  rede: 'Rede / franquia',
}
const STATUS_LABELS: Record<string, string> = {
  SEM_SITE: 'Sem site',
  SO_REDE_SOCIAL: 'Só rede social',
  COM_SITE: 'Tem site',
  DESCONHECIDO: 'Desconhecido',
}

// ─── Utilitário de ID ────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  business: BusinessRead | null
  cidade?: string
  onClose: () => void
  runId?: number
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function LeadDrawer({ business, cidade, onClose, runId }: Props) {
  const open = business !== null

  // Mantém o último negócio visível durante a animação de saída
  const [shown, setShown] = useState<BusinessRead | null>(business)
  const [localBusiness, setLocalBusiness] = useState<BusinessRead | null>(null)

  const [prevBusiness, setPrevBusiness] = useState(business)
  if (business !== prevBusiness) {
    setPrevBusiness(business)
    if (business !== null) {
      setShown(business)
      setLocalBusiness(null)  // reseta edições ao abrir novo lead
    }
  }

  const b = localBusiness ?? shown
  const patch = usePatchBusiness(runId ?? b?.run_id ?? 0)

  function handlePatch(data: BusinessPatch) {
    if (!b) return
    patch.mutate(
      { businessId: b.id, patch: data },
      { onSuccess: (updated) => setLocalBusiness(updated) },
    )
  }

  const nome = b?.nome ?? 'Negócio sem nome'
  const wa = b ? whatsappUrl(b.telefone ?? b.telefone2, buildProspectMessage(b, cidade)) : null
  const tel = b ? telUrl(b.telefone ?? b.telefone2) : null
  const maps = b ? mapsUrl(b) : null
  const temSitePróprio = !!b?.website && !websiteIsSocial(b)

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[460px] max-w-[96vw] overflow-y-auto p-0 sm:max-w-[96vw]"
        aria-label={`Detalhe de ${nome}`}
      >
        {b && (
          <div className="flex flex-col gap-0">

            {/* ── Cabeçalho ──────────────────────────────────────────────── */}
            <header className="flex items-start justify-between gap-3 border-b border-border p-5 pb-4">
              <div className="min-w-0">
                <SheetTitle className="text-[1.1rem] font-bold leading-tight tracking-[-0.01em] text-text-strong">
                  {nome}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Detalhes, contato e ações do lead {nome}.
                </SheetDescription>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={chip}>{b.setor_nome}</span>
                  {b.org_tipo && b.org_tipo !== 'independente' && (
                    <span className={cn(chip, 'bg-[#fef3c7] text-[#92400e]')}>
                      {ORG_LABELS[b.org_tipo] ?? b.org_tipo}
                    </span>
                  )}
                  <StatusBadge status={b.site_status} label={STATUS_LABELS[b.site_status] ?? b.site_status} />
                </div>
              </div>
              <SheetClose
                className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent text-[0.9rem] text-text-muted hover:bg-hover hover:text-text-strong"
                aria-label="Fechar"
              >✕</SheetClose>
            </header>

            {/* ── Score ──────────────────────────────────────────────────── */}
            <ScoreSection b={b} onPatch={handlePatch} isPending={patch.isPending} />

            {/* ── Ações rápidas ──────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 border-b border-border px-5 py-4">
              {wa && <a className={cn(act, 'border-[#25d366] bg-[#25d366] text-[#06301a] hover:brightness-105')} href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
              {tel && <a className={act} href={tel}>📞 Ligar</a>}
              {b.email && <a className={act} href={`mailto:${b.email}`}>✉️ E-mail</a>}
              {temSitePróprio && <a className={act} href={b.website!} target="_blank" rel="noreferrer">🌐 Site</a>}
              {maps && <a className={act} href={maps} target="_blank" rel="noreferrer">📍 Mapa</a>}
              <a className={act} href={googleSearchUrl(`${nome} ${cidade ?? ''}`)} target="_blank" rel="noreferrer">🔎 Google</a>
            </div>

            {/* ── Tags ───────────────────────────────────────────────────── */}
            <TagsSection b={b} onPatch={handlePatch} isPending={patch.isPending} />

            {/* ── Contato ────────────────────────────────────────────────── */}
            <ContactSection b={b} onPatch={handlePatch} isPending={patch.isPending} />

            {/* ── Anotações ──────────────────────────────────────────────── */}
            <NotasSection b={b} onPatch={handlePatch} isPending={patch.isPending} />

            {/* ── Presença online ────────────────────────────────────────── */}
            <PresencaSection b={b} cidade={cidade} onPatch={handlePatch} isPending={patch.isPending} />

            {/* ── Resumo da empresa ──────────────────────────────────────── */}
            <ResumoSection b={b} onPatch={handlePatch} isPending={patch.isPending} />

          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── ScoreSection ─────────────────────────────────────────────────────────────

function ScoreSection({ b, onPatch, isPending }: { b: BusinessRead; onPatch: (d: BusinessPatch) => void; isPending: boolean }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [wk, setWk] = useState(b.website_kind)
  const [orgTipo, setOrgTipo] = useState(b.org_tipo)

  // Sync when business changes
  const [prevId, setPrevId] = useState(b.id)
  if (b.id !== prevId) {
    setPrevId(b.id)
    setWk(b.website_kind)
    setOrgTipo(b.org_tipo)
  }

  function openModal() {
    setWk(b.website_kind)
    setOrgTipo(b.org_tipo)
    setModalOpen(true)
  }

  function save() {
    onPatch({ website_kind: wk, org_tipo: orgTipo })
    setModalOpen(false)
  }

  return (
    <>
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            'flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-current',
            scoreTextClass(b.score_label),
          )}>
            <span className="text-[1.4rem] font-extrabold leading-none">{b.score}</span>
            <span className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.04em]">{b.score_label}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(blockTitle, 'mb-1.5')}>Por que essa oportunidade</p>
            {b.score_motivos && b.score_motivos.length > 0 ? (
              <ul className="flex list-none flex-col gap-[3px]">
                {b.score_motivos.map((m, i) => (
                  <li key={i} className="relative pl-[14px] text-[0.84rem] text-text before:absolute before:left-[2px] before:text-brand before:content-['•']">{m}</li>
                ))}
              </ul>
            ) : (
              <p className={muted}>Sem motivos detalhados nesta execução.</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[0.82rem] font-semibold text-text-strong hover:bg-hover disabled:opacity-60"
            onClick={openModal}
            disabled={isPending}
          >
            ✏️ Alterar classificação
          </button>
        </div>
      </div>

      {/* Modal de edição do score */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false) }}>
        <DialogContent className="max-w-[400px]" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Alterar classificação</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className={labelCls}>Presença web</label>
              <Select value={wk} onValueChange={setWk}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem site</SelectItem>
                  <SelectItem value="rede_social">Só rede social</SelectItem>
                  <SelectItem value="proprio">Tem site próprio</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[0.76rem] text-text-muted">
                {wk === 'nenhum' && 'Nenhum site ou perfil encontrado.'}
                {wk === 'rede_social' && 'Só tem Instagram/Facebook — melhor lead para venda.'}
                {wk === 'proprio' && 'Tem site próprio — Auditor avalia a qualidade depois.'}
              </p>
            </div>
            <div>
              <label className={labelCls}>Tipo de organização</label>
              <Select value={orgTipo} onValueChange={setOrgTipo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independente">Independente</SelectItem>
                  <SelectItem value="rede">Rede / franquia</SelectItem>
                  <SelectItem value="publico">Órgão público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-[0.86rem] font-semibold text-text-strong hover:bg-hover"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-[0.86rem] font-semibold text-white hover:brightness-105 disabled:opacity-60"
              onClick={save}
              disabled={isPending}
            >
              {isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

function TagsSection({ b, onPatch, isPending }: { b: BusinessRead; onPatch: (d: BusinessPatch) => void; isPending: boolean }) {
  const [activeTags, setActiveTags] = useState<string[]>(b.tags ?? [])

  const [prevId, setPrevId] = useState(b.id)
  if (b.id !== prevId) {
    setPrevId(b.id)
    setActiveTags(b.tags ?? [])
  }

  function toggle(tagId: string) {
    const updated = activeTags.includes(tagId)
      ? activeTags.filter(t => t !== tagId)
      : [...activeTags, tagId]
    setActiveTags(updated)
    onPatch({ tags: updated })
  }

  return (
    <div className="border-b border-border px-5 py-3">
      <p className={cn(blockTitle, 'mb-2')}>Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map(t => {
          const active = activeTags.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              disabled={isPending}
              className={cn(
                'cursor-pointer rounded-full border px-2.5 py-0.5 text-[0.78rem] font-semibold transition-all',
                active ? t.cls : 'border-border bg-card text-text-muted hover:border-border hover:text-text-strong',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
              title={active ? `Remover tag "${t.label}"` : `Adicionar tag "${t.label}"`}
            >
              {t.emoji} {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── CollapsibleSection ───────────────────────────────────────────────────────

function CollapsibleSection({
  title, children, defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between px-5 py-3 hover:bg-hover/60"
        onClick={() => setOpen(v => !v)}
      >
        <span className={blockTitle}>{title}</span>
        <span className="text-[0.8rem] text-text-muted">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

// ─── ContactSection ───────────────────────────────────────────────────────────

function ContactSection({ b, onPatch, isPending }: { b: BusinessRead; onPatch: (d: BusinessPatch) => void; isPending: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<BusinessRead>>({})
  const [dirty, setDirty] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)

  function startEdit() {
    setDraft({
      telefone: b.telefone ?? '',
      telefone2: b.telefone2 ?? '',
      email: b.email ?? '',
      email2: b.email2 ?? '',
      endereco: b.endereco ?? '',
      horario: b.horario ?? '',
    })
    setDirty(false)
    setEditing(true)
  }

  function set(k: string, v: string) {
    setDraft(d => ({ ...d, [k]: v }))
    setDirty(true)
  }

  function tryCancel() {
    if (dirty) setShowDiscard(true)
    else setEditing(false)
  }

  function save() {
    onPatch({
      telefone: draft.telefone || null,
      telefone2: draft.telefone2 || null,
      email: draft.email || null,
      email2: draft.email2 || null,
      endereco: draft.endereco || null,
      horario: draft.horario || null,
    })
    setEditing(false)
    setDirty(false)
  }

  return (
    <>
      <CollapsibleSection title="Contato">
        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Telefone 1</label>
                <input className={inputCls} value={draft.telefone ?? ''} onChange={e => set('telefone', e.target.value)} placeholder="(13) 9xxxx-xxxx" />
              </div>
              <div>
                <label className={labelCls}>Telefone 2</label>
                <input className={inputCls} value={draft.telefone2 ?? ''} onChange={e => set('telefone2', e.target.value)} placeholder="(13) 9xxxx-xxxx" />
              </div>
              <div>
                <label className={labelCls}>E-mail 1</label>
                <input className={inputCls} type="email" value={draft.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com" />
              </div>
              <div>
                <label className={labelCls}>E-mail 2</label>
                <input className={inputCls} type="email" value={draft.email2 ?? ''} onChange={e => set('email2', e.target.value)} placeholder="outro@empresa.com" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Endereço</label>
              <input className={inputCls} value={draft.endereco ?? ''} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro" />
            </div>
            <div>
              <label className={labelCls}>Horário de funcionamento</label>
              <input className={inputCls} value={draft.horario ?? ''} onChange={e => set('horario', e.target.value)} placeholder="Seg–Sex 09h–18h" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[0.83rem] font-semibold text-text-strong hover:bg-hover" onClick={tryCancel}>
                Cancelar
              </button>
              <button type="button" className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-[0.83rem] font-semibold text-white hover:brightness-105 disabled:opacity-60" onClick={save} disabled={isPending}>
                {isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <dl className="grid grid-cols-[90px_1fr] gap-x-2.5 gap-y-1.5 text-[0.84rem]">
              <ContactItem label="Telefone 1" value={b.telefone} />
              <ContactItem label="Telefone 2" value={b.telefone2} />
              <ContactItem label="E-mail 1" value={b.email} />
              <ContactItem label="E-mail 2" value={b.email2} />
              <ContactItem label="Endereço" value={b.endereco} />
              <ContactItem label="Horário" value={b.horario} />
            </dl>
            <button type="button" className="mt-3 cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[0.82rem] font-semibold text-text-strong hover:bg-hover" onClick={startEdit}>
              ✏️ Editar contato
            </button>
          </div>
        )}
      </CollapsibleSection>

      <ConfirmDiscardDialog
        open={showDiscard}
        onDiscard={() => { setShowDiscard(false); setEditing(false); setDirty(false) }}
        onKeep={() => setShowDiscard(false)}
      />
    </>
  )
}

function ContactItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="break-words text-text">{value}</dd>
    </>
  )
}

// ─── NotasSection ──────────────────────────────────────────────────────────────

function NotasSection({ b, onPatch, isPending }: { b: BusinessRead; onPatch: (d: BusinessPatch) => void; isPending: boolean }) {
  const [notas, setNotas] = useState<NoteItem[]>(b.notas ?? [])
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Sync when business changes
  const [prevId, setPrevId] = useState(b.id)
  if (b.id !== prevId) {
    setPrevId(b.id)
    setNotas(b.notas ?? [])
    setNewText('')
    setEditingId(null)
  }

  function addNote() {
    const texto = newText.trim()
    if (!texto) return
    const updated = [...notas, { id: uid(), texto, criado_em: new Date().toISOString() }]
    setNotas(updated)
    setNewText('')
    onPatch({ notas: updated })
  }

  function deleteNote(id: string) {
    const updated = notas.filter(n => n.id !== id)
    setNotas(updated)
    onPatch({ notas: updated })
  }

  function startEditNote(note: NoteItem) {
    setEditingId(note.id)
    setEditText(note.texto)
  }

  function saveEditNote(id: string) {
    const texto = editText.trim()
    if (!texto) return
    const updated = notas.map(n => n.id === id ? { ...n, texto } : n)
    setNotas(updated)
    setEditingId(null)
    onPatch({ notas: updated })
  }

  return (
    <CollapsibleSection title="Anotações">
      <div className="flex flex-col gap-2">
        {notas.length === 0 && (
          <p className={cn(muted, 'text-[0.83rem]')}>Nenhuma anotação ainda.</p>
        )}
        {notas.map(note => (
          <div key={note.id} className="rounded-lg border border-border bg-card p-3">
            {editingId === note.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className={cn(inputCls, 'min-h-[72px] resize-y')}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button type="button" className="cursor-pointer text-[0.8rem] text-text-muted hover:text-text" onClick={() => setEditingId(null)}>Cancelar</button>
                  <button type="button" className="cursor-pointer rounded bg-brand px-2.5 py-1 text-[0.8rem] font-semibold text-white hover:brightness-105 disabled:opacity-60" onClick={() => saveEditNote(note.id)} disabled={isPending}>
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[0.84rem] leading-[1.5] text-text whitespace-pre-wrap">{note.texto}</p>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="cursor-pointer rounded p-1 text-[0.78rem] text-text-muted hover:bg-hover hover:text-text" onClick={() => startEditNote(note)} title="Editar">✏️</button>
                  <button type="button" className="cursor-pointer rounded p-1 text-[0.78rem] text-text-muted hover:bg-hover hover:text-[#ef4444]" onClick={() => deleteNote(note.id)} title="Excluir">🗑️</button>
                </div>
              </div>
            )}
            <p className="mt-1 text-[0.72rem] text-text-muted">
              {new Date(note.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        ))}

        {/* Nova nota */}
        <div className="mt-1 flex flex-col gap-2">
          <textarea
            className={cn(inputCls, 'min-h-[64px] resize-y')}
            placeholder="Adicionar anotação…"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote() }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.74rem] text-text-muted">Ctrl+Enter para salvar</span>
            <button type="button" className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-[0.82rem] font-semibold text-white hover:brightness-105 disabled:opacity-60" onClick={addNote} disabled={isPending || !newText.trim()}>
              + Adicionar
            </button>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}

// ─── PresencaSection ──────────────────────────────────────────────────────────

function PresencaSection({ b, cidade, onPatch, isPending }: { b: BusinessRead; cidade?: string; onPatch: (d: BusinessPatch) => void; isPending: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<BusinessRead>>({})
  const [dirty, setDirty] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)

  const temSitePróprio = !!b?.website && !websiteIsSocial(b)
  const socials = b ? socialLinks(b) : []
  const nome = b.nome ?? ''

  function startEdit() {
    setDraft({
      website: b.website ?? '',
      instagram: b.instagram ?? '',
      facebook: b.facebook ?? '',
      linkedin: b.linkedin ?? '',
    })
    setDirty(false)
    setEditing(true)
  }

  function set(k: string, v: string) {
    setDraft(d => ({ ...d, [k]: v }))
    setDirty(true)
  }

  function tryCancel() {
    if (dirty) setShowDiscard(true)
    else setEditing(false)
  }

  function save() {
    onPatch({
      website: draft.website || null,
      instagram: draft.instagram || null,
      facebook: draft.facebook || null,
      linkedin: draft.linkedin || null,
    })
    setEditing(false)
    setDirty(false)
  }

  return (
    <>
      <CollapsibleSection title="Presença online">
        {editing ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelCls}>Site</label>
              <input className={inputCls} value={draft.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="https://empresa.com.br" />
            </div>
            <div>
              <label className={labelCls}>Instagram</label>
              <input className={inputCls} value={draft.instagram ?? ''} onChange={e => set('instagram', e.target.value)} placeholder="https://instagram.com/empresa" />
            </div>
            <div>
              <label className={labelCls}>Facebook</label>
              <input className={inputCls} value={draft.facebook ?? ''} onChange={e => set('facebook', e.target.value)} placeholder="https://facebook.com/empresa" />
            </div>
            <div>
              <label className={labelCls}>LinkedIn</label>
              <input className={inputCls} value={draft.linkedin ?? ''} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/company/empresa" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[0.83rem] font-semibold text-text-strong hover:bg-hover" onClick={tryCancel}>
                Cancelar
              </button>
              <button type="button" className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-[0.83rem] font-semibold text-white hover:brightness-105 disabled:opacity-60" onClick={save} disabled={isPending}>
                {isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {temSitePróprio && (
              <p className="mb-2 text-[0.84rem]">
                🌐 <a className="break-all text-brand hover:underline" href={b.website!} target="_blank" rel="noreferrer">
                  {b.website!.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </p>
            )}
            {socials.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {socials.map(s => (
                  <a key={s.network} className="rounded-full border border-border bg-brand-faint px-2.5 py-1 text-[0.83rem] text-brand no-underline hover:bg-hover" href={s.url} target="_blank" rel="noreferrer">
                    {NETWORK_ICON[s.network]} {s.label}{s.handle ? ` · @${s.handle}` : ''}
                  </a>
                ))}
              </div>
            )}
            {!temSitePróprio && socials.length === 0 && (
              <p className={cn(muted, 'mb-2')}>Nenhum link de presença web detectado.</p>
            )}
            <div className="mb-3 flex flex-wrap items-center gap-2.5 text-[0.84rem]">
              <span className={muted}>Buscar perfis:</span>
              <a className="font-semibold no-underline" href={instagramSearchUrl(nome, cidade)} target="_blank" rel="noreferrer">📷 Instagram</a>
              <a className="font-semibold no-underline" href={linkedinSearchUrl(nome, cidade)} target="_blank" rel="noreferrer">💼 LinkedIn</a>
            </div>
            <button type="button" className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[0.82rem] font-semibold text-text-strong hover:bg-hover" onClick={startEdit}>
              ✏️ Editar presença online
            </button>
          </div>
        )}
      </CollapsibleSection>

      <ConfirmDiscardDialog
        open={showDiscard}
        onDiscard={() => { setShowDiscard(false); setEditing(false); setDirty(false) }}
        onKeep={() => setShowDiscard(false)}
      />
    </>
  )
}

// ─── ResumoSection ────────────────────────────────────────────────────────────

function ResumoSection({ b, onPatch, isPending }: { b: BusinessRead; onPatch: (d: BusinessPatch) => void; isPending: boolean }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)

  const displayResumo = b.resumo_manual || b.resumo

  function startEdit() {
    setText(b.resumo_manual ?? b.resumo ?? '')
    setDirty(false)
    setEditing(true)
  }

  function tryCancel() {
    if (dirty) setShowDiscard(true)
    else setEditing(false)
  }

  function save() {
    onPatch({ resumo_manual: text || null })
    setEditing(false)
    setDirty(false)
  }

  return (
    <>
      <CollapsibleSection title="Resumo da empresa">
        {editing ? (
          <div className="flex flex-col gap-3">
            <textarea
              className={cn(inputCls, 'min-h-[120px] resize-y leading-[1.55]')}
              value={text}
              onChange={e => { setText(e.target.value); setDirty(true) }}
              placeholder="Descreva o negócio, produtos, diferenciais…"
              autoFocus
            />
            {b.resumo_manual && (
              <p className="text-[0.75rem] text-text-muted">O texto acima substituirá o resumo automático.</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[0.83rem] font-semibold text-text-strong hover:bg-hover" onClick={tryCancel}>
                Cancelar
              </button>
              <button type="button" className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-[0.83rem] font-semibold text-white hover:brightness-105 disabled:opacity-60" onClick={save} disabled={isPending}>
                {isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {displayResumo ? (
              <p className="mb-3 text-[0.85rem] leading-[1.55] text-text">{displayResumo}</p>
            ) : (
              <div className="mb-3 flex flex-col items-start gap-2">
                <p className={muted}>Resumo automático ainda não disponível.</p>
                <a className={cn(act, 'bg-transparent')} href={googleSearchUrl(`${b.nome ?? ''} ${b.endereco ?? ''} sobre`)} target="_blank" rel="noreferrer">
                  🔎 Pesquisar sobre a empresa
                </a>
              </div>
            )}
            {b.resumo_manual && (
              <p className="mb-2 text-[0.74rem] text-text-muted">✏️ Resumo editado manualmente</p>
            )}
            <button type="button" className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[0.82rem] font-semibold text-text-strong hover:bg-hover" onClick={startEdit}>
              ✏️ Editar resumo
            </button>
          </div>
        )}
      </CollapsibleSection>

      <ConfirmDiscardDialog
        open={showDiscard}
        onDiscard={() => { setShowDiscard(false); setEditing(false); setDirty(false) }}
        onKeep={() => setShowDiscard(false)}
      />
    </>
  )
}

// ─── ConfirmDiscardDialog ─────────────────────────────────────────────────────

function ConfirmDiscardDialog({ open, onDiscard, onKeep }: { open: boolean; onDiscard: () => void; onKeep: () => void }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onKeep() }}>
      <DialogContent className="max-w-[380px]" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Descartar alterações?</DialogTitle>
        </DialogHeader>
        <p className="text-[0.86rem] text-text-muted">
          Você tem edições não salvas. Se sair agora, elas serão perdidas.
        </p>
        <DialogFooter>
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-[0.86rem] font-semibold text-text-strong hover:bg-hover"
            onClick={onKeep}
          >
            Continuar editando
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-[#dc2626] px-4 py-2 text-[0.86rem] font-semibold text-white hover:brightness-105"
            onClick={onDiscard}
          >
            Descartar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

