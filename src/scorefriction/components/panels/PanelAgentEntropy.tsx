'use client'

import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

const AGENTS = ['AMV', 'MIHM', 'WorldSpect', 'MonteCarlo', 'Ledger', 'Attractor']

export function PanelAgentEntropy({ context }: { context: ScoreFrictionPanelContext }) {
  const weights = AGENTS.map((agent, index) => {
    const base = agent === 'AMV' && context.pipeline.amv ? 0.82 : agent === 'Ledger' && context.pipeline.stored ? 0.7 : 0.32 + index * 0.05
    return Math.min(1, base + context.metrics.fs * 0.18)
  })
  return (
    <PanelFrame title="ENTROPIA / AGENTE" topo="ZONE-B" className="w-[390px]">
      <svg viewBox="0 0 350 160" className="h-[160px] w-full">
        {AGENTS.map((agent, index) => {
          const angle = -Math.PI / 2 + index * (Math.PI * 2 / AGENTS.length)
          const weight = weights[index]
          const x = 175 + Math.cos(angle) * 102
          const y = 80 + Math.sin(angle) * 52
          return (
            <g key={agent}>
              <line x1="175" y1="80" x2={x} y2={y} stroke="rgba(216,182,74,.12)" />
              <ellipse cx={x} cy={y} rx={12 + weight * 22} ry={9 + weight * 12 + Math.sin(index) * 4} fill="rgba(216,182,74,.14)" stroke="#d8b64a" />
              <text x={x} y={y + 34} textAnchor="middle" className="fill-[#b8ad98] font-mono text-[9px]">{agent}</text>
            </g>
          )
        })}
        <circle cx="175" cy="80" r="18" fill="rgba(216,182,74,.16)" stroke="#e0c46c" />
      </svg>
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6f6658]">peso agente deformado por evidencia, AMV y ledger</div>
    </PanelFrame>
  )
}
