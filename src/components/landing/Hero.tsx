'use client'

import { Radar } from 'lucide-react'
import { IntakeTerminal } from './IntakeTerminal'

export function Hero() {
  return (
    <section className="relative flex min-h-[95vh] items-center overflow-hidden bg-[#151311] px-6 pt-20 text-paper">
      {/* Grid de Fondo de Infraestructura */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#F5F2ED 1px, transparent 1px), linear-gradient(90deg, #F5F2ED 1px, transparent 1px)',
          backgroundSize: '72px 72px'
        }}
      />

      {/* Brillo de Profundidad (Ambient Light) */}
      <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-gold/5 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 pb-16 lg:grid-cols-[1fr_450px] lg:items-center">
        
        {/* COLUMNA IZQUIERDA: NARRATIVA DE IMPACTO */}
        <div className="space-y-8">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 border border-gold/20 bg-gold/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
            </span>
            SFI_NODE: ACTIVE // ESTADO_00
          </div>

          <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tighter md:text-7xl lg:max-w-xl">
            Auditamos tu <span className="text-gold italic underline decoration-gold/20 underline-offset-8">ejecución</span>, no tu intención.
          </h1>

          <p className="max-w-xl font-serif text-2xl italic leading-relaxed text-paper/60">
            El Observatorio detecta la distancia real entre lo que declaras y lo que haces. No es una consulta; es una auditoría de tu latencia operativa.
          </p>

          <div className="flex items-center gap-6 pt-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-gold/50 uppercase tracking-widest text-left">Protocolo Activo</span>
              <span className="font-mono text-xs text-paper">MOP-H_v2.06</span>
            </div>
            <div className="h-8 w-px bg-gold/10" />
            <div className="flex flex-col gap-1 text-left">
              <span className="font-mono text-[9px] text-gold/50 uppercase tracking-widest">SMI</span>
              <span className="font-mono text-xs text-paper uppercase">Convergencia_Total</span>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: LA MÁQUINA (TERMINAL) */}
        <div className="relative group">
          {/* Decoración técnica alrededor de la terminal */}
          <div className="absolute -inset-2 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
          
          <div className="relative">
            <IntakeTerminal />
            
            {/* Micro-copy de advertencia post-terminal */}
            <div className="mt-6 flex items-start gap-4 px-4 opacity-40 group-hover:opacity-100 transition-opacity">
              <Radar className="mt-1 h-3 w-3 text-gold" />
              <p className="font-mono text-[9px] leading-relaxed text-zinc-500 uppercase tracking-widest">
                Atención: El sistema registra micro-pausas y ediciones narrativas. Cualquier intento de evasión modificará tu score de Homeostasis (IHG).
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}