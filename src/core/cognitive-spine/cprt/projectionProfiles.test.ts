import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION,
  assertProjectionProfileContract,
  profileAllowsKind,
} from '../contracts/projectionProfile';
import {
  ALL_COGNITIVE_SPINE_REF_KINDS,
  COGNITIVE_SPINE_PROJECTION_PROFILES,
  FIELD_BLINDED_OBSERVATION_PROFILE,
  LAB_BLINDED_PROFILE,
  LAB_EXPERIMENT_CONTEXT_PROFILE,
  getCognitiveProjectionProfile,
} from '../profiles/registry';
import { RUNTIME_GENERAL_CONTEXT_PROFILE } from '../profiles/runtimeGeneral';

const EXPECTED_PROFILE_IDS = [
  'ROOT_GOVERNANCE_CONTEXT_V1',
  'FIELD_CASE_CONTEXT_V1',
  'FIELD_BLINDED_OBSERVATION_V1',
  'STUDIO_OBJECT_CONTEXT_V1',
  'LAB_EXPERIMENT_CONTEXT_V1',
  'LAB_BLINDED_V1',
  'WORLDSPECT_CONTEXT_V1',
  'ATLAS_TEMPORAL_CONTEXT_V1',
  'LIBRARY_IMPACT_CONTEXT_V1',
  'RUNTIME_GENERAL_CONTEXT_V1',
].sort();

test('projection registry contains exactly the frozen baseline profiles', () => {
  const actual = COGNITIVE_SPINE_PROJECTION_PROFILES.map((profile) => profile.profileId).sort();
  assert.deepEqual(actual, EXPECTED_PROFILE_IDS);
  assert.equal(new Set(actual).size, actual.length);
});

test('every projection profile is versioned, purposeful and contract-valid', () => {
  for (const profile of COGNITIVE_SPINE_PROJECTION_PROFILES) {
    assert.equal(profile.contractVersion, COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION);
    assert.ok(profile.version.length > 0);
    assert.ok(profile.purpose.length > 0);
    assert.equal(assertProjectionProfileContract(profile), profile);

    const overlap = profile.allowedRefKinds.filter((kind) => profile.deniedRefKinds.includes(kind));
    assert.deepEqual(overlap, [], `${profile.profileId} must not both allow and deny the same ref kind`);
  }
});

test('institutional projection profiles never inherit PERSON_CT directly', () => {
  for (const profile of COGNITIVE_SPINE_PROJECTION_PROFILES) {
    assert.equal(profileAllowsKind(profile, 'PERSON_CT'), false, profile.profileId);
    assert.ok(profile.deniedRefKinds.includes('PERSON_CT'), `${profile.profileId} must deny direct PERSON_CT`);
  }
});

test('blinded Field and Lab profiles expose no Cognitive Spine ref kinds', () => {
  for (const profile of [FIELD_BLINDED_OBSERVATION_PROFILE, LAB_BLINDED_PROFILE]) {
    assert.equal(profile.blindedByDefault, true);
    assert.deepEqual(profile.allowedRefKinds, []);
    assert.deepEqual([...profile.deniedRefKinds].sort(), [...ALL_COGNITIVE_SPINE_REF_KINDS].sort());
    for (const kind of ALL_COGNITIVE_SPINE_REF_KINDS) {
      assert.equal(profileAllowsKind(profile, kind), false);
    }
  }
});

test('Lab experiment profile requires protocol-bound frozen context', () => {
  assert.equal(LAB_EXPERIMENT_CONTEXT_PROFILE.blindedByDefault, false);
  assert.equal(LAB_EXPERIMENT_CONTEXT_PROFILE.fieldVisibilityRules.protocolAllowlistRequired, true);
  assert.equal(LAB_EXPERIMENT_CONTEXT_PROFILE.fieldVisibilityRules.exactSnapshotHashRequired, true);
  assert.equal(LAB_EXPERIMENT_CONTEXT_PROFILE.fieldVisibilityRules.liveCtAdvancementDuringFrozenRun, 'DENIED');
});

test('Runtime general profile in registry is the existing runtime contract', () => {
  const fromRegistry = getCognitiveProjectionProfile('RUNTIME_GENERAL_CONTEXT_V1');
  assert.equal(fromRegistry, RUNTIME_GENERAL_CONTEXT_PROFILE);
  assert.equal(fromRegistry.surface, 'COGNITIVE_RUNTIME');
  assert.equal(fromRegistry.blindedByDefault, false);
  assert.equal(profileAllowsKind(fromRegistry, 'MEMORY'), true);
  assert.equal(profileAllowsKind(fromRegistry, 'DECISION'), true);
  assert.equal(profileAllowsKind(fromRegistry, 'PERSON_CT'), false);
});

test('blinded profiles cannot be constructed with visible ref kinds', () => {
  assert.throws(() => assertProjectionProfileContract({
    contractVersion: COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION,
    profileId: 'INVALID_BLINDED_PROFILE',
    version: '1.0',
    surface: 'FIELD',
    allowedRefKinds: ['EVIDENCE'],
    deniedRefKinds: ['PERSON_CT'],
    fieldVisibilityRules: {},
    blindedByDefault: true,
    purpose: 'negative fixture',
  }), /COGNITIVE_SPINE_BLINDED_PROFILE_EXPOSES_REFS/);
});
