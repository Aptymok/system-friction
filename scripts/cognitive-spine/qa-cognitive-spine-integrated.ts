import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  COGNITIVE_SPINE_INTEGRATION_STATUS_CONTRACT,
  COGNITIVE_SPINE_SURFACE_INTEGRATIONS,
  COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY,
} from '../../src/core/cognitive-spine/surfaceIntegrationRegistry';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const expected = {
  RUNTIME: ['RUNTIME_GENERAL_CONTEXT_V1', 'SEALED_CONSUMED'],
  STUDIO: ['STUDIO_OBJECT_CONTEXT_V1', 'SEALED_CONSUMED_PERSISTED'],
  ROOT: ['ROOT_GOVERNANCE_CONTEXT_V1', 'SEALED_CONSUMED_GOVERNED'],
  FIELD_T0: ['FIELD_BLINDED_OBSERVATION_V1', 'BLINDED_AVAILABLE_UNCONSUMED'],
  METHOD_LAB: ['LAB_EXPERIMENT_CONTEXT_V1', 'PROTOCOL_ALLOWLIST_SELECTIVE'],
  DECISION_TRANSFER: ['LAB_BLINDED_V1', 'FROZEN_EXPERIMENT_ISOLATED'],
  WORLDSPECT: ['WORLDSPECT_CONTEXT_V1', 'OBSERVE_PERSIST_THEN_PRIOR_STATE_CONTRAST'],
  ATLAS: ['ATLAS_TEMPORAL_CONTEXT_V1', 'READ_ONLY_OPTIONAL_SANITIZED'],
  LIBRARY: ['LIBRARY_IMPACT_CONTEXT_V1', 'AVAILABLE_UNCONSUMED_IMPACT_UNDEMONSTRATED'],
} as const;

assert.equal(COGNITIVE_SPINE_INTEGRATION_STATUS_CONTRACT, 'SFI-COGNITIVE-SPINE-INTEGRATION-STATUS-1.0');
assert.equal(COGNITIVE_SPINE_SURFACE_INTEGRATIONS.length, Object.keys(expected).length, 'unexpected_surface_integration_count');

for (const [surface, [profileId, posture]] of Object.entries(expected)) {
  const entry = COGNITIVE_SPINE_SURFACE_INTEGRATIONS.find((item) => item.surface === surface);
  assert.ok(entry, `surface_integration_missing:${surface}`);
  assert.equal(entry.profileId, profileId, `surface_profile_mismatch:${surface}`);
  assert.equal(entry.posture, posture, `surface_posture_mismatch:${surface}`);
  assert.equal(entry.ctRequiredMiddleware, false, `surface_became_ct_middleware:${surface}`);
  assert.equal(entry.canonicalWriteByRead, false, `surface_read_writes_canonical_state:${surface}`);
  assert.equal(entry.truthAuthority, false, `surface_granted_truth_authority:${surface}`);
}

for (const document of [
  'ADR-SFI-CT-SPINE-001.md',
  'SFI-CT-INVARIANTS-1.0.md',
  'SFI-CT-SNAPSHOT-CONTRACT-1.0.md',
  'SFI-CT-TRANSITION-CONTRACT-1.0.md',
  'SFI-CT-PROJECTION-PROFILES-1.0.md',
  'SFI-CT-PERSON-INSTITUTION-GATE-1.0.md',
  'SFI-CT-CPRT-1.0.md',
]) {
  assert.ok(existsSync(path.join(root, 'docs/architecture/cognitive-spine', document)), `cognitive_spine_freeze_document_missing:${document}`);
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const absolute = path.join(directory, name);
    return statSync(absolute).isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

const coreDirectory = path.join(root, 'src/core/cognitive-spine');
for (const absolute of walkFiles(coreDirectory).filter((file) => /\.(ts|tsx|js|mjs|cjs)$/.test(file))) {
  const content = readFileSync(absolute, 'utf8');
  const relative = path.relative(root, absolute);
  assert.equal(/(?:from\s+|require\()['"]next(?:\/|['"])/.test(content), false, `core_next_dependency:${relative}`);
  assert.equal(/(?:from\s+|require\()['"]@vercel\//.test(content), false, `core_vercel_dependency:${relative}`);
  assert.equal(/process\.env\.VERCEL(?:_|\b)/.test(content), false, `core_vercel_runtime_dependency:${relative}`);
}

const runtime = read('src/lib/institution/cognitiveSpineRuntimeMaterializer.ts');
const studio = read('src/core/cognitive-twin/studioContext.ts');
const rootDeliberation = read('src/app/api/root/cognitive-twin/deliberate/route.ts');
const field = read('src/lib/field/fieldCognitiveSpineBoundary.ts');
const methodLab = read('src/lib/method-lab/cognitiveSpineContext.ts');
const decisionTransfer = read('src/lib/lab/decisionTransferCognitiveSpineBoundary.ts');
const worldspect = read('src/lib/worldspect/cognitiveSpineContrast.ts');
const atlas = read('src/lib/atlas/cognitiveSpineTemporalContext.ts');
const library = read('src/lib/sfi/library/cognitiveSpineImpactContext.ts');

assert.ok(runtime.includes('RUNTIME_GENERAL_CONTEXT_PROFILE'), 'runtime_spine_boundary_missing');
assert.ok(runtime.includes('they are not appended to KernelEvidence'), 'runtime_evidence_boundary_missing');
assert.ok(studio.includes('materializeStudioCognitiveSpineContext'), 'studio_spine_boundary_missing');
assert.ok(rootDeliberation.includes('materializeRootCognitiveSpineContext'), 'root_spine_boundary_missing');
assert.ok(field.includes('FIELD_BLINDED_OBSERVATION_PROFILE'), 'field_blinded_boundary_missing');
assert.ok(methodLab.includes('requireAllAllowedRefs: true'), 'method_lab_allowlist_boundary_missing');
assert.ok(decisionTransfer.includes('operationalSfiCtConsumed: false'), 'decision_transfer_isolation_boundary_missing');
assert.ok(worldspect.includes("epistemicClass: 'DERIVED'"), 'worldspect_post_observation_boundary_missing');
assert.ok(atlas.includes('internalRefsExposed: false'), 'atlas_sanitized_boundary_missing');
assert.ok(library.includes("status: 'UNDEMONSTRATED'"), 'library_nonclaiming_boundary_missing');

const workflow = read('.github/workflows/sfi-cognitive-spine.yml');
for (const gateName of [
  'Studio sealed Cognitive Spine context boundary',
  'Field blinded Cognitive Spine T0 boundary',
  'ROOT sealed Cognitive Spine governance boundary',
  'Decision Transfer isolation from operational SFI-CT',
  'Method Lab protocol-allowlisted Cognitive Spine context',
  'WorldSpect post-observation Cognitive Spine contrast',
  'Atlas read-only Cognitive Spine temporal context',
  'Library non-claiming Cognitive Spine impact context',
]) {
  assert.ok(workflow.includes(gateName), `accumulated_surface_gate_missing:${gateName}`);
}

assert.equal(COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY.scientificValidationProven, false);
assert.equal(COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY.institutionalAutonomyProven, false);
assert.equal(COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY.truthAuthorityGranted, false);
assert.equal(COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY.phenomenalConsciousnessClaim, false);
assert.equal(COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY.personCtInheritedByInstitution, false);
assert.equal(COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY.allOperationsRequireCtMiddleware, false);

console.log(JSON.stringify({
  ok: true,
  contractVersion: COGNITIVE_SPINE_INTEGRATION_STATUS_CONTRACT,
  surfaces: COGNITIVE_SPINE_SURFACE_INTEGRATIONS.map((entry) => ({
    surface: entry.surface,
    profileId: entry.profileId,
    posture: entry.posture,
    ctRequiredMiddleware: entry.ctRequiredMiddleware,
    operationalCtConsumed: entry.operationalCtConsumed,
  })),
  SFI_COGNITIVE_SPINE_TECHNICAL_INTEGRATION: 'PASS',
  SCIENTIFIC_VALIDATION: 'NOT_IMPLIED',
  INSTITUTIONAL_AUTONOMY: 'NOT_CLAIMED',
  TRUTH_AUTHORITY: 'NOT_GRANTED',
  PHENOMENAL_CONSCIOUSNESS: 'NOT_CLAIMED',
  ALL_OPERATIONS_REQUIRE_CT_MIDDLEWARE: false,
}, null, 2));
