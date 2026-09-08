import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { SfiDiscoveryObservationInput, SfiDiscoveryRetrievalObservation } from './discoveryMesh';
import { observeDiscovery } from './discoveryMesh';

function normalize(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function sha256(value: string) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function provenance(observations: readonly SfiDiscoveryRetrievalObservation[]) {
  return observations.map((item) => ({
    observationId: item.observationId,
    observedAt: item.observedAt,
    source: item.source,
    status: item.status ?? 'AVAILABLE',
  }));
}

export async function persistDiscoveryObservation(input: SfiDiscoveryObservationInput, actorId: string) {
  const result = observeDiscovery(input);
  const service = createServiceSupabaseClient();
  const normalizedQuery = normalize(result.query);
  const intent = result.intent?.trim() || null;
  const queryHash = sha256(JSON.stringify({ mode: result.mode, query: normalizedQuery, intent }));
  const retrievalObservations = input.retrievalObservations ?? [];
  const unbranded = retrievalObservations.length
    ? retrievalObservations.every((item) => item.unbranded)
    : !/\b(system friction institute|systemfriction|\bsfi\b)/i.test(result.query);

  const queryRow = await service.from('sfi_discovery_queries').upsert({
    query_hash: queryHash,
    query_text: result.query,
    normalized_query: normalizedQuery,
    mode: result.mode,
    intent,
    unbranded,
    created_by: actorId,
  }, { onConflict: 'query_hash', ignoreDuplicates: false }).select('id').single();
  if (queryRow.error || !queryRow.data?.id) throw new Error(`SFI_DISCOVERY_QUERY_PERSIST_FAILED:${queryRow.error?.message ?? 'unknown'}`);

  const observedAt = retrievalObservations
    .map((item) => Date.parse(item.observedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const observedAtIso = typeof observedAt === 'number' ? new Date(observedAt).toISOString() : new Date().toISOString();

  const runRow = await service.from('sfi_discovery_query_runs').insert({
    run_id: result.observationId,
    query_id: queryRow.data.id,
    actor_id: actorId,
    observation_contract: result.contract,
    availability: result.state,
    candidates: result.candidates,
    external_representations: result.externalRepresentations,
    metrics: result.metrics,
    provenance: provenance(retrievalObservations),
    epistemic_boundary: result.epistemicBoundary,
    observed_at: observedAtIso,
  }).select('id').single();
  if (runRow.error || !runRow.data?.id) {
    if (runRow.error?.code === '23505') {
      const existing = await service.from('sfi_discovery_query_runs').select('id').eq('run_id', result.observationId).maybeSingle();
      if (!existing.error && existing.data?.id) return { result, queryId: String(queryRow.data.id), runId: String(existing.data.id), replay: true };
    }
    throw new Error(`SFI_DISCOVERY_RUN_PERSIST_FAILED:${runRow.error?.message ?? 'unknown'}`);
  }

  const collisionRows = retrievalObservations.flatMap((observation) => (observation.collisions ?? []).map((collision) => ({
    run_id: runRow.data.id,
    dimension: collision.dimension,
    collision_observed: collision.observed,
    observed_value: collision.value,
    source_identity: observation.source,
    observed_at: observation.observedAt,
  })));
  if (collisionRows.length) {
    const inserted = await service.from('sfi_entity_collisions').insert(collisionRows);
    if (inserted.error) throw new Error(`SFI_DISCOVERY_COLLISION_PERSIST_FAILED:${inserted.error.message}`);
  }

  return { result, queryId: String(queryRow.data.id), runId: String(runRow.data.id), replay: false };
}

export async function readDiscoveryRun(runId: string) {
  const service = createServiceSupabaseClient();
  const run = await service.from('sfi_discovery_query_runs').select('*,sfi_discovery_queries(*)').eq('id', runId).maybeSingle();
  if (run.error) throw new Error(`SFI_DISCOVERY_RUN_READ_FAILED:${run.error.message}`);
  if (!run.data) throw new Error('SFI_DISCOVERY_RUN_NOT_FOUND');
  const collisions = await service.from('sfi_entity_collisions').select('*').eq('run_id', runId).order('created_at', { ascending: true });
  if (collisions.error) throw new Error(`SFI_DISCOVERY_COLLISION_READ_FAILED:${collisions.error.message}`);
  return { run: run.data, collisions: collisions.data ?? [] };
}
