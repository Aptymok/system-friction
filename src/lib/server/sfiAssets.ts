import { createHash } from 'crypto';
import type { getServerUserContext } from '@/lib/server/productionBackend';
import type { SfiAsset } from '@/lib/types';

type UserContext = Awaited<ReturnType<typeof getServerUserContext>>;

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

export async function loadSfiAssets(ctx: UserContext) {
  if (!ctx.user) return { assets: [] as SfiAsset[], error: 'Unauthorized' };

  const assetQuery = ctx.service
    .from('sfi_assets')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(25);

  const { data: assetRows, error: assetError } = ctx.isRoot
    ? await assetQuery
    : await assetQuery.eq('owner_user_id', ctx.user.id);

  if (assetError) {
    return { assets: [] as SfiAsset[], error: assetError.message };
  }

  const assets = (assetRows || []) as SfiAsset[];
  const assetIds = assets.map((asset) => asset.asset_id);
  if (!assetIds.length) return { assets, error: null };

  const [measurements, interventions, outputs, logbook] = await Promise.all([
    ctx.service.from('sfi_measurements').select('*').in('asset_id', assetIds).order('measured_at', { ascending: false }).limit(100),
    ctx.service.from('sfi_interventions').select('*').in('asset_id', assetIds).order('occurred_at', { ascending: false }).limit(100),
    ctx.service.from('sfi_outputs').select('*').in('asset_id', assetIds).order('created_at', { ascending: false }).limit(100),
    ctx.service.from('sfi_logbook').select('*').in('asset_id', assetIds).order('created_at', { ascending: false }).limit(100),
  ]);

  const childErrors = [measurements.error, interventions.error, outputs.error, logbook.error]
    .filter(Boolean)
    .map((error) => error!.message);

  return {
    assets: assets.map((asset) => ({
      ...asset,
      measurements: measurements.data?.filter((item) => item.asset_id === asset.asset_id) || [],
      interventions: interventions.data?.filter((item) => item.asset_id === asset.asset_id) || [],
      outputs: outputs.data?.filter((item) => item.asset_id === asset.asset_id) || [],
      logbook: logbook.data?.filter((item) => item.asset_id === asset.asset_id) || [],
    })),
    error: childErrors.length ? childErrors.join(' | ') : null,
  };
}

export async function getAccessibleSfiAsset(ctx: UserContext, assetId: string) {
  if (!ctx.user) return { asset: null, error: 'Unauthorized' };
  const query = ctx.service.from('sfi_assets').select('*').eq('asset_id', assetId).limit(1);
  const { data, error } = ctx.isRoot ? await query : await query.eq('owner_user_id', ctx.user.id);
  if (error) return { asset: null, error: error.message };
  return { asset: (data?.[0] || null) as SfiAsset | null, error: null };
}
