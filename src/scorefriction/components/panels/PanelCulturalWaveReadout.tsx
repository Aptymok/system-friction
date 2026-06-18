'use client'

import { MiniReadout, PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

const MISSING = 'FALTA INGESTA DE DATOS'

function fixed(value: unknown, digits: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : MISSING
}

export function PanelCulturalWaveReadout({ context }: { context: ScoreFrictionPanelContext }) {
  const vector = context.cultural?.cultural_vector
  const evidence = context.cultural?.evidence
  const evidenceCount = evidence?.observation_count ?? context.evidenceEntries.length

  return (
    <PanelFrame title="SCOREFRICTION CULTURAL WAVE" topo="SFI">
      <div className="grid h-full grid-cols-[1.3fr_2.7fr] gap-3 p-3">
        <div className="flex min-w-0 flex-col justify-between border border-[#d8b64a18] bg-[#080706]/70 p-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#e0c46c]">SFI</div>
            <div className="mt-2 font-mono text-[16px] uppercase tracking-[0.18em] text-[#d8d0bd]">ScoreFriction Cultural Wave</div>
          </div>
          <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">
            <div>case: <span className="text-[#e0c46c]">{context.cultural?.case_id ?? context.caseId}</span></div>
            <div className="mt-1">regime: <span className="text-[#e0c46c]">{vector?.regime ?? MISSING}</span></div>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-4 gap-2">
          <MiniReadout label="CVPhi" value={fixed(vector?.cvphi, 3)} hot={(vector?.cvphi ?? 1) < 0.15} />
          <MiniReadout label="LCP" value={fixed(vector?.LCP, 2)} />
          <MiniReadout label="PAC" value={fixed(vector?.PAC, 2)} />
          <MiniReadout label="VFE" value={fixed(vector?.VFE, 2)} />
          <MiniReadout label="SCR" value={fixed(vector?.SCR, 2)} hot={(vector?.SCR ?? 0) > 0.7} />
          <MiniReadout label="EVD" value={evidenceCount ? String(evidenceCount) : MISSING} />
          <MiniReadout label="COV" value={fixed(evidence?.source_coverage, 2)} />
          <MiniReadout label="hash" value={evidence?.latest_hash ? evidence.latest_hash.slice(0, 10) : MISSING} />
        </div>
      </div>
    </PanelFrame>
  )
}
