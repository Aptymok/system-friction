import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_CT_ADAPTIVE_LEARNING_CONTEXT = 'SFI-CT-ADAPTIVE-LEARNING-1.0' as const;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown, max = 12) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, max)
    : [];
}

function bounded(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 1200);
  if (depth >= 4) return '[depth_limit]';
  if (Array.isArray(value)) return value.slice(0, 16).map((item) => bounded(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Row).slice(0, 24).map(([key, item]) => [key, bounded(item, depth + 1)]));
  }
  return String(value).slice(0, 200);
}

export async function readAdaptiveUniversalLearningContext(limit = 40) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('sequence,event_id,event_name,epistemic_class,payload,lineage,occurred_at')
    .in('event_name', [
      'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED',
      'SFI_UNIVERSAL_LEARNING_PROMOTED',
      'SFI_UNIVERSAL_LEARNING_REJECTED',
    ])
    .order('sequence', { ascending: false })
    .limit(Math.max(20, Math.min(160, limit * 4)));

  if (result.error) {
    return {
      contract: SFI_CT_ADAPTIVE_LEARNING_CONTEXT,
      generatedAt: new Date().toISOString(),
      adaptiveCandidates: [],
      promotedCandidateIds: [],
      rejectedCandidateIds: [],
      warning: result.error.message,
      boundary: 'Adaptive learning is unavailable. No fallback claim is substituted.',
    };
  }

  const events = (result.data ?? []) as Row[];
  const promotedCandidateIds = new Set<string>();
  const rejectedCandidateIds = new Set<string>();
  for (const event of events) {
    const payload = row(event.payload);
    const candidateEventId = text(payload.candidateEventId);
    if (!candidateEventId) continue;
    if (event.event_name === 'SFI_UNIVERSAL_LEARNING_PROMOTED') promotedCandidateIds.add(candidateEventId);
    if (event.event_name === 'SFI_UNIVERSAL_LEARNING_REJECTED') rejectedCandidateIds.add(candidateEventId);
  }

  const adaptiveCandidates = events
    .filter((event) => event.event_name === 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED')
    .filter((event) => {
      const eventId = text(event.event_id);
      if (!eventId || promotedCandidateIds.has(eventId) || rejectedCandidateIds.has(eventId)) return false;
      const payload = row(event.payload);
      return text(payload.classification)?.toUpperCase() === 'CALIBRATED_RETURN'
        && payload.eligibleForRootPromotion === true;
    })
    .slice(0, limit)
    .map((event) => {
      const payload = row(event.payload);
      const learning = row(payload.learning);
      const lineage = row(payload.lineage);
      return {
        candidateEventId: text(event.event_id),
        cycleId: text(payload.cycleId),
        occurredAt: text(event.occurred_at),
        classification: 'CALIBRATED_RETURN',
        authority: 'ADAPTIVE_NON_CANONICAL',
        primaryHypothesis: bounded(learning.primaryHypothesis),
        rivalHypotheses: bounded(learning.rivalHypotheses),
        predictions: bounded(learning.predictions),
        expectedSignals: strings(learning.expectedSignals),
        contradictionSignals: strings(learning.contradictionSignals),
        observedReturn: bounded(learning.observedReturn),
        contrast: bounded(learning.contrast),
        updatedConfidence: typeof learning.updatedConfidence === 'number' ? learning.updatedConfidence : null,
        outcome: bounded(learning.outcome),
        limitations: bounded(learning.limitations),
        sourceLineage: {
          runEventId: text(lineage.runEventId),
          aiSynthesisEventId: text(lineage.aiSynthesisEventId),
          returnEventId: text(lineage.returnEventId),
          contrastEventId: text(lineage.contrastEventId),
          closureEventId: text(lineage.closureEventId),
        },
      };
    });

  return {
    contract: SFI_CT_ADAPTIVE_LEARNING_CONTEXT,
    generatedAt: new Date().toISOString(),
    adaptiveCandidates,
    promotedCandidateIds: [...promotedCandidateIds],
    rejectedCandidateIds: [...rejectedCandidateIds],
    warning: null,
    boundary: 'Evidence-complete calibrated RETURN candidates may inform future cognition as adaptive non-canonical context. They are never appended to KernelEvidence and cannot mutate canon or authority without the existing promotion decision.',
  };
}
