import { NextResponse } from 'next/server';
import { latestActionProposals } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function GET() {
  const multimedia = await latestActionProposals(['multimedia', 'calendar_payload'], 25);
  return NextResponse.json({ ok: true, data: { multimedia: multimedia.data, warnings: multimedia.error ? [multimedia.error] : [] } });
}
