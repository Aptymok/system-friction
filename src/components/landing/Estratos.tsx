const estratos = [
  ['00', 'Infraestructura base', 'Observacion cruda, identidad minima y sensores IHG/NTI/LDI.'],
  ['01', 'Protocolo AMV', 'Auditoria MOP-H, preguntas no repetidas y deteccion de evasion.'],
  ['02', 'Prevencion operacional', 'Patrones longitudinales, latencia cronica y hard stop.'],
  ['03', 'Observatorio', 'Memoria de nodos, trazabilidad y resolucion minima verificable.']
]

export function Estratos() {
  return (
    <section className="bg-void px-6 py-24 text-paper">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">Arquitectura propuesta</p>
        <h2 className="mt-4 font-display text-2xl uppercase tracking-[0.08em]">Cuatro estratos operativos</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {estratos.map(([id, title, text]) => (
            <article key={id} className="border-l-2 border-gold bg-gold/5 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">Estrato {id}</p>
              <h3 className="mt-3 font-display text-sm uppercase tracking-[0.08em]">{title}</h3>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
