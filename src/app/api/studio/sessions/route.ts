import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { createStudioSession, listStudioSessions } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const result = await listStudioSessions(user.id);
    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return studioApiAccessError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = await request.json().catch(() => ({}));
    const result = await createStudioSession({
      ownerId: user.id,
      title: typeof body.title === 'string' ? body.title : null,
    });
    return NextResponse.json(result, { status: result.ok ? 201 : result.status });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
