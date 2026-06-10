import { createHash, randomUUID } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  canonicalizeEventPayload,
  isEpistemicClass,
  validateEpistemicEventShape,
  type EpistemicClass,
  type EpistemicEventRecord,
  type SFIEvent,
} from '../../../packages/events/src/schema';

const schemaVersion = '2026-05-27.epistemic-events.v1';
const genesisHash = 'GENESIS';

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalizeEventPayload(value))).digest('hex');
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalizeEvent(input: Partial<SFIEvent> & { logbookId?: string; schemaVersion?: string }): Omit<EpistemicEventRecord, 'hashPrev' | 'hashSelf' | 'createdAt'> {
  const occurredAt = typeof input.occurredAt === 'string' && input.occurredAt.length > 0
    ? new Date(input.occurredAt).toISOString()
    : new Date().toISOString();
  const epistemicClass: EpistemicClass = isEpistemicClass(input.epistemicClass) ? input.epistemicClass as EpistemicClass : 'missing';
  const payload = input.payload ?? {};
  const checksum = typeof input.checksum === 'string' && input.checksum.length > 0 ? input.checksum : sha256(payload);

  return {
    eventId: typeof input.eventId === 'string' && input.eventId.length > 0 ? input.eventId : randomUUID(),
    eventName: typeof input.eventName === 'string' && input.eventName.length > 0 ? input.eventName : 'epistemic.event',
    epistemicClass,
    confidence: clamp01(Number(input.confidence ?? 0)),
    payload,
    occurredAt,
    source: input.source ?? { sourceId: 'unknown', sourceType: 'unknown' },
    checksum,
    lineage: Array.isArray(input.lineage) ? input.lineage.filter((item): item is string => typeof item === 'string') : [],
    uncertainty: typeof input.uncertainty === 'string' ? input.uncertainty : undefined,
    logbookId: typeof input.logbookId === 'string' && input.logbookId.length > 0 ? input.logbookId : 'default',
    schemaVersion: typeof input.schemaVersion === 'string' && input.schemaVersion.length > 0 ? input.schemaVersion : schemaVersion,
  };
}

function toHashMaterial(event: Omit<EpistemicEventRecord, 'hashSelf' | 'createdAt'>) {
  return {
    eventId: event.eventId,
    eventName: event.eventName,
    logbookId: event.logbookId,
    epistemicClass: event.epistemicClass,
    schemaVersion: event.schemaVersion,
    source: event.source,
    confidence: event.confidence,
    payload: event.payload,
    checksum: event.checksum,
    lineage: event.lineage ?? [],
    uncertainty: event.uncertainty ?? null,
    occurredAt: event.occurredAt,
    hashPrev: event.hashPrev,
  };
}

export function hashEpistemicEvent(event: Omit<EpistemicEventRecord, 'hashSelf' | 'createdAt'>) {
  return sha256(toHashMaterial(event));
}

export async function appendEpistemicEvent(input: Partial<SFIEvent> & { logbookId?: string; schemaVersion?: string }) {
  const service = createServiceSupabaseClient();
  const event = normalizeEvent(input);

  if (!validateEpistemicEventShape(event)) {
    return { ok: false as const, error: 'invalid_epistemic_event' };
  }

  const { data: latest } = await service
    .from('epistemic_events')
    .select('hash_self')
    .eq('logbook_id', event.logbookId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hashPrev = typeof latest?.hash_self === 'string' ? latest.hash_self : null;
  const hashSelf = hashEpistemicEvent({ ...event, hashPrev });

  const { data, error } = await service
    .from('epistemic_events')
    .insert({
      event_id: event.eventId,
      event_name: event.eventName,
      logbook_id: event.logbookId,
      epistemic_class: event.epistemicClass,
      schema_version: event.schemaVersion,
      source: event.source,
      confidence: event.confidence,
      payload: event.payload,
      checksum: event.checksum,
      lineage: event.lineage,
      uncertainty: event.uncertainty ?? null,
      occurred_at: event.occurredAt,
      hash_prev: hashPrev,
      hash_self: hashSelf,
    })
    .select('*')
    .single();

  if (error) return { ok: false as const, error: 'epistemic_event_append_failed', details: error.message };
  return { ok: true as const, data };
}

export async function streamEpistemicEvents(logbookId = 'default', limit = 100) {
  let service;

  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return {
      ok: true as const,
      data: [],
      warnings: ['epistemic_event_store_not_ready'],
      details: error instanceof Error ? error.message : String(error),
    };
  }

  const { data, error } = await service
    .from('epistemic_events')
    .select('*')
    .eq('logbook_id', logbookId)
    .order('sequence', { ascending: true })
    .limit(Math.max(1, Math.min(500, limit)));

  if (error) {
    return {
      ok: true as const,
      data: [],
      warnings: ['epistemic_event_stream_not_ready'],
      details: error.message,
    };
  }

  return { ok: true as const, data: data ?? [] };
}

export async function verifyEpistemicEventChain(logbookId = 'default', limit = 100) {
  const streamed = await streamEpistemicEvents(logbookId, limit);
  if (!streamed.ok) return streamed;

  let previous: string | null = null;
  const failures: Array<{ eventId: string; reason: string }> = [];

  for (const row of streamed.data) {
    const expectedPrev = previous;
    if ((row.hash_prev ?? null) !== expectedPrev) {
      failures.push({ eventId: String(row.event_id), reason: 'hash_prev_mismatch' });
    }

    const recalculated = hashEpistemicEvent({
      eventId: String(row.event_id),
      eventName: String(row.event_name),
      logbookId: String(row.logbook_id),
      epistemicClass: row.epistemic_class as EpistemicClass,
      schemaVersion: String(row.schema_version),
      source: row.source,
      confidence: Number(row.confidence ?? 0),
      payload: row.payload,
      checksum: String(row.checksum),
      lineage: Array.isArray(row.lineage) ? row.lineage : [],
      uncertainty: typeof row.uncertainty === 'string' ? row.uncertainty : undefined,
      occurredAt: new Date(String(row.occurred_at)).toISOString(),
      hashPrev: row.hash_prev ?? null,
    });

    if (recalculated !== row.hash_self) {
      failures.push({ eventId: String(row.event_id), reason: 'hash_self_mismatch' });
    }

    previous = String(row.hash_self ?? genesisHash);
  }

  return {
    ok: failures.length === 0,
    data: {
      logbookId,
      checked: streamed.data.length,
      valid: failures.length === 0,
      failures,
    },
  } as const;
}
