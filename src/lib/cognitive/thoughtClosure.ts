import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { evaluateThoughtInhibition } from '@/lib/governance/thoughtInhibition';
import { evaluateCognitiveClosure, type CognitiveEvidence } from '../../../packages/cognitive-runtime/src';

type ThoughtClosureInput = {
  actorId: string;
  thoughtType?: string;
  claim?: string;
  evidence?: CognitiveEvidence[];
  payload?: Record<string, unknown>;
};

function inhibitionType(thoughtType: string) {
  return thoughtType === 'CONTRADICTION' ? 'CONTRADICCION' : thoughtType;
}

export async function evaluateThoughtClosure(input: ThoughtClosureInput) {
  const closure = evaluateCognitiveClosure({
    thoughtType: input.thoughtType,
    claim: input.claim,
    evidence: input.evidence,
  });
  const evidenceTypes = closure.evidenceTypes;

  if (closure.inhibited) {
    const inhibition = await evaluateThoughtInhibition({
      actorId: input.actorId,
      thoughtType: inhibitionType(closure.thoughtType),
      evidenceCount: closure.evidenceCount,
      evidenceTypes,
      reason: closure.reason ?? 'thought_inhibited',
      payload: {
        claim: closure.claim,
        closure,
        ...(input.payload ?? {}),
      },
    });

    return {
      ok: inhibition.ok,
      data: closure,
      inhibition,
    };
  }

  const event = await appendEpistemicEvent({
    eventName: 'cognitive.thought.closed',
    epistemicClass: 'derived',
    confidence: closure.confidence,
    payload: {
      closure,
      evidence: input.evidence ?? [],
      ...(input.payload ?? {}),
    },
    occurredAt: new Date().toISOString(),
    source: {
      sourceId: 'SYSTEM_FRICTION_INSTITUTE',
      sourceType: 'cognitive_runtime',
    },
    logbookId: 'BR',
    lineage: evidenceTypes,
  });

  if (!event.ok) {
    return {
      ok: false as const,
      error: event.error,
      details: 'details' in event ? event.details : undefined,
      data: closure,
    };
  }

  return {
    ok: true as const,
    data: {
      ...closure,
      eventId: event.data.id,
    },
  };
}

export async function readRecentThoughtClosures(limit = 5) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('epistemic_events')
    .select('id,event_id,event_name,confidence,payload,occurred_at,created_at')
    .eq('event_name', 'cognitive.thought.closed')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return Array.isArray(data) ? data : [];
}
