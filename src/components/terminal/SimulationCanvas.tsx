'use client'

import { useEffect, useRef } from 'react'
import { useNodeStore } from '@/lib/store/nodeStore'

export function SimulationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { metrics } = useNodeStore()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let frame = 0
    let animation = 0
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      canvas.width = Math.max(320, Math.floor(rect?.width || 640))
      canvas.height = 260
    }
    resize()
    window.addEventListener('resize', resize)

    const nodes = Array.from({ length: 18 + Math.round(Math.abs(metrics.ihg) * 18) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * (0.22 + Math.abs(metrics.ihg) * 0.5),
      vy: (Math.random() - 0.5) * (0.22 + Math.abs(metrics.ihg) * 0.5),
      r: 1.4 + Math.random() * 2.8,
      critical: Math.random() > metrics.nti
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        a.x += a.vx
        a.y += a.vy
        if (a.x < 0 || a.x > canvas.width) a.vx *= -1
        if (a.y < 0 || a.y > canvas.height) a.vy *= -1

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 92) {
            ctx.strokeStyle = `rgba(212,175,55,${0.03 + (1 - Math.abs(metrics.ihg)) * 0.12})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const node of nodes) {
        const pulse = 1 + Math.sin(frame / 25 + node.r) * 0.16
        ctx.beginPath()
        ctx.fillStyle = node.critical ? '#B85050' : '#D4AF37'
        ctx.arc(node.x, node.y, node.r * pulse, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#6B635A'
      ctx.font = '10px JetBrains Mono'
      ctx.fillText(`IHG ${metrics.ihg.toFixed(3)} / NTI ${metrics.nti.toFixed(3)} / LOOP ${Math.round(metrics.loop_score * 100)}%`, 14, 22)
      frame += 1
      animation = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animation)
      window.removeEventListener('resize', resize)
    }
  }, [metrics])

  return (
    <section className="terminal-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-gold/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        <span>Topologia reactiva</span>
        <span className="text-gold">{Math.abs(metrics.ihg) > 0.3 ? 'friccion' : 'observacion'}</span>
      </div>
      <canvas ref={canvasRef} className="block w-full" style={{ height: 260 }} />
    </section>
  )
}
