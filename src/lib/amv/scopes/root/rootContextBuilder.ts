import { buildAMVQuestion, finalizeAMV } from '@/agents/amv'
import { CognitiveTwin } from '@/agents/cognitive-twin'
import { LongitudinalEngine } from '@/agents/longitudinal'
import { MOPH_QUESTIONS } from '@/agents/moph'
import { MetricsEngine } from '@/agents/metrics'
import { executeAudit } from '@/agents/auditor'
import { evaluatePatterns } from '@/agents/patternengine'
import { WorldSpectrum } from '@/agents/world-spectrum'
import { runMonteCarlo } from '@/agents/stochastic-engine'
import { AMV_DEFAULT_POLICY } from '../../core/amvDecisionPolicy'
import type { AmvAgentDescriptor, AmvRuntimeRequest, AmvScopeContext, AmvSourceSignal } from '../../core/amvTypes'
import { rootDashboardSpec } from './rootDashboardSpec'

type RootSelectedContext = Record<string, unknown>

function asRecord(value: unknown): RootSelectedContext {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootSelectedContext : {}
}

function textFrom(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function arrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

export function rootFieldState(selectedContext: unknown) {
  const context = asRecord(selectedContext)
  const seed = asRecord(context.seed)
  return {
    sourceState: textFrom(context.sourceState, textFrom(asRecord(seed.mihmRuntimeMatrix).sourceState, 'degraded')),
    nodes: arrayCount(seed.nodeCatalog ?? context.nodeCatalog),
    documents: arrayCount(seed.documentCatalog ?? context.documentCatalog),
    patterns: arrayCount(seed.patternCatalog ?? context.patternCatalog),
    recentEvents: arrayCount(seed.recentEvents ?? context.recentEvents),
  }
}

export function rootAttractorState(selectedContext: unknown) {
  const context = asRecord(selectedContext)
  const proposals = context.proposals ?? asRecord(context.data).proposals
  return {
    proposals: arrayCount(proposals),
    active: arrayCount(proposals) > 0,
    direction: arrayCount(proposals) > 0 ? 'propuesta visible con posible convergencia' : 'sin atractor observado',
  }
}

export function rootEjectorDetector(message: string) {
  const normalized = message.toLowerCase()
  const hardStop = ['hard stop', 'bloquea', 'riesgo', 'rompe', 'crítico', 'critico', 'override'].some((term) => normalized.includes(term))
  const closure = ['cerrar', 'cierre', 'finalizar', 'resolver'].some((term) => normalized.includes(term))
  return {
    hardStop,
    closure,
    routeChanging: hardStop || closure,
  }
}

export function rootWsvTranslator(selectedContext: unknown) {
  const state = rootFieldState(selectedContext)
  return {
    world: state.sourceState === 'observed' ? 'observado' : 'degradado',
    trust: state.sourceState === 'observed' ? 'observed' : 'degraded',
  }
}

export function rootMihmTranslator(selectedContext: unknown) {
  const matrix = asRecord(asRecord(asRecord(selectedContext).seed).mihmRuntimeMatrix)
  return {
    object: textFrom(matrix.object, rootDashboardSpec.defaultMihm.object),
    node: textFrom(matrix.node, rootDashboardSpec.defaultMihm.node),
    baseline: textFrom(matrix.baseline, rootDashboardSpec.defaultMihm.baseline),
    regime: textFrom(matrix.regime, 'basal'),
    ihg: typeof matrix.ihg === 'number' ? matrix.ihg : 0,
    nti: typeof matrix.nti === 'number' ? matrix.nti : 0.5,
    ldi: typeof matrix.ldi === 'number' ? matrix.ldi : 72,
  }
}

export function rootGovernanceTranslator(message: string) {
  const normalized = message.toLowerCase()
  return {
    zeroTrust: true,
    riskManagement: true,
    needsHumanReview: ['aprobar', 'publicar', 'ejecutar', 'override', 'schema', 'migracion'].some((term) => normalized.includes(term)),
  }
}

export function rootLogbookTranslator(selectedContext: unknown) {
  const seed = asRecord(asRecord(selectedContext).seed)
  const recentEvents = seed.recentEvents
  return {
    available: Array.isArray(recentEvents) && recentEvents.length > 0,
    count: arrayCount(recentEvents),
    instruction: 'No exigir seleccionar bitacora; usar evento visible si existe.',
  }
}

export function rootTwinProposalTranslator(selectedContext: unknown) {
  const context = asRecord(selectedContext)
  const proposals = context.proposals ?? asRecord(context.data).proposals
  return {
    available: Array.isArray(proposals) && proposals.length > 0,
    count: arrayCount(proposals),
  }
}

const ROOT_AGENTS: AmvAgentDescriptor[] = [
  { id: 'amv', label: 'AMV scoped adapter', source: 'src/agents/amv.ts', status: 'adapter', trust: 'derived' },
  { id: 'longitudinal', label: 'Longitudinal Engine', source: 'src/agents/longitudinal.ts', status: 'adapter', trust: 'derived' },
  { id: 'cognitive-twin', label: 'Cognitive Twin', source: 'src/agents/cognitive-twin.ts', status: 'adapter', trust: 'derived' },
  { id: 'moph', label: 'MOP-H baseline', source: 'src/agents/moph.ts', status: 'available', trust: 'derived' },
  { id: 'metrics', label: 'Metrics Engine', source: 'src/agents/metrics.ts', status: 'available', trust: 'derived' },
  { id: 'auditor', label: 'Auditor', source: 'src/agents/auditor.ts', status: 'available', trust: 'derived' },
  { id: 'patternengine', label: 'Pattern Engine', source: 'src/agents/patternengine.ts', status: 'deferred', trust: 'degraded' },
  { id: 'world-spectrum', label: 'World Spectrum', source: 'src/agents/world-spectrum.ts', status: 'deferred', trust: 'degraded' },
  { id: 'stochastic-engine', label: 'Stochastic Engine', source: 'src/agents/stochastic-engine.ts', status: 'deferred', trust: 'degraded' },
]

export async function buildRootScopeContext(request: AmvRuntimeRequest): Promise<AmvScopeContext> {
  const selected = request.selectedContext
  const fieldState = rootFieldState(selected)
  const attractorState = rootAttractorState(selected)
  const ejector = rootEjectorDetector(request.message)
  const wsv = rootWsvTranslator(selected)
  const mihm = rootMihmTranslator(selected)
  const governance = rootGovernanceTranslator(request.message)
  const logbook = rootLogbookTranslator(selected)
  const twinProposal = rootTwinProposalTranslator(selected)
  const metrics = MetricsEngine.calculateAll({ narrative: request.message })
  const audit = await executeAudit({ source: 'web', narrative: request.message })
  const rootAudit = { ...audit, id: 'amv-root-audit', node_id: mihm.node, source: 'web' as const, narrative: request.message, created_at: new Date().toISOString() }
  const cognitiveSeed = await CognitiveTwin.extractSeed(request.message)
  const longitudinal = LongitudinalEngine.evaluate({
    currentNarrative: request.message,
    currentMetrics: metrics,
    audits: [rootAudit],
    actions: [],
    memoryFacts: [],
  })
  const amvQuestion = buildAMVQuestion({
    nodeId: mihm.node,
    objective: request.message,
    audits: [rootAudit],
    actions: [],
    memoryFacts: [],
    metrics,
  }, 0, request.message)
  const amvFinal = finalizeAMV({
    nodeId: mihm.node,
    objective: request.message,
    audits: [rootAudit],
    actions: [],
    memoryFacts: [],
    metrics,
  }, request.message)

  const sources: AmvSourceSignal[] = [
    { id: 'rootFieldState', label: 'ROOT field state', trust: fieldState.sourceState === 'observed' ? 'observed' : 'degraded', reason: fieldState.sourceState },
    { id: 'rootAttractorState', label: 'ROOT attractor state', trust: attractorState.active ? 'derived' : 'degraded', reason: attractorState.direction },
    { id: 'rootMihmTranslator', label: 'ROOT MIHM default', trust: 'derived', reason: `${mihm.object} / ${mihm.node} / ${mihm.baseline}` },
  ]

  return {
    subject: 'ROOT',
    scope: 'root',
    agents: ROOT_AGENTS,
    policy: AMV_DEFAULT_POLICY,
    sources,
    context: {
      rootFieldState: fieldState,
      rootAttractorState: attractorState,
      rootEjectorDetector: ejector,
      rootWsvTranslator: wsv,
      rootMihmTranslator: mihm,
      rootGovernanceTranslator: governance,
      rootLogbookTranslator: logbook,
      rootTwinProposalTranslator: twinProposal,
      rootDashboardSpec,
      agentOutputs: {
        metrics,
        audit,
        cognitiveSeed,
        longitudinal,
        amvQuestion,
        amvFinal,
        mophQuestionCount: MOPH_QUESTIONS.length,
        deferredAdapters: {
          evaluatePatterns: typeof evaluatePatterns,
          worldSpectrum: typeof WorldSpectrum.calculateRealityFrame,
          stochastic: typeof runMonteCarlo,
        },
      },
    },
  }
}
