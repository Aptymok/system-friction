import 'server-only';

import type { CognitiveSpineSourceRecord } from '@/core/cognitive-spine/contracts/snapshot';
import {
  COGNITIVE_SPINE_CAUSAL_LIFECYCLE_EVENTS,
  causalLifecycleEventToCognitiveSpineSource,
} from '@/core/cognitive-spine/sourcePlane/causalLifecycleSourceMapping';
import { governanceEventToCognitiveSpineSource } from '@/core/cognitive-spine/sourcePlane/institutionalSourceMapping';
import { canonicalSha256, normalizeTimestamp, sortedUnique } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const MAX_PROMOTED_LEARNING_EVENTS = 96;
const MAX_GOVERNANCE_EVENTS = 128;
const MAX_CAUSAL_LIFECYCLE_EVENTS = 192;

const GOVERNANCE_EVENT_NAMES = [
  'acp.proposal.design_approved',
  'acp.proposal.rejected',
  'acp.proposal.frozen',
  'acp.proposal.waiting_evidence',
] as const;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function number01(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.max(0, Math.min(1, parsed));
}

export type AdditionalCognitiveSpineSourceSummary = {
  /** Compatibility name retained for current consumers. These are now only ROOT-promoted universal learning hypotheses. */
  labHypotheses: number;
  promotedUniversalHypotheses: number;
  governanceDecisions: number;
  governanceFreezes: number;
  governanceQuestions: number;
  causalLifecycleEvents: number;
};

function hypothesisStatement(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  const item = record(value);
  return text(item.statement) ?? text(item.hypothesis) ?? text(item.claim) ?? text(item.description);
}

function promotedLearningHypotheses(event: Row): CognitiveSpineSourceRecord[] {
  const eventId = text(event.event_id);
  const occurredAt = text(event.occurred_at);
  const hashSelf = text(event.hash_self);
  if (!eventId || !occurredAt || !hashSelf) return [];

  const payload = record(event.payload);
  if (text(payload.promotionState) !== 'PROMOTED' || text(payload.classification) !== 'CALIBRATED_RETURN') return [];
  const learning = record(payload.learning);
  const primary = hypothesisStatement(learning.primaryHypothesis);
  const rivals = Array.isArray(learning.rivalHypotheses)
    ? learning.rivalHypotheses.map(hypothesisStatement).filter((value): value is string => Boolean(value))
    : [];
  const statements = [primary, ...rivals].filter((value): value is string => Boolean(value));
  const lineage = Array.isArray(event.lineage)
    ? event.lineage.filter((item): item is string => typeof item === 'string')
    : [];
  const confidence = number01(learning.updatedConfidence ?? event.confidence);

  return statements.map((statement, index): CognitiveSpineSourceRecord => ({
    ref: `epistemic_events:${eventId}:promoted-learning:hypothesis:${index}`,
    kind: 'HYPOTHESIS',
    recordedAt: normalizeTimestamp(occurredAt),
    sourceHash: canonicalSha256({
      eventHash: hashSelf,
      candidateEventId: payload.candidateEventId ?? null,
      cycleId: payload.cycleId ?? null,
      statement,
      role: index === 0 ? 'primary' : 'rival',
      confidence,
    }),
    sourceVersion: text(event.schema_version) ?? 'SFI-UNIVERSAL-LEARNING-QUARANTINE-1.0',
    epistemicAssessmentRef: eventId,
    epistemicClass: 'VERIFIED_CONTRAST',
    ancestryRoots: sortedUnique([...lineage, `epistemic_events:${eventId}`]),
    visibilityProfiles: ['*'],
  }));
}

/**
 * Historical Cognitive Spine state is reconstructed from immutable events.
 *
 * Critical learning boundary:
 * - raw SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED hypotheses DO NOT enter the Spine;
 * - closed cycles DO NOT enter the Spine merely because they completed;
 * - SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED remains quarantined;
 * - only ROOT-governed SFI_UNIVERSAL_LEARNING_PROMOTED events classified as
 *   CALIBRATED_RETURN may contribute universal-cycle hypotheses.
 *
 * Governance and causal lifecycle records remain observable as records, not as
 * proof that their claims are true or causally successful.
 */
export async function readAdditionalInstitutionalCognitiveSpineSources(sourceCutoff: string): Promise<{
  records: CognitiveSpineSourceRecord[];
  warnings: string[];
  summary: AdditionalCognitiveSpineSourceSummary;
}> {
  const cutoff = normalizeTimestamp(sourceCutoff);
  const db = createServiceSupabaseClient();
  const warnings: string[] = [];

  const [promotedLearningResult, governanceResult, causalLifecycleResult] = await Promise.all([
    db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,confidence,schema_version,payload,lineage,occurred_at,hash_self')
      .eq('event_name', 'SFI_UNIVERSAL_LEARNING_PROMOTED')
      .lte('occurred_at', cutoff)
      .order('occurred_at', { ascending: false })
      .limit(MAX_PROMOTED_LEARNING_EVENTS),
    db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,schema_version,payload,lineage,occurred_at,hash_self')
      .in('event_name', [...GOVERNANCE_EVENT_NAMES])
      .lte('occurred_at', cutoff)
      .order('occurred_at', { ascending: false })
      .limit(MAX_GOVERNANCE_EVENTS),
    db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,schema_version,payload,lineage,occurred_at,hash_self')
      .in('event_name', [...COGNITIVE_SPINE_CAUSAL_LIFECYCLE_EVENTS])
      .lte('occurred_at', cutoff)
      .order('occurred_at', { ascending: false })
      .limit(MAX_CAUSAL_LIFECYCLE_EVENTS),
  ]);

  if (promotedLearningResult.error) {
    warnings.push(`cognitive_spine_promoted_learning_unavailable:${promotedLearningResult.error.message}`);
  }
  if (governanceResult.error) {
    warnings.push(`cognitive_spine_governance_events_unavailable:${governanceResult.error.message}`);
  }
  if (causalLifecycleResult.error) {
    warnings.push(`cognitive_spine_causal_lifecycle_unavailable:${causalLifecycleResult.error.message}`);
  }

  const records: CognitiveSpineSourceRecord[] = [];
  let promotedUniversalHypotheses = 0;
  for (const event of rows(promotedLearningResult.data)) {
    const mapped = promotedLearningHypotheses(event);
    records.push(...mapped);
    promotedUniversalHypotheses += mapped.length;
  }

  let governanceDecisions = 0;
  let governanceFreezes = 0;
  let governanceQuestions = 0;
  for (const event of rows(governanceResult.data)) {
    const mapped = governanceEventToCognitiveSpineSource(event);
    if (!mapped) {
      warnings.push(`cognitive_spine_governance_event_mapping_failed:${text(event.event_id) ?? 'unknown'}`);
      continue;
    }
    records.push(mapped);
    if (mapped.kind === 'DECISION') governanceDecisions += 1;
    if (mapped.kind === 'FREEZE') governanceFreezes += 1;
    if (mapped.kind === 'QUESTION') governanceQuestions += 1;
  }

  let causalLifecycleEvents = 0;
  for (const event of rows(causalLifecycleResult.data)) {
    const mapped = causalLifecycleEventToCognitiveSpineSource(event);
    if (!mapped) {
      warnings.push(`cognitive_spine_causal_lifecycle_mapping_failed:${text(event.event_id) ?? 'unknown'}`);
      continue;
    }
    records.push(mapped);
    causalLifecycleEvents += 1;
  }

  return {
    records,
    warnings: sortedUnique(warnings),
    summary: {
      labHypotheses: promotedUniversalHypotheses,
      promotedUniversalHypotheses,
      governanceDecisions,
      governanceFreezes,
      governanceQuestions,
      causalLifecycleEvents,
    },
  };
}
