import 'server-only';
import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { calculateLdiFromAge, evaluateSfi, clamp01 } from '@/lib/sfi/math';

export const WORLD_METHODOLOGY_VERSION = 'SFI-WORLD-2026.08.1';
export const WORLD_COLLECTOR_VERSION = 'world-observatory-v1';

type NormalizedObservation = {
  sourceId: string;
  sourceFamily: string;
  publisher: string;
  observationKind: string;
  externalId: string;
  title: string;
  summary: string | null;
  observedAt: string | null;
  releasedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  countryCodes: string[];
  actors: string[];
  affectedSystems: string[];
  payload: Record<string, unknown>;
  sourceUrl: string | null;
  confidence: number;
};

type FrictionReading = {
  ihg: number;
  nti: number;
  ldi: number;
  phi: number;
  fs: number;
  regime: string;
  tension: Record<string, unknown>;
  painMap: Record<string, unknown>;
  fieldDrivers: Record<string, unknown>;
  permissions: Record<string, unknown>;
  trajectory: Record<string, unknown>;
  minimumViablePerturbation: Record<string, unknown>;
};

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function iso(value: unknown): string | null {
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function finite(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function json(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { 'user-agent': 'SystemFrictionInstitute/1.0' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`${response.status}:${url}`);
  return response.json();
}

async function text(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': 'SystemFrictionInstitute/1.0' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`${response.status}:${url}`);
  return response.text();
}

async function collectUsgs(): Promise<NormalizedObservation[]> {
  const payload = await json('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson') as { features?: Array<Record<string, unknown>> };
  return (payload.features ?? []).slice(0, 120).flatMap((feature) => {
    const properties = (feature.properties ?? {}) as Record<string, unknown>;
    const geometry = (feature.geometry ?? {}) as { coordinates?: unknown[] };
    const coordinates = geometry.coordinates ?? [];
    const lat = finite(coordinates[1]);
    const lng = finite(coordinates[0]);
    if (lat === null || lng === null) return [];
    const magnitude = finite(properties.mag) ?? 0;
    return [{
      sourceId: 'usgs-earthquakes', sourceFamily: 'natural_event', publisher: 'USGS', observationKind: 'measurement',
      externalId: String(feature.id ?? hash(feature)), title: String(properties.title ?? 'Earthquake'), summary: String(properties.place ?? ''),
      observedAt: iso(properties.time), releasedAt: iso(properties.updated), latitude: lat, longitude: lng, countryCodes: [], actors: [],
      affectedSystems: ['population', 'infrastructure', 'logistics'], payload: { magnitude, depthKm: finite(coordinates[2]), tsunami: properties.tsunami },
      sourceUrl: typeof properties.url === 'string' ? properties.url : null, confidence: 0.96,
    }];
  });
}

async function collectEonet(): Promise<NormalizedObservation[]> {
  const payload = await json('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=100') as { events?: Array<Record<string, unknown>> };
  return (payload.events ?? []).flatMap((event) => {
    const geometries = Array.isArray(event.geometry) ? event.geometry as Array<Record<string, unknown>> : [];
    const latest = geometries.at(-1);
    const coordinates = Array.isArray(latest?.coordinates) ? latest?.coordinates as unknown[] : [];
    const lng = finite(coordinates[0]); const lat = finite(coordinates[1]);
    if (lat === null || lng === null) return [];
    const categories = Array.isArray(event.categories) ? event.categories as Array<Record<string, unknown>> : [];
    const category = String(categories[0]?.title ?? 'Natural event');
    if (/earthquake/i.test(category)) return [];
    return [{
      sourceId: 'nasa-eonet', sourceFamily: 'natural_event', publisher: 'NASA EONET', observationKind: 'event', externalId: String(event.id ?? hash(event)),
      title: String(event.title ?? category), summary: category, observedAt: iso(latest?.date), releasedAt: null, latitude: lat, longitude: lng,
      countryCodes: [], actors: [], affectedSystems: ['population', 'environment', 'infrastructure'], payload: { category, closed: event.closed ?? null },
      sourceUrl: typeof event.link === 'string' ? event.link : null, confidence: 0.88,
    }];
  });
}

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${name}>`, 'i'));
  return match?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? null;
}

async function collectGdacs(): Promise<NormalizedObservation[]> {
  const xml = await text('https://www.gdacs.org/xml/rss.xml');
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 100).flatMap((match) => {
    const item = match[1]; const point = tag(item, 'georss:point')?.split(/\s+/).map(Number) ?? [];
    const lat = finite(point[0]); const lng = finite(point[1]); const alert = tag(item, 'gdacs:alertlevel') ?? 'Unknown';
    if (lat === null || lng === null || /^green$/i.test(alert)) return [];
    return [{
      sourceId: 'gdacs', sourceFamily: 'natural_event', publisher: 'GDACS', observationKind: 'event', externalId: tag(item, 'guid') ?? hash(item),
      title: tag(item, 'title') ?? 'GDACS event', summary: tag(item, 'description'), observedAt: iso(tag(item, 'pubDate')), releasedAt: iso(tag(item, 'pubDate')),
      latitude: lat, longitude: lng, countryCodes: [], actors: [], affectedSystems: ['population', 'infrastructure', 'humanitarian_response'],
      payload: { alertLevel: alert, eventType: tag(item, 'gdacs:eventtype') }, sourceUrl: tag(item, 'link'), confidence: 0.92,
    }];
  });
}

async function collectFaa(): Promise<NormalizedObservation[]> {
  const xml = await text('https://nasstatus.faa.gov/api/airport-status-information');
  return [...xml.matchAll(/<(Airport|Delay|Ground_Stop|Ground_Delay|Closure)[^>]*>([\s\S]*?)<\/\1>/gi)].slice(0, 100).flatMap((match, index) => {
    const body = match[2]; const name = tag(body, 'Name') ?? tag(body, 'ARPT') ?? tag(body, 'Airport');
    if (!name) return [];
    const lat = finite(tag(body, 'Latitude')); const lng = finite(tag(body, 'Longitude'));
    return [{
      sourceId: 'faa-asws', sourceFamily: 'aviation', publisher: 'FAA ASWS', observationKind: 'restriction', externalId: `${name}:${index}:${hash(body).slice(0, 12)}`,
      title: `${match[1].replaceAll('_', ' ')} · ${name}`, summary: tag(body, 'Reason') ?? tag(body, 'Status'), observedAt: new Date().toISOString(), releasedAt: null,
      latitude: lat, longitude: lng, countryCodes: ['US'], actors: ['airport_operator', 'air_navigation'], affectedSystems: ['aviation', 'logistics', 'passengers'],
      payload: { type: match[1], delay: tag(body, 'Avg') ?? tag(body, 'Delay') }, sourceUrl: 'https://nasstatus.faa.gov/', confidence: 0.94,
    }];
  });
}

function deriveReading(observation: NormalizedObservation): FrictionReading {
  const now = Date.now();
  const observed = observation.observedAt ? new Date(observation.observedAt).getTime() : now;
  const ageHours = Math.max(0, (now - observed) / 3600000);
  const interactionDensity = clamp01((observation.affectedSystems.length + observation.actors.length) / 8);
  const sourceTrust = clamp01(observation.confidence);
  const recency = 1 - calculateLdiFromAge(ageHours, 168);
  const impact = clamp01(Number(observation.payload.magnitude ?? 0) / 8 || interactionDensity);
  const ihg = clamp01(0.35 + impact * 0.35 + sourceTrust * 0.3);
  const nti = clamp01(interactionDensity * 0.55 + recency * 0.45);
  const ldi = calculateLdiFromAge(ageHours, 168);
  const metrics = evaluateSfi({ ihg, nti, ldi, xi: 0.03 });
  const affected = observation.affectedSystems;
  return {
    ...metrics,
    tension: { question: '¿Qué fuerzas incompatibles se acumulan?', between: [`continuidad de ${affected[0] ?? 'sistema'}`, `restricción observada: ${observation.title}`] },
    painMap: { question: '¿A quién le duele?', affectedSystems: affected, actors: observation.actors, direct: affected.slice(0, 2), transferred: affected.slice(2) },
    fieldDrivers: { question: '¿Qué mueve el campo?', drivers: [observation.observationKind, observation.sourceFamily, recency > 0.7 ? 'persistence_now' : 'residual_effect'] },
    permissions: { question: '¿Qué se permitirá?', enabled: ['observe', 'reroute', 'verify_independently'], constrained: affected.map((item) => `normal_operation:${item}`) },
    trajectory: { question: '¿Hacia dónde va?', direction: metrics.fs > 0.72 ? 'fragmentation' : metrics.fs > 0.48 ? 'displacement' : 'absorption', expectedSignal: `change in ${affected.join(', ') || 'field continuity'}`, horizonHours: 24 },
    minimumViablePerturbation: { question: '¿Qué acción mínima y reversible puede probarse?', action: 'add an independent observation lane and compare the next ingestion cycle', reversible: true, returnWindowHours: 24 },
  };
}

export async function runWorldObservationCycle() {
  const collectors = [collectUsgs, collectEonet, collectGdacs, collectFaa];
  const settled = await Promise.allSettled(collectors.map((collector) => collector()));
  const observations = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const failures = settled.flatMap((result, index) => result.status === 'rejected' ? [{ collector: collectors[index].name, error: String(result.reason) }] : []);
  const db = createServiceSupabaseClient();
  let inserted = 0;
  for (const observation of observations) {
    const rawHash = hash(observation.payload);
    const { data, error } = await db.from('world_source_observations').upsert({
      source_id: observation.sourceId, source_family: observation.sourceFamily, publisher: observation.publisher, observation_kind: observation.observationKind,
      external_id: observation.externalId, title: observation.title, summary: observation.summary, observed_at: observation.observedAt, released_at: observation.releasedAt,
      latitude: observation.latitude, longitude: observation.longitude, country_codes: observation.countryCodes, actors: observation.actors, affected_systems: observation.affectedSystems,
      payload: observation.payload, raw_hash: rawHash, source_url: observation.sourceUrl, collector_version: WORLD_COLLECTOR_VERSION, confidence: observation.confidence,
    }, { onConflict: 'source_id,external_id,raw_hash' }).select('id').single();
    if (error || !data) continue;
    const reading = deriveReading(observation);
    await db.from('world_friction_readings').upsert({
      observation_id: data.id, methodology_version: WORLD_METHODOLOGY_VERSION, systemic_friction: reading.fs, interaction_density: reading.nti,
      friction_gradient: clamp01(reading.fs * (1 - reading.ldi)), systemic_coherence: reading.phi, tension: reading.tension, pain_map: reading.painMap,
      field_drivers: reading.fieldDrivers, permissions: reading.permissions, trajectory: reading.trajectory, minimum_viable_perturbation: reading.minimumViablePerturbation,
    }, { onConflict: 'observation_id,methodology_version' });
    inserted += 1;
  }
  return { ok: failures.length < collectors.length, observed: observations.length, persisted: inserted, failures, generatedAt: new Date().toISOString() };
}

export async function runWorldCalibrationCycle() {
  const db = createServiceSupabaseClient();
  const now = new Date().toISOString();
  const { data: hypotheses } = await db.from('world_hypotheses').select('*').in('status', ['OPEN', 'AWAITING_OUTCOME']).lte('validation_ends_at', now).limit(100);
  let calibrated = 0;
  for (const hypothesis of hypotheses ?? []) {
    const expected = Array.isArray(hypothesis.expected_signals) ? hypothesis.expected_signals as string[] : [];
    const contradictions = Array.isArray(hypothesis.contradiction_signals) ? hypothesis.contradiction_signals as string[] : [];
    // Outcome evidence is bounded by SFI acquisition time, not the phenomenon/reference date.
    // This prevents backfilled historical statistics from masquerading as evidence that SFI
    // possessed prospectively when the hypothesis was created.
    const { data: later } = await db.from('world_source_observations')
      .select('id,title,summary,affected_systems,observed_at,released_at,fetched_at')
      .gt('fetched_at', hypothesis.cutoff_at)
      .lte('fetched_at', now)
      .order('fetched_at', { ascending: true })
      .limit(500);
    const corpus = JSON.stringify(later ?? []).toLowerCase();
    const expectedHits = expected.filter((signal) => corpus.includes(signal.toLowerCase()));
    const contradictionHits = contradictions.filter((signal) => corpus.includes(signal.toLowerCase()));
    const coverage = expected.length ? expectedHits.length / expected.length : 0;
    const classification = !later?.length ? 'INCONCLUSIVE' : contradictionHits.length > expectedHits.length ? 'CONTRADICTED' : coverage >= 0.75 ? 'VALIDATED' : coverage > 0 ? 'PARTIALLY_VALIDATED' : 'EXPIRED';
    const outcomeScore = classification === 'VALIDATED' ? 1 : classification === 'PARTIALLY_VALIDATED' ? 0.6 : classification === 'CONTRADICTED' ? 0 : 0.35;
    const before = Number(hypothesis.current_confidence ?? hypothesis.initial_confidence ?? 0.5);
    const after = classification === 'INCONCLUSIVE' ? before : clamp01(before * 0.75 + outcomeScore * clamp01(coverage || 0.5) * 0.25);
    const { data: outcome } = await db.from('world_hypothesis_outcomes').upsert({
      hypothesis_id: hypothesis.id, classification, observed_outcome: `${expectedHits.length}/${expected.length} expected signals; ${contradictionHits.length} contradictions`,
      directional_accuracy: outcomeScore, temporal_accuracy: later?.length ? 1 : null, actor_accuracy: null, mechanism_accuracy: coverage,
      source_coverage: coverage, evidence_ids: (later ?? []).map((item) => item.id), evaluator_version: WORLD_METHODOLOGY_VERSION,
    }, { onConflict: 'hypothesis_id' }).select('id').single();
    if (!outcome) continue;
    await db.from('world_learning_events').insert({
      hypothesis_id: hypothesis.id, outcome_id: outcome.id, retained_assumptions: expectedHits, rejected_assumptions: contradictionHits,
      missing_variables: expected.filter((signal) => !expectedHits.includes(signal)), graph_adjustments: [], confidence_before: before, confidence_after: after,
    });
    await db.from('world_hypotheses').update({ status: classification, current_confidence: after }).eq('id', hypothesis.id);
    calibrated += 1;
  }
  return { ok: true, calibrated, generatedAt: now };
}
