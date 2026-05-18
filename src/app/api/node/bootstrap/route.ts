import { NextResponse } from 'next/server';
import { getServerUserContext, ROOT_ENTITLEMENTS } from '@/lib/server/productionBackend';
import { getEntitlements } from '@/lib/licensing/entitlements';
import type { SfiAsset } from '@/lib/types';

async function loadSfiAssets(ctx: Awaited<ReturnType<typeof getServerUserContext>>) {
  const assetQuery = ctx.service
    .from('sfi_assets')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(25);

  const { data: assetRows, error: assetError } = ctx.isRoot
    ? await assetQuery
    : await assetQuery.eq('owner_user_id', ctx.user!.id);

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

export async function GET() {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let node = null;
  let nodeError = null;
  const { data: nodes, error: selectNodeError } = await ctx.service
    .from('nodes')
    .select('*')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  node = nodes?.[0] || null;
  nodeError = selectNodeError;

  if (!node && !nodeError) {
    const { data, error } = await ctx.service
      .from('nodes')
      .insert({ user_id: ctx.user.id, source: 'web', current_ihg: 0.52, current_nti: 0.48, current_ldi: 1.12 })
      .select('*')
      .single();
    node = data;
    nodeError = error;
  }

  if (!node && !ctx.isRoot) {
    return NextResponse.json({ error: nodeError?.message || 'node_not_found' }, { status: nodeError ? 500 : 404 });
  }

  const [audits, memoryFacts, actions, licenseRows] = node
    ? await Promise.all([
        ctx.service
          .from('audits')
          .select('*')
          .eq('node_id', node.id)
          .order('created_at', { ascending: false })
          .limit(20),
        ctx.service
          .from('memory_facts')
          .select('*')
          .eq('node_id', node.id)
          .order('last_seen_at', { ascending: false })
          .limit(30),
        ctx.service
          .from('actions')
          .select('*')
          .eq('node_id', node.id)
          .order('created_at', { ascending: false })
          .limit(30),
        ctx.service
          .from('licenses')
          .select('*')
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ])
    : [null, null, null, null];

  const entitlements = ctx.isRoot ? ROOT_ENTITLEMENTS : await getEntitlements(ctx.user.id);
  const sfiAssets = await loadSfiAssets(ctx);

  return NextResponse.json({
    node,
    node_error: nodeError?.message || null,
    user: { id: ctx.user.id, email: ctx.user.email },
    profile: ctx.profile,
    audits: audits?.data || [],
    memoryFacts: memoryFacts?.data || [],
    memory_facts: memoryFacts?.data || [],
    actions: actions?.data || [],
    license: ctx.isRoot
      ? { status: 'root_bypass', product_key: 'system_internal' }
      : licenseRows?.data?.[0] || null,
    entitlements,
    sfi_assets: sfiAssets.assets,
    sfi_assets_error: sfiAssets.error,
  });
}
