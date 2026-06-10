'use client'

import { evaluateSfi } from '@/lib/sfi/math'
import { MiniReadout, PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

export function PanelPhi({ context }: { context: ScoreFrictionPanelContext }) {
  const metrics = evaluateSfi(context.metrics)
  return (
    <PanelFrame title="Phi_SF / REGIMEN" topo="ZONE-A" className="w-[278px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,182,74,.16),transparent_58%)]" />
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d8b64a20]" />
      <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d8b64a18]" />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <div className="font-mono text-5xl font-bold text-[#e0c46c]">{metrics.phi.toFixed(3)}</div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#d8b64a99]">{metrics.regime}</div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <MiniReadout label="IHG" value={metrics.ihg.toFixed(2)} />
          <MiniReadout label="NTI" value={metrics.nti.toFixed(2)} />
          <MiniReadout label="LDI" value={metrics.ldi.toFixed(2)} hot={metrics.ldi > 0.7} />
          <MiniReadout label="xi" value={metrics.xi.toFixed(2)} />
          <MiniReadout label="FS" value={metrics.fs.toFixed(2)} />
          <MiniReadout label="case" value={context.caseId} />
        </div>
      </div>
    </PanelFrame>
  )
}
