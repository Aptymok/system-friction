import { SFI_AI_GOVERNANCE_POLICY } from '@/lib/governance/aiGovernancePolicy';
import { SFI_ROOT_DECISION_BOUNDARY } from '@/lib/governance/rootDecisionBoundary';

export const SFI_CASE_EXECUTION_POLICY = {
  contract: 'SFI-CASE-EXECUTION-POLICY-1.0',
  purpose: 'Allow an authorized SFI client to complete ordinary case work without turning the founder into a routing, evidence-review, confirmation or closure operator.',
  defaultMode: 'AUTONOMOUS_UNTIL_SOVEREIGN_BOUNDARY',
  approvals: {
    initialApprovalRequired: false,
    routineWorkApprovalRequired: false,
    evidenceSourceApprovalRequired: false,
    methodSelectionApprovalRequired: false,
    modelSelectionApprovalRequired: false,
    internalExperimentApprovalRequired: false,
    reportApprovalRequired: false,
    caseClosureApprovalRequired: false,
  },
  caseFlow: [
    'INTAKE_AND_RECONSTRUCTION',
    'EVIDENCE_ACQUISITION_AND_CLASSIFICATION',
    'OBSERVATION_AND_MISSINGNESS',
    'HYPOTHESIS_AND_RIVALS',
    'METHOD_AND_CAPABILITY_SELECTION',
    'BOUNDED_INTERNAL_ANALYSIS_OR_EXPERIMENT',
    'RESULT_AND_RETURN',
    'CONTRAST_AND_CALIBRATION',
    'OPERATIONAL_CLOSURE',
  ],
  operationalRule: 'If the next step is operational work inside already granted authority, continue. Do not ask the human to approve the step and do not create a sovereign proposal merely to authorize routine analysis.',
  evidenceRule: 'SFI may acquire, rank, classify and use traceable sources as working case inputs without ROOT acceptance. A working source is not automatically a verified claim, canonical evidence or institutional truth.',
  missingInputRule: 'Ask the human only for a genuinely missing fact, source or choice that cannot be acquired or inferred safely. Present that request as missing information, never as permission to continue.',
  sovereignBoundary: {
    rootDecisionClasses: SFI_ROOT_DECISION_BOUNDARY.rootDecisionClasses,
    reservedExternalOperations: SFI_AI_GOVERNANCE_POLICY.reservedExternalOperations,
    rule: 'Interrupt ROOT only when the next step would create or change institutional canon, materially add/change institutional capability, promote learning into institutional memory, or perform a reserved external/irreversible operation.',
  },
  presentation: {
    defaultAudience: 'HUMAN',
    rule: 'Explain what is happening, why it matters, whether the human must act, and what happens next. Hide machine identifiers and implementation detail unless explicitly requested or necessary for a materially accurate authority/safety decision.',
  },
} as const;

export type SfiCaseExecutionPolicy = typeof SFI_CASE_EXECUTION_POLICY;
