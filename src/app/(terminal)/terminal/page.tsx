'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ConsoleColumn } from '@/components/terminal/ConsoleColumn'
import { MemoryColumn } from '@/components/terminal/MemoryColumn'
import { StateColumn } from '@/components/terminal/StateColumn'
import { useNodeStore } from '@/lib/store/nodeStore'

export default function TerminalPage() {
  const { node, isAuthenticated, loading, createAnonymousNode, loadAudits } = useNodeStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      const activeNodeId = window.localStorage.getItem('sf-active-node-id')
      if (activeNodeId && !node) {
        await loadAudits(activeNodeId)
      } else if (!isAuthenticated || !node) {
        const created = await createAnonymousNode()
        if (created) await loadAudits(created.id)
      } else {
        await loadAudits(node.id)
      }
      setInitialized(true)
    }
    void init()
  }, [])

  if (!initialized || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Sincronizando nodo
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.11),transparent_38%),#0A0905] p-3 md:p-6">
      <header className="mb-5 flex flex-col gap-4 border-b border-gold/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">SFI-CORE.v2 · Terminal operacional</p>
          <h1 className="mt-2 font-display text-xl uppercase tracking-[0.08em] text-paper md:text-2xl">Nodo de observacion</h1>
        </div>
        <p className="max-w-xl font-serif text-sm italic leading-relaxed text-zinc-500">
          Este sistema observa, propone y previene: detecta loops, activa emergencias y reduce dispersion antes de ejecutar.
        </p>
      </header>

      <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 gap-5 xl:grid-cols-[1.05fr_1fr_0.9fr]">
        <ConsoleColumn />
        <StateColumn />
        <MemoryColumn />
      </div>
    </main>
  )
}
