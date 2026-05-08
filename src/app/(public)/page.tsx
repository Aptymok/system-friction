import type { Metadata } from 'next'
import { Estratos } from '@/components/landing/Estratos'
import { Hero } from '@/components/landing/Hero'
import { OperationalCTA } from '@/components/landing/OperationalCTA'
import { TelemetryPreview } from '@/components/landing/TelemetryPreview'

export const metadata: Metadata = {
  title: 'System Friction · Observatorio de Coherencia',
  description: 'Infraestructura de auditoria operacional: IHG, NTI, LDI, MOP-H y AMV.'
}

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <OperationalCTA />
      <Estratos />
      <TelemetryPreview />
    </main>
  )
}
