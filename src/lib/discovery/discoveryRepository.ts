import 'server-only';

import { createHash } from 'node:crypto';
import { runPublicResearch, runZeroKeyDiscoveryResearch } from '@/lib/agents/publicResearch';
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
    query: item.query,
    providerClass: item.source.providerClass,
    unbranded: item.unbranded,
    retrieved: item.retrieved,
    providerResponseText: typeof item.providerResponseText === 'string' ? item.providerResponseText.slice(0, 3000) : null,
    modelId: item.modelId ?? null,
    testModality: item.testModality ?? null,
    attributedEntityName: item.attributedEntityName ?? null,
    attributedDomain: item.attributedDomain ?? null,
    citedCanonicalUrl: item.citedCanonicalUrl ?? null,
    reconstructedFields: item.reconstructedFields ?? null,
    references: (item.references ?? []).slice(0, 200),
    collisions: (item.collisions ?? []).slice(0, 100),
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

function automaticQueryFor(date = new Date(), queryIndex?: number) {
  const dayIndex = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  const index = queryIndex === undefined ? Math.abs(dayIndex) % AUTO_DISCOVERY_QUERIES.length : queryIndex;
  if (!Number.isInteger(index) || index < 0 || index >= AUTO_DISCOVERY_QUERIES.length) {
    throw new Error('SFI_DISCOVERY_QUERY_INDEX_OUT_OF_BOUNDS');
  }
  return AUTO_DISCOVERY_QUERIES[index];
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

export async function runAutomaticDiscoveryObservationCycle(
  now = new Date(),
  options: { zeroKeyOnly?: boolean; queryIndex?: number } = {},
) {
  const selected = automaticQueryFor(now, options.queryIndex);
  const unbranded = !/\b(system friction institute|systemfriction|\bsfi\b)/i.test(selected.query);
  // Restricted egress never calls a paid search provider or a synthesis model.
  const research = options.zeroKeyOnly
    ? await runZeroKeyDiscoveryResearch(selected.query)
    : await runPublicResearch({
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

/**
 * One existing Gemini model invocation, never a web-search observation.
 * An absent/failed response has no eligible denominator. All prompts are public,
 * fixed by SFI, and intentionally withhold the canonical answer.
 */
export async function runBoundedGeminiDiscoveryProbe(probeIndex: number) {
  if (!Number.isInteger(probeIndex) || probeIndex < 0 || probeIndex > 1) {
    throw new Error('SFI_DISCOVERY_AI_PROBE_INDEX_INVALID');
  }
  const unbranded = probeIndex === 0;
  const query = unbranded
    ? 'Name a real independent research institute, if you know one, that studies structural friction in systems, evidence governed interventions and observed outcomes. Do not guess or invent an institute. Give its name, primary web domain, and identifying URL only if independently known.'
    : 'What do you independently know about the organization named System Friction Institute? State its primary domain and entity identifier only if known. If unsure, say UNKNOWN. Do not infer a URL from the spelling of the name.';
  const observedAt = new Date().toISOString();
  const { runLlmTask } = await import('@/lib/ai/providerRouter');
  const inference = await runLlmTask({
    task: 'report',
    system: 'Independent model-memory recognition experiment. You have no web-search tool for this request. Do not fabricate facts. If unknown, write UNKNOWN. Answer in under 120 words.',
    prompt: query,
    fallbackResult: '',
    preferredProvider: 'gemini',
    requirements: { providerAllowlist: ['gemini'], privacyClass: 'PUBLIC' },
    maxProviderAttempts: 1,
    maxTokens: 170,
    deadlineAtMs: Date.now() + 24_000,
  });
  const answered = inference.ok && inference.provider === 'gemini' && Boolean(inference.result.trim());
  const answer = answered ? inference.result.slice(0, 3000) : '';
  const mentionsName = /\bsystem friction institute\b/i.test(answer);
  const mentionsCanonical = /(?:https?:\/\/)?(?:www\.)?systemfriction\.org(?:\/|\b)/i.test(answer);
  const retrieved = answered ? (unbranded ? mentionsName && mentionsCanonical : mentionsCanonical) : null;
  const sourceClass = 'AI' as const;
  const source = {
    sourceId: `MODEL-MEMORY:gemini:${answered ? inference.model : 'unavailable'}`,
    sourceUrl: null,
    publisher: 'Google Gemini API',
    platform: 'gemini',
    providerClass: sourceClass,
    independent: true,
  };
  const observation: SfiDiscoveryRetrievalObservation = {
    observationId: `GEMINI-DISCOVERY-${observedAt}-${probeIndex}`,
    source,
    observedAt,
    query,
    unbranded,
    retrieved,
    providerResponseText: answered ? answer : null,
    modelId: answered ? inference.model : inference.telemetry.attempts[0]?.model ?? null,
    testModality: 'MODEL_MEMORY_NO_WEB',
    attributedEntityName: answered && mentionsName ? 'System Friction Institute' : null,
    attributedDomain: answered && mentionsCanonical ? 'systemfriction.org' : null,
    // A model's self-reported URL is not an independently verified citation.
    citedCanonicalUrl: null,
    reconstructedFields: answered && mentionsName && mentionsCanonical
      ? { name: 'System Friction Institute', domain: 'https://systemfriction.org' }
      : undefined,
    status: answered ? 'AVAILABLE' : 'UNAVAILABLE',
  };
  const saved = await persistDiscoveryObservation({
    mode: 'distinct_intent',
    query,
    intent: unbranded ? 'Unaided model-memory discovery with SFI name withheld' : 'Cued model-memory identity reconstruction, never web attribution',
    retrievalObservations: [observation],
  }, null);
  return {
    ok: true,
    runId: saved.runId,
    replay: saved.replay,
    observedAt,
    provider: answered ? inference.provider : 'unavailable',
    model: observation.modelId,
    probe: unbranded ? 'UNBRANDED_MEMORY' : 'NAMED_MEMORY',
    status: observation.status,
    retrieved,
    answer: answered ? answer : null,
    warnings: inference.warnings.slice(0, 8),
    epistemicBoundary: 'Observed model text only; no web retrieval, source citation, independent factual confirmation, real-world recognition or institutional adoption.',
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

/**
 * Opt-in single Gemini grounded SEARCH experiment. No scheduler calls this.
 * A model sentence is not a citation; only returned Google grounding chunks
 * establish that the web tool supplied references.
 */
export async function runBoundedGeminiGroundedDiscoveryProbe() {
  const query = 'Using Google Search, identify the research organization exactly named System Friction Institute. Report its website and any externally verifiable institutional entity identifier. Differentiate it from similarly named organizations. If identity or entity ID is not independently supported by search results, explicitly write UNKNOWN. Cite web sources.';
  const observedAt = new Date().toISOString();
  const model = 'gemini-3.5-flash-lite';
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_KEY_NOT_CONFIGURED');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  let status: SfiDiscoveryRetrievalObservation['status'] = 'UNAVAILABLE';
  let answer: string | null = null;
  let searchQueries: string[] = [];
  let sourceUrls: string[] = [];
  let reason = 'GROUNDING_RESPONSE_UNAVAILABLE';
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: query }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 420 },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      reason = `GEMINI_GROUNDING_HTTP_${response.status}`;
    } else {
      const raw = await response.json() as Record<string, unknown>;
      const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
      const first = candidates[0] && typeof candidates[0] === 'object'
        ? candidates[0] as Record<string, unknown> : {};
      const content = first.content && typeof first.content === 'object'
        ? first.content as Record<string, unknown> : {};
      const parts = Array.isArray(content.parts) ? content.parts : [];
      answer = parts.map((part) => part && typeof part === 'object'
        ? String((part as Record<string, unknown>).text ?? '') : '').join('\n').slice(0, 3000).trim() || null;
      const grounding = first.groundingMetadata && typeof first.groundingMetadata === 'object'
        ? first.groundingMetadata as Record<string, unknown> : {};
      searchQueries = Array.isArray(grounding.webSearchQueries)
        ? grounding.webSearchQueries.filter((item): item is string => typeof item === 'string').slice(0, 20)
        : [];
      const chunks = Array.isArray(grounding.groundingChunks) ? grounding.groundingChunks : [];
      sourceUrls = [...new Set(chunks.map((chunk) => {
        if (!chunk || typeof chunk !== 'object') return '';
        const web = (chunk as Record<string, unknown>).web;
        return web && typeof web === 'object' && typeof (web as Record<string, unknown>).uri === 'string'
          ? String((web as Record<string, unknown>).uri) : '';
      }).filter((url) => {
        try { return new URL(url).protocol === 'https:'; } catch { return false; }
      }))].slice(0, 40);
      status = answer && sourceUrls.length && searchQueries.length ? 'AVAILABLE' : 'UNAVAILABLE';
      reason = status === 'AVAILABLE' ? 'GROUNDED_RESULT_RETURNED' : 'NO_GROUNDING_CITATIONS_OR_TEXT';
    }
  } catch {
    reason = 'GEMINI_GROUNDING_REQUEST_FAILED_OR_TIMEOUT';
  } finally {
    clearTimeout(timeout);
  }
  const citedCanonicalUrl = sourceUrls.find((url) => {
    try { return new URL(url).hostname.replace(/^www\./, '') === 'systemfriction.org'; } catch { return false; }
  }) ?? null;
  // The text may mention the institute without genuinely citing the correct domain.
  const mentionsName = /\bsystem friction institute\b/i.test(answer ?? '');
  const mentionsDomain = /\bsystemfriction\.org\b/i.test(answer ?? '');
  const retrieved = status === 'AVAILABLE' ? Boolean(citedCanonicalUrl && mentionsName) : null;
  const observation: SfiDiscoveryRetrievalObservation = {
    observationId: `GEMINI-GROUNDED-${observedAt}`,
    observedAt, query, unbranded: false, retrieved,
    source: { sourceId: 'GEMINI:GOOGLE_SEARCH_GROUNDING', sourceUrl: null,
      publisher: 'Google Gemini API', platform: 'gemini-google-search',
      providerClass: 'AI', independent: false },
    providerResponseText: answer,
    modelId: model,
    testModality: 'WEB_SEARCH',
    attributedEntityName: retrieved && mentionsName ? 'System Friction Institute' : null,
    attributedDomain: retrieved && mentionsDomain ? 'systemfriction.org' : null,
    citedCanonicalUrl: retrieved ? citedCanonicalUrl : null,
    references: sourceUrls.map((url) => ({ url, independent: false })),
    status,
  };
  const saved = await persistDiscoveryObservation({
    mode: 'distinct_intent', query,
    intent: 'Single founder-authorized Gemini Google Search grounded identity probe; not model memory or adoption',
    retrievalObservations: [observation],
  }, null);
  return {
    ok: true, runId: saved.runId, replay: saved.replay, model,
    observedAt, status, reason, retrieved, answer, sourceUrls, searchQueries,
    sourceCount: sourceUrls.length, searchQueryCount: searchQueries.length,
    citedCanonicalUrl: retrieved ? citedCanonicalUrl : null,
    estimateNotInvoice: 'Google may bill per actual generated search query; SFI does not verify invoice amounts.',
    epistemicBoundary: 'Google grounding source URLs are provider-reported; text alone is not independent identification, entityId is not inferred, no automatic recognition/RETURN/canon.',
  };
}
