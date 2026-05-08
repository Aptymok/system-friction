import Link from 'next/link'
import { ArrowRight, Crosshair } from 'lucide-react'

export function OperationalCTA() {
  return (
    <section className="border-y border-gold/20 bg-void px-6 py-14 text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">Activacion longitudinal</p>
          <h2 className="mt-3 font-display text-xl uppercase tracking-[0.08em] md:text-2xl">
            Iniciar diagnostico operacional
          </h2>
          <p className="mt-4 max-w-2xl font-serif text-lg italic leading-relaxed text-zinc-400">
            No abras otra narrativa. Crea un nodo, deja una linea base y permite que el sistema recuerde lo que se repite.
          </p>
        </div>
        <Link
          href="/start"
          className="inline-flex shrink-0 items-center justify-center gap-2 bg-gold px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-void transition hover:bg-paper"
        >
          <Crosshair className="h-4 w-4" />
          Iniciar diagnostico operacional
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
