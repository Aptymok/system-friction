import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { getAccessibleSfiAsset, hashPayload } from '@/lib/server/sfiAssets';

function numeric(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ asset_id: string }> }) {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { asset_id: assetId } = await params;
  const { asset, error: assetError } = await getAccessibleSfiAsset(ctx, assetId);
  if (assetError) return NextResponse.json({ error: assetError }, { status: 500 });
  if (!asset) return NextResponse.json({ error: 'asset_not_found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const measurement = {
    asset_id: assetId,
    ihg: numeric(body?.IHG ?? body?.ihg),
    nti_obs: numeric(body?.NTI_obs ?? body?.nti_obs),
    ldi_hours: numeric(body?.LDI_hours ?? body?.ldi_hours),
    xi_noise: numeric(body?.xi_noise),
    phi_sf: numeric(body?.PHI_SF ?? body?.phi_sf),
    regime: typeof body?.regime === 'string' ? body.regime : null,
    runway_days: numeric(body?.runway_days),
  };
  const { data, error } = await ctx.service.from('sfi_measurements').insert(measurement).select('*').single();
  if (error) return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 500 });

  await ctx.service.from('sfi_assets').update({
    state_vector: {
      IHG: measurement.ihg,
      NTI_obs: measurement.nti_obs,
      LDI_hours: measurement.ldi_hours,
      xi_noise: measurement.xi_noise,
      PHI_SF: measurement.phi_sf,
      regime: measurement.regime,
      runway_days: measurement.runway_days,
    },
  }).eq('asset_id', assetId);
  const payload = { measurement };
  await ctx.service.from('sfi_logbook').insert({ asset_id: assetId, event_type: 'MEASUREMENT_CREATED', payload, created_by: ctx.user.id, hash: hashPayload(payload) });
  await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    owner_user_id: ctx.user.id,
    event_type: 'asset_measurement',
    title: 'ScoreFriction asset measurement',
    summary: `Measurement recorded for ${assetId}.`,
    payload,
  });
  return NextResponse.json({ measurement: data, canonical: '/api/scorefriction/assets/[asset_id]/measurements' }, { status: 201 });
}

