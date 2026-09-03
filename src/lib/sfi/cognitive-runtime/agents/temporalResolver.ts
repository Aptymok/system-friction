import type { KernelContext, KernelEvidence } from '../kernelContext';
import { materialEvidenceCoverage, materialEvidenceView } from '../materialEvidence';

type Row = Record<string, unknown>;

type TemporalAnomalyClass =
  | 'ATTENTION_BEFORE_CREATION'
  | 'RESOLUTION_BEFORE_ATTENTION'
  | 'RESOLUTION_BEFORE_CREATION';

export interface TemporalResolution {
  referenceTime: string;
  horizonDetected: string;
  temporalSignals: string[];
  temporalConfidence: number;
  observedRange: { min: string | null; max: string | null };
  precedenceRules: string[];
  anomalyCounts: Record<TemporalAnomalyClass, number>;
  anomalyRate: number | null;
  denominator: number | null;
  examples: Array<{
    class: TemporalAnomalyClass;
    evidenceRef: string;
    createdAt: string | null;
    attendedAt: string | null;
    resolvedAt: string | null;
  }>;
}

const CREATED_KEYS = new Set([
  'createdat', 'creationdate', 'createddate', 'fechacreacion', 'fechadecreacion',
  'openedat', 'reportedat', 'ticketcreatedat', 'datecreated',
]);
const ATTENDED_KEYS = new Set([
  'attendedat', 'attentionstartedat', 'attentionat', 'attendancestartedat',
  'startedat', 'inicioatencion', 'fechainicioatencion', 'fechaatencion',
  'firstresponseat', 'servicebeganat',
]);
const RESOLVED_KEYS = new Set([
  'resolvedat', 'resolutionat', 'closedat', 'completedat', 'finishedat',
  'fecharesolucion', 'fechacierre', 'fechafinalizacion', 'serviceendedat',
]);

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function normalizedKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function dateValue(value: unknown) {
  if (value instanceof Date) return Number.isFinite(value.valueOf()) ? value : null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed : null;
}

function dateFromAliases(value: Row, aliases: Set<string>) {
  for (const [key, candidate] of Object.entries(value)) {
    if (!aliases.has(normalizedKey(key))) continue;
    const parsed = dateValue(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function scanRows(value: unknown, output: Row[], depth = 0, budget = { count: 0 }) {
  if (depth > 8 || budget.count > 4_000 || value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 1_000)) scanRows(item, output, depth + 1, budget);
    return;
  }
  if (typeof value !== 'object') return;
  budget.count += 1;
  const candidate = value as Row;
  const keys = Object.keys(candidate).map(normalizedKey);
  if (keys.some((key) => CREATED_KEYS.has(key) || ATTENDED_KEYS.has(key) || RESOLVED_KEYS.has(key))) output.push(candidate);
  for (const nested of Object.values(candidate)) {
    if (nested && typeof nested === 'object') scanRows(nested, output, depth + 1, budget);
  }
}

function flattenNumeric(value: unknown, path = '', depth = 0, out: Array<{ path: string; value: number }> = []) {
  if (depth > 8 || out.length > 1_200 || value === null || value === undefined) return out;
  if (typeof value === 'number' && Number.isFinite(value)) {
    out.push({ path, value });
    return out;
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    out.push({ path, value: Number(value) });
    return out;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < Math.min(value.length, 250); index += 1) flattenNumeric(value[index], `${path}[${index}]`, depth + 1, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Row).slice(0, 220)) {
      flattenNumeric(nested, path ? `${path}.${key}` : key, depth + 1, out);
    }
  }
  return out;
}

function aggregateTemporalCounts(payload: unknown) {
  const entries = flattenNumeric(payload);
  let denominator: number | null = null;
  let attentionBeforeCreation = 0;
  let resolutionBeforeAttention = 0;
  let resolutionBeforeCreation = 0;
  for (const entry of entries) {
    const path = normalizedKey(entry.path);
    if (/rowcount|recordcount|totalrows|totalrecords|totaltickets|ticketcount/.test(path)) {
      denominator = Math.max(denominator ?? 0, entry.value);
    }
    if (/attend.*before.*creat|attention.*before.*creat|inicio.*atencion.*antes.*crea|negative.*creat.*attend/.test(path)) {
      attentionBeforeCreation = Math.max(attentionBeforeCreation, entry.value);
    }
    if (/resolv.*before.*attend|close.*before.*attend|resolucion.*antes.*atencion/.test(path)) {
      resolutionBeforeAttention = Math.max(resolutionBeforeAttention, entry.value);
    }
    if (/resolv.*before.*creat|close.*before.*creat|resolucion.*antes.*crea/.test(path)) {
      resolutionBeforeCreation = Math.max(resolutionBeforeCreation, entry.value);
    }
  }
  return { denominator, attentionBeforeCreation, resolutionBeforeAttention, resolutionBeforeCreation };
}

function executionHorizon(context: KernelContext) {
  const request = row(context.metadata?.executionRequest);
  const timeRange = row(request.timeRange);
  if (timeRange.to || timeRange.end || timeRange.until) return 'bounded_observation_window';
  if (context.predictions.length) return 'future_projection';
  return 'current_or_historical_observation';
}

export function TemporalResolverAgent(context: KernelContext): KernelContext {
  const materialEvidence = materialEvidenceView(context);
  const coverage = materialEvidenceCoverage(context);
  const anomalyCounts: Record<TemporalAnomalyClass, number> = {
    ATTENTION_BEFORE_CREATION: 0,
    RESOLUTION_BEFORE_ATTENTION: 0,
    RESOLUTION_BEFORE_CREATION: 0,
  };
  const examples: TemporalResolution['examples'] = [];
  const observedDates: Date[] = [];
  let rowDenominator = 0;
  let aggregateDenominator: number | null = null;

  for (const evidence of materialEvidence) {
    const rows: Row[] = [];
    scanRows(evidence.payload, rows);
    rowDenominator += rows.length;

    for (const candidate of rows) {
      const created = dateFromAliases(candidate, CREATED_KEYS);
      const attended = dateFromAliases(candidate, ATTENDED_KEYS);
      const resolved = dateFromAliases(candidate, RESOLVED_KEYS);
      for (const value of [created, attended, resolved]) if (value) observedDates.push(value);

      const add = (klass: TemporalAnomalyClass) => {
        anomalyCounts[klass] += 1;
        if (examples.length < 12) {
          examples.push({
            class: klass,
            evidenceRef: evidence.id,
            createdAt: created?.toISOString() ?? null,
            attendedAt: attended?.toISOString() ?? null,
            resolvedAt: resolved?.toISOString() ?? null,
          });
        }
      };

      if (created && attended && attended.valueOf() < created.valueOf()) add('ATTENTION_BEFORE_CREATION');
      if (attended && resolved && resolved.valueOf() < attended.valueOf()) add('RESOLUTION_BEFORE_ATTENTION');
      if (created && resolved && resolved.valueOf() < created.valueOf()) add('RESOLUTION_BEFORE_CREATION');
    }

    const aggregate = aggregateTemporalCounts(evidence.payload);
    if (aggregate.denominator && aggregate.denominator > 0) aggregateDenominator = Math.max(aggregateDenominator ?? 0, aggregate.denominator);
    anomalyCounts.ATTENTION_BEFORE_CREATION = Math.max(anomalyCounts.ATTENTION_BEFORE_CREATION, aggregate.attentionBeforeCreation);
    anomalyCounts.RESOLUTION_BEFORE_ATTENTION = Math.max(anomalyCounts.RESOLUTION_BEFORE_ATTENTION, aggregate.resolutionBeforeAttention);
    anomalyCounts.RESOLUTION_BEFORE_CREATION = Math.max(anomalyCounts.RESOLUTION_BEFORE_CREATION, aggregate.resolutionBeforeCreation);
  }

  const denominator = aggregateDenominator ?? (rowDenominator > 0 ? rowDenominator : null);
  const primaryViolations = anomalyCounts.ATTENTION_BEFORE_CREATION + anomalyCounts.RESOLUTION_BEFORE_ATTENTION;
  const anomalyRate = denominator && denominator > 0 ? Math.min(1, primaryViolations / denominator) : null;
  const minDate = observedDates.length ? new Date(Math.min(...observedDates.map((value) => value.valueOf()))).toISOString() : null;
  const maxDate = observedDates.length ? new Date(Math.max(...observedDates.map((value) => value.valueOf()))).toISOString() : null;
  const temporalSignals = [
    ...(anomalyCounts.ATTENTION_BEFORE_CREATION > 0 ? ['ATTENTION_BEFORE_CREATION'] : []),
    ...(anomalyCounts.RESOLUTION_BEFORE_ATTENTION > 0 ? ['RESOLUTION_BEFORE_ATTENTION'] : []),
    ...(anomalyCounts.RESOLUTION_BEFORE_CREATION > 0 ? ['RESOLUTION_BEFORE_CREATION'] : []),
  ];
  const temporalConfidence = materialEvidence.length === 0
    ? 0
    : examples.length > 0
      ? 0.95
      : primaryViolations > 0
        ? 0.85
        : 0.65;

  const resolution: TemporalResolution = {
    referenceTime: new Date().toISOString(),
    horizonDetected: executionHorizon(context),
    temporalSignals,
    temporalConfidence,
    observedRange: { min: minDate, max: maxDate },
    precedenceRules: [
      'NORMAL_OPERATION: created_at <= attention_started_at <= resolved_at',
      'EXCEPTION_ONLY: correction_mode OR migration_mode requires actor_id + reason_code + source_record + original_timestamp + corrected_timestamp + provenance',
    ],
    anomalyCounts,
    anomalyRate,
    denominator,
    examples,
  };

  const evidenceOutput: KernelEvidence = {
    id: crypto.randomUUID(),
    source: 'TemporalResolverAgent',
    confidence: resolution.temporalConfidence,
    payload: {
      epistemicClass: 'DERIVED',
      assessmentClass: 'TEMPORAL_PRECEDENCE_ANALYSIS',
      ...resolution,
      evidenceRefs: materialEvidence.map((item) => item.id).slice(0, 50),
      interpretationBoundary: 'A precedence violation is a derived inconsistency, not proof of human error. Rival causes include retrospective capture, field semantics, migration, timezone, ETL/import and application defects.',
    },
  };

  context.evidence.push(evidenceOutput);
  if (primaryViolations > 0) {
    context.contradictions.push({
      id: crypto.randomUUID(),
      source: 'TemporalResolverAgent',
      confidence: temporalConfidence,
      payload: {
        epistemicClass: 'DERIVED',
        contradictionClass: 'TEMPORAL_PRECEDENCE_VIOLATION',
        expectedInvariant: 'created_at <= attention_started_at <= resolved_at',
        anomalyCounts,
        anomalyRate,
        denominator,
        rivalCausesRequired: true,
        evidenceRef: evidenceOutput.id,
      },
    });
  }

  context.metadata = {
    ...context.metadata,
    materialEvidenceResolution: coverage,
    temporalResolver: {
      executed: true,
      horizon: resolution.horizonDetected,
      confidence: resolution.temporalConfidence,
      observedRange: resolution.observedRange,
      anomalyCounts,
      anomalyRate,
      denominator,
      materialEvidenceResolved: materialEvidence.length,
      mode: 'STRUCTURED_TEMPORAL_PRECEDENCE_EVALUATION',
      executedAt: new Date().toISOString(),
    },
  };

  return context;
}
