export interface CanonicalFormulaDefinition {
  id: string;
  version: string;
  owner: 'SFI' | 'MIHM' | 'MOPH' | 'MEMORY' | 'WORLDSPECT';
  inputs: Array<{ name: string; type: string; description?: string }>;
  output: { name: string; type: string; description?: string };
  implementation: string;
}

export type CanonicalRegime = 'HOMEOSTATIC' | 'CRITICAL' | 'ENTROPIC';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function calculatePhiSfi(ihg: number, nti: number, ldi: number, xi: number): number {
  const normalizedIhg = clamp01(ihg);
  const normalizedNti = clamp01(nti);
  const normalizedLdi = clamp01(ldi);
  const normalizedXi = clamp01(xi);
  return clamp01((normalizedIhg * normalizedNti) / (1 + normalizedLdi) + normalizedXi);
}

export function calculateFS(phiSfi: number): number {
  return clamp01(1 - clamp01(phiSfi));
}

export function calculatePsiMoph(ihg: number, nti: number, ldi: number, epsilon: number, go: number): number {
  return clamp01(((1 / (clamp01(ihg) + 0.1)) * clamp01(nti) * (1 / (clamp01(ldi) + 0.1)) + clamp01(epsilon) - 0.15 * clamp01(go)) / 12);
}

export function calculateCField(ihg: number, ldi: number, nti: number): number {
  return clamp01(clamp01(ihg) * (1 - clamp01(ldi)) * (1 - 0.35 * clamp01(nti)));
}

export function calculateDM(halfLife: number, age: number): number {
  if (!Number.isFinite(halfLife) || halfLife <= 0 || !Number.isFinite(age) || age <= 0) return 0;
  return clamp01(1 - Math.exp(-(Math.log(2) / halfLife) * age));
}

export function calculateW10(observations: number[], trust: number, priority: number): number {
  const averageObservation = observations.length > 0
    ? observations.reduce((sum, value) => sum + clamp01(value), 0) / observations.length
    : 0;
  return clamp01(averageObservation * clamp01(trust) * clamp01(priority));
}

export function resolveRegime(phiSfi: number): CanonicalRegime {
  const phi = clamp01(phiSfi);
  if (phi >= 0.58) return 'HOMEOSTATIC';
  if (phi <= 0.22) return 'ENTROPIC';
  return 'CRITICAL';
}

export function getCanonicalFormulaRegistry(): CanonicalFormulaDefinition[] {
  return [
    {
      id: 'phi_sfi',
      version: '2026-08-06.phi-sfi.v1',
      owner: 'MIHM',
      inputs: [
        { name: 'ihg', type: 'number' },
        { name: 'nti', type: 'number' },
        { name: 'ldi', type: 'number' },
        { name: 'xi', type: 'number' },
      ],
      output: { name: 'phi_sfi', type: 'number' },
      implementation: 'PHI_SFI = CLAMP01((IHG * NTI) / (1 + LDI) + XI)',
    },
    {
      id: 'f_s',
      version: '2026-08-06.phi-sfi.v1',
      owner: 'MIHM',
      inputs: [{ name: 'phi_sfi', type: 'number' }],
      output: { name: 'f_s', type: 'number' },
      implementation: 'F_S = CLAMP01(1 - PHI_SFI)',
    },
    {
      id: 'phi_h',
      version: '2026-08-06.phi-h.v1',
      owner: 'MOPH',
      inputs: [
        { name: 'ihg', type: 'number' },
        { name: 'nti', type: 'number' },
        { name: 'ldi', type: 'number' },
        { name: 'epsilon', type: 'number' },
        { name: 'go', type: 'number' },
      ],
      output: { name: 'phi_h', type: 'number' },
      implementation: 'PHI_H = CLAMP01(((1/(IHG+0.1)) * NTI * (1/(LDI+0.1)) + EPSILON - 0.15*GO) / 12)',
    },
    {
      id: 'c_field',
      version: '1.1',
      owner: 'MIHM',
      inputs: [
        { name: 'ihg', type: 'number' },
        { name: 'ldi', type: 'number' },
        { name: 'nti', type: 'number' },
      ],
      output: { name: 'c_field', type: 'number' },
      implementation: 'C_FIELD = CLAMP01(IHG * (1-LDI) * (1-0.35*NTI))',
    },
    {
      id: 'd_m',
      version: '1.0',
      owner: 'MEMORY',
      inputs: [
        { name: 'halfLife', type: 'number' },
        { name: 'age', type: 'number' },
      ],
      output: { name: 'd_m', type: 'number' },
      implementation: 'D_M = CLAMP01(1 - EXP(-(LN(2)/HALFLIFE)*AGE))',
    },
    {
      id: 'w_10',
      version: '1.0',
      owner: 'WORLDSPECT',
      inputs: [
        { name: 'observations', type: 'number[]' },
        { name: 'trust', type: 'number' },
        { name: 'priority', type: 'number' },
      ],
      output: { name: 'w_10', type: 'number' },
      implementation: 'W_10 = CLAMP01(AGGREGATE(OBSERVATIONS, TRUST, PRIORITY))',
    },
  ];
}
