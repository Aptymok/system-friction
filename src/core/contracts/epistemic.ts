export const SFI_EPISTEMIC_CONTRACT = 'SFI-EPISTEMIC-CONTRACT-1.0' as const;

export type SfiEpistemicClass =
  | 'SOURCE'
  | 'RECORD'
  | 'EVIDENCE'
  | 'EPISTEMIC_ASSESSMENT'
  | 'INFERENCE'
  | 'SIMULATION'
  | 'PROJECTION'
  | 'COGNITIVE_STATE'
  | 'COGNITIVE_EXECUTION'
  | 'GOVERNANCE_DECISION'
  | 'TRUTH_CLAIM';

export type SfiDeterminability =
  | 'DETERMINED'
  | 'PARTIALLY_DETERMINED'
  | 'UNDETERMINED';

export type SfiCanonicalRef = {
  id: string;
  version?: string | null;
  hash?: string | null;
};

export type SfiEpistemicAssessmentV1 = {
  id: string;
  subjectRef: SfiCanonicalRef;
  classification: SfiEpistemicClass;
  determinability: SfiDeterminability;
  confidence: number | null;
  sourceRefs: SfiCanonicalRef[];
  recordRefs: SfiCanonicalRef[];
  evidenceRefs: SfiCanonicalRef[];
  contradictionRefs: SfiCanonicalRef[];
  invalidationRefs: SfiCanonicalRef[];
  assessedBy: string;
  assessedAt: string;
  rationale: string;
};

export const SFI_EPISTEMIC_INVARIANTS = {
  recordEqualsEvidence: false,
  evidenceEqualsAssessment: false,
  assessmentEqualsCognitiveState: false,
  cognitiveStateEqualsExecution: false,
  governanceEqualsTruth: false,
  canonicalRecordEqualsReality: false,
  derivationUpgradesIndependence: false,
  repeatedReferenceCreatesCorroboration: false,
  truthAuthorityGrantedByContract: false,
  statement:
    'SOURCE, RECORD, EVIDENCE, EPISTEMIC ASSESSMENT, COGNITIVE STATE, EXECUTION, GOVERNANCE and TRUTH remain distinct. Lineage may connect them but never collapses their epistemic roles.',
} as const;
