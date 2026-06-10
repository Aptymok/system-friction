'use client'

import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'
import { n, s } from './panel-types'

export function PanelStochasticProjection({ context }: { context: ScoreFrictionPanelContext }) {
  const montecarlo = context.pipeline.montecarlo ?? context.pipeline.engine
  const warnings = Array.isArray(montecarlo?.warnings) ? montecarlo.warnings.map(String) : []
  const points = Array.from({ length: 9 }, (_, index) => {
    const base = context.metrics.phi
    const wobble = Math.sin(index * 1.3 + context.metrics.ldi) * 0.12
    return Math.max(0.04, Math.min(0.96, base + wobble + index * 0.025))
  })
  return (
    <PanelFrame title="PROYECCION ESTOCASTICA" topo="ZONE-B" className="w-[420px]">
      <svg viewBox="0 0 390 150" className="h-[150px] w-full">
        {points.map((point, index) => {
          const x = 24 + index * 42
          const y = 130 - point * 105
          const next = points[index + 1]
          return (
            <g key={index}>
              {typeof next === 'number' ? <line x1={x} y1={y} x2={24 + (index + 1) * 42} y2={130 - next * 105} stroke="rgba(216,182,74,.3)" /> : null}
              <circle cx={x} cy={y} r={6 + point * 8} fill="rgba(216,182,74,.18)" stroke="#d8b64a" />
            </g>
          )
        })}
      </svg>
      <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">
        <div>fuente: {s(montecarlo?.source, 'typescript-fallback')}</div>
        <div>runs: {n(montecarlo?.mc_runs ?? montecarlo?.runs, 0)}</div>
        <div>atractores futuros: {context.runtime.proto.length || 'sin filas'}</div>
        <div>energia: {(context.metrics.fs * 100).toFixed(1)}%</div>
      </div>
      {warnings.length ? <div className="mt-2 text-[9px] text-[#b85050]">{warnings.join(', ')}</div> : null}
    </PanelFrame>
  )
}
