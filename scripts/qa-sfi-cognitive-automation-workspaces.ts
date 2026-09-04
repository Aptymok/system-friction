import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(path,'utf8');
const proposals=text('src/app/api/acp/proposals/route.ts');
const interactive=text('src/app/api/root/interactive/route.ts');
const operationalNext=text('src/lib/root/interactiveOperationalNext.ts');
const operatingUi=text('src/components/sfi/SfiOperatingWorkspace.tsx');
const governanceUi=text('src/components/sfi/SfiGovernanceWorkspace.tsx');
const selector=text('src/lib/sfi/cognitive-runtime/automationSelector.ts');
const meta=text('src/lib/sfi/cognitive-runtime/agents/metaOrchestrator.ts');
const access=text('src/lib/system/access/server.ts');
const migration=text('supabase/migrations/20260827113000_personal_cognitive_workspace_ownership.sql');
const openapi=JSON.parse(text('public/openapi.json')) as Record<string,any>;

assert.match(proposals,/requireRootViewer\('acp\.proposals\.list'\)/,'canonical proposal endpoint remains identity-authorized');
assert.doesNotMatch(proposals,/requireGovernedActor\('acp\.proposals\.list'\)/,'proposal read must not deadlock on mutation/presence governance');
assert.match(proposals,/state:'DEGRADED'/,'canonical proposal route must preserve explicit degraded semantics');
assert.match(proposals,/source:\{table:'action_proposals'\}/,'canonical proposal route must publish its source');

assert.match(operatingUi,/SfiGovernanceWorkspace/,'operating workspace must delegate governance without a parallel surface');
assert.ok(governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')"),'governance must use the single authenticated interactive bootstrap');
assert.ok(governanceUi.includes('setProposals(arr(operationalNext.items))'),'governance queue must reuse operationalNext.items instead of a second proposal feed');
assert.ok(governanceUi.includes("warning.startsWith('action_proposals:')") && governanceUi.includes("setProposalReadState(proposalWarnings.length?'DEGRADED':'READY')"),'proposal source degradation must remain visible through the shared bootstrap');
assert.match(governanceUi,/Fuente de propuestas DEGRADED/,'root UI must distinguish proposal read failure from an empty queue');
assert.match(governanceUi,/PEDIR EVIDENCIA/,'root UI must expose evidence request');
assert.doesNotMatch(governanceUi,/jsonFetch\('\/api\/acp\/proposals'\)/,'governance must not reintroduce the duplicate proposal HTTP feed');
assert.match(interactive,/proposalQueueSource: 'operationalNext\.items'/,'interactive contract must name the reused proposal source');
assert.match(interactive,/separateProposalListRead: false/,'interactive contract must forbid a separate proposal read');
assert.match(operationalNext,/action_proposals/,'interactive operational-next must read the canonical proposal table');
assert.match(operationalNext,/action_proposal_reads: 1|actionProposalReads:\s*1/,'interactive operational-next must bound proposal retrieval to one read');

assert.match(selector,/reasons:\s*Record<string,\s*string\[\]>/,'automation selector must expose selection reasons');
assert.match(selector,/reasons:\s*Object\.fromEntries/,'automation selector must materialize selection reasons');
assert.match(selector,/requestedAutomations/,'automation selector must support explicit bounded selection');
assert.match(meta,/selectionMode/,'meta orchestrator must record selection mode');
assert.match(meta,/executionKind: 'cognitive_automation'/,'runtime roles must remain cognitive automations');

assert.match(access,/personalModuleAccess/,'normal accounts must receive personal workspace capabilities');
assert.match(access,/canonical_promotion: false/,'normal accounts must not receive canonical promotion');
assert.match(access,/sovereign_actions: false/,'normal accounts must not receive sovereign actions');
assert.match(migration,/owner_id/i,'personal cognitive lab persistence must be owner scoped');
assert.match(migration,/auth\.uid\(\)/i,'personal cognitive lab RLS must bind to authenticated owner');

assert.equal(openapi.info?.version,'1.8.0');
assert.ok(openapi.paths?.['/api/external/v1/cognitive']?.post,'personal cognitive action missing');
assert.ok(openapi.paths?.['/api/external/v1/personal-lab']?.post,'personal lab action missing');

for(const path of [
 'src/lib/sfi/cognitive-runtime/agentLoader.ts',
 'src/lib/sfi/cognitive-runtime/runtimeDispatcher.ts',
 'src/lib/sfi/cognitive-runtime/executeAgent.ts',
 'src/lib/sfi/cognitive-runtime/kernelCycle.ts',
 'src/lib/sfi/cognitive-runtime/startKernel.ts',
 'src/lib/sfi/cognitive-runtime/publishGraph.tmp.ts',
 'src/lib/sfi/cognitive-runtime/graphExecutor.ts',
]) assert.equal(existsSync(path),false,`deprecated_runtime_artifact_present:${path}`);

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-COGNITIVE-AUTOMATION-WORKSPACES-1.1',
  proposalRead:'shared_interactive_bootstrap_with_explicit_degraded_state',
  duplicateProposalHttpReads:0,
  runtime:'single_canonical_executor',
  personalWorkspace:'owner_scoped',
},null,2));
