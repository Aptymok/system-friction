import type {
  MihmPhiEpistemicStatus,
  MihmPhiSemanticRole,
  MihmPhiSymbol,
} from './phiContract';

export type MihmInstrumentType =
  | 'PERSONAL'
  | 'SYSTEMIC'
  | 'PHENOMENOLOGICAL'
  | 'WORLD'
  | 'INSTITUTIONAL'
  | 'EVIDENCE_ONLY';

export type HomeostaticSymbol = MihmPhiSymbol;

export const HOMEOSTATIC_SYMBOL_BY_TYPE: Record<Exclude<MihmInstrumentType, 'EVIDENCE_ONLY'>, HomeostaticSymbol> = {
  PERSONAL: 'PHI_H',
  SYSTEMIC: 'PHI_S',
  PHENOMENOLOGICAL: 'PHI_F',
  WORLD: 'PHI_W',
  INSTITUTIONAL: 'PHI_SFI',
};

export const HOMEOSTATIC_SYMBOL_LABEL: Record<HomeostaticSymbol, string> = {
  PHI_H: 'Φ_H · humano/sesión',
  PHI_S: 'Φ_S · sistema/objeto',
  PHI_F: 'Φ_F · fenómeno',
  PHI_W: 'Φ_W · contexto mundial',
  PHI_SFI: 'Φ_SFI · institución',
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
  scale: '0-1';
  semanticRole: MihmPhiSemanticRole;
  formulaRef: string;
  formulaVersion: string;
  epistemicStatus: MihmPhiEpistemicStatus;
};

export type MihmInstrumentState = {
  instrument: 'MOP-H' | 'SCOREFRICTION' | 'PPOI' | 'SMLI-P' | 'WORLD_VECTOR' | 'SFI_INSTITUTIONAL' | (string & {});
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
