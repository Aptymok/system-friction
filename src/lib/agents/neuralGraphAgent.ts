import 'server-only';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readRootNeuralGraphRuntime } from '@/lib/root/neuralGraphRuntime';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';
import { loadWorldOpportunities } from '@/lib/worldspect/opportunities';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readAmvOperationalMemory } from './amvAgent';
import { compactText, createTrace, text, textScore, tokenize, unique, type AgentTrace } from './utils';

export type NeuralGraphFilter =
  | 'evidence'
  | 'signal'
  | 'prospect'
  | 'hypothesis'
  | 'prediction'
  | 'outcome'
  | 'report'
  | 'atlas'
  | 'moph'
  | 'world_vector'
  | 'amv';

export type NeuralGraphConnectionKind = 'direct_evidence' | 'inferred_connection' | 'weak_signal';

export type NeuralGraphSearchNode = {
  id: string;
  label: string;
  type: string;
  source: string;
  summary: string;
  connection: NeuralGraphConnectionKind;
  confidence: number;
};

export type NeuralGraphSearchEdge = {
  from: string;
  to: string;
  relation: string;
  connection: NeuralGraphConnectionKind;
  basis: string;
  strength: number;
};

export type NeuralGraphEvidence = {
  id: string;
  source: string;
  summary: string;
  evidence_ref: string | null;
  connection: NeuralGraphConnectionKind;
  confidence: number;
};

export type NeuralGraphAgentResult = {
  ok: boolean;
  query: string;
  filters: NeuralGraphFilter[];
  nodes: NeuralGraphSearchNode[];
  edges: NeuralGraphSearchEdge[];
  evidence: NeuralGraphEvidence[];
  trace: AgentTrace;
  related_predictions: NeuralGraphEvidence[];
  related_reports: NeuralGraphEvidence[];
  suggested_actions: Array<{ action: string; reason: string; approval_required: boolean }>;
  confidence: number;
  missing_context: string[];
  interpretation: string | null;
  warnings: string[];
};

const EVIDENCE_TABLES: Array<{ table: string; filter: NeuralGraphFilter; idKeys: string[]; textKeys: string[] }> = [
  { table: 'sfi_evidence_trace', filter: 'evidence', idKeys: ['id', 'trace_id', 'evidence_id'], textKeys: ['summary', 'source_id', 'evidence_type', 'status'] },
  { table: 'epistemic_events', filter: 'signal', idKeys: ['id', 'event_id'], textKeys: ['title', 'summary', 'event_type', 'source_id'] },
  { table: 'action_proposals', filter: 'hypothesis', idKeys: ['id', 'proposal_id'], textKeys: ['title', 'summary', 'objective', 'status', 'proposal_type'] },
  { table: 'sfi_moph_sessions', filter: 'moph', idKeys: ['id', 'session_key'], textKeys: ['movement_trace_digest', 'public_summary', 'consent_state'] },
  { table: 'sfi_prediction_entries', filter: 'prediction', idKeys: ['id', 'hypothesis_id'], textKeys: ['case_id', 'case_label', 'prediccion_explicita', 'fenotipo_estimado', 'evidence_state', 'estado_observacion'] },
  { table: 'sfi_field_perturbations', filter: 'outcome', idKeys: ['id'], textKeys: ['title', 'summary', 'status', 'result', 'proposal_id'] },
  { table: 'scorefriction_observations', filter: 'evidence', idKeys: ['id', 'observation_id'], textKeys: ['case_id', 'title', 'summary', 'status', 'domain'] },
];

async function readTable(table: string, limit = 18) {
  try {
    const service = createServiceSupabaseClient();
    const ordered = await service.from(table).select('*').order('created_at', { ascending: false }).limit(limit);
    if (!ordered.error) return { rows: (ordered.data ?? []) as Record<string, unknown>[], warning: null as string | null };
    const plain = await service.from(table).select('*').limit(limit);
    if (plain.error) throw plain.error;
    return { rows: (plain.data ?? []) as Record<string, unknown>[], warning: null as string | null };
  } catch (error) {
    return { rows: [], warning: `${table}_read_failed:${error instanceof Error ? error.message : 'unknown'}` };
  }
}

function firstText(row: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (value && typeof value === 'object') {
      const compact = compactText(value, 160);
      if (compact) return compact;
    }
  }
  return fallback;
}

function evidenceFromRow(input: {
  table: string;
  filter: NeuralGraphFilter;
  row: Record<string, unknown>;
  index: number;
  idKeys: string[];
  textKeys: string[];
  query: string;
}): NeuralGraphEvidence {
  const id = firstText(input.row, input.idKeys, `${input.table}_${input.index}`);
  const summary = firstText(input.row, input.textKeys, compactText(input.row, 240));
  const confidenceRaw = input.row.confidence ?? input.row.score ?? input.row.trust ?? input.row.probabilidad_estimativa;
  const confidence = typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : textScore(input.query, summary) || 0.45;
  const status = `${input.row.status ?? input.row.evidence_state ?? input.row.estado_observacion ?? ''}`.toLowerCase();
  const connection: NeuralGraphConnectionKind = confidence < 0.38 || status.includes('pending') || status.includes('uncertain')
    ? 'weak_signal'
    : textScore(input.query, summary) > 0
      ? 'direct_evidence'
      : 'inferred_connection';
  return {
    id: `${input.table}:${id}`,
    source: input.table,
    summary,
    evidence_ref: text(input.row.evidence_hash ?? input.row.source_id ?? input.row.case_id, '') || null,
    connection,
    confidence,
  };
}

function relatedByQuery<T extends { summary: string; confidence: number }>(query: string, values: T[], limit = 12) {
  if (!query.trim()) return values.slice(0, limit);
  return values
    .map((item) => ({ ...item, confidence: Math.max(item.confidence, textScore(query, item.summary)) }))
    .filter((item) => textScore(query, item.summary) > 0 || item.summary.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

function inferEdges(nodes: NeuralGraphSearchNode[], evidence: NeuralGraphEvidence[]): NeuralGraphSearchEdge[] {
  const edges: NeuralGraphSearchEdge[] = [];
  for (const node of nodes) {
    const nodeTokens = new Set(tokenize(`${node.label} ${node.summary}`));
    for (const item of evidence) {
      const shared = tokenize(item.summary).filter((token) => nodeTokens.has(token));
      if (item.evidence_ref && node.summary.includes(item.evidence_ref)) {
        edges.push({ from: node.id, to: item.id, relation: 'cites', connection: 'direct_evidence', basis: item.evidence_ref, strength: 0.86 });
      } else if (shared.length > 0) {
        edges.push({ from: node.id, to: item.id, relation: 'shares_context', connection: item.connection === 'weak_signal' ? 'weak_signal' : 'inferred_connection', basis: unique(shared).slice(0, 4).join(', '), strength: Math.min(0.78, 0.32 + shared.length * 0.1) });
      }
    }
  }
  return edges.sort((a, b) => b.strength - a.strength).slice(0, 32);
}

export async function runNeuralGraphAgent(input: {
  query?: string | null;
  filters?: NeuralGraphFilter[];
  generateInterpretation?: boolean;
} = {}): Promise<NeuralGraphAgentResult> {
  const query = input.query?.trim() || 'latest SFI operational evidence';
  const filters: NeuralGraphFilter[] = input.filters?.length ? input.filters : ['evidence', 'signal', 'prediction', 'world_vector', 'amv'];
  const warnings: string[] = [];

  const [canonical, rootRuntime, worldVector, opportunities, amv, ...tableReads] = await Promise.all([
    readCanonicalGraphState('sfi'),
    readRootNeuralGraphRuntime(),
    buildWorldVectorOperationalState(),
    loadWorldOpportunities(40),
    readAmvOperationalMemory({ query, limit: 16 }),
    ...EVIDENCE_TABLES.map((source) => readTable(source.table)),
  ]);

  if (canonical.degradedReason) warnings.push(canonical.degradedReason);
  if ((opportunities as { ok: boolean }).ok === false) {
    const opportunityState = opportunities as { error?: string; status?: string };
    warnings.push(opportunityState.error ?? opportunityState.status ?? 'world_opportunities_unavailable');
  }
  warnings.push(...amv.warnings);
  tableReads.forEach((read) => {
    if (read.warning) warnings.push(read.warning);
  });

  const graphNodes: NeuralGraphSearchNode[] = canonical.nodes.map((node) => ({
    id: `graph:${node.nodeId}`,
    label: node.label,
    type: node.ontologyType,
    source: node.provenance,
    summary: compactText({ label: node.label, type: node.ontologyType, attributes: node.attributes }, 260),
    connection: 'direct_evidence',
    confidence: canonical.sourceState === 'observed' ? 0.78 : 0.48,
  }));

  const worldNode: NeuralGraphSearchNode = {
    id: 'world_vector:today',
    label: worldVector.today.observation.dominant_signal ?? 'World Vector observation',
    type: 'world_vector',
    source: 'world-vector',
    summary: worldVector.today.observation.interpretation,
    connection: worldVector.today.observation.status === 'observed' ? 'direct_evidence' : 'weak_signal',
    confidence: worldVector.today.observation.confidence,
  };

  const amvNodes: NeuralGraphSearchNode[] = amv.items.slice(0, 8).map((item) => ({
    id: `amv:${item.id}`,
    label: item.summary.slice(0, 82),
    type: 'amv_memory',
    source: item.source,
    summary: item.summary,
    connection: item.trust === 'verified' ? 'direct_evidence' : 'inferred_connection',
    confidence: item.score || 0.52,
  }));

  const evidenceRows = tableReads.flatMap((read, index) => {
    const source = EVIDENCE_TABLES[index];
    if (!filters.includes(source.filter)) return [];
    return read.rows.map((row, rowIndex) => evidenceFromRow({ ...source, row, index: rowIndex, query }));
  });

  const opportunityEvidence: NeuralGraphEvidence[] = opportunities.ok && filters.includes('prospect')
    ? opportunities.opportunities.slice(0, 8).map((item) => ({
      id: `opportunity:${item.id}`,
      source: 'worldspect_opportunities',
      summary: `${item.title}; ${item.explanation}; next=${item.recommended_next_step}`,
      evidence_ref: item.basis.evidence_refs[0] ?? null,
      connection: item.basis.evidence_refs.length ? 'direct_evidence' : 'weak_signal',
      confidence: item.score,
    }))
    : [];

  const reportEvidence: NeuralGraphEvidence[] = filters.includes('report')
    ? [
      {
        id: 'report:world-vector-internal',
        source: 'world-vector',
        summary: worldVector.reports.internal.body,
        evidence_ref: worldVector.today.observation.source_snapshot_id,
        connection: worldVector.today.observation.source_snapshot_id ? 'direct_evidence' : 'weak_signal',
        confidence: worldVector.today.observation.confidence,
      },
      {
        id: 'report:world-vector-public',
        source: 'world-vector',
        summary: worldVector.reports.public.body,
        evidence_ref: worldVector.today.observation.source_snapshot_id,
        connection: worldVector.today.observation.source_snapshot_id ? 'direct_evidence' : 'weak_signal',
        confidence: worldVector.today.observation.confidence,
      },
    ]
    : [];

  const evidence = relatedByQuery(query, [...evidenceRows, ...opportunityEvidence, ...reportEvidence], 30);
  const nodes = relatedByQuery(query, [...graphNodes, worldNode, ...amvNodes], 24);
  const directGraphEdges: NeuralGraphSearchEdge[] = canonical.edges.slice(0, 24).map((edge) => ({
    from: `graph:${edge.sourceNodeId}`,
    to: `graph:${edge.targetNodeId}`,
    relation: edge.relation,
    connection: 'direct_evidence',
    basis: edge.provenance,
    strength: edge.weight,
  }));
  const edges = [...directGraphEdges.filter((edge) => nodes.some((node) => node.id === edge.from || node.id === edge.to)), ...inferEdges(nodes, evidence)].slice(0, 40);
  const relatedPredictions = evidence.filter((item) => item.source === 'sfi_prediction_entries').slice(0, 10);
  const relatedReports = evidence.filter((item) => item.source === 'world-vector').slice(0, 10);
  const missingContext = [
    canonical.sourceState !== 'observed' ? canonical.degradedReason ?? 'canonical_graph_degraded' : null,
    rootRuntime.status !== 'operational' ? `root_graph_${rootRuntime.status}` : null,
    amv.status === 'empty' ? 'amv_manual_ingest_required' : null,
    evidence.length === 0 ? 'query_has_no_matching_internal_evidence' : null,
  ].filter((item): item is string => Boolean(item));

  let interpretation: string | null = null;
  let provider = 'degraded';
  if (input.generateInterpretation) {
    const llm = await runLlmTask({
      task: 'graph_interpretation',
      prompt: JSON.stringify({ query, nodes: nodes.slice(0, 8), evidence: evidence.slice(0, 8), edges: edges.slice(0, 8), missingContext }),
      fallbackResult: 'Lectura degradada: el grafo se puede navegar con evidencia interna, pero no hay proveedor LLM disponible. Revise nodos, evidencias y conexiones marcadas.',
      maxTokens: 700,
    });
    interpretation = llm.result;
    provider = `${llm.provider}:${llm.model}`;
    warnings.push(...llm.warnings);
  }

  const confidence = Math.max(0.18, Math.min(0.86, (nodes.length * 0.025) + (evidence.length * 0.018) + (edges.length * 0.01)));
  const trace = createTrace({
    prefix: 'graph',
    sourceInputs: [query, ...filters],
    toolsUsed: ['canonical_graph', 'root_neural_graph_runtime', 'world-vector', 'worldspect-opportunities', 'amv-memory', ...EVIDENCE_TABLES.map((item) => item.table)],
    providerUsed: provider,
    graphNodesUsed: nodes.map((node) => node.id),
    evidenceUsed: evidence.map((item) => item.id),
    confidence,
  });

  return {
    ok: true,
    query,
    filters,
    nodes,
    edges,
    evidence,
    trace,
    related_predictions: relatedPredictions,
    related_reports: relatedReports,
    suggested_actions: [
      { action: 'create IFNORM', reason: evidence.some((item) => item.source.includes('opportunities')) ? 'Opportunity evidence is present.' : 'Requires a company/person or public signal before prospect report.', approval_required: true },
      { action: 'link to Prediction Registry', reason: relatedPredictions.length ? 'Existing prediction can be calibrated.' : 'Create a pre-perturbation hypothesis if action is contemplated.', approval_required: true },
      { action: 'send to Atlas draft', reason: nodes.length && evidence.length ? 'Graph has traceable pattern material.' : 'Needs stronger evidence before Atlas draft.', approval_required: true },
      { action: 'send to Client Finder', reason: filters.includes('prospect') ? 'Prospect filter is active.' : 'Add prospect/company context first.', approval_required: true },
    ],
    confidence,
    missing_context: unique(missingContext),
    interpretation,
    warnings: unique(warnings),
  };
}
