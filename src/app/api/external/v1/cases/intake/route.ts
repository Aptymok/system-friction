import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import {
  normalizeCasePlatformActionInput,
  resolveCasePlatformCreationIntake,
} from '@/lib/sfi/caseIntakeResolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const auth = authorizeExternalRequest(request, 'cases:read');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'cases:read'), { status: 401 });

  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId) {
    return NextResponse.json({
      ok: false,
      error: 'user_bound_oauth_required',
      boundary: 'Case intake resolves access from OAuth subject_id. Shared/static credentials cannot impersonate a case owner.',
    }, { status: 403 });
  }

  try {
    const normalized = normalizeCasePlatformActionInput(body);
    const intakePlan = resolveCasePlatformCreationIntake(normalized);
    const normalizedBoundary = row(normalized.systemBoundaryRef);
    const normalizedTemporal = row(normalized.temporalWindow);

    return NextResponse.json({
      ok: true,
      operation: 'intake_plan',
      intakePlan,
      readyForCreate: intakePlan.readyForCreate,
      transportDiagnostics: {
        received: {
          serviceProfileId: Boolean(text(body.serviceProfileId)),
          subject: Boolean(text(body.subject)),
          scope: Boolean(text(body.scope)),
          systemBoundaryId: Boolean(text(body.systemBoundaryId)),
          systemBoundaryRefId: Boolean(text(row(body.systemBoundaryRef).id)),
          temporalCutoff: Boolean(text(body.temporalCutoff)),
          temporalWindowCutoff: Boolean(text(row(body.temporalWindow).cutoff)),
        },
        normalized: {
          systemBoundaryId: text(normalizedBoundary.id) || null,
          temporalCutoff: text(normalizedTemporal.cutoff) || null,
        },
      },
      next: intakePlan.readyForCreate
        ? 'Call createSfiCaseFromResolvedIntake with the same resolved transport fields.'
        : 'Resolve only the missing intake fields returned here.',
      epistemicBoundary: 'Pre-case intake creates no case, evidence, memory, proposal, intervention, RETURN or truth claim.',
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'case_intake_failed',
    }, { status: 400 });
  }
}
