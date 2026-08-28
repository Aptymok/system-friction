import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { evaluateUniversalAnalysisSufficiency } from '@/lib/sfi/epistemicSufficiency';
import { resolveUniversalCaseIntake } from '@/lib/sfi/caseIntakeResolver';
import { acquireUniversalWebEvidence, resolveUniversalEvidenceRequirements } from '@/lib/sfi/evidenceRequirementResolver';
import { assessUniversalClosure, contrastLatestUniversalReturn } from '@/lib/sfi/universalClosure';
import { synthesizeUniversalCycleWithAi } from '@/lib/sfi/universalAiSynthesis';
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
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function operationScope(operation: SignalOperation) { return operation === 'status' ? 'observe' : 'lab:write'; }

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  const url = new URL(req.url);
  const cycleId = url.searchParams.get('cycleId')?.trim();
  if (cycleId) {
    const history = await readUniversalCycleHistory(cycleId);
    return NextResponse.json({ ok: history.ok, operation: 'status', actor: externalActor(auth.credential), cycle: history }, { status: history.ok ? 200 : 500 });
  }
  const openCycles = await readUniversalOpenCycles();
  return NextResponse.json({
    ok: openCycles.warnings.length === 0,
    operation: 'status',
    actor: externalActor(auth.credential),
    openCycles,
    contract: {
      purpose: 'Universal signal gateway + open-cycle gate. Use ?cycleId=<id> to reread canonical event history for one cycle.',
      writeScope: 'lab:write; no external action authority is granted by this route.',
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = String(body.operation || 'intake') as SignalOperation;
  if (!['status', 'intake', 'run', 'return', 'close'].includes(operation)) return NextResponse.json({ ok: false, error: 'unsupported_signal_operation' }, { status: 400 });

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
      return NextResponse.json({ ok: history.ok, operation, actor: actorId, cycle: history }, { status: history.ok ? 200 : 500 });
    }
    const openCycles = await readUniversalOpenCycles();
    return NextResponse.json({ ok: openCycles.warnings.length === 0, operation, actor: actorId, openCycles });
  }

  if (operation === 'return') {
    const cycleId = String(body.cycleId || '').trim();
    if (!cycleId || !('outcome' in body)) return NextResponse.json({ ok: false, error: 'cycleId_and_outcome_required' }, { status: 400 });
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
      reread: history,
      next: 'Review the contrast. If prediction or calibration is missing, keep the cycle open; otherwise prepare the closure envelope.',
    }, { status: 201 });
  }

  if (operation === 'close') {
    const cycleId = String(body.cycleId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!cycleId || !reason) return NextResponse.json({ ok: false, error: 'cycleId_and_reason_required' }, { status: 400 });
    const historyBefore = await readUniversalCycleHistory(cycleId);
    if (!historyBefore.ok) return NextResponse.json({ ok: false, error: 'cycle_history_unavailable', cycleId, history: historyBefore }, { status: 503 });
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
      reread: history,
    } : event, { status: event.ok ? 201 : 500 });
  }

  const input = record(body.input) as unknown as UniversalCycleInput;
  if (!input.signal || typeof input.signal !== 'object' || Array.isArray(input.signal)) return NextResponse.json({ ok: false, error: 'input.signal_required' }, { status: 400 });

  const contract = describeUniversalSignalContract(input);
  const openCycles = await readUniversalOpenCycles();
  const normalizedSignal = normalizeUniversalSignal(input.signal);
  const cycleGate = matchOpenCycles(normalizedSignal.objectKey, openCycles);
  const intakePlan = resolveUniversalCaseIntake(input);
  const clarifyingQuestions = intakePlan.questions.map((item) => item.question);
  const sufficiency = evaluateUniversalAnalysisSufficiency(input);
  const evidenceRequirement = resolveUniversalEvidenceRequirements(input);
  const cycleBlocked = cycleGate.blocking.length > 0 && body.continueWithOpenCycles !== true;

  if (operation === 'intake') {
    const persisted = await persistUniversalSignal(input, actorId, tenantId);
    return NextResponse.json({
      ok: persisted.event.ok,
      operation,
      actor: actorId,
      tenantId,
      signal: persisted.signal,
      eventId: persisted.event.ok ? String(persisted.event.data.event_id ?? '') : null,
      event: persisted.event.ok ? persisted.event.data : persisted.event,
      intakePlan,
      clarifyingQuestions,
      sufficiency,
      evidenceRequirement,
      readyForRun: intakePlan.blockingQuestions.length === 0 && sufficiency.status === 'READY' && !cycleBlocked,
      cycleGate,
      methodPlan: contract.methodPlan,
      agentPlan: contract.agentPlan,
      next: intakePlan.blockingQuestions.length
        ? 'Ask only the unresolved blocking questions returned by intakePlan, then re-evaluate readiness.'
        : sufficiency.status === 'BLOCKED'
          ? `Material observation is required before analysis. Satisfy: ${sufficiency.missingObservations.join(', ')} using ${sufficiency.requiredCapabilities.join(', ')}.`
          : cycleBlocked
            ? 'Review blocking open cycles. Record return/close them, or explicitly set continueWithOpenCycles=true.'
            : evidenceRequirement.webPolicy === 'WEB_REQUIRED'
              ? 'Call operation=run. Required public evidence will be acquired and checked before the cognitive runtime executes.'
              : 'Call operation=run to execute the governed cognitive cycle; optional evidence lanes will be resolved automatically.',
    }, { status: persisted.event.ok ? 201 : 500 });
  }

  if (intakePlan.blockingQuestions.length) return NextResponse.json({ ok: false, error: 'clarification_required', operation, signal: normalizedSignal, intakePlan, clarifyingQuestions, sufficiency, evidenceRequirement, methodPlan: contract.methodPlan, agentPlan: contract.agentPlan, cycleGate }, { status: 409 });
  if (sufficiency.status === 'BLOCKED') {
    return NextResponse.json({
      ok: false,
      error: 'insufficient_object_observation',
      operation,
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
  if (cycleBlocked) return NextResponse.json({ ok: false, error: 'open_cycle_review_required', operation, signal: normalizedSignal, sufficiency, evidenceRequirement, cycleGate, instruction: 'Close or record return for the same-object cycle before opening another one, unless the user explicitly chooses to continue in parallel.' }, { status: 409 });

  const webEvidence = await acquireUniversalWebEvidence(input, actorId, tenantId, normalizedSignal.objectHash);
  if (evidenceRequirement.blockingIfUnavailable && !webEvidence.satisfied) {
    return NextResponse.json({
      ok: false,
      error: 'required_web_evidence_unavailable',
      operation,
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
    const cycle = await runUniversalCognitiveCycle(preparedInput, actorId, tenantId);
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
          },
        })
      : null;
    const history = await readUniversalCycleHistory(cycle.cycleId);
    return NextResponse.json({
      ok: cycle.result.completed,
      operation,
      actor: actorId,
      tenantId,
      signal: cycle.signal,
      intakePlan,
      sufficiency,
      evidenceRequirement,
      webEvidence,
      intakeEventId: String(persisted.event.data.event_id ?? ''),
      intakeEvent: persisted.event.data,
      cycle: { cycleId: cycle.cycleId, taskId: cycle.taskId, logbookId: cycle.logbookId, completed: cycle.result.completed, executedAgents: cycle.result.executedAgents, missingAgents: cycle.result.missingAgents },
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
      reread: history,
      next: 'Keep the cycle open until the methodological return/contrast/closure contract is satisfied.',
      epistemicBoundary: 'Deterministic outputs, AI inference and retrieved source claims remain separate. The route does not approve proposals, perform external actions, or canonize conclusions.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'universal_cognitive_cycle_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
