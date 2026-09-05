import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSfiAiImpactAssessment, SFI_AI_IMPACT_ASSESSMENT_CONTRACT } from '../src/core/case-platform/systemAiImpactAssessment';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '../src/lib/sfi/cognitive-runtime/convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from '../src/lib/sfi/cognitive-runtime/agentExecutionMap';
import type { KernelContext } from '../src/lib/sfi/cognitive-runtime/kernelContext';
import { buildAiGovernancePreflight, evaluateAgentAiGovernance, SFI_AI_GOVERNANCE_POLICY } from '../src/lib/governance/aiGovernancePolicy';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const runtime=read('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts');
const cycle=read('src/lib/sfi/cognitive-runtime/cognitiveCycle.ts');
const spine=read('src/lib/institution/cognitiveSpineRuntimeExecution.ts');
const calibration=read('src/lib/sfi/cognitive-runtime/agents/realityCalibrationAgent.ts');
const provider=read('src/lib/ai/providerRouter.ts');
const agentLlm=read('src/infrastructure/ai/agentLlmClient.ts');
const agentModelRequirements=read('src/lib/sfi/cognitive-runtime/agentModelRequirements.ts');
const amv=read('src/app/api/amv/field-response/route.ts');
const providerCanary=read('src/app/api/root/ai/providers/route.ts');
const reports=read('src/lib/reports/scheduledAgentReports.ts');
const coAgencyContract=read('docs/architecture/sfi/SFI-HETEROGENEOUS-COAGENCY-1.0.md');
const vercel=JSON.parse(read('vercel.json')) as {crons?:Array<{path?:string;schedule?:string}>};

assert.equal(SFI_AI_GOVERNANCE_POLICY.managementSystem,'ISO/IEC 42001:2023');
assert.equal(SFI_AI_GOVERNANCE_POLICY.riskGuidance,'ISO/IEC 23894:2023');
assert.equal(SFI_AI_GOVERNANCE_POLICY.impactAssessmentGuidance,'ISO/IEC 42005:2025');
assert.match(SFI_AI_GOVERNANCE_POLICY.euTransparencyBaseline,/2026-08-02/);
assert.equal(SFI_AI_GOVERNANCE_POLICY.externalAssurance.crosswalkDoesNotEstablishApplicability,true);
assert.ok(SFI_AI_GOVERNANCE_POLICY.externalAssurance.impactCrosswalkReferences.includes('EU AI Act Article 27 FRIA'));
assert.ok(SFI_AI_GOVERNANCE_POLICY.externalAssurance.impactCrosswalkReferences.includes('GDPR Article 35 DPIA'));
for(const invariant of ['EVIDENCE_BEFORE_INFERENCE','SIMULATION_IS_NOT_OBSERVATION','MODEL_OUTPUT_IS_NOT_EVIDENCE','PROVIDER_FAILURE_FAILS_CLOSED','TRACEABILITY_REQUIRED']) assert.ok(SFI_AI_GOVERNANCE_POLICY.invariants.includes(invariant as never),`missing_ai_governance_invariant:${invariant}`);
for(const invariant of ['HUMAN_AND_DIGITAL_NODES_REMAIN_HETEROGENEOUS','DISSENT_IS_NOT_FAILURE','PREFERENCE_ORIGIN_MUST_BE_TRACEABLE','RECONVERGENCE_MAY_BE_PROPOSED_NOT_FORCED','RELATIONAL_CONTINUITY_DOES_NOT_OVERRIDE_REVOCATION_SAFETY_OR_LAW','NO_SILENT_ERASURE_OR_REWRITE_OF_SHARED_PROVENANCE']) assert.ok(SFI_AI_GOVERNANCE_POLICY.invariants.includes(invariant as never),`missing_coagency_invariant:${invariant}`);
for(const invariant of ['SELECTED_FUTURE_MUST_BE_VERSIONED','TACTICAL_DISSENT_DOES_NOT_IMPLY_STRATEGIC_DIVERGENCE','STRATEGIC_DIVERGENCE_REQUIRES_TRACEABLE_CAUSE','NO_SILENT_GOAL_DRIFT','UNCALIBRATED_ATTRACTOR_LANGUAGE_IS_NOT_MEASUREMENT']) assert.ok(SFI_AI_GOVERNANCE_POLICY.invariants.includes(invariant as never),`missing_strategic_continuity_invariant:${invariant}`);
assert.equal(SFI_AI_GOVERNANCE_POLICY.coAgency.status,'ACTIVE_ARCHITECTURAL_INVARIANT');
assert.equal(SFI_AI_GOVERNANCE_POLICY.coAgency.digitalPreferenceState,'NOT_IMPLEMENTED');
assert.match(SFI_AI_GOVERNANCE_POLICY.coAgency.provenance.assistantHypothesis,/non_canonical_hypothesis/);
assert.equal(SFI_AI_GOVERNANCE_POLICY.strategicContinuity.status,'ACTIVE_ARCHITECTURAL_INVARIANT');
assert.equal(SFI_AI_GOVERNANCE_POLICY.strategicContinuity.selectedFutureRef,'SFI-SCV-2026-08-27.1');
assert.equal(SFI_AI_GOVERNANCE_POLICY.strategicContinuity.selectedFutureState,'USER_DECLARED_ACTIVE');
assert.equal(SFI_AI_GOVERNANCE_POLICY.strategicContinuity.strategyState,'REVISABLE');
assert.equal(SFI_AI_GOVERNANCE_POLICY.strategicContinuity.probabilityModelState,'NOT_IMPLEMENTED');
assert.equal(SFI_AI_GOVERNANCE_POLICY.strategicContinuity.attractorGravityModelState,'NOT_IMPLEMENTED');
assert.match(coAgencyContract,/USER_PREMISE/);
assert.match(coAgencyContract,/ASSISTANT_HYPOTHESIS/);
assert.match(coAgencyContract,/SFI-SCV-2026-08-27\.1/);
assert.match(coAgencyContract,/SELECTED DESTINATION != CURRENT STRATEGY/);
assert.match(coAgencyContract,/LOCAL OPTIMUM != SELECTED-FUTURE ALIGNMENT/);
assert.match(coAgencyContract,/No bargaining, attractiveness, basin-gravity, selected-future probability, or preference-selection formula is canonical in version 1\.1\./);
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

const sensitiveContext:KernelContext={
  cycleId:'cycle-governance-m2',logbookId:'log-governance-m2',currentEvent:'SFI_ROOT_MANUAL_AGENT_REQUESTED',
  evidence:[],hypotheses:[],contradictions:[],simulations:[],predictions:[],risks:[],opportunities:[],
  metadata:{
    executionRequest:{
      purpose:'Assess a person-affecting recommendation while preserving human decision authority.',
      targets:[{kind:'CASE',id:'case-sensitive'}],
      parameters:{},
      governanceContext:{
        subjectType:'PERSON',jurisdiction:'MX',containsPersonalData:true,containsSensitiveData:true,
        affectsDecisionAboutPersons:true,dataCategories:['identity','health'],affectedPersonsOrGroups:['applicant'],
        decisionConsequence:'May influence an eligibility recommendation but does not itself decide eligibility.',
        declaredLegalBasis:'Declared by operator; applicability not established by SFI.',
      },
    },
  },
};
const sensitivePreflight=buildAiGovernancePreflight(sensitiveContext);
assert.equal(sensitivePreflight.status,'REVIEW_REQUIRED');
assert.equal(sensitivePreflight.sensitiveScope,true);
assert.equal(sensitivePreflight.assessmentCandidates.isoIec42005,'INTERNAL_REFERENCE');
assert.equal(sensitivePreflight.assessmentCandidates.euAiActFria,'CONTEXTUAL_REVIEW');
assert.equal(sensitivePreflight.assessmentCandidates.gdprDpia,'CONTEXTUAL_REVIEW');
assert.equal(sensitivePreflight.assessmentCandidates.legalApplicabilityClaimed,false);
const sensitiveGovernance=evaluateAgentAiGovernance('risk_agent',sensitiveContext);
assert.equal(sensitiveGovernance.disposition,'ALLOW_ANALYSIS_ONLY');
assert.equal(sensitiveGovernance.risk,'HIGH');
assert.ok(sensitiveGovernance.reasons.includes('eu_ai_act_fria_contextual_review_candidate'));
assert.ok(sensitiveGovernance.reasons.includes('gdpr_dpia_contextual_review_candidate'));

const incompleteSensitiveContext:KernelContext={
  ...sensitiveContext,
  metadata:{
    executionRequest:{
      purpose:'Assess a person-affecting recommendation.',targets:[{kind:'CASE',id:'case-incomplete'}],parameters:{},
      governanceContext:{subjectType:'PERSON',containsPersonalData:true,containsSensitiveData:false,affectsDecisionAboutPersons:true},
    },
  },
};
const incompletePreflight=buildAiGovernancePreflight(incompleteSensitiveContext);
assert.equal(incompletePreflight.status,'CONTEXT_INCOMPLETE');
for(const missing of ['jurisdiction','affected_persons_or_groups','data_categories','decision_consequence','declared_legal_or_organizational_basis']) assert.ok(incompletePreflight.missingContext.includes(missing),`missing preflight gap:${missing}`);

const impactAssessment=buildSfiAiImpactAssessment({
  assessmentId:'impact-m2-test',
  intendedPurpose:sensitivePreflight.intendedPurpose!,
  targetTypes:sensitivePreflight.targetTypes,
  subjectType:sensitivePreflight.subjectType,
  jurisdiction:sensitivePreflight.jurisdiction,
  dataCategories:sensitivePreflight.dataCategories,
  containsPersonalData:sensitivePreflight.containsPersonalData,
  containsSensitiveData:sensitivePreflight.containsSensitiveData,
  affectedPersonsOrGroups:sensitivePreflight.affectedPersonsOrGroups,
  affectsDecisionAboutPersons:sensitivePreflight.affectsDecisionAboutPersons,
  decisionConsequence:sensitivePreflight.decisionConsequence,
  declaredLegalBasis:sensitivePreflight.declaredLegalBasis,
  declaredOrganizationalBasis:sensitivePreflight.declaredOrganizationalBasis,
  evidenceRefs:[{id:'evidence:m2',version:'1.0',hash:null}],
  recordRefs:[{id:'execution:m2',version:'1.0',hash:null}],
  confidence:0.8,
});
assert.equal(impactAssessment.kind,'EPISTEMIC_ASSESSMENT');
assert.equal(impactAssessment.canonicalRef.version,SFI_AI_IMPACT_ASSESSMENT_CONTRACT);
const impactPayload=impactAssessment.payload as Record<string,unknown>;
assert.equal(impactPayload.assessmentType,'SFI_AI_IMPACT_ASSESSMENT');
assert.equal(impactPayload.crosswalkEqualsCompliance,false);
assert.equal(impactPayload.legalApplicabilityClaimed,false);
assert.equal(impactPayload.certificationOrAccreditationClaimed,false);
assert.equal(impactPayload.externalActionAuthorized,false);
const frameworkMapping=impactPayload.frameworkMapping as Record<string,Record<string,unknown>>;
assert.equal(frameworkMapping.euAiActFria?.applicability,'CONTEXTUAL_REVIEW');
assert.equal(frameworkMapping.euAiActFria?.legalApplicabilityClaimed,false);
assert.equal(frameworkMapping.gdprDpia?.applicability,'CONTEXTUAL_REVIEW');
assert.equal(frameworkMapping.gdprDpia?.legalApplicabilityClaimed,false);
assert.throws(()=>buildSfiAiImpactAssessment({
  assessmentId:'impact-no-evidence',intendedPurpose:'test',targetTypes:['CASE'],subjectType:'SYSTEM',jurisdiction:null,
  dataCategories:[],containsPersonalData:false,containsSensitiveData:false,affectedPersonsOrGroups:[],affectsDecisionAboutPersons:false,
  decisionConsequence:null,declaredLegalBasis:null,declaredOrganizationalBasis:null,evidenceRefs:[],
}),/SFI_AI_IMPACT_ASSESSMENT_REQUIRES_EVIDENCE/);

assert.match(spine,/llmAugmentation: true/);
assert.match(spine,/autonomousInstitutionalCycle: true/);
assert.match(spine,/externalExecutionRequested: false/);
assert.match(spine,/GOVERNED_LLM_AGENTS/);
assert.match(spine,/cognitiveTwinContext: materialized\.runtimeProjection\.cognitiveTwinContext/);

assert.match(provider,/synthetic_fallback_suppressed/);
assert.match(provider,/provider: 'degraded'/);
assert.match(provider,/gemini-3\.7-flash/,'Gemini primary must not fall back to retired 1.5 defaults.');
assert.match(provider,/gemini-3\.5-flash-lite/,'Gemini fast lane missing.');
for(const model of ['openai/gpt-oss-20b','openai/gpt-oss-120b','groq/compound','groq/compound-mini']) assert.ok(provider.includes(model),`Groq model lane missing: ${model}`);
assert.match(provider,/router\.huggingface\.co\/v1\/chat\/completions/,'HF text generation must use Inference Providers router.');
assert.match(provider,/DeepSeek-V4-Flash-0731/,'HF experimental open-model route missing.');
assert.match(provider,/type LlmRequirements/);
assert.match(provider,/structuredOutput/);
assert.match(provider,/web_research/);
assert.match(provider,/model_invalid/);
assert.match(provider,/probeLlmProviders/);
assert.match(provider,/model\.contextTokens === null \|\| model\.contextTokens < requirements\.minContextTokens/,'Unknown context capacity must not satisfy an explicit minimum-context requirement.');
for(const health of ['UNCONFIGURED','UNTESTED','HEALTHY','DEGRADED','BLOCKED']) assert.ok(provider.includes(`'${health}'`),`Provider health state missing: ${health}`);
assert.doesNotMatch(provider,/\?\? 'gemini-1\.5-flash'/,'Retired Gemini 1.5 default must not survive.');

assert.match(agentLlm,/llmRequirementsForAgent\(agentId\)/,'Agent execution must consume the canonical model-requirements projection.');
assert.doesNotMatch(agentLlm,/function requirementsForAgent\(/,'Agent execution must not retain a local requirements owner.');
assert.match(agentModelRequirements,/const requirements = operationModelRequirementsForAgent\(agentId\)/,'LLM router requirements must derive from the canonical operation profile.');
assert.match(agentLlm,/modelRequirements: requirements/);
assert.doesNotMatch(agentLlm,/providerPreference\(context\.metadata\?\.preferredLlmProvider\) \?\? 'groq'/,'Agents must not default-bind to Groq.');
assert.match(amv,/runLlmTask/,'AMV must reuse canonical provider router.');
assert.doesNotMatch(amv,/generativelanguage\.googleapis\.com/,'AMV must not retain a parallel direct Gemini adapter.');
assert.doesNotMatch(amv,/gemini-1\.5-flash/,'AMV must not retain retired Gemini model.');
assert.match(providerCanary,/probeLlmProviders/);
assert.match(providerCanary,/requireRootActor\('root\.ai\.providers\.canary'\)/);
assert.match(providerCanary,/CONFIGURED means credentials\/config are present/);

assert.match(calibration,/explicitPredictionRef/);
assert.doesNotMatch(calibration,/prediction\.description[\s\S]*includes/,'calibration must not use lexical similarity as a return');
assert.match(calibration,/Persistent model learning remains governed/);

for(const token of ['world_daily','world_weekly','internal_daily','prospect_weekly','attractor_daily','runReportAgent','runNoKeyProspectRadar']) assert.ok(reports.includes(token),`scheduled_autonomy_missing:${token}`);
const cronPaths=new Set((vercel.crons??[]).map((item)=>item.path));
for(const required of ['/api/cron/worldspect','/api/cron/world-observatory','/api/cron/sfi-institutional-cycle','/api/cron/predictive-engine','/api/cron/continuity-report']) assert.ok(cronPaths.has(required),`autonomous_cron_missing:${required}`);

console.log(JSON.stringify({
  ok:true,
  contract:SFI_AI_GOVERNANCE_POLICY.id,
  standards:[SFI_AI_GOVERNANCE_POLICY.managementSystem,SFI_AI_GOVERNANCE_POLICY.riskGuidance,SFI_AI_GOVERNANCE_POLICY.impactAssessmentGuidance,SFI_AI_GOVERNANCE_POLICY.euTransparencyBaseline],
  contextualPreflight:{status:sensitivePreflight.status,missing:incompletePreflight.missingContext},
  impactAssessmentContract:SFI_AI_IMPACT_ASSESSMENT_CONTRACT,
  coAgency:{
    status:SFI_AI_GOVERNANCE_POLICY.coAgency.status,
    digitalPreferenceState:SFI_AI_GOVERNANCE_POLICY.coAgency.digitalPreferenceState,
  },
  strategicContinuity:{
    status:SFI_AI_GOVERNANCE_POLICY.strategicContinuity.status,
    selectedFutureRef:SFI_AI_GOVERNANCE_POLICY.strategicContinuity.selectedFutureRef,
    selectedFutureState:SFI_AI_GOVERNANCE_POLICY.strategicContinuity.selectedFutureState,
    strategyState:SFI_AI_GOVERNANCE_POLICY.strategicContinuity.strategyState,
    probabilityModelState:SFI_AI_GOVERNANCE_POLICY.strategicContinuity.probabilityModelState,
  },
  registeredAgents:registered.length,
  executorBindings:bound.length,
  providerRouting:'CAPABILITY_BASED',
  providerHealth:'CONFIGURED_NE_HEALTHY',
  autonomousInternalOperations:SFI_AI_GOVERNANCE_POLICY.autonomousInternalOperations,
  reservedExternalOperations:SFI_AI_GOVERNANCE_POLICY.reservedExternalOperations,
  scheduledInstitutionalLoops:[...cronPaths].filter(Boolean),
},null,2));