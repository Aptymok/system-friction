import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_UNIVERSAL_LEARNING_QUARANTINE_CONTRACT = 'SFI-UNIVERSAL-LEARNING-QUARANTINE-1.0' as const;

export type UniversalLearningClass =
  | 'TEST_SYNTHETIC'
  | 'FAILED_EXPERIMENT'
  | 'OPERATIONAL_EVIDENCE'
  | 'CALIBRATED_RETURN';

export type UniversalLearningPromotionState =
  | 'QUARANTINED'
  | 'REVIEW_REQUIRED'
  | 'ELIGIBLE_FOR_ROOT_PROMOTION'
  | 'PROMOTED'
  | 'REJECTED';

type Row = Record<string, unknown>;

type UniversalCycleHistory = {
  ok?: boolean;
  cycleId?: string;
  events?: unknown[];
  cognitiveRuns?: unknown[];
  aiSyntheses?: unknown[];
  returns?: unknown[];
  returnContrasts?: unknown[];
  closures?: unknown[];
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function latest(values: unknown[] | undefined) {
  return Array.isArray(values) && values.length ? values[values.length - 1] : null;
}

function payload(value: unknown) {
  return row(row(value).payload);
}

function explicitClass(value: unknown): UniversalLearningClass | null {
  const candidate = text(value)?.toUpperCase();
  return candidate === 'TEST_SYNTHETIC'
    || candidate === 'FAILED_EXPERIMENT'
    || candidate === 'OPERATIONAL_EVIDENCE'
    || candidate === 'CALIBRATED_RETURN'
    ? candidate
    : null;
}

function learningState(classification: UniversalLearningClass): UniversalLearningPromotionState {
  if (classification === 'CALIBRATED_RETURN') return 'ELIGIBLE_FOR_ROOT_PROMOTION';
  if (classification === 'OPERATIONAL_EVIDENCE') return 'REVIEW_REQUIRED';
  return 'QUARANTINED';
}

function lastAiLearning(history: UniversalCycleHistory) {
  const event = latest(history.aiSyntheses);
  if (!event) return {};
  const eventPayload = payload(event);
  const synthesis = row(eventPayload.synthesis);
  return {
    eventId: text(row(event).event_id),
    primaryHypothesis: synthesis.primaryHypothesis ?? null,
    rivalHypotheses: Array.isArray(synthesis.rivalHypotheses) ? synthesis.rivalHypotheses : [],
    predictions: Array.isArray(synthesis.predictions) ? synthesis.predictions : [],
    expectedSignals: Array.isArray(synthesis.expectedSignals) ? synthesis.expectedSignals : [],
    contradictionSignals: Array.isArray(synthesis.contradictionSignals) ? synthesis.contradictionSignals : [],
    missingEvidence: Array.isArray(synthesis.missingEvidence) ? synthesis.missingEvidence : [],
    observationWindow: synthesis.observationWindow ?? null,
    confidence: typeof synthesis.confidence === 'number' ? synthesis.confidence : null,
  };
}

function lastClosureEnvelope(history: UniversalCycleHistory) {
  const event = [...(history.events ?? [])].reverse().find((item) => row(item).event_name === 'SFI_UNIVERSAL_CLOSURE_ENVELOPE_ACCEPTED');
  return event ? row(payload(event).closure) : {};
}

function hasCalibratedReturn(history: UniversalCycleHistory) {
  return Array.isArray(history.returnContrasts) && history.returnContrasts.length > 0
    && Array.isArray(history.returns) && history.returns.length > 0;
}

function inferLearningClass(history: UniversalCycleHistory, requested: Row): UniversalLearningClass {
  const explicit = explicitClass(requested.classification);
  if (explicit) return explicit;
  if (requested.synthetic === true || requested.test === true || requested.fixture === true) return 'TEST_SYNTHETIC';
  if (requested.failedExperiment === true) return 'FAILED_EXPERIMENT';
  if (hasCalibratedReturn(history)) return 'CALIBRATED_RETURN';
  return 'OPERATIONAL_EVIDENCE';
}

export function buildUniversalLearningCandidate(input: {
  history: UniversalCycleHistory;
  requested?: unknown;
  closureEventId?: string | null;
}) {
  const requested = row(input.requested);
  const classification = inferLearningClass(input.history, requested);
  const promotionState = learningState(classification);
  const aiLearning = lastAiLearning(input.history);
  const closure = lastClosureEnvelope(input.history);
  const latestReturn = latest(input.history.returns);
  const latestContrast = latest(input.history.returnContrasts);
  const latestRun = latest(input.history.cognitiveRuns);
  const cycleId = text(input.history.cycleId) ?? text(payload(latestRun).cycleId);

  const candidate = {
    contract: SFI_UNIVERSAL_LEARNING_QUARANTINE_CONTRACT,
    cycleId,
    classification,
    promotionState,
    eligibleForRootPromotion: promotionState === 'ELIGIBLE_FOR_ROOT_PROMOTION',
    learning: {
      primaryHypothesis: closure.primaryHypothesis ?? aiLearning.primaryHypothesis ?? null,
      rivalHypotheses: Array.isArray(closure.rivalHypotheses) ? closure.rivalHypotheses : aiLearning.rivalHypotheses ?? [],
      prediction: closure.prediction ?? (Array.isArray(aiLearning.predictions) ? aiLearning.predictions[0] ?? null : null),
      predictions: aiLearning.predictions ?? [],
      expectedSignals: Array.isArray(closure.expectedSignals) ? closure.expectedSignals : aiLearning.expectedSignals ?? [],
      contradictionSignals: Array.isArray(closure.contradictionSignals) ? closure.contradictionSignals : aiLearning.contradictionSignals ?? [],
      observedReturn: closure.observedReturn ?? payload(latestReturn).outcome ?? null,
      contrast: closure.contrast ?? (latestContrast ? payload(latestContrast) : null),
      updatedConfidence: closure.updatedConfidence ?? null,
      outcome: closure.outcome ?? payload(latestReturn).outcome ?? null,
      recurrenceAssessment: closure.recurrenceAssessment ?? null,
      limitations: Array.isArray(closure.limitations) ? closure.limitations : [],
      missingEvidence: Array.isArray(closure.missingEvidence) ? closure.missingEvidence : aiLearning.missingEvidence ?? [],
      conclusion: closure.conclusion ?? null,
      learningCandidate: closure.learningCandidate ?? requested.learningCandidate ?? null,
    },
    lineage: {
      runEventId: text(row(latestRun).event_id),
      aiSynthesisEventId: aiLearning.eventId ?? null,
      returnEventId: text(row(latestReturn).event_id),
      contrastEventId: text(row(latestContrast).event_id),
      closureEventId: input.closureEventId ?? null,
    },
    quarantineReason: classification === 'TEST_SYNTHETIC'
      ? 'Synthetic/test material is retained only for QA/audit and never enters institutional learning.'
      : classification === 'FAILED_EXPERIMENT'
        ? 'Failed experiment remains an audit/diagnostic trace and does not become doctrine.'
        : classification === 'OPERATIONAL_EVIDENCE'
          ? 'Operational observation may inform review but lacks calibrated return required for automatic eligibility.'
          : 'Calibrated return is eligible for ROOT review; eligibility is not promotion and does not establish truth.',
    epistemicBoundary: 'Cycle closure creates a quarantined learning candidate only. Candidate status does not make a hypothesis evidence, memory, canonical truth, or Cognitive Spine input.',
  };

  return candidate;
}

export async function recordUniversalLearningCandidate(input: {
  history: UniversalCycleHistory;
  requested?: unknown;
  actorId: string;
  tenantId: string;
  closureEventId?: string | null;
}) {
  const candidate = buildUniversalLearningCandidate({
    history: input.history,
    requested: input.requested,
    closureEventId: input.closureEventId,
  });
  if (!candidate.cycleId) return { ok: false as const, error: 'LEARNING_CANDIDATE_CYCLE_ID_MISSING', candidate };
  const lineage = Object.values(candidate.lineage).filter((value): value is string => typeof value === 'string' && value.length > 0);
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED',
    epistemicClass: 'derived',
    confidence: candidate.classification === 'CALIBRATED_RETURN' ? 0.9 : 0.65,
    payload: {
      actorId: input.actorId,
      tenantId: input.tenantId,
      ...candidate,
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'universal_learning_quarantine', sourceType: 'learning_candidate' },
    logbookId: `universal-cycle:${candidate.cycleId}`,
    lineage,
  });
  return event.ok
    ? { ok: true as const, eventId: String(event.data.event_id ?? ''), event: event.data, candidate }
    : { ok: false as const, error: event.error, candidate };
}

export async function readUniversalLearningQuarantine(limit = 120) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,lineage,occurred_at,hash_self')
    .in('event_name', [
      'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED',
      'SFI_UNIVERSAL_LEARNING_PROMOTED',
      'SFI_UNIVERSAL_LEARNING_REJECTED',
    ])
    .order('sequence', { ascending: false })
    .limit(Math.max(20, Math.min(400, limit)));
  if (result.error) return { ok: false as const, candidates: [], promotions: [], rejections: [], warnings: [result.error.message] };

  const events = rows(result.data);
  const promotions = events.filter((event) => event.event_name === 'SFI_UNIVERSAL_LEARNING_PROMOTED');
  const rejections = events.filter((event) => event.event_name === 'SFI_UNIVERSAL_LEARNING_REJECTED');
  const terminalCandidateIds = new Set([
    ...promotions.map((event) => text(payload(event).candidateEventId)).filter((value): value is string => Boolean(value)),
    ...rejections.map((event) => text(payload(event).candidateEventId)).filter((value): value is string => Boolean(value)),
  ]);
  const candidates = events.filter((event) => event.event_name === 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED' && !terminalCandidateIds.has(text(event.event_id) ?? ''));

  return {
    ok: true as const,
    candidates,
    promotions,
    rejections,
    warnings: [] as string[],
    summary: {
      quarantined: candidates.length,
      eligible: candidates.filter((event) => payload(event).eligibleForRootPromotion === true).length,
      promoted: promotions.length,
      rejected: rejections.length,
    },
  };
}

export async function readUniversalLearningCycleState(cycleId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,lineage,occurred_at,hash_self')
    .in('event_name', [
      'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED',
      'SFI_UNIVERSAL_LEARNING_PROMOTED',
      'SFI_UNIVERSAL_LEARNING_REJECTED',
    ])
    .eq('payload->>cycleId', cycleId)
    .order('sequence', { ascending: false })
    .limit(20);
  if (result.error) return { ok: false as const, events: [] as Row[], warning: result.error.message };
  return { ok: true as const, events: rows(result.data), warning: null };
}

export async function readUniversalLearningTerminalState(candidateEventId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,lineage,occurred_at,hash_self')
    .in('event_name', ['SFI_UNIVERSAL_LEARNING_PROMOTED', 'SFI_UNIVERSAL_LEARNING_REJECTED'])
    .eq('payload->>candidateEventId', candidateEventId)
    .order('sequence', { ascending: false })
    .limit(2);
  if (result.error) return { ok: false as const, terminal: null, warning: result.error.message };
  const terminal = rows(result.data)[0] ?? null;
  return {
    ok: true as const,
    terminal,
    state: terminal?.event_name === 'SFI_UNIVERSAL_LEARNING_PROMOTED'
      ? 'PROMOTED' as const
      : terminal?.event_name === 'SFI_UNIVERSAL_LEARNING_REJECTED'
        ? 'REJECTED' as const
        : null,
    warning: null,
  };
}

async function readCandidateEvent(candidateEventId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,lineage,occurred_at,hash_self')
    .eq('event_id', candidateEventId)
    .eq('event_name', 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED')
    .maybeSingle();
  if (result.error) return { ok: false as const, error: result.error.message, event: null };
  if (!result.data) return { ok: false as const, error: 'LEARNING_CANDIDATE_NOT_FOUND', event: null };
  return { ok: true as const, event: row(result.data) };
}

export async function promoteUniversalLearningCandidate(input: {
  candidateEventId: string;
  actorId: string;
  reviewNote?: string | null;
}) {
  const terminal = await readUniversalLearningTerminalState(input.candidateEventId);
  if (!terminal.ok) return { ok: false as const, error: 'LEARNING_TERMINAL_STATE_UNAVAILABLE', details: terminal.warning };
  if (terminal.terminal) {
    if (terminal.state === 'PROMOTED') {
      return { ok: true as const, idempotent: true as const, eventId: String(terminal.terminal.event_id ?? ''), event: terminal.terminal };
    }
    return { ok: false as const, error: 'LEARNING_CANDIDATE_ALREADY_TERMINAL', terminalState: terminal.state, terminalEventId: String(terminal.terminal.event_id ?? '') };
  }

  const candidateRead = await readCandidateEvent(input.candidateEventId);
  if (!candidateRead.ok || !candidateRead.event) return candidateRead;
  const candidatePayload = payload(candidateRead.event);
  if (candidatePayload.eligibleForRootPromotion !== true || text(candidatePayload.classification) !== 'CALIBRATED_RETURN') {
    return {
      ok: false as const,
      error: 'LEARNING_CANDIDATE_NOT_ELIGIBLE_FOR_PROMOTION',
      classification: candidatePayload.classification ?? null,
      promotionState: candidatePayload.promotionState ?? null,
    };
  }
  const lineage = Array.isArray(candidateRead.event.lineage)
    ? candidateRead.event.lineage.filter((item): item is string => typeof item === 'string')
    : [];
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_LEARNING_PROMOTED',
    epistemicClass: 'verified_contrast',
    confidence: 0.92,
    payload: {
      contract: SFI_UNIVERSAL_LEARNING_QUARANTINE_CONTRACT,
      candidateEventId: input.candidateEventId,
      cycleId: candidatePayload.cycleId ?? null,
      classification: candidatePayload.classification,
      promotionState: 'PROMOTED',
      learning: candidatePayload.learning ?? null,
      candidateLineage: candidatePayload.lineage ?? null,
      promotedBy: input.actorId,
      promotedAt: new Date().toISOString(),
      reviewNote: input.reviewNote ?? null,
      epistemicBoundary: 'ROOT authorizes institutional use of a calibrated learning record but does not upgrade its claims beyond VERIFIED_CONTRAST or erase uncertainty, provenance, rival hypotheses, or residual error.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.actorId, sourceType: 'root_learning_promotion' },
    logbookId: `universal-cycle:${text(candidatePayload.cycleId) ?? 'unknown'}`,
    lineage: [input.candidateEventId, ...lineage],
  });
  return event.ok
    ? { ok: true as const, idempotent: false as const, eventId: String(event.data.event_id ?? ''), event: event.data }
    : { ok: false as const, error: event.error };
}

export async function rejectUniversalLearningCandidate(input: {
  candidateEventId: string;
  actorId: string;
  reason: string;
}) {
  const terminal = await readUniversalLearningTerminalState(input.candidateEventId);
  if (!terminal.ok) return { ok: false as const, error: 'LEARNING_TERMINAL_STATE_UNAVAILABLE', details: terminal.warning };
  if (terminal.terminal) {
    if (terminal.state === 'REJECTED') {
      return { ok: true as const, idempotent: true as const, eventId: String(terminal.terminal.event_id ?? ''), event: terminal.terminal };
    }
    return { ok: false as const, error: 'LEARNING_CANDIDATE_ALREADY_TERMINAL', terminalState: terminal.state, terminalEventId: String(terminal.terminal.event_id ?? '') };
  }

  const candidateRead = await readCandidateEvent(input.candidateEventId);
  if (!candidateRead.ok || !candidateRead.event) return candidateRead;
  const candidatePayload = payload(candidateRead.event);
  const candidateLineage = row(candidatePayload.lineage);
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_LEARNING_REJECTED',
    epistemicClass: 'derived',
    confidence: 1,
    payload: {
      contract: SFI_UNIVERSAL_LEARNING_QUARANTINE_CONTRACT,
      candidateEventId: input.candidateEventId,
      cycleId: candidatePayload.cycleId ?? null,
      classification: candidatePayload.classification ?? null,
      promotionState: 'REJECTED',
      candidateLineage,
      rejectedBy: input.actorId,
      rejectedAt: new Date().toISOString(),
      reason: input.reason,
      epistemicBoundary: 'Rejection prevents institutional learning promotion but preserves the immutable audit lineage of the original run and candidate.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.actorId, sourceType: 'root_learning_rejection' },
    logbookId: `universal-cycle:${text(candidatePayload.cycleId) ?? 'unknown'}`,
    lineage: [input.candidateEventId],
  });
  return event.ok
    ? { ok: true as const, idempotent: false as const, eventId: String(event.data.event_id ?? ''), event: event.data }
    : { ok: false as const, error: event.error };
}
