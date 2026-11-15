/**
 * Pure, source-preserving ScoreFriction vector projection.
 * Missing values are NOT measured zeros; invalid or out-of-range inputs abstain.
 */
export type ScoreFrictionInputs = {
  ihg: number;
  nti: number;
  ldi: number;
  xi: number;
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function measured01(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function deriveScoreFrictionInputs(row: Record<string, unknown>): ScoreFrictionInputs | null {
  const memetic = object(row.memetic_vector);
  const semantic = object(row.semantic_vector);
  const platform = object(row.platform_vector);
  // These three inputs are required; their absence cannot be imputed as 0.
  const persistence = measured01(memetic?.persistence);
  const affective = measured01(memetic?.affective_charge);
  const institutional = measured01(memetic?.institutional_bridge);
  if (persistence === null || affective === null || institutional === null) return null;

  const hasSemantic = semantic && Object.keys(semantic).length > 0 ? 1 : 0;
  const hasPlatform = platform && Object.keys(platform).length > 0 ? 1 : 0;
  const ihg = clamp01(institutional * 0.55 + persistence * 0.30 + hasSemantic * 0.15);
  const nti = clamp01(affective * 0.45 + (1 - persistence) * 0.25 + hasPlatform * 0.10);
  const ldi = clamp01((1 - persistence) * 0.45 + (1 - institutional) * 0.35
    + affective * 0.10 + (1 - hasSemantic) * 0.10);
  const xi = clamp01(0.03 + Math.abs(persistence - institutional) * 0.04
    + (1 - hasPlatform) * 0.02 + (1 - hasSemantic) * 0.02);
  return { ihg, nti, ldi, xi };
}
