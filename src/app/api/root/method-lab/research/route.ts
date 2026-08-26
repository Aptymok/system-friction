import { NextResponse } from 'next/server';
import { createActionProposal, requireGovernedActor, sha256 } from '@/lib/operational/common';
import {
  buildMethodLabPublicationPackage,
  methodLabResearchHubTarget,
  normalizeMethodLabResearchObject,
  persistMethodLabResearchObject,
  readMethodLabResearchState,
} from '@/lib/method-lab/researchObjects';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

async function findObject(objectId: string) {
  const state = await readMethodLabResearchState();
  return { state, object: state.objects.find((item) => item.objectId === objectId) ?? null };
}

export async function GET() {
  const auth = await requireGovernedActor('method_lab_research_read');
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const state = await readMethodLabResearchState();
  return NextResponse.json({ ok: true, research: state });
}

export async function POST(req: Request) {
  const auth = await requireGovernedActor('method_lab_research_write');
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  if (!auth.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const body = await req.json().catch(() => ({})) as Body;
  const operation = text(body.operation) || 'report';

  if (operation === 'upsert') {
    const currentId = text((body.object as Body | undefined)?.objectId);
    const current = currentId ? (await findObject(currentId)).object ?? undefined : undefined;
    const object = normalizeMethodLabResearchObject(body.object, current);
    if (!object) return NextResponse.json({ ok: false, error: 'valid_research_object_required' }, { status: 400 });
    const persisted = await persistMethodLabResearchObject({ object, actorId: auth.ctx.user.id, refs: Array.isArray(body.refs) ? body.refs.filter((item): item is string => typeof item === 'string') : [] });
    return NextResponse.json(persisted.ok ? { ok: true, operation, object, event: persisted.data } : persisted, { status: persisted.ok ? 201 : 500 });
  }

  const objectId = text(body.objectId);
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });
  const { object } = await findObject(objectId);
  if (!object) return NextResponse.json({ ok: false, error: 'research_object_not_found' }, { status: 404 });

  if (operation === 'report') {
    return NextResponse.json({ ok: true, operation, object, publicationPackage: buildMethodLabPublicationPackage(object) });
  }

  if (operation === 'promote') {
    if (!['PUBLIC_DERIVATIVE_READY', 'PROMOTION_REQUESTED', 'HUB_PUBLISHED', 'RELEASE_CANDIDATE'].includes(object.publicationState)) {
      return NextResponse.json({ ok: false, error: 'public_derivative_not_ready', publicationState: object.publicationState }, { status: 409 });
    }
    const publicationPackage = buildMethodLabPublicationPackage(object);
    const proposal = await createActionProposal({
      proposalType: 'research_hub_promotion',
      actorId: auth.ctx.user.id,
      title: `Promote ${object.objectId} to Research Hub`,
      objective: `Publish the governed public derivative for ${object.objectId}; do not export restricted raw evidence.`,
      status: 'proposed',
      contentHash: publicationPackage.packageHash,
      payload: {
        objectId: object.objectId,
        objectClass: object.objectClass,
        version: object.version,
        publicationState: object.publicationState,
        packageHash: publicationPackage.packageHash,
        target: `SFI-RESEARCH-HUB/${methodLabResearchHubTarget(object)}`,
        transport: 'EXTERNAL_AGENT_GITHUB_CONNECTOR',
        allowedAgents: ['ChatGPT', 'Gemini', 'Claude'],
        rawDataIncluded: false,
        files: publicationPackage.files.map((file) => ({ path: file.path, sha256: file.sha256 })),
      },
    });
    if (!proposal.ok) return NextResponse.json(proposal, { status: 500 });

    const promoted = { ...object, publicationState: 'PROMOTION_REQUESTED' as const, updatedAt: new Date().toISOString() };
    const persisted = await persistMethodLabResearchObject({ object: promoted, actorId: auth.ctx.user.id, refs: [`proposal:${proposal.data.id}`, `package:${publicationPackage.packageHash}`] });
    return NextResponse.json({
      ok: Boolean(persisted.ok),
      operation,
      proposal: proposal.data,
      researchObject: promoted,
      packageHash: publicationPackage.packageHash,
      packageFingerprint: sha256(publicationPackage.files.map((file) => file.sha256)),
      persisted: persisted.ok ? persisted.data : persisted,
      next: 'ROOT accepts/rejects the promotion. After acceptance, an authorized external agent transports this exact package to the Research Hub.',
    }, { status: persisted.ok ? 201 : 500 });
  }

  return NextResponse.json({ ok: false, error: 'unsupported_research_operation' }, { status: 400 });
}
