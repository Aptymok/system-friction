'use client'

import { useEffect, useState } from 'react'

type PhenomenonRow = Record<string, unknown>

function s(value: unknown, fallback = 'sin datos') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function n(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function PhenomenonField({ module, compact = false }: { module?: string; compact?: boolean }) {
  const [rows, setRows] = useState<PhenomenonRow[]>([])
  const [source, setSource] = useState('loading')

  useEffect(() => {
    const params = module ? `?module=${encodeURIComponent(module)}` : ''
    fetch(`/api/phenomena${params}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((json: { data?: PhenomenonRow[]; source?: string; warning?: string }) => {
        setRows(Array.isArray(json.data) ? json.data : [])
        setSource(json.warning ? `${json.source ?? 'unknown'} / ${json.warning}` : json.source ?? 'unknown')
      })
      .catch((error: Error) => setSource(error.message))
  }, [module])

  return (
    <section className={`border border-[#c8a95122] bg-[#060605]/92 p-3 font-mono text-[#c8c4b8] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
      <div className="mb-3 flex items-center justify-between gap-3 uppercase tracking-[0.18em]">
        <span className="text-[#c8a951]">Phenomenon Field</span>
        <span className="text-[#6f6658]">{source}</span>
      </div>
      <div className="space-y-2">
        {rows.length ? rows.slice(0, compact ? 4 : 10).map((row, index) => (
          <div key={s(row.phenomenon_key ?? row.phenomenonKey, `phenomenon-${index}`)} className="border border-[#c8a95114] bg-[#080706] p-2">
            <div className="text-[#e0c46c]">{s(row.label)}</div>
            <div className="mt-1 uppercase tracking-[0.12em] text-[#6f6658]">
              {s(row.module)} / {s(row.regime ?? (row.promotion as { regime?: string } | undefined)?.regime)} / D {n(row.density).toFixed(2)} / T {n(row.trust).toFixed(2)}
            </div>
          </div>
        )) : <div className="border border-[#b8505033] p-3 text-[#b85050]">sin fenomenos persistentes</div>}
      </div>
    </section>
  )
}
