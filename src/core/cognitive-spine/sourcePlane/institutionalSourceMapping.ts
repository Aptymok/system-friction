import type {
  AssessedEpistemicClass,
  CognitiveSpineSourceRecord,
} from '../contracts/snapshot';
import { canonicalSha256, normalizeTimestamp, sortedUnique } from '../serialization/canonicalSerialize';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
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
 * SFI Lab hypotheses are append-only hypothesis records. Their kind is
 * explicit in the source schema; this adapter does not upgrade them to
 * evidence or assign a new epistemic class. Every open hypothesis contributes
 * verification debt until a separate epistemic/governance process resolves it.
 */
export function labHypothesisToCognitiveSpineSource(input: {
  hypothesis: Row;
  analysis: Row;
}): CognitiveSpineSourceRecord | null {
  const id = text(input.hypothesis.id);
  const analysisId = text(input.hypothesis.analysis_id) ?? text(input.analysis.id);
  const createdAt = text(input.hypothesis.created_at);
  if (!id || !analysisId || !createdAt) return null;

  return {
    ref: `sfi_hypotheses:${id}`,
    kind: 'HYPOTHESIS',
    recordedAt: normalizeTimestamp(createdAt),
    sourceHash: canonicalSha256({
      store: 'sfi_hypotheses',
      id,
      analysisId,
      title: text(input.hypothesis.title),
      status: text(input.hypothesis.status),
      confidence: typeof input.hypothesis.confidence === 'number' ? input.hypothesis.confidence : Number(input.hypothesis.confidence ?? 0),
      payload: input.hypothesis.payload ?? null,
      analysis: {
        mode: text(input.analysis.mode),
        source: text(input.analysis.source),
        dataMode: text(input.analysis.data_mode),
      },
      createdAt: normalizeTimestamp(createdAt),
    }),
    sourceVersion: 'SFI-LAB-HYPOTHESIS-1.0',
    ancestryRoots: [`sfi_lab_analyses:${analysisId}`],
    visibilityProfiles: ['*'],
    debtType: 'VERIFICATION',
  };
}

const GOVERNANCE_KIND_BY_EVENT: Record<string, CognitiveSpineSourceRecord['kind']> = {
  'acp.proposal.design_approved': 'DECISION',
  'acp.proposal.rejected': 'DECISION',
  'acp.proposal.frozen': 'FREEZE',
  'acp.proposal.waiting_evidence': 'QUESTION',
};

/**
 * Governance state is reconstructed from immutable epistemic events rather
 * than the mutable current row in action_proposals. This preserves historical
 * cutoffs and prevents retroactive rewriting of earlier snapshots.
 */
export function governanceEventToCognitiveSpineSource(event: Row): CognitiveSpineSourceRecord | null {
  const eventName = text(event.event_name);
  const eventId = text(event.event_id);
  const occurredAt = text(event.occurred_at);
  const hashSelf = text(event.hash_self);
  const kind = eventName ? GOVERNANCE_KIND_BY_EVENT[eventName] : undefined;
  if (!eventName || !eventId || !occurredAt || !hashSelf || !kind) return null;

  const epistemicClass = assessedClass(event.epistemic_class);
  const lineage = sortedUnique(strings(event.lineage));

  return {
    ref: `epistemic_events:${eventId}`,
    kind,
    recordedAt: normalizeTimestamp(occurredAt),
    sourceHash: hashSelf,
    sourceVersion: text(event.schema_version) ?? undefined,
    ...(epistemicClass ? {
      epistemicAssessmentRef: eventId,
      epistemicClass,
    } : {}),
    ancestryRoots: lineage,
    visibilityProfiles: ['*'],
    ...(kind === 'QUESTION' ? { debtType: 'VERIFICATION' as const } : {}),
  };
}

export function isCognitiveSpineGovernanceEventName(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(GOVERNANCE_KIND_BY_EVENT, value);
}

export function governancePayloadForAudit(event: Row): Row {
  return record(event.payload);
}
