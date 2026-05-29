import { NextRequest, NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { loadSfiAssets } from '@/lib/server/sfiAssets';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hasAssetWriteAccess(profile: unknown, isRoot: boolean) {
  if (isRoot) return true;
  const record = asRecord(profile);
  const modules = asRecord(record.module_access);
  const tier = String(record.subscription_tier || '').toLowerCase();
  return tier === 'pro' || tier === 'enterprise' || modules.observatory === true || modules.simulator === true || modules.planner === true;
}

export async function GET() {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await loadSfiAssets(ctx);
  if (result.error) return NextResponse.json({ assets: result.assets, error: result.error }, { status: 200 });
  return NextResponse.json({ assets: result.assets });
}

export async function POST(req: NextRequest) {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAssetWriteAccess(ctx.profile, ctx.isRoot)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await req.json().catch(() => null);

  return NextResponse.json({
    error: 'asset_write_schema_not_reconciled',
    message: 'Asset writes are blocked until the route is mapped to the current action_proposals / graph / logbook schema. No missing licenses or sfi_assets table is touched.',
  }, { status: 501 });
}
