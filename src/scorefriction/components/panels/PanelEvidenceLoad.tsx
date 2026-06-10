'use client'

import { useState } from 'react'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPipeline } from './panel-types'

export type ScoreFrictionInput = {
  caseId: string
  kind: 'json' | 'audio' | 'text' | 'url'
  label: string
  raw: string
  sourceUrl?: string
  vectors?: Record<string, unknown>
}

export function PanelEvidenceLoad({ pipeline, onRun }: { pipeline: ScoreFrictionPipeline; onRun: (input: ScoreFrictionInput) => Promise<void> }) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(input: ScoreFrictionInput) {
    setBusy(true)
    try {
      await onRun(input)
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File | null) {
    if (!file) return
    const isAudio = file.type.startsWith('audio/')
    const raw = isAudio ? `audio:${file.name}:${file.type}:${file.size}` : await file.text()
    await run({ caseId: `SF-${Date.now().toString(36)}`, kind: isAudio ? 'audio' : file.name.endsWith('.json') ? 'json' : 'text', label: file.name, raw })
  }

  return (
    <PanelFrame title="CARGA / EVIDENCIA" topo="ZONE-C" className="w-[500px]">
      <label className="grid h-20 cursor-pointer place-items-center border border-dashed border-[#d8b64a44] bg-[#0b0a08] font-mono text-[10px] uppercase tracking-[0.18em] text-[#d8b64a]">
        drop / seleccionar JSON, audio o texto
        <input type="file" className="hidden" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
      </label>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="URL publica..." className="border border-[#d8b64a24] bg-[#080706] px-3 py-2 font-mono text-[10px] text-[#e0d6c1] outline-none" />
        <button disabled={!url.trim() || busy} onClick={() => void run({ caseId: `SF-${Date.now().toString(36)}`, kind: 'url', label: url, raw: url, sourceUrl: url })} className="border border-[#d8b64a33] px-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8b64a] disabled:text-[#6f6658]">URL</button>
      </div>
      <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Texto observado..." className="mt-3 h-16 w-full resize-none border border-[#d8b64a24] bg-[#080706] p-2 font-mono text-[10px] text-[#e0d6c1] outline-none" />
      <button disabled={!text.trim() || busy} onClick={() => void run({ caseId: `SF-${Date.now().toString(36)}`, kind: 'text', label: 'manual-text', raw: text })} className="mt-2 border border-[#d8b64a33] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8b64a] disabled:text-[#6f6658]">{busy ? 'Ejecutando pipeline' : 'Ejecutar pipeline'}</button>
      <pre className="mt-3 max-h-20 overflow-auto whitespace-pre-wrap border border-[#d8b64a12] bg-[#080706] p-2 font-mono text-[9px] text-[#9c9282]">{JSON.stringify({ status: pipeline.status, stored: pipeline.stored, evidence: pipeline.evidence?.hash, warnings: pipeline.warnings }, null, 2)}</pre>
    </PanelFrame>
  )
}
