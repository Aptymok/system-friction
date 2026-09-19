import { NextResponse } from 'next/server';
import type { ApiResult, WorldSpectResponse } from '../../../../../packages/api-contracts/src';
import { missingWorldSpectResponse } from '@/lib/worldspect/contract';
import { getLatestWorldSpectSnapshotRead, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function apiOk<TData>(data: TData, warnings?: string[], meta?: Record<string, unknown>) {
  const result: ApiResult<TData> & Record<string, unknown> = { ok: true, data, warnings, ...(meta ?? {}) };
  return NextResponse.json(result);
}

export async function GET() {
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
