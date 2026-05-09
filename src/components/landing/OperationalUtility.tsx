const utilities = [
  {
    title: 'Detección de Fricción',
    desc: 'Localiza el punto exacto donde tu intención se pudre y se convierte en parálisis operativa.'
  },
  {
    title: 'Resolución Mínima',
    desc: 'El sistema no entrega consejos. Entrega la acción específica verificable (AMV) que rompe tu loop actual.'
  },
  {
    title: 'Soberanía Longitudinal',
    desc: 'Te permite observar tu comportamiento a través de meses para evitar que tu "yo" del futuro repita las mismas deudas técnicas.'
  }
]

export function OperationalUtility() {
  return (
    <section className="bg-[#151311] py-32 px-6 border-t border-paper/5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/60 mb-4">
            Documentación_de_Utilidad
          </p>
          <h2 className="font-serif text-4xl italic text-paper/90 max-w-3xl">
            El beneficio no es psicológico. Es material. Auditamos para recuperar tu capacidad de ejecución.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-paper/5 border border-paper/5">
          {utilities.map((u) => (
            <div key={u.title} className="bg-[#151311] p-12">
              <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-6">{u.title}</h3>
              <p className="font-serif text-lg italic text-zinc-500 leading-relaxed">
                {u.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}