export function TelemetryPreview() {
  return (
    <section className="bg-[#151311] px-6 py-24 text-paper">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">Telemetria</p>
          <h2 className="mt-4 font-display text-2xl uppercase tracking-[0.08em]">Propositivo por diseno</h2>
          <p className="mt-5 leading-relaxed text-zinc-400">
            Cada auditoria produce veredicto, patron, severidad, accion minima y memoria. La terminal no espera al colapso: previene por tendencia.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Patrones', 'Emergencias', 'Memoria'].map((item) => (
            <div key={item} className="border border-gold/15 bg-black/30 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">{item}</p>
              <div className="mt-8 h-1 bg-gold/30" />
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">Activo en terminal.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
