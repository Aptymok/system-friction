import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { executionContractForAgent } from './executionContracts';
import { llmRequirementsForAgent, operationModelRequirementsForAgent } from './agentModelRequirements';
import {
  SFI_COGNITIVE_PASSPORT_CONTRACT,
  projectCognitivePassport,
  validateCognitivePassport,
  validateCognitivePassportAgainstSource,
  validateCognitivePassportProjection,
  type SfiCognitivePassport,
} from './cognitivePassportRegistry';

const HISTORICAL_IDS = [
  'meta_orchestrator',
  'field_observer',
  'evidence_hunter',
  'temporal_resolver',
  'historical_scout',
  'phenotype_resolver',
  'context_builder',
  'cross_impact',
  'friction_field_simulator',
  'social_field_simulator',
  'economic_field_simulator',
  'cultural_simulator',
  'psychological_simulator',
  'policy_simulator',
  'entropy_redistribution',
  'trajectory_agent',
  'risk_agent',
  'opportunity_agent',
  'multi_stakeholder_bootstrap',
  'project_execution_manager',
  'reality_calibration',
].sort();

const projected = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(projectCognitivePassport);
const byId = new Map(projected.map((passport) => [passport.id, passport] as const));
const passportFor = (id: string) => byId.get(id) ?? null;

test('SFI-COGNITIVE-PASSPORT-1.0 projects exactly the 21 historical runtime IDs', () => {
  assert.equal(SFI_COGNITIVE_PASSPORT_CONTRACT, 'SFI-COGNITIVE-PASSPORT-1.0');
  const sourceIds = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id).sort();
  const passportIds = projected.map((passport) => passport.id).sort();
  assert.equal(sourceIds.length, 21);
  assert.deepEqual(sourceIds, HISTORICAL_IDS);
  assert.deepEqual(passportIds, HISTORICAL_IDS);
  assert.equal(new Set(passportIds).size, 21);
});

test('existing SFI-AGENT-PASSPORT owner absorbs the cognitive contract projection', () => {
  const ownerPath = path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/agentPassports.ts');
  const projectionPath = path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts');
  const ownerSource = fs.readFileSync(ownerPath, 'utf8');
  const projectionSource = fs.readFileSync(projectionPath, 'utf8');
  assert.match(ownerSource, /cognitiveContract:\s*projectCognitivePassport\(contract\)/);
  assert.doesNotMatch(projectionSource, /SFI_COGNITIVE_PASSPORT_REGISTRY/);
  assert.doesNotMatch(projectionSource, /cognitivePassportFor\(/);
});

test('passport projection enables bounded requests without minting execution authority', () => {
  assert.deepEqual(validateCognitivePassportProjection(projected, SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY), []);
  for (const passport of projected) {
    assert.deepEqual(validateCognitivePassport(passport), [], `${passport.id} passport invalid`);
    assert.equal(passport.tools.allowedToolClasses.length, 0, `${passport.id} minted tool authority`);
    assert.equal(passport.orchestration.mayRequestCapabilities, true);
    assert.deepEqual(
      passport.orchestration.requestableCapabilityIds,
      HISTORICAL_IDS.filter((id) => id !== passport.id),
      `${passport.id} request scope drift`,
    );
    assert.equal(passport.orchestration.requestableCapabilityIds.includes(passport.id), false);
    assert.deepEqual(passport.orchestration.requestableCapabilityClasses, []);
    assert.equal(passport.orchestration.maxDepth, 2);
    assert.equal(passport.orchestration.maxChildren, 4);
    assert.deepEqual(passport.orchestration.stopConditions, [
      'DUPLICATE_REQUEST_HASH_TERMINATES',
      'NO_NEW_INFORMATION_AND_NO_NEW_STATE',
    ]);
    assert.ok(['READ', 'RECOMMEND'].includes(passport.authority.ceiling), `${passport.id} authority expanded`);
    assert.equal(passport.security.loggingRequired, true);
    assert.equal(passport.security.defaultTtlSeconds, 600);
    assert.equal(passport.modelRequirements.providerAllowlist, undefined);
    assert.equal(passport.modelRequirements.providerDenylist, undefined);
  }
});

test('epistemic outputs are constrained by each authoritative execution contract', () => {
  assert.equal(passportFor('field_observer')?.epistemicMode, 'OBSERVE');
  assert.equal(passportFor('historical_scout')?.epistemicMode, 'RECONSTRUCT');
  assert.equal(passportFor('cross_impact')?.epistemicMode, 'INFER');
  assert.equal(passportFor('friction_field_simulator')?.epistemicMode, 'SIMULATE');
  assert.equal(passportFor('trajectory_agent')?.epistemicMode, 'PROJECT');
  assert.equal(passportFor('risk_agent')?.epistemicMode, 'DECIDE');
  assert.equal(passportFor('reality_calibration')?.epistemicMode, 'LEARN');

  for (const source of SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY) {
    const passport = passportFor(source.id);
    const execution = executionContractForAgent(source.id);
    assert.ok(passport);
    assert.ok(execution);
    assert.deepEqual(
      [...passport.output.allowedEpistemicClasses].sort(),
      [...execution.requestedOutputs].map(String).sort(),
      `${source.id} diverged from execution output contract`,
    );
  }

  const evidenceHunter = passportFor('evidence_hunter');
  assert.ok(evidenceHunter);
  assert.equal(evidenceHunter.output.allowedEpistemicClasses.includes('OBSERVATION'), false);
  assert.deepEqual(evidenceHunter.output.allowedEpistemicClasses, ['INFERENCE', 'NOT_EXECUTED', 'RECOMMENDATION']);
});

test('reality calibration explicitly requires observed RETURN evidence', () => {
  const calibration = passportFor('reality_calibration');
  assert.ok(calibration);
  assert.deepEqual(calibration.input.requiredEvidenceClasses, ['RETURN']);
  assert.equal(calibration.output.allowedEpistemicClasses.includes('OBSERVATION'), false);
});

test('projected model requirements share one tier owner with the LLM execution client', () => {
  const temporal = passportFor('temporal_resolver');
  const field = passportFor('field_observer');
  const clientPath = path.join(process.cwd(), 'src/infrastructure/ai/agentLlmClient.ts');
  const clientSource = fs.readFileSync(clientPath, 'utf8');
  assert.ok(temporal);
  assert.ok(field);
  assert.deepEqual(temporal.modelRequirements, operationModelRequirementsForAgent('temporal_resolver'));
  assert.deepEqual(field.modelRequirements, operationModelRequirementsForAgent('field_observer'));
  assert.deepEqual(llmRequirementsForAgent('temporal_resolver'), {
    reasoning: true,
    structuredOutput: true,
    minContextTokens: 100_000,
    priority: 'quality',
  });
  assert.deepEqual(llmRequirementsForAgent('field_observer'), {
    structuredOutput: true,
    priority: 'speed',
  });
  assert.match(clientSource, /const requirements = llmRequirementsForAgent\(agentId\);/);
  assert.doesNotMatch(clientSource, /function requirementsForAgent\(/);
  assert.equal(Object.hasOwn(temporal.modelRequirements, 'model'), false);
  assert.equal(Object.hasOwn(temporal.modelRequirements, 'provider'), false);
});

test('RETURN obligation remains distinct from RETURN evidence required as calibration input', () => {
  assert.equal(passportFor('trajectory_agent')?.return.required, true);
  assert.equal(passportFor('project_execution_manager')?.return.required, true);
  assert.equal(passportFor('reality_calibration')?.return.required, false);
  assert.deepEqual(passportFor('reality_calibration')?.input.requiredEvidenceClasses, ['RETURN']);
  assert.equal(passportFor('risk_agent')?.return.required, false);
});

test('validator rejects removal of mandatory human confirmation', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'project_execution_manager');
  assert.ok(source);
  assert.equal(source.humanApprovalRequired, true);
  const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
  passport.authority.confirmationRequirement = 'NONE';
  assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), [
    'project_execution_manager:CONFIRMATION_REQUIREMENT_MISMATCH:NONE:HUMAN',
  ]);
});

test('validator rejects epistemic mode drift from the canonical source layer', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'social_field_simulator');
  assert.ok(source);
  const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
  passport.epistemicMode = 'OBSERVE';
  assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), [
    'social_field_simulator:EPISTEMIC_MODE_MISMATCH:OBSERVE:SIMULATE',
  ]);
});

test('validator rejects weakening source-derived RETURN obligations', () => {
  for (const id of ['trajectory_agent', 'project_execution_manager']) {
    const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === id);
    assert.ok(source);
    const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
    passport.return.required = false;
    passport.return.condition = null;
    passport.return.falsificationCondition = null;
    assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), [`${id}:RETURN_CONTRACT_MISMATCH`]);
  }

  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'trajectory_agent');
  assert.ok(source);
  const conditionOnly = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
  conditionOnly.return.condition = null;
  assert.deepEqual(validateCognitivePassportAgainstSource(conditionOnly, source), ['trajectory_agent:RETURN_CONTRACT_MISMATCH']);
});

test('validator rejects passports that drop source-required inputs', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'field_observer');
  assert.ok(source);
  const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
  passport.input.required = [];
  assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), ['field_observer:INPUT_REQUIRED_CONTRACT_MISMATCH']);
});

test('validator rejects noncanonical accepted evidence classes', () => {
  const source = passportFor('field_observer');
  assert.ok(source);
  const passport = structuredClone(source) as SfiCognitivePassport;
  passport.input.acceptedEvidenceClasses = ['MODEL_OUTPUT'];
  assert.deepEqual(validateCognitivePassport(passport), ['field_observer:ACCEPTED_EVIDENCE_CLASSES_CONTRACT_MISMATCH']);
});

test('source validation rejects identity and purpose drift', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'field_observer');
  assert.ok(source);
  const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
  passport.name = 'Different Agent';
  passport.purpose = 'Different mandate';
  assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), [
    'field_observer:SOURCE_NAME_MISMATCH',
    'field_observer:SOURCE_PURPOSE_MISMATCH',
  ]);
});

test('validator rejects unsupported cognitive passport versions', () => {
  const source = passportFor('field_observer');
  assert.ok(source);
  const passport = structuredClone(source) as SfiCognitivePassport;
  passport.version = '999';
  assert.deepEqual(validateCognitivePassport(passport), ['field_observer:VERSION_UNSUPPORTED:999']);
});

test('source validation rejects every output policy drift from the canonical projection', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'field_observer');
  assert.ok(source);
  const mutations: Array<(passport: SfiCognitivePassport) => void> = [
    (passport) => { passport.output.schemaRef = 'schema:drift'; },
    (passport) => { passport.output.confidencePolicy = 'arbitrary-confidence'; },
    (passport) => { passport.output.missingPolicy = 'MISSING_IS_ZERO'; },
    (passport) => { passport.output.contradictionPolicy = 'DROP_CONTRADICTIONS'; },
  ];
  for (const mutate of mutations) {
    const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
    mutate(passport);
    assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), ['field_observer:OUTPUT_POLICY_CONTRACT_MISMATCH']);
  }
});

test('source validation rejects drift in every canonical model requirement field', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'field_observer');
  assert.ok(source);
  const mutations: Array<(passport: SfiCognitivePassport) => void> = [
    (passport) => { passport.modelRequirements.reasoning = 'FRONTIER'; },
    (passport) => { passport.modelRequirements.structuredOutput = false; },
    (passport) => { passport.modelRequirements.web = true; },
    (passport) => { passport.modelRequirements.multimodal = true; },
    (passport) => { passport.modelRequirements.computer = true; },
    (passport) => { passport.modelRequirements.code = true; },
    (passport) => { passport.modelRequirements.minContextTokens = 1; },
    (passport) => { passport.modelRequirements.latencyClass = 'BATCH'; },
    (passport) => { passport.modelRequirements.costClass = 'FRONTIER'; },
    (passport) => { passport.modelRequirements.privacyClass = 'PUBLIC'; },
    (passport) => { passport.modelRequirements.providerAllowlist = ['unassigned-provider']; },
    (passport) => { passport.modelRequirements.providerDenylist = ['unassigned-provider']; },
  ];
  for (const mutate of mutations) {
    const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
    mutate(passport);
    assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), ['field_observer:MODEL_REQUIREMENTS_CONTRACT_MISMATCH']);
  }
});

test('validator requires the exact canonical source-policy set', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'field_observer');
  assert.ok(source);
  const canonical = projectCognitivePassport(source).input.sourcePolicies;
  assert.deepEqual(canonical, [
    'EVIDENCE_BEFORE_INFERENCE',
    'MODEL_OUTPUT_NEVER_OBSERVATION_BY_INHERITANCE',
    'MISSING_REMAINS_MISSING',
  ]);
  for (const policies of [[], ['ARBITRARY_POLICY'], canonical.slice(0, 2)]) {
    const passport = structuredClone(projectCognitivePassport(source)) as SfiCognitivePassport;
    passport.input.sourcePolicies = policies;
    assert.deepEqual(validateCognitivePassportAgainstSource(passport, source), ['field_observer:SOURCE_POLICIES_CONTRACT_MISMATCH']);
  }
});

test('source validation enforces complete allowed and forbidden resource contracts', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'field_observer');
  assert.ok(source);
  const canonical = projectCognitivePassport(source);
  assert.ok(canonical.tools.allowedResources.length > 0);
  assert.deepEqual(canonical.tools.forbiddenResources, ['service_role', 'raw_secrets', 'unscoped_external_execution']);

  const droppedAllowed = structuredClone(canonical) as SfiCognitivePassport;
  droppedAllowed.tools.allowedResources = [];
  assert.deepEqual(validateCognitivePassportAgainstSource(droppedAllowed, source), ['field_observer:ALLOWED_RESOURCES_CONTRACT_MISMATCH']);

  const addedAllowed = structuredClone(canonical) as SfiCognitivePassport;
  addedAllowed.tools.allowedResources.push('unassigned_resource');
  assert.deepEqual(validateCognitivePassportAgainstSource(addedAllowed, source), ['field_observer:ALLOWED_RESOURCES_CONTRACT_MISMATCH']);

  for (const forbidden of canonical.tools.forbiddenResources) {
    const droppedForbidden = structuredClone(canonical) as SfiCognitivePassport;
    droppedForbidden.tools.forbiddenResources = canonical.tools.forbiddenResources.filter((value) => value !== forbidden);
    assert.deepEqual(validateCognitivePassportAgainstSource(droppedForbidden, source), ['field_observer:FORBIDDEN_RESOURCES_CONTRACT_MISMATCH']);
  }
});

test('source validation locks the complete bounded orchestration projection', () => {
  const source = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === 'evidence_hunter');
  assert.ok(source);
  const canonical = projectCognitivePassport(source);
  assert.equal(canonical.orchestration.mayRequestCapabilities, true);
  assert.equal(canonical.orchestration.requestableCapabilityIds.includes('evidence_hunter'), false);

  const mutations: Array<(passport: SfiCognitivePassport) => void> = [
    (passport) => { passport.orchestration.mayRequestCapabilities = false; },
    (passport) => { passport.orchestration.requestableCapabilityIds = []; },
    (passport) => { passport.orchestration.requestableCapabilityIds.push(passport.id); },
    (passport) => { passport.orchestration.requestableCapabilityClasses = ['arbitrary']; },
    (passport) => { passport.orchestration.maxDepth = 99; },
    (passport) => { passport.orchestration.maxChildren = 99; },
    (passport) => { passport.orchestration.stopConditions = []; },
  ];

  for (const mutate of mutations) {
    const passport = structuredClone(canonical) as SfiCognitivePassport;
    mutate(passport);
    const errors = validateCognitivePassportAgainstSource(passport, source);
    assert.ok(errors.includes('evidence_hunter:ORCHESTRATION_CONTRACT_MISMATCH'));
  }
});

test('validator emits deterministic errors for malformed passports', () => {
  const source = passportFor('field_observer');
  assert.ok(source);
  const malformed = structuredClone(source) as SfiCognitivePassport;
  malformed.security.defaultTtlSeconds = 901;
  malformed.security.loggingRequired = false;
  malformed.input.sourcePolicies.push(malformed.input.sourcePolicies[0]);
  malformed.orchestration.mayRequestCapabilities = false;
  malformed.orchestration.maxDepth = 1;
  malformed.orchestration.maxChildren = 0;
  malformed.orchestration.requestableCapabilityIds = ['risk_agent'];
  malformed.orchestration.requestableCapabilityClasses = [];

  assert.deepEqual(validateCognitivePassport(malformed), [
    'field_observer:DEFAULT_TTL_OUT_OF_RANGE',
    'field_observer:LOGGING_REQUIRED',
    'field_observer:MAX_DEPTH_MUST_BE_ZERO_WHEN_REQUESTS_DISABLED',
    'field_observer:REQUEST_IDS_REQUIRE_CAPABILITY_REQUEST_AUTHORITY',
    'field_observer:SOURCE_POLICIES_CONTRACT_MISMATCH',
    `field_observer:SOURCE_POLICIES_DUPLICATE:${malformed.input.sourcePolicies[0]}`,
  ]);
});
