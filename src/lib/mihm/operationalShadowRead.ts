import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const EVENT_NAME = 'SFI_MIHM_OPERATIONAL_SHADOW_BATCH_OBSERVED';
const LOGBOOK = 'MIHM:OPERATIONAL_SHADOW';
const CONTRACT = 'SFI-MIHM-OPERATIONAL-SHADOW-0.1';

type Data = Record<string, unknown>;

function object(value: unknown): Data {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Data : {};
}
function strings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value as string[] : null;
}

export type MihmShadowObservation = {
  eventId: string;
  occurredAt: string | null;
  createdAt: string | null;
  processed: number | null;
  candidateCount: number | null;
  stages: { position: number | null; stage: string | null; ok: boolean | null }[];
  readback: 'RETRIEVED_CONTRACT_MATCH' | 'RETRIEVED_BUT_CONTRACT_NOT_CERTIFIED';
  authority: 'OBSERVATION_ONLY';
  prospectiveForecast: false;
  independentOutcomeVerified: false;
};

/**
 * Real canonical read only. The query does not write, dispatch or promote.
 * An empty ledger is a NO_OBSERVATIONS result, not a simulated success.
 */
export async function readMihmOperationalShadow(limit = 25) {
  const db = createServiceSupabaseClient();
  const { data, error } = await db.from('epistemic_events')
    .select('event_id,event_name,logbook_id,epistemic_class,occurred_at,created_at,payload')
    .eq('logbook_id', LOGBOOK)
    .eq('event_name', EVENT_NAME)
    .order('sequence', { ascending: false })
    .limit(Math.max(1, Math.min(25, limit)));

  if (error || !data) {
    return {
      ok: false as const,
      status: 'SOURCE_UNAVAILABLE' as const,
      source: 'epistemic_events' as const,
      observations: [] as MihmShadowObservation[],
      error: 'mihm_canonical_event_read_failed' as const,
    };
  }

  const observations: MihmShadowObservation[] = data.map((event) => {
    const payload = object(event.payload);
    const batch = object(payload.batch);
    const captured = Array.isArray(payload.results) ? payload.results : [];
    const windowIds = strings(batch.processingWindowIds);
    const resultIds = captured.map((value) => object(value).proposalId);
    const matchingWindow = windowIds !== null && resultIds.every((value) => typeof value === 'string')
      && JSON.stringify(windowIds) === JSON.stringify(resultIds);
    const validContract = payload.contract === CONTRACT
      && batch.contract === 'SFI-MIHM-SHADOW-A-0.2'
      && event.epistemic_class === 'observed'
      && payload.recordedBeforeDecision === false
      && payload.actualAdmissibilityCertified === false;
    const recoverable = typeof event.event_id === 'string'
      && event.event_name === EVENT_NAME && event.logbook_id === LOGBOOK;
    return {
      eventId: String(event.event_id),
      occurredAt: typeof event.occurred_at === 'string' ? event.occurred_at : null,
      createdAt: typeof event.created_at === 'string' ? event.created_at : null,
      processed: windowIds?.length ?? null,
      candidateCount: strings(batch.candidateIds)?.length ?? null,
      stages: captured.map((item) => {
        const result = object(item);
        return {
          position: typeof result.position === 'number' ? result.position : null,
          stage: typeof result.stage === 'string' ? result.stage : null,
          ok: typeof result.ok === 'boolean' ? result.ok : null,
        };
      }),
      readback: recoverable && validContract && matchingWindow
        ? 'RETRIEVED_CONTRACT_MATCH' as const
        : 'RETRIEVED_BUT_CONTRACT_NOT_CERTIFIED' as const,
      authority: 'OBSERVATION_ONLY' as const,
      prospectiveForecast: false as const,
      independentOutcomeVerified: false as const,
    };
  });

  return {
    ok: true as const,
    source: 'epistemic_events' as const,
    status: observations.length > 0 ? 'OBSERVATIONS_RETRIEVED' as const : 'NO_OBSERVATIONS' as const,
    observations,
  };
}
