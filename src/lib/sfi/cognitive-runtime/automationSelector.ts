import type { KernelContext } from './kernelContext';

export const SFI_COGNITIVE_AUTOMATION_ORDER = [
  'field_observer',
  'evidence_hunter',
  'temporal_resolver',
  'historical_scout',
  'phenotype_resolver',
  'context_builder',
  'cross_impact',
  'friction_field_simulator',
  'social_field_simulator',
  'economic_field_simulator',
  'cultural_simulator',
  'psychological_simulator',
  'policy_simulator',
  'entropy_redistribution',
  'trajectory_agent',
  'risk_agent',
  'opportunity_agent',
  'multi_stakeholder_bootstrap',
  'project_execution_manager',
  'reality_calibration',
] as const;

export type CognitiveAutomationId = typeof SFI_COGNITIVE_AUTOMATION_ORDER[number];
export type CognitiveAutomationSelectionMode = 'explicit' | 'auto';

export interface CognitiveAutomationSelection {
  mode: CognitiveAutomationSelectionMode;
  automationIds: CognitiveAutomationId[];
  reasons: Record<string, string[]>;
}

const AUTOMATION_SET = new Set<string>(SFI_COGNITIVE_AUTOMATION_ORDER);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizedText(context: KernelContext) {
  const metadata = record(context.metadata);
  const caseContext = record(metadata.caseContext);
  const evidenceRequirement = record(caseContext.evidenceRequirement);
  const values = [
    metadata.intent,
    metadata.cognitiveIntent,
    metadata.objective,
    metadata.question,
    metadata.protocolId,
    metadata.studioAction,
    metadata.mode,
    metadata.caseClass,
    caseContext.intent,
    caseContext.objective,
    caseContext.question,
    caseContext.caseClass,
    caseContext.declaredFunction,
    evidenceRequirement.webPolicy,
    ...strings(metadata.cognitiveIntents),
  ];
  return values
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function requestedIds(context: KernelContext): CognitiveAutomationId[] {
  const metadata = record(context.metadata);
  const requested = [
    ...strings(metadata.requestedAutomations),
    ...strings(metadata.requestedAgents),
  ];
  return requested
    .filter((value, index, values) => AUTOMATION_SET.has(value) && values.indexOf(value) === index) as CognitiveAutomationId[];
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function resolvedCaseClass(context: KernelContext) {
  const metadata = record(context.metadata);
  const caseContext = record(metadata.caseContext);
  return String(metadata.caseClass ?? caseContext.caseClass ?? '').trim().toUpperCase();
}

function hasStructuredPrediction(context: KernelContext) {
  const metadata = record(context.metadata);
  const signal = record(metadata.signal);
  const extracted = record(signal.extracted);
  return Object.keys(record(extracted.prediction)).length > 0;
}

function hasMaterialObservation(context: KernelContext) {
  const metadata = record(context.metadata);
  const signal = record(metadata.signal);
  const extracted = record(signal.extracted);
  const hydration = record(record(metadata.caseContext).observationHydration);
  return Object.keys(extracted).length > 0 || hydration.hydrated === true;
}

export function selectCognitiveAutomations(context: KernelContext): CognitiveAutomationSelection {
  const explicit = requestedIds(context);
  if (explicit.length) {
    return {
      mode: 'explicit',
      automationIds: SFI_COGNITIVE_AUTOMATION_ORDER.filter((id) => explicit.includes(id)),
      reasons: Object.fromEntries(explicit.map((id) => [id, ['explicitly_requested']])),
    };
  }

  const text = normalizedText(context);
  const caseClass = resolvedCaseClass(context);
  const structuredPredictionAvailable = hasStructuredPrediction(context);
  const materialObservationAvailable = hasMaterialObservation(context);
  const selected = new Map<CognitiveAutomationId, Set<string>>();
  const choose = (id: CognitiveAutomationId, reason: string) => {
    const current = selected.get(id) ?? new Set<string>();
    current.add(reason);
    selected.set(id, current);
  };

  choose('field_observer', 'baseline_observation');
  choose('evidence_hunter', 'evidence_sufficiency_check');

  const hasEvidence = context.evidence.length > 0;
  const hasHypotheses = context.hypotheses.length > 0;
  const hasContradictions = context.contradictions.length > 0;
  const hasSimulations = context.simulations.length > 0;
  const hasPredictions = context.predictions.length > 0;

  if (hasEvidence || hasAny(text, ['time', 'temporal', 'timeline', 'fecha', 'periodo', 'horizon', 'return', 'retorno', 'ventana'])) {
    choose('temporal_resolver', hasEvidence ? 'evidence_has_temporal_coordinate' : 'temporal_intent');
  }

  if (hasAny(text, ['history', 'histor', 'precedent', 'anterior', 'longitudinal', 'reconstruct', 'reconstru', 'recurren', 'repetid'])) {
    choose('historical_scout', 'historical_reconstruction_intent');
    choose('phenotype_resolver', 'structural_precedent_comparison');
  }

  if (hasEvidence || hasHypotheses || hasContradictions || materialObservationAvailable) {
    choose('context_builder', 'context_required_for_available_signals');
  }

  // Friction analysis is a core SFI projection over substantive material. It is
  // selected whenever a real observation is available, not only when the user
  // happens to say "simulate" or "friction".
  if (materialObservationAvailable || hasEvidence) {
    choose('friction_field_simulator', materialObservationAvailable ? 'material_observation_requires_friction_analysis' : 'evidence_requires_friction_analysis');
  }

  if (hasHypotheses || hasContradictions) {
    choose('cross_impact', 'hypothesis_or_contradiction_coupling');
    choose('entropy_redistribution', 'unresolved_uncertainty_present');
  }

  const simulationIntent = hasSimulations || hasAny(text, ['simulate', 'simulation', 'simular', 'scenario', 'escenario', 'model', 'modelo']);
  if (simulationIntent) {
    choose('friction_field_simulator', 'simulation_intent');
    choose('cross_impact', 'simulation_requires_coupling_check');
    if (hasAny(text, ['economic', 'econom', 'market', 'mercado', 'capital', 'labor'])) choose('economic_field_simulator', 'economic_domain');
    if (hasAny(text, ['social', 'population', 'trust', 'sociedad', 'poblacion', 'confianza'])) choose('social_field_simulator', 'social_domain');
    if (hasAny(text, ['cultural', 'culture', 'narrative', 'symbol', 'attention', 'cultura', 'narrativa', 'simbolo', 'atencion'])) choose('cultural_simulator', 'cultural_domain');
    if (hasAny(text, ['psych', 'desire', 'fear', 'memory', 'reward', 'moph', 'psicol', 'deseo', 'miedo', 'memoria'])) choose('psychological_simulator', 'psychological_domain');
    if (hasAny(text, ['policy', 'governance', 'regulation', 'politic', 'government', 'gobernanza', 'regulacion', 'gobierno'])) choose('policy_simulator', 'policy_domain');
  }

  if (hasPredictions || structuredPredictionAvailable || hasAny(text, ['trajectory', 'project', 'forecast', 'predict', 'proyeccion', 'proyect', 'trayectoria', 'pronost'])) {
    choose('trajectory_agent', structuredPredictionAvailable ? 'structured_prediction_available' : 'projection_or_prediction_intent');
  }

  const decisionByClass = ['DECISION', 'INTERVENTION'].includes(caseClass);
  const decisionIntent = decisionByClass || hasAny(text, [
    'decide', 'decision', 'decision', 'riesgo', 'risk', 'opportunity', 'oportunidad', 'action', 'accion', 'acciones',
    'execute', 'ejecut', 'intervention', 'intervencion', 'governance', 'gobernanza', 'autorizar', 'mejora', 'remedi', 'prioriz',
  ]);
  if (decisionIntent || context.risks.length > 0 || context.opportunities.length > 0) {
    choose('risk_agent', decisionByClass ? 'case_class_requires_downside_check' : 'decision_requires_downside_check');
    choose('opportunity_agent', decisionByClass ? 'case_class_requires_upside_check' : 'decision_requires_upside_check');
  }

  const governedActionIntent = caseClass === 'INTERVENTION' || hasAny(text, [
    'execute', 'execution', 'ejecut', 'intervention', 'intervencion', 'external action', 'accion externa',
    'publish', 'publicar', 'spend', 'gastar', 'grant access', 'conceder acceso', 'implementar', 'implementacion',
  ]);
  if (governedActionIntent) {
    choose('multi_stakeholder_bootstrap', 'governed_action_requires_stakeholder_divergence_check');
    choose('project_execution_manager', 'governed_action_requires_dependency_plan');
  }

  if (hasPredictions || structuredPredictionAvailable || hasAny(text, ['outcome', 'return', 'returned', 'resultado', 'retorno', 'calibrate', 'calibrar', 'contrastar', 'contraste'])) {
    choose('reality_calibration', structuredPredictionAvailable ? 'structured_prediction_requires_future_calibration' : 'observed_return_or_prediction_requires_calibration');
  }

  const automationIds = SFI_COGNITIVE_AUTOMATION_ORDER.filter((id) => selected.has(id));
  return {
    mode: 'auto',
    automationIds,
    reasons: Object.fromEntries(automationIds.map((id) => [id, [...(selected.get(id) ?? [])]])),
  };
}
