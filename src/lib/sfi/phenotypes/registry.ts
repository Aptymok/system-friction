import type { SfiPhenotypeRegistryEntry } from './types';

const REQUIRED_BEFORE_USE: SfiPhenotypeRegistryEntry['required_before_use'] = [
  'EP_estado',
  'SSP',
  'evidence source',
  'timestamp',
  'operator note',
];

export const SFI_PHENOTYPE_REGISTRY: SfiPhenotypeRegistryEntry[] = [
  {
    id: 'FP-001',
    label: 'Observer Ahead',
    signature: 'The observer moves ahead of the field and compresses uncertainty before evidence can return.',
    evidence_state: 'proposed',
    use: 'Hypothesis support only.',
    do_not: 'Do not convert pattern into identity, blame, pathology or diagnosis.',
    required_before_use: REQUIRED_BEFORE_USE,
  },
  {
    id: 'FP-002',
    label: 'Trajectory Diminished',
    signature: 'A viable trajectory loses range, timing or declared intensity after contact with field friction.',
    evidence_state: 'proposed',
    use: 'Hypothesis support only.',
    do_not: 'Do not convert pattern into identity, blame, pathology or diagnosis.',
    required_before_use: REQUIRED_BEFORE_USE,
  },
  {
    id: 'FP-003',
    label: 'Affective Control Fixation',
    signature: 'Affect becomes the control surface and displaces proportional observation or task selection.',
    evidence_state: 'proposed',
    use: 'Hypothesis support only.',
    do_not: 'Do not convert pattern into identity, blame, pathology or diagnosis.',
    required_before_use: REQUIRED_BEFORE_USE,
  },
  {
    id: 'FP-004',
    label: 'Narrative Displacement',
    signature: 'Narrative coherence moves faster than evidence and redirects attention away from the observable conflict.',
    evidence_state: 'proposed',
    use: 'Hypothesis support only.',
    do_not: 'Do not convert pattern into identity, blame, pathology or diagnosis.',
    required_before_use: REQUIRED_BEFORE_USE,
  },
  {
    id: 'FP-005',
    label: 'Execution Gap',
    signature: 'Declared intent and executable next action diverge despite available context or stated priority.',
    evidence_state: 'proposed',
    use: 'Hypothesis support only.',
    do_not: 'Do not convert pattern into identity, blame, pathology or diagnosis.',
    required_before_use: REQUIRED_BEFORE_USE,
  },
  {
    id: 'FP-006',
    label: 'Field Saturation',
    signature: 'Signal density exceeds operator or participant capacity and weakens return quality.',
    evidence_state: 'proposed',
    use: 'Hypothesis support only.',
    do_not: 'Do not convert pattern into identity, blame, pathology or diagnosis.',
    required_before_use: REQUIRED_BEFORE_USE,
  },
];

export const SFI_PHENOTYPE_REGISTRY_BOUNDARY = {
  purpose: [
    'structure hypotheses',
    'guide what to observe',
    'prevent unsupported inference',
    'suggest proportional perturbation families',
    'compare longitudinal outcomes',
    'support Prediction Registry entries',
    'support future Atlas classification',
  ],
  not: [
    'identity labels',
    'diagnoses',
    'psychological categories',
    'public claims',
    'automatic protocol mutation',
  ],
};

export function getSfiPhenotypeRegistry() {
  return SFI_PHENOTYPE_REGISTRY;
}
