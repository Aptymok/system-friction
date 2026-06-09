import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import { LogoutLink } from '@/components/auth/LogoutLink'
import { ObservatoryScopeCard } from './ObservatoryScopeCard'

export function ObservatoryOfObservatories({ scopes }: { scopes: AmvScopeState[] }) {
  const live = scopes.filter((scope) => scope.state === 'live').length
  const degraded = scopes.filter((scope) => scope.state === 'degraded').length

  return (
    <main className="min-h-screen bg-[#070706] text-[#d8d0bd]">
      <header className="border-b border-[#26221b] bg-[#0c0b09]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#b8924b]">SFI / observatorios</p>
            <h1 className="mt-2 font-serif text-3xl text-[#ead8aa]">Observatorio de observatorios</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#918877]">
              Observatories observa los scopes AMV. ROOT decide. Ningun scope degradado alimenta regimen ni atractor.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8f8678]">
              <span className="border border-[#26221b] px-3 py-2">vivos {live}</span>
              <span className="border border-[#26221b] px-3 py-2">degradados {degraded}</span>
              <span className="border border-[#26221b] px-3 py-2">scopes {scopes.length}</span>
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]">
            <LogoutLink />
          </div>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-6 md:grid-cols-2 xl:grid-cols-3">
        {scopes.map((scope) => <ObservatoryScopeCard key={scope.scope} scope={scope} />)}
      </section>
    </main>
  )
}
