'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type ApiState = Record<string, unknown>

function record(value: unknown): ApiState {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as ApiState : {}
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberText(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '—'
}

const INSTRUMENTS = [
  { label: 'ROOT', href: '/root', desc: 'Gobierno, cierre, bitacora y estado operativo.' },
  { label: 'WorldSpectVector', href: '/api/worldspect/state', desc: 'Mundo total y dominios de presion externa.' },
  { label: 'ScoreFriction', href: '/scorefriction', desc: 'Calificacion de friccion objeto-mundo.' },
  { label: 'Atlas', href: '/repository', desc: 'Memoria constitucional y evidencia segmentada.' },
  { label: 'MOP-H', href: '/moph', desc: 'Observacion humana y perturbacion minima.' },
  { label: 'Observatory', href: '/observatory', desc: 'Campo operacional de instrumentos vivos.' },
]

export function SfiOperationalIndex() {
  const [world, setWorld] = useState<ApiState>({})
  const [score, setScore] = useState<ApiState>({})

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/worldspect/state', { cache: 'no-store' }).then((res) => res.json()).catch(() => ({})),
      fetch('/api/scorefriction/state', { cache: 'no-store' }).then((res) => res.json()).catch(() => ({})),
    ]).then(([w, s]) => {
      if (!alive) return
      setWorld(record(record(w).data ?? w))
      setScore(record(record(s).data ?? s))
    })
    return () => { alive = false }
  }, [])

  const support = text(world.supportLevel, 'weak')
  const coverage = numberText(world.sourceCoverage)
  const observations = Array.isArray(score.observations) ? score.observations.length : 0

  return (
    <main className="min-h-screen bg-[#060605] text-[#d7cdb8]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e1c17] pb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#c8a951]">System Friction Institute</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[#eee6d1] sm:text-6xl">
              Indice operativo del campo.
            </h1>
          </div>
          <Link href="/scorefriction" className="border border-[#8a7035] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951] hover:bg-[#c8a951] hover:text-[#060605]">
            Auditar objeto
          </Link>
        </header>

        <section className="grid flex-1 gap-4 py-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {INSTRUMENTS.map((item) => (
              <Link key={item.href} href={item.href} className="group border border-[#1e1c17] bg-[#0a0a09] p-5 transition hover:border-[#8a7035]/70">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7a7568]">instrumento</p>
                <h2 className="mt-3 text-xl font-semibold text-[#eee6d1] group-hover:text-[#c8a951]">{item.label}</h2>
                <p className="mt-3 text-sm leading-6 text-[#9d927f]">{item.desc}</p>
              </Link>
            ))}
          </div>

          <aside className="space-y-4">
            <section className="border border-[#1e1c17] bg-[#0a0a09] p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7a7568]">estado del mundo</p>
              <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-[0.13em]">
                <div className="border border-[#1e1c17] p-3"><span className="text-[#6f685c]">Soporte</span><br /><strong className="text-[#c8a951]">{support}</strong></div>
                <div className="border border-[#1e1c17] p-3"><span className="text-[#6f685c]">Coverage</span><br /><strong className="text-[#c8a951]">{coverage}</strong></div>
                <div className="border border-[#1e1c17] p-3"><span className="text-[#6f685c]">Estado</span><br /><strong className="text-[#c8a951]">{text(world.source_state)}</strong></div>
                <div className="border border-[#1e1c17] p-3"><span className="text-[#6f685c]">ScoreFriction</span><br /><strong className="text-[#c8a951]">{observations}</strong></div>
              </div>
              <p className="mt-4 text-xs leading-6 text-[#8f8678]">
                WSV mide el mundo. ScoreFriction califica la friccion entre un objeto y ese mundo. ROOT gobierna cierre y trazabilidad.
              </p>
            </section>

            <section className="border border-[#1e1c17] bg-[#0a0a09] p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7a7568]">rutas claras</p>
              <div className="mt-4 grid gap-2">
                <Link href="/scorefriction" className="border border-[#1e1c17] px-3 py-2 text-sm text-[#d7cdb8] hover:border-[#8a7035]">ScoreFriction · objeto ↔ WSV</Link>
                <Link href="/repository" className="border border-[#1e1c17] px-3 py-2 text-sm text-[#d7cdb8] hover:border-[#8a7035]">Atlas / Repositorio</Link>
                <Link href="/root" className="border border-[#1e1c17] px-3 py-2 text-sm text-[#d7cdb8] hover:border-[#8a7035]">ROOT</Link>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  )
}
