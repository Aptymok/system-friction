export type MihmMetricKey = 'ihg' | 'nti' | 'ldi' | 'phi';

export type MihmRegime = 'stable' | 'watch' | 'critical' | 'unknown';

export type MihmVector = {
  ihg: number;
  nti: number;
  ldi: number;
  phi?: number;
};

export type MihmComputationInput = {
  observedAt: string;
  sourceIds: string[];
  vector: MihmVector;
};

export type MihmComputationResult = {
  regime: MihmRegime;
  vector: MihmVector;
  confidence: number;
  warnings: string[];
};

