'use client'

import { useMemo, useState } from 'react'
import { MiniReadout, PanelFrame } from './PanelFrame'

const TERMS = ['friccion', 'evidencia', 'atractor', 'mihm', 'worldspect', 'regimen', 'densidad', 'persistencia', 'deuda', 'verificacion']
const CONTRADICTIONS = ['pero', 'aunque', 'sin embargo', 'contradice', 'inconsistente']
const AMBIGUITY = ['quizas', 'tal vez', 'creo', 'parece', 'posible', 'probable']

function countTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  return terms.reduce((sum, term) => sum + (lower.match(new RegExp(term, 'g'))?.length ?? 0), 0)
}

export function PanelSemanticPressure({ onText }: { onText: (text: string) => void }) {
  const [text, setText] = useState('')
  const stats = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean)
    const sfiTerms = countTerms(text, TERMS)
    return {
      length: text.length,
      density: words.length ? sfiTerms / words.length : 0,
      contradiction: countTerms(text, CONTRADICTIONS),
      ambiguity: countTerms(text, AMBIGUITY),
    }
  }, [text])

  function update(value: string) {
    setText(value)
    onText(value)
  }

  return (
    <PanelFrame title="PRESION SEMANTICA" topo="ZONE-B" className="w-[430px]">
      <textarea value={text} onChange={(event) => update(event.target.value)} placeholder="Texto, senal cultural o hipotesis. No sustituye AMV." className="h-[110px] w-full resize-none border border-[#d8b64a24] bg-[#080706] p-3 font-mono text-[10px] leading-5 text-[#e0d6c1] outline-none placeholder:text-[#6f6658]" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniReadout label="longitud" value={String(stats.length)} />
        <MiniReadout label="densidad SFI" value={stats.density.toFixed(2)} />
        <MiniReadout label="contradiccion" value={String(stats.contradiction)} hot={stats.contradiction > 0} />
        <MiniReadout label="ambiguedad" value={String(stats.ambiguity)} hot={stats.ambiguity > 1} />
      </div>
    </PanelFrame>
  )
}
