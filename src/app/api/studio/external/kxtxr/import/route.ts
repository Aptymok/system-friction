import { NextResponse } from 'next/server';
import { KXTXR_EXTERNAL_SEED } from '@/lib/studio/external/kxtxrRegistrySeed';
import { upsertArtifactManifestation } from '@/lib/sfi/artifacts/artifactRegistry';
import { requireFounder } from '@/lib/system/access/server';

export async function POST() {
  const { user } = await requireFounder();
  const imported = [];
  for (const seed of KXTXR_EXTERNAL_SEED) {
    const manifestation = await upsertArtifactManifestation({
      ownerId: user.id,
      artifactId: null,
      scopeType: seed.scopeType,
      scopeKey: seed.scopeKey,
      platform: seed.platform,
      externalUrl: seed.externalUrl,
      platformObjectId: typeof seed.metadata.platformObjectId === 'string' ? seed.metadata.platformObjectId : null,
      relationType: seed.relationType,
      verification: 'DECLARED',
      metadata: { ...seed.metadata, seedKey: seed.key, objectResolution: seed.objectResolution },
    });
    imported.push(manifestation);
  }
  return NextResponse.json({ ok: true, project: 'KXTXR', imported, verifiedAutomatically: false });
}
