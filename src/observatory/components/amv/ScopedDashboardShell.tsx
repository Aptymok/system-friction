import type { AmvDashboardSpec } from '@/lib/amv/core/dashboardSpecTypes'
import { AmvPanelRenderer } from './AmvPanelRenderer'

export function ScopedDashboardShell({ spec }: { spec: AmvDashboardSpec }) {
  const panels = [...spec.panels].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-0 bg-[#060605] text-[#ccc8bc]">
      <header className="border-b border-[#1e1c17] px-4 py-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a7035]">
          AMV scope: {spec.scope}
        </div>
        <h2 className="mt-1 text-lg font-semibold text-[#d7cdb8]">{spec.title}</h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[#8f8678]">{spec.instrument.ontologicalQuestion}</p>
      </header>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {panels.map((panel) => (
          <AmvPanelRenderer key={panel.id} panel={panel} />
        ))}
      </div>
    </div>
  )
}
