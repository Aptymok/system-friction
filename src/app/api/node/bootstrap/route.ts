import { NextResponse } from 'next/server';
import { getServerUserContext, ROOT_ENTITLEMENTS } from '@/lib/server/productionBackend';
import { getEntitlements } from '@/lib/licensing/entitlements';
import { loadSfiAssets } from '@/lib/server/sfiAssets';
import { readActorNodeProjection } from '@/lib/server/actorNodeProjection';

export async function GET() {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projection = await readActorNodeProjection({
    user: ctx.user,
    profile: ctx.profile && typeof ctx.profile === 'object'
      ? ctx.profile as Record<string, unknown>
      : null,
    service: ctx.service,
  });
  const node = projection.node;
  const nodeDiagnostic = projection.diagnostic;

  const licenseRows = await ctx.service
    .from('sfi_user_entitlements')
    .select('status,tier,valid_until,source')
    .eq('user_id', ctx.user.id)
    .limit(1);

  const entitlements = ctx.isRoot ? ROOT_ENTITLEMENTS : await getEntitlements(ctx.user.id);
  const sfiAssets = await loadSfiAssets(ctx, { includeHistory: false });

  return NextResponse.json({
    node,
    node_error: nodeDiagnostic,
    user: { id: ctx.user.id, email: ctx.user.email },
    profile: ctx.profile,
    audits: [],
    memoryFacts: [],
    memory_facts: [],
    actions: [],
    compatibility: {
      node_source: 'canonical_actor_projection',
      legacy_collections: ['audits', 'memory_facts', 'actions'],
      legacy_state: 'not_recreated',
    },
    license: ctx.isRoot
      ? { status: 'root_bypass', product_key: 'system_internal' }
      : licenseRows?.data?.[0]
        ? {
            status: licenseRows.data[0].status,
            product_key: licenseRows.data[0].tier,
            valid_until: licenseRows.data[0].valid_until,
            source: licenseRows.data[0].source ?? 'sfi_user_entitlements',
          }
        : null,
    entitlements,
    sfi_assets: sfiAssets.assets,
    sfi_assets_error: sfiAssets.error,
  });
}
