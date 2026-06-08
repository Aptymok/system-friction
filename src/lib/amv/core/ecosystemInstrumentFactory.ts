import { AMV_DEFAULT_POLICY, riskFromScore } from './amvDecisionPolicy'
import type { AmvDecision, AmvRuntimeRequest, AmvScopeContext, AmvScopeDefinition, AmvSourceSignal } from './amvTypes'
import type { AmvArchiveLayer } from './archiveLayerPolicy'
import type { AmvDashboardLane, AmvDashboardSpec } from './dashboardSpecTypes'
import type { AmvEvidenceTrust } from './evidenceTypes'
import type { AmvFieldOperator } from './fieldOperatorTypes'
import type { AmvFocusVariable } from './focusVariableTypes'
import type { AmvInstrumentAction, AmvInstrumentDefinition, AmvInstrumentPanel } from './instrumentTypes'
import type { AmvObservableObjectType } from './observableObjectTypes'
import type { AmvObservationMode } from './observationModes'
import type { AmvOutputMode } from './outputModeTypes'
import type { AmvReportRegime } from './regimeTypes'

export type AmvEcosystemScopeId =
  | 'governance-reality'
  | 'scorefriction'
  | 'cluster-atlas'
  | 'signal-vane'
  | 'cognitive-twin-engine'

export type AmvEcosystemInstrumentConfig = {
  id: AmvEcosystemScopeId
  name: string
  subject: string
  title: string
  ontologicalQuestion: string
  observedObject: string
  observationModes: AmvObservationMode[]
  fieldOperators: AmvFieldOperator[]
  outputModes: AmvOutputMode[]
  reportRegimes: AmvReportRegime[]
  observableObjects: AmvObservableObjectType[]
  focusVariables: AmvFocusVariable[]
  evidenceTrust: AmvEvidenceTrust[]
  archiveLayers: AmvArchiveLayer[]
  lanes: AmvDashboardLane[]
  allowedActionIds: string[]
  prohibited: string[]
  briefing: string
  specialBoundary: string
  panels: Array<{
    id: string
    title: string
    question: string
    lane: AmvDashboardLane
    observationMode: AmvObservationMode
    fieldOperators: AmvFieldOperator[]
    outputModes: AmvOutputMode[]
    focusVariables: AmvFocusVariable[]
    observes: string
    riskScore: number
  }>
}

export const AMV_ECOSYSTEM_INSTRUMENTS: Record<AmvEcosystemScopeId, AmvEcosystemInstrumentConfig> = {
  'governance-reality': {
    id: 'governance-reality',
    name: 'Governance Reality',
    subject: 'Governance Reality',
    title: 'Governance Reality como instrumento AMV',
    ontologicalQuestion: 'Que decisiones, acciones y cierres sostienen realidad verificable?',
    observedObject: 'Gobernanza, RCE, deuda de realidad y cierres institucionales.',
    observationModes: ['audit', 'longitudinal', 'forensic', 'diagnostic', 'prescriptive', 'retrospective'],
    fieldOperators: ['debt', 'rce', 'latency', 'verification', 'closure', 'threshold', 'contamination', 'intervention'],
    outputModes: ['reality_debt_report', 'executive_summary', 'risk_register', 'intervention_plan', 'decision_record', 'evidence_packet'],
    reportRegimes: ['dissonant', 'performative', 'saturated', 'active_ejector', 'coupling'],
    observableObjects: ['institucion', 'decision', 'accion', 'evidencia', 'documento', 'ecosistema'],
    focusVariables: ['deuda', 'latencia', 'ejecucion', 'riesgo', 'friccion_institucional'],
    evidenceTrust: ['verified', 'declared', 'audit', 'inferred', 'unknown'],
    archiveLayers: ['living_observatory', 'technical_audit', 'sfi_archive'],
    lanes: ['governance', 'audit', 'field', 'ejector'],
    allowedActionIds: ['observe', 'prepare_intervention', 'record_decision', 'export_visible_json'],
    prohibited: ['No cerrar deuda sin evidencia.', 'No convertir decision en accion ejecutada.', 'No alimentar RCE con intenciones.'],
    briefing: 'Preparar RCE, deuda, decisiones sin accion, acciones sin reobservacion y cierres falsos. No ejecutar cierres.',
    specialBoundary: 'RCE y deuda quedan como lectura si falta persistencia autorizada.',
    panels: [
      {
        id: 'reality.debt',
        title: 'Deuda de realidad',
        question: 'Que distancia existe entre decision y accion verificada?',
        lane: 'governance',
        observationMode: 'audit',
        fieldOperators: ['debt', 'rce', 'latency'],
        outputModes: ['reality_debt_report', 'risk_register'],
        focusVariables: ['deuda', 'latencia', 'ejecucion'],
        observes: 'Decisiones sin accion, acciones sin reobservacion y cierres falsos.',
        riskScore: 0.72,
      },
      {
        id: 'reality.closure',
        title: 'Cierre verificable',
        question: 'Que cierre parece administrativo pero no real?',
        lane: 'audit',
        observationMode: 'forensic',
        fieldOperators: ['verification', 'closure', 'contamination'],
        outputModes: ['decision_record', 'evidence_packet'],
        focusVariables: ['riesgo', 'ejecucion'],
        observes: 'Linaje, testigos, falta de reobservacion y cierre falso.',
        riskScore: 0.68,
      },
    ],
  },
  scorefriction: {
    id: 'scorefriction',
    name: 'ScoreFriction',
    subject: 'ScoreFriction',
    title: 'ScoreFriction como instrumento AMV',
    ontologicalQuestion: 'Que senal cultural muestra friccion, patron o protoatractor sin convertir gusto en juicio?',
    observedObject: 'Canciones, demos, escenas, campanas y objetos culturales declarados.',
    observationModes: ['worldspect', 'focus', 'mihm', 'audit', 'predictive', 'comparative', 'prospective', 'longitudinal'],
    fieldOperators: ['signal', 'pattern', 'cluster', 'attractor', 'ejector', 'stochastic_projection', 'intervention', 'coherence', 'dissonance', 'threshold'],
    outputModes: ['field_reading', 'creative_brief', 'audit_report', 'json_export', 'attractor_map', 'ejector_map', 'simulation_report', 'scenario_matrix'],
    reportRegimes: ['emergent_attractor', 'dissonant', 'saturated', 'performative', 'coupling'],
    observableObjects: ['cancion', 'demo', 'artista', 'campana', 'cluster', 'fenomeno', 'senal', 'evidencia'],
    focusVariables: ['cultural', 'letra', 'densidad_emocional'],
    evidenceTrust: ['verified', 'declared', 'inferred', 'sandbox', 'unknown'],
    archiveLayers: ['living_observatory', 'sandbox', 'technical_audit', 'sfi_archive'],
    lanes: ['field', 'attractor', 'ejector', 'wsv', 'mihm'],
    allowedActionIds: ['observe', 'prepare_creative_brief', 'sandbox_projection', 'export_visible_json'],
    prohibited: ['No decir si una cancion esta buena.', 'No aceptar upload real.', 'No usar mas de tres focus variables.'],
    briefing: 'Leer senal cultural, patron, cluster, atractor o eyector con hasta tres variables focales.',
    specialBoundary: 'El upload queda como contrato; no hay storage real en esta etapa.',
    panels: [
      {
        id: 'score.signal',
        title: 'Senal cultural',
        question: 'Que friccion cultural aparece y que evidencia la sostiene?',
        lane: 'field',
        observationMode: 'worldspect',
        fieldOperators: ['signal', 'pattern', 'coherence', 'dissonance'],
        outputModes: ['field_reading', 'creative_brief'],
        focusVariables: ['cultural', 'letra', 'densidad_emocional'],
        observes: 'Objeto cultural declarado, linaje y variables focales maximas.',
        riskScore: 0.42,
      },
      {
        id: 'score.projection',
        title: 'Proyeccion sandbox',
        question: 'Que escenario aparece sin promoverlo a regimen?',
        lane: 'attractor',
        observationMode: 'predictive',
        fieldOperators: ['stochastic_projection', 'attractor', 'ejector', 'threshold'],
        outputModes: ['scenario_matrix', 'simulation_report', 'attractor_map', 'ejector_map'],
        focusVariables: ['cultural', 'densidad_emocional'],
        observes: 'Escenarios culturales, atractores y eyectores en sandbox.',
        riskScore: 0.56,
      },
    ],
  },
  'cluster-atlas': {
    id: 'cluster-atlas',
    name: 'Cluster Atlas',
    subject: 'Cluster Atlas',
    title: 'Cluster Atlas como instrumento AMV',
    ontologicalQuestion: 'Que fenomenos, clusters y memoria de campo muestran acoplamiento o cambio de regimen?',
    observedObject: 'Clusters, fenomenos, patrones persistentes y memoria observable.',
    observationModes: ['worldspect', 'longitudinal', 'comparative', 'retrospective', 'prospective', 'diagnostic'],
    fieldOperators: ['signal', 'pattern', 'cluster', 'phenomenon', 'coupling', 'regime_shift', 'attractor', 'threshold', 'memory'],
    outputModes: ['phenomenon_card', 'attractor_map', 'field_reading', 'early_warning', 'json_export', 'evidence_packet'],
    reportRegimes: ['coupling', 'emergent_attractor', 'proto_critical', 'ghost', 'dissonant'],
    observableObjects: ['cluster', 'fenomeno', 'senal', 'evidencia', 'red', 'ecosistema'],
    focusVariables: ['cultural', 'protoatractor', 'latencia', 'riesgo'],
    evidenceTrust: ['verified', 'declared', 'inferred', 'audit', 'unknown'],
    archiveLayers: ['living_observatory', 'sfi_archive', 'technical_audit'],
    lanes: ['field', 'attractor', 'wsv', 'audit'],
    allowedActionIds: ['observe', 'name_phenomenon', 'export_visible_json', 'prepare_warning'],
    prohibited: ['No nombrar fenomeno sin patron persistente.', 'No inferir causalidad desde acoplamiento.', 'No borrar memoria de cluster.'],
    briefing: 'Agrupar fenomenos, detectar memoria, acoplamiento, umbral y cambio de regimen con evidencia visible.',
    specialBoundary: 'El atlas nombra fenomenos; no crea entidades productivas nuevas.',
    panels: [
      {
        id: 'atlas.cluster',
        title: 'Cluster observado',
        question: 'Que senales forman cluster y bajo que criterio?',
        lane: 'field',
        observationMode: 'comparative',
        fieldOperators: ['signal', 'pattern', 'cluster', 'memory'],
        outputModes: ['phenomenon_card', 'field_reading', 'json_export'],
        focusVariables: ['cultural', 'latencia'],
        observes: 'Criterio de agrupacion, memoria y evidencia permitida.',
        riskScore: 0.38,
      },
      {
        id: 'atlas.regime',
        title: 'Cambio de regimen',
        question: 'Que umbral o atractor emerge del cluster?',
        lane: 'attractor',
        observationMode: 'prospective',
        fieldOperators: ['regime_shift', 'attractor', 'threshold', 'coupling'],
        outputModes: ['early_warning', 'attractor_map', 'evidence_packet'],
        focusVariables: ['protoatractor', 'riesgo'],
        observes: 'Umbral, acoplamiento y cambio de regimen posible.',
        riskScore: 0.61,
      },
    ],
  },
  'signal-vane': {
    id: 'signal-vane',
    name: 'Signal Vane',
    subject: 'Signal Vane',
    title: 'Signal Vane como instrumento AMV',
    ontologicalQuestion: 'Que senal cruza umbral suficiente para alerta sin promover ruido?',
    observedObject: 'Senales, umbrales, patrones, memoria y escenarios de alerta temprana.',
    observationModes: ['worldspect', 'predictive', 'longitudinal', 'counterfactual', 'forensic', 'prospective'],
    fieldOperators: ['signal', 'threshold', 'pattern', 'stochastic_projection', 'regime_shift', 'memory', 'simulation'],
    outputModes: ['early_warning', 'scenario_matrix', 'risk_register', 'field_reading', 'simulation_report', 'evidence_packet'],
    reportRegimes: ['proto_critical', 'saturated', 'dissonant', 'ghost', 'active_ejector'],
    observableObjects: ['senal', 'fenomeno', 'evidencia', 'red', 'ecosistema', 'institucion'],
    focusVariables: ['riesgo', 'latencia', 'friccion_institucional', 'deuda'],
    evidenceTrust: ['verified', 'declared', 'inferred', 'simulated', 'sandbox', 'audit', 'unknown'],
    archiveLayers: ['living_observatory', 'sandbox', 'technical_audit'],
    lanes: ['field', 'ejector', 'wsv', 'audit'],
    allowedActionIds: ['observe', 'prepare_warning', 'sandbox_projection', 'export_visible_json'],
    prohibited: ['No promover ruido sin umbral.', 'No ejecutar mitigacion.', 'No presentar prediccion como hecho observado.'],
    briefing: 'Separar senal de ruido, exigir umbral y mantener proyecciones en sandbox.',
    specialBoundary: 'La alerta temprana requiere umbral visible o queda degradada.',
    panels: [
      {
        id: 'vane.threshold',
        title: 'Umbral de senal',
        question: 'Que senal supera umbral y que parte sigue siendo ruido?',
        lane: 'field',
        observationMode: 'worldspect',
        fieldOperators: ['signal', 'threshold', 'pattern', 'memory'],
        outputModes: ['early_warning', 'field_reading', 'risk_register'],
        focusVariables: ['riesgo', 'latencia'],
        observes: 'Senal, umbral, memoria y degradacion.',
        riskScore: 0.64,
      },
      {
        id: 'vane.counterfactual',
        title: 'Escenario contenido',
        question: 'Que cambia bajo otro escenario sin alimentar regimen?',
        lane: 'ejector',
        observationMode: 'counterfactual',
        fieldOperators: ['stochastic_projection', 'simulation', 'regime_shift'],
        outputModes: ['scenario_matrix', 'simulation_report', 'evidence_packet'],
        focusVariables: ['riesgo', 'friccion_institucional'],
        observes: 'Contrafactuales y simulaciones aisladas.',
        riskScore: 0.58,
      },
    ],
  },
  'cognitive-twin-engine': {
    id: 'cognitive-twin-engine',
    name: 'Cognitive Twin Engine',
    subject: 'Cognitive Twin Engine',
    title: 'Cognitive Twin Engine como instrumento AMV',
    ontologicalQuestion: 'Que objeto cognitivo declarado muestra coherencia, disonancia, acoplamiento o simulacion?',
    observedObject: 'Objeto cognitivo declarado, lectura MIHM y simulaciones sandbox.',
    observationModes: ['worldspect', 'mihm', 'comparative', 'diagnostic', 'predictive', 'counterfactual', 'longitudinal'],
    fieldOperators: ['coherence', 'dissonance', 'coupling', 'decoupling', 'attractor', 'ejector', 'stochastic_projection', 'simulation', 'regime_shift'],
    outputModes: ['field_reading', 'simulation_report', 'scenario_matrix', 'executive_summary', 'json_export', 'risk_register'],
    reportRegimes: ['dissonant', 'coupling', 'emergent_attractor', 'proto_critical', 'ghost'],
    observableObjects: ['persona', 'documento', 'decision', 'accion', 'fenomeno', 'ecosistema'],
    focusVariables: ['riesgo', 'latencia', 'deuda', 'ejecucion', 'energia_corporal'],
    evidenceTrust: ['verified', 'declared', 'inferred', 'simulated', 'sandbox', 'audit', 'unknown'],
    archiveLayers: ['living_observatory', 'sandbox', 'technical_audit'],
    lanes: ['mihm', 'field', 'attractor', 'ejector', 'audit'],
    allowedActionIds: ['observe', 'sandbox_projection', 'export_visible_json', 'prepare_summary'],
    prohibited: ['No ejecutar Python.', 'No MIHM sin objeto.', 'No presentar simulacion como lectura viva.'],
    briefing: 'Leer coherencia, disonancia, acoplamiento, eyector y simulacion sin invocar Python.',
    specialBoundary: 'Python queda available_not_invoked, degraded, timeout, contract_error o sandbox_only.',
    panels: [
      {
        id: 'twin.object',
        title: 'Objeto MIHM',
        question: 'Que objeto fue declarado antes de interpretar MIHM?',
        lane: 'mihm',
        observationMode: 'mihm',
        fieldOperators: ['coherence', 'dissonance', 'coupling', 'decoupling'],
        outputModes: ['field_reading', 'executive_summary', 'risk_register'],
        focusVariables: ['riesgo', 'energia_corporal'],
        observes: 'Objeto declarado, coherencia, disonancia y acoplamiento.',
        riskScore: 0.7,
      },
      {
        id: 'twin.simulation',
        title: 'Simulacion sandbox',
        question: 'Que proyeccion existe sin ejecutar Python?',
        lane: 'ejector',
        observationMode: 'counterfactual',
        fieldOperators: ['stochastic_projection', 'simulation', 'attractor', 'ejector'],
        outputModes: ['simulation_report', 'scenario_matrix', 'json_export'],
        focusVariables: ['riesgo', 'latencia'],
        observes: 'Contrato de simulacion y estado de puente Python sin invocacion.',
        riskScore: 0.74,
      },
    ],
  },
}

function action(id: string, scope: string): AmvInstrumentAction {
  const highRisk = id.includes('intervention') || id.includes('projection')
  return {
    id: `${scope}.${id}`,
    label: id.replaceAll('_', ' '),
    consequence: highRisk
      ? 'Prepara lectura o escenario; no ejecuta intervencion ni escribe datos.'
      : 'Opera sobre estado visible y evidencia permitida sin tocar persistencia productiva.',
    risk: highRisk ? 'high' : 'medium',
    requiresRootApproval: highRisk,
  }
}

function prohibitedAction(label: string, scope: string, index: number): AmvInstrumentAction {
  return {
    id: `${scope}.prohibited.${index}`,
    label,
    consequence: 'Viola el contrato de ecosistema observable AMV.',
    risk: 'hard_stop',
    requiresRootApproval: true,
  }
}

export function buildEcosystemDashboardSpec(config: AmvEcosystemInstrumentConfig): AmvDashboardSpec {
  const sources: AmvSourceSignal[] = [
    {
      id: `${config.id}.visible_context`,
      label: `${config.name} visible context`,
      trust: 'derived',
      reason: 'Contexto recibido por runtime scoped; no consulta fuentes nuevas.',
    },
    {
      id: `${config.id}.policy`,
      label: `${config.name} policy`,
      trust: 'derived',
      reason: config.specialBoundary,
    },
  ]
  const panels: AmvInstrumentPanel[] = config.panels.map((panel) => ({
    id: panel.id,
    title: panel.title,
    question: panel.question,
    observationMode: panel.observationMode,
    fieldOperators: panel.fieldOperators,
    outputModes: panel.outputModes,
    reportRegimes: config.reportRegimes,
    observableObjects: config.observableObjects,
    focusVariables: panel.focusVariables,
    evidenceTrust: config.evidenceTrust,
    observes: panel.observes,
    sources: sources.map((source) => source.id),
    metrics: ['sourceTrust', 'riskPolicy', 'evidenceBoundary'],
    actions: config.allowedActionIds.map((id) => `${config.id}.${id}`),
    risk: riskFromScore(panel.riskScore),
    minimumEvidence: 'Objeto observado, fuente visible, evidencia permitida y limite declarado.',
    emptyState: 'Sin datos suficientes; la lectura queda degradada y no sostiene regimen.',
  }))

  const instrument: AmvInstrumentDefinition = {
    id: `${config.id}.instrument`,
    name: config.name,
    ontologicalQuestion: config.ontologicalQuestion,
    observedObject: config.observedObject,
    scope: config.id,
    observationModes: config.observationModes,
    fieldOperators: config.fieldOperators,
    outputModes: config.outputModes,
    reportRegimes: config.reportRegimes,
    observableObjects: config.observableObjects,
    focusVariables: config.focusVariables,
    evidenceTrust: config.evidenceTrust,
    archiveLayers: config.archiveLayers,
    sources,
    tables: [
      {
        id: `${config.id}.runtime_context`,
        label: 'Contexto visible AMV',
        purpose: 'Sostener lectura scoped sin crear otro AMV ni tocar Supabase.',
        trust: 'derived',
        access: 'read',
      },
    ],
    metrics: [
      {
        id: 'sourceTrust',
        label: 'Confiabilidad visible',
        meaning: 'Declara si la lectura esta observada, derivada o degradada.',
        source: `${config.id}.visible_context`,
        requiredEvidence: 'Fuente declarada y objeto observable.',
      },
      {
        id: 'riskPolicy',
        label: 'Politica de riesgo',
        meaning: 'Define si una salida queda como lectura, alerta o hard stop.',
        source: `${config.id}.policy`,
        requiredEvidence: config.specialBoundary,
      },
    ],
    requiredAgents: [`${config.id}-agent`, 'amv-core-scoped-runtime'],
    allowedActions: config.allowedActionIds.map((id) => action(id, config.id)),
    prohibitedActions: config.prohibited.map((label, index) => prohibitedAction(label, config.id, index)),
    panels,
    risk: riskFromScore(Math.max(...config.panels.map((panel) => panel.riskScore))),
    minimumEvidence: 'No inventar fuentes; usar contexto visible, evidencia permitida y linaje declarado.',
    amvBriefing: config.briefing,
    responsePolicy: {
      ...AMV_DEFAULT_POLICY,
      visibleStructure: ['observacion', 'evidencia', 'riesgo', 'limite', 'ruta'],
      forbiddenClaims: [
        'No reclamar ejecucion externa.',
        'No reclamar escritura en base de datos.',
        'No presentar sandbox como regimen.',
        ...config.prohibited,
      ],
      uncertaintyLabel: 'sin lectura suficiente',
    },
  }

  return {
    id: `${config.id}.dashboard`,
    instrumentId: instrument.id,
    scope: config.id,
    title: config.title,
    visibleFormat: ['observacion', 'evidencia', 'riesgo', 'limite', 'ruta'],
    lanes: config.lanes,
    observationModes: config.observationModes,
    fieldOperators: config.fieldOperators,
    outputModes: config.outputModes,
    reportRegimes: config.reportRegimes,
    observableObjects: config.observableObjects,
    focusVariables: config.focusVariables,
    evidenceTrust: config.evidenceTrust,
    panels: panels.map((panel, index) => ({
      ...panel,
      lane: config.panels[index]?.lane ?? 'field',
      order: index + 1,
      renderMode: index === 0 ? 'summary' : 'evidence',
    })),
    instrument,
    defaultMihm: config.id === 'cognitive-twin-engine'
      ? { object: 'sin objeto declarado', node: 'amv-cognitive-twin-engine', baseline: 'sandbox_only' }
      : undefined,
  }
}

export function buildEcosystemContext(config: AmvEcosystemInstrumentConfig, request: AmvRuntimeRequest): AmvScopeContext {
  const hasSelectedContext = Boolean(request.selectedContext)
  const objectDeclared = typeof request.selectedContext === 'object' && request.selectedContext !== null
  const trust = hasSelectedContext ? 'derived' : 'degraded'

  return {
    subject: config.subject,
    scope: config.id,
    policy: AMV_DEFAULT_POLICY,
    agents: [
      {
        id: `${config.id}-agent`,
        label: `${config.name} Agent`,
        source: `src/lib/amv/agents/${config.id}Agent.ts`,
        status: 'available',
        trust,
      },
    ],
    sources: [
      {
        id: `${config.id}.request`,
        label: 'Runtime request',
        trust,
        reason: hasSelectedContext ? 'selectedContext recibido' : 'selectedContext ausente; lectura degradada',
      },
    ],
    context: {
      scope: config.id,
      subject: config.subject,
      objectDeclared,
      selectedContext: request.selectedContext ?? null,
      dashboardSpec: buildEcosystemDashboardSpec(config),
      prohibitedActions: config.prohibited,
      archiveLayers: config.archiveLayers,
      sandboxOnly: config.id === 'signal-vane' || config.id === 'cognitive-twin-engine',
      focusVariableLimit: config.id === 'scorefriction' ? 3 : null,
    },
  }
}

export function decideEcosystemScope(config: AmvEcosystemInstrumentConfig, request: AmvRuntimeRequest, context: AmvScopeContext): AmvDecision {
  const message = request.message.toLowerCase()
  const hardStop = config.prohibited.some((rule) => message.includes(rule.toLowerCase().slice(0, 12)))
    || (config.id === 'cognitive-twin-engine' && (message.includes('python') || message.includes('mihm')) && !context.context.objectDeclared)
    || (config.id === 'signal-vane' && message.includes('ruido') && !message.includes('umbral'))
  const risk = hardStop ? 'hard_stop' : context.sources[0]?.trust === 'degraded' ? 'medium' : 'low'

  return {
    event: `${config.name} recibe senal: ${request.message}`,
    result: hardStop
      ? `${config.name} queda en hard stop por limite declarado.`
      : `${config.name} produce lectura scoped sobre ${config.observedObject}`,
    effect: context.sources[0]?.trust === 'degraded'
      ? 'La salida queda degradada; no alimenta regimen ni ejecuta intervencion.'
      : 'La salida puede orientar lectura, export o reporte sin escribir DB.',
    window: 'Uso inmediato como contrato observable; produccion requiere persistencia autorizada.',
    route: hardStop ? 'Detener ejecucion y pedir evidencia/objeto/umbral.' : 'Mantener observacion AMV scoped.',
    risk,
    confidence: context.sources[0]?.trust === 'degraded' ? 0.42 : 0.74,
    sourceTrust: context.sources[0]?.trust ?? 'degraded',
    changedDecision: true,
    warnings: context.sources[0]?.trust === 'degraded' ? [`${config.id}_context_degraded`] : [],
  }
}

export function createEcosystemScope(config: AmvEcosystemInstrumentConfig): AmvScopeDefinition {
  return {
    id: config.id,
    subject: config.subject,
    buildContext(request) {
      return buildEcosystemContext(config, request)
    },
    decide({ request, scopeContext }) {
      return decideEcosystemScope(config, request, scopeContext)
    },
  }
}
