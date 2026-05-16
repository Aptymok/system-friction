export function TelemetryPreview() {
  return (
    <section className="bg-[#151311] px-6 py-24 text-paper">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">
            Telemetría longitudinal
          </p>

          <h2 className="mt-4 font-display text-2xl uppercase tracking-[0.08em]">
            El sistema recuerda patrones
          </h2>

          <p className="mt-5 leading-relaxed text-zinc-400">
            La memoria no almacena conversaciones. Registra recurrencias,
            contradicciones, acciones incumplidas y cambios de dirección.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [
              'Patrones',
              'Loops repetidos, evasión y contradicción longitudinal.'
            ],
            [
              'Severidad',
              'La tensión aumenta cuando la ejecución no ocurre.'
            ],
            [
              'Resolución',
              'Cada lectura termina con una acción mínima verificable.'
            ]
          ].map(([title, text]) => (
            <div
              key={title}
              className="border border-gold/15 bg-black/30 p-5"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
                {title}
              </p>

              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}