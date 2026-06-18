'use client'

import { PanelFrame } from './PanelFrame'
import type { Row, ScoreFrictionPanelContext } from './panel-types'
import { n, s } from './panel-types'

const MISSING = 'FALTA INGESTA DE DATOS'

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}

function projectionRows(context: ScoreFrictionPanelContext) {
  const detected = rows(context.pipeline.attractors?.data)
  const montecarlo = rows(context.pipeline.montecarlo?.data ?? context.pipeline.montecarlo?.scenarios ?? context.pipeline.montecarlo?.results)
  return [...context.runtime.proto, ...detected, ...montecarlo]
}

export function PanelStochasticProjection({ context }: { context: ScoreFrictionPanelContext }) {
  const montecarlo = context.pipeline.montecarlo ?? context.pipeline.engine
  const warnings = Array.isArray(montecarlo?.warnings) ? montecarlo.warnings.map(String) : []
  const points = projectionRows(context).slice(0, 10).map((row, index) => ({
    id: s(row.id ?? row.proto_attractor_id ?? row.name, `p-${index}`),
    label: s(row.name ?? row.label ?? row.status, `vector-${index + 1}`),
    value: Math.max(0.04, Math.min(0.96, n(row.confidence ?? row.probability ?? row.score ?? row.persistence ?? row.density, 0))),
    density: n(row.density ?? row.weight ?? row.energy, 0),
  })).filter((point) => point.value > 0)

  return (
    <PanelFrame title="PROYECCION ESTOCASTICA" topo="ZONE-B" className="w-[420px]">
      <svg viewBox="0 0 390 150" className="h-[150px] w-full">
        {points.length ? points.map((point, index) => {
          const x = 24 + index * 42
          const y = 130 - point.value * 105
          const next = points[index + 1]
          return (
            <g key={point.id}>
              {next ? <line x1={x} y1={y} x2={24 + (index + 1) * 42} y2={130 - next.value * 105} stroke="rgba(216,182,74,.3)" /> : null}
              <circle cx={x} cy={y} r={6 + point.density * 8} fill="rgba(216,182,74,.18)" stroke="#d8b64a" />
              <title>{point.label}</title>
            </g>
          )
        }) : <text x="195" y="82" textAnchor="middle" fill="#8a8172" fontSize="10" fontFamily="monospace">{MISSING}</text>}
      </svg>
      <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">
        <div>fuente: {s(montecarlo?.source, points.length ? 'scorefriction-runtime' : MISSING)}</div>
        <div>runs: {n(montecarlo?.mc_runs ?? montecarlo?.runs, 0)}</div>
        <div>proto-proyecciones: {points.length || MISSING}</div>
        <div>energia: {(context.metrics.fs * 100).toFixed(1)}%</div>
      </div>
      {warnings.length ? <div className="mt-2 text-[9px] text-[#b85050]">{warnings.join(', ')}</div> : null}
    </PanelFrame>
  )
}
