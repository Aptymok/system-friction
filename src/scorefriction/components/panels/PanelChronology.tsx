'use client'

import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'
import { s } from './panel-types'

export function PanelChronology({ context }: { context: ScoreFrictionPanelContext }) {
  const rows = [
    ...context.runtime.chronology.slice(0, 6).map((row) => ({ label: s(row.actual_result ?? row.name ?? row.title ?? row.id, 'evento'), meta: s(row.status ?? row.created_at ?? row.verified_at, 'estrato') })),
    ...(context.pipeline.evidence ? [{ label: `evidence ${context.pipeline.evidence.hash.slice(0, 10)}`, meta: context.pipeline.stored ? 'ledger stored' : 'ledger local / degraded' }] : []),
    ...(context.pipeline.amv ? [{ label: 'AMV response', meta: s(context.pipeline.amv.nextObservation, 'sin siguiente observacion') }] : []),
  ].slice(0, 9)

  return (
    <PanelFrame title="CRONOLOGIA VIVA / ESTRATOS" topo="ZONE-C" className="w-[460px]">
      <div className="max-h-[160px] overflow-auto font-mono text-[10px] leading-5">
        {rows.length ? rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="grid grid-cols-[28px_1fr] gap-3 border-b border-[#d8b64a12] py-2">
            <span className="text-[#d8b64a]">{String(index + 1).padStart(2, '0')}</span>
            <span><span className="text-[#d8d0bd]">{row.label}</span><br /><span className="text-[#6f6658]">{row.meta}</span></span>
          </div>
        )) : <div className="border border-[#b8505033] p-3 text-[#b85050]">sin cronologia scorefriction conectada</div>}
      </div>
    </PanelFrame>
  )
}
