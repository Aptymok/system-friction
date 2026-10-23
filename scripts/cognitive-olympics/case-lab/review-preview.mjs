/**
 * Existing CHRONOS Case Lab: deterministic public-safe review preview.
 * This is not a Method Lab publication package or evidence/certification.
 * Deliberately excludes the private realReference field in its entirety.
 * No network, database, file writes, credentials, or institutional mutations.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { assertFixture, buildLabInput, buildBaselineCandidate, validateCandidate } from './run.mjs';

export const SYNTHETIC_REVIEW_CONTRACT = 'SFI-CHRONOS-SYNTHETIC-REVIEW-PREVIEW-1.0';
const sha256 = input => createHash('sha256').update(JSON.stringify(input)).digest('hex');

function publicLabInput(fixture, mode) {
  const input = buildLabInput(fixture, mode);
  // Explicit allowlist: no realReference, recording metadata, individual
  // identifiers or files from the original fixture are projected.
  const anchors = Object.fromEntries(Object.entries(input.anchors).map(([key, value]) => [
    key, Object.fromEntries(['id','at','class','text','scope']
      .filter(field => Object.hasOwn(value, field))
      .map(field => [field, value[field]])),
  ]));
  return {
    contract: input.contract,
    caseId: input.caseId,
    exercise: input.exercise,
    cutoff: input.cutoff,
    epistemicClass: 'SIMULATED',
    evidenceRefs: [],
    anchors,
    instructions: input.instructions,
    restrictions: [...input.restrictions],
  };
}

export function buildSyntheticResearchReviewPreview(fixture) {
  assertFixture(fixture);
  const modes = ['backcast','forecast'];
  const cases = modes.map(mode => {
    const input = publicLabInput(fixture, mode);
    const candidate = buildBaselineCandidate(input);
    validateCandidate(candidate,input);
    return {
      mode,
      informationCutoff: input.cutoff,
      input,
      baseline: candidate,
      baselineKind: 'DETERMINISTIC_HEURISTIC_NOT_INDEPENDENT_MODEL',
      observedReturn: 'NOT_AVAILABLE',
      scientificResult: 'NOT_ESTABLISHED',
      realExecution: false,
      canonicalEvidenceEligible: false,
      candidateHash: sha256({input,candidate}),
    };
  });
  const core = {
    contract: SYNTHETIC_REVIEW_CONTRACT,
    caseId: fixture.id,
    researchClass: 'SIMULATED_LAB_ONLY',
    purpose: 'Test reproducible input partitioning and bounded inference, not empirical accuracy.',
    sourceClassification: 'FICTIONAL_SCENARIO_ONLY',
    inputProvenance: 'EXISTING_SFI_CHRONOS_CASE_LAB_FIXTURE',
    privateRealReferenceCopied: false,
    cases,
    requiredIndependentReview: [
      'Validate input cutoffs and deliberately withheld synthetic terminal anchor for forecast.',
      'Rerun each deterministic baseline and compare candidate hashes.',
      'Try adversarial candidates that claim observed evidence, real execution or forbidden authority.',
      'If later used to evaluate a model, disclose provider/version, input and timing, and contamination risk.',
    ],
    limitations: [
      'No real observations or independent external RETURN.',
      'Baseline is not an independently acting model.',
      'Backcast outcome is fictional; forecast is retrospective, not prospective.',
      'No source-custodian approval or empirical data rights are implied.',
    ],
    boundaries: {
      scientificCertification: 'NOT_CERTIFIED',
      sourceRights: 'NOT_APPLICABLE_SYNTHETIC_FIXTURE',
      publicationAuthorization: 'NOT_GRANTED',
      repositoryPromotion: 'FORBIDDEN',
      realWorldExecution: 'FORBIDDEN',
      externalReturn: 'NOT_OBSERVED',
      cognitiveLearning: 'QUARANTINED',
    },
  };
  return { ...core, digestAlgorithm: 'SHA256_JSON_STRINGIFY', digest: sha256(core) };
}

/** Ensures byte-compatible deterministic candidate and exact manifest digest. */
export function verifySyntheticResearchReviewPreview(preview, fixture) {
  if (!preview || preview.contract !== SYNTHETIC_REVIEW_CONTRACT ||
      typeof preview.digest !== 'string' || !/^[0-9a-f]{64}$/.test(preview.digest)) return false;
  const { digest, digestAlgorithm, ...core } = preview;
  if (digestAlgorithm !== 'SHA256_JSON_STRINGIFY' || digest !== sha256(core)) return false;
  return JSON.stringify(preview) === JSON.stringify(buildSyntheticResearchReviewPreview(fixture));
}

function main() {
  const fixture = JSON.parse(readFileSync(new URL('./aiweeknyc.case.json', import.meta.url),'utf8'));
  const preview = buildSyntheticResearchReviewPreview(fixture);
  if (!verifySyntheticResearchReviewPreview(preview,fixture)) throw Error('SYNTHETIC_PREVIEW_VERIFY_FAILED');
  process.stdout.write(JSON.stringify(preview,null,2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
