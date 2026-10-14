import { createHash, randomUUID } from 'crypto';
import { appendAtomicEpistemicEvent } from './atomicAppend';
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

function sha256(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalizeEventPayload(value)))
    .digest('hex');
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalizeEvent(
  input: Partial<SFIEvent> & { logbookId?: string; schemaVersion?: string }
): Omit<EpistemicEventRecord, 'hashPrev' | 'hashSelf' | 'createdAt'> {
  const occurredAt =
    typeof input.occurredAt === 'string' && input.occurredAt.length > 0
      ? new Date(input.occurredAt).toISOString()
      : new Date().toISOString();

  const epistemicClass: EpistemicClass = isEpistemicClass(input.epistemicClass)
    ? (input.epistemicClass as EpistemicClass)
    : 'missing';

  const payload = input.payload ?? {};

  const checksum = sha256(payload);
  // A caller-supplied checksum must not contradict the canonical payload.
  if (typeof input.checksum === 'string' && input.checksum.length > 0 && input.checksum !== checksum) {
    throw new Error('epistemic_checksum_mismatch');
  }

  return {
    eventId:
      typeof input.eventId === 'string' && input.eventId.length > 0
        ? input.eventId
        : randomUUID(),

    eventName:
      typeof input.eventName === 'string' && input.eventName.length > 0
        ? input.eventName
        : 'epistemic.event',

    epistemicClass,
    confidence: clamp01(Number(input.confidence ?? 0)),
    payload,
    occurredAt,
    source: input.source ?? {
      sourceId: 'unknown',
      sourceType: 'unknown',
    },

    checksum,

    lineage: Array.isArray(input.lineage)
      ? input.lineage.filter(
          (item): item is string => typeof item === 'string'
        )
      : [],

    uncertainty:
      typeof input.uncertainty === 'string'
        ? input.uncertainty
        : undefined,

    logbookId:
      typeof input.logbookId === 'string' && input.logbookId.length > 0
        ? input.logbookId
        : 'default',

    schemaVersion:
      typeof input.schemaVersion === 'string' &&
      input.schemaVersion.length > 0
        ? input.schemaVersion
        : schemaVersion,
  };
}

function toHashMaterial(
  event: Omit<EpistemicEventRecord, 'hashSelf' | 'createdAt'>
) {
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

export function hashEpistemicEvent(
  event: Omit<EpistemicEventRecord, 'hashSelf' | 'createdAt'>
) {
  return sha256(toHashMaterial(event));
}

export async function appendEpistemicEvent(
  input: Partial<SFIEvent> & { logbookId?: string; schemaVersion?: string; returnMode?: 'full'|'receipt'; actorId?: string | null; nodeId?: string | null }
) {
  const service = createServiceSupabaseClient();
  let event: ReturnType<typeof normalizeEvent>;
  try { event = normalizeEvent(input); } catch (error) {
    return { ok: false as const, error: 'invalid_epistemic_event', details: String(error) };
  }

  if (!validateEpistemicEventShape(event)) {
    return {
      ok: false as const,
      error: 'invalid_epistemic_event',
    };
  }

  // The database serializes competing writers under a transaction-scoped lock;
  // the client supplies an expected predecessor, then retries stale attempts.
  const result = await appendAtomicEpistemicEvent(service, {
    ...event,
    actorId: input.actorId ?? null,
    nodeId: input.nodeId ?? null,
    returnMode: input.returnMode ?? 'full',
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error, details: result.details };
  }
  return { ok: true as const, data: result.data };

}

export async function streamEpistemicEvents(logbookId = 'default', limit = 100) {
  const service = createServiceSupabaseClient();
  try {
    const { data, error } = await service.from('epistemic_events').select('*')
      .eq('logbook_id', logbookId).order('sequence', { ascending: true })
      .limit(Math.max(1, Math.min(500, limit)));
    if (error || data === null) {
      return { ok: false as const, data: [], details: error?.message ?? 'epistemic_event_null_stream' };
    }
    return { ok: true as const, data: data ?? [] };
  } catch (error) {
    return { ok: false as const, data: [], details: String(error) };
  }
}

export async function streamRecentEpistemicEvents(limit = 100) {
  const service = createServiceSupabaseClient();
  try {
    const { data, error } = await service.from('epistemic_events').select('*')
      .order('sequence', { ascending: false }).limit(Math.max(1, Math.min(500, limit)));
    if (error || data === null) {
      return { ok: false as const, data: [], details: error?.message ?? 'epistemic_recent_stream_null' };
    }
    return { ok: true as const, data: data ?? [] };
  } catch (error) {
    return { ok: false as const, data: [], details: String(error) };
  }
}

/**
 * All-record audit. The historic ledger contains multiple writer algorithms and
 * cross-logbook predecessors, so report structural integrity separately from
 * cryptographic proof. Never rewrite historical hashes to manufacture a pass.
 */
export async function verifyEpistemicEventChain(logbookId = 'default', _limit = 100) {
  const service = createServiceSupabaseClient();
  type AuditFailure = { eventId: string; reason: string };
  const failures: AuditFailure[] = [];
  const rows: Record<string, any>[] = [];
  const pageSize = 400;
  try {
    // A bounded total is mandatory. Reading in pages avoids the previous 500 cap.
    const { count, error: countError } = await service.from('epistemic_events')
      .select('event_id', { count: 'exact', head: true }).eq('logbook_id', logbookId);
    if (countError || count === null) return { ok: false as const, error: 'epistemic_event_count_failed', details: countError?.message };
    const total = count;
    for (let offset = 0; offset < total; offset += pageSize) {
      const { data, error } = await service.from('epistemic_events').select('*')
        .eq('logbook_id', logbookId).order('sequence', { ascending: true })
        .range(offset, Math.min(total - 1, offset + pageSize - 1));
      if (error || !data || data.length !== Math.min(pageSize, total - offset)) {
        return { ok: false as const, error: 'epistemic_event_page_failed', details: error?.message ?? 'short_or_null_page', checked: rows.length, total };
      }
      rows.push(...data);
    }
    if (rows.length !== total) return { ok: false as const, error: 'epistemic_event_incomplete', checked: rows.length, total };
    const allHashes = new Set(rows.map(row => String(row.hash_self)));
    const predecessorCounts = new Map<string, number>();
    let canonicalMatch = 0;
    let legacyFormat = 0;
    for (const row of rows) {
      const prior = typeof row.hash_prev === 'string' ? row.hash_prev : null;
      if (prior !== null) {
        predecessorCounts.set(prior, (predecessorCounts.get(prior) ?? 0) + 1);
      }
      const digest = hashEpistemicEvent({
        eventId: String(row.event_id), eventName: String(row.event_name),
        logbookId: String(row.logbook_id), epistemicClass: row.epistemic_class as EpistemicClass,
        schemaVersion: String(row.schema_version), source: row.source,
        confidence: Number(row.confidence), payload: row.payload, checksum: String(row.checksum),
        lineage: Array.isArray(row.lineage) ? row.lineage : [],
        uncertainty: typeof row.uncertainty === 'string' ? row.uncertainty : undefined,
        occurredAt: new Date(String(row.occurred_at)).toISOString(), hashPrev: prior,
      });
      if (digest === row.hash_self) canonicalMatch += 1;
      else legacyFormat += 1;
    }
    const forks = [...predecessorCounts.values()].filter(n => n > 1).length;
    const missingLocalParents = rows.filter(row => row.hash_prev !== null && !allHashes.has(String(row.hash_prev))).length;
    if (forks) failures.push({ eventId: logbookId, reason: 'multiple_successors_for_predecessor' });
    const status = total === 0 ? 'EMPTY_CONFIRMED' : forks > 0 || missingLocalParents > 0 || legacyFormat > 0 ? 'LEGACY_OR_DIVERGENT' : 'STRUCTURALLY_LINEAR';
    // Nothing here certifies a stable external receipt, and historical mixed
    // chains must not become VERIFIED by inference.
    return {
      ok: failures.length === 0,
      data: { logbookId, checked: rows.length, total, complete: true, valid: false,
        status, canonicalMatch, legacyFormat, forks, missingLocalParents, failures },
    } as const;
  } catch (error) {
    return { ok: false as const, error: 'epistemic_event_audit_exception', details: String(error) };
  }
}
