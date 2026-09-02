import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(path,'utf8');
const proposals=text('src/app/api/acp/proposals/route.ts');
const ui=text('src/components/sfi/SfiOperatingWorkspace.tsx');
const selector=text('src/lib/sfi/cognitive-runtime/automationSelector.ts');
const meta=text('src/lib/sfi/cognitive-runtime/agents/metaOrchestrator.ts');
const access=text('src/lib/system/access/server.ts');
const migration=text('supabase/migrations/20260827113000_personal_cognitive_workspace_ownership.sql');
const openapi=JSON.parse(text('public/openapi.json')) as Record<string,any>;

assert.match(proposals,/requireRootViewer\('acp\.proposals\.list'\)/,'proposal_read_must_be_identity_authorized_not_runtime_health_gated');
assert.doesNotMatch(proposals,/requireGovernedActor\('acp\.proposals\.list'\)/,'proposal_read_must_not_deadlock_on_blind_governance');
assert.match(proposals,/state:'DEGRADED'/,'proposal_read_failure_must_be_explicit');
assert.match(proposals,/source:\{table:'action_proposals'\}/,'proposal_read_must_publish_canonical_source');
assert.match(ui,/Proposal observability is intentionally independent from ACP runtime health/,'root_ui_must_not_hide_recovery_queue_when_presence_is_degraded');
assert.match(ui,/Fuente de propuestas DEGRADED/,'root_ui_must_distinguish_read_failure_from_empty_queue');
assert.match(ui,/PEDIR EVIDENCIA/,'root_ui_must_expose_evidence_request');
assert.doesNotMatch(ui,/jsonFetch\('\/api\/acp\/proposals'\)\.catch\(\(\)=>\(\{ok:true,data:\{proposals:\[\]\}\}\)\)/,'proposal_read_failure_must_not_be_coerced_to_empty_queue');

assert.match(selector,/reasons:\s*Record<string,\s*string\[\]>/,'automation_selector_must_expose_selection_reasons');
assert.match(selector,/reasons:\s*Object\.fromEntries/,'automation_selector_must_materialize_selection_reasons');
assert.match(selector,/requestedAutomations/,'automation_selector_must_support_explicit_bounded_selection');
assert.match(meta,/selectionMode/,'meta_orchestrator_must_record_selection_mode');
assert.match(meta,/executionKind: 'cognitive_automation'/,'runtime_roles_must_be_semantically_cognitive_automations');

assert.match(access,/personalModuleAccess/,'normal_accounts_must_receive_personal_workspace_capabilities');
assert.match(access,/canonical_promotion: false/,'normal_accounts_must_not_receive_canonical_promotion');
assert.match(access,/sovereign_actions: false/,'normal_accounts_must_not_receive_sovereign_actions');
assert.match(migration,/owner_id/i,'personal_cognitive_lab_persistence_must_be_owner_scoped');
assert.match(migration,/auth\.uid\(\)/i,'personal_cognitive_lab_rls_must_bind_to_authenticated_owner');

assert.equal(openapi.info?.version,'1.8.0');
assert.ok(openapi.paths?.['/api/external/v1/cognitive']?.post,'personal_cognitive_action_missing');
assert.ok(openapi.paths?.['/api/external/v1/personal-lab']?.post,'personal_lab_action_missing');

for(const path of [
 'src/lib/sfi/cognitive-runtime/agentLoader.ts',
 'src/lib/sfi/cognitive-runtime/runtimeDispatcher.ts',
 'src/lib/sfi/cognitive-runtime/executeAgent.ts',
 'src/lib/sfi/cognitive-runtime/kernelCycle.ts',
 'src/lib/sfi/cognitive-runtime/startKernel.ts',
 'src/lib/sfi/cognitive-runtime/publishGraph.tmp.ts',
 'src/lib/sfi/cognitive-runtime/graphExecutor.ts',
]) assert.equal(existsSync(path),false,`deprecated_runtime_artifact_present:${path}`);

console.log(JSON.stringify({ok:true,contract:'SFI-COGNITIVE-AUTOMATION-WORKSPACES-1.0',proposalRead:'observable_under_degraded_governance',runtime:'single_canonical_executor',personalWorkspace:'owner_scoped'},null,2));
