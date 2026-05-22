'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { TerminalCanonicalClientResult } from '@/lib/terminal/canonicalClient'
import { declareTerminalSignal } from '@/lib/terminal/signalClient'
import { readWorldSpectReal, type WorldSpectRealClientState } from '@/lib/worldspect/client'

type TerminalMode = 'legacy' | 'canonical' | 'degraded'
type AccordionPanel = 'amv' | 'operation' | 'worldspect'
type NodeKind = 'active' | 'persistent' | 'anomaly' | 'opaque' | 'institutional'
type AmvSource = 'gemini' | 'deterministic_fallback' | 'local_only'

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

type AmvMessage = {
  role: 'operator' | 'amv'
  text: string
  source?: AmvSource
}

const C = {
  active: [200, 169, 81],
  persistent: [74, 143, 168],
  anomaly: [205, 92, 72],
  opaque: [20, 20, 16],
  institutional: [58, 122, 90],
} as const

const EMPTY_WORLDSPECT: WorldSpectRealClientState = {
  sourceState: 'missing',
  evidenceLevel: 'none',
  confidence: 0,
  wsi: null,
  nti: null,
  degraded_sources: [],
  sourceHealth: [],
  warnings: ['worldspect_not_loaded'],
}

const RND: Array<Omit<FieldNode, 'x' | 'y' | 'vx' | 'vy' | 'phase' | 'att' | 'wp'>> = [
  { id: 0, lb: 'IHG_BASAL', t: 'active', rx: 0.42, ry: 0.41, w: 1 },
  { id: 1, lb: 'NTI_OBS', t: 'active', rx: 0.58, ry: 0.37, w: 0.85 },
  { id: 2, lb: 'FRICCION_SEM', t: 'active', rx: 0.68, ry: 0.56, w: 0.75 },
  { id: 3, lb: 'PERTURBACION', t: 'active', rx: 0.28, ry: 0.57, w: 0.7 },
  { id: 4, lb: 'NOD_DECISION', t: 'active', rx: 0.73, ry: 0.31, w: 0.65 },
  { id: 5, lb: 'DISIPACION', t: 'active', rx: 0.47, ry: 0.68, w: 0.8 },
  { id: 6, lb: 'CAMPO_LAT', t: 'active', rx: 0.82, ry: 0.62, w: 0.58 },
  { id: 7, lb: 'VEC_DIV', t: 'active', rx: 0.22, ry: 0.33, w: 0.55 },
  { id: 8, lb: 'LDI_T', t: 'persistent', rx: 0.5, ry: 0.53, w: 0.88 },
  { id: 9, lb: 'COH_HIST', t: 'persistent', rx: 0.32, ry: 0.74, w: 0.7 },
  { id: 10, lb: 'MEM_ESTRUC', t: 'persistent', rx: 0.62, ry: 0.76, w: 0.65 },
  { id: 11, lb: 'REG_ENT', t: 'persistent', rx: 0.14, ry: 0.51, w: 0.75 },
  { id: 12, lb: 'ESTAB_RES', t: 'persistent', rx: 0.87, ry: 0.44, w: 0.58 },
  { id: 13, lb: 'PAT_RECUR', t: 'persistent', rx: 0.4, ry: 0.25, w: 0.55 },
  { id: 14, lb: 'TRAZ_PASIVA', t: 'persistent', rx: 0.71, ry: 0.83, w: 0.5 },
  { id: 15, lb: 'SNL_ATEN', t: 'persistent', rx: 0.24, ry: 0.84, w: 0.45 },
  { id: 16, lb: 'ANOMALIA_01', t: 'anomaly', rx: 0.5, ry: 0.19, w: 0.78 },
  { id: 17, lb: 'TRANS_CRITICA', t: 'anomaly', rx: 0.79, ry: 0.51, w: 0.73 },
  { id: 18, lb: 'BIFURCACION', t: 'anomaly', rx: 0.2, ry: 0.19, w: 0.68 },
  { id: 19, lb: 'EVENTO_SING', t: 'anomaly', rx: 0.89, ry: 0.79, w: 0.63 },
  { id: 20, lb: 'EPS_A', t: 'opaque', rx: 0.1, ry: 0.67, w: 0.48 },
  { id: 21, lb: 'EPS_B', t: 'opaque', rx: 0.91, ry: 0.23, w: 0.43 },
  { id: 22, lb: 'EPS_C', t: 'opaque', rx: 0.56, ry: 0.91, w: 0.38 },
  { id: 23, lb: 'EPS_D', t: 'opaque', rx: 0.07, ry: 0.35, w: 0.33 },
  { id: 24, lb: 'EPS_E', t: 'opaque', rx: 0.76, ry: 0.13, w: 0.28 },
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

function displayNumber(value: number | null) {
  return typeof value === 'number' ? value.toFixed(3) : 'missing'
}

function makeNodes(width: number, height: number): FieldNode[] {
  return RND.map((node) => ({ ...node, x: node.rx * width, y: node.ry * height, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2, att: 0, wp: 0 }))
}

function FieldMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex justify-between gap-2 text-[7px] uppercase tracking-[0.10em] text-[rgba(200,169,81,.45)]">
        <span className="truncate">{label}</span><span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-px bg-[rgba(200,169,81,.12)]"><div className="h-px bg-[rgba(200,169,81,.75)]" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  )
}

function PanelButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active
        ? 'border border-[rgba(200,169,81,.24)] bg-[rgba(200,169,81,.10)] px-2 py-2 text-left text-[#C8A951]'
        : 'border border-[rgba(200,169,81,.08)] bg-[rgba(8,8,8,.42)] px-2 py-2 text-left text-[rgba(200,169,81,.42)] hover:text-[rgba(200,169,81,.72)]'}
    >
      {children}
    </button>
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
  const worldSpectRef = useRef<WorldSpectRealClientState | null>(null)
  const [input, setInput] = useState('')
  const [panel, setPanel] = useState<AccordionPanel>('amv')
  const [treeActive, setTreeActive] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [width, setWidth] = useState(680)
  const [height, setHeight] = useState(420)
  const [messages, setMessages] = useState<AmvMessage[]>([])
  const [amvStatus, setAmvStatus] = useState<'idle' | 'thinking' | 'ready' | 'degraded'>('idle')
  const [worldSpect, setWorldSpect] = useState<WorldSpectRealClientState | null>(null)

  const fieldState = canonicalState?.fieldState ?? null
  const signalCount = canonicalState?.signals?.signals.length ?? 0
  const sourceStatus = canonicalState?.sourceHealth?.status ?? 'unknown'
  const regime = String(getFieldValue(fieldState, 'regime') ?? 'unknown')
  const sourceState = String(getFieldValue(fieldState, 'sourceState') ?? (fieldState ? 'derived' : 'missing'))
  const evidenceLevel = String(getFieldValue(fieldState, 'evidenceLevel') ?? (fieldState ? 'behavioral' : 'none'))
  const degradation = numberValue(getFieldValue(fieldState, 'degradation'))
  const capacity = numberValue(getFieldValue(fieldState, 'operationalCapacity'))
  const confidence = numberValue(getFieldValue(fieldState, 'confidence'))
  const statusText = useMemo(() => mode === 'canonical' ? 'CANONICAL ACTIVE' : mode === 'degraded' ? 'CANONICAL DEGRADED' : 'LEGACY LOCAL', [mode])
  const worldSpectState = worldSpect ?? EMPTY_WORLDSPECT
  const worldLabel = worldSpectState.sourceState === 'observed' ? 'observed' : worldSpectState.sourceState === 'degraded' ? 'degraded' : 'missing'
  const amvStatusLabel = amvStatus === 'thinking'
    ? 'THINKING'
    : amvStatus === 'ready'
      ? 'GEMINI'
      : amvStatus === 'degraded'
        ? 'FALLBACK'
        : 'LOCAL_ONLY'

  const spawnGhost = useCallback((text: string, color: readonly number[] = C.active) => {
    const ghost = ghostRef.current
    if (!ghost) return
    const el = document.createElement('div')
    el.className = 'pointer-events-none absolute whitespace-nowrap font-mono text-[9px] tracking-[0.05em]'
    el.textContent = text
    const fromLeft = Math.random() < 0.5
    const y = 15 + Math.random() * Math.max(120, height - 70)
    const startX = fromLeft ? -280 : width + 10
    const endX = fromLeft ? width + 10 : -280
    const duration = 5600
    el.style.top = `${y}px`
    el.style.left = `${startX}px`
    ghost.appendChild(el)
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      if (elapsed > duration) { el.remove(); return }
      const p = elapsed / duration
      const opacity = elapsed < duration * 0.35 ? Math.min(0.56, p * 1.6) : Math.max(0, 0.56 * (1 - (elapsed - duration * 0.35) / (duration * 0.65)))
      el.style.left = `${startX + (endX - startX) * p}px`
      el.style.color = `rgba(${color[0]},${color[1]},${color[2]},${opacity})`
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [height, width])

  const requestAmvResponse = useCallback(async (message: string) => {
    setAmvStatus('thinking')
    try {
      const response = await fetch('/api/amv/field-response', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          node_id: nodeId,
          fieldContext: {
            nodeId,
            regime,
            sourceState,
            evidenceLevel,
            degradation,
            capacity,
            confidence,
            wsi: worldSpectRef.current?.wsi ?? null,
            nti: worldSpectRef.current?.nti ?? null,
            worldSpectState: worldSpectRef.current?.sourceState ?? 'missing',
          },
        }),
      })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok || !body || typeof body !== 'object' || (body as Record<string, unknown>).ok !== true) throw new Error('amv_response_failed')
      const data = (body as { data?: Record<string, unknown> }).data
      const responseText = typeof data?.responseText === 'string' ? data.responseText : 'AMV operativo: respuesta no disponible; usa fallback local.'
      const responseSource = data?.responseSource === 'gemini' ? 'gemini' : 'deterministic_fallback'
      setMessages((current) => [...current, { role: 'amv', text: responseText, source: responseSource }])
      setAmvStatus(responseSource === 'gemini' ? 'ready' : 'degraded')
      spawnGhost(responseSource === 'gemini' ? 'AMV · GEMINI server-side' : 'AMV · deterministic fallback', responseSource === 'gemini' ? C.institutional : C.persistent)
    } catch {
      setMessages((current) => [...current, {
        role: 'amv',
        text: 'AMV operativo: respuesta degradada. La senal fue recibida, pero el agente no pudo resolver respuesta server-side.',
        source: 'deterministic_fallback',
      }])
      setAmvStatus('degraded')
      spawnGhost('AMV · fallback local etiquetado', C.persistent)
    }
  }, [capacity, confidence, degradation, evidenceLevel, nodeId, regime, sourceState, spawnGhost])

  const submitSignal = useCallback(async () => {
    const content = input.trim()
    if (!content || amvStatus === 'thinking') return
    if (nodeId && canPersist) {
      const result = await declareTerminalSignal({
        nodeId,
        content,
        context: { source: 'SfiCognitiveCanvasTerminal', regime, sourceState, evidenceLevel, degradation, capacity, confidence, worldSpect: worldSpectState },
      })
      spawnGhost(result.ok ? 'SIGNAL_DECLARED · cognitive_event_stream' : 'SIGNAL_DECLARATION_FAILED', result.ok ? C.active : C.anomaly)
      if (result.ok) onSignalDeclared?.()
    } else {
      spawnGhost('LOCAL_ONLY · senal no persistida', C.persistent)
    }
    setMessages((current) => [
      ...current,
      { role: 'operator', text: content, source: nodeId && canPersist ? undefined : 'local_only' },
    ])
    setTreeActive(true)
    setInput('')
    await requestAmvResponse(content)
  }, [amvStatus, canPersist, capacity, confidence, degradation, evidenceLevel, input, nodeId, onSignalDeclared, regime, requestAmvResponse, sourceState, spawnGhost, worldSpectState])

  useEffect(() => {
    let active = true

    async function loadWorldSpect() {
      const result = await readWorldSpectReal()
      if (!active) return
      setWorldSpect(result)
      worldSpectRef.current = result
      spawnGhost(
        result.sourceState === 'observed'
          ? 'WORLDSPECT · observed'
          : 'WORLDSPECT · degraded source',
        result.sourceState === 'observed' ? C.institutional : C.anomaly,
      )
    }

    void loadWorldSpect()
    const timer = window.setInterval(loadWorldSpect, 60_000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [spawnGhost])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const updateSize = () => {
      const nextWidth = root.offsetWidth || 680
      const nextHeight = Math.max(560, window.innerHeight)
      setWidth(nextWidth)
      setHeight(nextHeight)
      nodesRef.current = makeNodes(nextWidth, nextHeight)
      mouseRef.current.x = nextWidth / 2
      mouseRef.current.y = nextHeight / 2
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
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
      const ws = worldSpectRef.current ?? EMPTY_WORLDSPECT
      const worldSpectPressure = typeof ws.wsi === 'number' ? Math.max(0, Math.min(1, ws.wsi)) : 0
      const worldSpectNoise = typeof ws.nti === 'number' ? Math.max(0, Math.min(1, ws.nti)) : 0
      const worldSpectDegraded = ws.sourceState === 'degraded'
      const worldDensity = worldSpectPressure * 0.22
      const worldVibration = worldSpectNoise * 0.018
      const degradedWorld = worldSpectDegraded || ws.degraded_sources.length > 0
      const b = Math.sin((t / 4200) * Math.PI * 2) * 0.5 + 0.5

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#080808'
      ctx.fillRect(0, 0, width, height)
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.44, 0, width * 0.5, height * 0.44, width * (0.62 + worldDensity))
      bg.addColorStop(0, `rgba(13,18,24,${0.52 + b * 0.08 + worldDensity})`)
      bg.addColorStop(0.52, `rgba(58,122,90,${worldSpectPressure * 0.08})`)
      bg.addColorStop(0.72, `rgba(120,45,30,${degradedWorld ? 0.13 : degradation * 0.08})`)
      bg.addColorStop(1, 'rgba(8,8,8,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = `rgba(50,48,38,${0.02 + fs.tension * 0.01 + worldDensity * 0.07})`
      ctx.lineWidth = 0.35
      for (let x = 0; x < width; x += 64) {
        const d = Math.sin(t / 1900 + x * 0.016) * (treeActive ? 12 : fs.tension * 7 + worldDensity * 12)
        ctx.beginPath(); ctx.moveTo(x + d, 0); ctx.lineTo(x + d * 0.4, height); ctx.stroke()
      }
      for (let y = 0; y < height; y += 64) {
        const d = Math.cos(t / 2100 + y * 0.016) * (treeActive ? 8 : fs.tension * 5 + worldDensity * 9)
        ctx.beginPath(); ctx.moveTo(0, y + d); ctx.lineTo(width, y + d * 0.4); ctx.stroke()
      }

      EDG.forEach((edge) => {
        const a = nodes[edge.a], c = nodes[edge.b]
        if (!a || !c) return
        const att = (a.att + c.att) * 0.5
        const isLatent = edge.k === 'l'
        ctx.save()
        if (isLatent) ctx.setLineDash([3, 9])
        if (edge.k === 'r') ctx.setLineDash([8, 4])
        const color = degradedWorld ? [190, 86, 65] : edge.k === 'r' ? [108, 102, 72] : isLatent ? [55, 88, 105] : [88, 82, 62]
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.06 + att * 0.24 + degradation * 0.1 + worldDensity * 0.18})`
        ctx.lineWidth = edge.k === 's' ? 0.7 + att * 1.2 + degradation : 0.45
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(c.x, c.y)
        ctx.stroke()
        ctx.restore()
      })

      nodes.forEach((node) => {
        node.vx += (Math.random() - 0.5) * (0.009 + fs.tension * 0.01 + degradation * 0.006 + worldVibration)
        node.vy += (Math.random() - 0.5) * (0.009 + fs.tension * 0.01 + degradation * 0.006 + worldVibration)
        node.vx *= 0.973
        node.vy *= 0.973
        node.vx += (node.rx * width - node.x) * (treeActive ? 0.00025 : 0.0007)
        node.vy += (node.ry * height - node.y) * (treeActive ? 0.00025 : 0.0007)
        node.x += node.vx
        node.y += node.vy
        const dx = node.x - mouseRef.current.x, dy = node.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const target = dist < 178 && mouseRef.current.active ? Math.pow(1 - dist / 178, 1.7) : 0
        node.att += (target - node.att) * 0.065
      })

      nodes.forEach((node) => {
        const pulse = Math.sin(t / 1300 + node.phase)
        const base = 4 + node.w * 10
        const r = base * (1 + b * 0.07 + pulse * 0.05 + node.wp * 0.38 + worldDensity * 0.18) + node.att * 3.5
        node.wp = Math.max(0, node.wp - 0.018)
        const color = C[node.t]
        if (node.t === 'opaque') {
          ctx.fillStyle = 'rgba(16,16,13,.7)'
          ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill()
          return
        }
        const glow = ctx.createRadialGradient(node.x, node.y, r * 0.18, node.x, node.y, r * (2.6 + node.att * 2.2 + node.wp * 1.5))
        glow.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${0.045 + node.att * 0.09 + node.wp * 0.07 + degradation * 0.035 + worldDensity * 0.05})`)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(node.x, node.y, r * 2.8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.1 + node.att * 0.16 + node.wp * 0.14})`
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.52 + node.att * 0.32 + node.wp * 0.24})`
        ctx.lineWidth = 0.85 + node.att * 0.6
        if (node.t === 'active') {
          ctx.beginPath(); ctx.moveTo(node.x, node.y - r); ctx.lineTo(node.x + r * 0.72, node.y); ctx.lineTo(node.x, node.y + r); ctx.lineTo(node.x - r * 0.72, node.y); ctx.closePath(); ctx.fill(); ctx.stroke()
        } else if (node.t === 'institutional') {
          ctx.beginPath()
          for (let i = 0; i < 6; i += 1) {
            const a = Math.PI / 3 * i - Math.PI / 6
            if (i === 0) ctx.moveTo(node.x + r * Math.cos(a), node.y + r * Math.sin(a))
            else ctx.lineTo(node.x + r * Math.cos(a), node.y + r * Math.sin(a))
          }
          ctx.closePath(); ctx.fill(); ctx.stroke()
        } else {
          ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        }
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${width < 680 ? 0.34 + node.att * 0.5 : 0.2 + node.att * 0.55 + node.wp * 0.32})`
        ctx.font = `${width < 680 ? 6.5 : 7.5}px IBM Plex Mono, Courier New, monospace`
        ctx.textAlign = 'left'
        ctx.fillText(node.lb, node.x + r + 4, node.y + 2.5)
      })

      if (treeActive && nodes[26]) {
        const core = nodes[26]
        ctx.setLineDash([2, 7])
        ctx.strokeStyle = 'rgba(200,169,81,.16)'
        ctx.beginPath(); ctx.arc(core.x, core.y, 52 + Math.sin(t / 700) * 7, 0, Math.PI * 2); ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.font = 'bold 8px IBM Plex Mono, Courier New, monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = `rgba(200,169,81,${0.56 + b * 0.1})`
      ctx.fillText('CAMPO COGNITIVO · SFI', 16, 17)
      ctx.font = '7px IBM Plex Mono, Courier New, monospace'
      ctx.fillStyle = 'rgba(122,118,92,.66)'
      ctx.fillText(`WorldSpect: ${ws.sourceState} · FieldState: ${sourceState} · Bridge: read-only`, 16, 29)
      ctx.textAlign = 'right'
      ctx.fillStyle = `rgba(58,122,90,${0.5 + b * 0.09})`
      ctx.fillText(`WSI=${displayNumber(ws.wsi)} · NTI=${displayNumber(ws.nti)} · W=${Math.round(ws.confidence * 100)}%`, width - 16, 17)
      ctx.fillStyle = 'rgba(200,169,81,.58)'
      ctx.fillText(statusText, width - 16, 29)

      if (Date.now() - lastGhost > (fs.tension > 0.4 ? 3600 : 9000)) {
        lastGhost = Date.now()
        if (ws.sourceState === 'observed') spawnGhost('WORLDSPECT · observed', C.institutional)
        else if (ws.sourceState === 'degraded') spawnGhost('WORLDSPECT · degraded source', C.anomaly)
        else spawnGhost(signalCount > 0 ? 'FIELD · reduccion canonica activa' : 'AMV · campo en espera', signalCount > 0 ? C.active : C.persistent)
      }
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [capacity, confidence, degradation, height, signalCount, sourceState, spawnGhost, statusText, treeActive, width])

  const onInputChange = (value: string) => {
    setInput(value)
    const fs = fieldRef.current
    const now = Date.now()
    fs.charBuf.push(now)
    fs.charBuf = fs.charBuf.filter((time) => now - time < 1000)
    fs.typingSpeed = fs.charBuf.length
    fs.wordCount = value.trim().split(/\s+/).filter(Boolean).length
    const punctuation = (value.match(/[.!?:;,]/g) || []).length
    const caps = (value.match(/[A-Z]/g) || []).length / (value.length || 1)
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
      <div
        ref={rootRef}
        className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(24,28,31,.85),#080808_68%)] font-mono select-none"
        onPointerMove={(event) => {
          const rect = rootRef.current?.getBoundingClientRect()
          if (!rect) return
          mouseRef.current.x = event.clientX - rect.left
          mouseRef.current.y = event.clientY - rect.top
          mouseRef.current.active = true
        }}
        onPointerLeave={() => { mouseRef.current.active = false }}
      >
        <canvas ref={canvasRef} className="block w-full touch-none" />
        <div ref={ghostRef} className="pointer-events-none absolute left-0 top-0 overflow-hidden" style={{ width, height }} />

        <div className="absolute left-3 right-3 flex items-center justify-between gap-2" style={{ top: Math.max(56, height - (width < 720 ? 380 : 300)) }}>
          <button type="button" onClick={() => { setTreeActive((value) => !value); spawnGhost('AMV · arbol estocastico activado', C.active) }} className="border border-[rgba(74,143,168,.18)] bg-[#080808]/70 px-2 py-1 text-[7px] uppercase tracking-[0.10em] text-[rgba(74,143,168,.72)]">◈ ARBOL DE FUTUROS</button>
          <button type="button" onClick={() => { setSoundEnabled((value) => !value); spawnGhost(soundEnabled ? 'AUDIO · desactivado' : 'AUDIO · textura pendiente', C.institutional) }} className="border border-[rgba(58,122,90,.18)] bg-[#080808]/70 px-2 py-1 text-[7px] uppercase tracking-[0.10em] text-[rgba(58,122,90,.72)]">◎ SONIDO</button>
        </div>

        <section className="absolute bottom-3 left-2 right-2 max-h-[45vh] border border-[rgba(200,169,81,.16)] bg-[rgba(8,8,8,.22)] px-3 py-2 shadow-[0_-10px_28px_rgba(0,0,0,.16)] backdrop-blur-[3px] sm:bottom-4 sm:left-4 sm:right-4 sm:max-h-[38vh] sm:px-5">
          <div className="grid grid-cols-3 gap-1 text-[8px] uppercase tracking-[0.12em]">
            <PanelButton active={panel === 'amv'} onClick={() => setPanel('amv')}>🜂 AMV / CHAT</PanelButton>
            <PanelButton active={panel === 'operation'} onClick={() => setPanel('operation')}>◈ OPERACION</PanelButton>
            <PanelButton active={panel === 'worldspect'} onClick={() => setPanel('worldspect')}>◎ WORLDSPECT</PanelButton>
          </div>

          <div className="mt-2 max-h-[34vh] overflow-y-auto pr-1 sm:max-h-[28vh]">
            {panel === 'amv' ? (
              <div className="grid gap-2 lg:grid-cols-[1fr_360px]">
                <div className="border border-[rgba(200,169,81,.10)] bg-[rgba(8,8,8,.20)] p-2">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[7px] uppercase tracking-[0.10em] text-[rgba(200,169,81,.52)]">
                    <span className="border border-[rgba(200,169,81,.12)] px-2 py-1">{amvStatusLabel}</span>
                    <span className="border border-[rgba(74,143,168,.14)] px-2 py-1">LOCAL_ONLY si no persistio</span>
                    <span className="border border-[rgba(58,122,90,.14)] px-2 py-1">WorldSpect {worldLabel}</span>
                  </div>
                  <div className="mb-2 max-h-28 space-y-1 overflow-y-auto text-[10px] leading-relaxed text-[rgba(222,213,185,.78)]">
                    {messages.length === 0 ? (
                      <div className="text-[rgba(222,213,185,.72)]"><b>AMV · local_only</b>: AMV operativo listo. Declara una senal o consulta el estado del campo.</div>
                    ) : null}
                    {messages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={message.role === 'operator' ? 'text-[rgba(116,184,206,.78)]' : 'text-[rgba(222,213,185,.82)]'}>
                        <b>{message.role === 'operator' ? 'OPERADOR' : `AMV ${message.source ? `· ${message.source}` : ''}`}</b>: {message.text}
                      </div>
                    ))}
                    {amvStatus === 'thinking' ? <div className="text-[rgba(200,169,81,.72)]">AMV · procesando respuesta server-side...</div> : null}
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); void submitSignal() }} className="flex min-h-10 items-center gap-2 border border-[rgba(200,169,81,.12)] bg-[rgba(8,8,8,.32)] px-2 py-2">
                    <span className="shrink-0 text-[11px]">🜂</span>
                    <input
                      value={input}
                      onChange={(event) => onInputChange(event.target.value)}
                      disabled={amvStatus === 'thinking'}
                      className="min-w-0 flex-1 border-0 bg-[rgba(8,8,8,.20)] text-[11px] text-[rgba(238,228,196,.86)] outline-none caret-[rgba(200,169,81,.9)] placeholder:text-[rgba(110,104,82,.56)] disabled:opacity-60"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Declara una senal o pregunta al AMV operativo..."
                    />
                    <button type="submit" disabled={!input.trim() || amvStatus === 'thinking'} className="shrink-0 border border-[rgba(200,169,81,.2)] px-3 py-1 text-[8px] uppercase tracking-[0.12em] text-[#C8A951] disabled:text-[rgba(200,169,81,.28)]">Enviar</button>
                  </form>
                </div>
                <div className="grid gap-2 text-[8px] uppercase tracking-[0.09em] text-[rgba(180,170,145,.66)] sm:grid-cols-3 lg:grid-cols-1">
                  <FieldMetric label="rho confidence" value={confidence} />
                  <FieldMetric label="D degradation" value={degradation} />
                  <FieldMetric label="CO capacity" value={capacity} />
                </div>
              </div>
            ) : null}

            {panel === 'operation' ? (
              <div className="grid gap-2 text-[9px] leading-relaxed text-[rgba(222,213,185,.74)] lg:grid-cols-3">
                <div className="border border-[rgba(200,169,81,.10)] bg-[rgba(8,8,8,.20)] p-3">
                  <b className="text-[#C8A951]">Que puedes hacer aqui</b>
                  <p>Declarar senales, observar degradacion, activar arbol de futuros, observar fuente WorldSpect y generar perturbaciones minimas visuales.</p>
                </div>
                <div className="border border-[rgba(58,122,90,.14)] bg-[rgba(8,8,8,.18)] p-3">
                  <b className="text-[#C8A951]">Activo</b>
                  <p>/api/signals · /api/field/state · /api/worldspect/real · /api/amv/field-response · SourceHealth · FieldState minimo.</p>
                </div>
                <div className="border border-[rgba(205,92,72,.14)] bg-[rgba(8,8,8,.18)] p-3">
                  <b className="text-[#C8A951]">Cuarentena</b>
                  <p>CognitiveTwin · AMV legacy · webhooks · cron · telemetry ingestion · field/persist legacy.</p>
                </div>
                <div className="border border-[rgba(74,143,168,.14)] p-3 lg:col-span-3">
                  <b className="text-[#C8A951]">Que presentar</b>
                  <p>Campo nodal con senales reales, degradacion derivada, WorldSpect medido y AMV server-side con Gemini/fallback.</p>
                </div>
              </div>
            ) : null}

            {panel === 'worldspect' ? (
              <div className="grid gap-2 text-[9px] text-[rgba(222,213,185,.74)] lg:grid-cols-[260px_1fr]">
                <div className="border border-[rgba(200,169,81,.12)] bg-[rgba(8,8,8,.20)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.12em]">
                    <b className="text-[#C8A951]">◎ WorldSpect</b>
                    <span className={worldSpectState.sourceState === 'observed' ? 'text-[rgba(58,190,128,.86)]' : 'text-[rgba(205,92,72,.86)]'}>{worldLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-[rgba(200,169,81,.10)] p-2"><span className="block text-[7px] uppercase text-[rgba(200,169,81,.42)]">WSI</span>{displayNumber(worldSpectState.wsi)}</div>
                    <div className="border border-[rgba(200,169,81,.10)] p-2"><span className="block text-[7px] uppercase text-[rgba(200,169,81,.42)]">NTI</span>{displayNumber(worldSpectState.nti)}</div>
                    <div className="border border-[rgba(200,169,81,.10)] p-2"><span className="block text-[7px] uppercase text-[rgba(200,169,81,.42)]">Confidence</span>{Math.round(worldSpectState.confidence * 100)}%</div>
                    <div className="border border-[rgba(200,169,81,.10)] p-2"><span className="block text-[7px] uppercase text-[rgba(200,169,81,.42)]">Evidence</span>{worldSpectState.evidenceLevel}</div>
                  </div>
                  <p className="mt-2 text-[8px] uppercase tracking-[0.08em] text-[rgba(205,200,185,.55)]">WorldSpect: {worldLabel} · FieldState: {sourceState} · Bridge: read-only</p>
                  {worldSpectState.sourceState !== 'observed' ? <p className="mt-1 text-[8px] text-[rgba(205,92,72,.82)]">WorldSpect degradado, no inventado.</p> : null}
                </div>
                <div className="border border-[rgba(200,169,81,.10)] p-3">
                  <b className="text-[#C8A951]">Degraded sources</b>
                  <p className="mb-2 text-[8px] uppercase tracking-[0.10em] text-[rgba(205,200,185,.52)]">{worldSpectState.degraded_sources.length ? worldSpectState.degraded_sources.join(' · ') : 'ninguna reportada'}</p>
                  <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                    {worldSpectState.sourceHealth.length ? worldSpectState.sourceHealth.map((source) => (
                      <div key={source.sourceId} className="border border-[rgba(200,169,81,.08)] bg-[#080808]/50 p-2">
                        <div className="flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.08em]">
                          <span className="truncate text-[#C8A951]">{source.sourceId}</span>
                          <span className={source.status === 'healthy' ? 'text-[rgba(58,190,128,.78)]' : 'text-[rgba(205,92,72,.78)]'}>{source.status}</span>
                        </div>
                        <p className="text-[8px] text-[rgba(205,200,185,.56)]">confidence {Math.round(source.confidence * 100)}% {source.message ? `· ${source.message}` : ''}</p>
                      </div>
                    )) : <p className="text-[rgba(205,92,72,.74)]">Sin SourceHealth disponible.</p>}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
