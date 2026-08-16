import assert from 'node:assert/strict';
import test from 'node:test';

import { assessCprtBPath, type CprtBPathInput } from './cprtBPath';

function completePath(): CprtBPathInput {
  return {
    run: {
      runId: 'RUN-001',
      snapshotId: 'CT-v143',
      snapshotHash: 'a'.repeat(64),
      snapshotHashValid: true,
      snapshotConsumed: true,
    },
    proposal: {
      proposalId: 'PROPOSAL-001',
      sourceRunId: 'RUN-001',
      sourceSnapshotHash: 'a'.repeat(64),
      proposalEventId: 'EV-PROPOSAL-001',
    },
    governance: {
      disposition: 'DESIGN_APPROVED',
      rootActionRef: 'EV-ROOT-001',
    },
    field: {
      caseId: 'FIELD-001',
      linkedProposalId: 'PROPOSAL-001',
      interventionRef: 'INT-001',
      executionAcknowledgementRef: 'FIELD-EVID-EXEC-001',
      executionEpistemicClass: 'DECLARED',
      returnRef: 'RETURN-001',
      outcomeRef: 'OUTCOME-001',
      returnObserved: true,
    },
    resultingState: {
      memoryRef: 'sfi_amv_memory:MEM-RETURN-001',
      transitionRef: 'CT-TR-001',
      transitionHash: 'b'.repeat(64),
      transitionHashValid: true,
      transitionAdmitsMemory: true,
    },
  };
}

test('CPRT-B full path passes only with complete provenance through resulting state', () => {
  const result = assessCprtBPath(completePath());
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.gaps, []);
  assert.equal(result.assertions.interventionProvenance, true);
  assert.equal(result.assertions.returnProvenance, true);
  assert.equal(result.assertions.resultingStateTransition, true);
});

test('CPRT-B does not infer intervention execution from a later return', () => {
  const path = completePath();
  if (!path.field) throw new Error('fixture field missing');
  path.field.executionAcknowledgementRef = null;

  const result = assessCprtBPath(path);
  assert.equal(result.status, 'PARTIAL');
  assert.ok(result.gaps.includes('explicit_intervention_execution_provenance_missing'));
  assert.equal(result.assertions.returnProvenance, true);
});

test('CPRT-B rejects proposal lineage that points at another snapshot', () => {
  const path = completePath();
  if (!path.proposal) throw new Error('fixture proposal missing');
  path.proposal.sourceSnapshotHash = 'c'.repeat(64);

  const result = assessCprtBPath(path);
  assert.equal(result.status, 'PARTIAL');
  assert.ok(result.gaps.includes('proposal_lineage_missing_or_invalid'));
});

test('CPRT-B treats rejected governance as a non-intervention path, not a fabricated execution gap', () => {
  const path = completePath();
  path.governance = {
    disposition: 'REJECTED',
    rootActionRef: 'EV-ROOT-REJECT-001',
  };
  path.field = null;

  const result = assessCprtBPath(path);
  assert.equal(result.status, 'PASS');
  assert.equal(result.assertions.interventionProvenance, 'NOT_APPLICABLE');
  assert.equal(result.assertions.returnProvenance, 'NOT_APPLICABLE');
});

test('CPRT-B fails hard when the source snapshot semantic hash is invalid', () => {
  const path = completePath();
  path.run.snapshotHashValid = false;

  const result = assessCprtBPath(path);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.gaps.includes('snapshot_hash_invalid'));
});
