export const CPRT_B_PATH_VERSION = 'SFI-CT-CPRT-B-PATH-1.0' as const;

export type CprtBGovernanceDisposition =
  | 'DESIGN_APPROVED'
  | 'REJECTED'
  | 'FROZEN'
  | 'WAITING_EVIDENCE'
  | 'MISSING';

export type CprtBPathInput = {
  run: {
    runId: string;
    snapshotId: string;
    snapshotHash: string;
    snapshotHashValid: boolean;
    snapshotConsumed: boolean;
  };
  proposal: {
    proposalId: string;
    sourceRunId: string;
    sourceSnapshotHash: string;
    proposalEventId: string | null;
  } | null;
  governance: {
    disposition: CprtBGovernanceDisposition;
    rootActionRef: string | null;
  };
  field: {
    caseId: string;
    linkedProposalId: string;
    interventionRef: string | null;
    executionAcknowledgementRef: string | null;
    executionEpistemicClass: string | null;
    returnRef: string | null;
    outcomeRef: string | null;
    returnObserved: boolean;
  } | null;
  resultingState: {
    memoryRef: string | null;
    transitionRef: string | null;
    transitionHash: string | null;
    transitionHashValid: boolean;
    transitionAdmitsMemory: boolean;
  } | null;
};

export type CprtBPathAssessment = {
  contractVersion: typeof CPRT_B_PATH_VERSION;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  assertions: {
    snapshotIntegrity: boolean;
    snapshotConsumed: boolean;
    proposalLineage: boolean;
    rootGovernance: boolean;
    interventionProvenance: boolean | 'NOT_APPLICABLE';
    returnProvenance: boolean | 'NOT_APPLICABLE';
    resultingStateTransition: boolean;
  };
  gaps: string[];
};

export function assessCprtBPath(input: CprtBPathInput): CprtBPathAssessment {
  const gaps: string[] = [];
  const snapshotIntegrity = input.run.snapshotHashValid;
  const snapshotConsumed = input.run.snapshotConsumed;
  if (!snapshotIntegrity) gaps.push('snapshot_hash_invalid');
  if (!snapshotConsumed) gaps.push('snapshot_not_consumed');

  const proposalLineage = Boolean(
    input.proposal
      && input.proposal.sourceRunId === input.run.runId
      && input.proposal.sourceSnapshotHash === input.run.snapshotHash,
  );
  if (!proposalLineage) gaps.push('proposal_lineage_missing_or_invalid');

  const rootGovernance = input.governance.disposition !== 'MISSING'
    && Boolean(input.governance.rootActionRef);
  if (!rootGovernance) gaps.push('root_governance_missing');

  const noInterventionExpected = input.governance.disposition === 'REJECTED'
    || input.governance.disposition === 'FROZEN';

  let interventionProvenance: boolean | 'NOT_APPLICABLE';
  let returnProvenance: boolean | 'NOT_APPLICABLE';

  if (noInterventionExpected) {
    interventionProvenance = 'NOT_APPLICABLE';
    returnProvenance = 'NOT_APPLICABLE';
  } else {
    interventionProvenance = Boolean(
      input.field
        && input.proposal
        && input.field.linkedProposalId === input.proposal.proposalId
        && input.field.interventionRef
        && input.field.executionAcknowledgementRef
        && input.field.executionEpistemicClass === 'DECLARED',
    );
    if (!interventionProvenance) gaps.push('explicit_intervention_execution_provenance_missing');

    returnProvenance = Boolean(
      input.field
        && input.field.returnObserved
        && input.field.returnRef
        && input.field.outcomeRef,
    );
    if (!returnProvenance) gaps.push('observed_return_provenance_missing');
  }

  const resultingStateTransition = Boolean(
    input.resultingState
      && input.resultingState.memoryRef
      && input.resultingState.transitionRef
      && input.resultingState.transitionHash
      && input.resultingState.transitionHashValid
      && input.resultingState.transitionAdmitsMemory,
  );
  if (!resultingStateTransition) gaps.push('resulting_state_transition_missing');

  const hardFailure = !snapshotIntegrity;
  const status = hardFailure
    ? 'FAIL'
    : gaps.length === 0
      ? 'PASS'
      : 'PARTIAL';

  return {
    contractVersion: CPRT_B_PATH_VERSION,
    status,
    assertions: {
      snapshotIntegrity,
      snapshotConsumed,
      proposalLineage,
      rootGovernance,
      interventionProvenance,
      returnProvenance,
      resultingStateTransition,
    },
    gaps: [...new Set(gaps)],
  };
}
