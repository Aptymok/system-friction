export type SfiPhenotypeEvidenceState = 'proposed';

export interface SfiPhenotypeRegistryEntry {
  id: string;
  label: string;
  signature: string;
  evidence_state: SfiPhenotypeEvidenceState;
  use: 'Hypothesis support only.';
  do_not: 'Do not convert pattern into identity, blame, pathology or diagnosis.';
  required_before_use: [
    'EP_estado',
    'SSP',
    'evidence source',
    'timestamp',
    'operator note',
  ];
}
