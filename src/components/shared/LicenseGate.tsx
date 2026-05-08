import { LockKeyhole } from 'lucide-react'

export function LicenseGate({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (active) return <>{children}</>
  return (
    <div className="border border-gold/15 bg-black/40 p-5">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
        <LockKeyhole className="h-4 w-4" />
        instrumento no activado
      </div>
      <p className="font-serif text-base italic leading-relaxed text-zinc-500">
        Este modulo existe, pero no esta habilitado para el nodo actual.
      </p>
    </div>
  )
}
