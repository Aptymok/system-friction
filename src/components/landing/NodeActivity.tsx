export function NodeActivity() {
  const activities = [
    { 
      node: '442', 
      action: 'Latencia recurrente detectada', 
      detail: '7 auditorías iniciadas // 0 resoluciones', 
      time: '12m', 
      status: 'INACTIVE' 
    },
    { 
      node: '109', 
      action: 'Contradicción persistente', 
      detail: 'Divergencia entre objetivo y ejecución', 
      time: '31m', 
      status: 'ALERT' 
    },
    { 
      node: 'ALPHA', 
      action: 'Resolución mínima verificada', 
      detail: 'Sincronización de línea base completa', 
      time: '1h', 
      status: 'STABLE' 
    },
    { 
      node: 'KRONOS', 
      action: 'Sincronización de memoria activa', 
      detail: 'Escaneo longitudinal en curso', 
      time: '2h', 
      status: 'SYNC' 
    }
  ]

  return (
    <section className="bg-[#151311] py-24 px-6 border-b border-paper/5">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-md">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold mb-4">
              Actividad_de_Nodos_SFI
            </h2>
            <p className="font-serif text-2xl italic text-paper/80">
              El sistema continúa operando. La fricción deja rastros observables en tiempo real.
            </p>
          </div>
          <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
            Uptime: 99.98% // Nodes_Online: 14 // Protocol: R18
          </div>
        </div>

        <div className="space-y-2">
          {activities.map((act, i) => (
            <div 
              key={i} 
              className="flex flex-col md:flex-row md:items-center justify-between border border-paper/5 bg-white/[0.01] p-5 font-mono text-[11px] group hover:border-gold/20 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <span className="text-zinc-500 w-12">[{act.time}]</span>
                <div className="flex flex-col">
                  <span className="text-gold">NODO-{act.node}</span>
                  <span className="text-[9px] text-zinc-600 uppercase tracking-tighter">{act.detail}</span>
                </div>
                <span className="text-paper/60 italic border-l border-paper/10 pl-4">{act.action}</span>
              </div>
              
              <span className={`mt-4 md:mt-0 px-2 py-0.5 text-[9px] border self-start md:self-center ${
                act.status === 'ALERT' ? 'border-red-500/50 text-red-500' : 
                act.status === 'STABLE' || act.status === 'RESOLVED' ? 'border-gold/50 text-gold' : 
                'border-zinc-700 text-zinc-500'
              }`}>
                {act.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}