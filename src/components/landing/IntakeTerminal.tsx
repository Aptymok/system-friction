'use client'

import { useState } from 'react'
import { ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { trackCognitiveResistance, type CognitiveState } from '@/lib/telemetry/BehavioralTracker'

const COLLISION_QUESTIONS = [
  {
    id: 'C1',
    phase: 'IDENTIDAD',
    text: "¿Cuál es la versión de ti mismo que vendes en público para ocultar que llevas meses sin avanzar un solo milímetro en tu objetivo real?"
  },
  {
    id: 'C2',
    phase: 'RESISTENCIA',
    text: "Si hoy desaparecieran todas tus excusas 'lógicas', ¿qué miedo estructural te quedaría para justificar que sigues en el mismo lugar?"
  },
  {
    id: 'C3',
    phase: 'LATENCIA',
    text: "Escribe la fecha exacta en la que tu parálisis actual se convertirá en un colapso irreversible. El sistema ya la calculó, solo verifica si tú lo sabes."
  }
]

export function IntakeTerminal() {
  const [stage, setStage] = useState<'INTAKE' | 'DICTUM' | 'PAYMENT'>('INTAKE')
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [startTime, setStartTime] = useState(Date.now())
  const [deletions, setDeletions] = useState(0)
  const [metrics, setMetrics] = useState<CognitiveState | null>(null)
  
  // Estado para vincular el pago con el usuario
  const [userEmail, setUserEmail] = useState('')

  const question = COLLISION_QUESTIONS[index]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') setDeletions(d => d + 1)
  }

  const handleNext = () => {
    if (!answers[question.id]) return
    if (index < COLLISION_QUESTIONS.length - 1) {
      setIndex(i => i + 1)
      setStartTime(Date.now())
      setDeletions(0)
    } else {
      processDictum()
    }
  }

  const processDictum = () => {
    setLoading(true)
    const finalStats = trackCognitiveResistance(answers[question.id], startTime, deletions)
    setMetrics(finalStats)
    setTimeout(() => {
      setStage('DICTUM')
      setLoading(false)
    }, 2000)
  }

  return (
    <section className="terminal-panel relative mx-auto max-w-3xl overflow-hidden p-5 md:p-8 border border-gold/20 bg-void/90 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="scanline opacity-20" />
      
      <div className="relative">
        <header className="mb-8 border-b border-gold/10 pb-4 flex justify-between items-center font-mono text-paper">
          <div>
            <p className="text-[9px] uppercase tracking-[0.35em] text-gold/60">SFI_INTAKE_PROTOCOL // R18</p>
            <h2 className="text-lg uppercase tracking-tighter">Observatorio de Fricción</h2>
          </div>
          <div className="text-right text-[9px] text-zinc-600 uppercase italic">
            {stage === 'INTAKE' ? `Captura_Señal // 0${index + 1}` : 'Analítica_Terminal'}
          </div>
        </header>

        {/* FASE 1: CAPTURA DE SEÑAL */}
        {stage === 'INTAKE' && (
          <div className="space-y-6 animate-in fade-in duration-500" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-gold italic uppercase tracking-widest">[{question.phase}]</span>
              <p className="font-serif text-2xl italic leading-relaxed text-paper">{question.text}</p>
            </div>
            <textarea
              autoFocus
              value={answers[question.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
              className="w-full min-h-[160px] bg-black/40 border border-gold/10 p-4 font-serif text-lg text-paper outline-none focus:border-gold/30 transition-all placeholder:text-zinc-800"
              placeholder="Escribe la verdad que intentas ignorar..."
            />
            <div className="flex justify-between items-center">
              <p className="font-mono text-[9px] text-zinc-600 uppercase italic tracking-widest">{">"} Registrando latencias...</p>
              <button onClick={handleNext} disabled={!answers[question.id]} className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 px-6 py-2 font-mono text-[10px] uppercase text-gold hover:bg-gold hover:text-void transition-all">
                Siguiente estrato <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* FASE 2: ANALÍTICA PREVIA */}
        {stage === 'DICTUM' && metrics && (
          <div className="space-y-8 animate-in zoom-in-95 duration-700 font-mono">
            <div className="border border-red-900/30 bg-red-950/10 p-6">
              <div className="flex items-center gap-3 text-red-500 mb-4 uppercase text-xs font-bold tracking-widest">
                <AlertCircle className="h-5 w-5" />
                <h3>Dictamen del Agente (AMV)</h3>
              </div>
              <p className="font-serif text-xl italic text-paper/90 leading-relaxed mb-6">
                "Detectada deriva cognitiva crítica. Tus patrones de latencia y edición sugieren una narrativa defensiva ante el colapso inminente."
              </p>
            </div>
            <button
              onClick={() => setStage('PAYMENT')}
              className="w-full bg-gold py-5 text-void text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)]"
            >
              Obtener Resolución Estructural
            </button>
          </div>
        )}

        {/* FASE 3: DESBLOQUEO (CORREO + STRIPE) */}
        {stage === 'PAYMENT' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-mono">
            <div className="p-6 border border-cyan-500/30 bg-cyan-950/10">
              {!userEmail ? (
                <div className="space-y-4">
                  <p className="text-cyan-400 text-[10px] uppercase tracking-widest mb-4">
                    {">"} REGISTRE SU CORREO PARA VINCULAR EL NODO
                  </p>
                  <input 
                    type="email"
                    placeholder="email@ejemplo.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setUserEmail((e.target as HTMLInputElement).value)
                    }}
                    onBlur={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-black/40 border border-cyan-900 p-3 text-cyan-400 outline-none focus:border-cyan-500 transition-all placeholder:text-cyan-900/50"
                  />
                  <p className="text-[9px] text-zinc-500 italic">
                    * El sistema requiere este ID para persistir su dictamen. Presione Enter para confirmar.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 flex flex-col">
                  <p className="text-cyan-400 text-[10px] uppercase mb-4 tracking-tighter">
                    IDENTIDAD REGISTRADA: <span className="text-white underline">{userEmail}</span>
                  </p>
                  
                  <a 
                    href={`https://buy.stripe.com/3cIbJ29dY3qo2NVcWv5Ne01?prefilled_email=${userEmail}`}
                    className="w-full py-4 bg-cyan-500 text-black text-center text-xs font-bold hover:bg-white transition-all uppercase tracking-widest"
                  >
                    BUNDLE COMPLETO - $19 USD
                  </a>

                  <a 
                    href={`https://buy.stripe.com/7sYbJ2eyif964W3aOn5Ne04?prefilled_email=${userEmail}`}
                    className="w-full py-3 border border-cyan-500 text-cyan-400 text-center text-xs hover:bg-cyan-500/10 transition-all uppercase tracking-widest"
                  >
                    SOLO DICTAMEN - $9 USD
                  </a>
                  
                  <button 
                    onClick={() => setUserEmail('')}
                    className="text-[9px] text-zinc-600 underline uppercase mt-2 self-center"
                  >
                    Corregir identidad
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-void/80 backdrop-blur-md">
            <Loader2 className="h-8 w-8 animate-spin text-gold mb-4" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-gold animate-pulse">Analizando inconsistencias...</p>
          </div>
        )}
      </div>
    </section>
  )
}