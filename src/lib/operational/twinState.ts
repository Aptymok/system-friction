import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { latestActionProposals, latestRows } from './common';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { buildCognitiveTwinSeed } from '@/observatory/field/catalog/cognitiveTwinSeed';
import { buildDocumentCatalog } from '@/observatory/field/catalog/sfDocumentCatalog';
import { buildMihmRuntimeMatrix } from '@/observatory/field/catalog/mihmRuntimeMatrix';
import { buildNodeCatalog } from '@/observatory/field/catalog/sfNodeCatalog';
import { buildPatternCatalog } from '@/observatory/field/catalog/patternCatalog';
import type { FieldAccessMode } from '@/observatory/field/catalog/fieldMatrixBuilder';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeJsonRecord(value: unknown): JsonRecord {
  if (isRecord(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstString(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function excerpt(value: unknown, max = 180) {
  const text = typeof value === 'string'
    ? value
    : isRecord(value)
      ? firstString(value, ['excerpt', 'summary', 'content', 'text', 'body', 'value']) ?? JSON.stringify(value)
      : null;
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

function compactEvidenceItems(value: unknown, labelKeys: string[], limit = 12) {
  return arrayValue(value).slice(0, limit).map((item) => {
    const record = safeJsonRecord(item);
    if (!Object.keys(record).length) return item;
    return {
      id: firstString(record, ['nodeKey', 'patternId', 'documentId', 'id', 'key']) ?? null,
      label: firstString(record, labelKeys) ?? firstString(record, ['title', 'label', 'name']) ?? null,
      type: firstString(record, ['nodeType', 'runtimeState', 'riskLevel', 'source', 'status']) ?? null,
    };
  });
}

function meaningfulProposalTitle(proposal: JsonRecord, fallback: string | null) {
  return firstString(proposal, ['title', 'objective', 'requested_output', 'proposalType', 'proposal_type', 'label', 'name'])
    ?? fallback
    ?? 'ACP proposal';
}

function proposalTypeFrom(row: JsonRecord, expectedFieldDelta: JsonRecord, payload: JsonRecord, proposal: JsonRecord) {
  const proportionality = safeJsonRecord(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expectedFieldDelta.proposalType)
    ?? stringValue(expectedFieldDelta.proposal_type)
    ?? stringValue(payload.proposalType)
    ?? stringValue(payload.proposal_type)
    ?? stringValue(proposal.proposalType)
    ?? stringValue(proposal.proposal_type)
    ?? stringValue(proportionality.proposalType)
    ?? stringValue(proportionality.proposal_type)
    ?? null;
}

function summarizeSeedEvidence(value: unknown) {
  const seed = safeJsonRecord(value);
  const nodes = arrayValue(seed.nodes);
  const patterns = arrayValue(seed.patterns);
  const documents = arrayValue(seed.documents);
  return {
    nodes: nodes.length,
    patterns: patterns.length,
    documents: documents.length,
    sample_nodes: nodes.slice(0, 3),
    sample_patterns: patterns.slice(0, 3),
    sample_documents: documents.slice(0, 3),
  };
}

export function summarizeActionProposalForVisor(input: unknown) {
  const row = safeJsonRecord(input);
  const expectedFieldDelta = safeJsonRecord(row.expected_field_delta);
  const rowPayload = safeJsonRecord(row.payload);
  const linkedEventPayload = safeJsonRecord(row.linked_event_payload);
  const payload = {
    ...linkedEventPayload,
    ...rowPayload,
    ...safeJsonRecord(expectedFieldDelta.payload),
  };
  const proposal = safeJsonRecord(payload.proposal);
  const seedEvidence = safeJsonRecord(payload.seed_evidence);
  const selfObservation = safeJsonRecord(payload.self_observation);
  const mihmRuntimeMatrix = safeJsonRecord(seedEvidence.mihmRuntimeMatrix);
  const fallbackTitle = stringValue(row.title);
  const wrapperTitle = fallbackTitle === 'cognitive_twin.proposal.created' || fallbackTitle === 'attractor_draft.created'
    ? null
    : fallbackTitle;
  const title = meaningfulProposalTitle(proposal, wrapperTitle);
  const proposalType = proposalTypeFrom(row, expectedFieldDelta, payload, proposal);
  const objective = firstString(proposal, ['objective', 'requested_output', 'prompt', 'question'])
    ?? stringValue(expectedFieldDelta.objective)
    ?? (title === 'cognitive_twin.proposal.created' ? null : title);
  const artifactEntry = proposal.artifact_entry ?? proposal.artifactEntry ?? proposal.entry ?? proposal.content;

  return {
    id: stringValue(row.id) ?? stringValue(row.event_id) ?? 'proposal',
    title,
    status: stringValue(row.status) ?? 'unknown',
    risk: stringValue(row.risk) ?? stringValue(row.risk_level) ?? 'unknown',
    horizon: firstString(proposal, ['horizon', 'time_horizon', 'timeframe', 'expected_time']) ?? null,
    objective,
    hypothesis: firstString(proposal, ['hypothesis', 'rationale', 'why', 'reason']) ?? null,
    node_id: firstString(proposal, ['node_id', 'nodeId', 'selected_node', 'selectedNode', 'target_node_id', 'targetNodeId']) ?? null,
    proposalType,
    requested_output: firstString(proposal, ['requested_output', 'requestedOutput', 'output']) ?? null,
    degradation: firstNumber(proposal, ['degradation', 'degradation_score', 'degradationScore']),
    acp_instruction: firstString(proposal, ['acp_instruction', 'acpInstruction', 'instruction']) ?? null,
    artifact_label: firstString(proposal, ['artifact_label', 'artifactLabel', 'destination_label', 'destinationLabel']) ?? null,
    artifact_destination: firstString(proposal, ['artifact_destination', 'artifactDestination', 'destination']) ?? null,
    artifact_entry_excerpt: excerpt(artifactEntry),
    seed_nodes: compactEvidenceItems(seedEvidence.nodes, ['label', 'nodeKey']),
    seed_patterns: compactEvidenceItems(seedEvidence.patterns, ['label', 'patternId']),
    seed_documents: compactEvidenceItems(seedEvidence.documents, ['title', 'documentId']),
    system_state: {
      self_observation: Object.keys(selfObservation).length ? selfObservation : null,
      mihm_runtime: Object.keys(mihmRuntimeMatrix).length ? mihmRuntimeMatrix : null,
      access_mode: stringValue(seedEvidence.accessMode) ?? null,
      catalog_counts: safeJsonRecord(seedEvidence.catalogCounts),
    },
    linked_nodes: arrayValue(seedEvidence.nodes).slice(0, 12),
    linked_patterns: arrayValue(seedEvidence.patterns).slice(0, 12),
    evidence_summary: summarizeSeedEvidence(seedEvidence),
    raw_payload: payload,
  };
}

async function linkedEpistemicEventsById(eventIds: string[]) {
  const ids = eventIds.filter(Boolean);
  if (!ids.length) return new Map<string, JsonRecord>();
  try {
    const service = createServiceSupabaseClient();
    const byId = await service
      .from('epistemic_events')
      .select('id,event_id,event_name,payload,occurred_at,created_at')
      .in('id', ids);
    const byEventId = await service
      .from('epistemic_events')
      .select('id,event_id,event_name,payload,occurred_at,created_at')
      .in('event_id', ids);
    const rows = [...(byId.data ?? []), ...(byEventId.data ?? [])];
    if (byId.error && byEventId.error) return new Map<string, JsonRecord>();
    const linked = new Map<string, JsonRecord>();
    for (const row of rows) {
      const record = safeJsonRecord(row);
      const id = stringValue(record.id);
      const eventId = stringValue(record.event_id);
      if (id) linked.set(id, record);
      if (eventId) linked.set(eventId, record);
    }
    return linked;
  } catch {
    return new Map<string, JsonRecord>();
  }
}

function hydrateActionProposalForVisor(input: unknown, linkedEvent?: JsonRecord) {
  const row = safeJsonRecord(input);
  const expectedFieldDelta = safeJsonRecord(row.expected_field_delta);
  const eventPayload = safeJsonRecord(linkedEvent?.payload);
  const payload = {
    ...eventPayload,
    ...safeJsonRecord(row.payload),
    ...safeJsonRecord(expectedFieldDelta.payload),
  };
  const proposal = safeJsonRecord(payload.proposal);
  const seedEvidence = safeJsonRecord(payload.seed_evidence);
  const selfObservation = safeJsonRecord(payload.self_observation);
  const proposalType = proposalTypeFrom(row, expectedFieldDelta, payload, proposal);
  const fallbackTitle = stringValue(row.title);
  const title = meaningfulProposalTitle(
    proposal,
    fallbackTitle === 'cognitive_twin.proposal.created' || fallbackTitle === 'attractor_draft.created' ? proposalType : fallbackTitle,
  );

  const hydrated = {
    ...row,
    id: stringValue(row.id) ?? null,
    title,
    status: stringValue(row.status) ?? null,
    risk: stringValue(row.risk) ?? stringValue(row.risk_level) ?? null,
    risk_level: stringValue(row.risk_level) ?? stringValue(row.risk) ?? null,
    created_at: stringValue(row.created_at) ?? null,
    proposal_type: proposalType,
    event_id: stringValue(row.event_id) ?? null,
    payload: {
      proposal: Object.keys(proposal).length ? proposal : null,
      seed_evidence: Object.keys(seedEvidence).length ? seedEvidence : null,
      self_observation: Object.keys(selfObservation).length ? selfObservation : null,
    },
    linked_event_payload: Object.keys(eventPayload).length ? eventPayload : null,
    linked_event: linkedEvent ?? null,
  };

  return {
    ...hydrated,
    visor_summary: summarizeActionProposalForVisor(hydrated),
  };
}

export async function readTwinSelfObservation(input: {
  user?: unknown;
  profile?: Record<string, unknown> | null;
  node?: Record<string, unknown> | null;
  entitlements?: Record<string, unknown> | null;
  accessMode?: FieldAccessMode;
} = {}) {
  const [graph, worldspect, kernel, governance, proposals, mihmAnalyses, logbookKnowledge, logbookSignals] = await Promise.all([
    readCanonicalGraphState('sfi'),
    getLatestWorldSpectSnapshot(),
    getLatestKernelCycle(),
    readGovernanceRuntime(),
    latestActionProposals(undefined, 20),
    latestRows('mihm_analyses', 10),
    latestRows('logbook_knowledge', 50),
    latestRows('logbook_signals', 25),
  ]);

  const latestCampoState = kernel?.campo_state && typeof kernel.campo_state === 'object'
    ? kernel.campo_state as Record<string, unknown>
    : null;
  const worldspectData = worldspect ? snapshotRowToApiData(worldspect) : null;
  const nodeCatalog = buildNodeCatalog(graph);
  const documentCatalog = buildDocumentCatalog({ logbookKnowledge: logbookKnowledge.data });
  const patternCatalog = buildPatternCatalog();
  const linkedEvents = await linkedEpistemicEventsById(proposals.data.map((proposal) => stringValue(safeJsonRecord(proposal).event_id)).filter((id): id is string => Boolean(id)));
  const hydratedProposals = proposals.data.map((proposal) => {
    const record = safeJsonRecord(proposal);
    const eventId = stringValue(record.event_id);
    return hydrateActionProposalForVisor(record, eventId ? linkedEvents.get(eventId) : undefined);
  });
  const executionCatalog = hydratedProposals.map((proposal) => {
    const record = safeJsonRecord(proposal);
    return {
      executionId: String(record.id ?? record.created_at ?? 'twin_proposal'),
      title: String(record.title ?? 'cognitive_twin.proposal'),
      applicablePatterns: [],
      requiredApproval: Boolean(record.approval_required ?? true),
      expectedFieldDelta: safeJsonRecord(record.expected_field_delta),
      riskLevel: String(record.risk_level ?? record.risk ?? 'medium'),
      verificationCriterion: 'proposal must remain auditable through action_proposals and epistemic_events',
      source: 'action_proposals' as const,
    };
  });
  const mihmRuntimeMatrix = buildMihmRuntimeMatrix({
    mihmAnalyses: mihmAnalyses.data,
    kernel,
    worldspect: worldspectData,
    graph,
    logbookSignals: logbookSignals.data,
  });
  const seed = buildCognitiveTwinSeed({
    user: input.user,
    profile: input.profile,
    node: input.node,
    entitlements: input.entitlements,
    accessMode: input.accessMode,
    nodeCatalog,
    documentCatalog,
    patternCatalog,
    executionCatalog,
    mihmRuntimeMatrix,
    recentEvents: logbookSignals.data,
    recentKernelCycles: kernel ? [kernel] : [],
    latestWorldSpect: worldspectData,
  });

  return {
    observed_graph_nodes: graph.nodes.length,
    observed_graph_edges: graph.edges.length,
    latest_kernel_status: kernel?.status ?? null,
    latest_governance_status: governance.status,
    latest_worldspect_state: worldspect?.source_state ?? null,
    graph,
    worldspect: worldspectData,
    kernel: kernel
      ? {
        id: kernel.id,
        status: kernel.status,
        observedAt: typeof latestCampoState?.observedAt === 'string' ? latestCampoState.observedAt : kernel.created_at,
      }
      : null,
    governance,
    proposals: hydratedProposals,
    seed,
    nodeCatalog,
    documentCatalog,
    patternCatalog,
    executionCatalog,
    mihmRuntimeMatrix,
    warnings: [
      graph.degradedReason,
      governance.warning,
      proposals.error,
      mihmAnalyses.error,
      logbookKnowledge.error,
      logbookSignals.error,
      ...mihmRuntimeMatrix.warnings,
    ].filter(Boolean),
  };
}
