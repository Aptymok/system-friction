import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { buildSfiCognitiveBootstrap } from '@/lib/sfi/cognitiveBootstrap';
import { SFI_HUMAN_INTERACTION_POLICY } from '@/lib/sfi/humanInteractionPolicy';
import { SFI_ANALYSIS_LEARNING_POLICY } from '@/lib/sfi/analysisLearningPolicy';

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
    const ownerStudioContext = credential.authMethod === 'oauth' && credential.subjectId
      ? {
          contract: 'SFI-STUDIO-OWNER-CONTEXT-1.0',
          method: 'POST',
          path: '/api/external/v1/studio',
          body: { operation: 'context' },
          requiredScope: 'studio:read',
          availability: credential.scopes.includes('studio:read') ? 'AUTHORIZED' : 'REQUIRES_SCOPE',
          instruction: 'Use this surface when persisted owner Studio/KXTXR lineage or owner-attributed AMV memory is relevant. Returned metadata is context/provenance, not a new observation or proof of binary materialization.',
        }
      : null;
    return NextResponse.json({
      ...bootstrap,
      interactionPolicy: SFI_HUMAN_INTERACTION_POLICY,
      analysisLearningPolicy: SFI_ANALYSIS_LEARNING_POLICY,
      modelInteroperability: {
        canonicalOpenApi: '/openapi.json',
        gptActionsProjection: '/openapi-actions.json',
        ownerStudioContext,
        modelCapabilityImpliesAuthority: false,
      },
      useInstruction: `${bootstrap.useInstruction} Human-facing interaction must follow interactionPolicy: explain meaning, authority, options, consequences and next event before implementation detail. Apply analysisLearningPolicy when choosing what evidence to request and when interpreting process/data contradictions. Explicit owner requests to learn/remember/apply a personal interaction rule may use the governed PERSON_CT learn_declared_pattern operation. When ownerStudioContext is available and owner Studio/KXTXR lineage is relevant, read that governed context before concluding that owner data is absent.`,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-SFI-Cognitive-Bootstrap': bootstrap.contract,
        'X-SFI-Capsule-Hash': bootstrap.capsuleHash,
        'X-SFI-Human-Interaction': SFI_HUMAN_INTERACTION_POLICY.contract,
        'X-SFI-Analysis-Learning': SFI_ANALYSIS_LEARNING_POLICY.contract,
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
