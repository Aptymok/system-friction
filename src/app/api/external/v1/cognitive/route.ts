import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { readPersonalCognitiveWorkspace, runPersonalCognitive } from '@/lib/sfi/personal/cognitiveWorkspace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Row;
  const operation = String(body.operation || 'state');
  const requiredScope = operation === 'run' ? 'lab:run' : 'lab:read';
  const auth = authorizeExternalRequest(req, requiredScope);
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, requiredScope), { status: 401 });

  // Personal Cognitive is identity-bound. Shared/static credentials are not
  // allowed to impersonate or select a user's private workspace.
  if (credential.authMethod !== 'oauth' || !credential.subjectId) {
    return NextResponse.json({ ok: false, error: 'oauth_subject_required_for_personal_cognitive' }, { status: 403 });
  }

  try {
    if (operation === 'state') {
      const workspace = await readPersonalCognitiveWorkspace(credential.subjectId);
      return NextResponse.json({
        ok: workspace.ok,
        operation,
        actor: externalActor(credential),
        ownershipBoundary: 'owner_id == OAuth subjectId',
        workspace,
      });
    }

    if (operation === 'run') {
      const result = await runPersonalCognitive({
        ownerId: credential.subjectId,
        objective: String(body.objective || body.question || ''),
        caseId: typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null,
        evidenceIds: strings(body.evidenceIds),
        requestedAutomations: strings(body.requestedAutomations),
        cognitiveIntents: strings(body.cognitiveIntents),
      });
      return NextResponse.json({
        ...result,
        operation,
        actor: externalActor(credential),
        ownershipBoundary: 'owner_id == OAuth subjectId',
      }, { status: result.ok ? 201 : 207 });
    }

    return NextResponse.json({ ok: false, error: 'unsupported_cognitive_operation', allowed: ['state', 'run'] }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('NOT_FOUND') ? 404 : message.includes('REQUIRED') ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
