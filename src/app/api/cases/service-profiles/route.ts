import { NextResponse } from 'next/server';
import { SFI_SERVICE_PROFILES } from '@/core/case-platform';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAuthenticatedUser();
    return NextResponse.json({
      ok: true,
      contract: 'SFI-SERVICE-PROFILE-1.0',
      profiles: SFI_SERVICE_PROFILES,
      boundary: 'SERVICE_PROFILE ≠ ANALYTICAL_INSTRUMENT',
    });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
