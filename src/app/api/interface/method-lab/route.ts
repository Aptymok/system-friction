import { NextResponse } from 'next/server';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';
import {
  persistMethodLabUiPreregistration,
  readMethodLabUiProjection,
  type MethodLabUiPreregistrationInput,
} from '@/lib/method-lab/uiProjection';
import { METHOD_LAB_EXPERIMENT_TYPES, type MethodLabExperimentType } from '@/lib/method-lab/experimentContract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function experimentType(value: unknown): MethodLabExperimentType | null {
  return typeof value === 'string' && METHOD_LAB_EXPERIMENT_TYPES.includes(value as MethodLabExperimentType)
    ? value as MethodLabExperimentType
    : null;
}

function statusForError(error: unknown) {
  if (error instanceof AccessDeniedError) return error.status;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('OWNER_SCOPE') || message.includes('NOT_FOUND')) return 404;
  if (message.includes('REQUIRED') || message.includes('INVALID') || message.includes('FORBIDDEN') || message.includes('MISMATCH')) return 400;
  if (message.includes('PERSIST_FAILED') || message.includes('READ_FAILED')) return 503;
  return 500;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ ok: false, error: message }, { status: statusForError(error) });
}

export async function GET() {
  try {
    const context = await requireUserProfile();
    const projection = await readMethodLabUiProjection(context.user.id);
    return NextResponse.json({
      ok: projection.warnings.length === 0,
      principal: {
        subjectId: context.user.id,
        ownerScoped: true,
      },
      projection,
    }, { status: projection.warnings.length === 0 ? 200 : 207 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireUserProfile();
    const body = await request.json().catch(() => ({})) as Row;
    const operation = requiredText(body.operation);
    if (operation !== 'preregister') {
      return NextResponse.json({
        ok: false,
        error: 'METHOD_LAB_UI_OPERATION_NOT_ALLOWED',
        allowed: ['preregister'],
        boundary: 'Execution remains owned by existing simulation/reentry runtime owners; this API does not create another experiment engine.',
      }, { status: 400 });
    }

    const type = experimentType(body.experimentType);
    if (!type) return NextResponse.json({ ok: false, error: 'METHOD_LAB_UI_EXPERIMENT_TYPE_INVALID' }, { status: 400 });
    const returnWindow = record(body.returnWindow);
    const maxExecutions = body.maxExecutions === null || body.maxExecutions === undefined || body.maxExecutions === ''
      ? null
      : Number(body.maxExecutions);
    const definition: MethodLabUiPreregistrationInput = {
      experimentId: requiredText(body.experimentId),
      experimentType: type,
      caseRef: requiredText(body.caseRef),
      evidenceRefs: strings(body.evidenceRefs),
      twinStateRef: optionalText(body.twinStateRef),
      hypothesis: requiredText(body.hypothesis),
      nullHypothesis: optionalText(body.nullHypothesis),
      t0Cutoff: requiredText(body.t0Cutoff),
      timezone: optionalText(body.timezone),
      methodDescription: requiredText(body.methodDescription),
      controlDescription: requiredText(body.controlDescription),
      variantDescriptions: strings(body.variantDescriptions),
      expectedSignal: requiredText(body.expectedSignal),
      expectedMeasures: strings(body.expectedMeasures),
      falsificationCondition: requiredText(body.falsificationCondition),
      stoppingCondition: requiredText(body.stoppingCondition),
      maxExecutions: maxExecutions === null || (Number.isInteger(maxExecutions) && maxExecutions > 0) ? maxExecutions : Number.NaN,
      returnWindow: {
        opensAt: requiredText(returnWindow.opensAt),
        closesAt: requiredText(returnWindow.closesAt),
        required: returnWindow.required === true,
      },
    };

    if (!Number.isFinite(definition.maxExecutions ?? 1)) {
      return NextResponse.json({ ok: false, error: 'METHOD_LAB_UI_MAX_EXECUTIONS_INVALID' }, { status: 400 });
    }

    const persisted = await persistMethodLabUiPreregistration({
      ownerId: context.user.id,
      definition,
    });
    return NextResponse.json({
      ok: true,
      operation,
      persisted,
      boundaries: {
        frozenT0: true,
        ownerScoped: true,
        externalRegistrationClaim: false,
        canonicalPromotion: false,
        observationInheritance: false,
      },
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
