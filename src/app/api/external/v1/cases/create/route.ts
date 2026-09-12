import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import {
  normalizeCasePlatformActionInput,
  resolveCasePlatformCreationIntake,
} from '@/lib/sfi/caseIntakeResolver';
import { createOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import type { SfiCanonicalRef, SfiServiceProfileId, SfiTemporalWindowV1 } from '@/core/contracts/sfi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function canonicalRef(value: unknown): SfiCanonicalRef {
  const ref = row(value);
  const id = text(ref.id);
  if (!id) throw new Error('SFI_CASE_REF_REQUIRED');
  return {
    id,
    version: nullableText(ref.version),
    hash: nullableText(ref.hash),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const auth = authorizeExternalRequest(request, 'cases:write');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'cases:write'), { status: 401 });

  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId) {
    return NextResponse.json({
      ok: false,
      error: 'user_bound_oauth_required',
      boundary: 'Case creation resolves ownership from OAuth subject_id. Shared/static credentials cannot impersonate a case owner.',
    }, { status: 403 });
  }

  const userId = auth.credential.subjectId;

  try {
    const normalized = normalizeCasePlatformActionInput(body);
    const intakePlan = resolveCasePlatformCreationIntake(normalized);
    if (!intakePlan.readyForCreate) {
      return NextResponse.json({
        ok: false,
        error: 'case_intake_incomplete',
        intakePlan,
        instruction: 'Resolve only the missing fields returned by intakePlan before creating the case.',
      }, { status: 409 });
    }

    const temporal = row(normalized.temporalWindow);
    const caseRecord = await createOperationalCase({
      userId,
      tenantId: nullableText(normalized.tenantId),
      clientId: nullableText(normalized.clientId),
      serviceProfileId: text(normalized.serviceProfileId) as SfiServiceProfileId,
      subject: text(normalized.subject),
      scope: text(normalized.scope),
      systemBoundaryRef: canonicalRef(normalized.systemBoundaryRef),
      temporalWindow: {
        mode: text(temporal.mode),
        basis: text(temporal.basis),
        start: nullableText(temporal.start),
        end: nullableText(temporal.end),
        cutoff: text(temporal.cutoff),
        timezone: text(temporal.timezone) || 'UTC',
        reconstructionAsOf: nullableText(temporal.reconstructionAsOf),
        horizon: nullableText(temporal.horizon),
      } as SfiTemporalWindowV1,
    });

    return NextResponse.json({
      ok: true,
      operation: 'create',
      case: caseRecord,
      intakePlan,
      epistemicBoundary: 'Case creation does not create accepted evidence, institutional memory, ROOT authority, intervention authority, observed RETURN or canonical truth.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
