import { NextResponse } from 'next/server';
import type { ApiResult, WorldSpectResponse } from '../../../../../packages/api-contracts/src';
import { missingWorldSpectResponse } from '@/lib/worldspect/contract';
import { getLatestWorldSpectSnapshotRead, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { fetchWorldSpectReadBundle } from '@/lib/worldspect/readBundleClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_CDN_CACHE = { 'Vercel-CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } as const;

function apiOk<TData>(data: TData, warnings?: string[], meta?: Record<string, unknown>) {
  const result: ApiResult<TData> & Record<string, unknown> = { ok: true, data, warnings, ...(meta ?? {}) };
  return NextResponse.json(result, { headers: PUBLIC_CDN_CACHE });
}

export async function GET(request: Request) {
  try {
    const bundle = await fetchWorldSpectReadBundle(request, { days: 90, ingestMode: 'all', limit: 120 });
    if (bundle.latest) {
      return apiOk(
        bundle.latest,
        bundle.primary_diagnostic ? ['primary_read_unavailable_continuity_served'] : undefined,
        { readPlane: bundle.read_plane, primaryDiagnostic: bundle.primary_diagnostic, readCache: bundle.read_cache },
      );
    }
  } catch {
    // Preserve the existing latest-snapshot fallback below. The common path is the shared bundle.
  }

  const latestRead = await getLatestWorldSpectSnapshotRead();
  const latest = latestRead.data;

  if (latest) {
    return apiOk(
      snapshotRowToApiData(latest),
      latestRead.primaryDiagnostic ? ['primary_read_unavailable_continuity_served'] : undefined,
      { readPlane: latestRead.readPlane, primaryDiagnostic: latestRead.primaryDiagnostic, readCache: latestRead.cache },
    );
  }

  return apiOk<WorldSpectResponse>(
    missingWorldSpectResponse(),
    ['worldspect_snapshot_missing'],
    { readPlane: latestRead.readPlane, primaryDiagnostic: latestRead.primaryDiagnostic, readCache: latestRead.cache },
  );
}
