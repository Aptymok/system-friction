import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import { recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import type { SfiCanonicalRef, SfiEpistemicClass } from '@/core/contracts/sfi';
import type { SfiCaseObjectKind } from '@/core/case-platform';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

const SAFE_OBJECT_KINDS = new Set<SfiCaseObjectKind>([
  'RECORD',
  'OBSERVATION',
  'SYSTEM_MODEL',
  'HYPOTHESIS',
  'ANALYSIS',
  'RECOMMENDATION',
  'REPORT',
  'UNRESOLVED_QUESTION',
  'CONTRADICTION',
]);

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function row(value: unknown): Row {
  return isRow(value) ? value : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function refsFromIds(value: unknown): SfiCanonicalRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item))
    .filter(Boolean)
    .map((id) => ({ id, version: null, hash: null }));
}

function epistemicRoleFor(kind: SfiCaseObjectKind): SfiEpistemicClass {
  if (kind === 'RECORD' || kind === 'OBSERVATION' || kind === 'REPORT') return 'RECORD';
  if (kind === 'UNRESOLVED_QUESTION' || kind === 'CONTRADICTION') return 'EPISTEMIC_ASSESSMENT';
  return 'INFERENCE';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const auth = authorizeExternalRequest(request, 'cases:write');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'cases:write'), { status: 401 });

  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId) {
    return NextResponse.json({
      ok: false,
      error: 'user_bound_oauth_required',
      boundary: 'Case object persistence resolves ownership from OAuth subject_id. Shared/static credentials cannot impersonate a case owner.',
    }, { status: 403 });
  }

  try {
    const caseId = text(body.caseId);
    if (!caseId) throw new Error('SFI_CASE_ID_REQUIRED');

    const kind = text(body.kind) as SfiCaseObjectKind;
    if (!SAFE_OBJECT_KINDS.has(kind)) {
      return NextResponse.json({
        ok: false,
        error: 'case_object_kind_not_allowed_for_external_agent',
        allowed: [...SAFE_OBJECT_KINDS],
        forbiddenAuthority: ['EVIDENCE', 'GOVERNANCE_DECISION', 'INTERVENTION', 'RETURN', 'TRUTH_CLAIM'],
      }, { status: 400 });
    }

    const canonicalRefId = text(body.canonicalRefId);
    if (!canonicalRefId) throw new Error('SFI_CASE_REF_REQUIRED');

    if (!isRow(body.payload)) throw new Error('SFI_CASE_PAYLOAD_REQUIRED');
    const payload = row(body.payload);

    const sourceRefs = refsFromIds(body.sourceRefIds);
    const recordRefs = refsFromIds(body.recordRefIds);
    const object = await recordOperationalCaseObject({
      caseId,
      userId: auth.credential.subjectId,
      kind,
      epistemicRole: epistemicRoleFor(kind),
      canonicalRef: {
        id: canonicalRefId,
        version: nullableText(body.canonicalRefVersion),
        hash: nullableText(body.canonicalRefHash),
      },
      sourceRefs,
      recordRefs,
      evidenceRefs: [],
      payload,
      observedAt: nullableText(body.observedAt),
    });

    return NextResponse.json({
      ok: true,
      operation: 'add_object',
      object,
      transportDiagnostics: {
        canonicalRefTransport: 'FLAT_REQUIRED',
        canonicalRefId,
        sourceRefCount: sourceRefs.length,
        recordRefCount: recordRefs.length,
      },
      epistemicBoundary: 'This Action persists only bounded Case objects. It cannot create accepted evidence, governance authority, intervention authority, observed RETURN or truth claims.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
