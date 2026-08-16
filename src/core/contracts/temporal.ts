export const SFI_TEMPORAL_CONTRACT = 'SFI-TEMPORAL-CONTRACT-1.0' as const;

export type SfiTemporalMode =
  | 'CROSS_SECTIONAL'
  | 'LONGITUDINAL'
  | 'RETROLONGITUDINAL'
  | 'COUNTERFACTUAL'
  | 'PROJECTIVE';

export type SfiTemporalBasis =
  | 'OBSERVED_TIME'
  | 'RECONSTRUCTED_TIME'
  | 'SIMULATED_TIME'
  | 'PROJECTED_TIME';

export type SfiTemporalWindowV1 = {
  mode: SfiTemporalMode;
  basis: SfiTemporalBasis;
  start: string | null;
  end: string | null;
  cutoff: string;
  timezone: string;
  reconstructionAsOf?: string | null;
  horizon?: string | null;
};

export type SfiTemporalStateRef = {
  stateRef: string;
  observedAt: string | null;
  reconstructedAt: string | null;
  basis: SfiTemporalBasis;
};

export const SFI_TEMPORAL_INVARIANTS = {
  reconstructedEqualsObserved: false,
  simulatedEqualsObserved: false,
  projectedEqualsObserved: false,
  temporalCutoffRequired: true,
  statement:
    'Observed, reconstructed, simulated and projected time are separate temporal bases. Every longitudinal or reconstructed operation preserves a cutoff sufficient to reproduce what was knowable at execution time.',
} as const;
