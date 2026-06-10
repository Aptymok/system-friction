'use client'

import { useEffect, useRef } from 'react'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

export function PanelCField({ context }: { context: ScoreFrictionPanelContext }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const targetCanvas = canvas
    const context2d = ctx
    let frame = 0
    let raf = 0
    const particles = Array.from({ length: 72 }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      a: index * 0.37,
      r: 1 + Math.random() * 2.6,
    }))

    function draw() {
      const rect = targetCanvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      targetCanvas.width = Math.max(1, Math.floor(rect.width * dpr))
      targetCanvas.height = Math.max(1, Math.floor(rect.height * dpr))
      context2d.setTransform(dpr, 0, 0, dpr, 0, 0)
      context2d.clearRect(0, 0, rect.width, rect.height)
      context2d.fillStyle = '#060605'
      context2d.fillRect(0, 0, rect.width, rect.height)
      const hot = context.metrics.regime === 'ENTROPICO'
      const line = hot ? '184,80,80' : context.metrics.regime === 'HOMEOSTATICO' ? '84,170,112' : '216,182,74'

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        const x = ((p.x * rect.width) + Math.sin(frame * 0.012 + p.a) * 28 + rect.width) % rect.width
        const y = ((p.y * rect.height) + Math.cos(frame * 0.01 + p.a) * 18 + rect.height) % rect.height
        context2d.beginPath()
        context2d.arc(x, y, p.r, 0, Math.PI * 2)
        context2d.fillStyle = `rgba(${line},${0.18 + context.metrics.fs * 0.24})`
        context2d.fill()
        if (i % 3 === 0) {
          context2d.beginPath()
          context2d.moveTo(x, y)
          context2d.lineTo(rect.width - x * 0.8, (y + frame * 0.2) % rect.height)
          context2d.strokeStyle = `rgba(${line},0.055)`
          context2d.stroke()
        }
      }
      frame += 1
      raf = window.requestAnimationFrame(draw)
    }
    draw()
    return () => window.cancelAnimationFrame(raf)
  }, [context.metrics.fs, context.metrics.regime])

  return (
    <PanelFrame title="CAMPO DE FRICCION" topo="ZONE-A" className="w-[410px]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute bottom-4 left-4 right-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[#b8ad98]">
        regimen {context.metrics.regime} / tension visual derivada de Phi_SF
      </div>
    </PanelFrame>
  )
}
