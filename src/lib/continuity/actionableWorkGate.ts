import { createServiceSupabaseClient } from '@/runtime/supabase/server';

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

export async function readContinuityActionableWorkGate(input?: { requestedCycleId?: string | null }) {
  const requestedCycleId = input?.requestedCycleId?.trim() || null;
  if (requestedCycleId) {
    return {
      shouldRun: true as const,
      reason: 'TARGETED_EXISTING_CYCLE' as const,
      requestedCycleId,
      state: null,
    };
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
    return {
      shouldRun: true as const,
      reason: 'WORK_GATE_READ_FAILED_FAIL_OPEN' as const,
      requestedCycleId: null,
      state: null,
      diagnostic: { code: readError.code ?? null, message: readError.message },
    };
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

  return {
    shouldRun,
    reason: shouldRun ? 'ACTIONABLE_CONTINUITY_WORK' as const : 'IDLE_NO_ACTIONABLE_WORK' as const,
    requestedCycleId: null,
    state: {
      continuityMode,
      activeProposal,
      activeCase,
      openUniversalCycle,
      activeStudioExperiment,
    },
  };
}
