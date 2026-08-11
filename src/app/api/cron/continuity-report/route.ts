import { NextRequest, NextResponse } from 'next/server';
import { createDailyContinuityReport } from '@/lib/continuity/runtime';
import { runScheduledAgentReportCycle } from '@/lib/reports/scheduledAgentReports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function bearer(request: NextRequest) {
  const match = (request.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

export async function GET(request: NextRequest) {
  const secret = process.env.SFI_CONTINUITY_CRON_SECRET || process.env.CRON_SECRET || '';
  if ((process.env.NODE_ENV === 'production' && !secret) || (secret && bearer(request) !== secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized_continuity_report' }, { status: 401 });
  }
  try {
    const report = await createDailyContinuityReport();
    const scheduledReports = await runScheduledAgentReportCycle().catch((error) => ({
      ok: false,
      generated: 0,
      skipped: 0,
      failed: 1,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    }));
    return NextResponse.json({
      ok: true,
      report,
      scheduledReports,
      schedulingRule: 'Uses the existing continuity-report cron. No additional Vercel cron invocation is introduced.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'continuity_report_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
