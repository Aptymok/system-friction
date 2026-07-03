import type { ScoreFrictionEvaluationContract } from './evaluationContract';

export type ScoreFrictionPredictionDraft = {
  hypothesis_id: string;
  statement: string;
  prediction: string;
  verification_window: '72h' | '7d' | '30d' | '90d';
  expected_change: string;
  required_evidence: string[];
  falsification_condition: string;
  root_approval_required: boolean;
  persistence: 'draft_not_persisted';
  case_id: string | null;
  scorefriction_observation_id: string | null;
  evidence_hash: string | null;
  substrate_kind: ScoreFrictionEvaluationContract['substrate']['kind'];
  metrics: ScoreFrictionEvaluationContract['metrics'];
  indices: ScoreFrictionEvaluationContract['indices'];
  domains: ScoreFrictionEvaluationContract['domains'];
};

function compactId(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'SCOREFRICTION';
}

function verificationWindow(contract: ScoreFrictionEvaluationContract): ScoreFrictionPredictionDraft['verification_window'] {
  if (contract.indices.includes('MOPH_score')) return '72h';
  if (contract.indices.includes('WSV') || contract.domains.includes('memetic')) return '7d';
  if (contract.domains.includes('institutional') || contract.indices.includes('R18')) return '30d';
  return '7d';
}

function evidenceFor(contract: ScoreFrictionEvaluationContract) {
  const evidence = new Set<string>();
  evidence.add('substrate_evaluation_payload');
  evidence.add('metric_values_before_after');

  if (contract.substrate.kind === 'multimodal') evidence.add('modality_alignment_trace');
  if (contract.indices.includes('MOPH_score')) evidence.add('operational_result_72h');
  if (contract.indices.includes('WSV')) evidence.add('world_vector_followup_snapshot');
  if (contract.domains.includes('memetic') || contract.domains.includes('tech')) evidence.add('platform_signal_followup');
  if (contract.domains.includes('institutional')) evidence.add('authorization_or_decision_trace');
  if (contract.domains.includes('economy')) evidence.add('margin_demand_or_cost_trace');

  return [...evidence];
}

export function buildScoreFrictionPredictionDraft(input: {
  contract: ScoreFrictionEvaluationContract;
  objectLabel?: string | null;
  declaredIntent?: string | null;
  caseId?: string | null;
  scorefrictionObservationId?: string | null;
  evidenceHash?: string | null;
}): ScoreFrictionPredictionDraft {
  const label = input.objectLabel?.trim() || `${input.contract.substrate.kind}_substrate`;
  const window = verificationWindow(input.contract);
  const domains = input.contract.domains.slice(0, 4).join(', ') || 'undetermined_domain';
  const indices = input.contract.indices.slice(0, 4).join(', ') || 'undetermined_index';
  const intent = input.declaredIntent?.trim() || 'no declared intent supplied';

  return {
    hypothesis_id: `HYP-SF-${compactId(label)}-${Date.now().toString(36).toUpperCase()}`,
    statement: `${label} is expected to express measurable friction through ${indices} across ${domains}.`,
    prediction: `If the declared intent (${intent}) remains active, the next ${window} should produce observable evidence in the required evidence set before any calibration is proposed.`,
    verification_window: window,
    expected_change: `movement in ${indices} with traceable evidence from ${input.contract.substrate.kind}`,
    required_evidence: evidenceFor(input.contract),
    falsification_condition: 'No observable evidence appears in the verification window, or the observed movement contradicts the declared substrate and cluster mapping.',
    root_approval_required: true,
    persistence: 'draft_not_persisted',
    case_id: input.caseId?.trim() || null,
    scorefriction_observation_id: input.scorefrictionObservationId?.trim() || null,
    evidence_hash: input.evidenceHash?.trim() || null,
    substrate_kind: input.contract.substrate.kind,
    metrics: input.contract.metrics,
    indices: input.contract.indices,
    domains: input.contract.domains,
  };
}
