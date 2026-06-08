import type { AmvDashboardPanelSpec } from '@/lib/amv/core/dashboardSpecTypes'

function joinOrEmpty(values: string[], fallback: string) {
  return values.length ? values.join(' / ') : fallback
}

export function AmvPanelRenderer({ panel }: { panel: AmvDashboardPanelSpec }) {
  return (
    <section className="border border-[#1e1c17] bg-[#0b0a08] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#7a7568]">{panel.lane}</div>
          <h3 className="mt-1 text-sm font-semibold text-[#d7cdb8]">{panel.title}</h3>
        </div>
        <span className="border border-[#2e2c24] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">
          {panel.risk}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#9d927f]">{panel.question}</p>
      <dl className="mt-3 grid gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#6f685c]">
        <div>
          <dt className="text-[#3f3a32]">Observa</dt>
          <dd className="mt-1 text-[#c8a951]">{panel.observes}</dd>
        </div>
        <div>
          <dt className="text-[#3f3a32]">Fuentes</dt>
          <dd className="mt-1 text-[#8f8678]">{joinOrEmpty(panel.sources, 'sin fuente declarada')}</dd>
        </div>
        <div>
          <dt className="text-[#3f3a32]">Metricas</dt>
          <dd className="mt-1 text-[#8f8678]">{joinOrEmpty(panel.metrics, 'sin metrica declarada')}</dd>
        </div>
        <div>
          <dt className="text-[#3f3a32]">Evidencia minima</dt>
          <dd className="mt-1 text-[#8f8678]">{panel.minimumEvidence}</dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-[#1e1c17] pt-3 text-[11px] leading-5 text-[#6f685c]">{panel.emptyState}</p>
    </section>
  )
}
