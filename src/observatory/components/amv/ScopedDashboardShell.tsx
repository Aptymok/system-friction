import type { AmvDashboardSpec } from '@/lib/amv/core/dashboardSpecTypes'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import { AmvPanelRenderer } from './AmvPanelRenderer'

export function ScopedDashboardShell({ spec, state }: { spec: AmvDashboardSpec; state?: AmvScopeState }) {
  const panels = [...spec.panels].sort((a, b) => a.order - b.order)
  const hasLiveState = Boolean(state?.latestReading)

  return (
    <div className="min-h-0 bg-[#060605] text-[#ccc8bc]">
      <header className="border-b border-[#1e1c17] px-4 py-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a7035]">
          AMV scope: {spec.scope}
        </div>
        <h2 className="mt-1 text-lg font-semibold text-[#d7cdb8]">{spec.title}</h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[#8f8678]">{spec.instrument.ontologicalQuestion}</p>
        <div className="mt-3 grid gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6f685c] md:grid-cols-4">
          <div className="border border-[#1e1c17] px-2 py-2">
            Estado <span className={hasLiveState ? 'text-[#6ab88a]' : 'text-[#c87060]'}>{state?.state ?? 'degraded'}</span>
          </div>
          <div className="border border-[#1e1c17] px-2 py-2">Trust <span className="text-[#c8a951]">{state?.sourceTrust ?? 'degraded'}</span></div>
          <div className="border border-[#1e1c17] px-2 py-2">Evidencia <span className="text-[#c8a951]">{state?.evidenceSummary.count ?? 0}</span></div>
          <div className="border border-[#1e1c17] px-2 py-2">Regimen <span className="text-[#c8a951]">{state?.canFeedRegime ? 'si' : 'no'}</span></div>
        </div>
        {!hasLiveState ? (
          <p className="mt-3 border-l border-[#c87060] pl-3 text-xs leading-5 text-[#c87060]">
            Contrato observable disponible. Sin estado vivo suficiente.
          </p>
        ) : null}
      </header>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {panels.map((panel) => (
          <AmvPanelRenderer key={panel.id} panel={panel} state={state} />
        ))}
      </div>
    </div>
  )
}
