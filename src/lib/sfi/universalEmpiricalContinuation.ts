import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { assessUniversalClosure } from '@/lib/sfi/universalClosure';
import {
  recordUniversalLearningCandidate,
  readUniversalLearningCycleState,
} from '@/lib/sfi/universalLearningQuarantine';
import {
  readUniversalCycleHistory,
  type UniversalCycleHistory,
} from '@/lib/sfi/universalSignalCycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

const RETURN_EVIDENCE_CLASSES = new Set(['observed', 'imported', 'extracted', 'canonical']);
const NON_EVIDENCE_EVENT_NAMES = new Set([
  'SFI_UNIVERSAL_RETURN_RECORDED',
  'SFI_UNIVERSAL_RETURN_CONTRASTED',
  'SFI_UNIVERSAL_RETURN_AI_CLASSIFICATION_PROPOSED',
  'SFI_UNIVERSAL_CLOSURE_ENVELOPE_ACCEPTED',
  'SFI_UNIVERSAL_CLOSURE_RECOMMENDED',
  'SFI_UNIVERSAL_REPORT_DENIED_BY_USER',
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

type Classification = 'CONFIRMED' | 'PARTIAL' | 'CONTRADICTED' | 'INCONCLUSIVE';

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown, max = 4000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function strings(value: unknown, max = 50) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, max)
    : [];
}

function payload(value: unknown) {
  return row(row(value).payload);
}

function latest(values: unknown[] | undefined) {
  return Array.isArray(values) && values.length ? values[values.length - 1] : null;
}

function sequence(value: unknown) {
  const parsed = Number(row(value).sequence);
  return Number.isFinite(parsed) ? parsed : -1;
}

function latestNamed(history: UniversalCycleHistory, eventName: string) {
  const matches = (history.events ?? []).filter((value) => text(row(value).event_name) === eventName);
  return row(latest(matches));
}

function statement(value: unknown) {
  if (typeof value === 'string') return value.trim() || null;
  const item = row(value);
  return text(item.statement) ?? text(item.hypothesis) ?? text(item.claim) ?? text(item.description) ?? text(item.prediction) ?? text(item.summary);
}

function uniqueStatements(values: unknown[]) {
  const map = new Map<string, unknown>();
  for (const value of values) {
    const key = statement(value)?.toLowerCase();
    if (key && !map.has(key)) map.set(key, value);
  }
  return [...map.values()];
}

function collectRunValues(history: UniversalCycleHistory, key: string) {
  const values: unknown[] = [];
  for (const event of history.cognitiveRuns ?? []) {
    const eventPayload = payload(event);
    values.push(...(Array.isArray(eventPayload[key]) ? eventPayload[key] as unknown[] : []));
  }
  for (const event of history.structuredResults ?? []) {
    const result = row(payload(event).result);
    values.push(...(Array.isArray(result[key]) ? result[key] as unknown[] : []));
  }
  for (const event of history.events ?? []) {
    if (row(event).event_name !== 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED') continue;
    const synthesis = row(payload(event).synthesis);
    if (key === 'hypotheses') {
      if (synthesis.primaryHypothesis) values.push(synthesis.primaryHypothesis);
      if (Array.isArray(synthesis.rivalHypotheses)) values.push(...synthesis.rivalHypotheses);
    } else if (key === 'predictions') {
      if (Array.isArray(synthesis.predictions)) values.push(...synthesis.predictions);
    } else if (Array.isArray(synthesis[key])) {
      values.push(...synthesis[key] as unknown[]);
    }
  }
  return values;
}

function predictionSignals(predictions: unknown[]) {
  const expected = new Set<string>();
  const contradictory = new Set<string>();
  const windows = new Set<string>();
  for (const value of predictions) {
    const prediction = row(value);
    for (const signal of strings(prediction.expectedSignals)) expected.add(signal);
    for (const signal of strings(prediction.contradictionSignals)) contradictory.add(signal);
    const window = text(prediction.observationWindow);
    if (window) windows.add(window);
  }
  return { expectedSignals: [...expected], contradictionSignals: [...contradictory], observationWindows: [...windows] };
}

function trustedCycleLinkedEvidenceRefs(history: UniversalCycleHistory) {
  const refs = new Set<string>();
  for (const value of history.events ?? []) {
    const event = row(value);
    const eventName = text(event.event_name);
    if (!eventName || !TRUSTED_CYCLE_LINK_EVENTS.has(eventName)) continue;
    const eventPayload = row(event.payload);
    for (const ref of [text(eventPayload.webEvidenceEventId), text(eventPayload.hydrationEventId)]) if (ref) refs.add(ref);
    const metadata = row(eventPayload.metadata);
    for (const ref of [text(metadata.webEvidenceEventId), text(metadata.hydrationEventId)]) if (ref) refs.add(ref);
  }
  return refs;
}

async function validateReturnEvidenceRefs(input: {
  refs: string[];
  cycleId: string;
  tenantId: string;
  history: UniversalCycleHistory;
}) {
  const refs = [...new Set(input.refs)].slice(0, 50);
  if (!refs.length) return { ok: true as const, verified: [] as string[], rejected: [] as string[], warning: null as string | null };
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,logbook_id')
    .in('event_id', refs);
  if (result.error) return { ok: false as const, verified: [] as string[], rejected: refs, warning: result.error.message };

  const expectedLogbooks = new Set([
    `universal-cycle:${input.cycleId}`,
    `structured-result:${input.cycleId}`,
    `universal-evidence:${input.cycleId}`,
  ]);
  const trustedLinkedRefs = trustedCycleLinkedEvidenceRefs(input.history);
  const verified: string[] = [];
  for (const value of result.data ?? []) {
    const event = row(value);
    const eventPayload = row(event.payload);
    const eventId = text(event.event_id);
    const eventName = text(event.event_name);
    const eventTenant = text(eventPayload.tenantId);
    const eventCycle = text(eventPayload.cycleId) ?? text(eventPayload.cycleKey);
    const logbookId = text(event.logbook_id);
    const sameTenant = !eventTenant || eventTenant === input.tenantId;
    const sameCycle = eventCycle === input.cycleId
      || Boolean(logbookId && expectedLogbooks.has(logbookId))
      || Boolean(eventId && trustedLinkedRefs.has(eventId));
    const evidenceClass = RETURN_EVIDENCE_CLASSES.has(text(event.epistemic_class) ?? '');
    const evidenceBearing = Boolean(eventName) && evidenceClass && !NON_EVIDENCE_EVENT_NAMES.has(eventName!);
    if (eventId && sameTenant && sameCycle && evidenceBearing) verified.push(eventId);
  }
  const verifiedSet = new Set(verified);
  return { ok: true as const, verified, rejected: refs.filter((ref) => !verifiedSet.has(ref)), warning: null as string | null };
}

function parseAiClassification(value: string): { classification: Classification; reason: string; confidence: number | null } | null {
  try {
    const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = row(JSON.parse(clean));
    const classification = text(parsed.classification, 40)?.toUpperCase();
    if (!['CONFIRMED', 'PARTIAL', 'CONTRADICTED', 'INCONCLUSIVE'].includes(classification ?? '')) return null;
    const rawConfidence = Number(parsed.confidence);
    const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence)) : null;
    return {
      classification: classification as Classification,
      reason: text(parsed.reason, 1800) ?? 'No reason supplied.',
      confidence,
    };
  } catch {
    return null;
  }
}

async function classifyReturnWithAi(history: UniversalCycleHistory, cycleId: string, returnEvent: Row) {
  const returnPayload = payload(returnEvent);
  const declared = text(returnPayload.classification)?.toUpperCase();
  if (declared && ['CONFIRMED', 'PARTIAL', 'CONTRADICTED', 'INCONCLUSIVE'].includes(declared)) {
    return {
      classification: declared as Classification,
      source: 'RETURN_DECLARED' as const,
      eventId: null,
      provider: null,
      model: null,
      reason: 'The observed RETURN already carries an explicit classification supplied with the observation.',
      confidence: null,
    };
  }

  const hypotheses = uniqueStatements(collectRunValues(history, 'hypotheses'));
  const predictions = uniqueStatements(collectRunValues(history, 'predictions'));
  const signals = predictionSignals(predictions);
  const llm = await runLlmTask({
    task: 'fast_classification',
    system: [
      'You are the reality-calibration classifier inside System Friction Institute.',
      'Classify the relationship between a persisted prediction and a persisted observed RETURN.',
      'Do not create evidence, measurements, causal claims, source semantics or observations.',
      'CONFIRMED means the observed evidence matches the discriminating expected signals without a material contradiction.',
      'PARTIAL means material expected signals appear but the observation is incomplete, mixed or contains meaningful contradictory signal.',
      'CONTRADICTED means the observed evidence materially matches preregistered contradiction signals or falsifies the prediction.',
      'INCONCLUSIVE means the evidence or discriminating structure is insufficient.',
      'Return ONLY JSON: {"classification":"CONFIRMED|PARTIAL|CONTRADICTED|INCONCLUSIVE","reason":string,"confidence":number|null}.',
    ].join('\n'),
    prompt: JSON.stringify({
      cycleId,
      primaryHypothesis: hypotheses[0] ?? null,
      rivalHypotheses: hypotheses.slice(1, 5),
      predictions: predictions.slice(0, 6),
      expectedSignals: signals.expectedSignals,
      contradictionSignals: signals.contradictionSignals,
      observationWindows: signals.observationWindows,
      observedReturn: returnPayload.outcome ?? null,
      returnEvidenceRefs: strings(returnPayload.evidenceRefs),
    }).slice(0, 12000),
    fallbackResult: '{"classification":"INCONCLUSIVE","reason":"No governed model produced a valid contrast classification.","confidence":null}',
    requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
    maxTokens: 650,
  });
  const parsed = parseAiClassification(llm.result) ?? {
    classification: 'INCONCLUSIVE' as const,
    reason: 'AI contrast classification schema was invalid.',
    confidence: null,
  };
  const classificationEvent = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_RETURN_AI_CLASSIFICATION_PROPOSED',
    epistemicClass: 'inferred',
    confidence: parsed.confidence ?? 0,
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'sfi_empirical_continuation', sourceType: 'ai_return_classifier' },
    logbookId: `universal-cycle:${cycleId}`,
    lineage: [text(returnEvent.event_id)].filter((item): item is string => Boolean(item)),
    payload: {
      cycleId,
      returnEventId: text(returnEvent.event_id),
      classification: parsed.classification,
      reason: parsed.reason,
      modelConfidence: parsed.confidence,
      provider: llm.ok ? llm.provider : null,
      model: llm.ok ? llm.model : null,
      warnings: llm.warnings,
      authority: 'INFERENCE_ONLY',
      epistemicBoundary: 'AI classification proposes the contrast direction. Verified evidence linkage and persisted preregistration remain mandatory before calibration can be recorded.',
    },
  });
  return {
    ...parsed,
    source: 'AI_GOVERNED_RETURN_CONTRAST' as const,
    eventId: classificationEvent.ok ? String(classificationEvent.data.event_id ?? '') || null : null,
    provider: llm.ok ? llm.provider : null,
    model: llm.ok ? llm.model : null,
  };
}

async function contrastLatestReturn(history: UniversalCycleHistory, cycleId: string, tenantId: string) {
  const predictions = uniqueStatements(collectRunValues(history, 'predictions'));
  const hypotheses = uniqueStatements(collectRunValues(history, 'hypotheses'));
  const signals = predictionSignals(predictions);
  const lastReturn = row(latest(history.returns));
  if (!Object.keys(lastReturn).length) return { ok: false as const, error: 'RETURN_REQUIRED_FOR_CONTRAST' };
  const returnPayload = payload(lastReturn);
  const returnEventId = text(lastReturn.event_id) ?? '';

  const existingContrast = [...(history.returnContrasts ?? [])].reverse().find((value) => strings(row(value).lineage).includes(returnEventId));
  if (existingContrast) return { ok: true as const, reused: true as const, event: existingContrast, data: existingContrast };

  const declaredReturnEvidenceRefs = [
    ...strings(returnPayload.evidenceRefs),
    ...strings(lastReturn.lineage),
  ].filter((value, index, values) => values.indexOf(value) === index);
  const evidenceValidation = await validateReturnEvidenceRefs({ refs: declaredReturnEvidenceRefs, cycleId, tenantId, history });
  const classification = await classifyReturnWithAi(history, cycleId, lastReturn);
  const hasPrediction = predictions.length > 0;
  const hasDiscriminatingSignals = signals.expectedSignals.length > 0 && signals.contradictionSignals.length > 0;
  const traceableReturn = evidenceValidation.verified.length > 0;
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
            : classification.classification === 'INCONCLUSIVE'
              ? 'REQUIRES_REVIEW'
              : 'CONTRAST_RECORDED';
  const accepted: Classification = calibrationStatus === 'CONTRAST_RECORDED' ? classification.classification : 'INCONCLUSIVE';
  const priorConfidence = typeof row(hypotheses[0]).confidence === 'number' ? Number(row(hypotheses[0]).confidence) : 0.5;
  const updatedConfidence = accepted === 'CONFIRMED'
    ? Math.min(0.95, Math.max(priorConfidence, 0.7) + 0.1)
    : accepted === 'PARTIAL'
      ? Math.min(0.8, Math.max(0.5, priorConfidence))
      : accepted === 'CONTRADICTED'
        ? Math.max(0.05, Math.min(priorConfidence, 0.4) - 0.15)
        : priorConfidence;

  return appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_RETURN_CONTRASTED',
    epistemicClass: 'derived',
    confidence: calibrationStatus === 'CONTRAST_RECORDED' ? 0.8 : 0.5,
    payload: {
      contract: 'SFI-RETURN-CONTRAST-1.2',
      cycleId,
      actorId: 'sfi_empirical_continuation',
      tenantId,
      primaryHypothesis: hypotheses[0] ?? null,
      rivalHypotheses: hypotheses.slice(1),
      predictions,
      expectedSignals: signals.expectedSignals,
      contradictionSignals: signals.contradictionSignals,
      observationWindows: signals.observationWindows,
      observedReturn: returnPayload.outcome ?? null,
      declaredReturnEvidenceRefs,
      returnEvidenceRefs: evidenceValidation.verified,
      rejectedReturnEvidenceRefs: evidenceValidation.rejected,
      evidenceValidationWarning: evidenceValidation.warning,
      returnTraceability: traceableReturn ? 'VERIFIED_EVIDENCE_LINKED' : declaredReturnEvidenceRefs.length ? 'DECLARED_BUT_UNVERIFIED' : 'UNLINKED_OBSERVATION',
      requestedClassification: classification.classification,
      classification: accepted,
      classificationSource: classification.source,
      classificationEventId: classification.eventId,
      classificationProvider: classification.provider,
      classificationModel: classification.model,
      classificationReason: classification.reason,
      classificationConfidence: classification.confidence,
      priorConfidence,
      updatedConfidence,
      calibrationStatus,
      calibrationHeuristic: 'BOUNDED_DIRECTIONAL_V1',
      epistemicBoundary: 'AI proposes classification only. Contrast becomes calibrated only when preregistration is discriminating and the RETURN links to verified evidence-bearing events. Updated confidence is bounded operational calibration, not truth probability or canon.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'sfi_empirical_continuation', sourceType: 'governed_return_contrast' },
    logbookId: `universal-cycle:${cycleId}`,
    lineage: [returnEventId, classification.eventId, ...evidenceValidation.verified].filter((item): item is string => Boolean(item)),
  });
}

async function finalizeLearningIfEligible(cycleId: string, tenantId: string, history: UniversalCycleHistory) {
  const learningState = await readUniversalLearningCycleState(cycleId);
  if (learningState.ok && learningState.events.some((event) => row(event).event_name === 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED')) {
    return { state: 'LEARNING_CANDIDATE_ALREADY_RECORDED' as const };
  }
  const closure = latest(history.closures);
  if (!closure) return { state: 'CLOSURE_REQUIRED_FOR_LEARNING' as const };
  const candidate = await recordUniversalLearningCandidate({
    history,
    requested: { classification: 'CALIBRATED_RETURN' },
    actorId: 'sfi_empirical_continuation',
    tenantId,
    closureEventId: text(row(closure).event_id),
  });
  return candidate.ok
    ? { state: 'LEARNING_CANDIDATE_RECORDED' as const, eventId: candidate.eventId, candidate: candidate.candidate }
    : { state: 'LEARNING_CANDIDATE_FAILED' as const, error: candidate.error, candidate: candidate.candidate };
}

async function continueOne(cycleId: string) {
  let history = await readUniversalCycleHistory(cycleId);
  if (!history.ok) return { cycleId, state: 'HISTORY_UNAVAILABLE', error: history.error };
  const latestReturn = row(latest(history.returns));
  if (!Object.keys(latestReturn).length) return { cycleId, state: 'RETURN_NOT_RECORDED' };
  const tenantId = text(payload(latestReturn).tenantId) ?? 'sfi';

  if (history.closures?.length) {
    const learning = await finalizeLearningIfEligible(cycleId, tenantId, history);
    return { cycleId, state: learning.state, learning };
  }

  const contrast = await contrastLatestReturn(history, cycleId, tenantId);
  if (!contrast.ok) return { cycleId, state: 'CONTRAST_FAILED', contrast };
  history = await readUniversalCycleHistory(cycleId);
  if (!history.ok) return { cycleId, state: 'POST_CONTRAST_HISTORY_UNAVAILABLE', error: history.error };

  const latestContrast = row(latest(history.returnContrasts));
  const contrastPayload = payload(latestContrast);
  if (text(contrastPayload.calibrationStatus) !== 'CONTRAST_RECORDED') {
    return {
      cycleId,
      state: 'CONTRAST_NOT_CALIBRATED',
      calibrationStatus: text(contrastPayload.calibrationStatus),
      classification: text(contrastPayload.classification),
      returnTraceability: text(contrastPayload.returnTraceability),
    };
  }

  const closureAssessment = assessUniversalClosure({
    history,
    requested: { closureClass: 'EMPIRICAL_CONTRAST' },
    evidenceRefs: strings(contrastPayload.returnEvidenceRefs),
  });
  if (!closureAssessment.ready) {
    return { cycleId, state: 'CLOSURE_NOT_READY', missing: closureAssessment.missing, closureAssessment };
  }

  const recommendation = latestNamed(history, 'SFI_UNIVERSAL_CLOSURE_RECOMMENDED');
  const denial = latestNamed(history, 'SFI_UNIVERSAL_REPORT_DENIED_BY_USER');
  const contrastSequence = sequence(latestContrast);
  const recommendationSequence = sequence(recommendation);
  const denialSequence = sequence(denial);

  if (recommendationSequence > contrastSequence && recommendationSequence > denialSequence) {
    return {
      cycleId,
      state: 'AWAITING_USER_CLOSE',
      recommendationEventId: text(recommendation.event_id),
      classification: text(contrastPayload.classification),
      closureAssessment,
    };
  }

  if (denialSequence > recommendationSequence && denialSequence > contrastSequence) {
    return {
      cycleId,
      state: 'REPORT_DENIED_AWAITING_NEW_EVIDENCE',
      denialEventId: text(denial.event_id),
      classification: text(contrastPayload.classification),
    };
  }

  const evidenceRefs = strings(contrastPayload.returnEvidenceRefs);
  const recommendationEvent = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_CLOSURE_RECOMMENDED',
    epistemicClass: 'derived',
    confidence: 1,
    payload: {
      cycleId,
      actorId: 'sfi_empirical_continuation',
      tenantId,
      reason: 'EMPIRICAL_RETURN_CONTRAST_COMPLETE',
      closure: closureAssessment.envelope,
      reportState: 'READY_FOR_USER_DECISION',
      finalClosureAuthority: 'AUTHENTICATED_USER',
      autonomousContinuation: false,
      epistemicBoundary: 'SFI may determine that the methodological work is ready for closure, but it cannot close the report/cycle. Final closure requires an explicit authenticated user decision. Closure still does not canonize the conclusion as permanent truth.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'sfi_empirical_continuation', sourceType: 'empirical_closure_recommendation' },
    logbookId: `universal-cycle:${cycleId}`,
    lineage: [text(latestContrast.event_id), ...evidenceRefs].filter((item): item is string => Boolean(item)),
  });
  if (!recommendationEvent.ok) return { cycleId, state: 'CLOSURE_RECOMMENDATION_PERSIST_FAILED', error: recommendationEvent.error };

  return {
    cycleId,
    state: 'AWAITING_USER_CLOSE',
    contrastEventId: text(latestContrast.event_id),
    recommendationEventId: String(recommendationEvent.data.event_id ?? ''),
    classification: text(contrastPayload.classification),
    closureAssessment,
  };
}

export async function runUniversalEmpiricalContinuation(input: { limit?: number; cycleId?: string } = {}) {
  const db = createServiceSupabaseClient();
  const recent = await db.from('epistemic_events')
    .select('sequence,payload')
    .eq('event_name', 'SFI_UNIVERSAL_RETURN_RECORDED')
    .order('sequence', { ascending: false })
    .limit(500);
  if (recent.error) return { ok: false as const, processed: 0, results: [], error: recent.error.message };

  const requestedCycleId = text(input.cycleId);
  const cycleIds: string[] = [];
  for (const value of recent.data ?? []) {
    const cycleId = text(row(value.payload).cycleId);
    if (!cycleId || cycleIds.includes(cycleId)) continue;
    if (requestedCycleId && cycleId !== requestedCycleId) continue;
    cycleIds.push(cycleId);
  }
  const selected = cycleIds.slice(0, requestedCycleId ? 1 : Math.max(1, Math.min(10, input.limit ?? 3)));
  const results: Row[] = [];
  for (const cycleId of selected) {
    try {
      results.push(await continueOne(cycleId));
    } catch (error) {
      results.push({ cycleId, state: 'EMPIRICAL_CONTINUATION_FAILED', error: error instanceof Error ? error.message : String(error) });
    }
  }
  return {
    ok: results.every((item) => !String(item.state ?? '').endsWith('_FAILED')),
    processed: results.length,
    requestedCycleId: requestedCycleId ?? null,
    results,
    rule: 'A real evidence-linked RETURN may advance automatically through AI-assisted contrast and closure assessment. SFI may recommend closure but cannot close the cycle/report; an authenticated user must accept it. Learning remains quarantined and begins only after that explicit closure.',
  };
}
