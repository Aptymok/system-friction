import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { isSfiContinuityConfigured } from '@/lib/sfi/continuityPostgres';
import { readNeonActionableWorkSnapshot } from './neonHeartbeatStore';

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
async function readC08MissionWorkRequirement() {
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
    if (isSfiContinuityConfigured()) {
      try {
        const fallback = await readNeonActionableWorkSnapshot();
        const continuityMode = typeof fallback?.continuity_mode === 'string' ? fallback.continuity_mode : null;
        if (continuityMode) {
          const activeProposal = fallback?.active_proposal === true;
          const activeCase = fallback?.active_case === true;
          const openUniversalCycle = fallback?.open_universal_cycle === true;
          const activeStudioExperiment = fallback?.active_studio_experiment === true;
          const nonNormalContinuityMode = continuityMode !== 'NORMAL';
          const mirrorMaintenanceRequired = mirrorMaintenance.required;
          const shouldRun = activeProposal || activeCase || openUniversalCycle || activeStudioExperiment || nonNormalContinuityMode || mirrorMaintenanceRequired || c08MissionWork.required;
          return {
            shouldRun,
            reason: mirrorMaintenanceRequired
              ? 'DATA_PLANE_MIRROR_MAINTENANCE_REQUIRED' as const
              : c08MissionWork.required
                ? 'C08_MISSION_WORK_PENDING_NEON_FALLBACK' as const
              : shouldRun
                ? 'ACTIONABLE_CONTINUITY_WORK_NEON_FALLBACK' as const
                : 'IDLE_NO_ACTIONABLE_WORK_NEON_FALLBACK' as const,
            requestedCycleId: null,
            dataPlane: 'NEON' as const,
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
            primaryDiagnostic: readError
              ? { code: readError.code ?? null, message: readError.message }
              : { code: 'CONTINUITY_STATE_MISSING', message: 'Primary continuity state row is absent.' },
          };
        }
      } catch (fallbackError) {
        return {
          shouldRun: true as const,
          reason: 'WORK_GATE_READ_FAILED_FAIL_OPEN' as const,
          requestedCycleId: null,
          state: null,
          diagnostic: {
            primary: readError
              ? { code: readError.code ?? null, message: readError.message }
              : { code: 'CONTINUITY_STATE_MISSING', message: 'Required sfi_continuity_state institution row is absent.' },
            continuity: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          },
        };
      }
    }

    return {
      shouldRun: true as const,
      reason: 'WORK_GATE_READ_FAILED_FAIL_OPEN' as const,
      requestedCycleId: null,
      state: null,
      diagnostic: readError
        ? { code: readError.code ?? null, message: readError.message }
        : { code: 'CONTINUITY_STATE_MISSING', message: 'Required sfi_continuity_state institution row is absent.' },
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
