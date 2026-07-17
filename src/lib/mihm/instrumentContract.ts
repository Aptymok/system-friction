export type MihmInstrumentType =
  | 'PERSONAL'
  | 'SYSTEMIC'
  | 'PHENOMENOLOGICAL'
  | 'WORLD'
  | 'EVIDENCE_ONLY';

export type HomeostaticSymbol =
  | 'PHI_PERSONAL'
  | 'PHI_SYSTEMIC'
  | 'PHI_PHENOMENOLOGICAL'
  | 'PHI_WORLD';

export const HOMEOSTATIC_SYMBOL_BY_TYPE: Record<Exclude<MihmInstrumentType, 'EVIDENCE_ONLY'>, HomeostaticSymbol> = {
  PERSONAL: 'PHI_PERSONAL',
  SYSTEMIC: 'PHI_SYSTEMIC',
  PHENOMENOLOGICAL: 'PHI_PHENOMENOLOGICAL',
  WORLD: 'PHI_WORLD',
};

export const HOMEOSTATIC_SYMBOL_LABEL: Record<HomeostaticSymbol, string> = {
  PHI_PERSONAL: 'Phi personal',
  PHI_SYSTEMIC: 'Phi systemic',
  PHI_PHENOMENOLOGICAL: 'Phi phenomenological',
  PHI_WORLD: 'Phi world',
};

export type MihmTrajectoryDirection =
  | 'DEEPENING'
  | 'EXPANSION'
  | 'FRAGMENTATION'
  | 'CONVERGENCE'
  | 'INSTITUTIONALIZATION'
  | 'DEGRADATION'
  | 'ABSTRACTION'
  | 'OPERATIONALIZATION';

export type MihmVariableReading = {
  key: string;
  value: number | null;
  scale: '0-1' | '0-5' | string;
};

export type MihmTrajectory = {
  direction: MihmTrajectoryDirection | null;
  confidence: string | null;
};

export type MihmPrediction = {
  statement: string | null;
  confidence: number | null;
  horizon: string | null;
};

export type MihmHomeostaticState = {
  symbol: HomeostaticSymbol;
  label: string;
  value: number | null;
  formulaRef: string;
};

export type MihmInstrumentState = {
  instrument: 'MOP-H' | 'SCOREFRICTION' | 'PPOI' | 'SMLI-P' | 'WORLD_VECTOR' | (string & {});
  instrumentType: MihmInstrumentType;
  objectId: string;
  variables: MihmVariableReading[];
  homeostaticState: MihmHomeostaticState | null;
  confidence: number | null;
  trajectory: MihmTrajectory | null;
  prediction: MihmPrediction | null;
  observedAt: string;
  warnings: string[];
};
