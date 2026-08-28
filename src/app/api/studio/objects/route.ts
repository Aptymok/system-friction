import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { listStudioObjects } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const before = url.searchParams.get('before');
    const requestedLimit = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 25;
    const result = await listStudioObjects(user.id, { sessionId, includeArchived, before, limit });
    if (!result.ok) return NextResponse.json(result, { status: result.status });
    const nextCursor = result.data.length ? String(result.data[result.data.length - 1]?.updated_at ?? '') || null : null;
    return NextResponse.json({
      ok: true,
      data: result.data,
      count: result.data.length,
      nextCursor,
      operationalDefault: includeArchived ? 'ARCHIVE_INCLUDED_BY_EXPLICIT_REQUEST' : 'ARCHIVED_EXCLUDED_BY_DEFAULT',
    });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
