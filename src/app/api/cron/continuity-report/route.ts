import { NextRequest, NextResponse } from 'next/server';
import { createDailyContinuityReport } from '@/lib/continuity/runtime';
import { runScheduledAgentReportCycle } from '@/lib/reports/scheduledAgentReports';
import { runCognitiveTwinDevelopmentalHeartbeat } from '@/core/cognitive-twin/reentry/runtime';
import { considerCognitiveTwinMutationProposal } from '@/core/cognitive-twin/reentry/experiments';
import { syncSfiInstitutionalStateToCognitiveTwin } from '@/core/cognitive-twin/institutionalIntegration';
import { runGovernedExecutionRouterCycle } from '@/lib/execution/governedExecutionRouter';

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
    const cognitiveTwinInstitutionalSync = await syncSfiInstitutionalStateToCognitiveTwin().catch((error) => ({
      ok:false,
      synced:0,
      failed:1,
      sources:[],
      integration:null,
      error:error instanceof Error ? error.message : String(error),
    }));
    const [scheduledReports, cognitiveTwinHeartbeat, cognitiveTwinMutation, executionRouter] = await Promise.all([
      runScheduledAgentReportCycle().catch((error) => ({
        ok: false,
        generated: 0,
        skipped: 0,
        failed: 1,
        results: [],
        error: error instanceof Error ? error.message : String(error),
      })),
      runCognitiveTwinDevelopmentalHeartbeat().catch((error) => ({
        ok: false,
        skipped: false,
        error: error instanceof Error ? error.message : String(error),
      })),
      considerCognitiveTwinMutationProposal().catch((error) => ({
        considered: false,
        proposed: false,
        error: error instanceof Error ? error.message : String(error),
      })),
      runGovernedExecutionRouterCycle().catch((error) => ({
        ok: false,
        active: true,
        routed: 0,
        results: [],
        error: error instanceof Error ? error.message : String(error),
      })),
    ]);
    return NextResponse.json({
      ok: true,
      report,
      cognitiveTwinInstitutionalSync,
      scheduledReports,
      cognitiveTwinHeartbeat,
      cognitiveTwinMutation,
      executionRouter,
      schedulingRule: 'Uses the existing continuity-report cron. SFI organ sync occurs before the CT-A01 heartbeat; authorized execution routing/self-healing diagnostics reuse this same cycle and do not introduce another Vercel cron.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'continuity_report_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
