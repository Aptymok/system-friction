import test from 'node:test';
import assert from 'node:assert/strict';

import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import {
  SFI_COGNITIVE_PASSPORT_CONTRACT,
  SFI_COGNITIVE_PASSPORT_REGISTRY,
  cognitivePassportFor,
  validateCognitivePassport,
  validateCognitivePassportRegistry,
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

test('SFI-COGNITIVE-PASSPORT-1.0 projects exactly the 21 historical runtime IDs', () => {
  assert.equal(SFI_COGNITIVE_PASSPORT_CONTRACT, 'SFI-COGNITIVE-PASSPORT-1.0');

  const sourceIds = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id).sort();
  const passportIds = SFI_COGNITIVE_PASSPORT_REGISTRY.map((passport) => passport.id).sort();

  assert.equal(sourceIds.length, 21);
  assert.deepEqual(sourceIds, HISTORICAL_IDS);
  assert.deepEqual(passportIds, HISTORICAL_IDS);
  assert.equal(new Set(passportIds).size, 21);
});

test('passport projection validates without creating a second authority surface', () => {
  assert.deepEqual(validateCognitivePassportRegistry(), []);

  for (const passport of SFI_COGNITIVE_PASSPORT_REGISTRY) {
    assert.deepEqual(validateCognitivePassport(passport), [], `${passport.id} passport invalid`);
    assert.equal(passport.tools.allowedToolClasses.length, 0, `${passport.id} minted tool authority`);
    assert.equal(passport.orchestration.mayRequestCapabilities, false, `${passport.id} prematurely enabled adaptive requests`);
    assert.equal(passport.orchestration.requestableCapabilityIds.length, 0);
    assert.equal(passport.orchestration.requestableCapabilityClasses.length, 0);
    assert.equal(passport.orchestration.maxDepth, 0);
    assert.equal(passport.orchestration.maxChildren, 0);
    assert.ok(['READ', 'RECOMMEND'].includes(passport.authority.ceiling), `${passport.id} authority expanded`);
    assert.equal(passport.security.loggingRequired, true);
    assert.equal(passport.security.defaultTtlSeconds, 600);
    assert.equal(passport.modelRequirements.providerAllowlist, undefined);
    assert.equal(passport.modelRequirements.providerDenylist, undefined);
  }
});

test('passport epistemic projection preserves observation/simulation/projection/learning boundaries', () => {
  assert.equal(cognitivePassportFor('field_observer')?.epistemicMode, 'OBSERVE');
  assert.equal(cognitivePassportFor('historical_scout')?.epistemicMode, 'RECONSTRUCT');
  assert.equal(cognitivePassportFor('cross_impact')?.epistemicMode, 'INFER');
  assert.equal(cognitivePassportFor('friction_field_simulator')?.epistemicMode, 'SIMULATE');
  assert.equal(cognitivePassportFor('trajectory_agent')?.epistemicMode, 'PROJECT');
  assert.equal(cognitivePassportFor('risk_agent')?.epistemicMode, 'DECIDE');
  assert.equal(cognitivePassportFor('reality_calibration')?.epistemicMode, 'LEARN');

  assert.ok(cognitivePassportFor('friction_field_simulator')?.output.allowedEpistemicClasses.includes('SIMULATION'));
  assert.equal(cognitivePassportFor('friction_field_simulator')?.output.allowedEpistemicClasses.includes('OBSERVATION'), false);
  assert.ok(cognitivePassportFor('trajectory_agent')?.output.allowedEpistemicClasses.includes('PREDICTION'));
  assert.ok(cognitivePassportFor('reality_calibration')?.output.allowedEpistemicClasses.includes('LEARNING_CANDIDATE'));
});

test('projected model requirements are operation metadata, not provider/model bindings', () => {
  const temporal = cognitivePassportFor('temporal_resolver');
  const field = cognitivePassportFor('field_observer');

  assert.ok(temporal);
  assert.ok(field);
  assert.equal(temporal.modelRequirements.reasoning, 'HIGH');
  assert.equal(temporal.modelRequirements.structuredOutput, true);
  assert.equal(temporal.modelRequirements.minContextTokens, 100_000);
  assert.equal(field.modelRequirements.latencyClass, 'INTERACTIVE');
  assert.equal(field.modelRequirements.costClass, 'ECONOMY');
  assert.equal(Object.hasOwn(temporal.modelRequirements, 'model'), false);
  assert.equal(Object.hasOwn(temporal.modelRequirements, 'provider'), false);
});

test('RETURN is required only where the current runtime contract creates a future real-world obligation', () => {
  assert.equal(cognitivePassportFor('trajectory_agent')?.return.required, true);
  assert.equal(cognitivePassportFor('project_execution_manager')?.return.required, true);
  assert.equal(cognitivePassportFor('reality_calibration')?.return.required, false);
  assert.equal(cognitivePassportFor('risk_agent')?.return.required, false);
});

test('validator emits deterministic errors for malformed passports', () => {
  const source = cognitivePassportFor('field_observer');
  assert.ok(source);
  const malformed = structuredClone(source) as SfiCognitivePassport;
  malformed.security.defaultTtlSeconds = 901;
  malformed.security.loggingRequired = false;
  malformed.input.sourcePolicies.push(malformed.input.sourcePolicies[0]);
  malformed.orchestration.maxDepth = 1;
  malformed.orchestration.requestableCapabilityIds = ['risk_agent'];

  assert.deepEqual(validateCognitivePassport(malformed), [
    'field_observer:DEFAULT_TTL_OUT_OF_RANGE',
    'field_observer:LOGGING_REQUIRED',
    'field_observer:MAX_DEPTH_MUST_BE_ZERO_WHEN_REQUESTS_DISABLED',
    'field_observer:REQUEST_IDS_REQUIRE_CAPABILITY_REQUEST_AUTHORITY',
    `field_observer:SOURCE_POLICIES_DUPLICATE:${malformed.input.sourcePolicies[0]}`,
  ]);
});
