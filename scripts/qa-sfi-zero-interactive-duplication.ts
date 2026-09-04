import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const operating=read('src/components/sfi/SfiOperatingWorkspace.tsx');
const governance=read('src/components/sfi/SfiGovernanceWorkspace.tsx');
const anatomy=read('src/components/root/cognitive-spine/CognitiveSpineAnatomy.tsx');
const interactiveRoute=read('src/app/api/root/interactive/route.ts');
const interactiveReadModel=read('src/lib/root/interactiveReadModel.ts');
const interactiveNext=read('src/lib/root/interactiveOperationalNext.ts');
const interactiveDossiers=read('src/lib/root/interactiveDossiers.ts');
const agentDossier=read('src/lib/sfi/cognitive-runtime/agentDossierRead.ts');
const rootRecords=read('src/app/api/root/cognitive-runtime/records/route.ts');
const externalRuntime=read('src/app/api/external/v1/cognitive-runtime/route.ts');

// One base HTTP/auth read per interactive scene.
assert.match(operating,/jsonFetch\(`\/api\/root\/interactive\?surface=\$\{encodeURIComponent\(surface\)\}`\)/);
assert.doesNotMatch(operating,/jsonFetch\('\/api\/root\/operational-next'\)/);
assert.doesNotMatch(operating,/jsonFetch\('\/api\/cases'\)/);
assert.doesNotMatch(operating,/jsonFetch\('\/api\/root\/learning'\)/);
assert.match(governance,/jsonFetch\('\/api\/root\/interactive\?surface=governance'\)/);
for(const forbidden of ['/api/root/console','/api/root/evidence/targets',"jsonFetch('/api/cases')","jsonFetch('/api/root/operational-next')","jsonFetch('/api/acp/proposals')"]){
  assert.equal(governance.includes(forbidden),false,`governance_duplicate_base_read:${forbidden}`);
}

// TWIN must consume the parent bootstrap. The anatomy component may retain a
// compatibility fallback for dormant legacy owners, but the canonical operating
// scene always supplies projection and therefore cannot start a second polling loop.
assert.match(operating,/projection=\{twinProjection\}/,'canonical Twin must pass the already-loaded projection to anatomy');
assert.match(operating,/onRefresh=\{loadBase\}/,'Twin mutations must return through the parent refresh instead of nested reloads');
assert.match(operating,/canOperate=\{twinAuthority==='root'\}/,'Twin sovereign controls must use server-derived authority');
assert.match(interactiveRoute,/nestedTwinHttpReads:\s*0/);
assert.match(interactiveRoute,/nestedTwinPollingLoops:\s*0/);
assert.equal((interactiveRoute.match(/readObservedSfiCognitiveRuntime\(\)/g)??[]).length,1,'Twin bootstrap must read observed runtime once');
assert.equal((interactiveRoute.match(/readRootCognitiveSpineStatus\(\)/g)??[]).length,1,'Twin bootstrap must materialize Spine status once');
assert.match(anatomy,/if \(!enabled \|\| projection\) return;/,'anatomy fallback reader must be disabled when parent projection exists');
assert.match(anatomy,/if \(projection\) return;\s*void pull\(\);\s*const timer = window\.setInterval/,'anatomy polling loop must be impossible under the canonical projected path');
assert.match(anatomy,/if \(onRefresh\) await onRefresh\(\);\s*else await pull\(\);/,'post-operation refresh must reuse the parent bootstrap when supplied');

// Dossiers are opened with one direct read; old paired case/report and full workboard reads are forbidden.
assert.match(operating,/surface=cases&caseId=/);
assert.match(operating,/surface=cases&cycleId=/);
assert.doesNotMatch(operating,/Promise\.all\(\[jsonFetch\(`\/api\/cases\/\$\{id\}`\),jsonFetch\(`\/api\/cases\/\$\{id\}\/reports`\)\]\)/);
assert.doesNotMatch(operating,/jsonFetch\(`\/api\/root\/workboard\?cycleId=/);

// Base bootstrap has a single auth gate and uses the zero-N+1 operational projection.
assert.equal((interactiveRoute.match(/requireRootViewer\(/g)??[]).length,1,'interactive bootstrap must authenticate once');
assert.match(interactiveRoute,/readInteractiveOperationalNext/);
assert.doesNotMatch(interactiveRoute,/readRootOperationalNext/);
assert.match(interactiveRoute,/separateProposalListRead:\s*false/);
assert.match(interactiveRoute,/operationalNPlusOneReads:\s*0/);

// Case index reuses the same case rows for project links and reads membership once.
assert.match(interactiveReadModel,/duplicateTenantMembershipReads:\s*0/);
assert.match(interactiveReadModel,/duplicateCaseTableReads:\s*0/);
assert.equal((interactiveReadModel.match(/\.from\('sfi_tenant_members'\)/g)??[]).length,1,'interactive case index must read membership once');
assert.equal((interactiveReadModel.match(/\.from\('sfi_cases'\)/g)??[]).length,1,'interactive case index must read cases once');

// Operational overview must never hydrate per-row readiness/history.
assert.match(interactiveNext,/evidenceReadinessPerProposalReads:\s*0/);
assert.match(interactiveNext,/universalCycleHistoryPerCycleReads:\s*0/);
assert.match(interactiveNext,/nPlusOneReads:\s*0/);
assert.doesNotMatch(interactiveNext,/readEvidenceReadiness/);
assert.doesNotMatch(interactiveNext,/readUniversalCycleHistory/);
assert.equal((interactiveNext.match(/\.from\('action_proposals'\)/g)??[]).length,1,'operational overview must read action_proposals once');

// Case and cycle detail paths do not rebuild the entire workboard or re-read the case envelope.
assert.match(interactiveDossiers,/duplicateCaseReads:\s*0/);
assert.match(interactiveDossiers,/fullWorkboardReads:\s*0/);
assert.match(interactiveDossiers,/duplicateCycleHistoryReads:\s*0/);
assert.equal((interactiveDossiers.match(/readUniversalCycleHistory\(cycleId\)/g)??[]).length,1,'cycle dossier must reconstruct history once');

// Agent dossier reads execution events once; optional assurance uses a disjoint event-name set.
assert.match(agentDossier,/EXECUTION_EVENT_NAMES/);
assert.match(agentDossier,/ASSURANCE_EVENT_NAMES/);
assert.match(agentDossier,/overlappingEventNames:\s*0/);
assert.match(agentDossier,/duplicateEventReads:\s*0/);
assert.doesNotMatch(agentDossier,/streamRecentEpistemicEvents/);
assert.doesNotMatch(agentDossier,/readObservedSfiCognitiveRuntime/);
assert.match(rootRecords,/readAgentExecutionDossier/);
assert.doesNotMatch(rootRecords,/readAgentExecutionStates|readExecutionRecords|readGenAiAssuranceMetrics/);
assert.match(externalRuntime,/readAgentExecutionDossier/);
assert.doesNotMatch(externalRuntime,/readAgentExecutionStates|readExecutionRecords|readGenAiAssuranceMetrics/);

// Governance dossier refresh is event-driven by agent selection/execution, not another timer.
const dossierEffect=governance.match(/useEffect\(\(\)=>\{const initial=window\.setTimeout\(\(\)=>void loadDossier[\s\S]*?\},\[agentId,loadDossier\]\);/)?.[0]??'';
assert.ok(dossierEffect,'agent dossier effect missing');
assert.doesNotMatch(dossierEffect,/setInterval/,'agent dossier must not have periodic duplicate polling');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-ZERO-INTERACTIVE-DUPLICATION-1.1',
  scope:'ROOT/CASES/TWIN/GOVERNANCE interactive read path',
  invariants:[
    'ONE_BASE_HTTP_AUTH_READ_PER_SCENE_REFRESH',
    'NO_DUPLICATE_PROPOSAL_FEED',
    'NO_N_PLUS_ONE_EVIDENCE_READINESS',
    'NO_N_PLUS_ONE_CYCLE_HISTORY',
    'ONE_CASE_DOSSIER_READ',
    'ONE_CYCLE_HISTORY_READ_PER_EXPLICIT_DOSSIER',
    'NO_OVERLAPPING_AGENT_EVENT_READS',
    'NO_PERIODIC_AGENT_DOSSIER_POLL',
    'NO_NESTED_TWIN_HTTP_READS',
    'NO_NESTED_TWIN_POLLING_LOOP',
  ],
},null,2));
