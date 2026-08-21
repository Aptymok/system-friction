import { asRecord, readLatestProposalAlignment, readOperationalConsoleState, textValue, type SfiRecord } from '@/lib/sfi/operationalConsole';

export type SfiResponseDecision =
  | 'observe'
  | 'request_attractor'
  | 'request_evidence'
  | 'align'
  | 'prepare_execution'
  | 'request_outcome'
  | 'record_lesson'
  | 'reformulate'
  | 'close_obsolete';

export type SfiResponsePriority = 'critical' | 'high' | 'medium' | 'low';

export type SfiOperationalResponse = {
  ok: true;
  generated_at: string;
  source: 'sfi_response_engine';
  decision: SfiResponseDecision;
  priority: SfiResponsePriority;
  reason: string;
  blocking_condition: string | null;
  next_action: string;
  target_route: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  confidence: number | null;
  evidence: {
    degraded: Array<Record<string, unknown>>;
    recovery_queue_count: number;
    alignment_queue_count: number;
    evidence_map_count: number;
    has_active_attractor: boolean;
    operational_regime: string;
    stability_regime: string;
    pipeline_bottleneck: string;
  };
};

type DecisionInput = Omit<SfiOperationalResponse, 'ok' | 'generated_at' | 'source' | 'evidence'>;

function rows(value: unknown): SfiRecord[] {
  return Array.isArray(value) ? value.filter((item): item is SfiRecord => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function firstId(item: SfiRecord | null, keys: string[]) {
  if (!item) return null;
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function degradedSources(state: Awaited<ReturnType<typeof readOperationalConsoleState>>) {
  return Object.entries(state)
    .filter(([, value]) => Boolean(asRecord(value).degraded))
    .map(([key, value]) => {
      const record = asRecord(value);
      return { key, source: textValue(record.source, key), error: textValue(record.error, 'source_degraded') };
    });
}

function hasActiveAttractor(attractor: SfiRecord) {
  const data = asRecord(attractor.data);
  return Object.keys(data).length > 0 && data.active !== false;
}

function buildPayload(item: SfiRecord | null, kind: string) {
  if (!item) return { kind };
  return {
    kind,
    id: firstId(item, ['id', 'proposal_id', 'attractor_id']),
    title: textValue(item.title ?? item.proposal_title ?? item.objective),
  };
}

function textBlob(...values: unknown[]) {
  return values.map((value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return JSON.stringify(value);
    return '';
  }).join(' ').toLowerCase();
}

function evidenceTiedToProposal(proposalId: string | null, evidenceMap: SfiRecord[]) {
  const id = textValue(proposalId).toLowerCase();
  if (!id) return false;
  return evidenceMap.some((item) => textBlob(
    item.id,
    item.proposal_id,
    item.proposalId,
    item.evidence_ref,
    item.source_table,
    item.source_label,
    item.summary,
    item.payload,
    item.source_payload,
  ).includes(id));
}

const EXECUTION_ALIGNMENT_STATUSES = new Set(['execute_now', 'prepare_execution', 'execute_only_if_aligned']);

export async function generateSfiOperationalResponse(): Promise<SfiOperationalResponse> {
  const state = await readOperationalConsoleState();
  const recoveryQueue = rows(state.recoveryQueue.data);
  const alignmentQueue = rows(state.alignmentQueue.data);
  const evidenceMap = rows(state.evidenceMap.data);
  const operationalCycle = asRecord(state.operationalCycle.data);
  const stability = asRecord(state.stability.data);
  const pipeline = asRecord(state.pipelineLoss.data);
  const closedLoop = asRecord(state.closedLoop.data);
  const degraded = degradedSources(state);
  const activeAttractor = hasActiveAttractor(state.attractor);
  const pipelineBottleneck = textValue(pipeline.bottleneck, textValue(closedLoop.current_bottleneck));
  const operationalRegime = textValue(operationalCycle.operational_regime, textValue(operationalCycle.regime, 'unknown'));
  const stabilityRegime = textValue(stability.stability_regime, textValue(stability.regime, 'unknown'));
  const firstAlignment = alignmentQueue[0] ?? null;
  const firstRecovery = recoveryQueue[0] ?? null;
  const alignmentTargetId = firstId(firstAlignment, ['proposal_id', 'id']);
  const recoveryTargetId = firstId(firstRecovery, ['proposal_id', 'id']);

  let decision: DecisionInput;

  if (!activeAttractor) {
    decision = {
      decision: 'request_attractor',
      priority: 'critical',
      reason: 'No active declared attractor exists.',
      blocking_condition: 'missing_active_attractor',
      next_action: 'Declare one active attractor before alignment or intervention preparation.',
      target_route: '/api/sfi/attractors',
      target_id: null,
      payload: { external_execution_allowed: false },
      confidence: null,
    };
  } else if (degraded.length > 0) {
    decision = {
      decision: 'observe',
      priority: 'high',
      reason: 'One or more required operational sources are degraded.',
      blocking_condition: 'partial_observation',
      next_action: 'Restore degraded reads before making an execution recommendation.',
      target_route: null,
      target_id: null,
      payload: { degraded_sources: degraded.map((item) => item.source) },
      confidence: null,
    };
  } else if (alignmentQueue.length > 0) {
    decision = {
      decision: 'align',
      priority: 'high',
      reason: 'A proposal requires an explicit evidence-backed alignment assessment against the active attractor.',
      blocking_condition: null,
      next_action: 'Assess the queued proposal. SFI will not synthesize an alignment score from text overlap.',
      target_route: '/api/sfi/proposals/[id]/align',
      target_id: alignmentTargetId,
      payload: buildPayload(firstAlignment, 'alignment_queue_item'),
      confidence: null,
    };
  } else if (recoveryQueue.length > 0) {
    const latestAlignmentResult = await readLatestProposalAlignment(recoveryTargetId);
    const latestAlignment = latestAlignmentResult.data;
    const latestAlignmentStatus = textValue(latestAlignment?.recommended_status);
    const directEvidencePresent = evidenceTiedToProposal(recoveryTargetId, evidenceMap);

    if (!latestAlignment || !EXECUTION_ALIGNMENT_STATUSES.has(latestAlignmentStatus)) {
      decision = {
        decision: 'request_evidence',
        priority: 'high',
        reason: 'The recovery proposal has no execution-eligible evidence-backed alignment assessment.',
        blocking_condition: 'alignment_requires_evidence',
        next_action: 'Attach evidence and record an explicit alignment assessment before preparing execution.',
        target_route: '/api/sfi/evidence-requirements',
        target_id: recoveryTargetId,
        payload: { kind: 'recovery_queue_item', id: recoveryTargetId, latest_alignment_status: latestAlignmentStatus || null, external_execution_allowed: false },
        confidence: null,
      };
    } else if (!directEvidencePresent) {
      decision = {
        decision: 'request_evidence',
        priority: 'high',
        reason: 'The selected proposal has an execution-eligible alignment assessment but no directly linked evidence record.',
        blocking_condition: 'missing_evidence_attachment',
        next_action: 'Attach evidence referencing the selected proposal before preparing execution.',
        target_route: '/api/sfi/evidence-requirements',
        target_id: recoveryTargetId,
        payload: { kind: 'recovery_queue_item', id: recoveryTargetId, direct_evidence_required: true, external_execution_allowed: false },
        confidence: null,
      };
    } else {
      decision = {
        decision: 'prepare_execution',
        priority: 'high',
        reason: 'The proposal has an active attractor, an explicit execution-eligible alignment assessment, and directly linked evidence.',
        blocking_condition: null,
        next_action: 'Prepare a pending internal execution record for governed review. Do not execute externally.',
        target_route: '/api/sfi/recovery-queue/[id]/prepare-execution',
        target_id: recoveryTargetId,
        payload: { ...buildPayload(firstRecovery, 'recovery_queue_item'), external_execution_allowed: false },
        confidence: null,
      };
    }
  } else if (pipelineBottleneck) {
    decision = {
      decision: 'request_evidence',
      priority: 'medium',
      reason: 'The operational pipeline reports an unresolved bottleneck.',
      blocking_condition: pipelineBottleneck,
      next_action: 'Collect the missing trace required to resolve the bottleneck.',
      target_route: null,
      target_id: null,
      payload: { bottleneck: pipelineBottleneck },
      confidence: null,
    };
  } else {
    decision = {
      decision: 'observe',
      priority: 'low',
      reason: 'No current evidence-backed condition requires intervention preparation.',
      blocking_condition: null,
      next_action: 'Continue observation without mutating state.',
      target_route: null,
      target_id: null,
      payload: {},
      confidence: null,
    };
  }

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    source: 'sfi_response_engine',
    ...decision,
    evidence: {
      degraded,
      recovery_queue_count: recoveryQueue.length,
      alignment_queue_count: alignmentQueue.length,
      evidence_map_count: evidenceMap.length,
      has_active_attractor: activeAttractor,
      operational_regime: operationalRegime,
      stability_regime: stabilityRegime,
      pipeline_bottleneck: pipelineBottleneck || 'none',
    },
  };
}
