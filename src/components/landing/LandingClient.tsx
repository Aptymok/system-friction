'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { OperationalSignals } from '@/components/landing/OperationalSignals'
import { SignalFragments } from '@/components/landing/SignalFragments'
import { Estratos } from '@/components/landing/Estratos'
import { OperationalUtility } from '@/components/landing/OperationalUtility'
import { EmergentPatterns } from '@/components/landing/EmergentPatterns'
import { NodeActivity } from '@/components/landing/NodeActivity'
import { CasesPreview } from '@/components/landing/CasesPreview'
import { AMVThoughts } from '@/components/landing/AMVThoughts'
import { OperationalCTA } from '@/components/landing/OperationalCTA'
import { Footer } from '@/components/landing/Footer'
import { InterruptionAlert } from '@/components/landing/InterruptionAlert'

export function LandingClient() {
  const [showExitAlert, setShowExitAlert] = useState(false)

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) setShowExitAlert(true)
    }
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [])

  return (
    <main className="min-h-screen bg-[#151311] text-paper selection:bg-gold/30 selection:text-gold">
      <div className="sr-only">
        <h1>System Friction Institute - Nodo Raíz</h1>
        <p>Métricas: IHG, NTI, LDI. Protocolo: MOP-H.</p>
      </div>

      <div
        className="pointer-events-none fixed inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(#F5F2ED 1px, transparent 1px), linear-gradient(90deg, #F5F2ED 1px, transparent 1px)',
          backgroundSize: '72px 72px'
        }}
      />

      <Header />

      <article className="relative pt-16">
        <Hero />
        <OperationalSignals />
        <SignalFragments />
        <Estratos />
        <OperationalUtility />
        <EmergentPatterns />
        <NodeActivity />
        <CasesPreview />
        <AMVThoughts />
        <OperationalCTA />
      </article>

      <Footer />

      {showExitAlert && (
        <InterruptionAlert 
          onResume={() => setShowExitAlert(false)} 
          onExit={() => setShowExitAlert(false)} 
        />
      )}
    </main>
  )
}