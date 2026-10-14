import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readGovernanceRuntime } from './governanceRuntime';
import { processEpistemicEvent } from '@/core/memory/institutionalEventPipeline';

const SCHEMA_VERSION = '2026-05-27.sfi-governance-d3';

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
  const inserted = await appendEpistemicEvent({
    eventId,
    eventName: 'governance.thought.inhibited',
    logbookId: 'BR',
    epistemicClass: 'observed',
    schemaVersion: SCHEMA_VERSION,
    source: { sourceId: 'SFI_RUNTIME', sourceType: 'governance' },
    actorId: input.actorId,
    nodeId: null,
    confidence: 1,
    payload,
    lineage: governance.eventId ? [governance.eventId] : [],
    occurredAt,
  });
  if (!inserted.ok) {
    return { ok: false as const, inhibited: true, error: 'thought_inhibition_event_failed', details: inserted.details ?? inserted.error, governance };
  }
  const event = inserted.data;
  if (!event?.id) {
    return { ok: false as const, inhibited: true, error: 'thought_inhibition_event_receipt_missing', governance };
  }
  const hashSelf = event.hash_self;

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

  // ADR-018: pasa por el pipeline (MemoryPolicyValidator → IMW), no llama a
  // InstitutionalMemoryWriter directo.
  await processEpistemicEvent({
    id: event.id,
    event_id: eventId,
    event_name: 'governance.thought.inhibited',
    logbook_id: 'BR',
    epistemic_class: 'observed',
    confidence: 1,
    payload,
    occurred_at: occurredAt,
    created_at: occurredAt,
    hash_self: hashSelf,
  }).catch(() => null);

  return { ok: true as const, inhibited: true, reason, eventId: event.id, governance };
}