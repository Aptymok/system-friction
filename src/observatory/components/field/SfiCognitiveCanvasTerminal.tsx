'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TerminalCanonicalClientResult } from '@/lib/terminal/canonicalClient'
import { declareTerminalSignal } from '@/lib/terminal/signalClient'

type TerminalMode = 'legacy' | 'canonical' | 'degraded'
type AccordionPanel = 'amv' | 'operation'
type NodeKind = 'active' | 'persistent' | 'anomaly' | 'opaque' | 'institutional'

type Props = {
  nodeId: string | null
  canPersist: boolean
  canonicalState: TerminalCanonicalClientResult | null
  mode: TerminalMode
  onSignalDeclared?: () => void
}

type FieldNode = {
  id: number
  lb: string
  t: NodeKind
  rx: number
  ry: number
  w: number
  x: number
  y: number
  vx: number
  vy: number
  phase: number
  att: number
  wp: number
}

type FieldEdge = { a: number; b: number; k: 's' | 'l' | 'r' }

const C = {
  active: [200, 169, 81],
  persistent: [74, 143, 168],
  anomaly: [205, 200, 185],
  opaque: [20, 20, 16],
  institutional: [58, 122, 90],
} as const

const RND: Array<Omit<FieldNode, 'x' | 'y' | 'vx' | 'vy' | 'phase' | 'att' | 'wp'>> = [
  { id: 0, lb: 'IHG_BASAL', t: 'active', rx: 0.42, ry: 0.41, w: 1 },
  { id: 1, lb: 'NTI_OBS', t: 'active', rx: 0.58, ry: 0.37, w: 0.85 },
  { id: 2, lb: 'FRICCIÓN_SEM', t: 'active', rx: 0.68, ry: 0.56, w: 0.75 },
  { id: 3, lb: 'PERTURBACIÓN', t: 'active', rx: 0.28, ry: 0.57, w: 0.7 },
  { id: 4, lb: 'NOD_DECISIÓN', t: 'active', rx: 0.73, ry: 0.31, w: 0.65 },
  { id: 5, lb: 'DISIPACIÓN', t: 'active', rx: 0.47, ry: 0.68, w: 0.8 },
  { id: 6, lb: 'CAMPO_LAT', t: 'active', rx: 0.82, ry: 0.62, w: 0.58 },
  { id: 7, lb: 'VEC_DIV', t: 'active', rx: 0.22, ry: 0.33, w: 0.55 },
  { id: 8, lb: 'LDI_T', t: 'persistent', rx: 0.5, ry: 0.53, w: 0.88 },
  { id: 9, lb: 'COH_HIST', t: 'persistent', rx: 0.32, ry: 0.74, w: 0.7 },
  { id: 10, lb: 'MEM_ESTRUC', t: 'persistent', rx: 0.62, ry: 0.76, w: 0.65 },
  { id: 11, lb: 'RÉG_ENT', t: 'persistent', rx: 0.14, ry: 0.51, w: 0.75 },
  { id: 12, lb: 'ESTAB_RES', t: 'persistent', rx: 0.87, ry: 0.44, w: 0.58 },
  { id: 13, lb: 'PAT_RECUR', t: 'persistent', rx: 0.4, ry: 0.25, w: 0.55 },
  { id: 14, lb: 'TRAZ_PASIVA', t: 'persistent', rx: 0.71, ry: 0.83, w: 0.5 },
  { id: 15, lb: 'SÑL_ATEN', t: 'persistent', rx: 0.24, ry: 0.84, w: 0.45 },
  { id: 16, lb: 'ANOMALÍA_01', t: 'anomaly', rx: 0.5, ry: 0.19, w: 0.78 },
  { id: 17, lb: 'TRANS_CRÍTICA', t: 'anomaly', rx: 0.79, ry: 0.51, w: 0.73 },
  { id: 18, lb: 'BIFURCACIÓN', t: 'anomaly', rx: 0.2, ry: 0.19, w: 0.68 },
  { id: 19, lb: 'EVENTO_SING', t: 'anomaly', rx: 0.89, ry: 0.79, w: 0.63 },
  { id: 20, lb: 'ε_A', t: 'opaque', rx: 0.1, ry: 0.67, w: 0.48 },
  { id: 21, lb: 'ε_B', t: 'opaque', rx: 0.91, ry: 0.23, w: 0.43 },
  { id: 22, lb: 'ε_C', t: 'opaque', rx: 0.56, ry: 0.91, w: 0.38 },
  { id: 23, lb: 'ε_D', t: 'opaque', rx: 0.07, ry: 0.35, w: 0.33 },
  { id: 24, lb: 'ε_E', t: 'opaque', rx: 0.76, ry: 0.13, w: 0.28 },
  { id: 25, lb: 'INEGI_EE3', t: 'institutional', rx: 0.35, ry: 0.47, w: 0.8 },
  { id: 26, lb: 'SFI_CORE', t: 'institutional', rx: 0.5, ry: 0.43, w: 1 },
  { id: 27, lb: 'CIMPS_2026', t: 'institutional', rx: 0.63, ry: 0.43, w: 0.68 },
  { id: 28, lb: 'UNIPRES_PIL', t: 'institutional', rx: 0.42, ry: 0.6, w: 0.73 },
  { id: 29, lb: 'ATLAS_PROTO', t: 'institutional', rx: 0.58, ry: 0.61, w: 0.78 },
]

const EDG: FieldEdge[] = [
  { a: 26, b: 0, k: 's' }, { a: 26, b: 1, k: 's' }, { a: 26, b: 8, k: 's' }, { a: 26, b: 5, k: 's' },
  { a: 26, b: 25, k: 's' }, { a: 26, b: 29, k: 's' }, { a: 26, b: 27, k: 's' }, { a: 0, b: 1, k: 's' },
  { a: 0, b: 3, k: 's' }, { a: 1, b: 27, k: 's' }, { a: 5, b: 28, k: 's' }, { a: 8, b: 11, k: 's' },
  { a: 7, b: 18, k: 'l' }, { a: 7, b: 13, k: 'l' }, { a: 3, b: 11, k: 'l' }, { a: 2, b: 17, k: 'l' },
  { a: 6, b: 17, k: 'l' }, { a: 10, b: 14, k: 'l' }, { a: 13, b: 16, k: 'l' }, { a: 20, b: 3, k: 'l' },
  { a: 0, b: 8, k: 'r' }, { a: 1, b: 2, k: 'r' }, { a: 27, b: 2, k: 'r' }, { a: 16, b: 1, k: 'r' },
  { a: 17, b: 12, k: 'r' }, { a: 29, b: 10, k: 'r' }, { a: 26, b: 28, k: 'r' },
]

function getFieldValue(fieldState: unknown, key: string) {
  if (!fieldState || typeof fieldState !== 'object') return null
  const value = (fieldState as Record<string, unknown>)[key]
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

function numberValue(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0
}

function makeNodes(width: number, height: number): FieldNode[] {
  return RND.map((node) => ({ ...node, x: node.rx * width, y: node.ry * height, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2, att: 0, wp: 0 }))
}

function FieldMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex justify-between gap-2 text-[7px] uppercase tracking-[0.10em] text-[rgba(200,169,81,.38)]">
        <span>{label}</span><span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-px bg-[rgba(200,169,81,.10)]"><div className="h-px bg-[rgba(200,169,81,.70)]" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  )
}

export function SfiCognitiveCanvasTerminal({ nodeId, canPersist, canonicalState, mode, onSignalDeclared }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const nodesRef = useRef<FieldNode[]>([])
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const fieldRef = useRef({ tension: 0, density: 0, typingSpeed: 0, charBuf: [] as number[], wordCount: 0 })
  const frameRef = useRef<number | null>(null)
  const [input, setInput] = useState('')
  const [panel, setPanel] = useState<AccordionPanel>('amv')
  const [treeActive, setTreeActive] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [width, setWidth] = useState(680)
  const [height, setHeight] = useState(420)

  const fieldState = canonicalState?.fieldState ?? null
  const signalCount = canonicalState?.signals?.signals.length ?? 0
  const sourceStatus = canonicalState?.sourceHealth?.status ?? 'unknown'
  const regime = String(getFieldValue(fieldState, 'regime') ?? 'unknown')
  const sourceState = String(getFieldValue(fieldState, 'sourceState') ?? (fieldState ? 'derived' : 'missing'))
  const evidenceLevel = String(getFieldValue(fieldState, 'evidenceLevel') ?? (fieldState ? 'behavioral' : 'none'))
  const degradation = numberValue(getFieldValue(fieldState, 'degradation'))
  const capacity = numberValue(getFieldValue(fieldState, 'operationalCapacity'))
  const confidence = numberValue(getFieldValue(fieldState, 'confidence'))
  const statusText = useMemo(() => mode === 'canonical' ? 'CANONICAL · ACTIVE' : mode === 'degraded' ? 'CANONICAL · DEGRADED' : 'LEGACY · LOCAL', [mode])

  const spawnGhost = useCallback((text: string, color: readonly number[] = C.active) => {
    const ghost = ghostRef.current
    if (!ghost) return
    const el = document.createElement('div')
    el.className = 'pointer-events-none absolute whitespace-nowrap font-mono text-[9px] tracking-[0.05em]'
    el.textContent = text
    const fromLeft = Math.random() < 0.5
    const y = 15 + Math.random() * Math.max(120, height - 70)
    const startX = fromLeft ? -260 : width + 10
    const endX = fromLeft ? width + 10 : -260
    const duration = 5600
    el.style.top = `${y}px`
    el.style.left = `${startX}px`
    ghost.appendChild(el)
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      if (elapsed > duration) { el.remove(); return }
      const p = elapsed / duration
      const opacity = elapsed < duration * 0.35 ? Math.min(0.52, p * 1.55) : Math.max(0, 0.52 * (1 - (elapsed - duration * 0.35) / (duration * 0.65)))
      el.style.left = `${startX + (endX - startX) * p}px`
      el.style.color = `rgba(${color[0]},${color[1]},${color[2]},${opacity})`
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [height, width])

  const submitSignal = useCallback(async () => {
    const content = input.trim()
    if (!content) return
    if (nodeId && canPersist) {
      const result = await declareTerminalSignal({ nodeId, content, context: { source: 'SfiCognitiveCanvasTerminal', regime, sourceState, evidenceLevel, degradation, capacity, confidence } })
      spawnGhost(result.ok ? 'SIGNAL_DECLARED · cognitive_event_stream' : 'SIGNAL_DECLARATION_FAILED', result.ok ? C.active : C.anomaly)
      if (result.ok) onSignalDeclared?.()
    } else {
      spawnGhost('LOCAL_ONLY · señal no persistida', C.persistent)
    }
    setTreeActive(true)
    setInput('')
  }, [canPersist, capacity, confidence, degradation, evidenceLevel, input, nodeId, onSignalDeclared, regime, sourceState, spawnGhost])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const updateSize = () => {
      const nextWidth = root.offsetWidth || 680
      const mobile = nextWidth < 720
      const nextHeight = mobile ? Math.max(500, Math.min(window.innerHeight - 150, 710)) : Math.min(Math.max(nextWidth * 0.58, 420), 700)
      setWidth(nextWidth); setHeight(nextHeight)
      nodesRef.current = makeNodes(nextWidth, nextHeight)
      mouseRef.current.x = nextWidth / 2; mouseRef.current.y = nextHeight / 2
    }
    updateSize(); window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [width, height])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let lastGhost = Date.now()
    const start = Date.now()
    const draw = () => {
      const t = Date.now() - start
      const nodes = nodesRef.current
      const fs = fieldRef.current
      const b = Math.sin((t / 4200) * Math.PI * 2) * 0.5 + 0.5
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, width, height)
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.44, 0, width * 0.5, height * 0.44, width * 0.62)
      bg.addColorStop(0, `rgba(10,14,22,${0.48 + b * 0.08})`)
      bg.addColorStop(0.68, `rgba(90,45,18,${degradation * 0.09 + fs.tension * 0.05})`)
      bg.addColorStop(1, 'rgba(8,8,8,0)')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = `rgba(50,48,38,${0.018 + fs.tension * 0.008})`; ctx.lineWidth = 0.35
      for (let x = 0; x < width; x += 72) { const d = Math.sin(t / 1900 + x * 0.016) * (treeActive ? 12 : fs.tension * 7); ctx.beginPath(); ctx.moveTo(x + d, 0); ctx.lineTo(x + d * 0.4, height); ctx.stroke() }
      for (let y = 0; y < height; y += 72) { const d = Math.cos(t / 2100 + y * 0.016) * (treeActive ? 8 : fs.tension * 5); ctx.beginPath(); ctx.moveTo(0, y + d); ctx.lineTo(width, y + d * 0.4); ctx.stroke() }
      EDG.forEach((edge) => {
        const a = nodes[edge.a], c = nodes[edge.b]; if (!a || !c) return
        const att = (a.att + c.att) * 0.5
        const isLatent = edge.k === 'l'
        ctx.save(); if (isLatent) ctx.setLineDash([3, 9]); if (edge.k === 'r') ctx.setLineDash([8, 4])
        const color = edge.k === 'r' ? [108, 102, 72] : isLatent ? [55, 88, 105] : degradation > 0.42 ? [192, 90, 60] : [88, 82, 62]
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.05 + att * 0.24 + degradation * 0.12})`
        ctx.lineWidth = edge.k === 's' ? 0.7 + att * 1.2 + degradation : 0.45
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.restore()
      })
      nodes.forEach((node) => {
        node.vx += (Math.random() - 0.5) * (0.009 + fs.tension * 0.01 + degradation * 0.006)
        node.vy += (Math.random() - 0.5) * (0.009 + fs.tension * 0.01 + degradation * 0.006)
        node.vx *= 0.973; node.vy *= 0.973
        node.vx += (node.rx * width - node.x) * (treeActive ? 0.00025 : 0.0007)
        node.vy += (node.ry * height - node.y) * (treeActive ? 0.00025 : 0.0007)
        node.x += node.vx; node.y += node.vy
        const dx = node.x - mouseRef.current.x, dy = node.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const target = dist < 178 && mouseRef.current.active ? Math.pow(1 - dist / 178, 1.7) : 0
        node.att += (target - node.att) * 0.065
      })
      nodes.forEach((node) => {
        const pulse = Math.sin(t / 1300 + node.phase)
        const base = 4 + node.w * 10
        const r = base * (1 + b * 0.07 + pulse * 0.05 + node.wp * 0.38) + node.att * 3.5
        node.wp = Math.max(0, node.wp - 0.018)
        const color = C[node.t]
        if (node.t === 'opaque') { ctx.fillStyle = 'rgba(16,16,13,.7)'; ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill(); return }
        const glow = ctx.createRadialGradient(node.x, node.y, r * 0.18, node.x, node.y, r * (2.6 + node.att * 2.2 + node.wp * 1.5))
        glow.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${0.045 + node.att * 0.09 + node.wp * 0.07 + degradation * 0.035})`)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(node.x, node.y, r * 2.8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.1 + node.att * 0.16 + node.wp * 0.14})`
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.52 + node.att * 0.32 + node.wp * 0.24})`; ctx.lineWidth = 0.85 + node.att * 0.6
        if (node.t === 'active') { ctx.beginPath(); ctx.moveTo(node.x, node.y - r); ctx.lineTo(node.x + r * 0.72, node.y); ctx.lineTo(node.x, node.y + r); ctx.lineTo(node.x - r * 0.72, node.y); ctx.closePath(); ctx.fill(); ctx.stroke() }
        else if (node.t === 'institutional') { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 6; if (i === 0) ctx.moveTo(node.x + r * Math.cos(a), node.y + r * Math.sin(a)); else ctx.lineTo(node.x + r * Math.cos(a), node.y + r * Math.sin(a)) } ctx.closePath(); ctx.fill(); ctx.stroke() }
        else { ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${width < 680 ? 0.32 + node.att * 0.5 : 0.18 + node.att * 0.55 + node.wp * 0.32})`
        ctx.font = `${width < 680 ? 6.5 : 7.5}px IBM Plex Mono, Courier New, monospace`; ctx.textAlign = 'left'; ctx.fillText(node.lb, node.x + r + 4, node.y + 2.5)
      })
      if (treeActive && nodes[26]) { const core = nodes[26]; ctx.setLineDash([2, 7]); ctx.strokeStyle = 'rgba(200,169,81,.16)'; ctx.beginPath(); ctx.arc(core.x, core.y, 52 + Math.sin(t / 700) * 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]) }
      ctx.font = 'bold 8px IBM Plex Mono, Courier New, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = `rgba(200,169,81,${0.52 + b * 0.1})`; ctx.fillText('CAMPO COGNITIVO · SFI', 16, 17)
      ctx.font = '7px IBM Plex Mono, Courier New, monospace'; ctx.fillStyle = 'rgba(58,54,42,.65)'; ctx.fillText('instrumento de observación longitudinal v2.0', 16, 28)
      ctx.textAlign = 'right'; ctx.fillStyle = `rgba(58,122,90,${0.48 + b * 0.09})`; ctx.fillText(`ρ=${Math.round(confidence * 100)} · D=${Math.round(degradation * 100)} · CO=${Math.round(capacity * 100)}`, width - 16, 17)
      ctx.fillStyle = 'rgba(200,169,81,.58)'; ctx.fillText(statusText, width - 16, 28)
      if (Date.now() - lastGhost > (fs.tension > 0.4 ? 3800 : 9500)) { lastGhost = Date.now(); spawnGhost(signalCount > 0 ? 'FIELD · reducción canónica activa' : 'AMV · campo en espera · operador ausente', signalCount > 0 ? C.active : C.persistent) }
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [capacity, confidence, degradation, height, signalCount, spawnGhost, statusText, treeActive, width])

  const onInputChange = (value: string) => {
    setInput(value)
    const fs = fieldRef.current
    const now = Date.now()
    fs.charBuf.push(now); fs.charBuf = fs.charBuf.filter((time) => now - time < 1000)
    fs.typingSpeed = fs.charBuf.length; fs.wordCount = value.trim().split(/\s+/).filter(Boolean).length
    const punctuation = (value.match(/[.!?:;,—]/g) || []).length
    const caps = (value.match(/[A-ZÁÉÍÓÚ]/g) || []).length / (value.length || 1)
    fs.tension = fs.tension * 0.7 + Math.min(1, (fs.wordCount / 18 + punctuation / 5 + fs.typingSpeed / 12 + caps * 0.7) * 0.52) * 0.3
    fs.density = Math.min(1, fs.wordCount / 20 + fs.tension * 0.4)
    if (value.length > 0 && nodesRef.current.length) {
      const index = Math.abs(value.charCodeAt(value.length - 1) + (value.charCodeAt(Math.max(0, value.length - 2)) || 0)) % nodesRef.current.length
      nodesRef.current[index].wp = 1
      const edge = EDG.find((item) => item.a === index || item.b === index)
      if (edge) nodesRef.current[edge.a === index ? edge.b : edge.a].wp = 0.5
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-[#C8A951]">
      <div ref={rootRef} className="relative min-h-screen w-full overflow-hidden bg-[#080808] font-mono select-none" onPointerMove={(event) => { const rect = rootRef.current?.getBoundingClientRect(); if (!rect) return; mouseRef.current.x = event.clientX - rect.left; mouseRef.current.y = event.clientY - rect.top; mouseRef.current.active = true }} onPointerLeave={() => { mouseRef.current.active = false }}>
        <canvas ref={canvasRef} className="block w-full touch-none" />
        <div ref={ghostRef} className="pointer-events-none absolute left-0 top-0 overflow-hidden" style={{ width, height }} />

        <button type="button" onClick={() => { setTreeActive((value) => !value); spawnGhost('AMV · árbol estocástico activado', C.active) }} className="absolute left-3 border border-[rgba(74,143,168,.14)] bg-transparent px-2 py-1 text-[7px] uppercase tracking-[0.10em] text-[rgba(74,143,168,.55)]" style={{ top: Math.max(56, height - 44) }}>◈ ÁRBOL DE FUTUROS</button>
        <button type="button" onClick={() => { setSoundEnabled((value) => !value); spawnGhost(soundEnabled ? 'AUDIO · desactivado' : 'AUDIO · textura pendiente', C.institutional) }} className="absolute right-3 border border-[rgba(58,122,90,.14)] bg-transparent px-2 py-1 text-[7px] uppercase tracking-[0.10em] text-[rgba(58,122,90,.55)]" style={{ top: Math.max(56, height - 44) }}>◎ SONIDO</button>

        <div className="absolute left-0 right-0 border-t border-[rgba(200,169,81,.09)] bg-[#080808]/98 px-3 py-2 sm:px-5" style={{ top: height }}>
          <div className="grid grid-cols-[1fr_1fr] gap-1 border border-[rgba(200,169,81,.08)] p-1 text-[8px] uppercase tracking-[0.14em]">
            <button type="button" onClick={() => setPanel('amv')} className={panel === 'amv' ? 'bg-[rgba(200,169,81,.08)] px-2 py-2 text-[#C8A951]' : 'px-2 py-2 text-[rgba(200,169,81,.35)]'}>01 · CHAT AMV</button>
            <button type="button" onClick={() => setPanel('operation')} className={panel === 'operation' ? 'bg-[rgba(200,169,81,.08)] px-2 py-2 text-[#C8A951]' : 'px-2 py-2 text-[rgba(200,169,81,.35)]'}>02 · OPERACIÓN</button>
          </div>

          {panel === 'amv' ? (
            <div className="pt-2">
              <div className="mb-2 grid grid-cols-4 gap-2 text-[7px] uppercase tracking-[0.08em] text-[rgba(200,169,81,.38)]">
                <span>{mode}</span><span>{sourceState}</span><span>D {Math.round(degradation * 100)}%</span><span>{sourceStatus}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-[rgba(200,169,81,.42)]">AMV ·</span>
                <span className="relative h-px w-[50px] shrink-0 overflow-hidden bg-[rgba(200,169,81,.09)]"><span className="absolute left-0 top-0 h-px bg-[rgba(200,169,81,.65)] transition-all" style={{ width: `${Math.round(fieldRef.current.tension * 100)}%` }} /></span>
                <input value={input} onChange={(event) => onInputChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submitSignal() } if (event.key === 'Escape') { setInput(''); fieldRef.current.tension *= 0.25; fieldRef.current.wordCount = 0 } }} className="min-w-0 flex-1 bg-transparent text-[9px] text-[rgba(180,170,145,.76)] outline-none caret-[rgba(200,169,81,.7)] placeholder:text-[rgba(60,58,46,.42)]" autoComplete="off" spellCheck={false} placeholder="señal de entrada · escribe para activar el campo" />
                <span className="hidden shrink-0 text-[7px] tracking-[0.06em] text-[rgba(55,52,40,.42)] sm:block">↵ persistir · Esc limpiar</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 pt-2 text-[8px] uppercase tracking-[0.09em] text-[rgba(180,170,145,.66)] sm:grid-cols-3">
              <div className="border border-[rgba(200,169,81,.08)] p-2"><b className="text-[#C8A951]">EJECUTABLE</b><br />declarar señales · activar árbol · observar degradación · registrar FieldState mínimo.</div>
              <div className="border border-[rgba(200,169,81,.08)] p-2"><b className="text-[#C8A951]">CUARENTENA</b><br />AMV legacy · CognitiveTwin · webhooks · cron · telemetry · WorldSpect no canónico.</div>
              <div className="border border-[rgba(200,169,81,.08)] p-2"><b className="text-[#C8A951]">PRESENTABLE</b><br />campo nodal vivo + señal real + reducción canónica + degradación trazable.</div>
              <FieldMetric label="ρ confidence" value={confidence} />
              <FieldMetric label="D degradation" value={degradation} />
              <FieldMetric label="CO capacity" value={capacity} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
