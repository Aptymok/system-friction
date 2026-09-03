import {
  deriveExecutionEpistemicState,
  readExecutionRecords,
  type SfiExecutionRecord,
} from './executionRecords';

export const SFI_GENAI_ASSURANCE_CONTRACT = 'SFI-GENAI-ASSURANCE-1.0' as const;

type Row = Record<string, unknown>;
type Observation<T> = { value: T | null; observation: 'OBSERVED' | 'NOT_OBSERVED' };

type RatioMetric = Observation<number> & {
  numerator: number;
  denominator: number;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 160): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function ratio(numerator: number, denominator: number): RatioMetric {
  return denominator > 0
    ? { value: numerator / denominator, observation: 'OBSERVED', numerator, denominator }
    : { value: null, observation: 'NOT_OBSERVED', numerator, denominator };
}

function observedNumber(value: number | null): Observation<number> {
  return value === null ? { value: null, observation: 'NOT_OBSERVED' } : { value, observation: 'OBSERVED' };
}

function eventName(value: unknown) {
  const source = row(value);
  return text(source.event_name ?? source.eventName, 160);
}

function eventPayload(value: unknown) {
  return row(row(value).payload);
}

function isGenAiExecution(record: SfiExecutionRecord) {
  return record.telemetry.provider.observation === 'OBSERVED'
    || record.interpretation.epistemicClass === 'INFERENCE'
    || Boolean(record.errors.llm);
}

function telemetryCoverage(records: SfiExecutionRecord[]) {
  const eligible = records.filter(isGenAiExecution);
  const countObserved = (selector: (record: SfiExecutionRecord) => { observation: 'OBSERVED' | 'NOT_OBSERVED' }) =>
    eligible.filter((record) => selector(record).observation === 'OBSERVED').length;
  return {
    eligibleExecutions: eligible.length,
    provider: ratio(countObserved((record) => record.telemetry.provider), eligible.length),
    model: ratio(countObserved((record) => record.telemetry.model), eligible.length),
    inputTokens: ratio(countObserved((record) => record.telemetry.inputTokens), eligible.length),
    outputTokens: ratio(countObserved((record) => record.telemetry.outputTokens), eligible.length),
    providerCost: ratio(countObserved((record) => record.telemetry.providerCost), eligible.length),
    latencyMs: ratio(countObserved((record) => record.telemetry.latencyMs), eligible.length),
  };
}

function structuredInferenceQuality(records: SfiExecutionRecord[]) {
  const observed = records.filter((record) => record.interpretation.epistemicClass === 'INFERENCE');
  const complete = observed.filter((record) => record.interpretation.status === 'COMPLETE').length;
  const failedOrDegraded = observed.filter((record) => ['FAILED', 'DEGRADED'].includes(record.interpretation.status ?? '')).length;
  return {
    observedInferenceExecutions: observed.length,
    complete,
    failedOrDegraded,
    structuredInferenceCompletionRate: ratio(complete, observed.length),
    boundary: 'RUNTIME_SCHEMA_COMPLETION_NOT_SEMANTIC_TRUTH_OR_MODEL_ACCURACY' as const,
  };
}

function evidenceSufficiency(records: SfiExecutionRecord[]) {
  const inferenceRecords = records.filter((record) => record.interpretation.epistemicClass === 'INFERENCE');
  const states = inferenceRecords.map(deriveExecutionEpistemicState);
  const sufficient = states.filter((state) => state === 'SUFFICIENT').length;
  const partial = states.filter((state) => state === 'PARTIAL').length;
  const insufficient = states.filter((state) => state === 'INSUFFICIENT').length;
  const contradicted = states.filter((state) => state === 'CONTRADICTED').length;
  const notObserved = states.filter((state) => state === 'NOT_OBSERVED').length;
  const epistemicallyObserved = sufficient + partial + insufficient + contradicted;
  return {
    inferenceExecutions: inferenceRecords.length,
    sufficient,
    partial,
    insufficient,
    contradicted,
    notObserved,
    sufficientRate: ratio(sufficient, epistemicallyObserved),
    boundedOrMissingEvidenceRate: ratio(partial + insufficient, epistemicallyObserved),
    boundary: 'SUFFICIENCY_IS_DERIVED_ONLY_WHEN_THE_EXECUTION_RECORD_SUPPORTS_IT_NOT_FROM_MODEL_CONFIDENCE' as const,
  };
}

function returnCalibration(events: unknown[]) {
  const contrasts = events.filter((event) => eventName(event) === 'SFI_UNIVERSAL_RETURN_CONTRASTED');
  const calibrated = contrasts.filter((event) => text(eventPayload(event).calibrationStatus, 80) === 'CONTRAST_RECORDED');
  const classifications = calibrated.map((event) => text(eventPayload(event).classification, 80)).filter(Boolean);
  const count = (classification: string) => classifications.filter((value) => value === classification).length;
  return {
    observedContrasts: contrasts.length,
    calibratedContrasts: calibrated.length,
    calibrationCompletionRate: ratio(calibrated.length, contrasts.length),
    confirmed: count('CONFIRMED'),
    partial: count('PARTIAL'),
    contradicted: count('CONTRADICTED'),
    inconclusive: count('INCONCLUSIVE'),
    classificationConfidenceMean: observedNumber((() => {
      const values = calibrated
        .map((event) => Number(eventPayload(event).classificationConfidence))
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 1);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    })()),
    attribution: 'GLOBAL_UNATTRIBUTED_UNLESS_EXPLICIT_EXECUTION_LINEAGE_EXISTS' as const,
    boundary: 'RETURN_CONTRAST_IS_CALIBRATION_AGAINST_VERIFIED_OBSERVED_RETURN_NOT_CANON_OR_TRUTH_PROBABILITY' as const,
  };
}

function falsePositiveMetric(events: unknown[]) {
  const explicit = events.flatMap((event) => {
    const payload = eventPayload(event);
    return typeof payload.falsePositive === 'boolean' ? [payload.falsePositive] : [];
  });
  if (!explicit.length) {
    return {
      observations: 0,
      falsePositives: 0,
      rate: ratio(0, 0),
      boundary: 'FALSE_POSITIVE_REMAINS_NOT_OBSERVED_WITHOUT_AN_EXPLICIT_PERSISTED_BOOLEAN' as const,
    };
  }
  const falsePositives = explicit.filter(Boolean).length;
  return {
    observations: explicit.length,
    falsePositives,
    rate: ratio(falsePositives, explicit.length),
    boundary: 'FALSE_POSITIVE_IS_NEVER_INFERRED_FROM_CONTRADICTED_OR_FAILED_EXECUTIONS' as const,
  };
}

export function deriveGenAiAssuranceMetrics(records: SfiExecutionRecord[], events: unknown[], input?: { agentId?: string | null }) {
  return {
    contractVersion: SFI_GENAI_ASSURANCE_CONTRACT,
    scope: {
      agentId: input?.agentId ?? null,
      executionRecords: records.length,
      eventWindow: events.length,
      exhaustive: false,
    },
    telemetryCoverage: telemetryCoverage(records),
    quality: structuredInferenceQuality(records),
    evidenceSufficiency: evidenceSufficiency(records),
    returnCalibration: returnCalibration(events),
    falsePositive: falsePositiveMetric(events),
    boundaries: {
      boundedReadAbsenceMeansNonExistence: false,
      telemetryIsEvidence: false,
      modelConfidenceIsTruthProbability: false,
      returnCalibrationAutomaticallyAttributedToAgent: false,
      openTelemetryIsTruthAuthority: false,
    },
  };
}

export async function readGenAiAssuranceMetrics(input?: { agentId?: string; limit?: number }) {
  const { streamRecentEpistemicEvents } = await import('@/lib/events/eventStore');
  const limit = Math.max(1, Math.min(500, input?.limit ?? 200));
  const [executionRead, eventRead] = await Promise.all([
    readExecutionRecords({ agentId: input?.agentId, limit }),
    streamRecentEpistemicEvents(limit),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    source: 'epistemic_events',
    readLimit: limit,
    exhaustive: false as const,
    warnings: [
      ...executionRead.warnings,
      ...('warnings' in eventRead && Array.isArray(eventRead.warnings) ? eventRead.warnings.map(String) : []),
      'Assurance metrics are bounded projections over canonical observed records; absence outside the window is not proof of non-existence.',
    ],
    metrics: deriveGenAiAssuranceMetrics(executionRead.records, eventRead.data ?? [], { agentId: input?.agentId ?? null }),
  };
}
