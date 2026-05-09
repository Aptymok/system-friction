import { Zap, Activity, Clock } from 'lucide-react'

const signals = [
  {
    id: 'IHG',
    name: 'Índice de Homeostasis Global',
    desc: 'Mide la coherencia entre la intención declarada y la acción ejecutada a largo plazo.',
    icon: Activity
  },
  {
    id: 'NTI',
    name: 'Nivel de Tensión Interna',
    desc: 'Detecta contradicción narrativa y fricción entre el discurso y la conducta real.',
    icon: Zap
  },
  {
    id: 'LDI',
    name: 'Latencia de Decisión',
    desc: 'Calcula el tiempo transcurrido entre reconocer una necesidad y ejecutar la resolución.',
    icon: Clock
  }
]

export function OperationalSignals() {
  return (
    <section className="bg-[#151311] py-24 px-6 border-y border-paper/5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 max-w-2xl">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold mb-4">
            Metodología_Longitudinal
          </h2>
          <p className="font-serif text-3xl italic text-paper/90">
            El sistema no se centra en la motivación. Se centra en el comportamiento observable y la continuidad real.
          </p>
        </div>

        <div className="grid gap-px bg-paper/5 md:grid-cols-3 border border-paper/5">
          {signals.map((signal) => (
            <div key={signal.id} className="bg-[#151311] p-10 group hover:bg-gold/[0.02] transition-colors">
              <signal.icon className="h-6 w-6 text-gold/40 mb-8 group-hover:text-gold transition-colors" />
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-mono text-2xl text-gold">{signal.id}</span>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-paper/50">
                  {signal.name}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-500 font-serif italic">
                {signal.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}