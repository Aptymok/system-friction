export type SfiRegime = 'HOMEOSTATICO' | 'CRITICO' | 'ENTROPICO';

export type SfiInput = {
  ihg: number;
  nti: number;
  ldi: number;
  xi?: number;
};

export type SfiMetrics = {
  ihg: number;
  nti: number;
  ldi: number;
  xi: number;
  phi: number;
  fs: number;
  regime: SfiRegime;
};

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizePositive(value: number, max = 1): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return clamp01(value / max);
}

export function calculatePhi(input: SfiInput): number {
  const ihg = clamp01(input.ihg);
  const nti = clamp01(input.nti);
  const ldi = clamp01(input.ldi);
  const xi = clamp01(input.xi ?? 0.03);
  return clamp01((ihg * nti) / (1 + ldi) + xi);
}

export function calculateFs(input: SfiInput): number {
  return clamp01(1 - calculatePhi(input));
}

export function evaluateSfiRegime(input: SfiInput): SfiRegime {
  const ihg = clamp01(input.ihg);
  const nti = clamp01(input.nti);
  const ldi = clamp01(input.ldi);
  const phi = calculatePhi(input);

  if (phi >= 0.58 && ldi <= 0.45 && nti >= 0.55 && ihg >= 0.50) return 'HOMEOSTATICO';
  if (phi <= 0.22 || ldi >= 0.78 || nti <= 0.25) return 'ENTROPICO';
  return 'CRITICO';
}

export function evaluateSfi(input: SfiInput): SfiMetrics {
  const ihg = clamp01(input.ihg);
  const nti = clamp01(input.nti);
  const ldi = clamp01(input.ldi);
  const xi = clamp01(input.xi ?? 0.03);
  const phi = calculatePhi({ ihg, nti, ldi, xi });
  const fs = clamp01(1 - phi);
  const regime = evaluateSfiRegime({ ihg, nti, ldi, xi });
  return { ihg, nti, ldi, xi, phi, fs, regime };
}

export function calculateLdiFromAge(ageHours: number, halfLifeHours = 168): number {
  if (!Number.isFinite(ageHours) || ageHours <= 0) return 0;
  const lambda = Math.log(2) / halfLifeHours;
  return clamp01(1 - Math.exp(-lambda * ageHours));
}

export function calculateEvidenceTrust(input: {
  verified: boolean;
  sourceCount: number;
  hasHash: boolean;
  hasTimestamp: boolean;
  hasOperator: boolean;
  ageHours: number;
}): number {
  const verification = input.verified ? 0.35 : 0.05;
  const source = clamp01(input.sourceCount / 5) * 0.20;
  const hash = input.hasHash ? 0.15 : 0;
  const timestamp = input.hasTimestamp ? 0.10 : 0;
  const operator = input.hasOperator ? 0.10 : 0;
  const recency = (1 - calculateLdiFromAge(input.ageHours, 336)) * 0.10;
  return clamp01(verification + source + hash + timestamp + operator + recency);
}

export function calculateAttractorWeight(input: {
  density: number;
  confidence: number;
  persistence: number;
  trust: number;
  degradation: number;
}): number {
  return clamp01(
    clamp01(input.density) *
    clamp01(input.confidence) *
    clamp01(input.persistence) *
    clamp01(input.trust) *
    (1 - clamp01(input.degradation))
  );
}

export function calculateEjectorWeight(input: {
  contradiction: number;
  unresolvedDebt: number;
  decay: number;
  externalPressure: number;
}): number {
  return clamp01(
    clamp01(input.contradiction) * 0.30 +
    clamp01(input.unresolvedDebt) * 0.30 +
    clamp01(input.decay) * 0.20 +
    clamp01(input.externalPressure) * 0.20
  );
}

export function calculateRce(input: {
  verifiedActions14d: number;
  acceptedDecisions30d: number;
}): number {
  if (input.acceptedDecisions30d <= 0) return 0;
  return clamp01(input.verifiedActions14d / input.acceptedDecisions30d);
}

export function calculateRealityDebt(input: {
  decisionsWithoutAction: number;
  actionsWithoutReobservation: number;
  abandonedIntentions: number;
}): number {
  return Math.max(
    0,
    input.decisionsWithoutAction * 1.0 +
    input.actionsWithoutReobservation * 0.7 +
    input.abandonedIntentions * 0.5
  );
}
