import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { verifyGitHubActionsOidcToken } from '@/lib/continuity/githubActionsOidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuthorizedTrigger = 'vercel_cron' | 'github_actions_oidc' | 'development';
type Row = Record<string, unknown>;

const ACTIVE_PROPOSAL_STATUSES = ['proposed', 'waiting_evidence', 'design_approved', 'queued', 'accepted'];
const TERMINAL_CASE_STATUSES = new Set(['closed', 'completed', 'cancelled', 'canceled', 'rejected', 'archived']);
const UNIVERSAL_LIFECYCLE_EVENTS = [
  'SFI_UNIVERSAL_CYCLE_RESUMED',
  'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT',
  'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
  'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
  'SFI_UNIVERSAL_RETURN_PLAN_RECORDED',
  'SFI_UNIVERSAL_RETURN_RECORDED',
  'SFI_UNIVERSAL_CYCLE_CLOSED',
];

function bearer(request: NextRequest) {
  const match = (request.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

async function authorize(request: NextRequest): Promise<{ ok: true; trigger: AuthorizedTrigger } | { ok: false }> {
  const token = bearer(request);
  const secret = process.env.SFI_CONTINUITY_CRON_SECRET || process.env.CRON_SECRET || '';

  if (!token && !secret && process.env.NODE_ENV !== 'production') {
    return { ok: true, trigger: 'development' };
  }

  if (secret && token === secret) {
    return { ok: true, trigger: 'vercel_cron' };
  }

  if (token) {
    const oidc = await verifyGitHubActionsOidcToken(token);
    if (oidc.ok) return { ok: true, trigger: 'github_actions_oidc' };
  }

  return { ok: false };
}

function hasOpenUniversalCycle(events: Row[]) {
  const latestByLogbook = new Map<string, string>();
  for (const event of events) {
    const logbookId = typeof event.logbook_id === 'string' ? event.logbook_id : '';
    const eventName = typeof event.event_name === 'string' ? event.event_name : '';
    if (!logbookId || !eventName || latestByLogbook.has(logbookId)) continue;
    latestByLogbook.set(logbookId, eventName);
  }
  return [...latestByLogbook.values()].some((eventName) => eventName !== 'SFI_UNIVERSAL_CYCLE_CLOSED');
}

export async function GET(request: NextRequest) {
  const authorization = await authorize(request);
  if (!authorization.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized_continuity_wakeup' }, { status: 401 });
  }

  const requestedCycleId = request.nextUrl.searchParams.get('cycleId')?.trim() || null;
  if (requestedCycleId) {
    return NextResponse.json({
      ok: true,
      trigger: authorization.trigger,
      shouldRun: true,
      reason: 'TARGETED_EXISTING_CYCLE',
      requestedCycleId,
    });
  }

  const db = createServiceSupabaseClient();
  const [state, proposals, cases, lifecycle, studio] = await Promise.all([
    db.from('sfi_continuity_state').select('mode').eq('id', 'institution').maybeSingle(),
    db.from('action_proposals').select('id,status').in('status', ACTIVE_PROPOSAL_STATUSES).limit(1),
    db.from('sfi_cases').select('id,status').is('deleted_at', null).order('updated_at', { ascending: false }).limit(20),
    db.from('epistemic_events')
      .select('sequence,event_name,logbook_id')
      .in('event_name', UNIVERSAL_LIFECYCLE_EVENTS)
      .order('sequence', { ascending: false })
      .limit(500),
    db.from('studio_objects').select('id,title,status').ilike('title', '%FI-001%').limit(1),
  ]);

  const readError = state.error ?? proposals.error ?? cases.error ?? lifecycle.error ?? studio.error;
  if (readError) {
    return NextResponse.json({
      ok: true,
      trigger: authorization.trigger,
      shouldRun: true,
      reason: 'WORK_GATE_READ_FAILED_FAIL_OPEN',
      diagnostic: { code: readError.code ?? null, message: readError.message },
    });
  }

  const continuityMode = typeof state.data?.mode === 'string' ? state.data.mode : 'NORMAL';
  const activeProposal = (proposals.data ?? []).length > 0;
  const activeCase = ((cases.data ?? []) as Row[]).some((item) => {
    const status = typeof item.status === 'string' ? item.status.toLowerCase() : '';
    return !TERMINAL_CASE_STATUSES.has(status);
  });
  const openUniversalCycle = hasOpenUniversalCycle(((lifecycle.data ?? []) as Row[]));
  const activeStudioExperiment = (studio.data ?? []).length > 0;
  const nonNormalContinuityMode = continuityMode !== 'NORMAL';
  const shouldRun = activeProposal || activeCase || openUniversalCycle || activeStudioExperiment || nonNormalContinuityMode;

  return NextResponse.json({
    ok: true,
    trigger: authorization.trigger,
    shouldRun,
    reason: shouldRun ? 'ACTIONABLE_CONTINUITY_WORK' : 'IDLE_NO_ACTIONABLE_WORK',
    state: {
      continuityMode,
      activeProposal,
      activeCase,
      openUniversalCycle,
      activeStudioExperiment,
    },
    boundary: 'Read-only scheduler gate. It never creates continuity runs, health checks, evidence, memory, RETURN, learning, canon, or external actions.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
