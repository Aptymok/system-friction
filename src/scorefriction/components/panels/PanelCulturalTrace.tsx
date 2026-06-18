'use client'

import { findCulturalWaveCase } from '@/lib/scorefriction/cultural-wave-cases'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'
import { s } from './panel-types'

const MISSING = 'FALTA INGESTA DE DATOS'

export function PanelCulturalTrace({ context }: { context: ScoreFrictionPanelContext }) {
  const waveCase = findCulturalWaveCase(context.caseId)
  const rows = context.runtime.chronology.slice(0, 8)

  return (
    <PanelFrame title="TRACE / CASE STUDY" topo="ZONE-C">
      <div className="grid h-full grid-cols-[1fr_1.4fr] gap-3 p-3">
        <div className="min-w-0 overflow-auto border border-[#d8b64a18] bg-[#080706]/80 p-3 font-mono text-[9px] leading-5 text-[#9c9282]">
          <div className="mb-2 uppercase tracking-[0.16em] text-[#d8b64a]">case study</div>
          <div className="text-[#e0c46c]">{context.cultural?.case_name ?? waveCase?.name ?? MISSING}</div>
          <div className="mt-3">{context.cultural?.interpretation?.phenomenon ?? waveCase?.phenomenon ?? MISSING}</div>
          <div className="mt-3">{waveCase?.hypothesis ?? context.cultural?.interpretation?.proposal ?? MISSING}</div>
        </div>
        <div className="min-w-0 overflow-auto border border-[#d8b64a18] bg-[#080706]/80 p-3 font-mono text-[9px] leading-5 text-[#9c9282]">
          <div className="mb-2 uppercase tracking-[0.16em] text-[#d8b64a]">trace operacional</div>
          {rows.length ? rows.map((row, index) => (
            <div key={`${s(row.id, String(index))}-${index}`} className="mb-2 border-b border-[#d8b64a12] pb-2">
              <div className="text-[#e0c46c]">{s(row.created_at ?? row.recorded_at ?? row.timestamp, `t-${index + 1}`)}</div>
              <div>{s(row.summary ?? row.event_name ?? row.status ?? row.id, MISSING)}</div>
            </div>
          )) : MISSING}
        </div>
      </div>
    </PanelFrame>
  )
}
