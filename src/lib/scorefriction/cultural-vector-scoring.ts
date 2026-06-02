import type { CulturalRegime } from './cultural-vector-contract';

export function computeCulturalVector(input: {
  LCP: number;
  PAC: number;
  VFE: number;
  SCR: number;
  FS_C: number;
  CRM_C: number;
}): { cvphi: number; regime: CulturalRegime } {
  const cvphi =
    ((input.PAC * input.LCP * input.CRM_C) / (1 + input.FS_C)) +
    input.VFE * 0.12 -
    (input.SCR > 0.82 ? 0.08 : 0);

  const bounded = Math.max(0, Math.min(1, cvphi));

  let regime: CulturalRegime = 'Latente';

  if (input.FS_C > 0.72 && input.SCR > 0.75) {
    regime = 'Saturado';
  } else if (input.PAC > 0.7 && input.LCP > 0.65) {
    regime = 'Cristalizando';
  } else if (input.LCP > 0.55) {
    regime = 'Proto-crítico';
  }

  return { cvphi: bounded, regime };
}
