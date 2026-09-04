import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { executionContractForAgent } from './executionContracts';
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

test('passport projection validates without creating a second authority surface', () => {
  assert.deepEqual(validateCognitivePassportProjection(projected, SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY), []);

  for (const passport of projected) {
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
  assert.deepEqual(
    evidenceHunter.output.allowedEpistemicClasses,
    ['INFERENCE', 'NOT_EXECUTED', 'RECOMMENDATION'],
  );
});

test('reality calibration explicitly requires observed RETURN evidence', () => {
  const calibration = passportFor('reality_calibration');
  assert.ok(calibration);
  assert.deepEqual(calibration.input.requiredEvidenceClasses, ['RETURN']);
  assert.equal(calibration.output.allowedEpistemicClasses.includes('OBSERVATION'), false);
});

test('projected model requirements are operation metadata, not provider/model bindings', () => {
  const temporal = passportFor('temporal_resolver');
  const field = passportFor('field_observer');

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

test('validator emits deterministic errors for malformed passports', () => {
  const source = passportFor('field_observer');
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
