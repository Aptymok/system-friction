// src/core/memory/epistemicEventWriter.ts
//
// Único punto autorizado para insertar en `epistemic_events`. Antes de esta
// pieza, la lógica de hash-chaining (hash_prev/hash_self) estaba duplicada
// en governanceRuntime.ts y thoughtInhibition.ts, y ausente por completo en
// systemTick.ts/IntentLayer.ts/Observer.ts (que escribían a tablas legacy
// sin ningún encadenamiento).
//
// Cumple ADR-018: epistemic_events es el ledger institucional inmutable.
// Nada debe escribir memoria directamente — todo pasa primero por aquí.

import crypto from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type EpistemicClass =
  | 'observed'
  | 'declared'
  | 'derived'
  | 'inferred'
  | 'simulated'
  | 'fixture'
  | 'missing';

export type EmitEpistemicEventInput = {
  eventName: string;
  logbookId: string;
  epistemicClass: EpistemicClass;
  schemaVersion: string;
  sourceId: string;
  sourceType: string;
  actorId: string | null;
  nodeId?: string | null;
  confidence: number;
  payload: Record<string, unknown>;
  lineage?: string[];
  uncertainty?: string | null;
  occurredAt?: string;
};

export type EpistemicEventRow = {
  id: string;
  event_id: string;
  event_name: string;
  logbook_id: string;
  epistemic_class: EpistemicClass;
  confidence: number;
  payload: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  hash_self: string;
};

function hashPayload(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function getLatestEventHash(): Promise<string | null> {
  const service = createServiceSupabaseClient();
  const { data } = await service
    .from('epistemic_events')
    .select('hash_self')
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  return typeof data?.hash_self === 'string' ? data.hash_self : null;
}

/**
 * Inserta un evento en epistemic_events con encadenamiento de hash correcto.
 * No escribe memoria. No decide política. Solo registra que algo ocurrió.
 */
export async function emitEpistemicEvent(
  input: EmitEpistemicEventInput
): Promise<{ ok: true; event: EpistemicEventRow } | { ok: false; error: string }> {
  const service = createServiceSupabaseClient();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const eventId = `${input.logbookId}:${input.eventName}:${occurredAt}:${crypto.randomUUID()}`;
  const checksum = hashPayload(input.payload);
  const hashPrev = await getLatestEventHash();
  const hashSelf = hashPayload({
    event_id: eventId,
    payload: input.payload,
    hash_prev: hashPrev,
    occurred_at: occurredAt,
  });

  const { data, error } = await service
    .from('epistemic_events')
    .insert({
      event_id: eventId,
      event_name: input.eventName,
      logbook_id: input.logbookId,
      epistemic_class: input.epistemicClass,
      schema_version: input.schemaVersion,
      source: { sourceId: input.sourceId, sourceType: input.sourceType },
      actor_id: input.actorId,
      node_id: input.nodeId ?? null,
      confidence: input.confidence,
      payload: input.payload,
      checksum,
      lineage: input.lineage ?? [],
      uncertainty: input.uncertainty ?? null,
      occurred_at: occurredAt,
      hash_prev: hashPrev,
      hash_self: hashSelf,
    })
    .select('id, event_id, event_name, logbook_id, epistemic_class, confidence, payload, occurred_at, created_at, hash_self')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'epistemic_event_insert_failed' };
  }

  return { ok: true, event: data as EpistemicEventRow };
}