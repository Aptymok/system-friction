import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const page=read('src/app/pipeline/page.tsx');
const consoleUi=read('src/components/sfi/PipelineConsole.tsx');
const park=read('src/components/sfi/CognitiveSpinePark.tsx');
const caseCore=read('src/core/case-platform/operational.ts');
const actions=read('src/app/api/cases/[caseId]/actions/route.ts');
const reports=read('src/app/api/cases/[caseId]/reports/route.ts');
const internalObjects=read('src/app/api/cases/[caseId]/internal/objects/route.ts');
const member=read('src/app/member/page.tsx');

assert(page.includes("redirect('/login?next=/pipeline')"),'pipeline_auth_gate_missing');
assert(page.includes('<PipelineConsole'),'pipeline_console_missing');
assert(member.includes("redirect('/pipeline')"),'member_does_not_enter_pipeline');
assert(consoleUi.includes("fetch('/api/cases'"),'pipeline_case_list_missing');
assert(consoleUi.includes("fetch('/api/cases/tenants'"),'pipeline_tenant_role_missing');
assert(consoleUi.includes('/actions'),'pipeline_actions_missing');
assert(consoleUi.includes('/reports'),'pipeline_reports_missing');
assert(consoleUi.includes('/sources/upload'),'pipeline_source_upload_missing');
assert(consoleUi.includes('SOURCE ≠ RECORD ≠ EVIDENCE'),'pipeline_epistemic_boundary_missing');
assert(consoleUi.includes('REPORT ≠ ACTION'),'pipeline_report_boundary_missing');
assert(consoleUi.includes('platformPerformedExternalAction:false'),'pipeline_intervention_truth_boundary_missing');
assert.equal(consoleUi.includes('/api/root/'),false,'personal_pipeline_must_not_call_root');
assert.equal(consoleUi.includes('21 ACTIVE'),false,'personal_pipeline_must_not_hardcode_global_agents');
assert.equal(consoleUi.includes('94%'),false,'personal_pipeline_must_not_hardcode_health');
assert(caseCore.includes('export const SFI_CASE_TRANSITIONS'),'single_case_transition_contract_missing');
assert(consoleUi.includes('nextSfiCaseStatuses'),'pipeline_must_reuse_case_transition_contract');
assert(actions.includes('requireAuthenticatedUser'),'tenant_action_proposal_must_use_tenant_auth');
assert.equal(actions.includes('requireSfiMember'),false,'tenant_action_proposal_must_not_require_institutional_membership');
assert(reports.includes('requireAuthenticatedUser'),'tenant_report_generation_must_use_tenant_auth');
assert.equal(reports.includes('requireSfiMember'),false,'tenant_report_generation_must_not_require_institutional_membership');
assert(internalObjects.includes('requireSfiMember'),'evidence_assessment_must_remain_internal_member_path');
assert(park.includes('/cognitive-spine/park-desktop.avif')&&park.includes('/cognitive-spine/park-tablet.avif')&&park.includes('/cognitive-spine/park-mobile.avif'),'responsive_park_assets_missing');
assert(park.includes('AMBIENT MOTION ≠ ACTIVITY'),'ambient_motion_truth_boundary_missing');
assert(park.includes('LIVE = OBSERVED EVENT ONLY'),'live_truth_boundary_missing');

console.log(JSON.stringify({ok:true,surface:'/pipeline',tenantScoped:true,rootLeak:false,hardcodedRuntimeTruth:false,reportExecutionAuthority:false,directEvidencePromotion:false},null,2));
