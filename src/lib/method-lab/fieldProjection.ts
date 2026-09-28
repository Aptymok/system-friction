import type { MethodLabProtocolId } from './contracts';

export const METHOD_LAB_FIELD_PROJECTION_CONTRACT = 'SFI-METHOD-LAB-FIELD-PROJECTION-1.0' as const;

export type FieldProjectionInput = {
  protocolId: MethodLabProtocolId | null;
  relationCount: number;
  evidenceBoundRelationCount: number;
  observedWeightDelta: number | null;
  relationSupportRatio: number | null;
  provenanceCoverage: number | null;
  fieldReorganizationState: 'UNCHANGED' | 'CONTRAST_RECORDED' | 'LEARNING_QUARANTINED' | 'LEARNING_PROMOTED';
};

export type FieldProjectionDecision = {
  contractVersion: typeof METHOD_LAB_FIELD_PROJECTION_CONTRACT;
  decision: 'ABSTAIN' | 'SIMULATED_PROJECTION';
  epistemicClass: 'SIMULATED';
  protocolId: MethodLabProtocolId | null;
  assumptions: string[];
  limitations: string[];
  displacement: { x: number; y: number } | null;
  reason: string;
};

const ADMISSIBLE_FIELD_PROTOCOLS: MethodLabProtocolId[] = ['sociotechnical_simulation', 'economic_simulation'];

export type FieldProtocolProposalInput = {
  declaredProtocolId?: MethodLabProtocolId | null;
  primaryMethodId?: 'MOP_H' | 'SCOREFRICTION' | 'WORLD_VECTOR' | 'PPOI' | 'SFI_INSTITUTIONAL' | null;
  evidenceModalities?: string[];
  worldContextRequested?: boolean;
  requiresTrajectory?: boolean;
  requiresRivalHypothesis?: boolean;
  requiresInterventionTracking?: boolean;
  relationCount: number;
  evidenceBoundRelationCount: number;
  temporalStructureObserved: boolean;
  relationTransition: boolean;
  weightChangeObserved: boolean;
};

export type FieldProtocolProposal = {
  status: 'DECLARED' | 'PROPOSED' | 'ABSTAIN';
  protocolId: MethodLabProtocolId | null;
  epistemicClass: 'DECLARED' | 'DERIVED';
  reasons: string[];
  assumptionsToCheck: string[];
};

export function proposeMethodLabFieldProtocol(input: FieldProtocolProposalInput): FieldProtocolProposal {
  if (input.declaredProtocolId) {
    return { status: 'DECLARED', protocolId: input.declaredProtocolId, epistemicClass: 'DECLARED', reasons: ['CANONICAL_OBJECT_DECLARED_PROTOCOL'], assumptionsToCheck: ['Protocol declaration is current for the bounded observation question.'] };
  }
  if (input.relationCount < 1 || input.evidenceBoundRelationCount < 1) {
    return { status: 'ABSTAIN', protocolId: null, epistemicClass: 'DERIVED', reasons: ['RELATIONAL_EVIDENCE_REQUIRED'], assumptionsToCheck: [] };
  }

  const modalities = new Set(input.evidenceModalities ?? []);
  const economicEvidence = modalities.has('DATASET') && input.worldContextRequested === true && input.primaryMethodId === 'WORLD_VECTOR';
  if (economicEvidence) {
    return {
      status: 'PROPOSED',
      protocolId: 'economic_simulation',
      epistemicClass: 'DERIVED',
      reasons: ['WORLD_CONTEXT_WITH_DATASET_EVIDENCE'],
      assumptionsToCheck: ['Economic observables and units are explicitly defined.','Historical/context windows are comparable.','Projection remains SIMULATED until later RETURN.'],
    };
  }

  const relationalQuestion = input.primaryMethodId === 'PPOI'
    && (input.requiresTrajectory || input.requiresRivalHypothesis || input.requiresInterventionTracking)
    && (input.temporalStructureObserved || input.relationTransition || input.weightChangeObserved);
  if (relationalQuestion) {
    return {
      status: 'PROPOSED',
      protocolId: 'sociotechnical_simulation',
      epistemicClass: 'DERIVED',
      reasons: ['PPOI_RELATIONAL_TEMPORAL_QUESTION'],
      assumptionsToCheck: ['Relation states refer to the same bounded system.','Temporal resolution is sufficient for the proposed comparison.','Simulation output cannot inherit OBSERVED or authorize external action.'],
    };
  }

  return { status: 'ABSTAIN', protocolId: null, epistemicClass: 'DERIVED', reasons: ['NO_COMPATIBLE_FIELD_PROTOCOL_FROM_OBSERVED_NEEDS'], assumptionsToCheck: [] };
}

export function resolveMethodLabFieldProjection(input: FieldProjectionInput): FieldProjectionDecision {
  const base = { contractVersion: METHOD_LAB_FIELD_PROJECTION_CONTRACT, epistemicClass: 'SIMULATED' as const, protocolId: input.protocolId };
  if (input.fieldReorganizationState === 'UNCHANGED') return { ...base, decision: 'ABSTAIN', assumptions: [], limitations: [], displacement: null, reason: 'NO_GOVERNED_REORGANIZATION_STATE' };
  if (!input.protocolId || !ADMISSIBLE_FIELD_PROTOCOLS.includes(input.protocolId)) return { ...base, decision: 'ABSTAIN', assumptions: [], limitations: ['No registered Method Lab field-simulation protocol was selected for this object.'], displacement: null, reason: 'FIELD_PROTOCOL_REQUIRED' };
  if (input.relationCount < 1 || input.evidenceBoundRelationCount < 1 || input.provenanceCoverage === null) return { ...base, decision: 'ABSTAIN', assumptions: [], limitations: ['Projection requires at least one evidence-bound canonical relation with observable provenance coverage.'], displacement: null, reason: 'RELATIONAL_EVIDENCE_INSUFFICIENT' };
  if (input.observedWeightDelta === null && input.relationSupportRatio === null) return { ...base, decision: 'ABSTAIN', assumptions: [], limitations: ['No comparable relation-weight delta or classified support balance is available.'], displacement: null, reason: 'COMPARABLE_RELATION_STATE_REQUIRED' };

  const support = input.relationSupportRatio;
  const direction = support === null || support === 0.5 ? 0 : support > 0.5 ? 1 : -1;
  if (direction === 0) return { ...base, decision: 'ABSTAIN', assumptions: ['Relation support classifications are comparable within the selected field boundary.'], limitations: ['Balanced or unknown support does not justify a directional field displacement.'], displacement: null, reason: 'DIRECTION_UNRESOLVED' };

  const delta = Math.min(1, Math.max(0, input.observedWeightDelta ?? 0));
  const provenance = Math.min(1, Math.max(0, input.provenanceCoverage ?? 0));
  const magnitude = Math.min(1, 0.6 * delta + 0.4 * provenance);
  return {
    ...base,
    decision: 'SIMULATED_PROJECTION',
    assumptions: ['Relation weights are comparable across the declared observation boundary.','Relation support classifications refer to the same bounded object and temporal resolution.','Provenance coverage is a traceability measure, not causal strength.'],
    limitations: ['Displacement is a Method Lab simulation for representation; it is not an observed force, causal effect, attractor, regime change or canonical coordinate.','ROOT review is required before any stronger interpretation or promotion.'],
    displacement: { x: direction * magnitude, y: magnitude },
    reason: 'BOUNDED_RELATIONAL_PROJECTION_AVAILABLE',
  };
}
