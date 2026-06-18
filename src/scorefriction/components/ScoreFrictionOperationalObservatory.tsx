'use client'

import { useEffect, useMemo, useState } from 'react'
import { evaluateSfi, type SfiMetrics } from '@/lib/sfi/math'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import { CULTURAL_WAVE_CASES } from '@/lib/scorefriction/cultural-wave-cases'
import type { CulturalVectorResponse } from '@/lib/scorefriction/cultural-vector-contract'
import type { WorldSpectVectorSnapshot } from '@/lib/worldspect/vector-contract'
import { PanelAgentEntropy } from './panels/PanelAgentEntropy'
import { PanelAmvChat } from './panels/PanelAmvChat'
import { PanelCField } from './panels/PanelCField'
import { PanelChronology } from './panels/PanelChronology'
import { PanelCulturalTrace } from './panels/PanelCulturalTrace'
import { PanelCulturalWaveform } from './panels/PanelCulturalWaveform'
import { PanelCulturalWaveReadout } from './panels/PanelCulturalWaveReadout'
import { PanelEvidenceLoad, type ScoreFrictionInput } from './panels/PanelEvidenceLoad'
import { PanelLongitudinalTension } from './panels/PanelLongitudinalTension'
import { PanelModelUncertainty } from './panels/PanelModelUncertainty'
import { PanelObjectLoad } from './panels/PanelObjectLoad'
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
  const [cultural, setCultural] = useState<CulturalVectorResponse | null>(null)
  const [evidenceEntries, setEvidenceEntries] = useState<Row[]>([])
  const [operationalState, setOperationalState] = useState<Row | null>(null)
  const [cycleState, setCycleState] = useState<Row | null>(null)
  const [regimeWatch, setRegimeWatch] = useState<Row | null>(null)
  const [amvThoughts, setAmvThoughts] = useState<Row[]>([])
  const [visibleLogbook, setVisibleLogbook] = useState<Row[]>([])
  const [selfObservability, setSelfObservability] = useState<Row | null>(null)
  const [runtime, setRuntime] = useState<RuntimeState>(EMPTY_RUNTIME)
  const [pipeline, setPipeline] = useState<ScoreFrictionPipeline>(EMPTY_PIPELINE)

  const metrics = useMemo(() => metricsFromState(initialState, pipeline, semanticText), [initialState, pipeline, semanticText])
  const context = useMemo<ScoreFrictionPanelContext>(() => ({ caseId, metrics, world, cultural, evidenceEntries, operationalState, pipeline, runtime }), [caseId, cultural, evidenceEntries, metrics, operationalState, pipeline, runtime, world])

  async function refreshRuntime(nextCaseId = caseId) {
    const [proto, longitudinal, hypotheses, proposals, verifications, worldResponse, culturalResponse, evidenceResponse, operationalResponse, cycleResponse, regimeResponse, thoughtsResponse, logbookResponse, selfResponse] = await Promise.all([
      jsonFetch(`/api/scorefriction/proto-attractors?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/longitudinal?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/cultural-twin?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/proposals?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/verifications?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch('/api/worldspect/vector'),
      jsonFetch(`/api/scorefriction/evaluate?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/evidence?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/operational-cycle?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/operational-cycle?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/scorefriction/regime-watch?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/amv/thoughts/live?case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch(`/api/logbook/visible?role=root&case_id=${encodeURIComponent(nextCaseId)}`),
      jsonFetch('/api/root/self-observability'),
    ])

    const snapshot = record(worldResponse).snapshot as WorldSpectVectorSnapshot | null | undefined
    setWorld(snapshot ?? null)
    setCultural(culturalResponse.case_id && culturalResponse.cultural_vector ? culturalResponse as CulturalVectorResponse : null)
    setEvidenceEntries(rows(evidenceResponse.entries))
    setOperationalState(record(operationalResponse.state))
    setCycleState(record(cycleResponse.state))
    setRegimeWatch(regimeResponse)
    setAmvThoughts(rows(thoughtsResponse.thoughts))
    setVisibleLogbook(rows(logbookResponse.entries))
    setSelfObservability(selfResponse)
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
    const evidenceResponse = await jsonFetch('/api/scorefriction/operational-cycle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        case_id: input.caseId,
        objective: input.label,
        scope: 'culture',
        analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
        evidence_input: input,
        evaluated_object: input,
        run_contrast: true,
      }),
    })
    const evidence = record(evidenceResponse.logEntry ?? evidenceResponse.state) as unknown as ScoreFrictionPipeline['evidence']
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
    await jsonFetch('/api/amv/learning/append', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        case_id: input.caseId,
        source: 'scorefriction.ui',
        event_type: 'pipeline_complete',
        summary: 'pipeline ScoreFriction completo con evidencia, contraste y AMV.',
        payload: { evidence, worldResponse, engine, montecarlo, attractors, amv },
      }),
    })
    await refreshRuntime(input.caseId)
  }

  return (
    <div className="fixed inset-0 cursor-crosshair overflow-hidden bg-[#050504] text-[#d8d0bd]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(216,182,74,.065),transparent_42%),linear-gradient(rgba(216,182,74,.024)_1px,transparent_1px),linear-gradient(90deg,rgba(216,182,74,.02)_1px,transparent_1px)] [background-size:auto,42px_42px,42px_42px]" />
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[34px] items-center gap-4 border-b border-[#d8b64a24] bg-[#050504]/96 pl-12 pr-3 font-mono backdrop-blur">
        <div className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#e0c46c]">SFI</div>
        <div className="h-4 w-px bg-[#d8b64a33]" />
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#b8ad98]">SCOREFRICTION / OBSERVATORIO OPERACIONAL</div>
        <div className="h-4 w-px bg-[#d8b64a22]" />
        <div className="text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">ΦSF <span className="text-[#e0c46c]">{metrics.phi.toFixed(3)}</span></div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">IHG <span className="text-[#e0c46c]">{metrics.ihg.toFixed(2)}</span></div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">NTI <span className="text-[#e0c46c]">{metrics.nti.toFixed(2)}</span></div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-[#8a8172]">LDI <span className={metrics.ldi > 0.7 ? 'text-[#d05c52]' : 'text-[#e0c46c]'}>{metrics.ldi.toFixed(2)}</span></div>
        <select value={caseId} onChange={(event) => setCaseId(event.target.value)} className="ml-auto max-w-[240px] border border-[#d8b64a24] bg-[#080706] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#e0c46c] outline-none">
          {[caseId, ...CULTURAL_WAVE_CASES.map((item) => item.case_id)].filter((item, index, list) => list.indexOf(item) === index).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <div className="text-[9px] uppercase tracking-[0.16em] text-[#8a8172]">{pipeline.status}</div>
      </header>
      <aside className="fixed bottom-0 left-0 top-[34px] z-20 flex w-[38px] flex-col items-center justify-between border-r border-[#d8b64a20] bg-[#050504]/96 py-4">
        {['TOPO I', 'TOPO II', 'TOPO III'].map((zone) => (
          <div key={zone} className="[writing-mode:vertical-rl] font-mono text-[8px] uppercase tracking-[0.22em] text-[#6f6658]">{zone}</div>
        ))}
      </aside>
      <main className="fixed bottom-0 left-[38px] right-0 top-[34px] overflow-auto bg-[#050504] p-3">
        <div className="grid min-w-[1500px] auto-rows-[minmax(280px,auto)] grid-cols-12 gap-3">
          <div className="col-span-12 min-h-[170px]"><PanelCulturalWaveReadout context={context} /></div>
          <div className="col-span-12 min-h-[220px] border border-[#d8b64a24] bg-[#080706] p-4 font-mono">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.16em] text-[#8a8172]">
              <span className="text-[#e0c46c]">Operational Cycle</span>
              <span>Regimen: <b className="text-[#d8d0bd]">{String(record(record(cycleState).regime).world ?? 'sin datos suficientes')}</b></span>
              <span>Direccion: <b className="text-[#d8d0bd]">{String(record(record(cycleState).direction).current ?? 'sin lectura')}</b></span>
              <span>Degradacion: <b className="text-[#d8d0bd]">{String(record(record(cycleState).degradation).level ?? 'sin lectura')}</b></span>
              <span className={String(regimeWatch?.severity) === 'critical' || String(regimeWatch?.severity) === 'warning' ? 'text-[#d05c52]' : 'text-[#6ab88a]'}>
                Alerta: {String(regimeWatch?.severity ?? 'none')}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-3 text-[10px] leading-4 text-[#b8ad98]">
              <div className="border-l border-[#d8b64a24] pl-3"><b className="block text-[#e0c46c]">Overview</b>{String(record(cycleState).objective ?? 'Objetivo no declarado.')}</div>
              <div className="border-l border-[#d8b64a24] pl-3"><b className="block text-[#e0c46c]">WorldSpectrumVector Snapshot</b>{rows(record(cycleState).weak_signals).length} senales debiles; {rows(record(cycleState).persistent_signals).length} persistentes.</div>
              <div className="border-l border-[#d8b64a24] pl-3"><b className="block text-[#e0c46c]">Regime Watch</b>{String(regimeWatch?.minimal_action ?? 'sin accion requerida')}</div>
              <div className="border-l border-[#d8b64a24] pl-3"><b className="block text-[#e0c46c]">AMV Thoughts</b>{amvThoughts[0] ? String(amvThoughts[0].thought) : 'Sin aprendizaje suficiente todavia.'}</div>
              <div className="border-l border-[#d8b64a24] pl-3"><b className="block text-[#e0c46c]">Self Observability Snapshot</b>{String(selfObservability?.system_health ?? 'sin chequeo')}</div>
              <div className="border-l border-[#d8b64a24] pl-3"><b className="block text-[#e0c46c]">Technical State</b>{rows(record(record(cycleState).technical_state).warnings).length} warnings; fallback {String(record(record(cycleState).technical_state).fallback_used ?? false)}</div>
            </div>
          </div>
          <div className="col-span-3 min-h-[340px]"><PanelPhi context={context} /></div>
          <div className="col-span-4 min-h-[340px]"><PanelCulturalWaveform context={context} /></div>
          <div className="col-span-5 min-h-[340px]"><PanelWorldSpectrum context={context} /></div>

          <div className="col-span-4 min-h-[360px]"><PanelCField context={context} /></div>
          <div className="col-span-4 min-h-[360px]"><PanelVectorTwin context={context} /></div>
          <div className="col-span-4 min-h-[360px]"><PanelModelUncertainty context={context} onPersisted={() => refreshRuntime(caseId)} /></div>

          <div className="col-span-4 min-h-[360px]"><PanelLongitudinalTension context={context} /></div>
          <div className="col-span-4 min-h-[360px]"><PanelSemanticPressure caseId={caseId} onText={setSemanticText} onPersisted={() => refreshRuntime(caseId)} /></div>
          <div className="col-span-4 min-h-[360px]"><PanelStochasticProjection context={context} /></div>

          <div className="col-span-4 min-h-[360px]"><PanelAgentEntropy context={context} /></div>
          <div className="col-span-4 min-h-[360px]"><PanelCulturalTrace context={context} /></div>
          <div className="col-span-4 min-h-[360px]"><PanelChronology context={context} /></div>

          <div className="col-span-4 min-h-[360px]"><PanelEvidenceLoad pipeline={pipeline} onRun={runScoreFrictionPipeline} /></div>
          <div className="col-span-4 min-h-[360px]"><PanelObjectLoad context={context} onRun={runScoreFrictionPipeline} /></div>
          <div className="col-span-2 min-h-[360px]"><PanelAmvChat context={context} /></div>
          <div className="col-span-2 min-h-[360px]"><PanelUserAttractor context={context} /></div>
          <div className="col-span-4 min-h-[360px] border border-[#d8b64a24] bg-[#080706] p-4 font-mono text-[10px] text-[#b8ad98]">
            <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#e0c46c]">SFI-LAB / Campaign Generator</div>
            <p>El laboratorio queda integrado aqui: objetivo, evaluador, evidencia, media render y aprendizaje AMV usan rutas ScoreFriction canonicas.</p>
            <button
              type="button"
              className="mt-3 border border-[#d8b64a44] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[#e0c46c]"
              onClick={() => void jsonFetch('/api/scorefriction/media/render', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ case_id: caseId, prompt: semanticText || 'ScoreFriction campaign asset', assets: ['text', 'image'] }),
              }).then((result) => setPipeline((current) => ({ ...current, message: String(result.status ?? 'media render ejecutado'), warnings: [...current.warnings, ...rows(result.assets).filter((asset) => asset.status === 'render_failed').map((asset) => String(asset.error ?? 'render_failed'))] })))}
            >
              Ejecutar Media Render
            </button>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-[9px] text-[#7a7568]">{JSON.stringify(record(cycleState).minimal_action ?? {}, null, 2)}</pre>
          </div>
          <div className="col-span-4 min-h-[360px] border border-[#d8b64a24] bg-[#080706] p-4 font-mono text-[10px] text-[#b8ad98]">
            <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#e0c46c]">Bitacora / Evidencia / Verificacion</div>
            {visibleLogbook.slice(0, 8).map((entry) => (
              <div key={String(entry.id)} className="border-b border-[#d8b64a14] py-2">
                <b className="text-[#d8d0bd]">{String(entry.title ?? entry.event_type)}</b>
                <div>{String(entry.summary ?? '')}</div>
              </div>
            ))}
            {visibleLogbook.length === 0 ? <div>Sin bitacora visible para este caso.</div> : null}
          </div>
          <div className="col-span-4 min-h-[360px] border border-[#d8b64a24] bg-[#080706] p-4 font-mono text-[10px] text-[#b8ad98]">
            <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#e0c46c]">MIHM / PSI / Verificacion / Technical State</div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-[9px] text-[#7a7568]">{JSON.stringify({
              analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
              signal_lifetimes: record(cycleState).signal_lifetimes,
              technical_state: record(cycleState).technical_state,
              self_observability: selfObservability,
            }, null, 2)}</pre>
          </div>
        </div>
      </main>
    </div>
  )
}
