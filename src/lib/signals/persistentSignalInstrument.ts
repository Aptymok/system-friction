import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { clamp01, inferSignalHash } from './hash';
import type { ManifestSignalInput, PersistentSignal, PersistentSignalState, SignalManifestation, SignalModality, SignalState } from './types';

type Row = Record<string, unknown>;

const SIGNAL_MODALITIES: SignalModality[] = ['text', 'image', 'audio', 'video', 'event', 'mixed', 'unknown'];

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMetric(value: number): number {
  return Math.round(clamp01(value) * 1000) / 1000;
}

function coerceModality(value: unknown): SignalModality {
  return SIGNAL_MODALITIES.includes(value as SignalModality) ? value as SignalModality : 'unknown';
}

function coerceState(value: unknown): SignalState {
  const states: SignalState[] = ['latent', 'emerging', 'crystallizing', 'consolidated', 'degraded'];
  return states.includes(value as SignalState) ? value as SignalState : 'latent';
}

function toPersistentSignal(value: unknown): PersistentSignal {
  const row = record(value);
  return {
    id: str(row.id),
    signal_hash: str(row.signal_hash),
    label: typeof row.label === 'string' ? row.label : null,
    description: typeof row.description === 'string' ? row.description : null,
    scope: str(row.scope, 'sfi'),
    state: coerceState(row.state),
    first_seen: str(row.first_seen),
    last_seen: str(row.last_seen),
    occurrence_count: Math.max(0, Math.trunc(num(row.occurrence_count))),
    modalities: Array.isArray(row.modalities) ? row.modalities.map(coerceModality) : [],
    persistence_score: clamp01(row.persistence_score),
    cross_modal_score: clamp01(row.cross_modal_score),
    drift_score: clamp01(row.drift_score),
    entropy_score: clamp01(row.entropy_score),
    mihm_snapshot: row.mihm_snapshot ?? null,
    worldspect_snapshot: row.worldspect_snapshot ?? null,
    supporting_vectors: Array.isArray(row.supporting_vectors) ? row.supporting_vectors : [],
    metadata: record(row.metadata),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

function toManifestation(value: unknown): SignalManifestation {
  const row = record(value);
  return {
    id: str(row.id),
    signal_id: str(row.signal_id),
    source_type: str(row.source_type),
    source_id: typeof row.source_id === 'string' ? row.source_id : null,
    modality: coerceModality(row.modality),
    content_hash: typeof row.content_hash === 'string' ? row.content_hash : null,
    embedding: row.embedding ?? null,
    similarity: clamp01(row.similarity),
    observed_at: str(row.observed_at),
    payload: record(row.payload),
    created_at: str(row.created_at),
  };
}

function stateForMetrics(occurrenceCount: number, persistenceScore: number, crossModalScore: number): SignalState {
  if (persistenceScore >= 0.88 && occurrenceCount >= 12) return 'consolidated';
  if (occurrenceCount < 2) return 'latent';
  if (persistenceScore >= 0.75 && crossModalScore >= 0.5) return 'crystallizing';
  if (persistenceScore >= 0.55) return 'emerging';
  if (occurrenceCount >= 4 && persistenceScore < 0.35) return 'degraded';
  return 'latent';
}

function buildFieldSummary(signals: PersistentSignal[]): PersistentSignalState['fieldSummary'] {
  const total = signals.length;
  const byState = (state: SignalState) => signals.filter((signal) => signal.state === state).length;
  const avg = (key: 'persistence_score' | 'cross_modal_score') => total
    ? roundMetric(signals.reduce((sum, signal) => sum + signal[key], 0) / total)
    : 0;
  const sortedByPersistence = [...signals].sort((a, b) => b.persistence_score - a.persistence_score);
  const modalityCounts = new Map<SignalModality, number>();

  for (const signal of signals) {
    for (const modality of signal.modalities) {
      modalityCounts.set(modality, (modalityCounts.get(modality) ?? 0) + 1);
    }
  }

  return {
    totalSignals: total,
    latentCount: byState('latent'),
    emergingCount: byState('emerging'),
    crystallizingCount: byState('crystallizing'),
    consolidatedCount: byState('consolidated'),
    degradedCount: byState('degraded'),
    averagePersistence: avg('persistence_score'),
    averageCrossModal: avg('cross_modal_score'),
    strongestSignal: sortedByPersistence[0] ?? null,
    weakestSignal: sortedByPersistence.length ? sortedByPersistence[sortedByPersistence.length - 1] : null,
    dominantModalities: Array.from(modalityCounts.entries())
      .map(([modality, count]) => ({ modality, count }))
      .sort((a, b) => b.count - a.count),
  };
}

async function recalculateSignal(signalId: string) {
  const service = createServiceSupabaseClient();
  const result = await service
    .from('signal_manifestations')
    .select('*')
    .eq('signal_id', signalId)
    .order('observed_at', { ascending: true });

  if (result.error) return { ok: false as const, error: 'signal_manifestations_read_failed', details: result.error.message };

  const manifestations = rows(result.data).map(toManifestation);
  const occurrenceCount = manifestations.length;
  const firstSeen = manifestations[0]?.observed_at ?? new Date().toISOString();
  const lastSeen = manifestations[manifestations.length - 1]?.observed_at ?? firstSeen;
  const modalities = Array.from(new Set(manifestations.map((manifestation) => manifestation.modality)));
  const similarityFactor = occurrenceCount
    ? manifestations.reduce((sum, manifestation) => sum + manifestation.similarity, 0) / occurrenceCount
    : 0;
  const first = new Date(firstSeen).getTime();
  const last = new Date(lastSeen).getTime();
  const daysBetween = Number.isFinite(first) && Number.isFinite(last) ? Math.max(0, (last - first) / 86_400_000) : 0;
  const occurrenceFactor = Math.min(1, occurrenceCount / 12);
  const modalFactor = Math.min(1, modalities.length / 4);
  const timeFactor = Math.min(1, daysBetween / 30);
  const persistenceScore = roundMetric((0.35 * occurrenceFactor) + (0.30 * timeFactor) + (0.20 * similarityFactor) + (0.15 * modalFactor));
  const crossModalScore = roundMetric(modalFactor);
  const driftScore = roundMetric(1 - similarityFactor);
  const entropyScore = roundMetric(1 - persistenceScore);
  const state = stateForMetrics(occurrenceCount, persistenceScore, crossModalScore);

  const updated = await service
    .from('persistent_signals')
    .update({
      state,
      first_seen: firstSeen,
      last_seen: lastSeen,
      occurrence_count: occurrenceCount,
      modalities,
      persistence_score: persistenceScore,
      cross_modal_score: crossModalScore,
      drift_score: driftScore,
      entropy_score: entropyScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signalId)
    .select('*')
    .single();

  if (updated.error) return { ok: false as const, error: 'persistent_signal_update_failed', details: updated.error.message };
  return { ok: true as const, signal: toPersistentSignal(updated.data) };
}

export async function manifestPersistentSignal(input: ManifestSignalInput) {
  try {
    const sourceType = str(input.source_type);
    if (!sourceType) return { ok: false as const, error: 'source_type_required' };

    const signalHash = inferSignalHash(input);
    const modality = coerceModality(input.modality);
    const service = createServiceSupabaseClient();

    let found = await service
      .from('persistent_signals')
      .select('*')
      .eq('signal_hash', signalHash)
      .maybeSingle();

    if (found.error) return { ok: false as const, error: 'persistent_signal_lookup_failed', details: found.error.message };

    if (!found.data) {
      const inserted = await service
        .from('persistent_signals')
        .insert({
          signal_hash: signalHash,
          label: str(input.label) || null,
          description: str(input.description) || null,
          scope: str(input.scope, 'sfi'),
          state: 'latent',
          occurrence_count: 0,
          modalities: [modality],
          mihm_snapshot: input.mihm_snapshot ?? null,
          worldspect_snapshot: input.worldspect_snapshot ?? null,
          supporting_vectors: Array.isArray(input.supporting_vectors) ? input.supporting_vectors : [],
          metadata: {},
        })
        .select('*')
        .single();

      if (inserted.error) {
        found = await service.from('persistent_signals').select('*').eq('signal_hash', signalHash).maybeSingle();
        if (found.error || !found.data) {
          return { ok: false as const, error: 'persistent_signal_insert_failed', details: inserted.error.message };
        }
      } else {
        found = { data: inserted.data, error: null } as typeof found;
      }
    }

    const signal = toPersistentSignal(found.data);
    const manifestationInsert = await service
      .from('signal_manifestations')
      .insert({
        signal_id: signal.id,
        source_type: sourceType,
        source_id: str(input.source_id) || null,
        modality,
        content_hash: str(input.content_hash) || signalHash,
        embedding: input.embedding ?? null,
        similarity: clamp01(input.similarity, 1),
        payload: record(input.payload),
      })
      .select('*')
      .single();

    if (manifestationInsert.error) {
      return { ok: false as const, error: 'signal_manifestation_insert_failed', details: manifestationInsert.error.message };
    }

    const recalculated = await recalculateSignal(signal.id);
    if (!recalculated.ok) return recalculated;

    return {
      ok: true as const,
      signal: recalculated.signal,
      manifestation: toManifestation(manifestationInsert.data),
    };
  } catch (error) {
    return { ok: false as const, error: 'persistent_signal_manifest_failed', details: error instanceof Error ? error.message : String(error) };
  }
}

export async function listPersistentSignals() {
  try {
    const service = createServiceSupabaseClient();
    const result = await service
      .from('persistent_signals')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(24);

    if (result.error) return { ok: false as const, error: 'persistent_signals_read_failed', details: result.error.message };
    return { ok: true as const, signals: rows(result.data).map(toPersistentSignal) };
  } catch (error) {
    return { ok: false as const, error: 'persistent_signals_read_failed', details: error instanceof Error ? error.message : String(error) };
  }
}

export async function buildPersistentSignalState() {
  try {
    const service = createServiceSupabaseClient();
    const [signalsResult, manifestationsResult] = await Promise.all([
      service.from('persistent_signals').select('*').order('updated_at', { ascending: false }).limit(24),
      service.from('signal_manifestations').select('*').order('observed_at', { ascending: false }).limit(24),
    ]);

    if (signalsResult.error) return { ok: false as const, error: 'persistent_signals_read_failed', details: signalsResult.error.message };
    if (manifestationsResult.error) return { ok: false as const, error: 'signal_manifestations_read_failed', details: manifestationsResult.error.message };

    const signals = rows(signalsResult.data).map(toPersistentSignal);
    const recentManifestations = rows(manifestationsResult.data).map(toManifestation);

    return {
      ok: true as const,
      signals,
      crystallizing: signals.filter((signal) => signal.state === 'crystallizing'),
      degraded: signals.filter((signal) => signal.state === 'degraded'),
      recentManifestations,
      fieldSummary: buildFieldSummary(signals),
    };
  } catch (error) {
    return { ok: false as const, error: 'persistent_signal_state_failed', details: error instanceof Error ? error.message : String(error) };
  }
}

export async function getSignalTrajectory(signalId: string) {
  try {
    const cleanSignalId = str(signalId);
    if (!cleanSignalId) return { ok: false as const, error: 'signal_id_required' };

    const service = createServiceSupabaseClient();
    const [signalResult, manifestationsResult] = await Promise.all([
      service.from('persistent_signals').select('*').eq('id', cleanSignalId).maybeSingle(),
      service.from('signal_manifestations').select('*').eq('signal_id', cleanSignalId).order('observed_at', { ascending: true }),
    ]);

    if (signalResult.error) return { ok: false as const, error: 'persistent_signal_read_failed', details: signalResult.error.message };
    if (!signalResult.data) return { ok: false as const, error: 'persistent_signal_not_found' };
    if (manifestationsResult.error) return { ok: false as const, error: 'signal_manifestations_read_failed', details: manifestationsResult.error.message };

    return {
      ok: true as const,
      signal: toPersistentSignal(signalResult.data),
      manifestations: rows(manifestationsResult.data).map(toManifestation),
    };
  } catch (error) {
    return { ok: false as const, error: 'signal_trajectory_failed', details: error instanceof Error ? error.message : String(error) };
  }
}

export async function manifestScoreFrictionAttractorAsSignal(protoAttractorId: string) {
  try {
    const cleanId = str(protoAttractorId);
    if (!cleanId) return { ok: false as const, error: 'proto_attractor_id_required' };

    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from('scorefriction_proto_attractors')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    if (error) return { ok: false as const, error: 'scorefriction_proto_attractor_read_failed', details: error.message };
    if (!data) return { ok: false as const, error: 'scorefriction_proto_attractor_not_found' };

    const proto = record(data);
    return manifestPersistentSignal({
      label: str(proto.name),
      description: str(proto.description),
      scope: 'scorefriction',
      source_type: 'scorefriction_proto_attractor',
      source_id: str(proto.id),
      modality: 'mixed',
      content: JSON.stringify({
        name: proto.name,
        description: proto.description,
        supporting_vectors: proto.supporting_vectors,
      }),
      similarity: clamp01(proto.confidence, 0.5),
      mihm_snapshot: proto.mihm_snapshot,
      worldspect_snapshot: proto.worldspect_snapshot,
      supporting_vectors: Array.isArray(proto.supporting_vectors) ? proto.supporting_vectors : [],
    });
  } catch (error) {
    return { ok: false as const, error: 'scorefriction_signal_manifest_failed', details: error instanceof Error ? error.message : String(error) };
  }
}
