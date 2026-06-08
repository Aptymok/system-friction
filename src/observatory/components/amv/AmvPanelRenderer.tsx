import type { AmvDashboardPanelSpec } from '@/lib/amv/core/dashboardSpecTypes'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'

function joinOrEmpty(values: string[], fallback: string) {
  return values.length ? values.join(' / ') : fallback
}

export function AmvPanelRenderer({ panel, state }: { panel: AmvDashboardPanelSpec; state?: AmvScopeState }) {
  const hasLiveState = Boolean(state?.latestReading)
  const warning = state?.warnings[0]

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
      <div className="mt-3 border-t border-[#1e1c17] pt-3 text-[11px] leading-5 text-[#6f685c]">
        {hasLiveState ? (
          <div className="space-y-2">
            <p className="text-[#b8ad98]">{state?.latestReading?.summary}</p>
            <dl className="grid grid-cols-2 gap-2 font-mono text-[8px] uppercase tracking-[0.1em]">
              <div>
                <dt className="text-[#3f3a32]">Trust</dt>
                <dd className="mt-1 text-[#c8a951]">{state?.sourceTrust}</dd>
              </div>
              <div>
                <dt className="text-[#3f3a32]">Evidencia</dt>
                <dd className="mt-1 text-[#c8a951]">{state?.evidenceSummary.count}</dd>
              </div>
              <div>
                <dt className="text-[#3f3a32]">Regimen</dt>
                <dd className="mt-1 text-[#8f8678]">{state?.canFeedRegime ? 'permitido' : 'no'}</dd>
              </div>
              <div>
                <dt className="text-[#3f3a32]">Atractor</dt>
                <dd className="mt-1 text-[#8f8678]">{state?.canSupportAttractor ? 'puede sostener' : 'no sostiene'}</dd>
              </div>
            </dl>
            {warning ? <p className="text-[#c87060]">{warning}</p> : null}
          </div>
        ) : (
          <p>Contrato observable disponible. Sin estado vivo suficiente. {panel.emptyState}</p>
        )}
      </div>
    </section>
  )
}
