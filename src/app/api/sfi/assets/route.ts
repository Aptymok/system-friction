import { NextRequest, NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { createSfiAssetId, hashPayload, loadSfiAssets } from '@/lib/server/sfiAssets';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
  if (!ctx.isRoot) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const targetSystem = asRecord(body?.target_system);
  const objective = asRecord(body?.objective);
  const stateVector = asRecord(body?.state_vector);
  const metadata = asRecord(body?.metadata);
  const currentPhase = typeof body?.current_phase === 'string' ? body.current_phase : 'PHASE_0_ASSET_CREATED';
  const assetId = createSfiAssetId(targetSystem);

  const { data: asset, error } = await ctx.service
    .from('sfi_assets')
    .insert({
      asset_id: assetId,
      owner_user_id: ctx.user.id,
      target_system: targetSystem,
      objective,
      state_vector: stateVector,
      current_phase: currentPhase,
      metadata,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payload = { target_system: targetSystem, objective, state_vector: stateVector, current_phase: currentPhase };
  await ctx.service.from('sfi_logbook').insert({
    asset_id: assetId,
    event_type: 'ASSET_CREATED',
    payload,
    created_by: ctx.user.id,
    hash: hashPayload(payload),
  });

  return NextResponse.json({ asset }, { status: 201 });
}
