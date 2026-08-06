import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { listStudioDeliverables } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const result = await listStudioDeliverables(user.id);
    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
