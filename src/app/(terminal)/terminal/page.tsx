'use client'

import { useEffect, useState } from 'react'
import { Loader2, Lock, FileText, Zap } from 'lucide-react' // Añadimos iconos
import { useRouter } from 'next/navigation'
import { ConsoleColumn } from '@/components/terminal/ConsoleColumn'
import { MemoryColumn } from '@/components/terminal/MemoryColumn'
import { StateColumn } from '@/components/terminal/StateColumn'
import { useNodeStore } from '@/lib/store/nodeStore'

export default function TerminalPage() {
  const router = useRouter()
  const { node, loading, loadAudits } = useNodeStore()
  const [initialized, setInitialized] = useState(false)
  
  // ESTADO DE LICENCIA (Esto debería venir de tu base de datos)
  // 'dictamen' = solo PDF | 'full' = acceso total
  const [licenseType, setLicenseType] = useState<'dictamen' | 'full'>('dictamen')

  useEffect(() => {
    const init = async () => {
      const activeNodeId = window.localStorage.getItem('sf-active-node-id')
      if (activeNodeId && !node) {
        await loadAudits(activeNodeId)
      } else if (!node) {
        router.replace('/start')
        return
      } else {
        await loadAudits(node.id)
      }
      setInitialized(true)
    }
    void init()
  }, [loadAudits, node, router])

  if (!initialized || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void text-gold font-mono">
        <Loader2 className="h-5 w-5 animate-spin mr-3" /> SINCRONIZANDO NODO...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0905] p-3 md:p-6 overflow-hidden">
      {/* HEADER CON BOTÓN DE DESCARGA SIEMPRE VISIBLE */}
      <header className="mb-5 flex flex-col gap-4 border-b border-gold/10 pb-5 md:flex-row md:items-end md:justify-between font-mono">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-gold">SFI-CORE.vNEXT</p>
          <h1 className="mt-2 text-paper text-xl uppercase tracking-widest">Nodo de observación</h1>
        </div>
        
        <div className="flex gap-3">
          {/* BOTÓN DESCARGAR PDF: Disponible para todos los que pagaron al menos 9 USD */}
          <button className="flex items-center gap-2 bg-white/5 border border-gold/20 px-4 py-2 text-[10px] text-gold hover:bg-gold hover:text-black transition-all uppercase font-bold tracking-tighter">
            <FileText className="h-3 w-3" /> Descargar Dictamen Estructural (PDF)
          </button>

          {/* BOTÓN UPGRADE: Solo aparece si no ha comprado el bundle completo */}
          {licenseType === 'dictamen' && (
            <a 
              href="https://buy.stripe.com/3cIbJ29dY3qo2NVcWv5Ne01" // Link de los 10 USD restantes o el de 19
              className="flex items-center gap-2 bg-cyan-600 border border-cyan-400 px-4 py-2 text-[10px] text-white hover:bg-white hover:text-cyan-600 transition-all uppercase font-bold animate-pulse"
            >
              <Zap className="h-3 w-3 fill-current" /> Desbloquear Terminal Completa
            </a>
          )}
        </div>
      </header>

      {/* GRID DE COLUMNAS */}
      <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 gap-5 xl:grid-cols-[1.05fr_1fr_0.9fr] relative">
        
        {/* LÓGICA DE BLOQUEO DE LA CONSOLA (AMV) */}
        <div className="relative group">
          <ConsoleColumn />
          
          {licenseType === 'dictamen' && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-void/60 backdrop-blur-md border border-red-500/20 p-8 text-center">
              <Lock className="h-8 w-8 text-red-500 mb-4 opacity-50" />
              <p className="text-red-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-2 font-bold">
                Intervención Bloqueada
              </p>
              <p className="text-zinc-400 font-serif text-sm italic max-w-[250px] mb-6">
                Tu licencia actual solo permite la lectura del dictamen estático. Para interactuar con el AMV, actualiza tu nodo.
              </p>
              <a 
                href="https://buy.stripe.com/7sYbJ2eyif964W3aOn5Ne04"
                className="bg-red-950/40 border border-red-500 text-red-500 px-6 py-2 font-mono text-[10px] hover:bg-red-500 hover:text-white transition-all uppercase"
              >
                Desbloquear AMV (+ $10 USD)
              </a>
            </div>
          )}
        </div>

        <StateColumn />
        <MemoryColumn />
      </div>
    </main>
  )
}