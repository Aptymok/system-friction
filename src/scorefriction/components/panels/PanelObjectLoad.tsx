'use client'

import { useState } from 'react'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionInput } from './PanelEvidenceLoad'
import type { Row, ScoreFrictionPanelContext } from './panel-types'
import { s } from './panel-types'

const MISSING = 'FALTA INGESTA DE DATOS'

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}

export function PanelObjectLoad({ context, onRun }: { context: ScoreFrictionPanelContext; onRun: (input: ScoreFrictionInput) => Promise<void> }) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [territory, setTerritory] = useState('UNSPECIFIED')
  const [result, setResult] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)

  async function mapObject() {
    setBusy(true)
    try {
      const response = await fetch('/api/scorefriction/cultural-object', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: context.caseId,
          label: label.trim() || url.trim() || 'cultural-signal-object',
          sourceUrl: url.trim() || undefined,
          territory,
          worldSpectVector: context.world,
          culturalVector: context.cultural?.cultural_vector ?? {},
          frictionVector: context.pipeline.engine?.metrics ?? {},
        }),
      })
      setResult(await response.json().catch(() => ({ ok: false, error: 'invalid_json' })))
    } finally {
      setBusy(false)
    }
  }

  async function persistAsEvidence() {
    if (!result) return
    await onRun({
      caseId: context.caseId,
      kind: 'json',
      label: label.trim() || 'cultural-signal-object',
      raw: JSON.stringify(result),
      sourceUrl: url.trim() || undefined,
      vectors: {
        world: context.world,
        cultural: context.cultural?.cultural_vector,
      },
    })
  }

  const object = record(result?.object)
  const phenomenon = record(result?.phenomenon)

  return (
    <PanelFrame title="CARGA DE OBJETO" topo="ZONE-C">
      <div className="grid h-full grid-rows-[auto_1fr_auto] gap-3 p-3">
        <div className="grid grid-cols-[1fr_1fr_140px_auto] gap-2">
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="objeto cultural..." className="min-w-0 border border-[#d8b64a24] bg-[#080706] px-3 py-2 font-mono text-[10px] text-[#e0d6c1] outline-none" />
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="url fuente..." className="min-w-0 border border-[#d8b64a24] bg-[#080706] px-3 py-2 font-mono text-[10px] text-[#e0d6c1] outline-none" />
          <input value={territory} onChange={(event) => setTerritory(event.target.value)} placeholder="territorio" className="min-w-0 border border-[#d8b64a24] bg-[#080706] px-3 py-2 font-mono text-[10px] text-[#e0d6c1] outline-none" />
          <button disabled={busy || (!label.trim() && !url.trim())} onClick={() => void mapObject()} className="border border-[#d8b64a33] px-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8b64a] disabled:text-[#6f6658]">
            mapear
          </button>
        </div>
        <div className="min-h-0 overflow-auto border border-[#d8b64a12] bg-[#080706]/80 p-3 font-mono text-[9px] leading-5 text-[#9c9282]">
          {result ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="uppercase tracking-[0.16em] text-[#d8b64a]">objeto</div>
                <div>{s(object.id ?? object.label, MISSING)}</div>
                <div>{s(object.territory, '')}</div>
              </div>
              <div>
                <div className="uppercase tracking-[0.16em] text-[#d8b64a]">fenomeno emergente</div>
                <div>{s(phenomenon.label ?? phenomenon.phenomenonCandidate, MISSING)}</div>
                <div>{s(phenomenon.status ?? phenomenon.kind, '')}</div>
              </div>
            </div>
          ) : MISSING}
        </div>
        <button disabled={!result || busy} onClick={() => void persistAsEvidence()} className="w-fit border border-[#d8b64a33] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8b64a] disabled:text-[#6f6658]">
          persistir como evidencia operacional
        </button>
      </div>
    </PanelFrame>
  )
}
