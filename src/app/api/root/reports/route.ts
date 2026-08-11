import { NextResponse } from 'next/server';

import { requireRootViewer } from '@/lib/root/server';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.reports.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const inbox = await readRootReportInbox();
    const health = await readRootReportHealth(inbox);
    return NextResponse.json({ ok: true, inbox, health }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'root_reports_read_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
