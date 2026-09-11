#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT = 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-1.2';
const GLOBAL_REGRESSION_SCOPE = [
  'src/**',
  'scripts/**',
  'packages/**',
  'services/**',
  '.github/workflows/**',
  'public/**',
  'package.json',
  'package-lock.json',
  'docs/program/**',
  'docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md',
];

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'program-completion', 'completion.json');
const returnPath = path.join(root, 'artifacts', 'program-completion', 'certification-return.json');

assert.equal(fs.existsSync(reportPath), true, 'completion report required');
assert.equal(fs.existsSync(returnPath), true, 'certification return required');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const certification = JSON.parse(fs.readFileSync(returnPath, 'utf8'));
const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

assert.equal(certification.contract, SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT);
assert.equal(certification.verifier, 'SFI-08');
assert.equal(certification.authority, 'ASSURANCE_ONLY');
assert.equal(certification.head, actualHead);
assert.equal(certification.expectedHead, actualHead);
assert.equal(certification.head, report.head);
assert.equal(certification.canonicalStatusMutation, false);
assert.equal(certification.autoReceiptWrite, false);
assert.deepEqual(certification.regressionScope, GLOBAL_REGRESSION_SCOPE);
assert.ok(certification.selectedCount <= certification.batchLimit);
assert.equal(certification.selectedCount, certification.requirements.length);
assert.equal(certification.failedProofCount, 0);
assert.equal(certification.returnState, 'RETURN_PASS');
assert.deepEqual(certification.canonicalCountsBefore, report.counts);
assert.equal(certification.invalidReceiptEligibleCount >= certification.selectedInvalidReceiptCount, true);

const requirementById = new Map((report.requirements || []).map((item) => [item.id, item]));
const seen = new Set();
let seenAbsent = false;
for (const item of certification.requirements) {
  assert.equal(seen.has(item.id), false, `duplicate certification id: ${item.id}`);
  seen.add(item.id);
  const source = requirementById.get(item.id);
  assert.ok(source, `unknown completion requirement: ${item.id}`);
  assert.equal(source.status, item.canonicalStatus, `canonical status mutated: ${item.id}`);
  assert.equal(source.diagnostic?.state, 'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED');
  assert.ok(['ABSENT', 'INVALID'].includes(source.completionReceipt?.state), `unsupported prior receipt state: ${item.id}`);
  assert.equal(item.previousReceiptState, source.completionReceipt.state);
  if (item.previousReceiptState === 'ABSENT') seenAbsent = true;
  if (seenAbsent) assert.notEqual(item.previousReceiptState, 'INVALID', `invalid receipts must be prioritized before absent receipts: ${item.id}`);
  assert.equal(item.diagnosticState, source.diagnostic.state);
  assert.ok(Array.isArray(item.proofPaths) && item.proofPaths.length > 0, `proof path required: ${item.id}`);
  assert.equal(item.proofPass, true, `proof must pass: ${item.id}`);
  assert.equal(item.semanticSupport.length, item.proofPaths.length, `semantic support required per proof: ${item.id}`);
  for (const proofPath of item.proofPaths) {
    assert.ok(certification.proofCatalog.includes(proofPath), `proof must come from SFI Verify run commands: ${item.id}:${proofPath}`);
    assert.ok(item.evidencePaths.includes(proofPath), `proof must be declared by requirement evidence: ${item.id}:${proofPath}`);
    assert.equal(fs.existsSync(path.join(root, proofPath)), true, `proof file missing: ${proofPath}`);
    const support = item.semanticSupport.find((entry) => entry.path === proofPath);
    assert.ok(support?.supported, `semantic proof linkage required: ${item.id}:${proofPath}`);
    const idCount = support.matchedIdentifiers?.length || 0;
    const termCount = support.matchedTerms?.length || 0;
    assert.ok(idCount >= 2 || (idCount >= 1 && termCount >= 2) || termCount >= 3,
      `tight semantic evidence threshold not met: ${item.id}:${proofPath}`);
  }
}

for (const rejected of certification.rejectedSemanticLinks || []) {
  assert.ok(Array.isArray(rejected.declaredProofs) && rejected.declaredProofs.length > 0);
  assert.ok(['ABSENT', 'INVALID'].includes(rejected.previousReceiptState));
  assert.ok((rejected.support || []).every((entry) => entry.supported === false), `rejected item contains supported proof: ${rejected.id}`);
}

for (const execution of certification.proofExecutions || []) {
  assert.equal(execution.ok, true, `executed proof failed: ${execution.path}`);
  assert.ok(certification.proofCatalog.includes(execution.path), `executed proof outside catalog: ${execution.path}`);
}

assert.ok(!certification.requirements.some((item) => item.canonicalStatus === 'SATISFIED'), 'already satisfied requirement must not be recertified');
assert.ok(!certification.requirements.some((item) => item.diagnosticState === 'PRODUCTION_RETURN_PENDING'), 'production RETURN cannot be certified from repository QA');
assert.ok(!certification.requirements.some((item) => item.diagnosticState === 'EXTERNAL_ACTION_PENDING'), 'external action cannot be certified from repository QA');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-QA-1.2',
  head: actualHead,
  selectedCount: certification.selectedCount,
  selectedInvalidReceiptCount: certification.selectedInvalidReceiptCount,
  semanticRejectedCount: certification.semanticRejectedCount,
  proofExecutionCount: certification.proofExecutions.length,
  canonicalStatusMutation: false,
  autoReceiptWrite: false,
  returnState: certification.returnState,
}));
