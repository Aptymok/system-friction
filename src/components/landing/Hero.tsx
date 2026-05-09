import Link from 'next/link'
import { ArrowRight, Radar } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-[#151311] px-6 pt-20 text-paper">
      {/* El fondo ahora es más oscuro (void) para que el Gold resalte como una advertencia */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
            backgroundImage:
              'linear-gradient(#F5F2ED 1px, transparent 1px), linear-gradient(90deg, #F5F2ED 1px, transparent 1px)',
            backgroundSize: '72px 72px'
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 pb-16 lg:grid-cols-[1fr_400px] lg:items-center">
        <div>
          {/* Badge Operacional */}
          <div className="mb-8 inline-flex items-center gap-3 border border-gold/20 bg-gold/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
            </span>
            SFI_NODE: ACTIVE // ESTADO_00
          </div>

          <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tighter md:text-7xl lg:max-w-3xl">
            Auditamos tu <span className="text-gold italic">ejecución</span>, no tu intención.
          </h1>

          <p className="mt-8 max-w-xl font-serif text-2xl italic leading-relaxed text-paper/60">
            El sistema detecta contradicción, tensión y latencia en tu estructura operativa antes de que se conviertan en colapso.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/start"
              className="group inline-flex items-center gap-3 bg-gold px-8 py-5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-void transition-all hover:scale-[1.02] active:scale-95"
            >
              Iniciar diagnóstico MOP-H
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* El "Scanner" de Telemetría */}
        <div className="relative border border-paper/10 bg-void/50 p-6 backdrop-blur-sm shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/50">
              Telemetría_Longitudinal_v2.0
            </p>
            <div className="h-1 w-12 bg-gold/20 animate-pulse" />
          </div>

          <div className="space-y-4">
            {[
              ['Homeostasis (IHG)', '-0.44', 'bg-red-500/20'],
              ['Tensión (NTI)', '0.31', 'bg-gold/20'],
              ['Latencia (LDI)', '72h', 'bg-paper/10']
            ].map(([label, value, color]) => (
              <div key={label} className="group border border-paper/5 bg-white/[0.02] p-4 transition-colors hover:border-gold/30">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-500 group-hover:text-gold/50 transition-colors">
                      {label}
                    </p>
                    <p className="mt-1 font-mono text-3xl text-paper">
                      {value}
                    </p>
                  </div>
                  <div className={`h-8 w-[2px] ${color}`} />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 font-mono text-[11px] leading-relaxed text-zinc-500 italic">
            {">"} Detectando deriva cognitiva en nodo externo...
          </p>
        </div>
      </div>
    </section>
  )
}