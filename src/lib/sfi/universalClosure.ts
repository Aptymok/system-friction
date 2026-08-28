import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const SFI_UNIVERSAL_CLOSURE_CONTRACT = 'SFI-UNIVERSAL-CLOSURE-1.0' as const;
export type SfiClosureClass = 'DESCRIPTIVE_DELIMITED' | 'EMPIRICAL_CONTRAST' | 'LONGITUDINAL' | 'INTERVENTION';

type Row = Record<string, unknown>;

type History = {
  ok?: boolean;
  cycleId?: string;
  events?: unknown[];
  cognitiveRuns?: unknown[];
  structuredResults?: unknown[];
  returns?: unknown[];
  closures?: unknown[];
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
}

function eventPayload(value: unknown) {
  return row(row(value).payload);
}

function latest(values: unknown[] | undefined) {
  return Array.isArray(values) && values.length ? values[values.length - 1] : null;
}

function collectRunValues(history: History, key: string) {
  const values: unknown[] = [];
  for (const event of history.cognitiveRuns ?? []) values.push(...list(eventPayload(event)[key]));
  for (const event of history.structuredResults ?? []) {
    const payload = eventPayload(event);
    const result = row(payload.result);
    values.push(...list(result[key]));
  }
  return values;
}

function statement(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const item = row(value);
  return text(item.statement) ?? text(item.hypothesis) ?? text(item.claim) ?? text(item.prediction) ?? text(item.summary) ?? null;
}

function uniqueStatements(values: unknown[]) {
  const map = new Map<string, unknown>();
  for (const value of values) {
    const key = statement(value)?.toLowerCase();
    if (key && !map.has(key)) map.set(key, value);
  }
  return [...map.values()];
}

function closureClass(value: unknown): SfiClosureClass {
  const candidate = text(value)?.toUpperCase();
  if (candidate === 'EMPIRICAL_CONTRAST' || candidate === 'LONGITUDINAL' || candidate === 'INTERVENTION') return candidate;
  return 'DESCRIPTIVE_DELIMITED';
}

export function assessUniversalClosure(input: {
  history: History;
  requested?: unknown;
  evidenceRefs?: string[];
}) {
  const requested = row(input.requested);
  const klass = closureClass(requested.closureClass);
  const hypotheses = uniqueStatements(collectRunValues(input.history, 'hypotheses'));
  const predictions = uniqueStatements(collectRunValues(input.history, 'predictions'));
  const contradictions = uniqueStatements(collectRunValues(input.history, 'contradictions'));
  const lastReturn = latest(input.history.returns);
  const returnPayload = lastReturn ? eventPayload(lastReturn) : {};
  const contrastEvents = (input.history.events ?? []).filter((event) => row(event).event_name === 'SFI_UNIVERSAL_RETURN_CONTRASTED');
  const lastContrast = latest(contrastEvents);

  const primaryHypothesis = requested.primaryHypothesis ?? hypotheses[0] ?? null;
  const rivalHypotheses = list(requested.rivalHypotheses).length
    ? list(requested.rivalHypotheses)
    : hypotheses.slice(1);
  const prediction = requested.prediction ?? predictions[0] ?? null;
  const supportingEvidence = [
    ...(Array.isArray(input.evidenceRefs) ? input.evidenceRefs : []),
    ...list(requested.supportingEvidence).filter((item): item is string => typeof item === 'string'),
  ];
  const counterEvidence = list(requested.counterEvidence).length ? list(requested.counterEvidence) : contradictions;
  const missingEvidence = list(requested.missingEvidence);
  const expectedSignals = list(requested.expectedSignals);
  const contradictionSignals = list(requested.contradictionSignals).length ? list(requested.contradictionSignals) : contradictions;
  const observationWindow = requested.observationWindow ?? null;
  const observedReturn = requested.observedReturn ?? returnPayload.outcome ?? null;
  const contrast = requested.contrast ?? (lastContrast ? eventPayload(lastContrast) : null);
  const residualError = requested.residualError ?? null;
  const updatedConfidence = typeof requested.updatedConfidence === 'number' && Number.isFinite(requested.updatedConfidence)
    ? Math.max(0, Math.min(1, requested.updatedConfidence))
    : null;
  const outcome = requested.outcome ?? observedReturn ?? null;
  const recurrenceAssessment = requested.recurrenceAssessment ?? null;
  const learningCandidate = requested.learningCandidate ?? null;
  const conclusion = requested.conclusion ?? null;
  const limitations = list(requested.limitations);

  const missing: string[] = [];
  if (klass === 'DESCRIPTIVE_DELIMITED') {
    if (!conclusion && !primaryHypothesis) missing.push('CONCLUSION_OR_PRIMARY_HYPOTHESIS');
    if (!limitations.length && !missingEvidence.length) missing.push('LIMITATIONS_OR_MISSING_EVIDENCE');
  } else {
    if (!primaryHypothesis) missing.push('PRIMARY_HYPOTHESIS');
    if (!rivalHypotheses.length) missing.push('RIVAL_HYPOTHESIS');
    if (!prediction) missing.push('PREDICTION');
    if (!expectedSignals.length) missing.push('EXPECTED_SIGNALS');
    if (!contradictionSignals.length) missing.push('CONTRADICTION_SIGNALS');
    if (!observationWindow) missing.push('OBSERVATION_WINDOW');
    if (!observedReturn) missing.push('OBSERVED_RETURN');
    if (!contrast) missing.push('CONTRAST');
    if (updatedConfidence === null) missing.push('UPDATED_CONFIDENCE');
    if (!outcome) missing.push('OUTCOME');
    if (!learningCandidate) missing.push('LEARNING_CANDIDATE');
  }
  if (klass === 'LONGITUDINAL' && !recurrenceAssessment) missing.push('RECURRENCE_ASSESSMENT');
  if (klass === 'INTERVENTION' && !requested.interventionRef && !requested.interventionDescription) missing.push('INTERVENTION_REFERENCE');

  const envelope = {
    contract: SFI_UNIVERSAL_CLOSURE_CONTRACT,
    closureClass: klass,
    primaryHypothesis,
    rivalHypotheses,
    supportingEvidence: [...new Set(supportingEvidence)],
    counterEvidence,
    missingEvidence,
    prediction,
    expectedSignals,
    contradictionSignals,
    observationWindow,
    observedReturn,
    contrast,
    residualError,
    updatedConfidence,
    outcome,
    recurrenceAssessment,
    learningCandidate,
    conclusion,
    limitations,
    interventionRef: requested.interventionRef ?? null,
    interventionDescription: requested.interventionDescription ?? null,
  };

  return {
    contract: SFI_UNIVERSAL_CLOSURE_CONTRACT,
    ready: missing.length === 0,
    missing,
    envelope,
    rule: klass === 'DESCRIPTIVE_DELIMITED'
      ? 'A delimited descriptive case may close without a future prediction only if its conclusion and uncertainty/limitations are explicit.'
      : 'Contrastable, longitudinal and intervention cases require primary+rival hypothesis, prediction, discriminating signals, observed return, contrast and calibrated learning before closure.',
  };
}

export async function contrastLatestUniversalReturn(input: {
  history: History;
  cycleId: string;
  actorId: string;
  tenantId: string;
  classification?: string | null;
}) {
  const predictions = uniqueStatements(collectRunValues(input.history, 'predictions'));
  const hypotheses = uniqueStatements(collectRunValues(input.history, 'hypotheses'));
  const lastReturn = latest(input.history.returns);
  if (!lastReturn) return { ok: false as const, error: 'RETURN_REQUIRED_FOR_CONTRAST' };
  const returnPayload = eventPayload(lastReturn);
  const normalizedClassification = (text(input.classification) ?? text(returnPayload.classification) ?? 'INCONCLUSIVE').toUpperCase();
  const accepted = ['CONFIRMED', 'PARTIAL', 'CONTRADICTED', 'INCONCLUSIVE'].includes(normalizedClassification)
    ? normalizedClassification
    : 'INCONCLUSIVE';

  return appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_RETURN_CONTRASTED',
    epistemicClass: 'derived',
    confidence: accepted === 'INCONCLUSIVE' ? 0.5 : 0.8,
    payload: {
      contract: 'SFI-RETURN-CONTRAST-1.0',
      cycleId: input.cycleId,
      actorId: input.actorId,
      tenantId: input.tenantId,
      primaryHypothesis: hypotheses[0] ?? null,
      rivalHypotheses: hypotheses.slice(1),
      predictions,
      observedReturn: returnPayload.outcome ?? null,
      classification: accepted,
      calibrationStatus: predictions.length ? (accepted === 'INCONCLUSIVE' ? 'REQUIRES_REVIEW' : 'CONTRAST_RECORDED') : 'PREDICTION_MISSING',
      epistemicBoundary: 'Contrast records the relationship between preregistered expectations and observed return. It does not automatically promote either hypothesis to canonical truth.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'reality_calibration', sourceType: 'return_contrast' },
    logbookId: `universal-cycle:${input.cycleId}`,
    lineage: [String(row(lastReturn).event_id ?? '')].filter(Boolean),
  });
}
