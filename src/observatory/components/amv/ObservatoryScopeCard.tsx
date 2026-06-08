import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'

function stateClass(state: string) {
  if (state === 'live') return 'text-[#6ab88a]'
  if (state === 'sandbox') return 'text-[#c8a951]'
  return 'text-[#c87060]'
}

export function ObservatoryScopeCard({ scope }: { scope: AmvScopeState }) {
  const debt = scope.warnings.length ? scope.warnings[0] : scope.latestReading ? 'Sin deuda critica declarada.' : 'Falta estado vivo.'

  return (
    <article className="border border-[#252119] bg-[#0c0b09] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#7a7568]">{scope.scope}</div>
          <h2 className="mt-1 text-base font-semibold text-[#ead8aa]">{scope.label}</h2>
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-[0.14em] ${stateClass(scope.state)}`}>{scope.state}</span>
      </div>
      <p className="mt-3 min-h-12 text-sm leading-6 text-[#a99f8d]">
        {scope.latestReading?.summary ?? 'Contrato observable disponible. Sin estado vivo suficiente.'}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-[9px] uppercase tracking-[0.11em] text-[#6f685c]">
        <div><dt className="text-[#3f3a32]">Evidencia</dt><dd className="mt-1 text-[#c8a951]">{scope.evidenceSummary.count}</dd></div>
        <div><dt className="text-[#3f3a32]">Regimen</dt><dd className="mt-1 text-[#c8a951]">{scope.canFeedRegime ? 'permitido' : 'no'}</dd></div>
        <div><dt className="text-[#3f3a32]">Atractor</dt><dd className="mt-1 text-[#c8a951]">{scope.canSupportAttractor ? 'si' : 'no'}</dd></div>
        <div><dt className="text-[#3f3a32]">Eyectores</dt><dd className="mt-1 text-[#c87060]">{scope.state === 'degraded' ? 'deuda de evidencia' : '-'}</dd></div>
      </dl>
      <div className="mt-4 border-t border-[#252119] pt-3 text-[11px] leading-5 text-[#8f8678]">
        <p><span className="font-mono uppercase tracking-[0.12em] text-[#4d4639]">Deuda:</span> {debt}</p>
        <p className="mt-1"><span className="font-mono uppercase tracking-[0.12em] text-[#4d4639]">Ruta unica:</span> {scope.canFeedRegime ? 'mantener observacion y verificar cierre' : 'conectar evidencia antes de promover'}</p>
      </div>
    </article>
  )
}
