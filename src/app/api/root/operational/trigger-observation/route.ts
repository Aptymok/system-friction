import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, route: 'root_operation_ready' });
}

export async function POST() {
  return NextResponse.json({ ok: false, blocked: true, reason: 'runtime_wiring_pending' }, { status: 200 });
}
