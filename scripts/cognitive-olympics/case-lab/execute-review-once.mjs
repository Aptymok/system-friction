/**
 * Issue #825 — Execute the existing deterministic CHRONOS synthetic review
 * twice and emit one verifiable, isolated CI receipt. Never call the
 * institutional runtime, mint epistemic evidence or publish a real finding.
 *
 * Only the source-safe review preview is exported; the private realReference
 * field is intentionally absent. stdout can be retained as a GitHub CI artifact.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  buildSyntheticResearchReviewPreview,
  verifySyntheticResearchReviewPreview,
} from './review-preview.mjs';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const RUN_RECEIPT_CONTRACT = 'SFI-CHRONOS-BOUNDED-CI-RECEIPT-1.0';

export function executeSyntheticReviewOnce(fixture, {
  executedAt = new Date().toISOString(),
  sourceCommit = process.env.GITHUB_SHA ?? null,
  ciRunId = process.env.GITHUB_RUN_ID ?? null,
  ciAttempt = process.env.GITHUB_RUN_ATTEMPT ?? null,
} = {}) {
  if (!Number.isFinite(Date.parse(executedAt))) throw new Error('INVALID_EXECUTION_TIMESTAMP');

  // This is an actual local/CI invocation of the existing deterministic
  // heuristic, NOT an invocation of a registered SFI cognitive executor.
  const first = buildSyntheticResearchReviewPreview(fixture);
  const independentRepeat = buildSyntheticResearchReviewPreview(fixture);
  if (!verifySyntheticResearchReviewPreview(first, fixture)
    || !verifySyntheticResearchReviewPreview(independentRepeat, fixture)
    || first.digest !== independentRepeat.digest) {
    throw new Error('SYNTHETIC_REPRODUCTION_FAILED');
  }
  const forbidden = [
    fixture.realReference?.title,
    fixture.realReference?.artifact,
    fixture.realReference?.artifactCreatedAt,
    fixture.realReference?.discrepancy,
    'realReference',
  ].filter(value => typeof value === 'string' && value);
  if (forbidden.some(value => JSON.stringify(first).includes(value))) {
    throw new Error('PRIVATE_REAL_REFERENCE_DISCLOSURE');
  }
  const validCommit = typeof sourceCommit === 'string' && /^[0-9a-f]{40}$/i.test(sourceCommit);
  const validCiRun = typeof ciRunId === 'string' && /^\d+$/.test(ciRunId);
  const core = {
    contract: RUN_RECEIPT_CONTRACT,
    executedAt,
    sourceCommit: validCommit ? sourceCommit : null,
    ciRunId: validCiRun ? ciRunId : null,
    ciAttempt: typeof ciAttempt === 'string' && /^\d+$/.test(ciAttempt) ? ciAttempt : null,
    executionLane: validCommit && validCiRun ? 'GITHUB_ACTIONS_SYNTHETIC_ONLY' : 'LOCAL_SYNTHETIC_UNANCHORED',
    executed: true,
    engine: 'DETERMINISTIC_HEURISTIC_NOT_LLM',
    registeredSfiAgentExecuted: false,
    cognitiveCapabilityGrantChecked: false,
    objectId: fixture.id,
    inputClassification: 'SIMULATED',
    inputPrivacyBoundary: 'REAL_REFERENCE_NOT_COPIED',
    payload: first,
    reproduction: {
      repeatCount: 2,
      samePreviewDigest: true,
      candidateDigests: first.cases.map(({ mode, candidateHash }) => ({ mode, candidateHash })),
      previewDigest: first.digest,
      verifier: 'verifySyntheticResearchReviewPreview',
      result: 'DETERMINISTIC_REPRODUCTION_PASS',
    },
    reviewAndAuthority: {
      independentHumanReview: 'NOT_OBTAINED',
      methodLabPersistentRun: 'NOT_CLAIMED',
      p3ScientificCertification: 'NOT_CERTIFIED',
      p4AutonomousCognitiveCycle: 'NOT_DEMONSTRATED',
      p5PublicResearchRelease: 'FORBIDDEN',
      externalReturn: 'NOT_OBSERVED',
      nextGate: 'ACTIVE_COGNITIVE_EXECUTION_GRANT_AND_DISTINCT_REVIEWER_RECEIPT_REQUIRED',
    },
    persistence: 'GITHUB_CI_ARTIFACT_ONLY_NO_DB_WRITES',
  };
  return { ...core, receiptSha256: sha(core) };
}

export function verifySyntheticReviewReceipt(receipt, fixture) {
  if (!receipt || typeof receipt !== 'object' || receipt.contract !== RUN_RECEIPT_CONTRACT) return false;
  const { receiptSha256, ...core } = receipt;
  if (!/^[0-9a-f]{64}$/.test(receiptSha256 ?? '') || sha(core) !== receiptSha256) return false;
  try {
    const regenerated = executeSyntheticReviewOnce(fixture, {
      executedAt: receipt.executedAt,
      sourceCommit: receipt.sourceCommit,
      ciRunId: receipt.ciRunId,
      ciAttempt: receipt.ciAttempt,
    });
    return JSON.stringify(receipt) === JSON.stringify(regenerated);
  } catch {
    return false;
  }
}

function main() {
  const fixture = JSON.parse(readFileSync(new URL('./aiweeknyc.case.json', import.meta.url), 'utf8'));
  const receipt = executeSyntheticReviewOnce(fixture);
  if (!verifySyntheticReviewReceipt(receipt, fixture)) throw new Error('RECEIPT_SELF_VERIFICATION_FAILED');
  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
