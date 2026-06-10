'use client'

import { MiniReadout, PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'
import { n } from './panel-types'

export function PanelUserAttractor({ context }: { context: ScoreFrictionPanelContext }) {
  const evidence = context.pipeline.evidence
  const privateEvidence = evidence ? 1 : 0
  const density = evidence ? Math.min(1, evidence.publicWeight + context.metrics.phi * 0.3) : 0
  const degradation = evidence ? evidence.ldi : 1
  const weight = Math.max(0, density * (1 - degradation) + context.metrics.nti * 0.18)
  const projection = n(context.pipeline.engine?.metrics && typeof context.pipeline.engine.metrics === 'object' ? (context.pipeline.engine.metrics as Record<string, unknown>).phi : context.metrics.phi)

  return (
    <PanelFrame title="ATRACTOR DEL USUARIO" topo="ZONE-C" className="w-[380px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,182,74,.12),transparent_62%)]" />
      <div className="relative flex h-full flex-col justify-center">
        <svg viewBox="0 0 260 110" className="mb-4 h-28 w-full">
          <ellipse cx="130" cy="55" rx={24 + weight * 86} ry={10 + density * 44} fill="rgba(216,182,74,.16)" stroke="#d8b64a" />
          <circle cx="130" cy="55" r={5 + projection * 18} fill="#e0c46c" />
        </svg>
        <div className="grid grid-cols-2 gap-2">
          <MiniReadout label="peso" value={weight.toFixed(2)} />
          <MiniReadout label="densidad" value={density.toFixed(2)} />
          <MiniReadout label="evidencia privada" value={String(privateEvidence)} />
          <MiniReadout label="degradacion" value={degradation.toFixed(2)} hot={degradation > 0.7} />
          <MiniReadout label="proyeccion" value={projection.toFixed(2)} />
          <MiniReadout label="ledger" value={context.pipeline.stored ? 'stored' : 'local'} />
        </div>
      </div>
    </PanelFrame>
  )
}
