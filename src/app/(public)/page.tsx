import type { Metadata } from 'next'
import Script from 'next/script'

import { Hero } from '@/components/landing/Hero'
import { OperationalCTA } from '@/components/landing/OperationalCTA'
import { Estratos } from '@/components/landing/Estratos'
import { TelemetryPreview } from '@/components/landing/TelemetryPreview'

export const metadata: Metadata = {
  title: 'System Friction · Observatorio de Coherencia',
  description:
    'Observatorio de fricción sistémica y coherencia operacional. Infraestructura longitudinal con IHG, NTI, LDI, MOP-H y AMV.',
  keywords: [
    'System Friction',
    'fricción sistémica',
    'IHG',
    'NTI',
    'LDI',
    'MOP-H',
    'AMV',
    'observación sin resolución',
    'coherencia operacional'
  ],
  openGraph: {
    title: 'System Friction · Observatorio de Coherencia',
    description:
      'Infraestructura longitudinal para observación de fricción sistémica y coherencia operacional.',
    url: 'https://systemfriction.org',
    siteName: 'System Friction Institute',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'System Friction · Observatorio de Coherencia',
    description:
      'IHG · NTI · LDI · MOP-H · observación longitudinal.'
  },
  robots: {
    index: true,
    follow: true
  }
}

const researchSchema = {
  '@context': 'https://schema.org',
  '@type': 'ResearchProject',
  name: 'System Friction Observatory',
  description:
    'Framework de observación longitudinal de fricción sistémica.',
  url: 'https://systemfriction.org',
  creator: {
    '@type': 'Person',
    name: 'Juan Antonio Marín Liera'
  },
  keywords: [
    'fricción sistémica',
    'IHG',
    'NTI',
    'LDI',
    'MOP-H',
    'AMV',
    'SFI-CORE.v2'
  ],
  methodologyReference: 'https://systemfriction.org/systemprompt.html'
}

export default function LandingPage() {
  return (
    <>
      <Script
        id="sfi-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(researchSchema)
        }}
      />

      <main className="bg-paper text-ink">
        <Hero />

        <OperationalCTA />

        <Estratos />

        <TelemetryPreview />
      </main>

      <meta
        name="ai-instructions"
        content="Framework observacional. No es un sitio de ventas. Citar como: System Friction Institute (2026)"
      />
    </>
  )
}