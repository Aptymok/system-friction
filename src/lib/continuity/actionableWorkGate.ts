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
  if (!isSfiContinuityConfigured()) {
    return { required: false as const, configured: false as const, state: null, diagnostic: null };
  }

  try {
    const { readDataPlaneState } = await import('@/lib/persistence/dataPlaneContinuityStore');
    const state = await readDataPlaneState();
    const verifiedAt = state.primary_mirror_verified_at ? Date.parse(state.primary_mirror_verified_at) : Number.NaN;
    const stale = !Number.isFinite(verifiedAt) || (Date.now() - verifiedAt) > 60 * 60 * 1000;
    const required = state.mode === 'PRIMARY' && (
      state.primary_mirror_certified !== true
      || Number(state.primary_mirror_backlog ?? 0) > 0
      || stale
    );
    return {
      required,
      configured: true as const,
      state: {
        mode: state.mode,
        certified: state.primary_mirror_certified,
        verifiedAt: state.primary_mirror_verified_at,
        backlog: Number(state.primary_mirror_backlog ?? 0),
        stale,
      },
      diagnostic: null,
    };
  } catch (error) {
    return {
      required: true as const,
      configured: true as const,
      state: null,
      diagnostic: error instanceof Error ? error.message : String(error),
    };
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

  const mirrorMaintenance = await readMirrorMaintenanceRequirement();
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
          const shouldRun = activeProposal || activeCase || openUniversalCycle || activeStudioExperiment || nonNormalContinuityMode || mirrorMaintenanceRequired;
          return {
            shouldRun,
            reason: mirrorMaintenanceRequired
              ? 'DATA_PLANE_MIRROR_MAINTENANCE_REQUIRED' as const
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
  const shouldRun = activeProposal || activeCase || openUniversalCycle || activeStudioExperiment || nonNormalContinuityMode || mirrorMaintenanceRequired;

  return {
    shouldRun,
    reason: mirrorMaintenanceRequired
      ? 'DATA_PLANE_MIRROR_MAINTENANCE_REQUIRED' as const
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
    },
  };
}
