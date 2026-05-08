import type { Metadata } from 'next'
import { IntakeTerminal } from '@/components/landing/IntakeTerminal'

export const metadata: Metadata = {
  title: 'Activar Nodo',
  description: 'Crear linea base operacional para memoria longitudinal SFI.'
}

export default function StartPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_42%),#0A0905] px-4 py-10 text-paper md:py-16">
      <IntakeTerminal />
    </main>
  )
}
