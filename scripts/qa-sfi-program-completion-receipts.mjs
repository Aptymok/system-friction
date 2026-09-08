import assert from 'node:assert/strict';
import { evaluateCompletionReceipt, requirementHash } from './lib/programCompletionReceipts.mjs';

const requirement = {
  id: 'QA-REQUIREMENT-001',
  source: 'QA canonical source',
  requirement: 'A bounded internal capability must preserve evidence and return proof.',
};
const hash = requirementHash(requirement);

const valid = {
  receipts: {
    [requirement.id]: {
      status: 'SATISFIED',
      requirementHash: hash,
      evidence: ['PR #QA merged', 'SFI Verify PASS', 'RETURN receipt QA-001'],
      verifiedBy: 'SFI-08',
      returnState: 'RETURN_PASS',
    },
  },
};
assert.equal(evaluateCompletionReceipt(requirement, valid).satisfied, true, 'valid receipt must make SATISFIED reachable');

const stale = structuredClone(valid);
stale.receipts[requirement.id].requirementHash = 'sha256:stale';
assert.deepEqual(
  [evaluateCompletionReceipt(requirement, stale).satisfied, evaluateCompletionReceipt(requirement, stale).error],
  [false, 'REQUIREMENT_HASH_MISMATCH'],
  'stale receipt must fail closed',
);

const emptyEvidence = structuredClone(valid);
emptyEvidence.receipts[requirement.id].evidence = [];
assert.equal(evaluateCompletionReceipt(requirement, emptyEvidence).error, 'COMPLETION_EVIDENCE_REQUIRED');

const externalWithoutObservation = structuredClone(valid);
assert.equal(
  evaluateCompletionReceipt(requirement, externalWithoutObservation, { external: true }).error,
  'EXTERNAL_OBSERVATION_REQUIRED',
  'external action must not be fabricated as satisfied',
);
externalWithoutObservation.receipts[requirement.id].externalObserved = true;
assert.equal(evaluateCompletionReceipt(requirement, externalWithoutObservation, { external: true }).satisfied, true);

assert.equal(evaluateCompletionReceipt(requirement, { receipts: {} }).state, 'ABSENT', 'absence must remain incomplete, not invalid or satisfied');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.0',
  validReceiptPromotes: true,
  staleReceiptFailsClosed: true,
  evidenceRequired: true,
  externalObservationRequired: true,
}));
