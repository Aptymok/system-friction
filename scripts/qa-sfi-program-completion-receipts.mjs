import assert from 'node:assert/strict';
import { evaluateCompletionReceipt, requirementHash } from './lib/programCompletionReceipts.mjs';

const requirement = {
  id: 'QA-REQUIREMENT-001',
  source: 'QA canonical source',
  requirement: 'A bounded internal capability must preserve evidence and return proof.',
};
const hash = requirementHash(requirement);
const currentHead = 'qa-head-001';
const observedEvidence = [
  { kind: 'GIT_COMMIT', ref: currentHead },
  { kind: 'WORKFLOW_RUN', ref: 'qa-workflow-001' },
  { kind: 'RETURN_RECEIPT', ref: 'artifacts/qa/return.json', sha256: 'sha256:qa' },
];
const verifyEvidence = (evidence) => ({ ok: observedEvidence.some((candidate) => candidate.kind === evidence.kind && candidate.ref === evidence.ref) });
const options = { currentHead, verifyEvidence };

const valid = {
  contract: 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.1',
  receipts: {
    [requirement.id]: {
      status: 'SATISFIED',
      requirementHash: hash,
      head: currentHead,
      evidence: observedEvidence,
      verifiedBy: 'SFI-08',
      returnState: 'RETURN_PASS',
    },
  },
};
assert.equal(evaluateCompletionReceipt(requirement, valid, options).satisfied, true, 'observed exact-head receipt must make SATISFIED reachable');

const staleRequirement = structuredClone(valid);
staleRequirement.receipts[requirement.id].requirementHash = 'sha256:stale';
assert.equal(evaluateCompletionReceipt(requirement, staleRequirement, options).error, 'REQUIREMENT_HASH_MISMATCH');

const staleHead = structuredClone(valid);
staleHead.receipts[requirement.id].head = 'old-head';
assert.equal(evaluateCompletionReceipt(requirement, staleHead, options).error, 'RECEIPT_HEAD_MISMATCH');

const emptyEvidence = structuredClone(valid);
emptyEvidence.receipts[requirement.id].evidence = [];
assert.equal(evaluateCompletionReceipt(requirement, emptyEvidence, options).error, 'COMPLETION_EVIDENCE_REQUIRED');

const claimedEvidence = structuredClone(valid);
claimedEvidence.receipts[requirement.id].evidence = [{ kind: 'WORKFLOW_RUN', ref: 'claimed-but-unobserved' }];
assert.equal(evaluateCompletionReceipt(requirement, claimedEvidence, options).error, 'OBSERVED_EVIDENCE_VERIFICATION_FAILED');

const unstructuredEvidence = structuredClone(valid);
unstructuredEvidence.receipts[requirement.id].evidence = ['claimed'];
assert.equal(evaluateCompletionReceipt(requirement, unstructuredEvidence, options).error, 'STRUCTURED_EVIDENCE_REFERENCE_REQUIRED');

const wrongVerifier = structuredClone(valid);
wrongVerifier.receipts[requirement.id].verifiedBy = 'self-asserted';
assert.equal(evaluateCompletionReceipt(requirement, wrongVerifier, options).error, 'INDEPENDENT_VERIFIER_REQUIRED');

assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead }).error, 'EVIDENCE_RESOLVER_REQUIRED');

const externalWithoutObservation = structuredClone(valid);
assert.equal(
  evaluateCompletionReceipt(requirement, externalWithoutObservation, { ...options, external: true }).error,
  'EXTERNAL_OBSERVATION_REQUIRED',
  'external action must not be fabricated as satisfied',
);
externalWithoutObservation.receipts[requirement.id].externalObserved = true;
assert.equal(evaluateCompletionReceipt(requirement, externalWithoutObservation, { ...options, external: true }).satisfied, true);

assert.equal(evaluateCompletionReceipt(requirement, { receipts: {} }, options).state, 'ABSENT');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.1',
  validObservedReceiptPromotes: true,
  exactHeadRequired: true,
  independentVerifierRequired: true,
  structuredEvidenceRequired: true,
  observedEvidenceResolverRequired: true,
  staleReceiptFailsClosed: true,
  externalObservationRequired: true,
}));
