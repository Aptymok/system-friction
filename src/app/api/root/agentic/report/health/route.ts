import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readRootReportHealth } from '@/lib/reports/rootReportInbox';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('agentic.report.health');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    return NextResponse.json({ ok: true, health: await readRootReportHealth() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'report_health_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
