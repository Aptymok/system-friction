const estratos = [
  { n: '00', title: 'Lectura Inicial', desc: 'Detección de contradicción, tensión y latencia desde el primer contacto.' },
  { n: '01', title: 'Memoria Longitudinal', desc: 'Cada auditoría modifica el estado del nodo y registra recurrencias.' },
  { n: '02', title: 'Prevención Operacional', desc: 'Identificación de patrones de fallo antes de que ocurra el colapso.' },
  { n: '03', title: 'Resolución Mínima', desc: 'Toda auditoría concluye con una acción concreta, verificable y finita.' }
]

export function Estratos() {
  return (
    <section className="bg-[#151311] py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-display text-5xl font-bold uppercase tracking-tighter text-paper mb-8">
              Arquitectura del <br /><span className="text-gold">Observatorio</span>
            </h2>
            <p className="text-zinc-500 font-serif text-xl italic leading-relaxed max-w-md">
              El proceso de inducción MOP-H descompone tu estructura en estratos de profundidad operacional.
            </p>
          </div>

          <div className="space-y-12">
            {estratos.map((estrato) => (
              <div key={estrato.n} className="relative pl-16 group">
                <span className="absolute left-0 top-0 font-mono text-xs text-gold/30 group-hover:text-gold transition-colors">
                  [ ESTRATO_{estrato.n} ]
                </span>
                <h3 className="font-mono text-sm uppercase tracking-[0.2em] text-paper mb-3">
                  {estrato.title}
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed max-w-sm">
                  {estrato.desc}
                </p>
                <div className="mt-6 h-px w-0 bg-gold/20 group-hover:w-full transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}