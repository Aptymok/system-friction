import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import {
  buildClarifyingQuestions,
  closeUniversalCycle,
  describeUniversalSignalContract,
  matchOpenCycles,
  normalizeUniversalSignal,
  persistUniversalSignal,
  readUniversalOpenCycles,
  recordUniversalReturn,
  runUniversalCognitiveCycle,
  type UniversalCycleInput,
} from '@/lib/sfi/universalSignalCycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type SignalOperation = 'status' | 'intake' | 'run' | 'return' | 'close';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function operationScope(operation: SignalOperation) {
  return operation === 'status' ? 'observe' : 'lab:write';
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  const openCycles = await readUniversalOpenCycles();
  return NextResponse.json({
    ok: openCycles.warnings.length === 0,
    operation: 'status',
    actor: externalActor(auth.credential),
    openCycles,
    contract: {
      purpose: 'Universal signal gateway + open-cycle gate. Accepts any declared representation, preserves provenance, routes SFI methods, and can execute the existing governed cognitive runtime.',
      writeScope: 'lab:write (backward-compatible); no external action authority is granted by this route.',
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
    return NextResponse.json(event.ok ? { ok: true, operation, actor: actorId, event: event.data } : event, { status: event.ok ? 201 : 500 });
  }

  if (operation === 'close') {
    const cycleId = String(body.cycleId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!cycleId || !reason) return NextResponse.json({ ok: false, error: 'cycleId_and_reason_required' }, { status: 400 });
    const event = await closeUniversalCycle({
      cycleId,
      objectKey: typeof body.objectKey === 'string' ? body.objectKey : undefined,
      reason,
      evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs.filter((value): value is string => typeof value === 'string') : [],
    }, actorId, tenantId);
    return NextResponse.json(event.ok ? { ok: true, operation, actor: actorId, event: event.data } : event, { status: event.ok ? 201 : 500 });
  }

  const input = record(body.input) as unknown as UniversalCycleInput;
  if (!input.signal || typeof input.signal !== 'object' || Array.isArray(input.signal)) {
    return NextResponse.json({ ok: false, error: 'input.signal_required' }, { status: 400 });
  }

  const contract = describeUniversalSignalContract(input);
  const openCycles = await readUniversalOpenCycles();
  const normalizedSignal = normalizeUniversalSignal(input.signal);
  const cycleGate = matchOpenCycles(normalizedSignal.objectKey, openCycles);
  const clarifyingQuestions = buildClarifyingQuestions(input);

  if (operation === 'intake') {
    const persisted = await persistUniversalSignal(input, actorId, tenantId);
    return NextResponse.json({
      ok: persisted.event.ok,
      operation,
      actor: actorId,
      tenantId,
      signal: persisted.signal,
      event: persisted.event.ok ? persisted.event.data : persisted.event,
      clarifyingQuestions,
      readyForRun: clarifyingQuestions.length === 0,
      cycleGate,
      openCycles,
      methodPlan: contract.methodPlan,
      agentPlan: contract.agentPlan,
      next: clarifyingQuestions.length
        ? 'Ask only the returned clarifying questions that are still unresolved, then call operation=run.'
        : cycleGate.blocking.length && body.continueWithOpenCycles !== true
          ? 'Review the blocking open cycles. Record return/close them, or explicitly set continueWithOpenCycles=true.'
          : 'Call operation=run to execute the governed cognitive cycle.',
    }, { status: persisted.event.ok ? 201 : 500 });
  }

  if (clarifyingQuestions.length) {
    return NextResponse.json({
      ok: false,
      error: 'clarification_required',
      operation,
      signal: normalizedSignal,
      clarifyingQuestions,
      methodPlan: contract.methodPlan,
      agentPlan: contract.agentPlan,
      cycleGate,
    }, { status: 409 });
  }

  if (cycleGate.blocking.length && body.continueWithOpenCycles !== true) {
    return NextResponse.json({
      ok: false,
      error: 'open_cycle_review_required',
      operation,
      signal: normalizedSignal,
      cycleGate,
      instruction: 'Close or record return for the same-object cycle before opening another one, unless the user explicitly chooses to continue in parallel.',
    }, { status: 409 });
  }

  const persisted = await persistUniversalSignal(input, actorId, tenantId);
  if (!persisted.event.ok) return NextResponse.json(persisted.event, { status: 500 });

  try {
    const cycle = await runUniversalCognitiveCycle(input, actorId, tenantId);
    return NextResponse.json({
      ok: cycle.result.completed,
      operation,
      actor: actorId,
      tenantId,
      signal: cycle.signal,
      intakeEvent: persisted.event.data,
      cycle: {
        cycleId: cycle.cycleId,
        taskId: cycle.taskId,
        logbookId: cycle.logbookId,
        completed: cycle.result.completed,
        executedAgents: cycle.result.executedAgents,
        missingAgents: cycle.result.missingAgents,
      },
      methods: cycle.methodPlan,
      agents: cycle.agentPlan,
      worldSnapshot: cycle.worldSnapshot,
      outputs: {
        hypotheses: cycle.result.context.hypotheses,
        contradictions: cycle.result.context.contradictions,
        predictions: cycle.result.context.predictions,
        risks: cycle.result.context.risks,
        opportunities: cycle.result.context.opportunities,
        simulations: cycle.result.context.simulations,
      },
      metadata: cycle.result.context.metadata,
      next: 'Keep the cycle open until a return is observed. Use operation=return with observed outcome/evidence, then operation=close when the methodological question is sufficiently resolved.',
      epistemicBoundary: 'The route executes internal observation/reconstruction/simulation roles only. It does not approve proposals, perform external actions, or canonize conclusions.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'universal_cognitive_cycle_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
