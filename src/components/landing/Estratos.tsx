const estratos = [
  [
    '00',
    'Lectura inicial',
    'El sistema detecta contradicción, tensión y latencia desde la primera interacción.'
  ],
  [
    '01',
    'Memoria longitudinal',
    'Cada auditoría modifica el estado del nodo y registra recurrencias observables.'
  ],
  [
    '02',
    'Prevención operacional',
    'Los patrones repetidos aumentan severidad antes de convertirse en colapso.'
  ],
  [
    '03',
    'Resolución mínima',
    'Toda auditoría termina con una acción concreta y verificable.'
  ]
]

export function Estratos() {
  return (
    <section className="bg-void px-6 py-24 text-paper">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">
          Arquitectura operacional
        </p>

        <h2 className="mt-4 font-display text-2xl uppercase tracking-[0.08em]">
          Cómo funciona el observatorio
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {estratos.map(([id, title, text]) => (
            <article
              key={id}
              className="border-l-2 border-gold bg-gold/5 p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
                Estrato {id}
              </p>

              <h3 className="mt-3 font-display text-sm uppercase tracking-[0.08em]">
                {title}
              </h3>

              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}