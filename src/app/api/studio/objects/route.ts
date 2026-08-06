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
    const result = await listStudioObjects(user.id, sessionId);
    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
