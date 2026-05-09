export function CasesPreview() {
  const cases = [
    { node: 'AGS', status: 'Activo', metric: 'LDI 72h', label: 'Latencia institucional recurrente detectada.' },
    { node: 'DELTA', status: 'Seguimiento', metric: 'NTI 0.61', label: 'Contradicción entre intención y ejecución.' },
    { node: 'UMBRA', status: 'Estable', metric: 'IHG +0.18', label: 'Reducción observable de dispersión operacional.' }
  ]

  return (
    <section className="bg-[#151311] py-24 px-6 border-t border-paper/5">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold mb-16">
          Casos_Longitudinales
        </h2>
        
        <div className="grid gap-8 md:grid-cols-3">
          {cases.map((c) => (
            <div key={c.node} className="border border-paper/5 p-8 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start mb-6">
                <span className="font-mono text-xl text-paper">NODO-{c.node}</span>
                <span className="font-mono text-[10px] text-gold border border-gold/20 px-2 py-0.5">{c.status}</span>
              </div>
              <p className="text-sm text-zinc-500 font-serif italic mb-6 leading-relaxed">
                {c.label}
              </p>
              <div className="font-mono text-2xl text-gold group-hover:scale-105 transition-transform origin-left">
                {c.metric}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}