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
const acpSeenRoute=read('src/app/api/governance/acp-seen/route.ts');
const governanceHealth=read('src/lib/governance/readGovernanceHealth.ts');
const conflict=read('src/app/api/root/governance/conflicts/route.ts');
const conflictResolve=read('src/app/api/root/governance/conflicts/resolve/route.ts');
const promote=read('src/app/api/root/governance/promote/route.ts');
const crl=read('src/app/api/root/governance/crl/prepare-decision/route.ts');
const readiness=read('src/lib/root/closure/readInstitutionalReadiness.ts');
const mutationState=read('src/core/cognitive-twin/reentry/mutationState.ts');
const checkpoint=read('src/core/cognitive-twin/reentry/checkpoint.ts');
const checkpointRoute=read('src/app/api/root/cognitive-twin/checkpoint/route.ts');
const snapshotRoute=read('src/app/api/root/cognitive-twin/snapshot/route.ts');
const forkRoute=read('src/app/api/root/cognitive-twin/fork/route.ts');
const scenes=read('src/components/sfi/scenes.ts');
const liveUi=read('src/components/sfi/SfiConsole.tsx');
const home=read('src/app/page.tsx');
const publicEntry=read('src/components/sfi/PublicEntryGateway.tsx');
const llms=read('src/app/llms.txt/route.ts');
const aiIndex=read('src/app/ai-index.json/route.ts');
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

// Governance and ROOT remain live scenes, but ROOT must restore ACP presence before governed reads.
assert.ok(scenes.includes("governance:{key:'governance'"), 'governance_live_scene_missing');
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(scenes.includes("agents:{key:'agents'"), 'agents_live_scene_missing');
assert.ok(liveUi.includes('/api/governance/acp-seen'), 'root_live_scene_must_record_acp_presence_before_governed_reads');
assert.ok(liveUi.includes('rootPresenceReady'), 'root_proposal_reads_must_wait_for_acp_presence');
assert.ok(liveUi.includes('HACERME VISTO · CONFIRMAR PRESENCIA ACP'), 'root_must_expose_explicit_acp_presence_control');
assert.ok(liveUi.includes('confirmRootPresence'), 'root_manual_presence_control_must_call_governed_presence_route');
assert.match(acpSeenRoute,/export async function GET/,'acp_presence_endpoint_get_must_explain_usage');
assert.match(acpSeenRoute,/method_not_allowed/,'acp_presence_get_must_not_silently_mutate');
assert.match(acpSeenRoute,/requiredMethod: 'POST'/,'acp_presence_get_must_name_required_method');
assert.match(acpSeenRoute,/export async function POST/,'acp_presence_mutation_must_remain_post');
assert.match(acpSeenRoute,/requireRootActor\('governance\.acp\.presence'\)/,'acp_presence_post_must_remain_root_governed');
assert.ok(liveUi.includes('/api/acp/proposals'), 'canonical_proposal_feed_not_wired_to_live_ui');
assert.ok(liveUi.includes(`/api/acp/proposals/${'${selected.id}'}/${'${kind}'}`), 'governed_decision_route_not_wired');
assert.ok(liveUi.includes('Fuente de propuestas DEGRADED'), 'proposal_source_failure_must_not_collapse_to_empty_success');
assert.ok(liveUi.includes('ACEPTAR') && liveUi.includes('RECHAZAR'), 'plain_language_root_decisions_missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'twin_proposal_surface_missing');

// The canonical public entry must tell both humans and agents what SFI is and what to do first.
assert.match(home,/PublicEntryGateway/,'canonical_home_missing_public_entry_gateway');
for(const phrase of ['IF YOU ARE A PERSON','IF YOU ARE AN AI / AGENT','OBSERVE','EVIDENCE','HYPOTHESIS','PROPOSE','ROOT','RETURN']) assert.ok(publicEntry.includes(phrase),`public_entry_missing:${phrase}`);
for(const path of ['/institution','/login','/llms.txt','/ai-index.json','/api/external/v1/manifest']) assert.ok(publicEntry.includes(path),`public_entry_missing_path:${path}`);
assert.match(llms,/## WHAT TO DO FIRST/,'llms_missing_first_action_sequence');
assert.match(llms,/execution-contract → perform requested measurements locally → \/result/,'llms_missing_universal_cycle');
assert.match(aiIndex,/start_here/,'ai_index_missing_start_here');
assert.match(aiIndex,/authorized_agent_cycle/,'ai_index_missing_authorized_agent_cycle');
assert.match(aiIndex,/ROOT-authorized queued proposal/,'ai_index_missing_governed_execution_boundary');

assert.match(mutationState,/CT-A01-MUT-%/);
assert.match(mutationState,/CANDIDATE/);
assert.match(checkpoint,/SFI-CT-LINEAGE-CHECKPOINT-1\.0/);
assert.match(checkpoint,/PENDING_EXTERNAL_ANCHOR/);
assert.match(checkpoint,/previousCheckpointHash/);
assert.match(checkpointRoute,/createLineageCheckpoint/);
assert.match(checkpointRoute,/requireRootActor\('root\.cognitive-twin\.checkpoint\.create'\)/);
assert.match(snapshotRoute,/createCognitiveTwinSnapshot/);
assert.match(forkRoute,/registerCognitiveTwinFork/);

const cronCount=Array.isArray(vercel.crons)?vercel.crons.length:0;
assert.equal(cronCount,7,`Expected unchanged 7 Vercel crons, found ${cronCount}`);

console.log(JSON.stringify({ok:true,invariants:[
  'ROOT and ACP share one canonical action_proposals lifecycle',
  'legacy approved is normalized only at the lifecycle read boundary and is not a writable ProposalStatus',
  'evidence requests are governed and canonicalized to waiting_evidence',
  'CONFLICTED has declare and governed resolve paths',
  'canonical promotion requires accepted realization + observed return + complete receipt contract',
  'CRL governance alternatives remain reviewable while active persistence has converged to the canonical governed institutional pipeline',
  'ROOT governance, agents and Twin proposals are exposed through canonical live scenes',
  'ROOT live scene restores ACP presence before proposal reads and exposes an explicit human presence control',
  'GET /api/governance/acp-seen is explanatory only; POST remains the ROOT-governed mutation',
  'canonical public entry explains SFI and routes humans and agents to actionable first steps',
  'machine discovery exposes an explicit authorized-agent cycle without weakening ROOT authority',
  'readiness separates Evidence Ledger from Knowledge Graph',
  'readiness uses planned health counts rather than expensive exact dashboard counts',
  'empty post-reset organs may be READY without being falsely marked broken',
  'readiness separates internal blockers from external scientific/proof gates',
  'CT mutation state remains candidate until governed',
  'CT snapshot/checkpoint/fork routes remain governed and reachable by API',
  'CT checkpoint is exportable but explicitly pending independent external anchoring',
  'no new Vercel cron introduced',
]},null,2));
