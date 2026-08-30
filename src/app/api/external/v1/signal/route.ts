import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { evaluateUniversalAnalysisSufficiency } from '@/lib/sfi/epistemicSufficiency';
import { resolveUniversalCaseIntake } from '@/lib/sfi/caseIntakeResolver';
import { acquireUniversalWebEvidence, resolveUniversalEvidenceRequirements } from '@/lib/sfi/evidenceRequirementResolver';
import { assessUniversalClosure, contrastLatestUniversalReturn } from '@/lib/sfi/universalClosure';
import { synthesizeUniversalCycleWithAi } from '@/lib/sfi/universalAiSynthesis';
import { hydrateUniversalCycleInput } from '@/lib/sfi/universalObservationHydrator';
import {
  closeUniversalCycle,
  describeUniversalSignalContract,
  matchOpenCycles,
  normalizeUniversalSignal,
  persistUniversalSignal,
  readUniversalCycleHistory,
  readUniversalOpenCycles,
  recordUniversalReturn,
  runUniversalCognitiveCycle,
  type UniversalCycleInput,
} from '@/lib/sfi/universalSignalCycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type SignalOperation = 'status' | 'intake' | 'run' | 'return' | 'close';
type UniversalCycleHistory = Awaited<ReturnType<typeof readUniversalCycleHistory>>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function operationScope(operation: SignalOperation) { return operation === 'status' ? 'observe' : 'lab:write'; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }

function compactEventReference(value: unknown) {
  const row = record(value);
  if (!Object.keys(row).length) return null;
  return {
    eventId: typeof row.event_id === 'string' ? row.event_id : null,
    eventName: typeof row.event_name === 'string' ? row.event_name : null,
    epistemicClass: typeof row.epistemic_class === 'string' ? row.epistemic_class : null,
    confidence: typeof row.confidence === 'number' ? row.confidence : null,
    occurredAt: typeof row.occurred_at === 'string' ? row.occurred_at : null,
  };
}

function compactEventReferences(value: unknown) {
  return Array.isArray(value)
    ? value.map(compactEventReference).filter((item): item is NonNullable<ReturnType<typeof compactEventReference>> => Boolean(item))
    : [];
}

function compactCycleHistory(history: UniversalCycleHistory | null) {
  if (!history) return null;
  const events = Array.isArray(history.events) ? history.events : [];
  return {
    ok: history.ok,
    cycleId: history.cycleId,
    state: history.state ?? null,
    error: history.error ?? null,
    eventCount: events.length,
    opened: compactEventReference(history.opened),
    latestEvent: compactEventReference(events.length ? events[events.length - 1] : null),
    resumptions: compactEventReferences(history.resumptions),
    cognitiveRuns: compactEventReferences(history.cognitiveRuns),
    structuredResults: compactEventReferences(history.structuredResults),
    aiSyntheses: compactEventReferences(history.aiSyntheses),
    returns: compactEventReferences(history.returns),
    returnContrasts: compactEventReferences(history.returnContrasts),
    closureEnvelopes: compactEventReferences(history.closureEnvelopes),
    closures: compactEventReferences(history.closures),
    transportBoundary: 'COMPACT_EXTERNAL_CHECKPOINT_NO_EVENT_PAYLOADS',
  };
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  const url = new URL(req.url);
  const cycleId = url.searchParams.get('cycleId')?.trim();
  if (cycleId) {
    const history = await readUniversalCycleHistory(cycleId);
    return NextResponse.json({
      ok: history.ok,
      operation: 'status',
      actor: externalActor(auth.credential),
      cycle: compactCycleHistory(history),
    }, { status: history.ok ? 200 : 500 });
  }
  const openCycles = await readUniversalOpenCycles();
  return NextResponse.json({
    ok: openCycles.warnings.length === 0,
    operation: 'status',
    actor: externalActor(auth.credential),
    openCycles,
    contract: {
      purpose: 'Universal signal gateway + open-cycle gate. Use ?cycleId=<id> to reread a compact canonical checkpoint for one cycle.',
      writeScope: 'lab:write; no external action authority is granted by this route.',
      historyTransport: 'Event payloads remain canonical in SFI but external cycle rereads expose bounded references only.',
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = String(body.operation || 'intake') as SignalOperation;
  if (!['status', 'intake', 'run', 'return', 'close'].includes(operation)) {
    return NextResponse.json({ ok: false, error: 'unsupported_signal_operation' }, { status: 400 });
  }

  const requiredScope = operationScope(operation);
  const auth = authorizeExternalRequest(req, requiredScope);
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, requiredScope), { status: 401 });
  const actorId = externalActor(credential);
  const tenantId = credential.tenantId ?? 'sfi';

  if (operation === 'status') {
    const cycleId = typeof body.cycleId === 'string' ? body.cycleId.trim() : '';
    if (cycleId) {
      const history = await readUniversalCycleHistory(cycleId);
      return NextResponse.json({
        ok: history.ok,
        operation,
        actor: actorId,
        cycle: compactCycleHistory(history),
      }, { status: history.ok ? 200 : 500 });
    }
    const openCycles = await readUniversalOpenCycles();
    return NextResponse.json({ ok: openCycles.warnings.length === 0, operation, actor: actorId, openCycles });
  }

  if (operation === 'return') {
    const cycleId = String(body.cycleId || '').trim();
    if (!cycleId || !('outcome' in body)) {
      return NextResponse.json({ ok: false, error: 'cycleId_and_outcome_required' }, { status: 400 });
    }
    const event = await recordUniversalReturn({
      cycleId,
      objectKey: typeof body.objectKey === 'string' ? body.objectKey : undefined,
      outcome: body.outcome,
      evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs.filter((value): value is string => typeof value === 'string') : [],
      classification: typeof body.classification === 'string' ? body.classification : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    }, actorId, tenantId);
    if (!event.ok) return NextResponse.json(event, { status: 500 });
    const historyAfterReturn = await readUniversalCycleHistory(cycleId);
    const contrast = historyAfterReturn.ok
      ? await contrastLatestUniversalReturn({
          history: historyAfterReturn,
          cycleId,
          actorId,
          tenantId,
          classification: typeof body.classification === 'string' ? body.classification : null,
        })
      : { ok: false as const, error: 'HISTORY_UNAVAILABLE_FOR_CONTRAST' };
    const history = await readUniversalCycleHistory(cycleId);
    return NextResponse.json({
      ok: true,
      operation,
      actor: actorId,
      eventId: String(event.data.event_id ?? ''),
      event: event.data,
      contrast,
      reread: compactCycleHistory(history),
      next: 'Review the contrast. If prediction or calibration is missing, keep the cycle open; otherwise prepare the closure envelope.',
    }, { status: 201 });
  }

  if (operation === 'close') {
    const cycleId = String(body.cycleId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!cycleId || !reason) {
      return NextResponse.json({ ok: false, error: 'cycleId_and_reason_required' }, { status: 400 });
    }
    const historyBefore = await readUniversalCycleHistory(cycleId);
    if (!historyBefore.ok) {
      return NextResponse.json({
        ok: false,
        error: 'cycle_history_unavailable',
        cycleId,
        history: compactCycleHistory(historyBefore),
      }, { status: 503 });
    }
    const evidenceRefs = Array.isArray(body.evidenceRefs) ? body.evidenceRefs.filter((value): value is string => typeof value === 'string') : [];
    const closureAssessment = assessUniversalClosure({ history: historyBefore, requested: body.closure, evidenceRefs });
    if (!closureAssessment.ready) {
      return NextResponse.json({
        ok: false,
        error: 'methodological_closure_incomplete',
        cycleId,
        closureAssessment,
        instruction: 'Do not close the cycle. Resolve only the missing closure fields, record any required return/contrast, then retry close with the completed closure envelope.',
      }, { status: 409 });
    }

    const envelopeEvent = await appendEpistemicEvent({
      eventName: 'SFI_UNIVERSAL_CLOSURE_ENVELOPE_ACCEPTED',
      epistemicClass: 'derived',
      confidence: 1,
      payload: {
        cycleId,
        actorId,
        tenantId,
        reason,
        closure: closureAssessment.envelope,
        epistemicBoundary: 'Acceptance means the closure contract is complete enough to dispose the methodological question. It does not canonize the conclusion as permanent truth.',
      },
      occurredAt: new Date().toISOString(),
      source: { sourceId: actorId, sourceType: 'closure_gate' },
      logbookId: `universal-cycle:${cycleId}`,
      lineage: evidenceRefs,
    });
    if (!envelopeEvent.ok) return NextResponse.json(envelopeEvent, { status: 500 });

    const event = await closeUniversalCycle({
      cycleId,
      objectKey: typeof body.objectKey === 'string' ? body.objectKey : undefined,
      reason,
      evidenceRefs,
    }, actorId, tenantId);
    const history = event.ok ? await readUniversalCycleHistory(cycleId) : null;
    return NextResponse.json(event.ok ? {
      ok: true,
      operation,
      actor: actorId,
      eventId: String(event.data.event_id ?? ''),
      event: event.data,
      closureAssessment,
      closureEnvelopeEventId: String(envelopeEvent.data.event_id ?? ''),
      reread: compactCycleHistory(history),
    } : event, { status: event.ok ? 201 : 500 });
  }

  const rawInput = record(body.input) as unknown as UniversalCycleInput;
  if (!rawInput.signal || typeof rawInput.signal !== 'object' || Array.isArray(rawInput.signal)) {
    return NextResponse.json({ ok: false, error: 'input.signal_required' }, { status: 400 });
  }
  const hydration = await hydrateUniversalCycleInput(rawInput, tenantId);
  const input = hydration.input;

  const contract = describeUniversalSignalContract(input);
  const openCycles = await readUniversalOpenCycles();
  const normalizedSignal = normalizeUniversalSignal(input.signal);
  const cycleGate = matchOpenCycles(normalizedSignal.objectKey, openCycles);
  const intakePlan = resolveUniversalCaseIntake(input);
  const clarifyingQuestions = intakePlan.questions.map((item) => item.question);
  const sufficiency = evaluateUniversalAnalysisSufficiency(input);
  const evidenceRequirement = resolveUniversalEvidenceRequirements(input);

  const requestedResumeCycleId = text(body.resumeCycleId);
  let resumeValidation: {
    requested: boolean;
    valid: boolean;
    cycleId: string | null;
    reason: string | null;
    previousEventId: string | null;
    checkpoint?: ReturnType<typeof compactCycleHistory>;
  } = {
    requested: Boolean(requestedResumeCycleId),
    valid: false,
    cycleId: requestedResumeCycleId,
    reason: null,
    previousEventId: null,
  };

  if (requestedResumeCycleId) {
    const resumeHistory = await readUniversalCycleHistory(requestedResumeCycleId);
    const openedPayload = resumeHistory.ok ? record(record(resumeHistory.opened).payload) : {};
    const openedObjectKey = text(openedPayload.objectKey);
    const closed = resumeHistory.ok && Array.isArray(resumeHistory.closures) && resumeHistory.closures.length > 0;
    const sameObject = Boolean(openedObjectKey && openedObjectKey === normalizedSignal.objectKey);
    const previousEvent = resumeHistory.ok && Array.isArray(resumeHistory.events) && resumeHistory.events.length
      ? resumeHistory.events[resumeHistory.events.length - 1]
      : null;
    resumeValidation = {
      requested: true,
      valid: Boolean(resumeHistory.ok && !closed && sameObject),
      cycleId: requestedResumeCycleId,
      reason: !resumeHistory.ok
        ? 'CYCLE_HISTORY_UNAVAILABLE'
        : closed
          ? 'CYCLE_ALREADY_CLOSED'
          : !sameObject
            ? 'OBJECT_IDENTITY_MISMATCH'
            : 'MATCHED_OPEN_CYCLE',
      previousEventId: previousEvent ? String(record(previousEvent).event_id ?? '') || null : null,
      checkpoint: compactCycleHistory(resumeHistory),
    };
  }

  const resumeMatchesBlocking = Boolean(
    resumeValidation.valid && cycleGate.blocking.some((cycle) => cycle.cycleId === requestedResumeCycleId),
  );
  const cycleBlocked = cycleGate.blocking.length > 0 && !resumeMatchesBlocking && body.continueWithOpenCycles !== true;

  if (operation === 'intake') {
    const persisted = await persistUniversalSignal(input, actorId, tenantId);
    const suggestedResumeCycleId = cycleGate.blocking.length === 1 ? String(cycleGate.blocking[0].cycleId ?? '') || null : null;
    return NextResponse.json({
      ok: persisted.event.ok,
      operation,
      actor: actorId,
      tenantId,
      hydration,
      resumeValidation,
      suggestedResumeCycleId,
      signal: persisted.signal,
      eventId: persisted.event.ok ? String(persisted.event.data.event_id ?? '') : null,
      event: persisted.event.ok ? persisted.event.data : persisted.event,
      intakePlan,
      clarifyingQuestions,
      sufficiency,
      evidenceRequirement,
      readyForRun: intakePlan.blockingQuestions.length === 0
        && sufficiency.status === 'READY'
        && !cycleBlocked
        && (!requestedResumeCycleId || resumeValidation.valid),
      cycleGate,
      methodPlan: contract.methodPlan,
      agentPlan: contract.agentPlan,
      next: intakePlan.blockingQuestions.length
        ? 'Ask only the unresolved blocking questions returned by intakePlan, then re-evaluate readiness.'
        : sufficiency.status === 'BLOCKED'
          ? `Material observation is required before analysis. Satisfy: ${sufficiency.missingObservations.join(', ')} using ${sufficiency.requiredCapabilities.join(', ')}.`
          : requestedResumeCycleId && !resumeValidation.valid
            ? `The requested resume cycle is invalid: ${resumeValidation.reason}.`
            : cycleBlocked && suggestedResumeCycleId
              ? `Resume the existing same-object cycle with resumeCycleId=${suggestedResumeCycleId}, or explicitly choose a parallel cycle.`
              : cycleBlocked
                ? 'Review blocking open cycles before opening a parallel cycle.'
                : evidenceRequirement.webPolicy === 'WEB_REQUIRED'
                  ? 'Call operation=run. Required public evidence will be acquired and checked before the cognitive runtime executes.'
                  : 'Call operation=run to execute the governed cognitive cycle; optional evidence lanes will be resolved automatically.',
    }, { status: persisted.event.ok ? 201 : 500 });
  }

  if (requestedResumeCycleId && !resumeValidation.valid) {
    return NextResponse.json({
      ok: false,
      error: 'resume_cycle_invalid',
      operation,
      hydration,
      resumeValidation,
      signal: normalizedSignal,
      cycleGate,
    }, { status: 409 });
  }

  if (intakePlan.blockingQuestions.length) {
    return NextResponse.json({
      ok: false,
      error: 'clarification_required',
      operation,
      hydration,
      resumeValidation,
      signal: normalizedSignal,
      intakePlan,
      clarifyingQuestions,
      sufficiency,
      evidenceRequirement,
      methodPlan: contract.methodPlan,
      agentPlan: contract.agentPlan,
      cycleGate,
    }, { status: 409 });
  }

  if (sufficiency.status === 'BLOCKED') {
    return NextResponse.json({
      ok: false,
      error: 'insufficient_object_observation',
      operation,
      hydration,
      resumeValidation,
      signal: normalizedSignal,
      intakePlan,
      sufficiency,
      evidenceRequirement,
      methodPlan: contract.methodPlan,
      agentPlan: contract.agentPlan,
      cycleGate,
      instruction: 'Acquire/extract the source object and supply deterministic material observations before executing a substantive cognitive cycle.',
    }, { status: 409 });
  }

  if (cycleBlocked) {
    return NextResponse.json({
      ok: false,
      error: 'open_cycle_review_required',
      operation,
      hydration,
      resumeValidation,
      signal: normalizedSignal,
      sufficiency,
      evidenceRequirement,
      cycleGate,
      instruction: 'Resume the same-object cycle with resumeCycleId when continuing the same methodological question. Use continueWithOpenCycles=true only for an explicitly independent parallel cycle.',
    }, { status: 409 });
  }

  const webEvidence = await acquireUniversalWebEvidence(input, actorId, tenantId, normalizedSignal.objectHash);
  if (evidenceRequirement.blockingIfUnavailable && !webEvidence.satisfied) {
    return NextResponse.json({
      ok: false,
      error: 'required_web_evidence_unavailable',
      operation,
      hydration,
      resumeValidation,
      signal: normalizedSignal,
      intakePlan,
      sufficiency,
      evidenceRequirement,
      webEvidence,
      instruction: 'The case explicitly requires external/public verification. Do not execute substantive inference until the required evidence lane returns enough source candidates or the operator changes the evidence policy.',
    }, { status: 424 });
  }

  const persisted = await persistUniversalSignal(input, actorId, tenantId);
  if (!persisted.event.ok) return NextResponse.json(persisted.event, { status: 500 });

  const preparedInput: UniversalCycleInput = {
    ...input,
    context: {
      ...record(input.context),
      observationHydration: {
        contract: hydration.contract,
        hydrated: hydration.hydrated,
        basis: hydration.basis,
        eventId: hydration.eventId,
      },
      resume: resumeValidation.valid ? {
        cycleId: resumeValidation.cycleId,
        previousEventId: resumeValidation.previousEventId,
        reason: text(body.resumeReason) ?? 'CAPABILITY_REMEDIATION_OR_NEW_OBSERVATION',
      } : null,
      evidenceRequirement,
      acquiredWebEvidence: {
        eventId: webEvidence.eventId,
        policy: webEvidence.policy,
        provider: webEvidence.provider,
        attempted: webEvidence.attempted,
        satisfied: webEvidence.satisfied,
        warnings: webEvidence.warnings,
        sources: webEvidence.sources.map((source) => ({
          id: source.id,
          url: source.url,
          title: source.title,
          publisher: source.publisher,
          snippet: source.snippet,
          publishedAt: source.publishedAt,
          retrievedAt: source.retrievedAt,
          sourceType: source.sourceType,
          reliability: source.reliability,
          epistemicClass: 'SOURCE_CLAIM',
        })),
      },
    },
  };

  try {
    const cycle = await runUniversalCognitiveCycle(preparedInput, actorId, tenantId, resumeValidation.valid ? {
      resumeCycleId: resumeValidation.cycleId ?? undefined,
      resumeReason: text(body.resumeReason) ?? 'CAPABILITY_REMEDIATION_OR_NEW_OBSERVATION',
      resumeLineageEventId: resumeValidation.previousEventId,
    } : undefined);

    const deterministicOutputs = {
      hypotheses: cycle.result.context.hypotheses,
      contradictions: cycle.result.context.contradictions,
      predictions: cycle.result.context.predictions,
      risks: cycle.result.context.risks,
      opportunities: cycle.result.context.opportunities,
      simulations: cycle.result.context.simulations,
    };

    const shouldSynthesize = body.aiSynthesis !== false && cycle.result.completed;
    const aiSynthesis = shouldSynthesize
      ? await synthesizeUniversalCycleWithAi({
          cycleId: cycle.cycleId,
          actorId,
          tenantId,
          question: input.question ?? null,
          objective: input.objective ?? null,
          caseClass: intakePlan.caseClass,
          signal: cycle.signal,
          deterministicOutputs,
          runtimeMetadata: {
            ...record(cycle.result.context.metadata),
            caseContext: preparedInput.context,
            webEvidenceEventId: webEvidence.eventId,
            observationHydrationEventId: hydration.eventId,
          },
        })
      : null;

    const history = await readUniversalCycleHistory(cycle.cycleId);
    return NextResponse.json({
      ok: cycle.result.completed,
      operation,
      actor: actorId,
      tenantId,
      hydration,
      resumeValidation,
      signal: cycle.signal,
      intakePlan,
      sufficiency,
      evidenceRequirement,
      webEvidence,
      intakeEventId: String(persisted.event.data.event_id ?? ''),
      intakeEvent: persisted.event.data,
      cycle: {
        cycleId: cycle.cycleId,
        taskId: cycle.taskId,
        logbookId: cycle.logbookId,
        resumed: cycle.resumed,
        completed: cycle.result.completed,
        executedAgents: cycle.result.executedAgents,
        missingAgents: cycle.result.missingAgents,
      },
      methods: cycle.methodPlan,
      agents: cycle.agentPlan,
      worldSnapshot: cycle.worldSnapshot,
      deterministicOutputs,
      aiSynthesis,
      conclusionProtocol: aiSynthesis ? {
        epistemicClass: 'INFERENCE',
        primaryHypothesis: aiSynthesis.primaryHypothesis,
        rivalHypotheses: aiSynthesis.rivalHypotheses,
        predictions: aiSynthesis.predictions,
        missingEvidence: aiSynthesis.missingEvidence,
        next: aiSynthesis.predictions.length
          ? 'Register/observe the discriminating return before empirical closure.'
          : 'Do not fabricate a prediction. Resolve the missing evidence or close only as DESCRIPTIVE_DELIMITED if methodologically appropriate.',
      } : null,
      metadata: cycle.result.context.metadata,
      reread: compactCycleHistory(history),
      next: 'Keep the cycle open until the methodological return/contrast/closure contract is satisfied.',
      epistemicBoundary: 'Resuming reuses the same methodological cycle/logbook; it does not erase prior failed/degraded runs. Deterministic observations, AI inference and source claims remain separate.',
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'universal_cognitive_cycle_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
