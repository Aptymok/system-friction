export function SignalFragments() {

const fragments = [
    {
      id: '01',
      title: 'Quiebra de Identidad',
      text:
        'Sostienes una marca pública de "alta funcionalidad" mientras tu ejecución real está en bancarrota técnica.'
    },
    {
      id: '02',
      title: 'Escudo de Seguridad',
      text:
        'Tus excusas no son lógicas; son prótesis narrativas para proteger el miedo a tu propio potencial operativo.'
    },
    {
      id: '03',
      title: 'Amputación Longitudinal',
      text:
        'Cada decisión que pospones "para mañana" no es un retraso; es una amputación quirúrgica de tu futuro declarado.'
    }
  ]



  return (
    <section className="relative overflow-hidden border-t border-gold/10 bg-[#151311] px-6 py-24 text-paper">
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(#1A1817 1px, transparent 1px), linear-gradient(90deg, #1A1817 1px, transparent 1px)',
          backgroundSize: '72px 72px'
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
            Señales detectadas
          </p>

          <h2 className="mt-4 font-display text-3xl uppercase tracking-[0.04em] text-paper">
            La fricción rara vez aparece donde el nodo cree buscarla.
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            El observatorio no interpreta emociones. Detecta patrones de repetición,
            contradicción y retraso operacional sostenido.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {fragments.map((item) => (

            <article
              key={item.id}
              className="border border-gold/10 bg-black/30 p-6 backdrop-blur-sm"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
                Señal {item.id}
              </p>

              <h3 className="mt-4 font-display text-lg uppercase text-paper">
                {item.title}
              </h3>

              <p className="mt-4 leading-relaxed text-zinc-400">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}