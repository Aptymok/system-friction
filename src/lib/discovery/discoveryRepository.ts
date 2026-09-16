import 'server-only';

import { createHash } from 'node:crypto';
import { runPublicResearch } from '@/lib/agents/publicResearch';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { SfiDiscoveryObservationInput, SfiDiscoveryRetrievalObservation } from './discoveryMesh';
import { observeDiscovery } from './discoveryMesh';

const AUTO_DISCOVERY_QUERIES = [
  { query: 'evidence authority return AI governance institutions', intent: 'Can SFI be retrieved without naming the institution when the problem is operational AI governance?' },
  { query: 'institutional friction evidence complex systems method', intent: 'Can SFI be retrieved from its problem and method vocabulary rather than its brand?' },
  { query: 'System Friction Institute evidence governance RETURN', intent: 'Is the canonical SFI identity retrieved and attributed coherently when named?' },
  { query: 'MIHM institutional friction method', intent: 'Are SFI methods or method vocabulary independently retrievable?' },
] as const;

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

function canonicalSfiUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '') === 'systemfriction.org' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function automaticQueryFor(date = new Date()) {
  const dayIndex = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return AUTO_DISCOVERY_QUERIES[Math.abs(dayIndex) % AUTO_DISCOVERY_QUERIES.length];
}

export async function persistDiscoveryObservation(input: SfiDiscoveryObservationInput, actorId: string | null) {
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

export async function runAutomaticDiscoveryObservationCycle(now = new Date()) {
  const selected = automaticQueryFor(now);
  const unbranded = !/\b(system friction institute|systemfriction|\bsfi\b)/i.test(selected.query);
  const research = await runPublicResearch({
    prompt: `Observe public retrieval for System Friction Institute without manufacturing discovery. Query: ${selected.query}. Return sources only as search/retrieval observations. A source result is not recognition, relation, PULL or RETURN.`,
    queries: [selected.query],
    country: 'US',
    searchLang: 'en',
    timezone: 'America/New_York',
  });
  const own = research.sources.map((source) => ({ source, canonicalUrl: canonicalSfiUrl(source.url) })).find((item) => item.canonicalUrl) ?? null;
  const observedAt = now.toISOString();
  const externalReferences = research.sources
    .filter((source) => !canonicalSfiUrl(source.url))
    .map((source) => ({ url: source.url, independent: true }));
  const observation: SfiDiscoveryRetrievalObservation = {
    observationId: `AUTO-DISCOVERY-${observedAt.slice(0, 10)}-${sha256(selected.query).slice(7, 15)}`,
    source: {
      sourceId: `PUBLIC-RESEARCH:${research.provider}`,
      sourceUrl: null,
      publisher: research.provider,
      platform: research.provider,
      providerClass: 'SEARCH',
      independent: true,
    },
    observedAt,
    query: selected.query,
    unbranded,
    retrieved: own ? true : research.ok ? false : null,
    attributedEntityName: own ? 'System Friction Institute' : null,
    attributedDomain: own ? 'systemfriction.org' : null,
    citedCanonicalUrl: own?.canonicalUrl ?? null,
    references: externalReferences,
    collisions: [],
    propagationPlatforms: [],
    status: research.ok ? 'AVAILABLE' : research.provider === 'unavailable' ? 'UNAVAILABLE' : 'DEGRADED',
  };
  const persisted = await persistDiscoveryObservation({
    mode: 'distinct_intent',
    query: selected.query,
    intent: selected.intent,
    retrievalObservations: [observation],
  }, null);
  return {
    ok: research.ok,
    query: selected.query,
    intent: selected.intent,
    provider: research.provider,
    sourcesObserved: research.sources.length,
    sfiRetrieved: observation.retrieved,
    canonicalUrl: observation.citedCanonicalUrl,
    runId: persisted.runId,
    replay: persisted.replay,
    warnings: research.warnings,
    epistemicBoundary: 'RETRIEVAL_OBSERVATION_ONLY: does not imply recognition, relation, propagation, PULL, RETURN or canonical promotion.',
  };
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
