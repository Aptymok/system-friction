import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';

type JsonRecord = Record<string, any>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

async function readLatestScoreFriction() {
  try {
    const service = createServiceSupabaseClient();

    const observations = await service
      .from('scorefriction_observations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    const vectors = await service
      .from('scorefriction_vectors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      observation: observations.data?.[0] ?? null,
      vector: vectors.data?.[0] ?? null,
      errors: [observations.error?.message, vectors.error?.message].filter((item): item is string => typeof item === 'string'),
    };
  } catch (error) {
    return {
      observation: null,
      vector: null,
      errors: [error instanceof Error ? error.message : 'scorefriction_read_failed'],
    };
  }
}

export type SfiContrastRuntimeResult = { [key: string]: any };

export async function buildSfiContrastRuntime() {
  const [mihm, score] = await Promise.all([
    buildDerivedMihmRuntime(),
    readLatestScoreFriction(),
  ]);

  const observation = asRecord(score.observation);
  const vector = asRecord(score.vector);
  const normalized = asRecord(observation.normalized_payload);
  const memetic = asRecord(vector.memetic_vector);

  const observation_id = asString(observation.id);
  const vector_id = asString(vector.id);
  const case_id = asString(observation.case_id);

  const hasObservation = Boolean(observation_id);
  const hasVector = Boolean(vector_id);
  const hasMihm = mihm.sourceState !== 'missing';

  const matches: string[] = [];
  const divergences: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const limits: string[] = [];

  if (hasObservation) matches.push('observacion_scorefriction_presente');
  else divergences.push('observacion_scorefriction_ausente');

  if (hasVector) matches.push('vector_scorefriction_presente');
  else divergences.push('vector_scorefriction_ausente');

  if (hasMihm) matches.push('mihm_derivado_desde_vectores');
  else divergences.push('mihm_sin_vectores');

  if (mihm.regime === 'critical') risks.push('regimen_mihm_critical');
  if (Number(mihm.fs ?? 0) > 0.6) risks.push('friccion_sistemica_alta');

  if (Number(memetic.persistence ?? 0) > 0.5) opportunities.push('persistencia_memetica_observable');
  if (Number(memetic.institutional_bridge ?? 0) > 0.5) opportunities.push('puente_institucional_observable');

  if (!hasObservation || !hasVector) limits.push('faltan_datos_scorefriction');
  if (!hasMihm) limits.push('faltan_vectores_para_mihm');
  if (score.errors.length) limits.push(...score.errors.filter((item): item is string => typeof item === 'string'));

  const confidence = clamp01(
    (hasObservation ? 0.34 : 0) +
    (hasVector ? 0.33 : 0) +
    (hasMihm ? 0.33 : 0)
  );

  const status = confidence >= 0.66 ? 'OK' : confidence > 0 ? 'DEGRADED' : 'MISSING';

  return {
    ok: status !== 'MISSING',
    status,
    case_id,
    observation_id,
    vector_id,
    mihm_regime: mihm.regime,
    mihm,
    graph_state: 'not_required_for_minimal_patch',
    matches,
    divergences,
    risks,
    opportunities,
    confidence,
    limits,
    source: {
      observation: normalized,
      vector,
    },
  };
}


