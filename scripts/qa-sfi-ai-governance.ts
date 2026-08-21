import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '../src/lib/sfi/cognitive-runtime/convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from '../src/lib/sfi/cognitive-runtime/agentExecutionMap';
import { SFI_AI_GOVERNANCE_POLICY } from '../src/lib/governance/aiGovernancePolicy';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const runtime=read('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts');
const cycle=read('src/lib/sfi/cognitive-runtime/cognitiveCycle.ts');
const spine=read('src/lib/institution/cognitiveSpineRuntimeExecution.ts');
const calibration=read('src/lib/sfi/cognitive-runtime/agents/realityCalibrationAgent.ts');
const provider=read('src/lib/ai/providerRouter.ts');
const reports=read('src/lib/reports/scheduledAgentReports.ts');
const vercel=JSON.parse(read('vercel.json')) as {crons?:Array<{path?:string;schedule?:string}>};

assert.equal(SFI_AI_GOVERNANCE_POLICY.managementSystem,'ISO/IEC 42001:2023');
assert.equal(SFI_AI_GOVERNANCE_POLICY.riskGuidance,'ISO/IEC 23894:2023');
assert.match(SFI_AI_GOVERNANCE_POLICY.euTransparencyBaseline,/2026-08-02/);
for(const invariant of ['EVIDENCE_BEFORE_INFERENCE','SIMULATION_IS_NOT_OBSERVATION','MODEL_OUTPUT_IS_NOT_EVIDENCE','PROVIDER_FAILURE_FAILS_CLOSED','TRACEABILITY_REQUIRED']) assert.ok(SFI_AI_GOVERNANCE_POLICY.invariants.includes(invariant as never),`missing_ai_governance_invariant:${invariant}`);
for(const operation of ['publish_external','contact_external','spend','grant_access','change_canon','change_formula','apply_irreversible_mutation']) assert.ok(SFI_AI_GOVERNANCE_POLICY.reservedExternalOperations.includes(operation as never),`missing_reserved_operation:${operation}`);

const registered=SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent)=>agent.id).sort();
const bound=Object.keys(SFI_AGENT_EXECUTION_MAP).sort();
assert.deepEqual(bound,registered,'every registered cognitive agent must have exactly one executor');
assert.equal(registered.length,21,'canonical cognitive runtime must retain 21 executable agents');
assert.doesNotMatch(read('src/lib/sfi/cognitive-runtime/agentExecutionMap.ts'),/if \(!executor\) return context/,'missing executor must not silently pass');
assert.match(cycle,/missingAgents/);
assert.match(cycle,/completed = metaExecuted && missingAgents\.length === 0/);
assert.match(runtime,/evaluateAgentAiGovernance/);
assert.match(runtime,/AI_GOVERNANCE_BLOCK/);
assert.match(runtime,/llmAugmentationAgents/);

assert.match(spine,/llmAugmentation: true/);
assert.match(spine,/autonomousInstitutionalCycle: true/);
assert.match(spine,/externalExecutionRequested: false/);
assert.match(spine,/GOVERNED_LLM_AGENTS/);
assert.match(spine,/cognitiveTwinContext: materialized\.runtimeProjection\.cognitiveTwinContext/);

assert.match(provider,/synthetic_fallback_suppressed/);
assert.match(provider,/provider: 'degraded'/);
assert.match(calibration,/explicitPredictionRef/);
assert.doesNotMatch(calibration,/prediction\.description[\s\S]*includes/,'calibration must not use lexical similarity as a return');
assert.match(calibration,/Persistent model learning remains governed/);

for(const token of ['world_daily','world_weekly','internal_daily','prospect_weekly','attractor_daily','runReportAgent','runNoKeyProspectRadar']) assert.ok(reports.includes(token),`scheduled_autonomy_missing:${token}`);
const cronPaths=new Set((vercel.crons??[]).map((item)=>item.path));
for(const required of ['/api/cron/worldspect','/api/cron/world-observatory','/api/cron/sfi-institutional-cycle','/api/cron/predictive-engine','/api/cron/continuity-report']) assert.ok(cronPaths.has(required),`autonomous_cron_missing:${required}`);

console.log(JSON.stringify({
  ok:true,
  contract:SFI_AI_GOVERNANCE_POLICY.id,
  standards:[SFI_AI_GOVERNANCE_POLICY.managementSystem,SFI_AI_GOVERNANCE_POLICY.riskGuidance,SFI_AI_GOVERNANCE_POLICY.euTransparencyBaseline],
  registeredAgents:registered.length,
  executorBindings:bound.length,
  autonomousInternalOperations:SFI_AI_GOVERNANCE_POLICY.autonomousInternalOperations,
  reservedExternalOperations:SFI_AI_GOVERNANCE_POLICY.reservedExternalOperations,
  scheduledInstitutionalLoops:[...cronPaths].filter(Boolean),
},null,2));
