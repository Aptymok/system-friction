import crypto from 'crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readGovernanceRuntime, recordBlindModePolicyBlock } from '@/lib/governance/governanceRuntime';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';

export type ProposalStatus = 'queued' | 'proposed' | 'accepted' | 'design_approved' | 'rejected' | 'draft';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalize((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

export function sha256(value: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function proposalTypeFrom(row: Record<string, unknown>) {
  const expectedDelta = recordValue(row.expected_field_delta);
  const proportionality = recordValue(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expectedDelta.proposalType)
    ?? stringValue(expectedDelta.proposal_type)
    ?? stringValue(proportionality.proposalType)
    ?? stringValue(proportionality.proposal_type)
    ?? null;
}

export function buildMutationLogbookRow(input: {
  proposalId: string;
  eventId: string;
  actorId: string;
  mutationType: string;
  status: ProposalStatus;
  target?: string | null;
  currentState?: unknown;
  proposedState?: unknown;
  coherenceDelta?: number;
  payload: Record<string, unknown>;
}) {
  return {
    event_id: input.eventId,
    mutation_key: `mutation:${input.proposalId}:${input.status}`,
    target: input.target ?? 'action_proposals',
    current_state: input.currentState ?? null,
    proposed_state: input.proposedState ?? null,
    coherence_delta: typeof input.coherenceDelta === 'number' ? input.coherenceDelta : 0,
    status: input.status,
    proposal_id: input.proposalId,
    actor_id: input.actorId,
    mutation_type: input.mutationType,
    payload: input.payload,
  };
}

export async function requireGovernedActor(action: string) {
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return { ok: false as const, status: 401, body: { ok: false, error: 'Unauthorized' } };
  }

  const governance = await readGovernanceRuntime();

  if (governance.blindMode) {
    await recordBlindModePolicyBlock(ctx.user.id, action, governance);
    return {
      ok: false as const,
      status: 423,
      body: { ok: false, error: 'blocked_by_governance', governance },
    };
  }

  return { ok: true as const, ctx, governance };
}

export async function appendOperationalEvent(input: {
  eventName: string;
  actorId: string;
  confidence?: number;
  payload: Record<string, unknown>;
  lineage?: string[];
}) {
  return appendEpistemicEvent({
    eventName: input.eventName,
    epistemicClass: 'derived',
    confidence: typeof input.confidence === 'number' ? input.confidence : 0.75,
    payload: input.payload,
    occurredAt: new Date().toISOString(),
    source: {
      sourceId: 'SYSTEM_FRICTION_INSTITUTE',
      sourceType: 'operational_runtime',
    },
    logbookId: 'BR',
    lineage: input.lineage ?? [],
  });
}

export async function createActionProposal(input: {
  proposalType: string;
  actorId: string;
  title?: string | null;
  objective?: string | null;
  seed?: string | null;
  worldspectSnapshotId?: string | null;
  graphNodeCount?: number;
  graphEdgeCount?: number;
  inputVectorHash?: string | null;
  specHash?: string | null;
  contentHash?: string | null;
  promptHash?: string | null;
  status?: ProposalStatus | 'queued';
  eventId?: string | null;
  payload: Record<string, unknown>;
}) {
  const service = createServiceSupabaseClient();
  const expectedFieldDelta = {
    proposalType: input.proposalType,
    objective: input.objective ?? null,
    seed: input.seed ?? null,
    worldspectSnapshotId: input.worldspectSnapshotId ?? null,
    graphNodeCount: input.graphNodeCount ?? 0,
    graphEdgeCount: input.graphEdgeCount ?? 0,
    inputVectorHash: input.inputVectorHash ?? null,
    specHash: input.specHash ?? null,
    contentHash: input.contentHash ?? null,
    promptHash: input.promptHash ?? null,
    actorId: input.actorId,
    payload: input.payload,
  };
  const { data, error } = await service
    .from('action_proposals')
    .insert({
      title: input.title ?? input.proposalType,
      description: input.objective ?? null,
      status: input.status ?? 'draft',
      expected_field_delta: expectedFieldDelta,
      risk_level: 'low',
      proportionality_check: {
        proposalType: input.proposalType,
        approvalRequired: true,
        objectiveHash: input.objective ? sha256(input.objective) : null,
      },
      approval_required: true,
      event_id: input.eventId && UUID_RE.test(input.eventId) ? input.eventId : null,
    })
    .select('*')
    .single();

  if (error) return { ok: false as const, error: 'action_proposal_insert_failed', details: error.message };
  return { ok: true as const, data };
}

export async function latestActionProposals(proposalTypes?: string[], limit = 20) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('action_proposals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  const rows = data ?? [];
  if (!proposalTypes?.length) return { data: rows, error: null };
  return {
    data: rows.filter((row) => {
      const proposalType = proposalTypeFrom(recordValue(row));
      return proposalType ? proposalTypes.includes(proposalType) : false;
    }),
    error: null,
  };
}

export async function readOperationalContext() {
  const [worldspect, graph, kernel, governance] = await Promise.all([
    getLatestWorldSpectSnapshot(),
    readCanonicalGraphState('sfi'),
    getLatestKernelCycle(),
    readGovernanceRuntime(),
  ]);

  return {
    worldspect,
    worldspectData: worldspect ? snapshotRowToApiData(worldspect) : null,
    graph,
    kernel,
    governance,
  };
}

export async function updateActionProposalStatus(input: {
  proposalId: string;
  status: ProposalStatus;
  actorId: string;
  isRoot: boolean;
  proposalType: string;
  expectedStatuses: ProposalStatus[];
  eventId?: string | null;
  payloadPatch?: Record<string, unknown>;
}) {
  const service = createServiceSupabaseClient();
  let selectQuery = service
    .from('action_proposals')
    .select('*')
    .eq('id', input.proposalId)
    .in('status', input.expectedStatuses)
    .limit(1);

  const { data: existing, error: selectError } = await selectQuery.maybeSingle();
  if (selectError) return { ok: false as const, error: 'action_proposal_lookup_failed', details: selectError.message };
  if (!existing) return { ok: false as const, error: 'action_proposal_not_found_or_forbidden' };

  const existingRecord = recordValue(existing);
  const existingType = proposalTypeFrom(existingRecord);
  const expectedDelta = recordValue(existingRecord.expected_field_delta);
  if (existingType && existingType !== input.proposalType) return { ok: false as const, error: 'action_proposal_type_mismatch' };
  if (!input.isRoot && stringValue(expectedDelta.actorId) && expectedDelta.actorId !== input.actorId) {
    return { ok: false as const, error: 'action_proposal_not_found_or_forbidden' };
  }

  const update: Record<string, unknown> = {
    status: input.status,
    outcome: {
      ...(recordValue(existingRecord.outcome)),
      actorId: input.actorId,
      proposalType: input.proposalType,
      eventId: input.eventId ?? null,
      payloadPatch: input.payloadPatch ?? null,
      updatedAt: new Date().toISOString(),
    },
  };

  const { data, error } = await service
    .from('action_proposals')
    .update(update)
    .eq('id', input.proposalId)
    .select('*')
    .single();

  if (error) return { ok: false as const, error: 'action_proposal_update_failed', details: error.message };
  return { ok: true as const, data };
}

export async function latestRows(table: string, limit = 10) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: error ? [] : data ?? [], error: error?.message ?? null };
}
