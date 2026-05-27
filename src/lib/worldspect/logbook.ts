import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import type {
  WorldSpectIngestMode,
  WorldSpectResponse,
  WorldSpectSource,
  WorldSpectSourceHealth,
} from '../../../packages/api-contracts/src';

const worldspectLogbookId = 'BR';

type PersistedSnapshotRef = {
  id: string;
  snapshot_hash: string;
  observed_at: string;
};

function nodeTypeForSource(source: WorldSpectSource) {
  switch (source.key) {
    case 'worldbank':
      return 'ECON';
    case 'hn':
      return 'DIG';
    case 'bbc_world':
    case 'aljazeera':
    case 'news_api':
      return 'INF';
    default:
      return 'INF';
  }
}

function planeForSource(source: WorldSpectSource) {
  return typeof source.mihm_var === 'string' && source.mihm_var.length > 0
    ? source.mihm_var
    : nodeTypeForSource(source);
}

function healthForSource(source: WorldSpectSource, health: WorldSpectSourceHealth[]) {
  return health.find((entry) => entry.key === source.key || entry.sourceId === source.key);
}

function signalState(source: WorldSpectSource, health?: WorldSpectSourceHealth) {
  if (source.simulated === true || health?.status === 'simulated') return 'simulated';
  if (source.error || health?.status === 'degraded') return 'degraded';
  if (source.value === null || health?.status === 'missing') return 'missing';
  return 'observed';
}

export async function recordWorldSpectLogbook(input: {
  response: WorldSpectResponse;
  snapshot: PersistedSnapshotRef;
  ingestMode: WorldSpectIngestMode;
}) {
  const service = createServiceSupabaseClient();
  const observedAt = new Date(input.response.ts || input.snapshot.observed_at).toISOString();
  const event = await appendEpistemicEvent({
    eventName: 'worldspect.snapshot.ingested',
    epistemicClass: input.response.sourceState === 'observed' ? 'observed' : 'derived',
    confidence: input.response.confidence,
    payload: {
      snapshotId: input.snapshot.id,
      snapshotHash: input.snapshot.snapshot_hash,
      sourceState: input.response.sourceState,
      evidenceLevel: input.response.evidenceLevel,
      wsi: input.response.wsi,
      nti: input.response.nti,
      degraded_sources: input.response.degraded_sources,
      sourceCount: input.response.sources.length,
      ingestMode: input.ingestMode,
    },
    occurredAt: observedAt,
    source: {
      sourceId: 'worldspect',
      sourceType: 'service',
    },
    logbookId: worldspectLogbookId,
    lineage: [input.snapshot.snapshot_hash],
  });

  if (!event.ok) {
    return { ok: false as const, stage: 'epistemic_event', error: event.error, details: 'details' in event ? event.details : undefined };
  }

  const epistemicEventUuid = typeof event.data.id === 'string' && event.data.id.length > 0
    ? event.data.id
    : null;

  if (!epistemicEventUuid) {
    return {
      ok: false as const,
      stage: 'epistemic_event',
      error: 'epistemic_event_uuid_missing',
    };
  }

  const signalRows = input.response.sources.map((source) => {
    const health = healthForSource(source, input.response.sourceHealth);
    const state = signalState(source, health);

    return {
      event_id: epistemicEventUuid,
      signal_key: source.key,
      source_id: 'worldspect',
      plane: planeForSource(source),
      node_type: nodeTypeForSource(source),
      raw_signal: {
        source,
        health: health ?? null,
        state,
        snapshotId: input.snapshot.id,
        snapshotHash: input.snapshot.snapshot_hash,
        ingestMode: input.ingestMode,
        observedAt,
      },
      recurrence_count: 1,
      status: state,
    };
  });

  const { error: signalsError } = signalRows.length > 0
    ? await service.from('logbook_signals').insert(signalRows)
    : { error: null };

  if (signalsError) {
    return { ok: false as const, stage: 'logbook_signals', error: signalsError.message };
  }

  const { error: regimeError } = await service
    .from('logbook_regime')
    .insert({
      event_id: epistemicEventUuid,
      regime_key: `worldspect:${input.snapshot.snapshot_hash}`,
      previous_state: null,
      next_state: input.response.sourceState,
      phi_campo: input.response.wsi,
      causal_factor: input.response.degraded_sources.length > 0
        ? input.response.degraded_sources.join(',')
        : 'worldspect_ingest',
      payload: {
        sourceState: input.response.sourceState,
        evidenceLevel: input.response.evidenceLevel,
        confidence: input.response.confidence,
        wsi: input.response.wsi,
        nti: input.response.nti,
        degraded_sources: input.response.degraded_sources,
        sourceHealth: input.response.sourceHealth,
        fieldStateSignal: input.response.fieldStateSignal,
        ingestMode: input.ingestMode,
        snapshotId: input.snapshot.id,
        snapshotHash: input.snapshot.snapshot_hash,
        observedAt,
      },
    });

  if (regimeError) {
    return { ok: false as const, stage: 'logbook_regime', error: regimeError.message };
  }

  return {
    ok: true as const,
    epistemicEventId: epistemicEventUuid,
    signalCount: signalRows.length,
    regimeCount: 1,
  };
}
