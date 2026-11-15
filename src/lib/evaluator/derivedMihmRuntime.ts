import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { MihmRuntimeMatrix } from '@/observatory/field/catalog/fieldMatrixBuilder';
import { evaluateSfi } from '@/lib/sfi/math';

import { deriveScoreFrictionInputs } from './scoreFrictionVectorDerivation';

async function readLatestScoreFrictionVectors(limit = 12) {
  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from('scorefriction_vectors')
      .select('id,observation_id,acoustic_vector,semantic_vector,memetic_vector,platform_vector,mihm_cultural_vector,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return {
      rows: Array.isArray(data) ? data as Record<string, unknown>[] : [],
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      rows: [] as Record<string, unknown>[],
      error: error instanceof Error ? error.message : 'scorefriction_vectors_read_unavailable',
    };
  }
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function avg(values: number[]): number {
  if (!values.length) throw new Error('cannot_average_missing_vectors');
  return clamp01(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function buildDerivedMihmRuntime(): Promise<MihmRuntimeMatrix & {
  fs: number | null;
  xi: number | null;
  sourceOrigin: string;
  derivationConfidence: number;
  formulaVersion: string;
}> {
  const read = await readLatestScoreFrictionVectors();
  const rows = read.rows;
  const complete = rows.map((row) => ({ row, input: deriveScoreFrictionInputs(row) }))
    .filter((item): item is { row: Record<string, unknown>; input: NonNullable<typeof item.input> } =>
      item.input !== null);

  if (!complete.length) {
    return {
      ihg: null,
      nti: null,
      ldi: null,
      xi: null,
      fs: null,
      phi: null,
      regime: 'missing',
      sourceState: 'missing',
      contributingNodes: [],
      contributingEvidence: [],
      warnings: [read.error
        ? `scorefriction_vectors_read_unavailable:${read.error}`
        : rows.length > 0
          ? 'scorefriction_vectors_incomplete_no_valid_inputs'
          : 'scorefriction_vectors_missing_p11_derived'],
      sourceOrigin: 'scorefriction_vectors',
      derivationConfidence: 0,
      formulaVersion: '2026-08-06.phi-s.v2',
    };
  }

  const inputs = complete.map((item) => item.input);
  const ihg = avg(inputs.map((item) => item.ihg));
  const nti = avg(inputs.map((item) => item.nti));
  const ldi = avg(inputs.map((item) => item.ldi));
  const xi = avg(inputs.map((item) => item.xi));
  const metrics = evaluateSfi({ ihg, nti, ldi, xi });

  const contributingEvidence = complete
    .map(({ row }) => typeof row.observation_id === 'string' ? row.observation_id : null)
    .filter((id): id is string => Boolean(id))
    .slice(0, 12);

  return {
    ihg: metrics.ihg,
    nti: metrics.nti,
    ldi: metrics.ldi,
    xi: metrics.xi,
    fs: metrics.fs,
    phi: metrics.phi,
    regime: metrics.regime.toLowerCase(),
    sourceState: 'derived',
    contributingNodes: ['scorefriction_observations', 'scorefriction_vectors'],
    contributingEvidence,
    warnings: [
      'scorefriction_phi_migrated_to_sfi_math_core',
      ...(complete.length < rows.length ? ['scorefriction_incomplete_vectors_excluded'] : []),
      ...(read.error ? [`scorefriction_vectors_read_unavailable:${read.error}`] : []),
    ],
    sourceOrigin: 'scorefriction_vectors',
    derivationConfidence: clamp01(contributingEvidence.length / Math.max(rows.length, 1)),
    formulaVersion: '2026-08-06.phi-s.v2',
  };
}
