'use client'

import { useMemo, useState } from 'react'
import { WORLDSPECT_DOMAINS } from '@/lib/worldspect/vector-contract'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'
import { n, s } from './panel-types'

export function PanelLongitudinalTension({ context }: { context: ScoreFrictionPanelContext }) {
  const [domain, setDomain] = useState('ALL')
  const rows = useMemo(() => context.runtime.chronology.slice(0, 16), [context.runtime.chronology])
  return (
    <PanelFrame title="TENSION LONGITUDINAL" topo="ZONE-B" className="w-[460px]">
      <div className="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {['ALL', ...WORLDSPECT_DOMAINS].map((item) => (
          <button key={item} onClick={() => setDomain(item)} className={domain === item ? 'border border-[#d8b64a66] px-2 py-1 font-mono text-[8px] text-[#e0c46c]' : 'border border-[#d8b64a18] px-2 py-1 font-mono text-[8px] text-[#6f6658]'}>
            {item}
          </button>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 top-20 bg-[radial-gradient(ellipse_at_center,rgba(216,182,74,.08),transparent_60%)]" />
      <svg viewBox="0 0 420 150" className="relative h-[150px] w-full">
        {rows.length ? rows.map((row, index) => {
          const density = n(row.density ?? row.confidence ?? row.delta, 0.2)
          const x = 14 + index * 25
          const y = 130 - density * 105
          return <circle key={`${s(row.id, 'row')}-${index}`} cx={x} cy={y} r={4 + density * 8} fill="rgba(216,182,74,.34)" />
        }) : <text x="14" y="80" className="fill-[#b85050] font-mono text-[10px]">sin trayectoria longitudinal</text>}
        {rows.length > 1 ? <polyline points={rows.map((row, index) => `${14 + index * 25},${130 - n(row.density ?? row.confidence ?? row.delta, 0.2) * 105}`).join(' ')} fill="none" stroke="#d8b64a" strokeWidth="1.2" /> : null}
      </svg>
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6f6658]">{domain} / {rows.length || context.runtime.messages.longitudinal || 'sin datos'}</div>
    </PanelFrame>
  )
}
