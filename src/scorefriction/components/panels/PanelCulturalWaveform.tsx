'use client'

import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

const MISSING = 'FALTA INGESTA DE DATOS'

function value(input: unknown) {
  const parsed = Number(input)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : null
}

export function PanelCulturalWaveform({ context }: { context: ScoreFrictionPanelContext }) {
  const vector = context.cultural?.cultural_vector
  const points = [
    ['NTI', value(vector?.NTI_C)],
    ['IHG', value(vector?.IHG_C)],
    ['ICE', value(vector?.ICE_C)],
    ['CRM', value(vector?.CRM_C)],
    ['FS', value(vector?.FS_C)],
    ['LCP', value(vector?.LCP)],
    ['PAC', value(vector?.PAC)],
    ['VFE', value(vector?.VFE)],
    ['SCR', value(vector?.SCR)],
  ] as const
  const hasData = points.some(([, point]) => point !== null)

  return (
    <PanelFrame title="CULTURAL WAVEFORM" topo="ZONE-A">
      <div className="grid h-full grid-rows-[1fr_auto] gap-3 p-3">
        <svg viewBox="0 0 620 210" className="min-h-0 w-full">
          <line x1="30" y1="168" x2="590" y2="168" stroke="rgba(216,182,74,.16)" />
          <line x1="30" y1="52" x2="590" y2="52" stroke="rgba(216,182,74,.10)" />
          {hasData ? points.map(([label, point], index) => {
            if (point === null) return null
            const x = 50 + index * 62
            const y = 168 - point * 116
            const next = points[index + 1]?.[1]
            return (
              <g key={label}>
                {typeof next === 'number' ? <line x1={x} y1={y} x2={50 + (index + 1) * 62} y2={168 - next * 116} stroke="rgba(216,182,74,.45)" strokeWidth="2" /> : null}
                <circle cx={x} cy={y} r={7} fill="#060605" stroke="#e0c46c" strokeWidth="2" />
                <text x={x} y="195" textAnchor="middle" fill="#8a8172" fontSize="11" fontFamily="monospace">{label}</text>
              </g>
            )
          }) : (
            <text x="310" y="110" textAnchor="middle" fill="#8a8172" fontSize="12" fontFamily="monospace">{MISSING}</text>
          )}
        </svg>
        <div className="grid grid-cols-3 gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#8a8172]">
          <div className="border border-[#d8b64a18] bg-[#080706] p-2">caso<br /><span className="text-[#e0c46c]">{context.cultural?.case_name ?? MISSING}</span></div>
          <div className="border border-[#d8b64a18] bg-[#080706] p-2">friccion<br /><span className="text-[#e0c46c]">{context.cultural?.interpretation?.friction ?? MISSING}</span></div>
          <div className="border border-[#d8b64a18] bg-[#080706] p-2">propuesta<br /><span className="text-[#e0c46c]">{context.cultural?.interpretation?.proposal ?? MISSING}</span></div>
        </div>
      </div>
    </PanelFrame>
  )
}
