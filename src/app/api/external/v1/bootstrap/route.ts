import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { buildSfiCognitiveBootstrap } from '@/lib/sfi/cognitiveBootstrap';
import { SFI_HUMAN_INTERACTION_POLICY } from '@/lib/sfi/humanInteractionPolicy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  const url = new URL(req.url);
  const caseId = url.searchParams.get('caseId')?.trim() || null;
  try {
    const bootstrap = await buildSfiCognitiveBootstrap({
      actorId: externalActor(credential),
      subjectId: credential.subjectId ?? null,
      tenantId: credential.tenantId ?? 'sfi',
      role: credential.role ?? 'agent',
      scopes: credential.scopes ?? [],
      caseId,
    });
    return NextResponse.json({
      ...bootstrap,
      interactionPolicy: SFI_HUMAN_INTERACTION_POLICY,
      useInstruction: `${bootstrap.useInstruction} Human-facing interaction must follow interactionPolicy: explain meaning, authority, options, consequences and next event before implementation detail. Explicit owner requests to learn/remember/apply a personal interaction rule may use the governed PERSON_CT learn_declared_pattern operation.`,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-SFI-Cognitive-Bootstrap': bootstrap.contract,
        'X-SFI-Capsule-Hash': bootstrap.capsuleHash,
        'X-SFI-Human-Interaction': SFI_HUMAN_INTERACTION_POLICY.contract,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'sfi_cognitive_bootstrap_failed',
      details: error instanceof Error ? error.message : String(error),
      instruction: 'Do not silently substitute an unversioned persona prompt. Read /llms-full.txt and retry the governed bootstrap surface when available.',
    }, { status: 503 });
  }
}
