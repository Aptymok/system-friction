'use client'
import { AlertCircle } from 'lucide-react'

export function InterruptionAlert({ onResume, onExit }: { onResume: () => void, onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/95 p-6 backdrop-blur-md">
      <div className="max-w-md border border-gold/20 bg-black p-8 shadow-[0_0_40px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 text-gold mb-6">
          <AlertCircle className="h-5 w-5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Sistema_Alerta_08</span>
        </div>

        <h3 className="font-display text-xl uppercase tracking-wider text-paper">
          Interrupción de línea base
        </h3>
        
        <div className="mt-4 space-y-4 font-mono text-[11px] leading-relaxed text-zinc-500 uppercase">
          <p>
            {">"} La auditoría fue detenida antes de completar la secuencia de inducción.
          </p>
          <p>
            {">"} El sistema registra la interrupción del proceso como aumento de latencia (LDI) entre intención y ejecución.
          </p>
          <p>
            {">"} ¿Deseas archivar la sesión actual o reanudar el diagnóstico?
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full bg-gold py-4 font-mono text-[10px] font-bold uppercase tracking-widest text-void transition-colors hover:bg-white"
          >
            Reanudar Diagnóstico
          </button>
          <button
            onClick={onExit}
            className="w-full border border-paper/10 py-4 font-mono text-[10px] uppercase tracking-widest text-zinc-600 transition-colors hover:text-paper"
          >
            Cerrar Sesión (Archivar)
          </button>
        </div>
      </div>
    </div>
  )
}
