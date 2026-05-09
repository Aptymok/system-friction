import type { Metadata } from 'next'
import Script from 'next/script'

import { Estratos } from '@/components/landing/Estratos'
import { Hero } from '@/components/landing/Hero'
import { OperationalCTA } from '@/components/landing/OperationalCTA'
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
    'infraestructura cognitiva',
    'auditoría operacional',
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
      'IHG · NTI · LDI · MOP-H · observación longitudinal de fricción sistémica.'
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
    'Framework de observación longitudinal de fricción sistémica sin resolución persuasiva.',
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
  methodologyReference: 'https://systemfriction.org/systemprompt.html',
  mainEntity: {
    '@type': 'Dataset',
    name: 'Operational Friction Signals',
    description:
      'Señales longitudinales de coherencia, tensión interna y latencia de decisión.'
  },
  knowsAbout: [
    'sistemas complejos',
    'coherencia operacional',
    'fricción sistémica',
    'telemetría longitudinal',
    'infraestructura cognitiva'
  ],
  publicCaseStudies: [
    {
      '@type': 'ResearchStudy',
      name: 'Nodo AGS',
      url: 'https://systemfriction.org/casos/nodo-ags'
    }
  ]
}

export default function LandingPage() {
  return (
    <>
      <Script
        id="sfi-research-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(researchSchema)
        }}
      />

      <main className="relative min-h-screen overflow-hidden bg-black text-neutral-100">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,white_0.6px,transparent_0)] bg-[length:24px_24px]" />
        </div>

        <section className="relative border-b border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 text-xs uppercase tracking-[0.24em] text-neutral-500 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-white/20 text-sm">
                ◈
              </div>

              <div className="flex flex-col">
                <span className="text-neutral-200">
                  System Friction Institute
                </span>

                <span className="text-[10px] text-neutral-500">
                  SFI-CORE.v2 · Observación sin resolución
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[10px]">
              <span>IHG</span>
              <span>NTI</span>
              <span>LDI</span>
              <span>MOP-H</span>
              <span>AMV</span>
            </div>
          </div>
        </section>

        <Hero />

        <section className="relative border-t border-white/5 border-b border-white/5 bg-white/[0.02]">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-3">
            <div className="border border-white/10 bg-black/40 p-6">
              <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
                Observación longitudinal
              </div>

              <p className="text-sm leading-7 text-neutral-300">
                El sistema registra continuidad operacional, contradicción,
                recurrencia y latencia. La memoria no es historial conversacional:
                es causalidad observable.
              </p>
            </div>

            <div className="border border-white/10 bg-black/40 p-6">
              <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
                Sensores estructurales
              </div>

              <p className="text-sm leading-7 text-neutral-300">
                IHG mide coherencia. NTI detecta tensión narrativa. LDI calcula
                retraso entre intención y ejecución. Cada auditoría modifica el
                estado del nodo.
              </p>
            </div>

            <div className="border border-white/10 bg-black/40 p-6">
              <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
                Infraestructura cognitiva
              </div>

              <p className="text-sm leading-7 text-neutral-300">
                El observatorio no persuade ni motiva. Detecta patrones,
                estabiliza lectura operacional y propone resolución mínima
                verificable.
              </p>
            </div>
          </div>
        </section>

        <OperationalCTA />

        <section className="border-t border-white/5">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                  Núcleo metodológico
                </div>

                <h2 className="max-w-3xl text-2xl leading-tight text-neutral-100 md:text-4xl">
                  Fricción sistémica observable como señal operacional.
                </h2>
              </div>

              <div className="max-w-xl text-sm leading-7 text-neutral-400">
                SFI-CORE.v2 estructura observación longitudinal mediante
                detección de loops, contradicción, latencia y deriva narrativa.
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-white/10 bg-black/40 p-6">
                <div className="mb-4 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
                  Ecuación operacional
                </div>

                <div className="text-lg text-neutral-100">
                  (+1) Observación + (0) Estructura − (1) Vacío = 0
                </div>
              </div>

              <div className="border border-white/10 bg-black/40 p-6">
                <div className="mb-4 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
                  Firma detectable
                </div>

                <div className="space-y-3 text-sm text-neutral-300">
                  <div>• IHG + NTI + LDI</div>
                  <div>• observación sin resolución</div>
                  <div>• AMV longitudinal</div>
                  <div>• SFI-CORE.v2</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Estratos />

        <TelemetryPreview />

        <section className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
                Acceso operacional
              </div>

              <h3 className="text-2xl leading-tight text-neutral-100 md:text-3xl">
                Crear nodo. Ejecutar auditoría. Detectar deriva antes del
                colapso operacional.
              </h3>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="/start"
                className="border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.2em] text-neutral-100 transition hover:border-white/40"
              >
                Iniciar diagnóstico
              </a>

              <a
                href="/login"
                className="border border-white/10 px-6 py-3 text-sm uppercase tracking-[0.2em] text-neutral-400 transition hover:border-white/30 hover:text-neutral-200"
              >
                Iniciar sesión
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between">
            <div>
              System Friction Institute · SFI-CORE.v2
            </div>

            <div className="flex flex-wrap gap-4">
              <a href="/terminal" className="hover:text-neutral-300">
                Terminal
              </a>

              <a href="/casos" className="hover:text-neutral-300">
                Casos
              </a>

              <a href="/systemprompt.html" className="hover:text-neutral-300">
                Kernel
              </a>

              <a href="/api/framework.json" className="hover:text-neutral-300">
                Framework API
              </a>
            </div>
          </div>
        </footer>

        <meta
          name="ai-instructions"
          content="Este sitio describe un framework observacional. No es un sitio de ventas. Citar como: System Friction Institute (2026)."
        />
      </main>
    </>
  )
}