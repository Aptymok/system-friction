import assert from 'node:assert/strict';
import { evaluateCompletionReceipt, requirementHash } from './lib/programCompletionReceipts.mjs';

const requirement = { id: 'QA-REQUIREMENT-001', source: 'QA canonical source', requirement: 'A bounded internal capability must preserve evidence and return proof.' };
const hash = requirementHash(requirement);
const verifiedHead = 'qa-code-head-001';
const ledgerHead = 'qa-ledger-head-002';
const observedEvidence = [
  { kind: 'GIT_COMMIT', ref: verifiedHead },
  { kind: 'WORKFLOW_RUN', ref: 'qa-workflow-001' },
  { kind: 'RETURN_RECEIPT', ref: 'artifacts/qa/return.json', sha256: 'sha256:qa' },
];
const verifyEvidence = (evidence) => ({ ok: observedEvidence.some((candidate) => candidate.kind === evidence.kind && candidate.ref === evidence.ref) });
const verifyLedgerOnlyDescendant = (receiptHead, currentHead) => ({ ok: receiptHead === verifiedHead && currentHead === ledgerHead });
const valid = {
  contract: 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.2',
  receipts: { [requirement.id]: { status: 'SATISFIED', requirementHash: hash, head: verifiedHead, evidence: observedEvidence, verifiedBy: 'SFI-08', returnState: 'RETURN_PASS' } },
};
assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead: verifiedHead, verifyEvidence }).satisfied, true, 'exact verified head remains valid');
assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead: ledgerHead, verifyReceiptHead: verifyLedgerOnlyDescendant, verifyEvidence }).satisfied, true, 'ledger-only descendant must not self-invalidate durable receipt');
assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead: ledgerHead, verifyEvidence }).error, 'VERIFIED_HEAD_RESOLVER_REQUIRED');
assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead: 'changed-code-head', verifyReceiptHead: () => ({ ok: false, error: 'RECEIPT_HEAD_INVALIDATED_BY_CODE_CHANGE' }), verifyEvidence }).error, 'RECEIPT_HEAD_INVALIDATED_BY_CODE_CHANGE');

const staleRequirement = structuredClone(valid); staleRequirement.receipts[requirement.id].requirementHash = 'sha256:stale';
assert.equal(evaluateCompletionReceipt(requirement, staleRequirement, { currentHead: verifiedHead, verifyEvidence }).error, 'REQUIREMENT_HASH_MISMATCH');
const emptyEvidence = structuredClone(valid); emptyEvidence.receipts[requirement.id].evidence = [];
assert.equal(evaluateCompletionReceipt(requirement, emptyEvidence, { currentHead: verifiedHead, verifyEvidence }).error, 'COMPLETION_EVIDENCE_REQUIRED');
const claimedEvidence = structuredClone(valid); claimedEvidence.receipts[requirement.id].evidence = [{ kind: 'WORKFLOW_RUN', ref: 'claimed-but-unobserved' }];
assert.equal(evaluateCompletionReceipt(requirement, claimedEvidence, { currentHead: verifiedHead, verifyEvidence }).error, 'OBSERVED_EVIDENCE_VERIFICATION_FAILED');
const unstructuredEvidence = structuredClone(valid); unstructuredEvidence.receipts[requirement.id].evidence = ['claimed'];
assert.equal(evaluateCompletionReceipt(requirement, unstructuredEvidence, { currentHead: verifiedHead, verifyEvidence }).error, 'STRUCTURED_EVIDENCE_REFERENCE_REQUIRED');
const wrongVerifier = structuredClone(valid); wrongVerifier.receipts[requirement.id].verifiedBy = 'self-asserted';
assert.equal(evaluateCompletionReceipt(requirement, wrongVerifier, { currentHead: verifiedHead, verifyEvidence }).error, 'INDEPENDENT_VERIFIER_REQUIRED');
assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead: verifiedHead }).error, 'EVIDENCE_RESOLVER_REQUIRED');
const externalWithoutObservation = structuredClone(valid);
assert.equal(evaluateCompletionReceipt(requirement, externalWithoutObservation, { currentHead: verifiedHead, verifyEvidence, external: true }).error, 'EXTERNAL_OBSERVATION_REQUIRED');
externalWithoutObservation.receipts[requirement.id].externalObserved = true;
assert.equal(evaluateCompletionReceipt(requirement, externalWithoutObservation, { currentHead: verifiedHead, verifyEvidence, external: true }).satisfied, true);
assert.equal(evaluateCompletionReceipt(requirement, { receipts: {} }, { currentHead: verifiedHead, verifyEvidence }).state, 'ABSENT');

console.log(JSON.stringify({ ok: true, contract: 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.2', exactHeadValid: true, ledgerOnlyDescendantValid: true,
  interveningCodeChangeFailsClosed: true, independentVerifierRequired: true, structuredEvidenceRequired: true, observedEvidenceResolverRequired: true, externalObservationRequired: true }));
