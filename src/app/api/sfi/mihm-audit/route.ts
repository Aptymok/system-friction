import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

/** A read-only ROOT instrument. Does not dispatch, attest forecasts or create events. */
export async function GET() {
  const gate = await requireRootActor('mihm.audit.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const db = createServiceSupabaseClient();
  const { data, error } = await db.from('epistemic_events')
    .select('event_id,event_name,logbook_id,epistemic_class,occurred_at,created_at,payload')
    .eq('logbook_id', LOGBOOK)
    .eq('event_name', EVENT_NAME)
    .order('sequence', { ascending: false })
    .limit(25);

  if (error || !data) {
    return NextResponse.json({
      ok: false,
      source: 'epistemic_events',
      status: 'SOURCE_UNAVAILABLE',
      error: 'mihm_canonical_event_read_failed',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const observations = data.map((event) => {
    const payload = object(event.payload);
    const batch = object(payload.batch);
    const captured = Array.isArray(payload.results) ? payload.results : [];
    const windowIds = strings(batch.processingWindowIds);
    const resultIds = captured.map((value) => object(value).proposalId);
    const matchingWindow = windowIds !== null
      && resultIds.every((value) => typeof value === 'string')
      && JSON.stringify(windowIds) === JSON.stringify(resultIds);
    const validContract = payload.contract === CONTRACT
      && batch.contract === 'SFI-MIHM-SHADOW-A-0.2'
      && event.epistemic_class === 'observed'
      && payload.recordedBeforeDecision === false
      && payload.actualAdmissibilityCertified === false;
    const recoverable = typeof event.event_id === 'string'
      && event.event_name === EVENT_NAME && event.logbook_id === LOGBOOK;
    return {
      eventId: event.event_id,
      occurredAt: event.occurred_at,
      createdAt: event.created_at,
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
      readback: recoverable && validContract && matchingWindow ? 'RETRIEVED_CONTRACT_MATCH'
        : 'RETRIEVED_BUT_CONTRACT_NOT_CERTIFIED',
      authority: 'OBSERVATION_ONLY',
      prospectiveForecast: false,
      independentOutcomeVerified: false,
    };
  });

  return NextResponse.json({
    ok: true,
    source: 'epistemic_events',
    status: observations.length > 0 ? 'OBSERVATIONS_RETRIEVED' : 'NO_OBSERVATIONS',
    scope: 'LATEST_25',
    observations,
    limitations: [
      'A recovered batch is a post-decision observation, not a preregistered forecast.',
      'No counterfactual policy superiority or independent outcome is certified.',
      'Absence of events does not establish that operational processing failed.',
    ],
  }, { headers: { 'Cache-Control': 'no-store' } });
}
