'use client'

import { useMemo, useState } from 'react'
import { MiniReadout, PanelFrame } from './PanelFrame'

const TERMS = ['friccion', 'evidencia', 'atractor', 'mihm', 'worldspect', 'regimen', 'densidad', 'persistencia', 'deuda', 'verificacion']
const NARRATIVE_TERMS = ['hook', 'coro', 'verso', 'lirica', 'letra', 'ritual', 'pertenencia', 'futuro', 'agencia', 'territorio']
const CONTRADICTIONS = ['pero', 'aunque', 'sin embargo', 'contradice', 'inconsistente']
const AMBIGUITY = ['quizas', 'tal vez', 'creo', 'parece', 'posible', 'probable']
const MISSING = 'FALTA INGESTA DE DATOS'

function countTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  return terms.reduce((sum, term) => sum + (lower.match(new RegExp(term, 'g'))?.length ?? 0), 0)
}

export function PanelSemanticPressure({ caseId, onText, onPersisted }: { caseId: string; onText: (text: string) => void; onPersisted: () => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const stats = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean)
    const sfiTerms = countTerms(text, TERMS)
    const narrativeTerms = countTerms(text, NARRATIVE_TERMS)
    return {
      length: text.length,
      density: words.length ? sfiTerms / words.length : 0,
      narrativePressure: words.length ? narrativeTerms / words.length : 0,
      contradiction: countTerms(text, CONTRADICTIONS),
      ambiguity: countTerms(text, AMBIGUITY),
    }
  }, [text])

  function update(value: string) {
    setText(value)
    onText(value)
  }

  async function persistNarrative() {
    if (!text.trim()) return
    setBusy(true)
    setStatus('persistiendo')
    try {
      const response = await fetch('/api/scorefriction/observe/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          source_name: 'lyrics_narrative_pressure',
          territory: 'UNSPECIFIED',
          raw_payload: {
            title: 'lyrics/narrative pressure',
            text,
            narrativePressure: stats.narrativePressure,
            contradiction: stats.contradiction,
            ambiguity: stats.ambiguity,
          },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      setStatus(response.ok ? 'observacion persistida' : String(payload.error ?? 'persistencia no disponible'))
      await onPersisted()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'persistencia no disponible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelFrame title="LYRICS / NARRATIVE PRESSURE" topo="ZONE-B" className="w-[430px]">
      <textarea value={text} onChange={(event) => update(event.target.value)} placeholder="letra, coro, hook o presion narrativa observada..." className="h-[110px] w-full resize-none border border-[#d8b64a24] bg-[#080706] p-3 font-mono text-[10px] leading-5 text-[#e0d6c1] outline-none placeholder:text-[#6f6658]" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniReadout label="longitud" value={String(stats.length)} />
        <MiniReadout label="narrative pressure" value={text.trim() ? stats.narrativePressure.toFixed(2) : MISSING} />
        <MiniReadout label="contradiccion" value={String(stats.contradiction)} hot={stats.contradiction > 0} />
        <MiniReadout label="ambiguedad" value={String(stats.ambiguity)} hot={stats.ambiguity > 1} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button disabled={!text.trim() || busy} onClick={() => void persistNarrative()} className="border border-[#d8b64a33] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8b64a] disabled:text-[#6f6658]">
          {busy ? 'persistiendo' : 'persistir narrativa'}
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">{status || (text.trim() ? `density ${stats.density.toFixed(2)}` : MISSING)}</span>
      </div>
    </PanelFrame>
  )
}
