import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

const lifecycle=read('src/lib/governance/proposalLifecycle.ts');
const common=read('src/lib/operational/common.ts');
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
const mutationState=read('src/lib/cognitive-twin/reentry/mutationState.ts');
const lineageHealthRoute=read('src/app/api/root/cognitive-twin/health/route.ts');
const checkpoint=read('src/lib/cognitive-twin/reentry/checkpoint.ts');
const checkpointRoute=read('src/app/api/root/cognitive-twin/checkpoint/route.ts');
const experimentControls=read('src/components/root/cognitive-twin/CognitiveTwinExperimentControls.tsx');
const vercel=JSON.parse(read('vercel.json')) as {crons?:unknown[]};

for(const state of ['draft','proposed','waiting_evidence','design_approved','queued','accepted','rejected','conflicted','frozen','superseded']) assert.ok(lifecycle.includes(`'${state}'`),`missing_lifecycle_state:${state}`);
assert.match(lifecycle,/raw === 'approved'\) return 'design_approved'/);
assert.match(lifecycle,/accept.*design_approved/s);
assert.match(lifecycle,/request_evidence.*waiting_evidence/s);
assert.match(common,/approved'; \/\/ legacy read compatibility only/);

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

for(const moduleId of ['governance','world','field','studio','method_lab','cognitive_twin','agents','reports','evidence','graph']) assert.ok(readiness.includes(`id:'${moduleId}'`),`readiness_missing_module:${moduleId}`);
assert.match(readiness,/const evidenceTables = \['root_evidence_entries','epistemic_events','sfi_evidence_ledger'\]/);
assert.match(readiness,/const graphTables = \['graph_nodes','graph_edges'\]/);
assert.match(readiness,/count: 'planned'/);
assert.match(readiness,/EMPTY_READY/);
assert.match(readiness,/scientificComplete:false/);
assert.match(readiness,/externalGateBoundary/);
assert.match(governancePage,/GOVERNANCE CONTROL/);
assert.match(governancePage,/READINESS/);
assert.match(readinessPage,/¿Puede operar SFI\?/);
assert.match(readinessPage,/Límite del 100% de desarrollo/);
assert.match(readinessPage,/LISTO · VACÍO/);
assert.match(rootConsole,/\/root\/governance/);

assert.match(mutationState,/CT-A01-MUT-%/);
assert.match(mutationState,/CANDIDATE/);
assert.match(lineageHealthRoute,/readCognitiveTwinMutationState/);
assert.match(checkpoint,/SFI-CT-LINEAGE-CHECKPOINT-1\.0/);
assert.match(checkpoint,/PENDING_EXTERNAL_ANCHOR/);
assert.match(checkpoint,/previousCheckpointHash/);
assert.match(checkpointRoute,/Internal checkpoint package only/);
assert.match(experimentControls,/CREATE LINEAGE CHECKPOINT/);

const cronCount=Array.isArray(vercel.crons)?vercel.crons.length:0;
assert.equal(cronCount,7,`Expected unchanged 7 Vercel crons, found ${cronCount}`);

console.log(JSON.stringify({ok:true,invariants:[
  'ROOT and ACP share one canonical action_proposals lifecycle',
  'legacy approved is read-only compatible and no new ROOT approval writes it',
  'evidence requests are governed and canonicalized to waiting_evidence',
  'CONFLICTED has declare and governed resolve paths',
  'canonical promotion requires accepted realization + observed return + complete receipt contract',
  'CRL persistence is an explicit ROOT/ACP decision object and no migration is silently applied',
  'ROOT exposes governance health and total institutional readiness',
  'readiness separates Evidence Ledger from Knowledge Graph',
  'readiness uses planned health counts rather than expensive exact dashboard counts',
  'empty post-reset organs may be READY without being falsely marked broken',
  'readiness separates internal blockers from external scientific/proof gates',
  'CT mutation state is observed rather than hardcoded at the ROOT API/UI boundary',
  'CT checkpoint is exportable but explicitly pending independent external anchoring',
  'no new Vercel cron introduced',
]},null,2));
