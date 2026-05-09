export function AMVThoughts() {
  const logs = [
    "La intención cambia constantemente, pero la ejecución permanece igual.",
    "La latencia aumenta cuando la decisión depende de validación externa.",
    "La contradicción no desaparece al ignorarse. Solo cambia de capa.",
    "Persistencia detectada. Disminución parcial de evasión narrativa."
  ]

  return (
    <section className="bg-[#151311] py-32 px-6 overflow-hidden">
      <div className="mx-auto max-w-6xl relative">
        {/* Background Decorative Text */}
        <div className="absolute -left-20 top-0 font-mono text-[12vw] leading-none text-paper/[0.02] uppercase font-bold select-none pointer-events-none">
          LOG_AMV
        </div>
        
        <div className="relative z-10 border-l border-gold/20 pl-12 py-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/60 mb-12">
            Bitácora_del_Agente
          </h2>
          <div className="space-y-8 max-w-2xl">
            {logs.map((log, i) => (
              <div key={i} className="group">
                <p className="font-serif text-2xl italic text-paper/40 group-hover:text-paper/90 transition-colors duration-500 leading-relaxed">
                  "{log}"
                </p>
                <div className="mt-2 font-mono text-[9px] text-zinc-700 uppercase">
                  Timestamp: {2026}.{5}.{8} // Sequence: 00{i+1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}