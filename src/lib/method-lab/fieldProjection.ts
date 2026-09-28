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
