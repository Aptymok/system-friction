import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { scopeStudioStateForMember } from '@/lib/studio/production/scopeStudioStateForMember';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const objectId = new URL(request.url).searchParams.get('objectId');
    let isFounder = false;
    try {
      await requireFounder();
      isFounder = true;
    } catch {
      isFounder = false;
    }

    const rawState = await readStudioProductionState({
      ownerId: user.id,
      includeLegacy: isFounder,
      objectId,
    });
    const state = isFounder ? rawState : scopeStudioStateForMember(rawState);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
