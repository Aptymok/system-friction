import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import { LogoutLink } from '@/components/auth/LogoutLink'

export function ScoreFrictionStateBanner({ state }: { state: AmvScopeState }) {
  const live = Boolean(state.latestReading)

  return (
    <section className="border-b border-[#26221b] bg-[#0c0b09] text-[#d8d0bd]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.12em] md:flex-row md:items-center md:justify-between">
        <span className={live ? 'text-[#6ab88a]' : 'text-[#c87060]'}>
          ScoreFriction state: {state.state}
        </span>
        <span className="text-[#8f8678]">
          evidencia {state.evidenceSummary.count} / trust {state.sourceTrust} / regimen {state.canFeedRegime ? 'permitido' : 'no'}
        </span>
        <span className="text-[#8f8678]">
          {state.latestReading?.label ?? 'Contrato observable disponible. Sin estado vivo suficiente.'}
        </span>
        <LogoutLink className="border border-[#26221b] px-3 py-2 text-[#a89469] hover:border-[#b8924b] hover:text-[#ead8aa]" />
      </div>
    </section>
  )
}
