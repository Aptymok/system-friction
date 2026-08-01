export interface CanonicalFormulaDefinition {
  id: string;
  version: string;
  owner: 'SFI' | 'MIHM' | 'MOPH' | 'MEMORY' | 'WORLDSPECT';
  inputs: Array<{ name: string; type: string; description?: string }>;
  output: { name: string; type: string; description?: string };
  implementation: string;
}

export type CanonicalRegime = 'HOMEOSTATIC' | 'TRANSITION' | 'CRITICAL';

export function calculatePhiSfi(ihg: number, nti: number, ldi: number, xi: number): number {
  return (ihg * nti) / (1 + ldi) + xi;
}

export function calculateFS(phiSfi: number): number {
  return 1 - phiSfi;
}

export function calculatePsiMoph(ihg: number, nti: number, ldi: number, epsilon: number, go: number): number {
  return ((1 / (ihg + 0.1)) * nti * (1 / (ldi + 0.1)) + epsilon - 0.15 * go) / 12;
}

export function calculateCField(ihg: number, ldi: number, nti: number): number {
  return ihg * (1 - ldi) * (1 - 0.35 * nti);
}

export function calculateDM(halfLife: number, age: number): number {
  return 1 - Math.exp(-(Math.log(2) / halfLife) * age);
}

export function calculateW10(observations: number[], trust: number, priority: number): number {
  const averageObservation = observations.length > 0 ? observations.reduce((sum, value) => sum + value, 0) / observations.length : 0;
  return averageObservation * trust * priority;
}

export function resolveRegime(phiSfi: number): CanonicalRegime {
  if (phiSfi > 0.6) return 'HOMEOSTATIC';
  if (phiSfi > 0.3) return 'TRANSITION';
  return 'CRITICAL';
}

export function getCanonicalFormulaRegistry(): CanonicalFormulaDefinition[] {
  return [
    {
      id: 'phi_sfi',
      version: '1.0',
      owner: 'MIHM',
      inputs: [
        { name: 'ihg', type: 'number' },
        { name: 'nti', type: 'number' },
        { name: 'ldi', type: 'number' },
        { name: 'xi', type: 'number' },
      ],
      output: { name: 'phi_sfi', type: 'number' },
      implementation: 'PHI_SFI = (IHG * NTI) / (1 + LDI) + XI',
    },
    {
      id: 'f_s',
      version: '1.0',
      owner: 'MIHM',
      inputs: [{ name: 'phi_sfi', type: 'number' }],
      output: { name: 'f_s', type: 'number' },
      implementation: 'F_S = 1 - PHI_SFI',
    },
    {
      id: 'psi_moph',
      version: '1.0',
      owner: 'MOPH',
      inputs: [
        { name: 'ihg', type: 'number' },
        { name: 'nti', type: 'number' },
        { name: 'ldi', type: 'number' },
        { name: 'epsilon', type: 'number' },
        { name: 'go', type: 'number' },
      ],
      output: { name: 'psi_moph', type: 'number' },
      implementation: 'PSI_MOPH = ((1/(IHG+0.1)) * NTI * (1/(LDI+0.1)) + EPSILON - 0.15*GO) / 12',
    },
    {
      id: 'c_field',
      version: '1.0',
      owner: 'MIHM',
      inputs: [
        { name: 'ihg', type: 'number' },
        { name: 'ldi', type: 'number' },
        { name: 'nti', type: 'number' },
      ],
      output: { name: 'c_field', type: 'number' },
      implementation: 'C_FIELD = IHG * (1-LDI) * (1-0.35*NTI)',
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
      implementation: 'D_M = 1 - EXP(-(LN(2)/HALFLIFE)*AGE)',
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
      implementation: 'W_10 = AGGREGATE(OBSERVATIONS, TRUST, PRIORITY)',
    },
  ];
}
