import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import { transitionOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import {
  SFI_EXTERNAL_CASE_RESERVED_TRANSITIONS,
  SFI_EXTERNAL_CASE_TRANSITION_SET,
  SFI_EXTERNAL_CASE_TRANSITIONS,
} from '@/lib/sfi/case-platform/externalPolicy';
import type { SfiCaseStatus } from '@/core/contracts/sfi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const auth = authorizeExternalRequest(request, 'cases:write');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'cases:write'), { status: 401 });

  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId) {
    return NextResponse.json({
      ok: false,
      error: 'user_bound_oauth_required',
      boundary: 'Case transitions resolve ownership from OAuth subject_id. Shared/static credentials cannot impersonate a case owner.',
    }, { status: 403 });
  }

  try {
    const caseId = text(body.caseId);
    if (!caseId) throw new Error('SFI_CASE_ID_REQUIRED');
    const status = text(body.status) as SfiCaseStatus;
    if (!SFI_EXTERNAL_CASE_TRANSITION_SET.has(status)) {
      return NextResponse.json({
        ok: false,
        error: 'case_transition_not_allowed_for_external_agent',
        allowed: [...SFI_EXTERNAL_CASE_TRANSITIONS],
        excluded: [...SFI_EXTERNAL_CASE_RESERVED_TRANSITIONS],
      }, { status: 400 });
    }

    const envelope = await transitionOperationalCase({
      caseId,
      userId: auth.credential.subjectId,
      status,
    });
    return NextResponse.json({
      ok: true,
      operation: 'transition',
      ...envelope,
      transportDiagnostics: { caseIdTransport: 'FLAT_REQUIRED', caseId, status },
      authorityBoundary: 'This Action can change only the bounded Case lifecycle status. INTERVENING and AWAITING_RETURN remain excluded and governed action/RETURN flows stay separate.',
    });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
