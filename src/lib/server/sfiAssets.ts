import { createHash } from 'crypto';
import type { getServerUserContext } from '@/lib/server/productionBackend';
import type { SfiAsset } from '@/lib/types';

type UserContext = Awaited<ReturnType<typeof getServerUserContext>>;

export const LEGACY_SCORE_FRICTION_ASSET_PLANE_RETIRED = 'LEGACY_SCORE_FRICTION_ASSET_PLANE_RETIRED';

function slugPart(value: unknown) {
  return String(value || 'asset')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .toUpperCase() || 'ASSET';
}

export function createSfiAssetId(targetSystem: Record<string, unknown>) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugPart(targetSystem.name);
  const suffix = createHash('sha256').update(`${slug}-${Date.now()}-${crypto.randomUUID()}`).digest('hex').slice(0, 8).toUpperCase();
  return `SFI-EVAL-${date}-${slug}-${suffix}`;
}

export function hashPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 12);
}

export async function loadSfiAssets(ctx: UserContext, _options: { includeHistory?: boolean } = {}) {
  if (!ctx.user) return { assets: [] as SfiAsset[], error: 'Unauthorized' };

  return {
    assets: [] as SfiAsset[],
    error: LEGACY_SCORE_FRICTION_ASSET_PLANE_RETIRED,
  };
}

export async function getAccessibleSfiAsset(ctx: UserContext, _assetId: string) {
  if (!ctx.user) return { asset: null, error: 'Unauthorized' };

  return {
    asset: null as SfiAsset | null,
    error: LEGACY_SCORE_FRICTION_ASSET_PLANE_RETIRED,
  };
}
