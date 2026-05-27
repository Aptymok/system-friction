import { NextResponse } from 'next/server';
import type { ApiResult, WorldSpectResponse } from '../../../../../packages/api-contracts/src';
import { missingWorldSpectResponse } from '@/lib/worldspect/contract';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';

export const dynamic = 'force-dynamic';

function apiOk<TData>(data: TData, warnings?: string[]) {
  const result: ApiResult<TData> = { ok: true, data, warnings };
  return NextResponse.json(result);
}

export async function GET() {
  const latest = await getLatestWorldSpectSnapshot();

  if (!latest) {
    return apiOk<WorldSpectResponse & { status: 'missing' }>(
      { ...missingWorldSpectResponse(), status: 'missing' },
      ['worldspect_snapshot_missing'],
    );
  }

  return apiOk<WorldSpectResponse & { status: 'ok' }>({
    ...snapshotRowToApiData(latest),
    status: 'ok',
  });
}
