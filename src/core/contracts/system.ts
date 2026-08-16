import type { SfiCanonicalRef, SfiEpistemicClass } from './epistemic';

export const SFI_SYSTEM_CONTRACT = 'SFI-SYSTEM-CONTRACT-1.0' as const;
export const MIHM_DIMENSIONAL_TRANSFER_MODEL_V0 = 'MIHM-DIMENSIONAL-TRANSFER-MODEL-0' as const;

export type SfiSystemImplementationStatus =
  | 'FORMALIZED'
  | 'OPERATIONAL'
  | 'EXPERIMENTAL'
  | 'DECLARED'
  | 'NOT_IMPLEMENTED';

export type SfiSystemEntityKind =
  | 'NODE'
  | 'DIMENSION'
  | 'RELATION'
  | 'FLOW'
  | 'CONSTRAINT'
  | 'STATE'
  | 'FRICTION'
  | 'PERTURBATION'
  | 'TRAJECTORY'
  | 'ATTRACTOR'
  | 'TRANSITION'
  | 'EMERGENCE';

export type SfiSystemBoundaryV1 = {
  id: string;
  subjectRef: SfiCanonicalRef;
  includedRefs: SfiCanonicalRef[];
  excludedRefs: SfiCanonicalRef[];
  boundaryRule: string;
  assumptions: string[];
  limitations: string[];
  version: string;
};

export type SfiSystemModelV1 = {
  id: string;
  boundaryRef: SfiCanonicalRef;
  nodeRefs: SfiCanonicalRef[];
  dimensionRefs: SfiCanonicalRef[];
  relationRefs: SfiCanonicalRef[];
  flowRefs: SfiCanonicalRef[];
  constraintRefs: SfiCanonicalRef[];
  stateRefs: SfiCanonicalRef[];
  frictionRefs: SfiCanonicalRef[];
  perturbationRefs: SfiCanonicalRef[];
  trajectoryRefs: SfiCanonicalRef[];
  attractorRefs: SfiCanonicalRef[];
  transitionRefs: SfiCanonicalRef[];
  emergenceRefs: SfiCanonicalRef[];
  evidenceRefs: SfiCanonicalRef[];
  modelVersion: string;
  implementationStatus: SfiSystemImplementationStatus;
  uncertainty: number | null;
};

export type SfiDimensionalTransferV0 = {
  contract: typeof MIHM_DIMENSIONAL_TRANSFER_MODEL_V0;
  status: 'EXPERIMENTAL';
  sourceDimensionRef: SfiCanonicalRef;
  targetDimensionRef: SfiCanonicalRef;
  sourceObservable: string;
  targetObservable: string;
  magnitude: number | null;
  direction: string | null;
  lag: number | null;
  lagUnit: string | null;
  gain: number | null;
  attenuation: number | null;
  constraintRefs: SfiCanonicalRef[];
  contextRefs: SfiCanonicalRef[];
  uncertainty: number | null;
  epistemicClass: SfiEpistemicClass;
  evidenceRefs: SfiCanonicalRef[];
  conservationAssumed: false;
};

export const SFI_SYSTEM_INVARIANTS = {
  mihmRole: 'GENERAL_SYSTEMIC_FORMALISM',
  optimizationObjective: 'SYSTEMIC_VIABILITY_NOT_GLOBAL_OPTIMUM',
  dimensionalTransferIsCanonicalLaw: false,
  dimensionalTransferStatus: 'EXPERIMENTAL',
  conservationAcrossDimensionsAssumed: false,
  statement:
    'SFI models bounded systems through nodes, dimensions, relations, flows and constraints. Friction, perturbation, trajectory, attractor, transition and emergence require explicit lineage and implementation status.',
} as const;
