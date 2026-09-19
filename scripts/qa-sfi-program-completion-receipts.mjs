import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateCompletionReceipt, requirementHash } from './lib/programCompletionReceipts.mjs';

const requirement = { id: 'QA-REQUIREMENT-001', source: 'QA canonical source', requirement: 'A bounded internal capability must preserve evidence and return proof.' };
const hash = requirementHash(requirement);
const verifiedHead = 'qa-code-head-001';
const descendantHead = 'qa-descendant-head-002';
const observedEvidence = [
  { kind: 'GIT_COMMIT', ref: verifiedHead },
  { kind: 'WORKFLOW_RUN', ref: 'qa-workflow-001' },
  { kind: 'RETURN_RECEIPT', ref: 'artifacts/qa/return.json', sha256: 'sha256:qa' },
];
const verifyEvidence = (evidence) => ({ ok: observedEvidence.some((candidate) => candidate.kind === evidence.kind && candidate.ref === evidence.ref) });
const valid = {
  contract: 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.3',
  receipts: { [requirement.id]: {
    status: 'SATISFIED', requirementHash: hash, head: verifiedHead, scopePaths: ['src/lib/qa-owner/', 'scripts/qa-owner.ts'],
    evidence: observedEvidence, verifiedBy: 'SFI-08', returnState: 'RETURN_PASS',
  } },
};

assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead: verifiedHead, verifyEvidence }).satisfied, true, 'exact verified head remains valid');
assert.equal(evaluateCompletionReceipt(requirement, valid, {
  currentHead: descendantHead,
  verifyReceiptHead: (_receiptHead, _currentHead, receipt) => ({ ok: receipt.scopePaths.includes('src/lib/qa-owner/') }),
  verifyEvidence,
}).satisfied, true, 'unrelated descendant changes may preserve a scoped receipt');
assert.equal(evaluateCompletionReceipt(requirement, valid, { currentHead: descendantHead, verifyEvidence }).error, 'VERIFIED_HEAD_RESOLVER_REQUIRED');
assert.equal(evaluateCompletionReceipt(requirement, valid, {
  currentHead: 'changed-owner-head',
  verifyReceiptHead: () => ({ ok: false, error: 'RECEIPT_SCOPE_INVALIDATED_BY_CHANGE:src/lib/qa-owner/runtime.ts' }),
  verifyEvidence,
}).error, 'RECEIPT_SCOPE_INVALIDATED_BY_CHANGE:src/lib/qa-owner/runtime.ts');

const noScope = structuredClone(valid); delete noScope.receipts[requirement.id].scopePaths;
assert.equal(evaluateCompletionReceipt(requirement, noScope, { currentHead: verifiedHead, verifyEvidence }).error, 'REGRESSION_SCOPE_REQUIRED');
const emptyScope = structuredClone(valid); emptyScope.receipts[requirement.id].scopePaths = [];
assert.equal(evaluateCompletionReceipt(requirement, emptyScope, { currentHead: verifiedHead, verifyEvidence }).error, 'REGRESSION_SCOPE_REQUIRED');
const unsafeScope = structuredClone(valid); unsafeScope.receipts[requirement.id].scopePaths = ['../escape'];
assert.equal(evaluateCompletionReceipt(requirement, unsafeScope, { currentHead: verifiedHead, verifyEvidence }).error, 'REGRESSION_SCOPE_REQUIRED');

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

const controllerWorkflow = fs.readFileSync('.github/workflows/sfi-program-completion.yml', 'utf8');
const reconcileSource = fs.readFileSync('scripts/sfi-program-completion-reconcile.mjs', 'utf8');

assert.match(controllerWorkflow, /workflows:\s*\n\s*- SFI-08 Completion Certification Batch/, 'controller must be sequenced after SFI-08');
assert.doesNotMatch(controllerWorkflow, /^\s*pull_request:/m, 'controller must not race SFI-08 on pull requests');
assert.doesNotMatch(controllerWorkflow, /^\s*push:/m, 'controller must not race SFI-08 on main pushes');
assert.match(controllerWorkflow, /github\.event\.workflow_run\.head_branch == 'main'/, 'workflow_run controller must be restricted to canonical main');
assert.match(controllerWorkflow, /ref: \$\{\{ github\.event_name == 'workflow_run' && github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/, 'controller must checkout certified exact head');
assert.match(controllerWorkflow, /uses: actions\/download-artifact@v5/, 'controller must use immutable workflow artifact handoff');
assert.match(controllerWorkflow, /run-id: \$\{\{ github\.event\.workflow_run\.id \}\}/, 'artifact must come from triggering SFI-08 run');
assert.match(controllerWorkflow, /github-token: \$\{\{ github\.token \}\}/, 'cross-run artifact download must use bounded actions-read token');
assert.match(controllerWorkflow, /SFI08_CERTIFICATION_RETURN_PATH:/, 'controller must pass certification artifact path to reconciler');
assert.match(controllerWorkflow, /SFI08_CERTIFICATION_RUN_ID:/, 'controller must bind certification evidence to exact workflow run');

for (const token of [
  'SFI08_CERTIFICATION_CONTRACT',
  "authority !== 'ASSURANCE_ONLY'",
  "returnState !== 'RETURN_PASS'",
  'failedProofCount !== 0',
  'canonicalStatusMutation !== false',
  'autoReceiptWrite !== false',
  'certification.head !== report.head',
  'certified.requirementHash !== expectedHash',
  'certified.proofPass !== true',
  "source: 'IMMUTABLE_EXACT_HEAD_SFI08_ARTIFACT'",
  'canonicalLedgerMutation: false',
  'verificationWorkflow: SFI08_WORKFLOW_NAME',
]) assert.ok(reconcileSource.includes(token), `SFI-08 handoff invariant missing: ${token}`);
assert.equal(reconcileSource.includes('fs.writeFileSync(ledgerPath'), false, 'SFI-08 handoff must not rewrite canonical receipt ledger');

console.log(JSON.stringify({ ok: true, contract: 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.3', exactHeadValid: true,
  unrelatedDescendantChangePreservesScopedReceipt: true, scopedRegressionFailsClosed: true, regressionScopeRequired: true,
  independentVerifierRequired: true, structuredEvidenceRequired: true, observedEvidenceResolverRequired: true, externalObservationRequired: true }));
