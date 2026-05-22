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
type MemoryStatus = 'unknown' | 'logged' | 'unlogged' | 'local_only'

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
  logged?: boolean
}

const ATLAS = {
  void: '#050504',
  paper: '#f4f1e8',
  gold: '#c8a951',
  red: '#9f6a54',
  green: '#6fcf8d',
  blue: '#6f9cc8',
  purple: '#9b6bc8',
} as const

const C = {
  active: [200, 169, 81],
  persistent: [111, 156, 200],
  anomaly: [159, 106, 84],
  opaque: [18, 17, 14],
  institutional: [111, 207, 141],
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

function nodeDegradationIndex(node: FieldNode, globalDegradation: number, worldSpectState: WorldSpectRealClientState, signalCount: number) {
  const sourcePressure = worldSpectState.sourceState === 'degraded' ? 0.18 : worldSpectState.sourceState === 'missing' ? 0.08 : 0
  const degradedSourcePressure = Math.min(0.22, worldSpectState.degraded_sources.length * 0.045)
  const signalPressure = Math.min(0.16, signalCount * 0.018)
  const typeMultiplier: Record<NodeKind, number> = { active: 1, persistent: 0.72, anomaly: 1.46, opaque: 1.18, institutional: 0.62 }
  const worldNodeBoost = /NTI|OBS|INEGI|CAMPO|SFI|ATLAS/i.test(node.lb) && worldSpectState.sourceState !== 'observed' ? 0.1 : 0
  return Math.max(0, Math.min(1, (globalDegradation + sourcePressure + degradedSourcePressure + signalPressure + worldNodeBoost) * typeMultiplier[node.t]))
}

function FieldMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex justify-between gap-2 text-[7px] uppercase tracking-[0.10em] text-[rgba(200,169,81,.50)]">
        <span className="truncate">{label}</span><span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-px bg-[rgba(200,169,81,.14)]"><div className="h-px bg-[#c8a951]" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  )
}

function PanelButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={active ? 'border border-[#c8a951]/30 bg-[#c8a951]/10 px-2 py-2 text-left text-[#c8a951]' : 'border border-[#c8a951]/10 bg-[#050504]/30 px-2 py-2 text-left text-[#c8a951]/45 hover:text-[#c8a951]/75'}>
      {children}
    </button>
  )
}

function drawFutureOverlay(ctx: CanvasRenderingContext2D, core: FieldNode, width: number, height: number, t: number) {
  const branches = [
    { label: 'FUTURE_BRANCH_A', x: width * 0.2, y: height * 0.22, bend: -0.24 },
    { label: 'FUTURE_BRANCH_B', x: width * 0.74, y: height * 0.2, bend: 0.18 },
    { label: 'FUTURE_BRANCH_C', x: width * 0.82, y: height * 0.72, bend: 0.28 },
    { label: 'FUTURE_BRANCH_D', x: width * 0.25, y: height * 0.75, bend: -0.18 },
  ]
  ctx.save()
  ctx.font = '7px JetBrains Mono, IBM Plex Mono, monospace'
  branches.forEach((branch, index) => {
    const mx = (core.x + branch.x) / 2 + branch.bend * width
    const my = (core.y + branch.y) / 2 + Math.sin(t / 800 + index) * 10
    ctx.setLineDash([4, 11])
    ctx.strokeStyle = `rgba(111,156,200,${0.13 + index * 0.015})`
    ctx.lineWidth = 0.7
    ctx.beginPath(); ctx.moveTo(core.x, core.y); ctx.quadraticCurveTo(mx, my, branch.x, branch.y); ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(111,156,200,.42)'
    ctx.fillStyle = 'rgba(5,5,4,.16)'
    ctx.beginPath(); ctx.arc(branch.x, branch.y, 8 + Math.sin(t / 900 + index) * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(111,156,200,.58)'
    ctx.fillText(branch.label, branch.x + 12, branch.y + 3)
  })
  ctx.fillStyle = 'rgba(200,169,81,.54)'
  ctx.fillText('FUTURES OVERLAY · speculative · not persisted', 16, 45)
  ctx.restore()
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
  const [consoleCollapsed, setConsoleCollapsed] = useState(false)
  const [width, setWidth] = useState(680)
  const [height, setHeight] = useState(560)
  const [messages, setMessages] = useState<AmvMessage[]>([])
  const [amvStatus, setAmvStatus] = useState<'idle' | 'thinking' | 'ready' | 'degraded'>('idle')
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus>('unknown')
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
  const amvStatusLabel = amvStatus === 'thinking' ? 'THINKING' : amvStatus === 'ready' ? 'GEMINI' : amvStatus === 'degraded' ? 'FALLBACK' : 'LOCAL_ONLY'
  const memoryLabel = memoryStatus === 'logged' ? 'LOGGED' : memoryStatus === 'unlogged' ? 'UNLOGGED' : memoryStatus === 'local_only' ? 'LOCAL_ONLY' : 'UNKNOWN'

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
        body: JSON.stringify({ message, node_id: nodeId, fieldContext: { nodeId, regime, sourceState, evidenceLevel, degradation, capacity, confidence, wsi: worldSpectRef.current?.wsi ?? null, nti: worldSpectRef.current?.nti ?? null, worldSpectState: worldSpectRef.current?.sourceState ?? 'missing' } }),
      })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok || !body || typeof body !== 'object' || (body as Record<string, unknown>).ok !== true) throw new Error('amv_response_failed')
      const data = (body as { data?: Record<string, unknown> }).data
      const responseText = typeof data?.responseText === 'string' ? data.responseText : 'AMV operativo: respuesta no disponible; usa fallback local.'
      const responseSource = data?.responseSource === 'gemini' ? 'gemini' : 'deterministic_fallback'
      const responseLogged = data?.responseLogged === true
      setMemoryStatus(responseLogged ? 'logged' : 'unlogged')
      setMessages((current) => [...current, { role: 'amv', text: responseText, source: responseSource, logged: responseLogged }])
      setAmvStatus(responseSource === 'gemini' ? 'ready' : 'degraded')
      spawnGhost(responseLogged ? 'AMV_RESPONSE · LOGGED' : 'AMV_RESPONSE · UNLOGGED', responseLogged ? C.institutional : C.anomaly)
    } catch {
      setMemoryStatus(nodeId && canPersist ? 'unlogged' : 'local_only')
      setMessages((current) => [...current, { role: 'amv', text: 'AMV operativo: respuesta degradada. La senal fue recibida, pero el agente no pudo resolver respuesta server-side.', source: 'deterministic_fallback', logged: false }])
      setAmvStatus('degraded')
      spawnGhost('AMV · fallback local etiquetado', C.persistent)
    }
  }, [canPersist, capacity, confidence, degradation, evidenceLevel, nodeId, regime, sourceState, spawnGhost])

  const submitSignal = useCallback(async () => {
    const content = input.trim()
    if (!content || amvStatus === 'thinking') return
    if (nodeId && canPersist) {
      const result = await declareTerminalSignal({ nodeId, content, context: { source: 'SfiCognitiveCanvasTerminal', regime, sourceState, evidenceLevel, degradation, capacity, confidence, worldSpect: worldSpectState } })
      spawnGhost(result.ok ? 'SIGNAL_DECLARED · cognitive_event_stream' : 'SIGNAL_DECLARATION_FAILED', result.ok ? C.active : C.anomaly)
      if (result.ok) onSignalDeclared?.()
    } else {
      setMemoryStatus('local_only')
      spawnGhost('LOCAL_ONLY · senal no persistida', C.persistent)
    }
    setMessages((current) => [...current, { role: 'operator', text: content, source: nodeId && canPersist ? undefined : 'local_only' }])
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
      spawnGhost(result.sourceState === 'observed' ? 'WORLDSPECT · observed' : 'WORLDSPECT · degraded source', result.sourceState === 'observed' ? C.institutional : C.anomaly)
    }
    void loadWorldSpect()
    const timer = window.setInterval(loadWorldSpect, 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [spawnGhost])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const updateSize = () => {
      const nextWidth = root.offsetWidth || window.innerWidth || 680
      const nextHeight = window.innerHeight || root.offsetHeight || 560
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
    canvas.style.width = '100%'
    canvas.style.height = '100%'
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
      const worldDensity = worldSpectPressure * 0.22
      const worldVibration = worldSpectNoise * 0.018
      const degradedWorld = ws.sourceState === 'degraded' || ws.degraded_sources.length > 0
      const b = Math.sin((t / 4200) * Math.PI * 2) * 0.5 + 0.5

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = ATLAS.void
      ctx.fillRect(0, 0, width, height)
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.44, 0, width * 0.5, height * 0.44, width * (0.62 + worldDensity))
      bg.addColorStop(0, `rgba(18,17,14,${0.72 + b * 0.05 + worldDensity})`)
      bg.addColorStop(0.48, `rgba(200,169,81,${0.045 + worldSpectPressure * 0.06})`)
      bg.addColorStop(0.7, `rgba(159,106,84,${degradedWorld ? 0.1 : degradation * 0.05})`)
      bg.addColorStop(1, 'rgba(5,5,4,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = `rgba(200,169,81,${0.025 + fs.tension * 0.01 + worldDensity * 0.04})`
      ctx.lineWidth = 0.35
      for (let x = 0; x < width; x += 64) { const d = Math.sin(t / 1900 + x * 0.016) * (treeActive ? 12 : fs.tension * 7 + worldDensity * 12); ctx.beginPath(); ctx.moveTo(x + d, 0); ctx.lineTo(x + d * 0.4, height); ctx.stroke() }
      for (let y = 0; y < height; y += 64) { const d = Math.cos(t / 2100 + y * 0.016) * (treeActive ? 8 : fs.tension * 5 + worldDensity * 9); ctx.beginPath(); ctx.moveTo(0, y + d); ctx.lineTo(width, y + d * 0.4); ctx.stroke() }

      EDG.forEach((edge) => {
        const a = nodes[edge.a], c = nodes[edge.b]
        if (!a || !c) return
        const dEdge = (nodeDegradationIndex(a, degradation, ws, signalCount) + nodeDegradationIndex(c, degradation, ws, signalCount)) * 0.5
        const att = (a.att + c.att) * 0.5
        ctx.save()
        if (edge.k === 'l' || dEdge > 0.36) ctx.setLineDash(dEdge > 0.6 ? [2, 14] : [3, 9])
        if (edge.k === 'r') ctx.setLineDash([8, 4])
        const color = degradedWorld || dEdge > 0.5 ? C.anomaly : edge.k === 'r' ? C.active : edge.k === 'l' ? C.persistent : [122, 112, 75]
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.045 + att * 0.18 + dEdge * 0.24 + worldDensity * 0.14})`
        ctx.lineWidth = edge.k === 's' ? 0.55 + att * 1.1 + dEdge * 1.2 : 0.4 + dEdge * 0.5
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.restore()
      })

      nodes.forEach((node) => {
        const dNode = nodeDegradationIndex(node, degradation, ws, signalCount)
        const anchorStrength = node.t === 'institutional' ? 0.00085 : node.t === 'opaque' ? 0.0004 : 0.00068
        const jitter = 0.009 + fs.tension * 0.01 + dNode * 0.04 + worldVibration
        node.vx += (Math.random() - 0.5) * jitter
        node.vy += (Math.random() - 0.5) * jitter
        node.vx *= 0.97 - dNode * 0.018
        node.vy *= 0.97 - dNode * 0.018
        node.vx += (node.rx * width - node.x) * (treeActive ? anchorStrength * 0.38 : anchorStrength * (1 - dNode * 0.52))
        node.vy += (node.ry * height - node.y) * (treeActive ? anchorStrength * 0.38 : anchorStrength * (1 - dNode * 0.52))
        node.x += node.vx; node.y += node.vy
        const dx = node.x - mouseRef.current.x, dy = node.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const target = dist < 178 && mouseRef.current.active ? Math.pow(1 - dist / 178, 1.7) : 0
        node.att += (target - node.att) * 0.065
      })

      nodes.forEach((node) => {
        const dNode = nodeDegradationIndex(node, degradation, ws, signalCount)
        const pulse = Math.sin(t / Math.max(680, 1300 - dNode * 460) + node.phase)
        const labelJitter = dNode > 0.32 ? Math.sin(t / 90 + node.id) * dNode * 2.5 : 0
        const base = 4 + node.w * 10
        const r = base * (1 + b * 0.07 + pulse * (0.05 + dNode * 0.09) + node.wp * 0.38 + worldDensity * 0.18) + node.att * 3.5
        node.wp = Math.max(0, node.wp - 0.018)
        const color = C[node.t]
        const nodeOpacity = node.t === 'opaque' ? Math.max(0.08, 0.42 - dNode * 0.28) : Math.max(0.08, 0.12 + node.att * 0.16 + node.wp * 0.14 - dNode * 0.04)
        if (dNode > 0.48 && node.t !== 'opaque') { ctx.strokeStyle = `rgba(159,106,84,${0.08 + dNode * 0.12})`; ctx.beginPath(); ctx.arc(node.x + Math.sin(t / 120 + node.id) * 6, node.y + Math.cos(t / 110 + node.id) * 5, r * 1.18, 0, Math.PI * 2); ctx.stroke() }
        if (node.t === 'opaque') { ctx.fillStyle = `rgba(18,17,14,${nodeOpacity})`; ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill(); return }
        const glow = ctx.createRadialGradient(node.x, node.y, r * 0.18, node.x, node.y, r * (2.6 + node.att * 2.2 + node.wp * 1.5 + dNode))
        glow.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${0.04 + node.att * 0.09 + node.wp * 0.07 + dNode * 0.06 + worldDensity * 0.05})`)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(node.x, node.y, r * 2.8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${nodeOpacity})`
        ctx.strokeStyle = node.t === 'institutional' && dNode > 0.25 ? `rgba(159,106,84,${0.38 + dNode * 0.28})` : `rgba(${color[0]},${color[1]},${color[2]},${0.45 + node.att * 0.32 + node.wp * 0.24 + dNode * 0.14})`
        ctx.lineWidth = 0.85 + node.att * 0.6 + dNode * 0.85
        if (dNode > 0.52) ctx.setLineDash([2, 5])
        if (node.t === 'active') { ctx.beginPath(); ctx.moveTo(node.x, node.y - r); ctx.lineTo(node.x + r * 0.72, node.y); ctx.lineTo(node.x, node.y + r); ctx.lineTo(node.x - r * 0.72, node.y); ctx.closePath(); ctx.fill(); ctx.stroke() }
        else if (node.t === 'institutional') { ctx.beginPath(); for (let i = 0; i < 6; i += 1) { const a = Math.PI / 3 * i - Math.PI / 6; if (i === 0) ctx.moveTo(node.x + r * Math.cos(a), node.y + r * Math.sin(a)); else ctx.lineTo(node.x + r * Math.cos(a), node.y + r * Math.sin(a)) } ctx.closePath(); ctx.fill(); ctx.stroke() }
        else { ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
        ctx.setLineDash([])
        if (node.t === 'persistent' && dNode > 0.25) { ctx.strokeStyle = `rgba(111,156,200,${0.1 + dNode * 0.12})`; ctx.beginPath(); ctx.arc(node.x, node.y, r * 1.7, 0, Math.PI * 2); ctx.stroke() }
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${width < 680 ? 0.34 + node.att * 0.5 : 0.2 + node.att * 0.55 + node.wp * 0.32})`
        ctx.font = `${width < 680 ? 6.5 : 7.5}px JetBrains Mono, IBM Plex Mono, monospace`
        ctx.textAlign = 'left'; ctx.fillText(node.lb, node.x + r + 4 + labelJitter, node.y + 2.5 - labelJitter)
      })

      if (treeActive && nodes[26]) drawFutureOverlay(ctx, nodes[26], width, height, t)
      ctx.font = 'bold 8px Syncopate, IBM Plex Mono, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = `rgba(200,169,81,${0.66 + b * 0.1})`; ctx.fillText('CAMPO COGNITIVO · SFI', 16, 17)
      ctx.font = '7px JetBrains Mono, IBM Plex Mono, monospace'; ctx.fillStyle = 'rgba(244,241,232,.42)'; ctx.fillText(`WorldSpect: ${ws.sourceState} · FieldState: ${sourceState} · Bridge: read-only`, 16, 29)
      ctx.textAlign = 'right'; ctx.fillStyle = `rgba(111,207,141,${0.5 + b * 0.09})`; ctx.fillText(`WSI=${displayNumber(ws.wsi)} · NTI=${displayNumber(ws.nti)} · W=${Math.round(ws.confidence * 100)}%`, width - 16, 17)
      ctx.fillStyle = 'rgba(200,169,81,.58)'; ctx.fillText(statusText, width - 16, 29)
      if (Date.now() - lastGhost > (fs.tension > 0.4 ? 3600 : 9000)) { lastGhost = Date.now(); if (ws.sourceState === 'observed') spawnGhost('WORLDSPECT · observed', C.institutional); else if (ws.sourceState === 'degraded') spawnGhost('WORLDSPECT · degraded source', C.anomaly); else spawnGhost(signalCount > 0 ? 'FIELD · reduccion canonica activa' : 'AMV · campo en espera', signalCount > 0 ? C.active : C.persistent) }
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [degradation, height, signalCount, sourceState, spawnGhost, statusText, treeActive, width])

  const onInputChange = (value: string) => {
    setInput(value)
    const fs = fieldRef.current
    const now = Date.now()
    fs.charBuf.push(now); fs.charBuf = fs.charBuf.filter((time) => now - time < 1000); fs.typingSpeed = fs.charBuf.length
    fs.wordCount = value.trim().split(/\s+/).filter(Boolean).length
    const punctuation = (value.match(/[.!?:;,]/g) || []).length
    const caps = (value.match(/[A-Z]/g) || []).length / (value.length || 1)
    fs.tension = fs.tension * 0.7 + Math.min(1, (fs.wordCount / 18 + punctuation / 5 + fs.typingSpeed / 12 + caps * 0.7) * 0.52) * 0.3
    fs.density = Math.min(1, fs.wordCount / 20 + fs.tension * 0.4)
    if (value.length > 0 && nodesRef.current.length) { const index = Math.abs(value.charCodeAt(value.length - 1) + (value.charCodeAt(Math.max(0, value.length - 2)) || 0)) % nodesRef.current.length; nodesRef.current[index].wp = 1; const edge = EDG.find((item) => item.a === index || item.b === index); if (edge) nodesRef.current[edge.a === index ? edge.b : edge.a].wp = 0.5 }
  }

  return (
    <main className="h-screen min-h-screen overflow-hidden bg-[#050504] text-[#c8a951]">
      <div ref={rootRef} className="relative h-screen min-h-screen w-screen overflow-hidden bg-[#050504] font-mono select-none" onPointerMove={(event) => { const rect = rootRef.current?.getBoundingClientRect(); if (!rect) return; mouseRef.current.x = event.clientX - rect.left; mouseRef.current.y = event.clientY - rect.top; mouseRef.current.active = true }} onPointerLeave={() => { mouseRef.current.active = false }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
        <div ref={ghostRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
        <div className="absolute left-3 top-12 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setTreeActive((value) => !value); spawnGhost('FUTURES · speculative overlay', C.active) }} className="border border-[#6f9cc8]/25 bg-[#050504]/45 px-2 py-1 text-[7px] uppercase tracking-[0.10em] text-[#6f9cc8] backdrop-blur-[2px]">◈ FUTURES · SPECULATIVE</button>
          <button type="button" onClick={() => { setSoundEnabled((value) => !value); spawnGhost(soundEnabled ? 'AUDIO · desactivado' : 'AUDIO · textura pendiente', C.institutional) }} className="border border-[#6fcf8d]/20 bg-[#050504]/45 px-2 py-1 text-[7px] uppercase tracking-[0.10em] text-[#6fcf8d] backdrop-blur-[2px]">◎ SONIDO</button>
        </div>
        <section className={consoleCollapsed ? 'fixed bottom-3 left-1/2 z-50 w-[min(920px,calc(100vw-24px))] -translate-x-1/2 border border-[#c8a951]/20 bg-[#050504]/75 px-4 py-2 shadow-[0_0_40px_rgba(0,0,0,.32)] backdrop-blur-md' : 'fixed bottom-3 left-1/2 z-50 max-h-[46vh] w-[min(920px,calc(100vw-24px))] -translate-x-1/2 border border-[#c8a951]/20 bg-[#050504]/78 px-4 py-3 shadow-[0_0_44px_rgba(0,0,0,.36)] backdrop-blur-md sm:bottom-5 sm:max-h-[42vh] sm:px-5'}>
          <div className="mb-2 flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.12em] text-[#c8a951]/65">
            <div className="flex flex-wrap items-center gap-2"><span className="border border-[#c8a951]/15 px-2 py-1">AMV {amvStatusLabel}</span><span className="border border-[#c8a951]/15 px-2 py-1">MEM {memoryLabel}</span><span className="border border-[#6fcf8d]/20 px-2 py-1">WORLD {worldLabel}</span><span className="border border-[#6f9cc8]/20 px-2 py-1">SRC {sourceStatus}</span></div>
            <button type="button" onClick={() => setConsoleCollapsed((value) => !value)} className="border border-[#c8a951]/15 px-2 py-1 text-[#c8a951]/75">{consoleCollapsed ? 'EXPANDIR' : 'COLAPSAR'}</button>
          </div>
          {consoleCollapsed ? null : <>
            <div className="grid grid-cols-3 gap-1 text-[8px] uppercase tracking-[0.12em]"><PanelButton active={panel === 'amv'} onClick={() => setPanel('amv')}>🜂 AMV / CHAT</PanelButton><PanelButton active={panel === 'operation'} onClick={() => setPanel('operation')}>◈ OPERACION</PanelButton><PanelButton active={panel === 'worldspect'} onClick={() => setPanel('worldspect')}>◎ WORLDSPECT</PanelButton></div>
            <div className="mt-2 max-h-[34vh] overflow-y-auto pr-1 sm:max-h-[30vh]">
              {panel === 'amv' ? <div className="grid gap-2 lg:grid-cols-[1fr_300px]"><div className="border border-[#c8a951]/10 bg-[#050504]/14 p-2"><div className="mb-2 max-h-28 space-y-1 overflow-y-auto text-[10px] leading-relaxed text-[#f4f1e8]/78">{messages.length === 0 ? <div><b>AMV · local_only</b>: AMV operativo listo. Declara una señal o consulta el estado del campo.</div> : null}{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === 'operator' ? 'text-[#6f9cc8]/80' : 'text-[#f4f1e8]/82'}><b>{message.role === 'operator' ? 'OPERADOR' : `AMV ${message.source ? `· ${message.source}` : ''}${typeof message.logged === 'boolean' ? ` · ${message.logged ? 'LOGGED' : 'UNLOGGED'}` : ''}`}</b>: {message.text}</div>)}{amvStatus === 'thinking' ? <div className="text-[#c8a951]/75">AMV · procesando respuesta server-side...</div> : null}</div><form onSubmit={(event) => { event.preventDefault(); void submitSignal() }} className="flex min-h-[64px] items-center gap-2 border border-[#c8a951]/12 bg-[#050504]/28 px-3 py-3"><span className="shrink-0 text-[11px]">🜂</span><input value={input} onChange={(event) => onInputChange(event.target.value)} disabled={amvStatus === 'thinking'} className="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[#f4f1e8]/88 outline-none caret-[#c8a951] placeholder:text-[#f4f1e8]/35 disabled:opacity-60" autoComplete="off" spellCheck={false} placeholder="Declara una señal o pregunta al AMV operativo..." /><button type="submit" disabled={!input.trim() || amvStatus === 'thinking'} className="shrink-0 border border-[#c8a951]/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#c8a951] disabled:text-[#c8a951]/28">Enviar</button></form></div><div className="grid gap-2 text-[8px] uppercase tracking-[0.09em] text-[#f4f1e8]/60 sm:grid-cols-3 lg:grid-cols-1"><FieldMetric label="rho confidence" value={confidence} /><FieldMetric label="D degradation" value={degradation} /><FieldMetric label="CO capacity" value={capacity} /></div></div> : null}
              {panel === 'operation' ? <div className="grid gap-2 text-[9px] leading-relaxed text-[#f4f1e8]/74 lg:grid-cols-3"><div className="border border-[#c8a951]/10 bg-[#050504]/14 p-3"><b className="text-[#c8a951]">Datos reales</b><p>Señales declaradas: {signalCount}. FieldState: {sourceState}. Evidencia: {evidenceLevel}. Régimen: {regime}.</p></div><div className="border border-[#6fcf8d]/16 bg-[#050504]/12 p-3"><b className="text-[#c8a951]">Activo</b><p>/api/signals · /api/field/state · /api/worldspect/real · /api/amv/field-response.</p></div><div className="border border-[#9f6a54]/20 bg-[#050504]/12 p-3"><b className="text-[#c8a951]">Cuarentena</b><p>CognitiveTwin avanzado · webhooks · cron · field/persist legacy.</p></div><div className="border border-[#6f9cc8]/16 p-3 lg:col-span-3"><b className="text-[#c8a951]">Futuros</b><p>Futuros no predice. Dibuja bifurcaciones especulativas desde el estado actual para observar rutas posibles sin persistirlas.</p></div></div> : null}
              {panel === 'worldspect' ? <div className="grid gap-2 text-[9px] text-[#f4f1e8]/74 lg:grid-cols-[260px_1fr]"><div className="border border-[#c8a951]/12 bg-[#050504]/14 p-3"><div className="mb-2 flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.12em]"><b className="text-[#c8a951]">◎ WorldSpect</b><span className={worldSpectState.sourceState === 'observed' ? 'text-[#6fcf8d]' : 'text-[#9f6a54]'}>{worldLabel}</span></div><div className="grid grid-cols-2 gap-2"><div className="border border-[#c8a951]/10 p-2"><span className="block text-[7px] uppercase text-[#c8a951]/42">WSI</span>{displayNumber(worldSpectState.wsi)}</div><div className="border border-[#c8a951]/10 p-2"><span className="block text-[7px] uppercase text-[#c8a951]/42">NTI</span>{displayNumber(worldSpectState.nti)}</div><div className="border border-[#c8a951]/10 p-2"><span className="block text-[7px] uppercase text-[#c8a951]/42">Confidence</span>{Math.round(worldSpectState.confidence * 100)}%</div><div className="border border-[#c8a951]/10 p-2"><span className="block text-[7px] uppercase text-[#c8a951]/42">Evidence</span>{worldSpectState.evidenceLevel}</div></div>{worldSpectState.sourceState !== 'observed' ? <p className="mt-1 text-[8px] text-[#9f6a54]/85">WorldSpect degradado, no inventado.</p> : null}</div><div className="border border-[#c8a951]/10 p-3"><b className="text-[#c8a951]">Degraded sources</b><p className="mb-2 text-[8px] uppercase tracking-[0.10em] text-[#f4f1e8]/50">{worldSpectState.degraded_sources.length ? worldSpectState.degraded_sources.join(' · ') : 'ninguna reportada'}</p><div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">{worldSpectState.sourceHealth.length ? worldSpectState.sourceHealth.map((source) => <div key={source.sourceId} className="border border-[#c8a951]/08 bg-[#050504]/40 p-2"><div className="flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.08em]"><span className="truncate text-[#c8a951]">{source.sourceId}</span><span className={source.status === 'healthy' ? 'text-[#6fcf8d]' : 'text-[#9f6a54]'}>{source.status}</span></div><p className="text-[8px] text-[#f4f1e8]/56">confidence {Math.round(source.confidence * 100)}% {source.message ? `· ${source.message}` : ''}</p></div>) : <p className="text-[#9f6a54]/75">Sin SourceHealth disponible.</p>}</div></div></div> : null}
            </div>
          </>}
        </section>
      </div>
    </main>
  )
}
