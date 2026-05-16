export function OperationalCTA() {
  return (
    <section className="bg-[#151311] py-40 px-6 relative overflow-hidden">
      {/* Efecto de escaneo de fondo sutil */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-gold/[0.02] to-transparent h-1/2 w-full animate-pulse" />
      
      <div className="mx-auto max-w-3xl relative z-10 text-center">
        <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter text-paper mb-8">
          Acceder a la <span className="text-gold italic">Línea Base</span>.
        </h2>
        <p className="font-serif text-xl italic text-zinc-500 mb-12 leading-relaxed">
          El protocolo MOP-H desglosa los 17 puntos de fricción que permiten la observación de las estructuras cristalizadas en patrones. 
          Al finalizar, el sistema genera tu reporte de resolución inmediata y te propone 1 acción específica para romper tu ciclo de parálisis. 
          No es una consulta, es una auditoría de tu ejecución.
        </p>
        
        <button className="group relative bg-gold px-12 py-6 font-mono text-xs font-bold uppercase tracking-[0.3em] text-void transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
          Pagar Peaje de Auditoría ($29 USD)
        </button>
        
        <p className="mt-8 font-mono text-[9px] text-zinc-700 uppercase tracking-widest">
          {">"} Pago único por diagnóstico // Acceso a terminal incluido.
        </p>
      </div>
    </section>
  )
}