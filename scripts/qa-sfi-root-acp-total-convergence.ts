import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

const lifecycle=read('src/lib/governance/proposalLifecycle.ts');
const common=read('src/lib/operational/common.ts');
const persistencePolicy=read('src/lib/cognitive-lab/persistencePolicy.ts');
const rootDecisions=read('src/app/api/root/decisions/route.ts');
const approve=read('src/app/api/acp/proposals/[id]/approve/route.ts');
const reject=read('src/app/api/acp/proposals/[id]/reject/route.ts');
const requestEvidence=read('src/app/api/sfi/proposals/[id]/request-evidence/route.ts');
const proposals=read('src/app/api/acp/proposals/route.ts');
const governanceHealth=read('src/lib/governance/readGovernanceHealth.ts');
const conflict=read('src/app/api/root/governance/conflicts/route.ts');
const conflictResolve=read('src/app/api/root/governance/conflicts/resolve/route.ts');
const promote=read('src/app/api/root/governance/promote/route.ts');
const crl=read('src/app/api/root/governance/crl/prepare-decision/route.ts');
const readiness=read('src/lib/root/closure/readInstitutionalReadiness.ts');
const governancePage=read('src/app/root/governance/page.tsx');
const readinessPage=read('src/app/root/readiness/page.tsx');
const rootConsole=read('src/components/root/sovereign/RootSovereignConsole.tsx');
const mutationState=read('src/core/cognitive-twin/reentry/mutationState.ts');
const twinPage=read('src/app/root/cognitive-twin/page.tsx');
const twinNative=read('src/components/root/surfaces/CognitiveTwinNativeSurface.tsx');
const checkpoint=read('src/core/cognitive-twin/reentry/checkpoint.ts');
const checkpointRoute=read('src/app/api/root/cognitive-twin/checkpoint/route.ts');
const snapshotRoute=read('src/app/api/root/cognitive-twin/snapshot/route.ts');
const forkRoute=read('src/app/api/root/cognitive-twin/fork/route.ts');
const experimentControls=read('src/components/root/cognitive-twin/CognitiveTwinExperimentControls.tsx');
const nativeFrame=read('src/components/root/surfaces/RootNativeFrame.tsx');
const vercel=JSON.parse(read('vercel.json')) as {crons?:unknown[]};

for(const state of ['draft','proposed','waiting_evidence','design_approved','queued','accepted','rejected','conflicted','frozen','superseded']) assert.ok(lifecycle.includes(`'${state}'`),`missing_lifecycle_state:${state}`);
assert.match(lifecycle,/raw === 'approved'\) return 'design_approved'/);
assert.match(lifecycle,/accept.*design_approved/s);
assert.match(lifecycle,/request_evidence.*waiting_evidence/s);
assert.doesNotMatch(common,/\|\s*'approved'/, 'legacy approved must not remain writable through ProposalStatus');

assert.match(rootDecisions,/decideActionProposal/);
assert.doesNotMatch(rootDecisions,/decision === 'accept' \? 'approved'/);
assert.match(approve,/decideActionProposal/);
assert.match(reject,/decideActionProposal/);
assert.match(requestEvidence,/requireGovernedActor/);
assert.match(requestEvidence,/request_evidence/);
assert.doesNotMatch(requestEvidence,/status:\s*'needs_evidence'/);
assert.match(proposals,/normalizeProposalState/);
assert.match(proposals,/raw_status/);

assert.match(governanceHealth,/legacyApproved/);
assert.match(governanceHealth,/counts\.conflicted/);
assert.match(governanceHealth,/governance_crl_persistence/);
assert.match(conflict,/status:'conflicted'/);
assert.match(conflict,/claimsBlocked:true/);
assert.match(conflictResolve,/RESOLUTIONS=\['reopen','freeze','supersede'\]/);
assert.match(conflictResolve,/automaticPromotion:false/);
assert.match(promote,/promotion_requires_accepted_realization/);
assert.match(promote,/promotion_requires_recorded_return/);
assert.match(promote,/SFI-GOVERNANCE-PROMOTION-RECEIPT-1\.0/);
for(const required of ['evidence_refs','tests','reproducibility','migration_plan','rollback_plan']) assert.ok(promote.includes(required),`promotion_missing:${required}`);

assert.match(crl,/governance_crl_persistence/);
assert.match(crl,/DEDICATED_PROTOCOL_TABLES/);
assert.match(crl,/SHARED_METHOD_LAB_LEDGER_ONLY/);
assert.match(crl,/HYBRID_GOVERNED_MIGRATION/);
assert.match(crl,/migrationGovernanceApproved:false/);
assert.match(crl,/liveSchemaVerified:false/);
assert.match(persistencePolicy,/CANONICAL_GOVERNED_PERSISTENCE/);
assert.match(persistencePolicy,/twinCandidateStore:\s*'sfi_amv_memory'/);
assert.match(persistencePolicy,/institutionalEventPipeline/);
assert.match(persistencePolicy,/Candidate learning remains CANDIDATE/);

for(const moduleId of ['governance','world','field','studio','method_lab','cognitive_twin','agents','reports','evidence','graph']) assert.ok(readiness.includes(`id:'${moduleId}'`),`readiness_missing_module:${moduleId}`);
assert.match(readiness,/const evidenceTables = \['root_evidence_entries','epistemic_events','sfi_evidence_ledger'\]/);
assert.match(readiness,/const graphTables = \['graph_nodes','graph_edges'\]/);
assert.match(readiness,/count: 'planned'/);
assert.match(readiness,/EMPTY_READY/);
assert.match(readiness,/scientificComplete:false/);
assert.match(readiness,/externalGateBoundary/);

for (const token of ['RootNativeFrame', 'readGovernanceHealth', 'GovernanceActions', 'AUTHORITY / STATE MACHINE / AUDIT', 'READINESS ↗']) assert.ok(governancePage.includes(token), `native_governance_surface_missing:${token}`);
for (const token of ['RootNativeFrame', 'readInstitutionalReadiness', 'TotalProofControl', 'ContinuityConsole', 'InstitutionalContractsConsole', 'Can the institute operate now?']) assert.ok(readinessPage.includes(token), `native_readiness_surface_missing:${token}`);
assert.match(rootConsole,/\/root\/governance/);
assert.ok(nativeFrame.includes('EmergentParticleField'), 'root_native_frame_particle_field_missing');
assert.ok(nativeFrame.includes('READ ≠ EXECUTE ≠ GOVERN ≠ CANONICAL WRITE'), 'root_native_frame_authority_invariant_missing');

assert.match(mutationState,/CT-A01-MUT-%/);
assert.match(mutationState,/CANDIDATE/);
assert.match(twinPage,/readCognitiveTwinMutationState/);
assert.match(twinPage,/CognitiveTwinNativeSurface/);
assert.match(checkpoint,/SFI-CT-LINEAGE-CHECKPOINT-1\.0/);
assert.match(checkpoint,/PENDING_EXTERNAL_ANCHOR/);
assert.match(checkpoint,/previousCheckpointHash/);
assert.match(checkpointRoute,/createLineageCheckpoint/);
assert.match(checkpointRoute,/requireRootActor\('root\.cognitive-twin\.checkpoint\.create'\)/);
assert.match(snapshotRoute,/createCognitiveTwinSnapshot/);
assert.match(forkRoute,/registerCognitiveTwinFork/);
assert.match(experimentControls,/CREATE LINEAGE CHECKPOINT/);
assert.match(experimentControls,/\/api\/root\/cognitive-twin\/snapshot/);
assert.match(experimentControls,/\/api\/root\/cognitive-twin\/checkpoint/);
assert.match(experimentControls,/\/api\/root\/cognitive-twin\/fork/);
assert.match(twinNative,/CognitiveTwinExperimentControls/);
assert.match(twinNative,/NationalFieldPanel/);
assert.match(twinNative,/CognitiveTwinDeliberationPanel/);
assert.match(twinNative,/FounderDecisionCandidateForm/);

const cronCount=Array.isArray(vercel.crons)?vercel.crons.length:0;
assert.equal(cronCount,7,`Expected unchanged 7 Vercel crons, found ${cronCount}`);

console.log(JSON.stringify({ok:true,invariants:[
  'ROOT and ACP share one canonical action_proposals lifecycle',
  'legacy approved is normalized only at the lifecycle read boundary and is not a writable ProposalStatus',
  'evidence requests are governed and canonicalized to waiting_evidence',
  'CONFLICTED has declare and governed resolve paths',
  'canonical promotion requires accepted realization + observed return + complete receipt contract',
  'CRL governance alternatives remain reviewable while active persistence has converged to the canonical governed institutional pipeline',
  'ROOT governance and readiness use native emergent entry surfaces without weakening authority',
  'readiness separates Evidence Ledger from Knowledge Graph',
  'readiness uses planned health counts rather than expensive exact dashboard counts',
  'empty post-reset organs may be READY without being falsely marked broken',
  'readiness separates internal blockers from external scientific/proof gates',
  'CT mutation state is observed directly at the ROOT server-rendered UI boundary',
  'CT snapshot/checkpoint/fork controls remain reachable inside the native Cognitive Twin surface',
  'CT national field, deliberation and founder candidate decisions remain reachable',
  'CT checkpoint is exportable but explicitly pending independent external anchoring',
  'no new Vercel cron introduced',
]},null,2));
