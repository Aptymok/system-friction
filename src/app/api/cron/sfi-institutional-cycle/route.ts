import { NextRequest, NextResponse } from 'next/server';
import { runInstitutionalCycle } from '@/lib/institution/institutionalCycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function secret() {
  return process.env.SFI_CRON_SECRET || process.env.WORLDSPECT_INGEST_SECRET || process.env.CRON_SECRET || '';
}

function authorized(request: NextRequest) {
  const configured = secret();
  if (!configured && process.env.NODE_ENV !== 'production') return true;
  if (!configured) return false;
  return request.headers.get('authorization') === `Bearer ${configured}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const result = await runInstitutionalCycle('scheduled');
  return NextResponse.json(result, { status: result.ok ? 200 : 207 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
