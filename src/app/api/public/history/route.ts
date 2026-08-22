import { NextResponse } from 'next/server';
import { SFI_HISTORY_BOUNDARY, SFI_INSTITUTION_HISTORY } from '@/lib/public/institutionHistory';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    contract: 'SFI-INSTITUTION-HISTORY-1.0',
    epistemicClass: 'OBSERVED',
    boundary: SFI_HISTORY_BOUNDARY,
    milestones: SFI_INSTITUTION_HISTORY,
  });
}
