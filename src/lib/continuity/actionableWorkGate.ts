import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { hasOpenUniversalCycle, UNIVERSAL_LIFECYCLE_EVENTS } from './universalLifecycleGate';

type Row = Record<string, unknown>;

const ACTIVE_PROPOSAL_STATUSES = ['proposed', 'waiting_evidence', 'design_approved', 'queued', 'accepted'];
const TERMINAL_CASE_STATUSES = new Set(['closed', 'completed', 'cancelled', 'canceled', 'rejected', 'archived']);
async function readMirrorMaintenanceRequirement() {
  // Never wake an autonomous cycle to chase old mirror backlogs or parity.
  return { required: false as const, configured: false as const,
    state: { replicationEnabled: false, policy: 'SFI_REPLICATION_RETIRED_BY_FOUNDER' },
    diagnostic: null };
}

/**
 * C08 liveness only: a due C07 job can wake the existing heartbeat even
 * when all unrelated operational signals are idle. This does NOT enqueue,
 * claim, authorize, execute, or enable the queue.
 */
export async function readC08MissionWorkRequirement() {
  if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') {
    return { required: false, state: 'DISABLED' as const };
  }
  try {
    const now = new Date().toISOString();
    const db = createServiceSupabaseClient();
    const [queued, abandonedLease] = await Promise.all([
      db.from('sfi_c07_mission_jobs').select('id').eq('status', 'QUEUED')
        .lte('available_at', now).is('cancel_requested_at', null).limit(1),
      db.from('sfi_c07_mission_jobs').select('id').eq('status', 'RUNNING')
        .lte('lease_until', now).is('cancel_requested_at', null).limit(1),
    ]);
    if (queued.error || abandonedLease.error) {
      // An unreadable queue is not evidence that work is absent.
      // Worker authorization and existing primary-write gates still apply.
      return { required: true, state: 'READ_UNAVAILABLE' as const };
    }
    return {
      required: Boolean(queued.data?.length || abandonedLease.data?.length),
      state: 'READ_CONFIRMED' as const,
    };
  } catch {
    return { required: true, state: 'READ_UNAVAILABLE' as const };
  }
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

  const [mirrorMaintenance, c08MissionWork] = await Promise.all([
    readMirrorMaintenanceRequirement(), readC08MissionWorkRequirement(),
  ]);
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
  const continuityState = state.data;
  const missingContinuityState = !state.error && !continuityState;
  if (readError || missingContinuityState) {
    // Primary-only policy. An unavailable Supabase read is NOT a reason to
    // consult the retired Neon mirror or initiate unrelated autonomous work.
    return {
      shouldRun: c08MissionWork.state === 'READ_CONFIRMED' && c08MissionWork.required,
      reason: 'PRIMARY_WORK_GATE_UNAVAILABLE' as const,
      requestedCycleId: null,
      state: { c08MissionWork, primaryReadAvailable: false },
      diagnostic: readError
        ? { code: readError.code ?? null, message: readError.message }
        : { code: 'CONTINUITY_STATE_MISSING', message: 'Primary sfi_continuity_state row absent.' },
    };
  }

  if (!continuityState) {
    throw new Error('CONTINUITY_STATE_UNREACHABLE_AFTER_GUARD');
  }

  const continuityMode = typeof continuityState.mode === 'string' ? continuityState.mode : 'NORMAL';
  const activeProposal = (proposals.data ?? []).length > 0;
  const activeCase = ((cases.data ?? []) as Row[]).some((item) => {
    const status = typeof item.status === 'string' ? item.status.toLowerCase() : '';
    return !TERMINAL_CASE_STATUSES.has(status);
  });
  const openUniversalCycle = hasOpenUniversalCycle(((lifecycle.data ?? []) as Row[]));
  const activeStudioExperiment = (studio.data ?? []).length > 0;
  const nonNormalContinuityMode = continuityMode !== 'NORMAL';
  const mirrorMaintenanceRequired = mirrorMaintenance.required;
  const shouldRun = activeProposal || activeCase || openUniversalCycle || activeStudioExperiment || nonNormalContinuityMode || mirrorMaintenanceRequired || c08MissionWork.required;

  return {
    shouldRun,
    reason: mirrorMaintenanceRequired
      ? 'DATA_PLANE_MIRROR_MAINTENANCE_REQUIRED' as const
      : c08MissionWork.required ? 'C08_MISSION_WORK_PENDING' as const
      : shouldRun ? 'ACTIONABLE_CONTINUITY_WORK' as const : 'IDLE_NO_ACTIONABLE_WORK' as const,
    requestedCycleId: null,
    state: {
      continuityMode,
      activeProposal,
      activeCase,
      openUniversalCycle,
      activeStudioExperiment,
      mirrorMaintenanceRequired,
      mirrorMaintenance,
      c08MissionWork,
    },
  };
}
