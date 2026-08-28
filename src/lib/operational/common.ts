import 'server-only';

import { createHash } from 'crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { getLatestKernelCycle } from '@/lib/runtime/kernelRuntime';
import { readGovernanceRuntime } from '@/lib/governance/runtime';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/service';
import { readCanonicalGraphState } from '@/lib/graph/readModel';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { ProposalStatus } from '@/lib/governance/proposalLifecycle';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PROPOSAL_STATUSES = new Set<ProposalStatus>(['draft', 'proposed', 'waiting_evidence', 'design_approved', 'queued', 'accepted', 'rejected']);
export const PROPOSAL_RISK_LEVELS = new Set(['low', 'medium', 'high', 'unknown', 'unassessable'] as const);
export type ProposalRiskLevel = 'low' | 'medium' | 'high' | 'unknown' | 'unassessable';

export function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function proposalTypeFrom(row: Record<string, unknown>) {
  const expected = recordValue(row.expected_field_delta);
  const proportionality = recordValue(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expected.proposalType)
    ?? stringValue(expected.proposal_type)
    ?? stringValue(proportionality.proposalType)
    ?? stringValue(proportionality.proposal_type);
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function appendOperationalEvent(input: {
  eventName: string;
  actorId: string;
  payload: Record<string, unknown>;
  lineage?: string[];
  confidence?: number | null;
  logbookId?: string | null;
}) {
  return appendEpistemicEvent({
    eventName: input.eventName,
    epistemicClass: 'observed',
    confidence: input.confidence ?? 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.actorId, sourceType: 'sfi_operational_runtime' },
    payload: input.payload,
    lineage: input.lineage ?? [],
    logbookId: input.logbookId ?? 'BR',
  });
}

export async function createActionProposal(input: {
  proposalType: string;
  actorId: string;
  title?: string | null;
  objective?: string | null;
  status?: ProposalStatus;
  eventId?: string | null;
  payload?: Record<string, unknown>;
  seed?: number | null;
  worldspectSnapshotId?: string | null;
  graphNodeCount?: number | null;
  graphEdgeCount?: number | null;
  inputVectorHash?: string | null;
  specHash?: string | null;
  contentHash?: string | null;
  promptHash?: string | null;
}) {
  const service = createServiceSupabaseClient();
  const expectedFieldDelta = {
    proposalType: input.proposalType,
    objective: input.objective ?? null,
    seed: input.seed ?? null,
    worldspectSnapshotId: input.worldspectSnapshotId ?? null,
    graphNodeCount: typeof input.graphNodeCount === 'number' ? input.graphNodeCount : null,
    graphEdgeCount: typeof input.graphEdgeCount === 'number' ? input.graphEdgeCount : null,
    inputVectorHash: input.inputVectorHash ?? null,
    specHash: input.specHash ?? null,
    contentHash: input.contentHash ?? null,
    promptHash: input.promptHash ?? null,
    actorId: input.actorId,
    payload: input.payload,
  };
  const { data, error } = await service.from('action_proposals').insert({
    title: input.title ?? input.proposalType,
    description: input.objective ?? null,
    status: input.status ?? 'draft',
    expected_field_delta: expectedFieldDelta,
    risk_level: 'unknown',
    proportionality_check: {
      proposalType: input.proposalType,
      approvalRequired: true,
      riskAssessmentState: 'UNASSESSED',
      objectiveHash: input.objective ? sha256(input.objective) : null,
    },
    approval_required: true,
    event_id: input.eventId && UUID_RE.test(input.eventId) ? input.eventId : null,
  }).select('*').single();
  if (error) return { ok: false as const, error: 'action_proposal_insert_failed', details: error.message };
  return { ok: true as const, data };
}

export async function latestActionProposals(proposalTypes?: string[], limit = 20) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service.from('action_proposals').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return { data: [], error: error.message };
  const rows = data ?? [];
  if (!proposalTypes?.length) return { data: rows, error: null };
  return { data: rows.filter((row) => { const proposalType = proposalTypeFrom(recordValue(row)); return proposalType ? proposalTypes.includes(proposalType) : false; }), error: null };
}

export async function readOperationalContext() {
  const [worldspect, graph, kernel, governance] = await Promise.all([getLatestWorldSpectSnapshot(), readCanonicalGraphState('sfi'), getLatestKernelCycle(), readGovernanceRuntime()]);
  return { worldspect, worldspectData: worldspect ? snapshotRowToApiData(worldspect) : null, graph, kernel, governance };
}

export async function updateActionProposalStatus(input: {
  proposalId: string; status: ProposalStatus; actorId: string; isRoot: boolean; proposalType: string;
  expectedStatuses: ProposalStatus[]; eventId?: string | null; payloadPatch?: Record<string, unknown>;
  systemActor?: boolean; preserveOutcome?: boolean;
  executedAt?: string | null;
  riskPatch?: { riskLevel: ProposalRiskLevel; proportionalityCheck: Record<string, unknown>; updatedAt: string };
}) {
  const service = createServiceSupabaseClient();
  const { data: existing, error: selectError } = await service.from('action_proposals').select('*').eq('id', input.proposalId).in('status', input.expectedStatuses).limit(1).maybeSingle();
  if (selectError) return { ok: false as const, error: 'action_proposal_lookup_failed', details: selectError.message };
  if (!existing) return { ok: false as const, error: 'action_proposal_not_found_or_forbidden' };
  const existingRecord = recordValue(existing);
  const existingType = proposalTypeFrom(existingRecord);
  const expectedDelta = recordValue(existingRecord.expected_field_delta);
  if (existingType && existingType !== input.proposalType) return { ok: false as const, error: 'action_proposal_type_mismatch' };
  if (!input.isRoot && !input.systemActor && stringValue(expectedDelta.actorId) && expectedDelta.actorId !== input.actorId) return { ok: false as const, error: 'action_proposal_not_found_or_forbidden' };

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status: input.status };
  if (!input.preserveOutcome) {
    update.outcome = { ...recordValue(existingRecord.outcome), actorId: input.actorId, proposalType: input.proposalType, eventId: input.eventId ?? null, payloadPatch: input.payloadPatch ?? null, updatedAt: now };
  }
  if (input.riskPatch) {
    update.risk_level = input.riskPatch.riskLevel;
    update.proportionality_check = input.riskPatch.proportionalityCheck;
    update.updated_at = input.riskPatch.updatedAt;
  }
  if (input.status === 'design_approved') update.approved_at = now;
  if (input.executedAt) {
    const parsed = Date.parse(input.executedAt);
    if (!Number.isFinite(parsed)) return { ok: false as const, error: 'action_proposal_executed_at_invalid' };
    update.executed_at = new Date(parsed).toISOString();
  }
  const { data, error } = await service.from('action_proposals').update(update).eq('id', input.proposalId).select('*').single();
  if (error) return { ok: false as const, error: 'action_proposal_update_failed', details: error.message };
  return { ok: true as const, data };
}

/**
 * Proposal risk persists through updateActionProposalStatus, the existing canonical
 * action_proposals mutation path. Risk is advisory: it never grants execution or canon.
 */
export async function updateActionProposalRisk(input: {
  proposalId: string;
  riskLevel: ProposalRiskLevel;
  actorId: string;
  confidence: number | null;
  rationale: string;
  sourceEventId?: string | null;
}) {
  const service = createServiceSupabaseClient();
  const { data: existing, error: selectError } = await service.from('action_proposals').select('*').eq('id', input.proposalId).maybeSingle();
  if (selectError) return { ok: false as const, error: 'action_proposal_risk_lookup_failed', details: selectError.message };
  if (!existing) return { ok: false as const, error: 'action_proposal_not_found' };
  const existingRecord = recordValue(existing);
  const statusValue = stringValue(existingRecord.status);
  if (!statusValue || !PROPOSAL_STATUSES.has(statusValue as ProposalStatus)) return { ok: false as const, error: 'action_proposal_status_invalid' };
  const currentStatus = statusValue as ProposalStatus;
  const currentType = proposalTypeFrom(existingRecord);
  if (!currentType) return { ok: false as const, error: 'action_proposal_type_missing' };

  const proportionality = recordValue(existingRecord.proportionality_check);
  const assessedAt = new Date().toISOString();
  const riskAssessment = {
    state: input.riskLevel === 'unassessable' ? 'MISSING_INPUT_FOR_RISK' : 'ASSESSED',
    level: input.riskLevel,
    confidence: input.confidence,
    rationale: input.rationale,
    sourceEventId: input.sourceEventId ?? null,
    actorId: input.actorId,
    assessedAt,
    executionAuthorized: false,
    canonicalPromotionAllowed: false,
  };

  const updated = await updateActionProposalStatus({
    proposalId: input.proposalId,
    status: currentStatus,
    actorId: input.actorId,
    isRoot: false,
    systemActor: true,
    proposalType: currentType,
    expectedStatuses: [currentStatus],
    eventId: input.sourceEventId ?? null,
    preserveOutcome: true,
    riskPatch: {
      riskLevel: input.riskLevel,
      proportionalityCheck: {
        ...proportionality,
        riskAssessmentState: riskAssessment.state,
        riskAssessment,
      },
      updatedAt: assessedAt,
    },
  });
  if (!updated.ok) return updated;
  return { ...updated, riskAssessment };
}

export async function latestRows(table: string, limit = 10) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service.from(table).select('*').order('created_at', { ascending: false }).limit(limit);
  return { data: error ? [] : data ?? [], error: error?.message ?? null };
}
