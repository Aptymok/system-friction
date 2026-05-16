'use client'

import { CalendarClock, Check, Pencil, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { SocialProvider } from '@/lib/types'
import { useNodeStore } from '@/observatory/store/nodeStore'

type PublicationApprovalProps = {
  open: boolean
  provider: SocialProvider
  initialText: string
  initialDate: string
  imageUrl?: string | null
  onClose: () => void
  onAccepted?: () => void
}

export function PublicationApproval({
  open,
  provider,
  initialText,
  initialDate,
  imageUrl,
  onClose,
  onAccepted,
}: PublicationApprovalProps) {
  const node = useNodeStore((state) => state.node)
  const addLog = useNodeStore((state) => state.addLog)
  const [text, setText] = useState(initialText)
  const [scheduledFor, setScheduledFor] = useState(initialDate)
  const [editing, setEditing] = useState(false)
  const [autonomousAmv, setAutonomousAmv] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const closeOnEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEsc)
    return () => window.removeEventListener('keydown', closeOnEsc)
  }, [onClose, open])

  useEffect(() => {
    setText(initialText)
    setScheduledFor(initialDate)
  }, [initialDate, initialText])

  if (!open) return null

  const accept = async () => {
    if (!node || loading) return
    setLoading(true)
    setError(null)

    const response = await fetch('/api/social/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: node.id,
        provider,
        text,
        media_url: imageUrl || undefined,
        scheduled_for: new Date(scheduledFor).toISOString(),
        autonomous_amv: autonomousAmv,
        mode: 'schedule',
      }),
    })
    const result = await response.json()
    setLoading(false)

    if (!response.ok || !result.success) {
      setError(result.error || 'No se pudo guardar la publicacion')
      addLog(result.error || 'Publicacion rechazada por el scheduler', 'publication', 'evasion')
      return
    }

    addLog(`Publicacion aceptada para ${provider}: ${new Date(scheduledFor).toLocaleString()}`, 'publication', 'executionMinimum')
    onAccepted?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="terminal-panel relative w-full max-w-2xl overflow-hidden border border-gold/20 bg-[#080807] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.8)]">
        <div className="scanline" />
        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-gold/10 pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">Aceptacion de publicacion</p>
              <h2 className="mt-2 text-lg font-semibold uppercase tracking-[0.16em] text-paper">{provider}</h2>
            </div>
            <button onClick={onClose} className="rounded border border-white/10 p-2 text-zinc-500 transition hover:border-gold/30 hover:text-gold" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>

          {imageUrl && (
            <div className="mb-4 overflow-hidden border border-white/10 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="max-h-64 w-full object-cover" />
            </div>
          )}

          <div className="space-y-4">
            {editing ? (
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="min-h-40 w-full border border-gold/20 bg-black/50 p-3 font-mono text-sm text-paper outline-none focus:border-gold/50"
              />
            ) : (
              <div className="border border-white/10 bg-black/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{text}</p>
              </div>
            )}

            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <CalendarClock className="h-3.5 w-3.5 text-gold" />
                Fecha de publicacion
              </span>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="w-full border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-gold/50"
              />
            </label>

            <label className="flex items-center gap-3 border border-white/10 bg-black/30 p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              <input
                type="checkbox"
                checked={autonomousAmv}
                onChange={(event) => setAutonomousAmv(event.target.checked)}
                className="h-4 w-4 accent-gold"
              />
              Agente Minimo Viable Autonomo
            </label>

            {error && <p className="border-l border-signalRed bg-signalRed/10 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-red-200">{error}</p>}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button onClick={accept} disabled={loading} className="flex items-center justify-center gap-2 bg-gold px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-void transition hover:bg-paper disabled:opacity-40">
              <Check className="h-4 w-4" />
              {loading ? 'Guardando' : 'Aceptar y publicar'}
            </button>
            <button onClick={() => setEditing((value) => !value)} className="flex items-center justify-center gap-2 border border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300 transition hover:border-gold/30 hover:text-gold">
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            <button onClick={onClose} className="flex items-center justify-center gap-2 border border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition hover:border-signalRed/30 hover:text-red-200">
              <Send className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
