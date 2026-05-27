import crypto from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readGovernanceRuntime } from './governanceRuntime';

const SCHEMA_VERSION = '2026-05-27.sfi-governance-d3';

function hashPayload(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function latestHash() {
  const service = createServiceSupabaseClient();
  const { data } = await service
    .from('epistemic_events')
    .select('hash_self')
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  return typeof data?.hash_self === 'string' ? data.hash_self : null;
}

export type ThoughtInhibitionInput = {
  actorId: string | null;
  thoughtType: string;
  evidenceCount?: number;
  evidenceTypes?: string[];
  reason?: string;
  payload?: Record<string, unknown>;
};

export async function readRecentThoughtInhibitions(limit = 5) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('epistemic_events')
    .select('id,event_id,event_name,confidence,payload,occurred_at,created_at')
    .eq('event_name', 'governance.thought.inhibited')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function evaluateThoughtInhibition(input: ThoughtInhibitionInput) {
  const governance = await readGovernanceRuntime();
  const evidenceCount = Number(input.evidenceCount ?? 0);
  const evidenceTypes = Array.isArray(input.evidenceTypes) ? input.evidenceTypes : [];
  const distinctEvidenceTypes = new Set(evidenceTypes).size;
  const blockedByBlindMode = governance.blindMode;
  const blockedByEvidence = input.thoughtType === 'CONTRADICCION' && (evidenceCount < 3 || distinctEvidenceTypes < 2);

  if (!blockedByBlindMode && !blockedByEvidence) {
    return { ok: true as const, inhibited: false, governance };
  }

  const service = createServiceSupabaseClient();
  const occurredAt = new Date().toISOString();
  const reason = blockedByBlindMode
    ? 'blind_mode_active'
    : input.reason ?? 'insufficient_evidence';
  const eventId = `governance:thought:inhibited:${occurredAt}`;
  const payload = {
    governance,
    thoughtType: input.thoughtType,
    evidenceCount,
    evidenceTypes,
    reason,
    ...input.payload,
  };
  const checksum = hashPayload(payload);
  const hashPrev = await latestHash();
  const hashSelf = hashPayload({ event_id: eventId, payload, hash_prev: hashPrev, occurred_at: occurredAt });

  const { data: event, error } = await service
    .from('epistemic_events')
    .insert({
      event_id: eventId,
      event_name: 'governance.thought.inhibited',
      logbook_id: 'BR',
      epistemic_class: 'observed',
      schema_version: SCHEMA_VERSION,
      source: { sourceId: 'SFI_RUNTIME', sourceType: 'governance' },
      actor_id: input.actorId,
      node_id: null,
      confidence: 1,
      payload,
      checksum,
      lineage: governance.eventId ? [governance.eventId] : [],
      uncertainty: null,
      occurred_at: occurredAt,
      hash_prev: hashPrev,
      hash_self: hashSelf,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false as const, inhibited: true, error: 'thought_inhibition_event_failed', details: error.message, governance };
  }

  await service.from('policy_decisions').insert({
    event_id: event.id,
    allow_llm: false,
    allow_proposal: false,
    allow_execution: false,
    requires_approval: true,
    max_tokens: 0,
    reason,
    payload,
  });

  return { ok: true as const, inhibited: true, reason, eventId: event.id, governance };
}
