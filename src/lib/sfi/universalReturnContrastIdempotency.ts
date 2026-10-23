/**
 * Existing empirical RETURN owner — read-only semantic comparison.
 *
 * The same RETURN cannot create an unlimited series of LLM classification
 * requests just because calibration is blocked (REQUIRES_REVIEW). A new
 * prediction, method discriminator, observed outcome or validated evidence
 * changes this fingerprint and permits one new governed attempt.
 *
 * No authority, evidence, closure or publication is derived from this hash.
 */
import { createHash } from 'node:crypto';

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue : {};
}
function canonical(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    const source = record(value);
    return Object.fromEntries(Object.keys(source).sort()
      .map(key => [key, canonical(source[key])]));
  }
  return value;
}
function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

export const SFI_RETURN_CONTRAST_IDEMPOTENCY = 'SFI-RETURN-CONTRAST-IDEMPOTENCY-1.0' as const;

export type ReturnContrastInputs = {
  returnEventId: string;
  primaryHypothesis: unknown;
  rivalHypotheses: unknown[];
  predictions: unknown[];
  discriminatingObservations: unknown[];
  stoppingConditions: unknown[];
  expectedSignals: string[];
  contradictionSignals: string[];
  observationWindows: string[];
  observedReturn: unknown;
  declaredReturnEvidenceRefs: string[];
  returnEvidenceRefs: string[];
  rejectedReturnEvidenceRefs: string[];
  evidenceValidationWarning: string | null;
  evidenceValidationSucceeded: boolean;
  returnTraceability: 'VERIFIED_EVIDENCE_LINKED' | 'DECLARED_BUT_UNVERIFIED' | 'UNLINKED_OBSERVATION';
};

const COMPARABLE_FIELDS = [
  'primaryHypothesis',
  'rivalHypotheses',
  'predictions',
  'discriminatingObservations',
  'stoppingConditions',
  'expectedSignals',
  'contradictionSignals',
  'observationWindows',
  'observedReturn',
  'declaredReturnEvidenceRefs',
  'returnEvidenceRefs',
  'rejectedReturnEvidenceRefs',
  'evidenceValidationWarning',
  'returnTraceability',
] as const;

export function returnContrastInputFingerprint(input: ReturnContrastInputs): string {
  if (!input.returnEventId.trim()) throw new Error('RETURN_EVENT_ID_REQUIRED');
  return createHash('sha256').update(JSON.stringify(canonical({
    contract: SFI_RETURN_CONTRAST_IDEMPOTENCY,
    ...input,
  }))).digest('hex');
}

/**
 * A known contrast is reusable ONLY for the same immutable RETURN source.
 * New records contain a full-fingerprint: legacy records from the existing
 * 1.2 owner are compared field-for-field (no trust in classification labels).
 * Missing legacy fields, a degraded evidence read, or any changed dependency
 * forces an authorized new attempt rather than silently suppressing it.
 */
export function reusableReturnContrast(
  existingContrast: unknown,
  input: ReturnContrastInputs,
): boolean {
  const event = record(existingContrast);
  const payload = record(event.payload);
  if (event.event_name !== 'SFI_UNIVERSAL_RETURN_CONTRASTED'
      || !Array.isArray(event.lineage)
      || !event.lineage.includes(input.returnEventId)) return false;
  const fingerprint = returnContrastInputFingerprint(input);
  if (typeof payload.contrastInputFingerprint === 'string') {
    return payload.contrastInputFingerprint === fingerprint;
  }
  // Backwards-compatible containment for historical SFI-RETURN-CONTRAST-1.2
  // records. A past failed evidence query is not proof of unchanged evidence.
  if (payload.contract !== 'SFI-RETURN-CONTRAST-1.2' || !input.evidenceValidationSucceeded) return false;
  return COMPARABLE_FIELDS.every(key =>
    Object.prototype.hasOwnProperty.call(payload, key)
      && same(payload[key], input[key]));
}
