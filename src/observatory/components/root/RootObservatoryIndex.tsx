'use client'

type RootScopeOverviewItem = {
  scope: string
  label: string
  state: string
  sourceTrust: string
  latestReading?: { label?: string; summary?: string; observedAt?: string } | null
  evidenceCount: number
  canFeedRegime: boolean
  canSupportAttractor: boolean
  warnings: string[]
}

function tone(state: string) {
  if (state === 'live') return 'text-[#6ab88a]'
  if (state === 'sandbox') return 'text-[#c8a951]'
  return 'text-[#c87060]'
}

function operatorState(state: string) {
  if (state === 'live') return 'usable ahora'
  if (state === 'sandbox') return 'en prueba'
  return 'sin evidencia suficiente'
}

export function RootObservatoryIndex({ scopes }: { scopes?: RootScopeOverviewItem[] }) {
  const items = Array.isArray(scopes) ? scopes : []

  return (
    <section className="space-y-3">
      <div className="border-l border-[#8a7035] pl-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Observatorios SFI</h3>
        <p className="mt-2 text-[11px] leading-5 text-[#8f8678]">
          ROOT muestra que observatorios pueden orientar una decision. Si falta evidencia, el observatorio permanece visible, pero no debe cambiar el rumbo del sistema.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] leading-5 text-[#c87060]">No hay observatorios conectados para decidir.</p>
      ) : items.map((item) => (
        <article key={item.scope} className="border border-[#1e1c17] bg-[#0b0a08] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#7a7568]">{item.scope}</div>
              <h4 className="mt-1 text-sm font-semibold text-[#d7cdb8]">{item.label}</h4>
            </div>
            <span className={`font-mono text-[9px] uppercase tracking-[0.14em] ${tone(item.state)}`}>{operatorState(item.state)}</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#9d927f]">
            {item.latestReading?.summary ?? 'Existe la forma del observatorio, pero todavia no hay lectura suficiente para usarlo como base de decision.'}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[#6f685c]">
            <div><dt className="text-[#3f3a32]">Evidencia</dt><dd className="mt-1 text-[#c8a951]">{item.evidenceCount}</dd></div>
            <div><dt className="text-[#3f3a32]">Confianza</dt><dd className="mt-1 text-[#c8a951]">{item.sourceTrust}</dd></div>
            <div><dt className="text-[#3f3a32]">Decision</dt><dd className="mt-1 text-[#8f8678]">{item.canFeedRegime ? 'puede orientar' : 'no debe orientar'}</dd></div>
            <div><dt className="text-[#3f3a32]">Futuro</dt><dd className="mt-1 text-[#8f8678]">{item.canSupportAttractor ? 'lo sostiene' : 'no lo sostiene'}</dd></div>
          </dl>
          {item.warnings.length ? <p className="mt-3 text-[11px] leading-5 text-[#c87060]">{item.warnings[0]}</p> : null}
        </article>
      ))}
    </section>
  )
}
