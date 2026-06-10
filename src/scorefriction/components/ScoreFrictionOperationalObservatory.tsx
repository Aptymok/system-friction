'use client'

import { useEffect, useMemo, useState } from 'react'
import { evaluateSfi, type SfiMetrics } from '@/lib/sfi/math'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import type { WorldSpectVectorSnapshot } from '@/lib/worldspect/vector-contract'
import { PanelAgentEntropy } from './panels/PanelAgentEntropy'
import { PanelAmvChat } from './panels/PanelAmvChat'
import { PanelCField } from './panels/PanelCField'
import { PanelChronology } from './panels/PanelChronology'
import { PanelEvidenceLoad, type ScoreFrictionInput } from './panels/PanelEvidenceLoad'
import { PanelLongitudinalTension } from './panels/PanelLongitudinalTension'
import { PanelPhi } from './panels/PanelPhi'
import { PanelSemanticPressure } from './panels/PanelSemanticPressure'
import { PanelStochasticProjection } from './panels/PanelStochasticProjection'
import { PanelUserAttractor } from './panels/PanelUserAttractor'
import { PanelVectorTwin } from './panels/PanelVectorTwin'
import { PanelWorldSpectrum } from './panels/PanelWorldSpectrum'
import type { Row, ScoreFrictionPanelContext, ScoreFrictionPipeline } from './panels/panel-types'

type RuntimeState = ScoreFrictionPanelContext['runtime']

const EMPTY_RUNTIME: RuntimeState = {
  chronology: [],
  proto: [],
  hypotheses: [],
  proposals: [],
  verifications: [],
  messages: {},
}

const EMPTY_PIPELINE: ScoreFrictionPipeline = {
  status: 'idle',
  message: 'sin carga',
  evidence: null,
  stored: false,
  world: null,
  engine: null,
  montecarlo: null,
  attractors: null,
  amv: null,
  warnings: [],
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}

function n(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function s(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function initialCaseId(state: AmvScopeState) {
  const selected = record(state.selectedContext)
  return s(selected.case_id, 'CW-011')
}

function metricsFromState(state: AmvScopeState, pipeline: ScoreFrictionPipeline, semanticText: string): SfiMetrics {
  const engineMetrics = record(pipeline.engine?.metrics)
  if (Object.keys(engineMetrics).length) {
    return evaluateSfi({
      ihg: n(engineMetrics.ihg, 0.45),
      nti: n(engineMetrics.nti, 0.3),
      ldi: n(engineMetrics.ldi, 0.6),
      xi: n(engineMetrics.xi, 0.03),
    })
  }

  const selected = record(state.selectedContext)
  const latest = record(record(selected.latest_vectors).mihm_cultural_vector)
  const semanticBoost = Math.min(0.12, semanticText.trim().length / 3000)
  return evaluateSfi({
    ihg: n(latest.IHG_C, state.state === 'live' ? 0.45 : 0.28) + semanticBoost,
    nti: n(latest.NTI_C, 0.22),
    ldi: Math.max(0.1, 1 - n(latest.LCP, 0.1) + Math.max(0, 0.45 - n(latest.PAC, 0.1))),
    xi: Math.min(0.2, Math.max(0.03, state.evidenceSummary.sourceCoverage * 0.1)),
  })
}

async function jsonFetch(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', ...init })
  return response.json().catch(() => ({ ok: false, error: `${path}:invalid_json` })) as Promise<Row>
}

export function ScoreFrictionOperationalObservatory({ initialState }: { initialState: AmvScopeState }) {
  const [caseId, setCaseId] = useState(() => initialCaseId(initialState))
  const [semanticText, setSemanticText] = useState('')
  const [world, setWorld] = useState<WorldSpectVectorSnapshot | null>(null)
  const [runtime, setRuntime] = useState<RuntimeState>(EMPTY_RUNTIME)
  const [pipeline, setPipeline] = useState<ScoreFrictionPipeline>(EMPTY_PIPELINE)

  const metrics = useMemo(() => metricsFromState(initialState, pipeline, semanticText), [initialState, pipeline, semanticText])
  const context = useMemo<ScoreFrictionPanelContext>(() => ({ caseId, metrics, world, pipeline, runtime }), [caseId, metrics, pipeline, runtime, world])

  async function refreshRuntime(nextCaseId = caseId) {
    const [proto, longitudinal, hypotheses, proposals, verifications, worldResponse] = await Promise.all([
      jsonFetch(`/api/scorefriction/proto-attractors?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/longitudinal?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/cultural-twin?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/proposals?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/verifications?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch('/api/worldspect/vector'),
    ])

    const snapshot = record(worldResponse).snapshot as WorldSpectVectorSnapshot | null | undefined
    setWorld(snapshot ?? null)
    setRuntime({
      proto: rows(proto.data),
      chronology: rows(longitudinal.data),
      hypotheses: rows(hypotheses.data),
      proposals: rows(proposals.data),
      verifications: rows(verifications.data),
      messages: {
        proto: s(proto.message ?? proto.error, 'sin protoatractores detectados'),
        longitudinal: s(longitudinal.message ?? longitudinal.error, 'sin trayectoria longitudinal'),
        hypotheses: s(hypotheses.message ?? hypotheses.error, 'sin hipotesis culturales'),
        proposals: s(proposals.message ?? proposals.error, 'sin propuestas scorefriction'),
        verifications: s(verifications.message ?? verifications.error, 'sin verificaciones scorefriction'),
      },
    })
  }

  useEffect(() => {
    void refreshRuntime(caseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  async function runScoreFrictionPipeline(input: ScoreFrictionInput) {
    setCaseId(input.caseId)
    setPipeline({ ...EMPTY_PIPELINE, status: 'running', message: 'creando evidencia' })
    const evidenceResponse = await jsonFetch('/api/sfi/evidence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ module: 'scorefriction', ...input }),
    })
    const evidence = record(evidenceResponse.evidence) as ScoreFrictionPipeline['evidence']
    const evidenceWarnings = Array.isArray(evidenceResponse.warnings) ? evidenceResponse.warnings.map(String) : []

    setPipeline((current) => ({ ...current, evidence, stored: Boolean(evidenceResponse.stored), warnings: evidenceWarnings, message: 'leyendo WorldSpect' }))
    const worldResponse = await jsonFetch('/api/worldspect/vector')
    const worldSnapshot = record(worldResponse).snapshot as WorldSpectVectorSnapshot | null | undefined
    setWorld(worldSnapshot ?? null)

    const engineBody = {
      object_id: evidence?.id ?? input.caseId,
      module: 'scorefriction',
      evidence: evidence ? [evidence] : [],
      worldspect: worldSnapshot ?? null,
      vectors: input.vectors ?? {},
    }
    setPipeline((current) => ({ ...current, world: worldResponse, message: 'evaluando engine' }))
    const [engine, montecarlo] = await Promise.all([
      jsonFetch('/api/sfi-engine/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(engineBody) }),
      jsonFetch('/api/sfi-engine/montecarlo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(engineBody) }),
    ])

    setPipeline((current) => ({ ...current, engine, montecarlo, message: 'detectando atractores' }))
    const attractors = await jsonFetch('/api/scorefriction/proto-attractors/detect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ case_id: input.caseId, evidence_id: evidence?.id }),
    })

    setPipeline((current) => ({ ...current, attractors, message: 'resumiendo AMV' }))
    const amv = await jsonFetch('/api/amv/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        module: 'scorefriction',
        sessionId: input.caseId,
        message: 'Resume observacion ScoreFriction y propone siguiente observacion.',
        context: { evidence, world: worldResponse, engine, montecarlo, attractors },
      }),
    })

    const warnings = [
      ...evidenceWarnings,
      ...(Array.isArray(engine.warnings) ? engine.warnings.map(String) : []),
      ...(Array.isArray(montecarlo.warnings) ? montecarlo.warnings.map(String) : []),
      s(worldResponse.error),
      s(attractors.error),
    ].filter(Boolean)

    setPipeline({ status: 'complete', message: 'pipeline completo', evidence, stored: Boolean(evidenceResponse.stored), world: worldResponse, engine, montecarlo, attractors, amv, warnings })
    await refreshRuntime(input.caseId)
  }

  return (
    <div className="fixed inset-0 cursor-crosshair overflow-hidden bg-[#050504] text-[#d8d0bd]">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[26px] items-center gap-4 border-b border-[#d8b64a20] bg-[#050504]/95 pl-12 pr-3 font-mono">
        <div className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#e0c46c]">SFI</div>
        <div className="h-4 w-px bg-[#d8b64a33]" />
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#8a8172]">ScoreFriction / triplanar operational observatory</div>
        <div className="ml-auto text-[9px] uppercase tracking-[0.16em] text-[#8a8172]">case {caseId} / {pipeline.status}</div>
      </header>
      <aside className="fixed bottom-0 left-0 top-[26px] z-20 flex w-[38px] flex-col items-center gap-4 border-r border-[#d8b64a20] bg-[#050504]/95 py-3">
        {['A', 'B', 'C'].map((zone) => <div key={zone} className="[writing-mode:vertical-rl] font-mono text-[8px] tracking-[0.22em] text-[#6f6658]">ZONE {zone}</div>)}
      </aside>
      <main className="fixed bottom-0 left-[38px] right-0 top-[26px] flex flex-col overflow-hidden">
        <div className="zone-a flex h-[38%] overflow-x-auto border-b border-[#d8b64a20] [scrollbar-width:none]">
          <PanelPhi context={context} />
          <PanelCField context={context} />
          <PanelVectorTwin context={context} />
          <PanelWorldSpectrum context={context} />
        </div>
        <div className="zone-b flex h-[33%] overflow-x-auto border-b border-[#d8b64a20] [scrollbar-width:none]">
          <PanelLongitudinalTension context={context} />
          <PanelSemanticPressure onText={setSemanticText} />
          <PanelStochasticProjection context={context} />
          <PanelAgentEntropy context={context} />
        </div>
        <div className="zone-c flex h-[29%] overflow-x-auto [scrollbar-width:none]">
          <PanelChronology context={context} />
          <PanelAmvChat context={context} />
          <PanelEvidenceLoad pipeline={pipeline} onRun={runScoreFrictionPipeline} />
          <PanelUserAttractor context={context} />
        </div>
      </main>
    </div>
  )
}
