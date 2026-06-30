import 'server-only';
import { getLlmProviderStatus, runLlmTask } from '@/lib/ai/providerRouter';
import { readOperationalConsoleState } from '@/lib/sfi/operationalConsole';
import { listPredictionEntries, getPredictionRegistryHealth } from '@/lib/sfi/predictions/service';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';
import { loadWorldOpportunities } from '@/lib/worldspect/opportunities';
import { readAmvOperationalMemory } from './amvAgent';
import { runNeuralGraphAgent, type NeuralGraphAgentResult } from './neuralGraphAgent';
import { compactText, createTrace, nowIso, number01, text, textScore, unique, type AgentTrace } from './utils';

export type AgenticAction = {
  action: string;
  reason: string;
  evidence: string[];
  risk: 'low' | 'medium' | 'high';
  expected_outcome: string;
  approval_required: boolean;
  status: 'draft' | 'queued_for_approval' | 'blocked' | 'manual_mode';
};

export type MophAgentInput = {
  stuckSystem: string;
  objective?: string;
  attempts?: string;
  evidence?: string;
  consequence?: string;
  accountId?: string | null;
};

export type MophAgentOutput = {
  ok: boolean;
  friction_reading: string;
  conversion_break: string;
  minimal_perturbation: string;
  next_action: string;
  risk: 'low' | 'medium' | 'high';
  sfi_dr01_fit: 'low' | 'medium' | 'high';
  confidence: number;
  user_friendly_explanation: string;
  persistence_status: 'not_persisted' | 'local_fallback' | 'account_available';
  twin: {
    available: boolean;
    status: string;
    summary: string;
  };
  provider: string;
  warnings: string[];
  trace: AgentTrace;
};

export type IfnormReport = {
  entity_name: string;
  person_or_role: string;
  sector: string;
  source: string;
  public_signal: string;
  detected_pain: string;
  evidence: string[];
  sfi_interpretation: string;
  hypothesis: string;
  prediction: string;
  recommended_offer: 'SFI-DR01' | 'SFI-AI01' | 'SFI-GOV01' | 'SFI-NA01' | 'SFI-CX01' | 'MOP-H piloto' | 'content only' | 'monitor' | 'discard';
  why_sfi_fits: string;
  linking_strategy: string;
  suggested_human_message: string;
  p_response: number;
  p_meeting: number;
  p_paid_diagnostic: number;
  p_case_value: number;
  p_content_value: number;
  risk: 'low' | 'medium' | 'high';
  recommended_action: string;
  status: 'queued_for_approval' | 'manual_evidence_required' | 'blocked' | 'draft';
  trace: AgentTrace;
};

export type PredictionAgentOutput = {
  hypothesis_id: string;
  prediction: string;
  probabilities: {
    p_relevant: number;
    p_contactable: number;
    p_response: number;
    p_meeting: number;
    p_paid_diagnostic: number;
    p_case_value: number;
    p_content_value: number;
  };
  confidence: number;
  evidence_basis: string[];
  uncertainty: string[];
  next_action: string;
  trace: AgentTrace;
};

export type ReportType =
  | 'world_vector_internal'
  | 'world_vector_public'
  | 'ifnorm'
  | 'sfi_dr01'
  | 'neural_graph_evidence'
  | 'amv_recurrence'
  | 'calibration'
  | 'atlas_entry'
  | 'linkedin_draft'
  | 'contact_draft';

export type ReportAgentOutput = {
  ok: boolean;
  type: ReportType;
  title: string;
  body: string;
  evidence: string[];
  approval_queue: AgenticAction;
  provider: string;
  warnings: string[];
  trace: AgentTrace;
};

function riskFromText(value: string): 'low' | 'medium' | 'high' {
  const lower = value.toLowerCase();
  if (/(legal|crisis|seguridad|security|publica|publish|fuga|secret|regulator|riesgo alto)/.test(lower)) return 'high';
  if (/(bloqueo|degrad|incertid|cliente|contact|outreach|automat)/.test(lower)) return 'medium';
  return 'low';
}

function fitFromEvidence(evidenceCount: number, risk: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
  if (evidenceCount >= 3 && risk !== 'high') return 'high';
  if (evidenceCount >= 1 || risk === 'medium') return 'medium';
  return 'low';
}

function offerFor(input: string): IfnormReport['recommended_offer'] {
  const lower = input.toLowerCase();
  if (/(ai|modelo|llm|agent|automat)/.test(lower)) return 'SFI-AI01';
  if (/(gobierno|governance|riesgo|compliance|regulator)/.test(lower)) return 'SFI-GOV01';
  if (/(narrativa|contenido|linkedin|marca)/.test(lower)) return 'SFI-NA01';
  if (/(cliente|customer|cx|soporte|retencion)/.test(lower)) return 'SFI-CX01';
  if (/(experimento|piloto|mop|field)/.test(lower)) return 'MOP-H piloto';
  return 'SFI-DR01';
}

export async function runWorldVectorAgent() {
  const [worldVector, operational, opportunities] = await Promise.all([
    buildWorldVectorOperationalState(),
    readOperationalConsoleState().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'operational_state_failed' })),
    loadWorldOpportunities(40),
  ]);
  const degradedSources = [
    ...worldVector.agent_audit.blocked,
    ...((opportunities as { ok: boolean }).ok ? [] : [((opportunities as { error?: string; status?: string }).error ?? (opportunities as { error?: string; status?: string }).status ?? 'world_opportunities_unavailable')]),
    ...((operational as { ok?: boolean }).ok ? [] : ['sfi_operational_state_degraded']),
  ];
  const dominantSignal = worldVector.today.observation.dominant_signal ?? 'world_vector_signal_not_available';
  const opportunity = opportunities.ok ? opportunities.opportunities[0] : null;
  return {
    current_signal_state: worldVector.today.observation.status,
    dominant_pattern: dominantSignal,
    sector_tension: worldVector.today.cycle_day.sectorLabel,
    degraded_sources: unique(degradedSources),
    what_to_observe: opportunity?.verification_condition ?? 'Observe a comparable evidence item before converting this into action.',
    what_to_publish: worldVector.reports.public.body,
    what_client_class_to_seek: opportunity ? `${opportunity.vector} teams with evidence-backed persistence and visible operational friction` : 'manual opportunity evidence required',
    what_not_to_touch: 'No external publication, outreach, or cycle close without ROOT approval.',
    root_interpretation: worldVector.reports.internal.body,
    public_interpretation: worldVector.reports.public.body,
    trace: createTrace({
      prefix: 'world_vector_agent',
      sourceInputs: ['world-vector', 'observatory', 'sfi-operational-state'],
      toolsUsed: ['buildWorldVectorOperationalState', 'readOperationalConsoleState', 'loadWorldOpportunities'],
      evidenceUsed: [worldVector.today.observation.source_snapshot_id ?? 'world_vector_today'].filter(Boolean),
      confidence: worldVector.today.observation.confidence,
    }),
  };
}

export async function runMophAgent(input: MophAgentInput): Promise<MophAgentOutput> {
  const fullText = [input.stuckSystem, input.objective, input.attempts, input.evidence, input.consequence].filter(Boolean).join('\n');
  const risk = riskFromText(fullText);
  const [amv, graph] = await Promise.all([
    readAmvOperationalMemory({ query: fullText, limit: 8 }),
    runNeuralGraphAgent({ query: fullText, filters: ['moph', 'evidence', 'amv', 'prediction'] }),
  ]);
  const evidenceCount = graph.evidence.length + amv.items.length + (input.evidence ? 1 : 0);
  const fallback = [
    `Lectura: el sistema atorado describe una friccion operativa con ${evidenceCount ? 'evidencia declarada o memoria relacionada' : 'evidencia insuficiente'}.`,
    `Ruptura probable: el objetivo y los intentos previos no tienen una ventana minima de verificacion clara.`,
    `Perturbacion minima: durante 72 horas ejecuta una sola accion reversible, registra evento/resultado/efecto y no cambies mas de una variable.`,
  ].join('\n');
  const llm = await runLlmTask({
    task: 'moph_reading',
    prompt: JSON.stringify({ input, amv: amv.items.slice(0, 5), graphEvidence: graph.evidence.slice(0, 5) }),
    fallbackResult: fallback,
    maxTokens: 650,
  });
  const confidence = Math.min(0.82, 0.32 + evidenceCount * 0.08 + (llm.ok ? 0.12 : 0));
  const fit = fitFromEvidence(evidenceCount, risk);
  return {
    ok: true,
    friction_reading: llm.result.split('\n')[0] ?? fallback,
    conversion_break: 'La conversion se rompe cuando el sistema acumula intentos sin una prueba minima, reversible y trazable.',
    minimal_perturbation: 'Elegir una accion reversible de 72 horas, registrar evidencia antes/despues y cerrar con una decision unica.',
    next_action: fit === 'high' ? 'Solicitar SFI-DR01 con evidencia inicial.' : 'Completar una observacion MOP-H adicional antes de pedir diagnostico.',
    risk,
    sfi_dr01_fit: fit,
    confidence,
    user_friendly_explanation: llm.result,
    persistence_status: input.accountId ? 'account_available' : amv.status === 'local_fallback' ? 'local_fallback' : 'not_persisted',
    twin: {
      available: Boolean(input.accountId),
      status: input.accountId ? 'user_twin_ready_for_account_history' : 'preview_only_no_account',
      summary: input.accountId ? 'User twin can connect this reading to account history.' : 'Sin cuenta, la lectura queda como preview local y no como historial persistido.',
    },
    provider: `${llm.provider}:${llm.model}`,
    warnings: unique([...llm.warnings, ...amv.warnings, ...graph.warnings]),
    trace: createTrace({
      prefix: 'moph',
      sourceInputs: [input.stuckSystem, input.objective ?? '', input.evidence ?? ''],
      toolsUsed: ['MophAgent', 'AMVAgent', 'NeuralGraphAgent', 'LLMProviderRouter'],
      providerUsed: `${llm.provider}:${llm.model}`,
      graphNodesUsed: graph.nodes.map((node) => node.id),
      evidenceUsed: graph.evidence.map((item) => item.id),
      confidence,
      persistence: input.accountId ? 'persisted' : 'not_persisted',
    }),
  };
}

export async function runPredictionAgent(input: { signal: string; entity?: string; evidence?: string[]; clientProfile?: string | null }): Promise<PredictionAgentOutput> {
  const graph = await runNeuralGraphAgent({ query: [input.signal, input.entity, input.clientProfile].filter(Boolean).join(' '), filters: ['evidence', 'prediction', 'amv', 'world_vector', 'prospect'] });
  const amv = await readAmvOperationalMemory({ query: input.signal, limit: 8 });
  const evidenceBasis = unique([...(input.evidence ?? []), ...graph.evidence.map((item) => item.id), ...amv.items.map((item) => item.id)]).slice(0, 12);
  const strength = Math.min(1, 0.22 + evidenceBasis.length * 0.055 + graph.nodes.length * 0.02);
  const probabilities = {
    p_relevant: number01(strength + 0.16),
    p_contactable: number01(input.entity ? 0.52 + strength * 0.2 : 0.18),
    p_response: number01(input.entity ? 0.18 + strength * 0.18 : 0.08),
    p_meeting: number01(input.entity ? 0.12 + strength * 0.16 : 0.05),
    p_paid_diagnostic: number01(0.08 + strength * 0.15),
    p_case_value: number01(0.16 + strength * 0.28),
    p_content_value: number01(0.28 + strength * 0.28),
  };
  return {
    hypothesis_id: `HYP-${Date.now().toString(36).toUpperCase()}`,
    prediction: `If ${input.entity ?? 'the observed system'} keeps showing this signal, SFI-DR01 is relevant only after evidence is confirmed and a human approves contact or proposal.`,
    probabilities,
    confidence: strength,
    evidence_basis: evidenceBasis,
    uncertainty: [
      evidenceBasis.length < 2 ? 'evidence_basis_thin' : '',
      input.entity ? '' : 'entity_missing_for_client_prediction',
      graph.missing_context.join(', '),
    ].filter(Boolean),
    next_action: input.entity ? 'Queue IFNORM and contact draft for human approval.' : 'Collect company/person/source before converting to prospect.',
    trace: createTrace({
      prefix: 'prediction',
      sourceInputs: [input.signal, input.entity ?? ''],
      toolsUsed: ['PredictionAgent', 'NeuralGraphAgent', 'AMVAgent'],
      graphNodesUsed: graph.nodes.map((node) => node.id),
      evidenceUsed: evidenceBasis,
      confidence: strength,
    }),
  };
}

export async function runClientFinderAgent(input: {
  entityName?: string;
  personOrRole?: string;
  sector?: string;
  publicSignal?: string;
  source?: string;
  notes?: string;
}): Promise<{ ok: boolean; ifnorm: IfnormReport; graph: NeuralGraphAgentResult; warnings: string[] }> {
  const entity = text(input.entityName, '');
  const signal = text(input.publicSignal ?? input.notes, '');
  const source = text(input.source, 'manual_input');
  const query = [entity, input.personOrRole, input.sector, signal].filter(Boolean).join(' ');
  const [graph, amv, prediction] = await Promise.all([
    runNeuralGraphAgent({ query: query || 'client finder opportunity', filters: ['prospect', 'evidence', 'world_vector', 'amv', 'prediction'] }),
    readAmvOperationalMemory({ query: query || null, limit: 8 }),
    runPredictionAgent({ signal: signal || entity || 'manual prospect signal', entity: entity || undefined, clientProfile: input.sector ?? null }),
  ]);
  const evidence = unique([
    ...graph.evidence.map((item) => `${item.source}:${item.summary}`),
    ...amv.items.map((item) => `${item.source}:${item.summary}`),
    ...(signal ? [`manual_signal:${signal}`] : []),
  ]).slice(0, 10);
  const hasRealEntity = Boolean(entity);
  const hasEvidence = evidence.length > 0 && Boolean(signal || graph.evidence.length || amv.items.length);
  const sourceBlob = [entity, signal, input.sector, input.notes, evidence.join(' ')].join(' ');
  const offer = hasEvidence ? offerFor(sourceBlob) : 'monitor';
  const risk = riskFromText(sourceBlob);
  const llm = await runLlmTask({
    task: 'ifnorm',
    prompt: JSON.stringify({ input, evidence: evidence.slice(0, 6), prediction }),
    fallbackResult: hasRealEntity && hasEvidence
      ? `Mensaje humano sugerido: Vi una senal publica que podria indicar friccion sistemica. Si tiene sentido, puedo preparar una lectura SFI-DR01 basada en evidencia y sin automatizar contacto.`
      : 'Modo manual: agrega compania/persona y evidencia publica o texto observado antes de convertir esto en prospecto real.',
    maxTokens: 550,
  });
  const ifnorm: IfnormReport = {
    entity_name: entity || 'manual_entity_required',
    person_or_role: text(input.personOrRole, 'role_required'),
    sector: text(input.sector, 'sector_unknown'),
    source,
    public_signal: signal || 'manual_public_signal_required',
    detected_pain: hasEvidence ? 'Friccion visible entre senal publica, capacidad operativa y ruta de decision.' : 'No se declara dolor verificable todavia.',
    evidence,
    sfi_interpretation: hasEvidence ? 'La oportunidad solo avanza como hipotesis trazable; requiere aprobacion humana antes de contacto.' : 'Modo manual/degraded: no hay evidencia suficiente para afirmar oportunidad real.',
    hypothesis: prediction.prediction,
    prediction: JSON.stringify(prediction.probabilities),
    recommended_offer: offer,
    why_sfi_fits: offer === 'monitor' ? 'Primero hay que observar evidencia comparable.' : `${offer} encaja si el dolor se confirma con evidencia directa y una perturbacion minima.`,
    linking_strategy: hasRealEntity && hasEvidence ? 'Relacionar evidencia -> graph -> AMV -> prediccion -> draft humano en approval queue.' : 'Pegar URL/texto publico o importar CSV antes de vincular.',
    suggested_human_message: llm.result,
    p_response: prediction.probabilities.p_response,
    p_meeting: prediction.probabilities.p_meeting,
    p_paid_diagnostic: prediction.probabilities.p_paid_diagnostic,
    p_case_value: prediction.probabilities.p_case_value,
    p_content_value: prediction.probabilities.p_content_value,
    risk,
    recommended_action: hasRealEntity && hasEvidence ? 'queue_contact_draft_for_human_approval' : 'manual_evidence_required',
    status: hasRealEntity && hasEvidence ? 'queued_for_approval' : 'manual_evidence_required',
    trace: createTrace({
      prefix: 'ifnorm',
      sourceInputs: [entity, signal, source],
      toolsUsed: ['ClientFinderAgent', 'WorldVector', 'NeuralGraphAgent', 'AMVAgent', 'PredictionAgent', 'LLMProviderRouter'],
      providerUsed: `${llm.provider}:${llm.model}`,
      graphNodesUsed: graph.nodes.map((node) => node.id),
      evidenceUsed: evidence,
      confidence: hasEvidence ? prediction.confidence : 0.22,
    }),
  };
  return { ok: true, ifnorm, graph, warnings: unique([...graph.warnings, ...amv.warnings, ...llm.warnings]) };
}

export async function runCognitiveTwinAgent(input: { mode: 'founder' | 'user' | 'client'; context?: string }) {
  const graph = await runNeuralGraphAgent({ query: input.context || input.mode, filters: ['evidence', 'amv', 'prediction', 'world_vector'] });
  const expansionPressure = textScore('expansion oportunidad publicar construir mas', input.context ?? '') + graph.nodes.length * 0.01;
  const closurePressure = textScore('cerrar aprobar evidencia outcome calibrar', input.context ?? '') + graph.evidence.length * 0.01;
  return {
    mode: input.mode,
    expansion_vs_closure: expansionPressure > closurePressure ? 'expansion_pressure' : 'closure_pressure',
    opportunity_real_vs_symbolic: graph.evidence.length ? 'evidence_backed' : 'symbolic_until_evidence_arrives',
    under_action_signal: graph.related_predictions.length && !graph.related_reports.length ? 'prediction_without_report_or_outcome' : 'not_detected',
    single_action: input.mode === 'founder' ? 'Cerrar una accion con evidencia y approval queue; no abrir otro runtime.' : 'Registrar una perturbacion minima y observar retorno.',
    what_not_to_build_today: 'No crear rutas paralelas, no outreach automatico, no publicar sin aprobacion.',
    what_to_close: graph.suggested_actions[0]?.reason ?? 'Completar evidencia faltante.',
    trace: createTrace({
      prefix: 'twin',
      sourceInputs: [input.mode, input.context ?? ''],
      toolsUsed: ['CognitiveTwinAgent', 'NeuralGraphAgent'],
      graphNodesUsed: graph.nodes.map((node) => node.id),
      evidenceUsed: graph.evidence.map((item) => item.id),
      confidence: graph.confidence,
    }),
  };
}

export async function runMomentumAgent(input: { signal: string; company?: string; person?: string; sector?: string; region?: string; source?: string }) {
  const graph = await runNeuralGraphAgent({ query: [input.signal, input.company, input.sector].filter(Boolean).join(' '), filters: ['evidence', 'world_vector', 'amv', 'prospect'] });
  return {
    interpretation: graph.interpretation ?? `Senal recibida: ${input.signal}. Se conserva como hipotesis hasta conectar evidencia directa.`,
    friction_hypothesis: `La friccion probable esta entre senal publica, velocidad de decision y capacidad de convertir evidencia en accion.`,
    opportunity: input.company ? `Preparar IFNORM para ${input.company}.` : 'Falta compania/persona para prospecto real.',
    evidence: graph.evidence.slice(0, 8),
    suggested_search_queries: [
      [input.company, input.signal, 'operational friction'].filter(Boolean).join(' '),
      [input.sector, input.region, 'market pressure'].filter(Boolean).join(' '),
    ].filter(Boolean),
    suggested_sources_to_inspect: ['public company pages', 'official posts', 'public filings/news already permitted', 'manual pasted evidence'],
    recommended_next_action: input.company ? 'create IFNORM draft for approval queue' : 'collect entity/person/source before IFNORM',
    trace: graph.trace,
  };
}

export async function runCalibrationAgent(input: { prediction: PredictionAgentOutput; outcome: string }) {
  const outcomeScore = /(met|respondio|meeting|paid|cerrado|positivo|observed)/i.test(input.outcome) ? 1 : /(failed|no|rechaz|blocked|fallo)/i.test(input.outcome) ? 0 : 0.5;
  const predicted = input.prediction.probabilities.p_response;
  const gap = Number(Math.abs(outcomeScore - predicted).toFixed(3));
  return {
    calibration_gap: gap,
    what_was_wrong: gap > 0.3 ? 'La probabilidad previa estaba desalineada con el retorno observado.' : 'No hay desviacion fuerte.',
    what_was_right: input.prediction.evidence_basis.length ? 'La prediccion tenia base de evidencia trazable.' : 'La incertidumbre estaba correctamente marcada.',
    weight_update: gap > 0.3 ? 'reduce_probability_weight_until_more_outcomes' : 'keep_weight',
    future_rule_adjustment: 'Registrar outcome antes de reutilizar este patron en Client Finder.',
    graph_update_proposal: 'Agregar edge prediction -> outcome en approval queue.',
    amv_update_proposal: 'Guardar recurrence/outcome como memoria AMV tras aprobacion.',
  };
}

export async function runReportAgent(input: { type: ReportType; subject?: string; ifnorm?: IfnormReport | null }): Promise<ReportAgentOutput> {
  const [world, graph, amv] = await Promise.all([
    buildWorldVectorOperationalState(),
    runNeuralGraphAgent({ query: input.subject ?? input.type, filters: ['evidence', 'report', 'prediction', 'amv', 'world_vector'] }),
    readAmvOperationalMemory({ query: input.subject ?? null, limit: 10 }),
  ]);
  const evidence = unique([
    ...graph.evidence.map((item) => item.id),
    ...amv.items.map((item) => item.id),
    world.today.observation.source_snapshot_id ?? 'world_vector_today',
    ...(input.ifnorm?.evidence ?? []),
  ]).slice(0, 14);
  const baseBody = [
    `Reporte: ${input.type}`,
    `Sujeto: ${input.subject ?? input.ifnorm?.entity_name ?? 'SFI'}`,
    `World Vector: ${world.today.observation.interpretation}`,
    `Evidencia: ${evidence.join(' | ') || 'evidence_required'}`,
    `Accion: queda en approval queue. No publica ni contacta automaticamente.`,
  ].join('\n');
  const llm = await runLlmTask({
    task: input.type.includes('draft') || input.type === 'linkedin_draft' || input.type === 'contact_draft' ? 'draft' : 'report',
    prompt: JSON.stringify({ type: input.type, subject: input.subject, world: world.reports.internal, graph: graph.evidence.slice(0, 8), amv: amv.recurrent_patterns, ifnorm: input.ifnorm }),
    fallbackResult: baseBody,
    maxTokens: 900,
  });
  return {
    ok: true,
    type: input.type,
    title: `${input.type.replace(/_/g, ' ')} - ${input.subject ?? input.ifnorm?.entity_name ?? 'SFI'}`,
    body: llm.result,
    evidence,
    approval_queue: {
      action: input.type.includes('draft') ? 'publish_or_contact_draft_review' : 'report_review',
      reason: 'All external publication/contact requires human approval.',
      evidence,
      risk: input.type === 'contact_draft' || input.type === 'linkedin_draft' ? 'medium' : 'low',
      expected_outcome: 'Human reviews, edits and approves or rejects.',
      approval_required: true,
      status: 'queued_for_approval',
    },
    provider: `${llm.provider}:${llm.model}`,
    warnings: unique([...llm.warnings, ...graph.warnings, ...amv.warnings]),
    trace: createTrace({
      prefix: 'report',
      sourceInputs: [input.type, input.subject ?? ''],
      toolsUsed: ['ReportAgent', 'WorldVector', 'NeuralGraphAgent', 'AMVAgent', 'LLMProviderRouter'],
      providerUsed: `${llm.provider}:${llm.model}`,
      graphNodesUsed: graph.nodes.map((node) => node.id),
      evidenceUsed: evidence,
      confidence: evidence.length ? 0.62 : 0.28,
    }),
  };
}

export async function buildAgenticRootState() {
  const [providers, worldVectorAgent, graph, amv, predictionHealth, predictions, twin] = await Promise.all([
    Promise.resolve(getLlmProviderStatus()),
    runWorldVectorAgent(),
    runNeuralGraphAgent({ query: 'latest SFI operating opportunities', filters: ['evidence', 'signal', 'prediction', 'world_vector', 'amv', 'prospect', 'report'] }),
    readAmvOperationalMemory({ limit: 16 }),
    getPredictionRegistryHealth(),
    listPredictionEntries({ limit: 12 }).catch((error) => ({ ok: false as const, error: error instanceof Error ? error.message : 'prediction_list_failed' })),
    runCognitiveTwinAgent({ mode: 'founder', context: 'root console founder operations client finder prediction registry reports' }),
  ]);

  const predictionEntries = predictions.ok ? predictions.data.entries : [];
  return {
    ok: true,
    generated_at: nowIso(),
    providers,
    worldVectorAgent,
    neuralGraph: graph,
    amv,
    predictionRegistry: {
      health: predictionHealth,
      entries: predictionEntries,
      degraded: !predictionHealth.ok,
    },
    clientFinder: {
      status: 'manual_input_ready',
      rule: 'Prospects are real only when manual/public source or internal evidence is present. No automatic contact.',
      table: [] as IfnormReport[],
    },
    reports: {
      available: [
        'world_vector_internal',
        'world_vector_public',
        'ifnorm',
        'sfi_dr01',
        'neural_graph_evidence',
        'amv_recurrence',
        'calibration',
        'atlas_entry',
        'linkedin_draft',
        'contact_draft',
      ] satisfies ReportType[],
      approval_required: true,
    },
    cognitiveTwin: twin,
    executionQueue: [
      {
        action: 'review_agentic_outputs',
        reason: 'Agent outputs are proposals only.',
        evidence: graph.evidence.slice(0, 4).map((item) => item.id),
        risk: 'medium',
        expected_outcome: 'Founder approves, rejects, or requests evidence.',
        approval_required: true,
        status: 'queued_for_approval',
      } satisfies AgenticAction,
    ],
    systemHealth: {
      llmProvidersAvailable: providers.filter((item) => item.available).length,
      graphStatus: graph.missing_context.length ? 'degraded' : 'operational',
      amvStatus: amv.status,
      predictionStatus: predictionHealth.ok ? 'operational' : 'degraded',
      warnings: unique([...graph.warnings, ...amv.warnings, ...predictionHealth.warnings]),
    },
  };
}

export type AgenticRootState = Awaited<ReturnType<typeof buildAgenticRootState>>;
