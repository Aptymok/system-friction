export function NodeActivity() {
  const activities = [
    { node: 'AGS', action: 'Auditoría ejecutada', time: '12m', status: 'RESOLVED' },
    { node: 'UMBRA', action: 'Nueva resolución mínima aplicada', time: '31m', status: 'ACTIVE' },
    { node: 'DELTA', action: 'Incremento de tensión longitudinal', time: '1h', status: 'ALERT' },
    { node: 'KRONOS', action: 'Sincronización de memoria activa', time: '2h', status: 'SYNC' }
  ]

  return (
    <section className="bg-[#151311] py-24 px-6 border-b border-paper/5">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-md">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold mb-4">
              Actividad_de_Nodos
            </h2>
            <p className="font-serif text-2xl italic text-paper/80">
              El sistema continúa operando. La fricción deja rastros observables en tiempo real.
            </p>
          </div>
          <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
            Uptime: 99.98% // Nodes_Online: 14
          </div>
        </div>

        <div className="space-y-2">
          {activities.map((act, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between border border-paper/5 bg-white/[0.01] p-4 font-mono text-[11px] group hover:border-gold/20 transition-colors"
            >
              <div className="flex items-center gap-6">
                <span className="text-zinc-500">[{act.time}]</span>
                <span className="text-gold">NODO-{act.node}</span>
                <span className="text-paper/60 italic">{act.action}</span>
              </div>
              <span className={`px-2 py-0.5 text-[9px] border ${
                act.status === 'ALERT' ? 'border-red-500/50 text-red-500' : 
                act.status === 'RESOLVED' ? 'border-gold/50 text-gold' : 'border-zinc-700 text-zinc-500'
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