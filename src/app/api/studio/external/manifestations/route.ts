import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listOwnerManifestations, upsertArtifactManifestation } from '@/lib/sfi/artifacts/artifactRegistry';
import { requireAuthenticatedUser } from '@/lib/system/access/server';

const schema = z.object({
  artifactId: z.string().trim().min(1).max(240).nullable().optional(),
  tenantId: z.string().uuid().nullable().optional(),
  scopeType: z.enum(['ATTRACTOR','PROJECT','NODE','OBJECT','ARTIFACT']),
  scopeKey: z.string().trim().min(1).max(300),
  platform: z.string().trim().min(1).max(80),
  externalUrl: z.string().url().max(3000),
  platformObjectId: z.string().trim().max(500).nullable().optional(),
  relationType: z.enum(['PUBLISHED_AS','ROUTED_BY','SOURCE_REPOSITORY','PUBLIC_SYSTEM_SURFACE','EXTERNAL_CHANNEL','ATLAS_COLLECTION','DERIVATIVE']),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function GET(request: Request) {
  const { user } = await requireAuthenticatedUser();
  const url = new URL(request.url);
  const scopeKey = url.searchParams.get('scopeKey');
  const manifestations = await listOwnerManifestations(user.id, scopeKey);
  return NextResponse.json({ ok: true, manifestations });
}

export async function POST(request: Request) {
  const { user } = await requireAuthenticatedUser();
  const body = schema.parse(await request.json());
  const manifestation = await upsertArtifactManifestation({
    ownerId: user.id,
    tenantId: body.tenantId ?? null,
    artifactId: body.artifactId ?? null,
    scopeType: body.scopeType,
    scopeKey: body.scopeKey,
    platform: body.platform,
    externalUrl: body.externalUrl,
    platformObjectId: body.platformObjectId ?? null,
    relationType: body.relationType,
    verification: 'DECLARED',
    observedAt: null,
    metadata: body.metadata ?? {},
  });
  return NextResponse.json({ ok: true, manifestation, verification: 'DECLARED', objectIdentityVerified: false }, { status: 201 });
}
