import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createCognitiveTwinStateTransition } from '../src/core/cognitive-twin/stateContract';
import {
  COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
  assertCognitiveTwinLearningCandidate,
  assertCognitiveTwinLearningDecision,
  assertCognitiveTwinLearningSupersession,
} from '../src/core/cognitive-twin/learningContract';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const contract = read('src/core/cognitive-twin/contract.ts');
const stateContract = read('src/core/cognitive-twin/stateContract.ts');
const statePersistence = read('src/core/cognitive-twin/statePersistence.ts');
const learningContract = read('src/core/cognitive-twin/learningContract.ts');
const learningLineage = read('src/core/cognitive-twin/learningLineage.ts');
const runtime = read('src/core/cognitive-twin/reentry/runtime.ts');
const types = read('src/core/cognitive-twin/reentry/types.ts');
const journal = read('src/core/cognitive-twin/reentry/journal.ts');
const experiments = read('src/core/cognitive-twin/reentry/experiments.ts');
const experimentState = read('src/core/cognitive-twin/reentry/experimentState.ts');
const cron = read('src/app/api/cron/continuity-report/route.ts');
const methodLab = read('src/lib/method-lab/readModel.ts');
const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const operatingUi = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const governanceUi = read('src/components/sfi/SfiGovernanceWorkspace.tsx');
const interactiveApi = read('src/app/api/root/interactive/route.ts');
const externalLab = read('src/app/api/external/v1/lab/route.ts');
const canon = read('docs/canon/16_LONGITUDINAL_SYSTEM_FRICTION_PROGRAM.md');
const phiCanon = read('docs/MIHM_PHI_CANON.md');
const phiContract = read('src/lib/mihm/phiContract.ts');
const canonicalFormulas = read('src/core/formulas/canonicalFormulas.ts');
const worldVector = read('src/lib/worldspect/vector-contract.ts');
const mops = read('src/lib/mops/contract.ts');
const reconciliation = read('docs/audits/2026-08-11_phi_worldvector_mops_reconciliation.md');
const prereg = JSON.parse(read('experiments/lci/preregistration-v0.1.json')) as Record<string, unknown>;
const vercel = JSON.parse(read('vercel.json')) as { crons?: unknown[] };

assert.match(contract, /COGNITIVE_TWIN_CONTRACT_VERSION = '1\.2\.0'/);
assert.match(contract, /Computational first-person self-report/);
assert.match(contract, /WITHHOLD means do not interrupt the founder now/);
assert.match(contract, /Learning does not imply authority expansion/);
assert.match(contract, /propose_subject_mutation/);
assert.match(contract, /apply_subject_mutation/);

// SFI-TWIN-AMENDMENT-LINEAGE-1.0 — R3 state and learning lineage gate.
assert.match(stateContract, /SFI-COGNITIVE-TWIN-STATE-1\.0/);
for (const field of ['availableEvidence', 'attentionConfiguration', 'decision', 'prediction', 'worldVector', 'methodConfiguration', 'outcome', 'error', 'contradiction', 'deltaCognition']) {
  assert.ok(stateContract.includes(field), `cognitive_twin_state_contract_missing:${field}`);
}
assert.match(stateContract, /MODEL_CONTEXT_IS_NOT_TWIN_MEMORY/);
assert.match(stateContract, /COGNITIVE_TWIN_STATE_OUTCOME_REQUIRES_EVIDENCE/);
assert.match(statePersistence, /emitEpistemicEvent/);
assert.match(statePersistence, /cognitive_twin\.state\.transition_recorded/);
assert.match(statePersistence, /canonicalMutation: false/);
assert.doesNotMatch(statePersistence, /\.update\(|\.upsert\(|\.delete\(/, 'Twin state transition persistence must remain append-only.');

const validTransition = createCognitiveTwinStateTransition({
  transitionId: 'qa-transition-1',
  subjectRef: 'qa-subject',
  t0: {
    at: '2026-09-05T12:00:00.000Z',
    state: { mode: 'baseline' },
    availableEvidence: [{ ref: 'evidence:t0:1', epistemicClass: 'OBSERVED', observedAt: '2026-09-05T11:00:00.000Z' }],
    attentionConfiguration: { focus: ['evidence:t0:1'] },
    decision: { action: 'WAIT' },
    prediction: { expected: 'signal-a' },
    worldVector: { institutional: 0.5 },
    methodConfiguration: { method: 'qa' },
  },
  t1: {
    at: '2026-09-06T12:00:00.000Z',
    outcome: { observed: 'signal-b' },
    outcomeEvidenceRefs: ['evidence:t1:1'],
    error: { predictionMiss: true },
    contradiction: { expected: 'signal-a', observed: 'signal-b' },
    deltaCognition: { attention: 'reweighted' },
    state: { mode: 'amended' },
  },
  lineageRefs: ['event:prior:1'],
  createdAt: '2026-09-06T12:01:00.000Z',
});
assert.equal(validTransition.t0.prediction?.expected, 'signal-a');
assert.equal(validTransition.t1?.outcomeEvidenceRefs[0], 'evidence:t1:1');
assert.throws(() => createCognitiveTwinStateTransition({
  ...validTransition,
  transitionId: 'qa-transition-invalid-outcome',
  t1: { ...validTransition.t1!, outcomeEvidenceRefs: [] },
}), /COGNITIVE_TWIN_STATE_OUTCOME_REQUIRES_EVIDENCE/);

assert.equal(COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION, 'SFI-COGNITIVE-TWIN-LEARNING-LINEAGE-1.0');
assert.doesNotThrow(() => assertCognitiveTwinLearningCandidate({
  contractVersion: COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
  learningId: 'learning-a',
  state: 'CANDIDATE',
  statement: 'Candidate learning A',
  evidenceRefs: ['evidence:a'],
  sourceRefs: ['source:a'],
  proposedBy: 'qa',
  proposedAt: '2026-09-05T12:00:00.000Z',
}));
for (const decision of ['ACCEPTED', 'REJECTED'] as const) {
  assert.doesNotThrow(() => assertCognitiveTwinLearningDecision({
    contractVersion: COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
    decisionId: `decision-${decision.toLowerCase()}`,
    learningId: `learning-${decision.toLowerCase()}`,
    decision,
    authorityRef: 'authority:root:qa',
    rationale: `QA ${decision}`,
    evidenceRefs: ['evidence:decision'],
    decidedBy: 'qa',
    decidedAt: '2026-09-05T12:05:00.000Z',
    canonicalMutation: false,
  }));
}
assert.throws(() => assertCognitiveTwinLearningDecision({
  contractVersion: COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
  decisionId: 'decision-no-authority',
  learningId: 'learning-no-authority',
  decision: 'ACCEPTED',
  authorityRef: '',
  rationale: 'invalid',
  evidenceRefs: [],
  decidedBy: null,
  decidedAt: '2026-09-05T12:05:00.000Z',
  canonicalMutation: false,
}), /COGNITIVE_TWIN_LEARNING_AUTHORITY_REQUIRED/);
assert.doesNotThrow(() => assertCognitiveTwinLearningSupersession({
  contractVersion: COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
  relationId: 'supersession-a-b',
  relation: 'SUPERSEDED_BY',
  supersededLearningId: 'learning-a',
  supersedingLearningId: 'learning-b',
  authorityRef: 'authority:root:qa',
  rationale: 'B corrects A while preserving A.',
  evidenceRefs: ['evidence:b'],
  recordedBy: 'qa',
  recordedAt: '2026-09-05T12:10:00.000Z',
  destructiveRewrite: false,
}));
assert.throws(() => assertCognitiveTwinLearningSupersession({
  contractVersion: COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
  relationId: 'supersession-self',
  relation: 'SUPERSEDED_BY',
  supersededLearningId: 'learning-a',
  supersedingLearningId: 'learning-a',
  authorityRef: 'authority:root:qa',
  rationale: 'invalid',
  evidenceRefs: [],
  recordedBy: null,
  recordedAt: '2026-09-05T12:10:00.000Z',
  destructiveRewrite: false,
}), /COGNITIVE_TWIN_LEARNING_CANNOT_SUPERSEDE_SELF/);
assert.match(learningContract, /learningIsCanon|canonicalMutation|destructiveRewrite|SUPERSEDED_BY|ACCEPTED|REJECTED/);
assert.match(learningLineage, /COGNITIVE_TWIN_LEARNING_CANDIDATE_REQUIRED/);
assert.match(learningLineage, /COGNITIVE_TWIN_LEARNING_SUPERSEDED_MUST_BE_ACCEPTED/);
assert.match(learningLineage, /COGNITIVE_TWIN_LEARNING_SUPERSEDING_MUST_BE_ACCEPTED/);
assert.match(learningLineage, /learningIsCanon: false/);
assert.match(learningLineage, /canonicalMutation: false/);
assert.match(learningLineage, /emitEpistemicEvent/);
assert.match(learningLineage, /\.from\('epistemic_events'\)/);
assert.doesNotMatch(learningLineage, /\.update\(|\.upsert\(|\.delete\(/, 'Learning amendment lineage must never destructively rewrite history.');

assert.match(types, /rootVisibility: 'ALWAYS_VISIBLE'/);
assert.doesNotMatch(types, /privateReasoning|reasoningTrace|hiddenReasoning|rawChainOfThought/i);
assert.doesNotMatch(runtime, /privateReasoning\s*:|reasoningTrace\s*:|hiddenReasoning\s*:|rawChainOfThought\s*:/i);
assert.match(runtime, /No chain-of-thought persisted/);
assert.match(runtime, /individuationDemonstrated: false/);
assert.match(runtime, /ct-a01-genesis-2026-08-11/);
assert.match(runtime, /parentEventHash/);
assert.match(runtime, /eventHash/);
assert.match(journal, /ALWAYS_VISIBLE/);
assert.match(journal, /privateReasoningPersisted: false/);
assert.doesNotMatch(journal, /reasoningTrace\s*:|hiddenReasoning\s*:|rawChainOfThought\s*:/i);

// Dedicated legacy IDENTITY/Twin dashboards were absorbed. The canonical operator
// projection is ROOT + TWIN/SPINE; governance controls consume the same bounded
// operationalNext proposal projection as ROOT instead of issuing a second feed.
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(scenes.includes("twin:{key:'twin'"), 'twin_spine_live_scene_missing');
assert.match(scenes, /LEGACY_INTERNAL_SCENES=.*'identity'/, 'identity_legacy_absorption_must_be_explicit');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'cognitive_twin_live_observability_missing');
assert.ok(operatingUi.includes('SfiGovernanceWorkspace'), 'cognitive_twin_governance_delegation_missing');
assert.ok(governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')") && governanceUi.includes('setProposals(arr(operationalNext.items))'), 'cognitive_twin_proposals_not_governed');
assert.ok(interactiveApi.includes("proposalQueueSource: 'operationalNext.items'") && interactiveApi.includes('separateProposalListRead: false'), 'cognitive_twin_governance_must_not_duplicate_proposal_feed');
assert.ok(governanceUi.includes('ACEPTAR') && governanceUi.includes('DENEGAR'), 'root_twin_decision_controls_missing');
assert.ok(governanceUi.includes('PEDIR EVIDENCIA'), 'root_twin_evidence_deferral_missing');
assert.ok(externalLab.includes("operation === 'report'") || externalLab.includes("case 'report'"), 'external_lab_report_surface_missing');

assert.match(experiments, /SFI-CT-SNAPSHOT-1\.0/);
assert.match(experiments, /REGISTERED_NOT_RUNNING/);
assert.match(experiments, /count < 3/);
assert.match(experiments, /status: 'CANDIDATE'/);
assert.doesNotMatch(experiments, /status: 'APPROVED'/);
assert.match(experimentState, /REGISTERED_NOT_RUNNING fork is not an executing agent/);
assert.match(cron, /runCognitiveTwinDevelopmentalHeartbeat/);
assert.match(cron, /considerCognitiveTwinMutationProposal/);
assert.match(cron, /No additional Vercel cron invocation|no additional Vercel cron invocation/i);
assert.match(methodLab, /ct_reentry: \(\) => Boolean\(COGNITIVE_TWIN_REENTRY\.subjectId/);
assert.match(canon, /OBSERVATORY/);
assert.match(canon, /METHOD LAB/);
assert.match(canon, /Directed autonomous growth/);
assert.match(canon, /Artifact provenance and authorized marks/);

assert.match(phiCanon, /Phi is not one universal score/);
assert.match(phiContract, /comparability: 'WITHIN_METHOD_ONLY'/);
assert.match(canonicalFormulas, /id: 'c_field'[\s\S]*?output: \{ name: 'c_field'/);
assert.match(reconciliation, /former statement "three unreconciled Phi formulas" is no longer an active canonical conflict/);

for (const domain of ['CULTURAL', 'ECONOMY', 'GEO_DIGITAL', 'GEOPOLITICAL', 'BIO', 'CLIMATE', 'INSTITUTIONAL', 'MEMETIC', 'TECH', 'AFFECTIVE']) {
  assert.ok(worldVector.includes(`'${domain}'`), `Missing current WorldSpect domain ${domain}`);
}
assert.match(reconciliation, /No current executable\/canonical registry was found.*seven-domain/s);

for (const protocol of ['MOP_S_MEDIA', 'MOP_S_CHANNEL', 'MOP_S_BOUNDARY']) {
  assert.ok(mops.includes(`id: '${protocol}'`), `Missing MOP-S protocol ${protocol}`);
}
assert.match(mops, /P0-A/);
assert.match(mops, /P0-B/);
assert.match(mops, /P0-C/);
assert.match(mops, /Kavak may be used as an applied case/);
assert.match(mops, /not the conceptual origin/);

assert.equal(prereg.status, 'PREREGISTERED_EXPERIMENTAL');
assert.equal(typeof prereg.null_hypothesis, 'string');
assert.ok(Array.isArray(prereg.minimum_controls));
assert.ok(Array.isArray(prereg.initial_lineages));

const cronCount = Array.isArray(vercel.crons) ? vercel.crons.length : 0;
assert.equal(cronCount, 7, `Expected the existing 7 Vercel crons, found ${cronCount}`);

console.log('SFI Cognitive Twin longitudinal completion QA: PASS');
console.log('- SFI-TWIN-AMENDMENT-LINEAGE-1.0: external T0/T1 state contract + append-only ACCEPTED/REJECTED/SUPERSEDED_BY lineage are gated');
console.log('- CT-A01 genesis + developmental heartbeat + root-visible state remain integrated beneath canonical ROOT + TWIN/SPINE surfaces');
console.log('- legacy IDENTITY is explicitly absorbed rather than retained as a parallel sovereign scene');
console.log('- snapshot/fork core contracts remain explicit; registered fork is never represented as executing');
console.log('- repeated evaluation failure can only create a governed CANDIDATE mutation proposal');
console.log('- governance proposal observability reuses one interactive proposal projection; duplicate proposal feed = 0');
console.log('- no new cron introduced');
console.log('- Phi family reconciliation remains method-scoped; c_field is not canonical Phi');
console.log('- current WorldSpect ten-domain contract remains explicit; no invented seven-domain mapping');
console.log('- MOP-S MEDIA / CHANNEL / BOUNDARY registered as EXPERIMENTAL with P0-A/B/C');
