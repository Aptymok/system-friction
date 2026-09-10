#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  GLOBAL_REGRESSION_SCOPE,
  SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT,
} from './sfi-program-certification-batch.mjs';

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'program-completion', 'completion.json');
const returnPath = path.join(root, 'artifacts', 'program-completion', 'certification-return.json');

assert.equal(fs.existsSync(reportPath), true, 'completion report required');
assert.equal(fs.existsSync(returnPath), true, 'certification return required');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const certification = JSON.parse(fs.readFileSync(returnPath, 'utf8'));

assert.equal(certification.contract, SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT);
assert.equal(certification.verifier, 'SFI-08');
assert.equal(certification.authority, 'ASSURANCE_ONLY');
assert.equal(certification.head, report.head);
assert.equal(certification.canonicalStatusMutation, false);
assert.equal(certification.autoReceiptWrite, false);
assert.deepEqual(certification.regressionScope, [...GLOBAL_REGRESSION_SCOPE]);
assert.ok(certification.selectedCount <= certification.batchLimit);
assert.equal(certification.selectedCount, certification.requirements.length);
assert.equal(certification.failedProofCount, 0);
assert.equal(certification.returnState, 'RETURN_PASS');
assert.deepEqual(certification.canonicalCountsBefore, report.counts);

const requirementById = new Map((report.requirements || []).map((item) => [item.id, item]));
const seen = new Set();
for (const item of certification.requirements) {
  assert.equal(seen.has(item.id), false, `duplicate certification id: ${item.id}`);
  seen.add(item.id);
  const source = requirementById.get(item.id);
  assert.ok(source, `unknown completion requirement: ${item.id}`);
  assert.equal(source.status, item.canonicalStatus, `canonical status mutated: ${item.id}`);
  assert.equal(source.diagnostic?.state, 'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED');
  assert.equal(source.completionReceipt?.state, 'ABSENT');
  assert.equal(item.diagnosticState, source.diagnostic.state);
  assert.ok(Array.isArray(item.proofPaths) && item.proofPaths.length > 0, `proof path required: ${item.id}`);
  assert.equal(item.proofPass, true, `proof must pass: ${item.id}`);
  for (const proofPath of item.proofPaths) {
    assert.ok(certification.proofCatalog.includes(proofPath), `proof must come from SFI Verify catalog: ${item.id}:${proofPath}`);
    assert.ok(item.evidencePaths.includes(proofPath), `proof must be declared by requirement evidence: ${item.id}:${proofPath}`);
    assert.equal(fs.existsSync(path.join(root, proofPath)), true, `proof file missing: ${proofPath}`);
  }
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
  contract: 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-QA-1.0',
  selectedCount: certification.selectedCount,
  proofExecutionCount: certification.proofExecutions.length,
  canonicalStatusMutation: false,
  autoReceiptWrite: false,
  returnState: certification.returnState,
}));
