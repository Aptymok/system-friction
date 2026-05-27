import { NextResponse } from 'next/server';
import { latestRows } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function GET() {
  const analyses = await latestRows('mihm_analyses', 20);
  return NextResponse.json({ ok: true, data: { analyses: analyses.data, warnings: analyses.error ? [analyses.error] : [] } });
}
