import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

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
      boundary: 'Case reads resolve ownership from OAuth subject_id. Shared/static credentials cannot impersonate a case owner.',
    }, { status: 403 });
  }

  try {
    const caseId = text(body.caseId);
    if (!caseId) throw new Error('SFI_CASE_ID_REQUIRED');
    return NextResponse.json({
      ok: true,
      operation: 'read',
      ...(await readOperationalCase(caseId, auth.credential.subjectId)),
      transportDiagnostics: { caseIdTransport: 'FLAT_REQUIRED', caseId },
      authorityBoundary: 'Read-only Case Action. It cannot mutate the case, admit evidence, govern, intervene, record RETURN or create truth claims.',
    });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
