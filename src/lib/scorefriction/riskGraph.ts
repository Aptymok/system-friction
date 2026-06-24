import { readVisibleLogbookEntries } from '@/lib/logbook/query';
import { buildRootNeuralGraphLive } from '@/lib/root/neuralGraphLive';
import { runRootSelfObservability } from '@/lib/root/selfObservability';
import { buildOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import { generateSfiOperationalResponse } from '@/lib/sfi/responseEngine';
import { readOperationalConsoleState } from '@/lib/sfi/operationalConsole';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type ScoreFrictionRiskNode = {
  id: string;
  label: string;
  kind:
    | 'world_vector'
    | 'sfi_response'
    | 'proposal'
    | 'evidence'
    | 'execution'
    | 'outcome'
    | 'lesson'
    | 'degraded_source'
    | 'operational_regime';
  source: string;
  confidence: number;
  evidence_count: number;
  friction_score: number;
  persistence_score: number;
  degradation_score: number;
  coupling_score: number;
  propagation_velocity: number;
  evidence_gap: number;
  emergence_risk: number;
  risk_status: 'watch_only' | 'evidence_required' | 'actionable_candidate';
  recommended_action:
    | 'observe'
    | 'request_evidence'
    | 'reformulate'
    | 'prepare_execution'
    | 'execute_only_if_aligned'
    | 'close_obsolete';
  raw?: Record<string, unknown>;
};

export type ScoreFrictionRiskEdge = {
  id: string;
  from: string;
  to: string;
  relation:
    | 'depends_on'
    | 'evidence_for'
    | 'propagates_to'
    | 'blocks'
    | 'aligns_with'
    | 'derived_from';
  weight: number;
  confidence: number;
};

type DegradedSource = { source: string; error: string };
type Factors = {
  friction_score: number;
  coupling_score: number;
  propagation_velocity: number;
  evidence_gap: number;
  persistence_score: number;
};

type SourceBundle = {
  sfiState?: Awaited<ReturnType<typeof readOperationalConsoleState>>;
  sfiResponse?: Awaited<ReturnType<typeof generateSfiOperationalResponse>>;
  executionState?: Record<string, unknown>;
};

const DEFAULT_CASE_ID = 'SFI-OPS-001';

export function clamp01(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

export function rows(input: unknown): Record<string, unknown>[] {
  return Array.isArray(input) ? input.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

export function record(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

export function text(input: unknown, fallback = ''): string {
  return typeof input === 'string' && input.trim() ? input.trim() : fallback;
}

export function computeEmergenceRisk(factors: Factors): number {
  return Number((
    clamp01(factors.friction_score) *
    clamp01(factors.coupling_score) *
    clamp01(factors.propagation_velocity) *
    clamp01(factors.evidence_gap) *
    clamp01(factors.persistence_score)
  ).toFixed(4));
}

export function classifyRiskStatus(node: Pick<ScoreFrictionRiskNode, 'evidence_count' | 'emergence_risk' | 'confidence'>): ScoreFrictionRiskNode['risk_status'] {
  if (node.evidence_count <= 0) return 'watch_only';
  if (node.confidence < 0.45) return 'evidence_required';
  if (node.emergence_risk >= 0.35) return 'actionable_candidate';
  return 'watch_only';
}

export function safeRecommendedAction(input: {
  nodeKind: ScoreFrictionRiskNode['kind'];
  evidenceCount: number;
  hasActiveAttractor: boolean;
  hasAlignment: boolean;
  hasVerificationWindow: boolean;
  responseDecision?: string;
  degraded: boolean;
}): ScoreFrictionRiskNode['recommended_action'] {
  if (input.evidenceCount <= 0) return 'request_evidence';
  if (!input.hasActiveAttractor || input.responseDecision === 'request_attractor') return 'observe';
  if (input.responseDecision === 'align' && input.nodeKind === 'proposal') return 'execute_only_if_aligned';
  if (input.degraded && input.evidenceCount < 2) return 'observe';
  if (
    input.responseDecision === 'prepare_execution' &&
    input.hasActiveAttractor &&
    input.hasAlignment &&
    input.hasVerificationWindow &&
    input.evidenceCount > 0
  ) return 'prepare_execution';
  if (input.nodeKind === 'proposal') return input.hasAlignment ? 'reformulate' : 'request_evidence';
  return 'observe';
}

async function safeRead<T>(source: string, reader: () => Promise<T>, degraded: DegradedSource[]): Promise<T | null> {
  try {
    return await reader();
  } catch (error) {
    degraded.push({ source, error: error instanceof Error ? error.message : `${source}_failed` });
    return null;
  }
}

async function readExecutionState(caseId: string) {
  const supabase = createServiceSupabaseClient();
  const [ledgerEntries, outcomes, lessons] = await Promise.all([
    supabase.from('sfi_execution_ledger').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
    supabase.from('sfi_outcomes').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
    supabase.from('sfi_lessons').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
  ]);

  const firstError = ledgerEntries.error ?? outcomes.error ?? lessons.error;
  if (firstError) throw firstError;

  return {
    ok: true,
    ledgerEntries: ledgerEntries.data ?? [],
    outcomes: outcomes.data ?? [],
    lessons: lessons.data ?? [],
  };
}

function rowId(row: Record<string, unknown>, fallback: string) {
  return text(row.id, text(row.proposal_id, text(row.execution_id, fallback))).replace(/[^a-zA-Z0-9_.:-]/g, '-');
}

function makeNode(input: Omit<ScoreFrictionRiskNode, 'emergence_risk' | 'risk_status'>): ScoreFrictionRiskNode {
  const { raw: _raw, ...nodeInput } = input;
  const factors = {
    friction_score: nodeInput.friction_score,
    coupling_score: nodeInput.coupling_score,
    propagation_velocity: nodeInput.propagation_velocity,
    evidence_gap: nodeInput.evidence_gap,
    persistence_score: nodeInput.persistence_score,
  };
  const emergence_risk = computeEmergenceRisk(factors);
  return {
    ...nodeInput,
    friction_score: clamp01(nodeInput.friction_score),
    persistence_score: clamp01(nodeInput.persistence_score),
    degradation_score: clamp01(nodeInput.degradation_score),
    coupling_score: clamp01(nodeInput.coupling_score),
    propagation_velocity: clamp01(nodeInput.propagation_velocity),
    evidence_gap: clamp01(nodeInput.evidence_gap),
    confidence: clamp01(nodeInput.confidence),
    emergence_risk,
    risk_status: classifyRiskStatus({ evidence_count: nodeInput.evidence_count, confidence: nodeInput.confidence, emergence_risk }),
  };
}

function buildEdges(nodes: ScoreFrictionRiskNode[]) {
  const edges: ScoreFrictionRiskEdge[] = [];
  const regime = nodes.find((node) => node.kind === 'operational_regime');
  const response = nodes.find((node) => node.kind === 'sfi_response');
  const evidence = nodes.filter((node) => node.kind === 'evidence');

  for (const node of nodes) {
    if (regime && node.id !== regime.id) {
      edges.push({ id: `${regime.id}->${node.id}`, from: regime.id, to: node.id, relation: 'propagates_to', weight: 0.45, confidence: Math.min(regime.confidence, node.confidence) });
    }
    if (response && ['proposal', 'execution', 'outcome', 'lesson'].includes(node.kind)) {
      edges.push({ id: `${node.id}->${response.id}`, from: node.id, to: response.id, relation: 'depends_on', weight: 0.7, confidence: Math.min(response.confidence, node.confidence) });
    }
    for (const evidenceNode of evidence.slice(0, 12)) {
      if (node.kind === 'proposal' || node.kind === 'execution') {
        edges.push({ id: `${evidenceNode.id}->${node.id}`, from: evidenceNode.id, to: node.id, relation: 'evidence_for', weight: 0.55, confidence: Math.min(evidenceNode.confidence, node.confidence) });
      }
    }
  }

  return edges.filter((edge, index, list) => list.findIndex((item) => item.id === edge.id) === index);
}

function addReadResultDegradedSources(sfiState: Awaited<ReturnType<typeof readOperationalConsoleState>> | undefined, degraded: DegradedSource[]) {
  if (!sfiState) return;
  for (const [source, value] of Object.entries(sfiState)) {
    const item = record(value);
    if (item.degraded) degraded.push({ source, error: text(item.error, `${source}_degraded`) });
  }
}

function buildRealNodes(bundle: SourceBundle, degradedSources: DegradedSource[]): ScoreFrictionRiskNode[] {
  const sfiState = bundle.sfiState;
  const response = bundle.sfiResponse;
  const recoveryQueue = rows(record(sfiState?.recoveryQueue).data);
  const alignmentQueue = rows(record(sfiState?.alignmentQueue).data);
  const evidenceMap = rows(record(sfiState?.evidenceMap).data);
  const operationalCycle = record(record(sfiState?.operationalCycle).data);
  const worldSpect = record(record(sfiState?.worldSpect).data);
  const worldSnapshot = record(worldSpect.snapshot);
  const worldVectors = rows(worldSpect.vector_readout).length ? rows(worldSpect.vector_readout) : rows(worldSnapshot.vectors);
  const executionState = record(bundle.executionState);
  const executionRows = rows(executionState.ledgerEntries);
  const outcomeRows = rows(executionState.outcomes);
  const lessonRows = rows(executionState.lessons);
  const hasActiveAttractor = Boolean(response?.evidence.has_active_attractor);
  const hasAlignment = alignmentQueue.length > 0;
  const hasVerificationWindow = executionRows.some((item) => text(record(item.source_payload).verification_window));
  const degraded = degradedSources.length > 0;
  const evidenceCount = evidenceMap.length;
  const nodes: ScoreFrictionRiskNode[] = [];

  if (Object.keys(operationalCycle).length > 0) {
    nodes.push(makeNode({
      id: 'sfi-operational-regime',
      label: text(operationalCycle.operational_regime, text(operationalCycle.regime, 'operational regime')),
      kind: 'operational_regime',
      source: 'vw_sfi_operational_cycle',
      confidence: 0.72,
      evidence_count: evidenceCount,
      friction_score: clamp01(operationalCycle.friction_score, clamp01(operationalCycle.pipeline_loss_ratio, 0.35)),
      persistence_score: clamp01(operationalCycle.persistence_score, 0.45),
      degradation_score: clamp01(operationalCycle.degradation_score, degraded ? 0.55 : 0.2),
      coupling_score: clamp01(operationalCycle.coupling_score, recoveryQueue.length || alignmentQueue.length ? 0.62 : 0.3),
      propagation_velocity: clamp01(operationalCycle.signal_ratio, 0.35),
      evidence_gap: evidenceCount > 0 ? 0.25 : 0.9,
      recommended_action: safeRecommendedAction({ nodeKind: 'operational_regime', evidenceCount, hasActiveAttractor, hasAlignment, hasVerificationWindow, responseDecision: response?.decision, degraded }),
      raw: operationalCycle,
    }));
  }

  if (response) {
    const responseEvidenceCount = response.evidence.evidence_map_count;
    nodes.push(makeNode({
      id: 'sfi-response',
      label: response.decision,
      kind: 'sfi_response',
      source: '/api/sfi/respond',
      confidence: response.confidence,
      evidence_count: responseEvidenceCount,
      friction_score: response.priority === 'critical' ? 0.9 : response.priority === 'high' ? 0.72 : 0.42,
      persistence_score: 0.55,
      degradation_score: response.evidence.degraded.length ? 0.75 : 0.2,
      coupling_score: response.evidence.recovery_queue_count || response.evidence.alignment_queue_count ? 0.7 : 0.35,
      propagation_velocity: response.decision === 'prepare_execution' ? 0.7 : 0.35,
      evidence_gap: responseEvidenceCount > 0 ? 0.25 : 0.9,
      recommended_action: safeRecommendedAction({ nodeKind: 'sfi_response', evidenceCount: responseEvidenceCount, hasActiveAttractor, hasAlignment, hasVerificationWindow, responseDecision: response.decision, degraded }),
      raw: response,
    }));
  }

  worldVectors.forEach((vector, index) => {
    const sourceEvidenceCount = rows(record(vector).source_details).length || Number(vector.source_count ?? 0) || 0;
    const nodeEvidenceCount = Number.isFinite(sourceEvidenceCount) ? Number(sourceEvidenceCount) : 0;
    nodes.push(makeNode({
      id: `world-vector-${rowId(vector, String(index))}`,
      label: text(vector.domain, text(vector.label, `world vector ${index + 1}`)),
      kind: 'world_vector',
      source: 'vw_worldspect_real',
      confidence: clamp01(vector.trust, 0.45),
      evidence_count: nodeEvidenceCount,
      friction_score: clamp01(vector.value, 0.35),
      persistence_score: clamp01(vector.persistence, 0.35),
      degradation_score: clamp01(vector.degradation, 0.35),
      coupling_score: clamp01(vector.coupling_score, 0.35),
      propagation_velocity: clamp01(vector.velocity, clamp01(vector.delta, 0.3)),
      evidence_gap: nodeEvidenceCount > 0 ? 0.2 : 0.85,
      recommended_action: safeRecommendedAction({ nodeKind: 'world_vector', evidenceCount: nodeEvidenceCount, hasActiveAttractor, hasAlignment, hasVerificationWindow, responseDecision: response?.decision, degraded }),
      raw: vector,
    }));
  });

  recoveryQueue.forEach((proposal, index) => {
    nodes.push(makeNode({
      id: `proposal-${rowId(proposal, String(index))}`,
      label: text(proposal.title, text(proposal.proposal_title, `proposal ${index + 1}`)),
      kind: 'proposal',
      source: 'vw_sfi_execution_recovery_queue',
      confidence: evidenceCount > 0 ? 0.58 : 0.34,
      evidence_count: evidenceCount,
      friction_score: 0.72,
      persistence_score: 0.52,
      degradation_score: degraded ? 0.65 : 0.22,
      coupling_score: hasAlignment ? 0.72 : 0.45,
      propagation_velocity: 0.62,
      evidence_gap: evidenceCount > 0 ? 0.25 : 0.95,
      recommended_action: safeRecommendedAction({ nodeKind: 'proposal', evidenceCount, hasActiveAttractor, hasAlignment, hasVerificationWindow, responseDecision: response?.decision, degraded }),
      raw: proposal,
    }));
  });

  alignmentQueue.forEach((alignment, index) => {
    nodes.push(makeNode({
      id: `proposal-${rowId(alignment, String(index))}-alignment`,
      label: text(alignment.proposal_title, text(alignment.recommended_status, `alignment ${index + 1}`)),
      kind: 'proposal',
      source: 'vw_sfi_attractor_alignment_queue',
      confidence: clamp01(alignment.alignment_score, 0.5),
      evidence_count: evidenceCount,
      friction_score: clamp01(alignment.risk_score, 0.45),
      persistence_score: 0.45,
      degradation_score: degraded ? 0.55 : 0.15,
      coupling_score: clamp01(alignment.alignment_score, 0.55),
      propagation_velocity: 0.48,
      evidence_gap: evidenceCount > 0 ? 0.2 : 0.9,
      recommended_action: safeRecommendedAction({ nodeKind: 'proposal', evidenceCount, hasActiveAttractor, hasAlignment: true, hasVerificationWindow, responseDecision: response?.decision, degraded }),
      raw: alignment,
    }));
  });

  evidenceMap.forEach((evidence, index) => {
    nodes.push(makeNode({
      id: `evidence-${rowId(evidence, String(index))}`,
      label: text(evidence.title, text(evidence.evidence_ref, `evidence ${index + 1}`)),
      kind: 'evidence',
      source: 'vw_sfi_evidence_map',
      confidence: clamp01(evidence.trust, 0.62),
      evidence_count: 1,
      friction_score: 0.32,
      persistence_score: 0.42,
      degradation_score: degraded ? 0.45 : 0.1,
      coupling_score: 0.5,
      propagation_velocity: 0.25,
      evidence_gap: 0.05,
      recommended_action: 'observe',
      raw: evidence,
    }));
  });

  executionRows.forEach((execution, index) => {
    const sourcePayload = record(execution.source_payload);
    const hasWindow = Boolean(text(sourcePayload.verification_window));
    nodes.push(makeNode({
      id: `execution-${rowId(execution, String(index))}`,
      label: text(sourcePayload.objective, text(execution.execution_status, `execution ${index + 1}`)),
      kind: 'execution',
      source: '/api/scorefriction/execution-state',
      confidence: hasWindow ? 0.62 : 0.38,
      evidence_count: hasWindow ? 1 : 0,
      friction_score: 0.55,
      persistence_score: 0.46,
      degradation_score: degraded ? 0.55 : 0.15,
      coupling_score: 0.58,
      propagation_velocity: 0.42,
      evidence_gap: hasWindow ? 0.2 : 0.85,
      recommended_action: safeRecommendedAction({ nodeKind: 'execution', evidenceCount: hasWindow ? 1 : 0, hasActiveAttractor, hasAlignment, hasVerificationWindow: hasWindow, responseDecision: response?.decision, degraded }),
      raw: execution,
    }));
  });

  outcomeRows.forEach((outcome, index) => {
    nodes.push(makeNode({
      id: `outcome-${rowId(outcome, String(index))}`,
      label: text(outcome.outcome_status, `outcome ${index + 1}`),
      kind: 'outcome',
      source: '/api/scorefriction/execution-state',
      confidence: 0.58,
      evidence_count: text(outcome.evidence) ? 1 : 0,
      friction_score: 0.38,
      persistence_score: 0.45,
      degradation_score: degraded ? 0.45 : 0.12,
      coupling_score: 0.46,
      propagation_velocity: 0.25,
      evidence_gap: text(outcome.evidence) ? 0.15 : 0.8,
      recommended_action: text(outcome.evidence) ? 'observe' : 'request_evidence',
      raw: outcome,
    }));
  });

  lessonRows.forEach((lesson, index) => {
    nodes.push(makeNode({
      id: `lesson-${rowId(lesson, String(index))}`,
      label: text(lesson.lesson, `lesson ${index + 1}`),
      kind: 'lesson',
      source: '/api/scorefriction/execution-state',
      confidence: 0.52,
      evidence_count: 1,
      friction_score: 0.25,
      persistence_score: 0.4,
      degradation_score: degraded ? 0.35 : 0.1,
      coupling_score: 0.4,
      propagation_velocity: 0.2,
      evidence_gap: 0.1,
      recommended_action: 'observe',
      raw: lesson,
    }));
  });

  if (nodes.length > 0) {
    degradedSources.forEach((item, index) => {
      nodes.push(makeNode({
        id: `degraded-source-${rowId(item, String(index))}`,
        label: item.source,
        kind: 'degraded_source',
        source: item.source,
        confidence: 0.2,
        evidence_count: 0,
        friction_score: 0.5,
        persistence_score: 0.35,
        degradation_score: 1,
        coupling_score: 0.25,
        propagation_velocity: 0.2,
        evidence_gap: 1,
        recommended_action: 'observe',
        raw: item,
      }));
    });
  }

  return nodes;
}

export async function buildScoreFrictionRiskGraph(input: {
  caseId?: string;
} = {}): Promise<{
  ok: boolean;
  generated_at: string;
  source: 'scorefriction_risk_graph';
  case_id: string;
  degraded: boolean;
  degraded_sources: Array<{
    source: string;
    error: string;
  }>;
  nodes: ScoreFrictionRiskNode[];
  edges: ScoreFrictionRiskEdge[];
}> {
  const caseId = text(input.caseId, DEFAULT_CASE_ID);
  const degradedSources: DegradedSource[] = [];

  const [sfiState, sfiResponse, executionState] = await Promise.all([
    safeRead('sfi_operational_state', readOperationalConsoleState, degradedSources),
    safeRead('sfi_response', generateSfiOperationalResponse, degradedSources),
    safeRead('scorefriction_execution_state', () => readExecutionState(caseId), degradedSources),
    safeRead('root_neural_graph_live', () => buildRootNeuralGraphLive(caseId), degradedSources),
    safeRead('root_self_observability', runRootSelfObservability, degradedSources),
    safeRead('logbook_visible', () => readVisibleLogbookEntries({ role: 'system', email: process.env.SYSTEM_ROOT_EMAIL ?? 'aptymok' }, { case_id: caseId }), degradedSources),
    safeRead('scorefriction_operational_cycle', () => buildOperationalCycle({ case_id: caseId, scope: 'culture', analysis_modes: ['MIHM', 'PSI', 'WORLDSPECT', 'SCOREFRICTION', 'AMV'] }), degradedSources),
  ]);

  addReadResultDegradedSources(sfiState ?? undefined, degradedSources);

  const nodes = buildRealNodes({
    sfiState: sfiState ?? undefined,
    sfiResponse: sfiResponse ?? undefined,
    executionState: executionState ?? undefined,
  }, degradedSources);
  const edges = buildEdges(nodes);
  const allPrimarySourcesFailed = !sfiState && !sfiResponse && !executionState;

  if (allPrimarySourcesFailed) {
    return {
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'scorefriction_risk_graph',
      case_id: caseId,
      degraded: true,
      degraded_sources: degradedSources,
      nodes: [],
      edges: [],
    };
  }

  return {
    ok: nodes.length > 0,
    generated_at: new Date().toISOString(),
    source: 'scorefriction_risk_graph',
    case_id: caseId,
    degraded: degradedSources.length > 0,
    degraded_sources: degradedSources,
    nodes,
    edges,
  };
}
