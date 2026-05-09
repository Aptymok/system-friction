import Link from 'next/link'
import { ArrowRight, Radar } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-paper px-6 pt-20 text-ink">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(#1A1817 1px, transparent 1px), linear-gradient(90deg, #1A1817 1px, transparent 1px)',
          backgroundSize: '72px 72px'
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 pb-16 lg:grid-cols-[1fr_380px] lg:items-end">
        <div>
          <div className="mb-8 inline-flex items-center gap-2 border border-gold/35 bg-white/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-ink">
            <Radar className="h-4 w-4 text-gold" />
            System Friction Institute
          </div>

          <h1 className="font-display text-4xl font-bold uppercase leading-tight tracking-[0.04em] md:text-6xl">
            Observatorio de coherencia operacional
          </h1>

          <p className="mt-6 max-w-2xl font-serif text-2xl italic leading-relaxed text-ink/75">
            El sistema registra patrones, detecta contradicciones y mide la distancia entre lo que se declara y lo que realmente se ejecuta.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="inline-flex items-center gap-2 bg-gold px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-void transition hover:bg-ink hover:text-gold"
            >
              Iniciar diagnóstico
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/terminal"
              className="inline-flex items-center border border-ink/20 px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink transition hover:border-gold hover:text-gold"
            >
              Abrir terminal
            </Link>
          </div>
        </div>

        <div className="border border-ink/10 bg-void p-5 text-paper shadow-terminal">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            Lectura operacional
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['IHG', '-0.44'],
              ['NTI', '0.31'],
              ['LDI', '72h']
            ].map(([label, value]) => (
              <div
                key={label}
                className="border border-gold/10 bg-white/[0.03] p-3"
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                  {label}
                </p>

                <p className="mt-2 font-mono text-xl text-gold">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-zinc-400">
            IHG mide coherencia operacional. NTI detecta tensión interna. LDI registra latencia entre decisión y acción.
          </p>
        </div>
      </div>
    </section>
  )
}