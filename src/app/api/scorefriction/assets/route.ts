import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { loadSfiAssets } from '@/lib/server/sfiAssets';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
  return NextResponse.json({ assets: result.assets, error: result.error ?? null, canonical: '/api/scorefriction/assets' });
}

export async function POST(req: NextRequest) {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAssetWriteAccess(ctx.profile, ctx.isRoot)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null);
  await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    owner_user_id: ctx.user.id,
    event_type: 'asset_write_blocked',
    title: 'ScoreFriction asset write blocked',
    summary: 'Asset write schema is not reconciled; no fake persistence was reported.',
    payload: body,
  });
  return NextResponse.json({
    error: 'asset_write_schema_not_reconciled',
    message: 'Asset writes are blocked until the current graph/logbook schema is reconciled. No fake asset success is returned.',
    canonical: '/api/scorefriction/assets',
  }, { status: 501 });
}

