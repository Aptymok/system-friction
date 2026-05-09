export function ObservatoryDetection() {
  return (
    <section className="relative border-t border-gold/10 bg-[#151311] px-6 py-24 text-paper">
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(#1A1817 1px, transparent 1px), linear-gradient(90deg, #1A1817 1px, transparent 1px)',
          backgroundSize: '72px 72px'
        }}
      />

      <div className="relative mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">
            Observación operacional
          </p>

          <h2 className="mt-4 font-display text-2xl uppercase tracking-[0.08em]">
            El sistema detecta fricción antes del colapso.
          </h2>

          <p className="mt-5 leading-relaxed text-zinc-400">
            System Friction registra contradicción, tensión y latencia entre lo
            que una persona declara y lo que realmente ejecuta.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-gold/15 bg-black/30 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
              IHG
            </p>

            <h3 className="mt-3 font-display text-sm uppercase tracking-[0.08em]">
              Homeostasis operacional
            </h3>

            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Mide coherencia entre intención declarada y ejecución observable.
            </p>
          </div>

          <div className="border border-gold/15 bg-black/30 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
              NTI
            </p>

            <h3 className="mt-3 font-display text-sm uppercase tracking-[0.08em]">
              Tensión interna
            </h3>

            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Detecta contradicción narrativa, evasión y dispersión recurrente.
            </p>
          </div>

          <div className="border border-gold/15 bg-black/30 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
              LDI
            </p>

            <h3 className="mt-3 font-display text-sm uppercase tracking-[0.08em]">
              Latencia de decisión
            </h3>

            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Calcula retraso entre reconocer una acción y ejecutarla realmente.
            </p>
          </div>

          <div className="border border-gold/15 bg-black/30 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
              MOP-H
            </p>

            <h3 className="mt-3 font-display text-sm uppercase tracking-[0.08em]">
              Auditoría inicial
            </h3>

            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Protocolo base para detectar patrones longitudinales y deriva operacional.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}