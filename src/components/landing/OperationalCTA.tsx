import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function OperationalCTA() {
  return (
    <section className="bg-[#151311] py-40 px-6 text-center relative">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-gold/[0.03] to-transparent h-1/2 w-full animate-pulse" />
      
      <div className="mx-auto max-w-3xl relative z-10">
        <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter text-paper mb-8">
          ¿Estás listo para la <span className="text-gold italic">coherencia</span>?
        </h2>
        <p className="font-serif text-xl italic text-zinc-500 mb-12 leading-relaxed">
          El MOP-H no es una conversación. Es una auditoría estructural. No abras otra narrativa si no planeas ejecutar una resolución.
        </p>
        
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/start"
            className="group inline-flex items-center gap-4 bg-gold px-12 py-6 font-mono text-xs font-bold uppercase tracking-[0.3em] text-void transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(212,175,55,0.2)]"
          >
            Iniciar Diagnóstico Operacional
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="font-mono text-[9px] text-zinc-700 uppercase tracking-widest">
            {">"} RESOLUCIÓN_MÍNIMA_VERIFICABLE_REQUIRED
          </div>
        </div>
      </div>
    </section>
  )
}