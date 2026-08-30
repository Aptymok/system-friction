import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_UNIVERSAL_CLOSURE_CONTRACT = 'SFI-UNIVERSAL-CLOSURE-1.1' as const;
export type SfiClosureClass = 'DESCRIPTIVE_DELIMITED' | 'EMPIRICAL_CONTRAST' | 'LONGITUDINAL' | 'INTERVENTION';

type Row = Record<string, unknown>;

type History = {
  ok?: boolean;
  cycleId?: string;
  events?: unknown[];
  cognitiveRuns?: unknown[];
  structuredResults?: unknown[];
  returns?: unknown[];
  returnContrasts?: unknown[];
  closures?: unknown[];
};

const RETURN_EVIDENCE_CLASSES = new Set(['observed', 'imported', 'extracted', 'canonical']);
const NON_EVIDENCE_EVENT_NAMES = new Set([
  'SFI_UNIVERSAL_RETURN_RECORDED',
  'SFI_UNIVERSAL_RETURN_CONTRASTED',
  'SFI_UNIVERSAL_CLOSURE_ENVELOPE_ACCEPTED',
  'SFI_UNIVERSAL_CYCLE_CLOSED',
  'SFI_UNIVERSAL_CYCLE_OPENED',
  'SFI_UNIVERSAL_CYCLE_RESUMED',
  'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
  'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
  'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED',
  'SFI_UNIVERSAL_LEARNING_PROMOTED',
  'SFI_UNIVERSAL_LEARNING_REJECTED',
]);
const TRUSTED_CYCLE_LINK_EVENTS = new Set([
  'SFI_UNIVERSAL_CYCLE_OPENED',
  'SFI_UNIVERSAL_CYCLE_RESUMED',
  'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
  'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
]);
const MAX_RETURN_EVIDENCE_REFS = 50;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
}

function stringList(value: unknown) {
  return list(value).filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function eventPayload(value: unknown) {
  return row(row(value).payload);
}

function latest(values: unknown[] | undefined) {
  return Array.isArray(values) && values.length ? values[values.length - 1] : null;
}

function aiSynthesisEvents(history: History) {
  return (history.events ?? []).filter((event) => row(event).event_name === 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED');
}

function collectRunValues(history: History, key: string) {
  const values: unknown[] = [];
  for (const event of history.cognitiveRuns ?? []) values.push(...list(eventPayload(event)[key]));
  for (const event of history.structuredResults ?? []) {
    const payload = eventPayload(event);
    const result = row(payload.result);
    values.push(...list(result[key]));
  }
  for (const event of aiSynthesisEvents(history)) {
    const synthesis = row(eventPayload(event).synthesis);
    if (key === 'hypotheses') {
      if (synthesis.primaryHypothesis) values.push(synthesis.primaryHypothesis);
      values.push(...list(synthesis.rivalHypotheses));
    } else if (key === 'predictions') {
      values.push(...list(synthesis.predictions));
    } else {
      values.push(...list(synthesis[key]));
    }
  }
  return values;
}

function statement(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const item = row(value);
  return text(item.statement) ?? text(item.hypothesis) ?? text(item.claim) ?? text(item.description) ?? text(item.prediction) ?? text(item.summary) ?? null;
}

function uniqueStatements(values: unknown[]) {
  const map = new Map<string, unknown>();
  for (const value of values) {
    const key = statement(value)?.toLowerCase();
    if (key && !map.has(key)) map.set(key, value);
  }
  return [...map.values()];
}

function predictionSignals(predictions: unknown[]) {
  const expected = new Set<string>();
  const contradictory = new Set<string>();
  const windows = new Set<string>();
  for (const value of predictions) {
    const prediction = row(value);
    for (const signal of stringList(prediction.expectedSignals)) expected.add(signal);
    for (const signal of stringList(prediction.contradictionSignals)) contradictory.add(signal);
    const window = text(prediction.observationWindow);
    if (window) windows.add(window);
  }
  return {
    expectedSignals: [...expected],
    contradictionSignals: [...contradictory],
    observationWindows: [...windows],
  };
}

function closureClass(value: unknown): SfiClosureClass {
  const candidate = text(value)?.toUpperCase();
  if (candidate === 'EMPIRICAL_CONTRAST' || candidate === 'LONGITUDINAL' || candidate === 'INTERVENTION') return candidate;
  return 'DESCRIPTIVE_DELIMITED';
}

function contrastEvents(history: History) {
  if (Array.isArray(history.returnContrasts) && history.returnContrasts.length) return history.returnContrasts;
  return (history.events ?? []).filter((event) => row(event).event_name === 'SFI_UNIVERSAL_RETURN_CONTRASTED');
}

function trustedCycleLinkedEvidenceRefs(history: History) {
  const refs = new Set<string>();
  for (const value of history.events ?? []) {
    const event = row(value);
    const eventName = text(event.event_name);
    if (!eventName || !TRUSTED_CYCLE_LINK_EVENTS.has(eventName)) continue;
    const payload = row(event.payload);
    for (const ref of [text(payload.webEvidenceEventId), text(payload.hydrationEventId)]) {
      if (ref) refs.add(ref);
    }
    const metadata = row(payload.metadata);
    for (const ref of [text(metadata.webEvidenceEventId), text(metadata.hydrationEventId)]) {
      if (ref) refs.add(ref);
    }
  }
  return refs;
}

export function assessUniversalClosure(input: {
  history: History;
  requested?: unknown;
  evidenceRefs?: string[];
}) {
  const requested = row(input.requested);
  const klass = closureClass(requested.closureClass);
  const empirical = klass !== 'DESCRIPTIVE_DELIMITED';
  const hypotheses = uniqueStatements(collectRunValues(input.history, 'hypotheses'));
  const predictions = uniqueStatements(collectRunValues(input.history, 'predictions'));
  const contradictions = uniqueStatements(collectRunValues(input.history, 'contradictions'));
  const persistedSignals = predictionSignals(predictions);
  const lastReturn = latest(input.history.returns);
  const returnPayload = lastReturn ? eventPayload(lastReturn) : {};
  const lastContrast = latest(contrastEvents(input.history));
  const lastContrastPayload = lastContrast ? eventPayload(lastContrast) : {};

  // Empirical closure may describe persisted facts, but it may not manufacture
  // preregistration, RETURN, calibration or confidence inside the close request.
  const primaryHypothesis = empirical ? hypotheses[0] ?? null : requested.primaryHypothesis ?? hypotheses[0] ?? null;
  const rivalHypotheses = empirical
    ? hypotheses.slice(1)
    : list(requested.rivalHypotheses).length
      ? list(requested.rivalHypotheses)
      : hypotheses.slice(1);
  const prediction = empirical ? predictions[0] ?? null : requested.prediction ?? predictions[0] ?? null;
  const predictionRow = row(prediction);
  const supportingEvidence = [
    ...(Array.isArray(input.evidenceRefs) ? input.evidenceRefs : []),
    ...list(requested.supportingEvidence).filter((item): item is string => typeof item === 'string'),
  ];
  const counterEvidence = list(requested.counterEvidence).length ? list(requested.counterEvidence) : contradictions;
  const missingEvidence = list(requested.missingEvidence);
  const expectedSignals = empirical
    ? persistedSignals.expectedSignals
    : list(requested.expectedSignals).length ? list(requested.expectedSignals) : list(predictionRow.expectedSignals);
  const contradictionSignals = empirical
    ? persistedSignals.contradictionSignals
    : list(requested.contradictionSignals).length
      ? list(requested.contradictionSignals)
      : list(predictionRow.contradictionSignals).length
        ? list(predictionRow.contradictionSignals)
        : contradictions;
  const observationWindow = empirical
    ? persistedSignals.observationWindows[0] ?? null
    : requested.observationWindow ?? predictionRow.observationWindow ?? null;
  const observedReturn = empirical ? returnPayload.outcome ?? null : requested.observedReturn ?? returnPayload.outcome ?? null;
  const contrast = empirical ? (lastContrast ? lastContrastPayload : null) : requested.contrast ?? (lastContrast ? lastContrastPayload : null);
  const residualError = requested.residualError ?? null;
  const persistedUpdatedConfidence = typeof lastContrastPayload.updatedConfidence === 'number' && Number.isFinite(lastContrastPayload.updatedConfidence)
    ? Math.max(0, Math.min(1, Number(lastContrastPayload.updatedConfidence)))
    : null;
  const updatedConfidence = empirical
    ? persistedUpdatedConfidence
    : typeof requested.updatedConfidence === 'number' && Number.isFinite(requested.updatedConfidence)
      ? Math.max(0, Math.min(1, requested.updatedConfidence))
      : persistedUpdatedConfidence;
  const outcome = empirical ? returnPayload.outcome ?? null : requested.outcome ?? observedReturn ?? null;
  const recurrenceAssessment = requested.recurrenceAssessment ?? null;
  const learningCandidate = empirical
    ? lastContrast && lastContrastPayload.calibrationStatus === 'CONTRAST_RECORDED'
      ? {
          type: 'CONFIGURATION_RESPONSE_CANDIDATE',
          cycleId: input.history.cycleId ?? null,
          primaryHypothesis,
          rivalHypotheses,
          prediction,
          observedReturn,
          contrastClassification: lastContrastPayload.classification ?? null,
          calibrationStatus: lastContrastPayload.calibrationStatus ?? null,
          promotionState: 'CANDIDATE_NOT_CANONICAL',
        }
      : null
    : requested.learningCandidate ?? null;
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
    if (!lastReturn || !observedReturn) missing.push('OBSERVED_RETURN');
    if (!lastContrast || !contrast) missing.push('CONTRAST');
    if (!lastContrast || lastContrastPayload.calibrationStatus !== 'CONTRAST_RECORDED') missing.push('CALIBRATED_CONTRAST');
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
      : 'Contrastable, longitudinal and intervention cases require persisted preregistration, an observed RETURN, verified evidence lineage, completed contrast and calibrated learning before closure. Request-scoped substitutes cannot satisfy those gates.',
  };
}

async function validateReturnEvidenceRefs(input: {
  refs: string[];
  cycleId: string;
  tenantId: string;
  history: History;
}) {
  const refs = [...new Set(input.refs)].slice(0, MAX_RETURN_EVIDENCE_REFS);
  if (!refs.length) return { ok: true as const, verified: [] as string[], rejected: [] as string[], warning: null as string | null };
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,logbook_id')
    .in('event_id', refs);
  if (result.error) {
    return { ok: false as const, verified: [] as string[], rejected: refs, warning: result.error.message };
  }

  const expectedLogbooks = new Set([
    `universal-cycle:${input.cycleId}`,
    `structured-result:${input.cycleId}`,
    `universal-evidence:${input.cycleId}`,
  ]);
  const trustedLinkedRefs = trustedCycleLinkedEvidenceRefs(input.history);
  const verified: string[] = [];
  for (const value of result.data ?? []) {
    const event = row(value);
    const payload = row(event.payload);
    const eventId = text(event.event_id);
    const eventName = text(event.event_name);
    const eventTenant = text(payload.tenantId);
    const eventCycle = text(payload.cycleId) ?? text(payload.cycleKey);
    const logbookId = text(event.logbook_id);
    const sameTenant = eventTenant === input.tenantId;
    const sameCycle = eventCycle === input.cycleId
      || Boolean(logbookId && expectedLogbooks.has(logbookId))
      || Boolean(eventId && trustedLinkedRefs.has(eventId));
    const evidenceClass = RETURN_EVIDENCE_CLASSES.has(text(event.epistemic_class) ?? '');
    const evidenceBearing = Boolean(eventName) && evidenceClass && !NON_EVIDENCE_EVENT_NAMES.has(eventName!);
    if (eventId && sameTenant && sameCycle && evidenceBearing) verified.push(eventId);
  }
  const verifiedSet = new Set(verified);
  return {
    ok: true as const,
    verified,
    rejected: refs.filter((ref) => !verifiedSet.has(ref)),
    warning: null as string | null,
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
  const signals = predictionSignals(predictions);
  const lastReturn = latest(input.history.returns);
  if (!lastReturn) return { ok: false as const, error: 'RETURN_REQUIRED_FOR_CONTRAST' };
  const returnPayload = eventPayload(lastReturn);
  const declaredReturnEvidenceRefs = [
    ...stringList(returnPayload.evidenceRefs),
    ...stringList(row(lastReturn).lineage),
  ].filter((value, index, values) => values.indexOf(value) === index);
  const evidenceValidation = await validateReturnEvidenceRefs({
    refs: declaredReturnEvidenceRefs,
    cycleId: input.cycleId,
    tenantId: input.tenantId,
    history: input.history,
  });
  const returnEvidenceRefs = evidenceValidation.verified;
  const requestedClassification = (text(input.classification) ?? text(returnPayload.classification) ?? 'INCONCLUSIVE').toUpperCase();
  const requestedAccepted = ['CONFIRMED', 'PARTIAL', 'CONTRADICTED', 'INCONCLUSIVE'].includes(requestedClassification)
    ? requestedClassification
    : 'INCONCLUSIVE';

  const hasPrediction = predictions.length > 0;
  const hasDiscriminatingSignals = signals.expectedSignals.length > 0 && signals.contradictionSignals.length > 0;
  const traceableReturn = returnEvidenceRefs.length > 0;
  const calibrationStatus = !hasPrediction
    ? 'PREDICTION_MISSING'
    : !hasDiscriminatingSignals
      ? 'DISCRIMINATING_SIGNALS_MISSING'
      : !evidenceValidation.ok
        ? 'RETURN_EVIDENCE_VALIDATION_DEGRADED'
        : !declaredReturnEvidenceRefs.length
          ? 'RETURN_EVIDENCE_UNLINKED'
          : !traceableReturn
            ? 'RETURN_EVIDENCE_UNVERIFIED'
            : requestedAccepted === 'INCONCLUSIVE'
              ? 'REQUIRES_REVIEW'
              : 'CONTRAST_RECORDED';
  const accepted = calibrationStatus === 'CONTRAST_RECORDED' ? requestedAccepted : 'INCONCLUSIVE';
  const priorConfidence = typeof row(hypotheses[0]).confidence === 'number' ? Number(row(hypotheses[0]).confidence) : 0.5;
  const updatedConfidence = accepted === 'CONFIRMED'
    ? Math.min(0.95, Math.max(priorConfidence, 0.7) + 0.1)
    : accepted === 'PARTIAL'
      ? Math.min(0.8, Math.max(0.5, priorConfidence))
      : accepted === 'CONTRADICTED'
        ? Math.max(0.05, Math.min(priorConfidence, 0.4) - 0.15)
        : priorConfidence;

  const returnEventId = String(row(lastReturn).event_id ?? '');
  return appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_RETURN_CONTRASTED',
    epistemicClass: 'derived',
    confidence: calibrationStatus === 'CONTRAST_RECORDED' ? 0.8 : 0.5,
    payload: {
      contract: 'SFI-RETURN-CONTRAST-1.1',
      cycleId: input.cycleId,
      actorId: input.actorId,
      tenantId: input.tenantId,
      primaryHypothesis: hypotheses[0] ?? null,
      rivalHypotheses: hypotheses.slice(1),
      predictions,
      expectedSignals: signals.expectedSignals,
      contradictionSignals: signals.contradictionSignals,
      observationWindows: signals.observationWindows,
      observedReturn: returnPayload.outcome ?? null,
      declaredReturnEvidenceRefs,
      returnEvidenceRefs,
      rejectedReturnEvidenceRefs: evidenceValidation.rejected,
      evidenceValidationWarning: evidenceValidation.warning,
      returnTraceability: traceableReturn ? 'VERIFIED_EVIDENCE_LINKED' : declaredReturnEvidenceRefs.length ? 'DECLARED_BUT_UNVERIFIED' : 'UNLINKED_OBSERVATION',
      requestedClassification: requestedAccepted,
      classification: accepted,
      classificationSource: text(input.classification) ? 'OPERATOR_DECLARED' : text(returnPayload.classification) ? 'RETURN_DECLARED' : 'DEFAULT_INCONCLUSIVE',
      priorConfidence,
      updatedConfidence,
      calibrationStatus,
      calibrationHeuristic: 'BOUNDED_DIRECTIONAL_V1',
      epistemicBoundary: 'Contrast records the relationship between preregistered expectations and an observed return. Calibration requires references to evidence-bearing events, excludes RETURN/contrast/closure lifecycle records, and accepts pre-runtime web evidence only when a trusted cycle lifecycle event explicitly identifies that acquisition event for this tenant/cycle. Generic lifecycle lineage, object hashes and caller-controlled identifiers never confer evidence status. Updated confidence is a bounded heuristic, not a truth probability or canonical promotion.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'reality_calibration', sourceType: 'return_contrast' },
    logbookId: `universal-cycle:${input.cycleId}`,
    lineage: [returnEventId, ...returnEvidenceRefs].filter(Boolean),
  });
}
