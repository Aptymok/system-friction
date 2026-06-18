'use client'

import { useMemo, useState } from 'react'
import { PanelFrame } from './PanelFrame'
import type { Row, ScoreFrictionPanelContext } from './panel-types'
import { n, s } from './panel-types'

const MISSING = 'FALTA INGESTA DE DATOS'

function label(row: Row) {
  return s(row.name ?? row.label ?? row.proto_attractor_id ?? row.id, MISSING)
}

function evidenceSignal(entry: Row) {
  const reliability = n(entry.reliability_score, 0)
  const coverage = n(entry.source_coverage_contribution, 0)
  if (reliability >= 0.67 || coverage >= 0.5) return 'strong'
  if (reliability > 0.2 || coverage > 0) return 'weak'
  return 'noise'
}

export function PanelModelUncertainty({ context, onPersisted }: { context: ScoreFrictionPanelContext; onPersisted: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const groups = useMemo(() => {
    const strong = context.evidenceEntries.filter((entry) => evidenceSignal(entry) === 'strong')
    const weak = context.evidenceEntries.filter((entry) => evidenceSignal(entry) === 'weak')
    const noise = context.evidenceEntries.filter((entry) => evidenceSignal(entry) === 'noise')
    return { strong, weak, noise }
  }, [context.evidenceEntries])

  async function persistDirection() {
    setBusy(true)
    setStatus('persistiendo direccion')
    try {
      const response = await fetch('/api/scorefriction/proto-attractors/detect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ case_id: context.caseId }),
      })
      const payload = await response.json().catch(() => ({}))
      setStatus(response.ok ? `persistido: ${n(payload.count ?? payload.data?.length, 0)} protoatractores` : s(payload.error, 'persistencia no disponible'))
      await onPersisted()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'persistencia no disponible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelFrame title="MODEL UNCERTAINTY / DIRECCION DEL MUNDO" topo="ZONE-B">
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-3 p-3">
        <div className="grid grid-cols-4 gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#8a8172]">
          <div className="border border-[#d8b64a18] bg-[#080706] p-2">fenomeno<br /><span className="text-[#e0c46c]">{context.cultural?.interpretation?.phenomenon ?? MISSING}</span></div>
          <div className="border border-[#d8b64a18] bg-[#080706] p-2">atractores<br /><span className="text-[#e0c46c]">{context.runtime.proto.length || MISSING}</span></div>
          <div className="border border-[#d8b64a18] bg-[#080706] p-2">senal fuerte<br /><span className="text-[#e0c46c]">{groups.strong.length || MISSING}</span></div>
          <div className="border border-[#d8b64a18] bg-[#080706] p-2">ruido<br /><span className="text-[#e0c46c]">{groups.noise.length || MISSING}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpen((value) => !value)} className="border border-[#d8b64a33] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8b64a]">
            desglose de estado de direccion del mundo
          </button>
          <button disabled={busy} onClick={() => void persistDirection()} className="border border-[#d8b64a33] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8b64a] disabled:text-[#6f6658]">
            {busy ? 'persistiendo' : 'persistir protoatractores'}
          </button>
        </div>
        <div className="min-h-0 overflow-auto border border-[#d8b64a12] bg-[#080706]/80 p-3 font-mono text-[9px] leading-5 text-[#9c9282]">
          {status ? <div className="mb-2 text-[#e0c46c]">{status}</div> : null}
          {open ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 uppercase tracking-[0.16em] text-[#d8b64a]">atractores</div>
                {context.runtime.proto.length ? context.runtime.proto.map((row, index) => (
                  <div key={`${label(row)}-${index}`} className="mb-1 border-b border-[#d8b64a12] pb-1">
                    {label(row)} / confidence {n(row.confidence, 0).toFixed(2)} / density {n(row.density, 0).toFixed(2)}
                  </div>
                )) : MISSING}
              </div>
              <div>
                <div className="mb-1 uppercase tracking-[0.16em] text-[#d8b64a]">ejectores / verificaciones</div>
                {context.runtime.verifications.length ? context.runtime.verifications.slice(0, 6).map((row, index) => (
                  <div key={index} className="mb-1 border-b border-[#d8b64a12] pb-1">{s(row.platform ?? row.id, MISSING)} / {s(row.status ?? row.created_at, '')}</div>
                )) : MISSING}
              </div>
              <div>
                <div className="mb-1 uppercase tracking-[0.16em] text-[#d8b64a]">senales fuertes</div>
                {groups.strong.length ? groups.strong.slice(0, 6).map((row) => <div key={s(row.id)}>{s(row.summary, MISSING)}</div>) : MISSING}
              </div>
              <div>
                <div className="mb-1 uppercase tracking-[0.16em] text-[#d8b64a]">senales debiles / ruido</div>
                {[...groups.weak, ...groups.noise].length ? [...groups.weak, ...groups.noise].slice(0, 6).map((row) => <div key={s(row.id)}>{s(row.summary, MISSING)}</div>) : MISSING}
              </div>
            </div>
          ) : (
            <div>clic para abrir desglose. {context.evidenceEntries.length ? `${context.evidenceEntries.length} evidencias leidas` : MISSING}</div>
          )}
        </div>
      </div>
    </PanelFrame>
  )
}
