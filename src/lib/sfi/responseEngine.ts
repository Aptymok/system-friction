import { asRecord, numericValue, readLatestProposalAlignment, readOperationalConsoleState, textValue, type SfiRecord } from '@/lib/sfi/operationalConsole';

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
  confidence: number;
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

type DecisionInput = {
  decision: SfiResponseDecision;
  priority: SfiResponsePriority;
  reason: string;
  blocking_condition: string | null;
  next_action: string;
  target_route: string | null;
  target_id: string | null;
  payload?: Record<string, unknown>;
  confidence: number;
};

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
      return {
        key,
        source: textValue(record.source, key),
        error: textValue(record.error, 'source_degraded'),
      };
    });
}

function hasActiveAttractor(attractor: SfiRecord) {
  const data = asRecord(attractor.data);
  if (!Object.keys(data).length) return false;
  return data.active !== false;
}

function buildPayload(item: SfiRecord | null, kind: string) {
  if (!item) return { kind };
  return {
    kind,
    id: firstId(item, ['id', 'proposal_id', 'attractor_id']),
    title: textValue(item.title ?? item.proposal_title ?? item.objective, ''),
  };
}

const EXECUTION_ALIGNMENT_STATUSES = new Set(['execute_now', 'prepare_execution', 'execute_only_if_aligned']);
const BLOCKING_ALIGNMENT_STATUSES = new Set(['request_evidence', 'reformulate', 'request_attractor', 'close_obsolete']);

function alignmentPayload(recoveryTargetId: string | null, latestAlignment: SfiRecord | null) {
  return {
    kind: 'recovery_queue_item',
    id: recoveryTargetId,
    latest_alignment_status: textValue(latestAlignment?.recommended_status, 'missing_candidate_alignment'),
    alignment_score: numericValue(latestAlignment?.alignment_score, null),
    evidence_score: numericValue(latestAlignment?.evidence_score, null),
    external_execution_allowed: false,
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
    item.summary,
    item.payload,
    item.source_payload,
  ).includes(id));
}

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
  const pipelineBottleneck = textValue(pipeline.bottleneck, textValue(closedLoop.current_bottleneck, ''));
  const operationalRegime = textValue(operationalCycle.operational_regime, textValue(operationalCycle.regime, 'unknown'));
  const stabilityRegime = textValue(stability.stability_regime, textValue(stability.regime, 'unknown'));
  const firstAlignment = alignmentQueue[0] ?? null;
  const firstRecovery = recoveryQueue[0] ?? null;
  const alignmentTargetId = firstId(firstAlignment, ['proposal_id', 'id']);
  const recoveryTargetId = firstId(firstRecovery, ['proposal_id', 'id']);
  const evidencePresent = evidenceMap.length > 0;

  let decision: DecisionInput;

  if (!activeAttractor) {
    decision = {
      decision: 'request_attractor',
      priority: 'critical',
      reason: 'No active declared attractor is available, so SFI cannot recommend alignment or execution preparation.',
      blocking_condition: 'missing_active_attractor',
      next_action: 'Declare one active attractor before considering proposal alignment or execution preparation.',
      target_route: '/api/sfi/attractors',
      target_id: null,
      payload: { external_execution_allowed: false },
      confidence: 0.95,
    };
  } else if (alignmentQueue.length > 0) {
    decision = {
      decision: 'align',
      priority: 'high',
      reason: 'Proposal alignment queue contains items that must be checked against the active attractor before execution preparation.',
      blocking_condition: null,
      next_action: 'Review and align the first queued proposal against the active attractor.',
      target_route: '/api/sfi/proposals/[id]/align',
      target_id: alignmentTargetId,
      payload: buildPayload(firstAlignment, 'alignment_queue_item'),
      confidence: 0.88,
    };
  } else if (recoveryQueue.length > 0 && !evidencePresent) {
    decision = {
      decision: 'request_evidence',
      priority: 'high',
      reason: 'Recovery queue contains items, but the evidence map has no usable entries for execution preparation.',
      blocking_condition: 'insufficient_evidence',
      next_action: 'Request or attach evidence before preparing any execution ledger record.',
      target_route: null,
      target_id: recoveryTargetId,
      payload: buildPayload(firstRecovery, 'recovery_queue_item'),
      confidence: 0.86,
    };
  } else if (recoveryQueue.length > 0 && evidencePresent && activeAttractor) {
    const latestAlignmentResult = await readLatestProposalAlignment(recoveryTargetId);
    const latestAlignment = latestAlignmentResult.data;
    const latestAlignmentStatus = textValue(latestAlignment?.recommended_status);
    const alignmentScore = numericValue(latestAlignment?.alignment_score, null);
    const alignmentAllowsExecution =
      Boolean(latestAlignment) &&
      EXECUTION_ALIGNMENT_STATUSES.has(latestAlignmentStatus) &&
      alignmentScore !== null &&
      alignmentScore >= 0.45;
    const directEvidencePresent = evidenceTiedToProposal(recoveryTargetId, evidenceMap);

    if (!latestAlignment) {
      decision = {
        decision: 'request_evidence',
        priority: 'high',
        reason: 'Recovery item has evidence and an active attractor, but no latest candidate alignment exists for the selected proposal.',
        blocking_condition: 'missing_candidate_alignment',
        next_action: 'Align or attach evidence for the selected recovery proposal before preparing execution.',
        target_route: '/api/sfi/evidence-requirements',
        target_id: recoveryTargetId,
        payload: alignmentPayload(recoveryTargetId, latestAlignment),
        confidence: latestAlignmentResult.ok ? 0.88 : 0.7,
      };
    } else if (
      BLOCKING_ALIGNMENT_STATUSES.has(latestAlignmentStatus) ||
      !alignmentAllowsExecution
    ) {
      decision = {
        decision: 'request_evidence',
        priority: 'high',
        reason: 'Latest candidate alignment does not allow execution preparation for the selected recovery proposal.',
        blocking_condition: 'alignment_requires_evidence',
        next_action: 'Attach evidence or reformulate the selected proposal before preparing execution.',
        target_route: '/api/sfi/evidence-requirements',
        target_id: recoveryTargetId,
        payload: alignmentPayload(recoveryTargetId, latestAlignment),
        confidence: 0.9,
      };
    } else if (!directEvidencePresent) {
      decision = {
        decision: 'request_evidence',
        priority: 'high',
        reason: 'Latest candidate alignment allows execution preparation, but no evidence map entry is directly tied to the selected proposal id.',
        blocking_condition: 'missing_evidence_attachment',
        next_action: 'Attach or reference evidence using the selected proposal id before preparing execution.',
        target_route: '/api/sfi/evidence-requirements',
        target_id: recoveryTargetId,
        payload: {
          ...alignmentPayload(recoveryTargetId, latestAlignment),
          direct_evidence_required: true,
        },
        confidence: 0.91,
      };
    } else {
      decision = {
        decision: 'prepare_execution',
        priority: 'high',
        reason: 'A recovery item, direct proposal evidence, active attractor, and latest candidate alignment allow execution preparation without external execution.',
        blocking_condition: null,
        next_action: 'Prepare a pending execution ledger record for manual review; do not execute externally.',
        target_route: '/api/sfi/recovery-queue/[id]/prepare-execution',
        target_id: recoveryTargetId,
        payload: { ...buildPayload(firstRecovery, 'recovery_queue_item'), ...alignmentPayload(recoveryTargetId, latestAlignment) },
        confidence: 0.84,
      };
    }
  } else if (degraded.length > 0) {
    decision = {
      decision: 'observe',
      priority: 'medium',
      reason: 'One or more operational sources are degraded, so SFI should observe until partial observation is resolved.',
      blocking_condition: 'partial_observation',
      next_action: 'Restore degraded reads or keep the system in observation mode.',
      target_route: null,
      target_id: null,
      payload: { degraded_sources: degraded.map((item) => item.source) },
      confidence: 0.72,
    };
  } else if (pipelineBottleneck) {
    decision = {
      decision: 'request_evidence',
      priority: 'medium',
      reason: 'A pipeline bottleneck exists and should be resolved through evidence before any operational escalation.',
      blocking_condition: pipelineBottleneck,
      next_action: 'Collect the missing trace required to resolve the current pipeline bottleneck.',
      target_route: null,
      target_id: null,
      payload: { bottleneck: pipelineBottleneck },
      confidence: 0.68,
    };
  } else {
    decision = {
      decision: 'observe',
      priority: 'low',
      reason: 'No active queue, degraded source, or pipeline bottleneck requires an operational response.',
      blocking_condition: null,
      next_action: 'Keep observing operational state without mutating state.',
      target_route: null,
      target_id: null,
      payload: {},
      confidence: 0.64,
    };
  }

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    source: 'sfi_response_engine',
    ...decision,
    payload: decision.payload ?? {},
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
