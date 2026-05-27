import crypto from 'crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readGovernanceRuntime, recordBlindModePolicyBlock } from '@/lib/governance/governanceRuntime';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';

export type ProposalStatus = 'queued' | 'proposed' | 'accepted' | 'design_approved' | 'rejected';

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
  const { data, error } = await service
    .from('action_proposals')
    .insert({
      proposal_type: input.proposalType,
      title: input.title ?? null,
      objective: input.objective ?? null,
      objective_hash: input.objective ? sha256(input.objective) : null,
      seed: input.seed ?? null,
      worldspect_snapshot_id: input.worldspectSnapshotId ?? null,
      graph_node_count: input.graphNodeCount ?? 0,
      graph_edge_count: input.graphEdgeCount ?? 0,
      input_vector_hash: input.inputVectorHash ?? null,
      spec_hash: input.specHash ?? null,
      content_hash: input.contentHash ?? null,
      prompt_hash: input.promptHash ?? null,
      status: input.status ?? 'queued',
      requires_approval: true,
      actor_id: input.actorId,
      event_id: input.eventId ?? null,
      payload: input.payload,
    })
    .select('*')
    .single();

  if (error) return { ok: false as const, error: 'action_proposal_insert_failed', details: error.message };
  return { ok: true as const, data };
}

export async function latestActionProposals(proposalTypes?: string[], limit = 20) {
  const service = createServiceSupabaseClient();
  let query = service
    .from('action_proposals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (proposalTypes?.length) {
    query = query.in('proposal_type', proposalTypes);
  }

  const { data, error } = await query;
  return { data: error ? [] : data ?? [], error: error?.message ?? null };
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
  eventId?: string | null;
  payloadPatch?: Record<string, unknown>;
}) {
  const service = createServiceSupabaseClient();
  const update: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.eventId) update.event_id = input.eventId;
  if (input.payloadPatch) update.payload = input.payloadPatch;

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
