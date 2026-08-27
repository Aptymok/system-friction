import type {
  AssessedEpistemicClass,
  CognitiveSpineSourceRecord,
} from '../contracts/snapshot';
import { normalizeTimestamp, sortedUnique } from '../serialization/canonicalSerialize';

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function assessedClass(value: unknown): AssessedEpistemicClass | null {
  const normalized = text(value)?.toLowerCase() ?? null;
  if (normalized === 'observed') return 'OBSERVED';
  if (normalized === 'declared') return 'DECLARED';
  if (normalized === 'derived') return 'DERIVED';
  if (normalized === 'inferred') return 'INFERRED';
  if (normalized === 'simulated') return 'SIMULATED';
  if (normalized === 'projected') return 'PROJECTED';
  if (normalized === 'verified_contrast') return 'VERIFIED_CONTRAST';
  if (normalized === 'invalidated') return 'INVALIDATED';
  return null;
}

/**
 * Events that make a governed proposal path causally reconstructable by later
 * Cognitive Spine snapshots. Governance decisions themselves remain mapped by
 * institutionalSourceMapping.ts so DECISION/FREEZE/QUESTION semantics are not
 * duplicated here.
 */
export const COGNITIVE_SPINE_CAUSAL_LIFECYCLE_EVENTS = [
  'cognitive_spine.runtime.proposal_created',
  'acp.proposal.queued',
  'cognitive_spine.proposal.field_case_linked',
  'SFI_PROPOSAL_EXECUTION_OBSERVED',
  'SFI_PROPOSAL_RETURN_RECORDED',
  'acp.proposal.outcome_recorded',
  'SFI_REALITY_CALIBRATED',
] as const;

const CAUSAL_EVENT_NAMES = new Set<string>(COGNITIVE_SPINE_CAUSAL_LIFECYCLE_EVENTS);

/**
 * Preserve a causal lifecycle event as an EVENT source record using its
 * append-only epistemic-event hash. This mapper does not infer missing stages,
 * upgrade epistemic class, or claim causal success. A later CPRT-B assessment
 * decides whether the path is complete.
 */
export function causalLifecycleEventToCognitiveSpineSource(event: Row): CognitiveSpineSourceRecord | null {
  const eventName = text(event.event_name);
  const eventId = text(event.event_id);
  const occurredAt = text(event.occurred_at);
  const hashSelf = text(event.hash_self);
  if (!eventName || !CAUSAL_EVENT_NAMES.has(eventName) || !eventId || !occurredAt || !hashSelf) return null;

  const epistemicClass = assessedClass(event.epistemic_class);
  const lineage = sortedUnique(strings(event.lineage));

  return {
    ref: `epistemic_events:${eventId}`,
    kind: 'EVENT',
    recordedAt: normalizeTimestamp(occurredAt),
    sourceHash: hashSelf,
    sourceVersion: text(event.schema_version) ?? undefined,
    ...(epistemicClass ? {
      epistemicAssessmentRef: eventId,
      epistemicClass,
    } : {}),
    ancestryRoots: lineage,
    visibilityProfiles: ['*'],
  };
}

export function isCognitiveSpineCausalLifecycleEventName(value: string): boolean {
  return CAUSAL_EVENT_NAMES.has(value);
}
