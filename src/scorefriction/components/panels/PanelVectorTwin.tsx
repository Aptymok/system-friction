'use client'

import { WORLDSPECT_DOMAINS } from '@/lib/worldspect/vector-contract'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

export function PanelVectorTwin({ context }: { context: ScoreFrictionPanelContext }) {
  const vectors = context.world?.vectors ?? []
  return (
    <PanelFrame title="VECTOR TWIN" topo="ZONE-A" className="w-[360px]">
      <svg viewBox="0 0 320 220" className="h-[calc(100%-28px)] w-full">
        <line x1="160" y1="20" x2="160" y2="200" stroke="rgba(216,182,74,.08)" />
        <line x1="40" y1="110" x2="280" y2="110" stroke="rgba(216,182,74,.08)" />
        {WORLDSPECT_DOMAINS.map((domain, index) => {
          const vector = vectors.find((item) => item.domain === domain)
          const value = vector?.value ?? 0.08
          const angle = -Math.PI / 2 + index * 0.63
          const skew = (vector?.degradation ?? 0.7) * 18
          const x = 160 + Math.cos(angle) * (45 + value * 95) + Math.sin(index) * skew
          const y = 110 + Math.sin(angle) * (30 + value * 70) + Math.cos(index) * skew
          return (
            <g key={domain}>
              <line x1="160" y1="110" x2={x} y2={y} stroke="rgba(216,182,74,.12)" />
              <ellipse cx={x} cy={y} rx={7 + value * 18} ry={5 + (vector?.volatility ?? 0.2) * 18} fill="rgba(216,182,74,.16)" stroke="#d8b64a" transform={`rotate(${index * 13} ${x} ${y})`} />
              <text x={x} y={y + 28} textAnchor="middle" className="fill-[#b8ad98] font-mono text-[8px]">{domain.slice(0, 4)}</text>
            </g>
          )
        })}
      </svg>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6f6658]">
        {context.world ? 'WorldSpectVector activo' : 'worldspect_unavailable / twin degradado'}
      </div>
    </PanelFrame>
  )
}
