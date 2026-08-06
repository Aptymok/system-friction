import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { MihmRuntimeMatrix } from '@/observatory/field/catalog/fieldMatrixBuilder';
import { evaluateSfi } from '@/lib/sfi/math';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function num(obj: Record<string, unknown> | null | undefined, key: string): number {
  const value = obj?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : 0;
}

async function readLatestScoreFrictionVectors(limit = 12) {
  try {
    const service = createServiceSupabaseClient();

    const { data, error } = await service
      .from('scorefriction_vectors')
      .select('id,observation_id,acoustic_vector,semantic_vector,memetic_vector,platform_vector,mihm_cultural_vector,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) return [];
    return data as Record<string, unknown>[];
  } catch {
    return [];
  }
}

type ScoreFrictionInputs = {
  ihg: number;
  nti: number;
  ldi: number;
  xi: number;
};

function deriveInputs(row: Record<string, unknown>): ScoreFrictionInputs {
  const memetic = row.memetic_vector as Record<string, unknown> | null | undefined;
  const semantic = row.semantic_vector as Record<string, unknown> | null | undefined;
  const platform = row.platform_vector as Record<string, unknown> | null | undefined;

  const persistence = num(memetic, 'persistence');
  const affective = num(memetic, 'affective_charge');
  const institutional = num(memetic, 'institutional_bridge');

  const hasSemantic = semantic && Object.keys(semantic).length > 0 ? 1 : 0;
  const hasPlatform = platform && Object.keys(platform).length > 0 ? 1 : 0;

  const ihg = clamp01((institutional * 0.55) + (persistence * 0.30) + (hasSemantic * 0.15));
  const nti = clamp01((affective * 0.45) + ((1 - persistence) * 0.25) + (hasPlatform * 0.10));
  const ldi = clamp01(
    ((1 - persistence) * 0.45)
    + ((1 - institutional) * 0.35)
    + (affective * 0.10)
    + ((1 - hasSemantic) * 0.10),
  );
  const xi = clamp01(
    0.03
    + (Math.abs(persistence - institutional) * 0.04)
    + ((1 - hasPlatform) * 0.02)
    + ((1 - hasSemantic) * 0.02),
  );

  return { ihg, nti, ldi, xi };
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return clamp01(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function buildDerivedMihmRuntime(): Promise<MihmRuntimeMatrix & {
  fs: number;
  xi: number;
  sourceOrigin: string;
  derivationConfidence: number;
  formulaVersion: string;
}> {
  const rows = await readLatestScoreFrictionVectors();

  if (!rows.length) {
    return {
      ihg: 0,
      nti: 0,
      ldi: 0,
      xi: 0,
      fs: 0,
      phi: 0,
      regime: 'missing',
      sourceState: 'missing',
      contributingNodes: [],
      contributingEvidence: [],
      warnings: ['scorefriction_vectors_missing_p11_derived'],
      sourceOrigin: 'scorefriction_vectors',
      derivationConfidence: 0,
      formulaVersion: '2026-08-06.phi-s.v2',
    };
  }

  const inputs = rows.map(deriveInputs);
  const ihg = avg(inputs.map((item) => item.ihg));
  const nti = avg(inputs.map((item) => item.nti));
  const ldi = avg(inputs.map((item) => item.ldi));
  const xi = avg(inputs.map((item) => item.xi));
  const metrics = evaluateSfi({ ihg, nti, ldi, xi });

  const contributingEvidence = rows
    .map((row) => typeof row.observation_id === 'string' ? row.observation_id : null)
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
    warnings: ['scorefriction_phi_migrated_to_sfi_math_core'],
    sourceOrigin: 'scorefriction_vectors',
    derivationConfidence: clamp01(contributingEvidence.length / Math.max(rows.length, 1)),
    formulaVersion: '2026-08-06.phi-s.v2',
  };
}
