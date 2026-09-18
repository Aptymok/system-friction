import { NextRequest, NextResponse } from 'next/server';
import { createDailyContinuityReport } from '@/lib/continuity/runtime';
import { runDiscoveryAutonomyCycle } from '@/lib/discovery/discoveryAutonomy';
import { runGovernedExecutionRouter } from '@/lib/execution/governedExecutionRouter';
import { runScheduledAgentReportCycle } from '@/lib/reports/scheduledAgentReports';
import { runCognitiveTwinDevelopmentalHeartbeat } from '@/core/cognitive-twin/reentry/runtime';
import { considerCognitiveTwinMutationProposal } from '@/core/cognitive-twin/reentry/experiments';
import { syncSfiInstitutionalStateToCognitiveTwin } from '@/core/cognitive-twin/institutionalIntegration';
import { scheduledEgressGuardResponse } from '@/lib/continuity/scheduledEgressGuard';

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
  const egressGuard = scheduledEgressGuardResponse();
  if (egressGuard) return egressGuard;
  try {
    const report = await createDailyContinuityReport();
    const cognitiveTwinInstitutionalSync = await syncSfiInstitutionalStateToCognitiveTwin().catch((error) => ({
      ok:false, synced:0, failed:1, sources:[], integration:null,
      error:error instanceof Error ? error.message : String(error),
    }));
    const [scheduledReports, discoveryAutonomy, cognitiveTwinHeartbeat, cognitiveTwinMutation, governedExecution] = await Promise.all([
      runScheduledAgentReportCycle().catch((error) => ({ ok:false, generated:0, skipped:0, failed:1, results:[], error:error instanceof Error ? error.message : String(error) })),
      runDiscoveryAutonomyCycle().catch((error) => ({
        ok:false,
        contract:'SFI-DISCOVERY-AUTONOMY-1.1',
        observation:null,
        developmentCandidates:[],
        editorialCandidate:null,
        error:error instanceof Error ? error.message : String(error),
        boundary:'DISCOVERY_AUTONOMY_FAILED: no candidate, publication, discovery, recognition, PULL or RETURN may be inferred.',
      })),
      runCognitiveTwinDevelopmentalHeartbeat().catch((error) => ({ ok:false, skipped:false, error:error instanceof Error ? error.message : String(error) })),
      considerCognitiveTwinMutationProposal().catch((error) => ({ considered:false, proposed:false, error:error instanceof Error ? error.message : String(error) })),
      runGovernedExecutionRouter({ limit: 10 }).catch((error) => ({ ok:false, processed:0, results:[], error:error instanceof Error ? error.message : String(error) })),
    ]);
    return NextResponse.json({
      ok:true,
      report,
      cognitiveTwinInstitutionalSync,
      scheduledReports,
      discoveryObservation: discoveryAutonomy.observation,
      discoveryAutonomy,
      cognitiveTwinHeartbeat,
      cognitiveTwinMutation,
      governedExecution,
      schedulingRule:'No additional Vercel cron invocation. Uses the existing continuity-report cron; one bounded Discovery self-observation is attempted per cycle, candidates use the canonical governed proposal lifecycle, material work without a real executor remains blocked, SFI organ sync occurs before CT heartbeat, and queued governed work is retried/rerouted here.',
    });
  } catch (error) {
    return NextResponse.json({ ok:false, error:'continuity_report_failed', details:error instanceof Error ? error.message : String(error) }, { status:500 });
  }
}

export async function POST(request: NextRequest) { return GET(request); }
