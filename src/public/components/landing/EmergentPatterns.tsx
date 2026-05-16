import { AlertTriangle } from 'lucide-react'

const patterns = [
  {
    title: 'Loop de Intención Infinita',
    effect: 'La narrativa cambia constantemente para evadir la falta de ejecución.',
    severity: 'ALTA'
  },
  {
    title: 'Latencia Crónica',
    effect: 'Reconocimiento del problema sin transición hacia acción sostenida.',
    severity: 'CRÍTICA'
  },
  {
    title: 'Contradicción Longitudinal',
    effect: 'Divergencia entre discurso y conducta durante múltiples ciclos operacionales.',
    severity: 'ESTRUCTURAL'
  }
]

export function EmergentPatterns() {
  return (
    <section className="bg-[#151311] py-24 px-6">
      <div className="mx-auto max-w-6xl border border-red-500/10 bg-red-500/[0.01] p-12">
        <div className="flex items-center gap-4 mb-12">
          <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
          <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-red-500/70">
            PATRONES_DE_DERIVA_DETECTADOS
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {patterns.map((p) => (
            <div key={p.title} className="space-y-4">
              <div className="flex justify-between items-center border-b border-paper/5 pb-2">
                <span className="font-mono text-[9px] text-red-500/50 italic">{p.severity}</span>
                <div className="h-1 w-1 bg-red-500/30" />
              </div>
              <h3 className="font-mono text-sm text-paper uppercase tracking-wider">{p.title}</h3>
              <p className="text-xs text-zinc-500 font-serif italic leading-relaxed">
                {p.effect}
              </p>
            </div>
          ))}
        </div>
        
        <p className="mt-12 font-mono text-[10px] text-zinc-700 uppercase text-center tracking-[0.2em]">
          {">"} El observatorio detecta estructuras repetitivas antes de la ruptura.
        </p>
      </div>
    </section>
  )
}