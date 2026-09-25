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
const shellUi=read('src/components/sfi/SfiConsole.tsx');
const rootUi=read('src/components/sfi/SfiRootWorkspace.tsx');
const operatingUi=read('src/components/sfi/SfiOperatingWorkspace.tsx');
const governanceUi=read('src/components/sfi/SfiGovernanceWorkspace.tsx');
const interactiveApi=read('src/app/api/root/interactive/route.ts');
const home=read('src/app/page.tsx');
const publicEntry=read('src/components/sfi/PublicEntryGateway.tsx');
const llms=read('src/app/llms.txt/route.ts');
const aiIndex=read('src/app/ai-index.json/route.ts');
const vercel=JSON.parse(read('vercel.json')) as {crons?:Array<{path:string;schedule:string}>};

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
assert.match(proposals,/requireRootViewer\('acp\.proposals\.list'\)/,'proposal reads must remain identity-authorized and observable even when ACP runtime presence is degraded');
assert.doesNotMatch(proposals,/requireGovernedActor\('acp\.proposals\.list'\)/,'proposal reads must not deadlock behind a mutation/presence gate');

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

// ROOT is the single sovereign human decision surface. GOVERNANCE exposes agents/runtime only.
assert.ok(scenes.includes("governance:{key:'governance'"), 'governance_live_scene_missing');
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(!scenes.includes("agents:{key:'agents'"), 'agents_must_not_reappear_as_parallel_sovereign_scene');
assert.ok(operatingUi.includes('SfiGovernanceWorkspace'), 'governance_workspace_delegation_missing');
assert.ok(governanceUi.includes('AGENTES'), 'governance_workspace_must_expose_agents');
assert.ok(governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')") && governanceUi.includes('/api/root/cognitive-runtime/records?agentId='), 'governance_workspace_must_use_bootstrap_plus_selected_agent_dossier');
assert.ok(interactiveApi.includes("includeTargets') === '1'") && interactiveApi.includes('targetHydrationDeferred: true'), 'runtime targets must not hydrate until explicitly needed');
assert.ok(governanceUi.includes('HIDRATACIÓN DIFERIDA') && governanceUi.includes('includeTargets=1'), 'runtime UI must disclose and use selective hydration');
assert.doesNotMatch(governanceUi,/setInterval\(/,'governance_runtime_must_not_poll');
assert.doesNotMatch(operatingUi,/setInterval\(/,'operating_workspace_must_not_poll');
assert.doesNotMatch(rootUi,/setInterval\(/,'root_workspace_must_not_poll');
assert.ok(rootUi.includes('ACEPTAR') && rootUi.includes('DENEGAR') && rootUi.includes('SOLICITAR EVIDENCIA'), 'plain_language_sovereign_decisions_missing_from_root');
assert.doesNotMatch(governanceUi,/ACEPTAR|DENEGAR|PEDIR EVIDENCIA|SOLICITAR EVIDENCIA/,'governance_runtime_must_not_duplicate_root_decisions');
assert.ok(shellUi.includes("label:'DECISIONES'") && shellUi.includes("href:'/root'"), 'decision_navigation_must_point_to_root');
assert.ok(interactiveApi.includes('separateProposalListRead: false'), 'hydrated governance mode must not duplicate proposal list reads');

// ACP presence remains an explicit governed mutation when needed, but it is not a
// prerequisite for merely reading the recovery/proposal queue.
assert.match(acpSeenRoute,/export async function GET/,'acp_presence_endpoint_get_must_explain_usage');
assert.match(acpSeenRoute,/method_not_allowed/,'acp_presence_get_must_not_silently_mutate');
assert.match(acpSeenRoute,/requiredMethod: 'POST'/,'acp_presence_get_must_name_required_method');
assert.match(acpSeenRoute,/export async function POST/,'acp_presence_mutation_must_remain_post');
assert.match(acpSeenRoute,/requireRootActor\('governance\.acp\.presence'\)/,'acp_presence_post_must_remain_root_governed');
assert.doesNotMatch(`${operatingUi}\n${governanceUi}`,/rootPresenceReady|confirmRootPresence|HACERME VISTO · CONFIRMAR PRESENCIA ACP/,'proposal observability must not depend on a manual presence ritual');

// The canonical public entry must route humans and agents into existing owners without adding a parallel institution shell.
assert.match(home,/PublicEntryGateway/,'canonical_home_missing_public_entry_gateway');
for(const p of ['/institution','/login','/llms.txt','/ai-index.json','/api/external/v1/manifest']) assert.ok(publicEntry.includes(p),`public_entry_missing_path:${p}`);
assert.ok(publicEntry.includes('/observatory'),'public_entry_missing_observatory');
assert.ok(publicEntry.includes('/publications'),'public_entry_missing_publications');
assert.ok(publicEntry.includes('/library'),'public_entry_missing_library');
assert.match(llms,/## WHAT TO DO FIRST/,'llms_missing_first_action_sequence');
assert.match(llms,/execution-contract → perform requested measurements locally → \/result/,'llms_missing_universal_cycle');
assert.match(aiIndex,/start_here/,'ai_index_missing_start_here');
assert.match(aiIndex,/authorized_agent_cycle/,'ai_index_missing_authorized_agent_cycle');
assert.match(aiIndex,/authorized proposal enters queued state/,'ai_index_missing_governed_queue_boundary');
assert.match(aiIndex,/queued_internal_auto_dispatch: true/,'ai_index_missing_bounded_internal_dispatch');
assert.match(aiIndex,/external_action_without_adapter: 'fail_closed'/,'ai_index_missing_external_fail_closed_boundary');
assert.match(aiIndex,/canonical_promotion: 'ROOT_ONLY'/,'ai_index_missing_root_only_canon_boundary');

assert.match(mutationState,/CT-A01-MUT-%/);
assert.match(mutationState,/CANDIDATE/);
assert.match(checkpoint,/SFI-CT-LINEAGE-CHECKPOINT-1\.0/);
assert.match(checkpoint,/PENDING_EXTERNAL_ANCHOR/);
assert.match(checkpoint,/previousCheckpointHash/);
assert.match(checkpointRoute,/createLineageCheckpoint/);
assert.match(checkpointRoute,/requireRootActor\('root\.cognitive-twin\.checkpoint\.create'\)/);
assert.match(snapshotRoute,/createCognitiveTwinSnapshot/);
assert.match(forkRoute,/registerCognitiveTwinFork/);

const expectedCrons = [
  { path: '/api/cron/worldspect', schedule: '20 7 * * *' },
  { path: '/api/cron/world-observatory', schedule: '25 7 * * *' },
  { path: '/api/cron/continuity-heartbeat', schedule: '15 7 * * *' },
  { path: '/api/cron/sfi-institutional-cycle', schedule: '35 7 * * *' },
  { path: '/api/cron/sfi-indicators', schedule: '0 8 * * *' },
  { path: '/api/cron/predictive-engine', schedule: '30 8 * * *' },
  { path: '/api/cron/continuity-report', schedule: '45 8 * * *' },
  { path: '/api/cron/notas-temporales', schedule: '15 14 1 * *' },
];
assert.deepEqual(vercel.crons ?? [], expectedCrons, 'Vercel cron set must match the explicitly governed schedule exactly');

console.log(JSON.stringify({ok:true,invariants:[
  'ROOT and ACP share one canonical action_proposals lifecycle',
  'legacy approved is normalized only at the lifecycle read boundary and is not a writable ProposalStatus',
  'evidence requests are governed and canonicalized to waiting_evidence',
  'CONFLICTED has declare and governed resolve paths',
  'canonical promotion requires accepted realization + observed return + complete receipt contract',
  'CRL governance alternatives remain reviewable while active persistence has converged to the canonical governed institutional pipeline',
  'ROOT is the sole sovereign human decision surface; agents/runtime stay non-sovereign',
  'runtime target hydration is deferred and recurring UI polling is absent',
  'proposal observability is identity-authorized and independent from ACP runtime presence health',
  'ACP presence remains an explicit POST mutation but is not a prerequisite for reading governance recovery state',
  'canonical public entry routes into existing public institutional owners',
  'machine discovery exposes governed authorization, bounded internal dispatch, external fail-closed behavior and ROOT-only canon',
  'readiness separates Evidence Ledger from Knowledge Graph',
  'readiness uses planned health counts rather than expensive exact dashboard counts',
  'empty post-reset organs may be READY without being falsely marked broken',
  'readiness separates internal blockers from external scientific/proof gates',
  'CT mutation state remains candidate until governed',
  'CT snapshot/checkpoint/fork routes remain governed and reachable by API',
  'CT checkpoint is exportable but explicitly pending independent external anchoring',
  'Vercel cron set is exact and includes bounded monthly Notas Temporales candidate generation',
]},null,2));