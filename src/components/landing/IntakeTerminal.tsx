'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, Send, AlertCircle, Lock } from 'lucide-react'
import { trackCognitiveResistance, type CognitiveState } from '@/lib/telemetry/BehavioralTracker'

// Preguntas de Colisión (Micro-MOP-H)
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
  const router = useRouter()
  
  // Estados de Proceso
  const [stage, setStage] = useState<'INTAKE' | 'DICTUM' | 'PAYMENT'>('INTAKE')
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Estados de Datos
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  
  // Estados de Telemetría
  const [startTime, setStartTime] = useState(Date.now())
  const [deletions, setDeletions] = useState(0)
  const [metrics, setMetrics] = useState<CognitiveState | null>(null)

  const question = COLLISION_QUESTIONS[index]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') setDeletions(d => d + 1)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleNext()
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
    
    // Simulamos procesamiento del AMV
    setTimeout(() => {
      setStage('DICTUM')
      setLoading(false)
    }, 2000)
  }

  return (
    <section className="terminal-panel relative mx-auto max-w-3xl overflow-hidden p-5 md:p-8 border border-gold/20 bg-void/90 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="scanline opacity-20" />
      
      <div className="relative">
        <header className="mb-8 border-b border-gold/10 pb-4 flex justify-between items-center">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-gold/60">SFI_INTAKE_PROTOCOL // R18</p>
            <h2 className="font-display text-lg uppercase text-paper tracking-tighter">Observatorio de Fricción</h2>
          </div>
          {stage === 'INTAKE' && (
            <div className="text-right font-mono text-[9px] text-zinc-600">
              ESTRATO_00 // PASO 0{index + 1}
            </div>
          )}
        </header>

        {stage === 'INTAKE' && (
          <div className="space-y-6 animate-in fade-in duration-500" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-gold italic uppercase tracking-widest">[{question.phase}]</span>
              <p className="font-serif text-2xl italic leading-relaxed text-paper">
                {question.text}
              </p>
            </div>

            <textarea
              autoFocus
              value={answers[question.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
              className="w-full min-h-[160px] bg-black/40 border border-gold/10 p-4 font-serif text-lg text-paper outline-none focus:border-gold/30 transition-all placeholder:text-zinc-800"
              placeholder="No pienses. Escribe la verdad que intentas ignorar..."
            />

            <div className="flex justify-between items-center">
              <p className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest italic">
                {">"} El sistema registra pausas y ediciones...
              </p>
              <button
                onClick={handleNext}
                disabled={!answers[question.id]}
                className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 px-6 py-2 font-mono text-[10px] uppercase text-gold hover:bg-gold hover:text-void transition-all"
              >
                Continuar <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {stage === 'DICTUM' && metrics && (
          <div className="space-y-8 animate-in zoom-in-95 duration-700">
            <div className="border border-red-900/30 bg-red-950/10 p-6">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-mono text-xs uppercase tracking-widest font-bold">Dictamen del Agente (AMV)</h3>
              </div>
              <p className="font-serif text-xl italic text-paper/90 leading-relaxed">
                "Detectada deriva cognitiva de nivel terminal. Tu latencia de respuesta ({metrics.latency.toFixed(1)}s) y el patrón de edición sugieren que estás protegiendo tu parálisis actual con una narrativa de seguridad altamente inflada."
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-red-900/20 pt-4 font-mono text-[9px]">
                <div>
                  <span className="block text-zinc-600">RIESGO_EVASIÓN</span>
                  <span className="text-red-400 font-bold">{metrics.pattern}</span>
                </div>
                <div>
                  <span className="block text-zinc-600">IHG_ESTIMADO</span>
                  <span className="text-red-400 font-bold">-0.74</span>
                </div>
                <div>
                  <span className="block text-zinc-600">COSTO_LATENCIA</span>
                  <span className="text-red-400 font-bold">CRÍTICO</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-zinc-400 font-serif italic text-center">
                Este diagnóstico es parcial. Para desbloquear el mapa de resolución completa y persistir tu nodo, se requiere peaje operacional.
              </p>
              <button
                onClick={() => setStage('PAYMENT')}
                className="w-full bg-gold py-5 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-void hover:bg-white transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)]"
              >
                Desbloquear Resolución Mínima ($29 USD)
              </button>
            </div>
          </div>
        )}

        {stage === 'PAYMENT' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="font-display text-xl text-paper uppercase">Formular Identidad de Nodo</h3>
            <div className="grid gap-4 md:grid-cols-2">
               <Field label="Alias de Nodo" value={alias} onChange={setAlias} placeholder="NODO-ALPHA" />
               <Field label="Correo de Persistencia" value={email} onChange={setEmail} placeholder="tu@email.com" type="email" />
            </div>
            <div className="border border-gold/10 p-6 bg-gold/5 flex items-center gap-4">
               <Lock className="h-10 w-10 text-gold/40" />
               <p className="text-xs text-zinc-500 italic font-serif">
                 Al completar el peaje, el sistema habilitará las 14 preguntas restantes del MOP-H y generará tu reporte de ejecución longitudinal inmediato.
               </p>
            </div>
            <button
              onClick={() => {/* Integración con Stripe o PayPal */}}
              className="w-full bg-paper py-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-void hover:bg-gold transition-all"
            >
              Confirmar Peaje y Continuar
            </button>
            <button onClick={() => setStage('DICTUM')} className="w-full text-center font-mono text-[9px] text-zinc-700 uppercase hover:text-zinc-500">
              Regresar al Dictamen
            </button>
          </div>
        )}

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

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-black/40 border border-gold/10 px-4 py-3 font-mono text-sm text-paper outline-none focus:border-gold/30"
      />
    </label>
  )
}