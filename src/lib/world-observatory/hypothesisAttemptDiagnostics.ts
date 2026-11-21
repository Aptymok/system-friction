/**
 * Read-only, bounded view of a persisted World hypothesis attempt.
 *
 * This module never creates evidence, hypotheses, predictions or RETURN.
 * A missing attempt remains NOT_OBSERVED; the latest World hypothesis
 * row alone cannot explain the absence of new proposals.
 */
type Row = Record<string, unknown>;

const record = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};

const boundedText = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const boundedNonnegativeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

function warningClass(value: unknown): string | null {
  const warning = boundedText(value, 200);
  if (!warning) return null;
  if (/^hypothesis_generation_[a-z_]+$/i.test(warning)) return warning.toUpperCase();
  if (/^hypothesis_insert:/i.test(warning)) return 'HYPOTHESIS_INSERT_FAILURE';
  if (/^no_recent_observations$/i.test(warning)) return 'NO_RECENT_OBSERVATIONS';
  if (/provider|quota|rate.limit|unavailable|model/i.test(warning)) return 'MODEL_OR_PROVIDER_UNAVAILABLE';
  return 'OTHER_WARNING';
}

export function summarizeWorldHypothesisAttempt(value: unknown) {
  if (value == null) return {
    state: 'NOT_OBSERVED' as const,
    boundary: 'No persisted World attempt receipt was returned; this is not evidence of zero attempts.',
  };

  const event = record(value);
  const payload = record(event.payload);
  // Use a narrow PostgREST JSONB projection, not the full stored event payload.
  // Legacy direct payload shape is retained for pure unit tests only.
  const hypothesis = Object.prototype.hasOwnProperty.call(event, 'stageOk')
    ? {
        ok: event.stageOk,
        created: event.created,
        considered: event.considered,
        clusters: event.clusters,
        warnings: event.warnings,
        results: event.results,
      }
    : record(payload.hypothesis);
  const hasHypothesisStage = typeof hypothesis.ok === 'boolean';
  const results = Array.isArray(hypothesis.results) ? hypothesis.results.slice(0, 12).map(record) : [];
  const counts: Record<string, number> = {};
  for (const result of results) {
    const state = boundedText(result.state, 48) ?? 'UNSPECIFIED';
    counts[state] = (counts[state] ?? 0) + 1;
  }
  const rawWarnings = Array.isArray(hypothesis.warnings) ? hypothesis.warnings : [];
  const warningClasses = [...new Set(rawWarnings.map(warningClass).filter((item): item is string => item !== null))].slice(0, 8);

  return {
    state: hasHypothesisStage ? 'RECORDED' as const : 'STAGE_NOT_RECORDED' as const,
    receiptEventId: boundedText(event.event_id, 100),
    receiptName: boundedText(event.event_name, 100),
    receiptAt: boundedText(event.occurred_at, 48),
    stageOk: hasHypothesisStage ? hypothesis.ok : null,
    created: boundedNonnegativeNumber(hypothesis.created),
    considered: boundedNonnegativeNumber(hypothesis.considered),
    clusters: boundedNonnegativeNumber(hypothesis.clusters),
    resultStateCounts: counts,
    resultsSample: results.slice(0, 5).map((result) => ({
      state: boundedText(result.state, 48) ?? 'UNSPECIFIED',
      evidenceCount: boundedNonnegativeNumber(result.evidenceCount),
      sourceFamilies: Array.isArray(result.sourceFamilies)
        ? result.sourceFamilies.filter((item): item is string => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 60))
        : [],
      abstentionReason: boundedText(result.abstentionReason, 320),
      warningClass: warningClass(result.warning),
    })),
    warningClasses,
    resultLimit: 12,
    boundary: 'Read-only diagnostic excerpt of the newest persisted World attempt receipt. This is not a new observation, explanation of causality, or proof that hypotheses are valid. Result counts may be partial if the receipt contains more than 12 entries.',
  };
}
